import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { adopt, FLOOR, goToSleep, mood, NEEDS, newGame, RATES, tick } from '../web/src/state.js';
import { BREED_IDS, BREEDS, STAGES } from '../web/src/catalog.js';
import { LOOKS, MOODS, saveGame, widgetKey, widgetSnapshot } from '../web/src/widget.js';

const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const T0 = new Date(2026, 10, 14, 9, 0, 0).getTime();

function game(edit = () => {}) {
  const s = newGame();
  adopt(s, { breed: 'bunling', coat: 'mocha', name: 'Pip' }, T0);
  edit(s.pet);
  return s;
}

/** The game as it would be if opened at t: the saved state ticked forward in one go, as the game does. */
function openedAt(s, t) {
  const later = structuredClone(s);
  tick(later, t);
  return later.pet;
}

/** The moment the widget shows at time t: the last one that has started. */
function shownAt(snap, t) {
  return snap.moments.filter((m) => m.at <= t).at(-1);
}

/** The forecast's own clock: every 5 minutes for a day, then every hour to three days. */
function stepBefore(t) {
  const dt = t - T0;
  if (dt < 24 * HOUR) return T0 + Math.floor(dt / (5 * MINUTE)) * 5 * MINUTE;
  return T0 + Math.floor(dt / HOUR) * HOUR;
}

const rounded = (p) => Object.fromEntries(NEEDS.map((n) => [n, Math.round(p[n] / 5) * 5]));

const STARTS = {
  awake: () => game((p) => { p.tummy = 45; p.energy = 70; }),
  asleep: () => {
    const s = game((p) => { p.energy = 40; });
    goToSleep(s, T0);
    return s;
  },
  // Put to bed with almost no energy: the case that used to stay asleep for good.
  exhausted: () => {
    const s = game((p) => { p.energy = 0.003; });
    goToSleep(s, T0);
    return s;
  },
};

test('no pet yet: the widget gets an empty snapshot', () => {
  const snap = widgetSnapshot(newGame(), T0);
  assert.equal(snap.pet, null);
  assert.deepEqual(snap.moments, []);
  assert.equal(widgetKey(snap), 'egg');
});

test('the snapshot names the pet and its looks, with the coat the game draws', () => {
  const s = game((p) => { p.careDays = 3; p.room = 'mint'; });
  const snap = widgetSnapshot(s, T0);
  assert.deepEqual(
    { name: snap.pet.name, breed: snap.pet.breed, coat: snap.pet.coat, stage: snap.pet.stage, kind: snap.pet.kind },
    { name: 'Pip', breed: 'bunling', coat: 'mocha', stage: 'kid', kind: 'Kid Bunling' },
  );
  assert.deepEqual(snap.pet.wall, ['#dcf7ec', '#bfeedd']);
  assert.equal(snap.moments[0].at, T0);
  // A coat the catalog doesn't know is drawn as the breed's first, and the widget shows that one.
  assert.equal(widgetSnapshot(game((p) => { p.coat = 'tartan'; }), T0).pet.coat, BREEDS.bunling.coats[0].id);
});

for (const [name, start] of Object.entries(STARTS)) {
  test(`${name}: every moment is the game at that time, and at any time the widget shows what the game would`, () => {
    const s = start();
    const snap = widgetSnapshot(s, T0);
    // Each moment is exactly the game's state at its own time.
    for (const m of snap.moments) {
      const p = openedAt(s, m.at);
      assert.deepEqual({ mood: m.mood, asleep: m.asleep, needs: m.needs }, { mood: mood(p), asleep: p.asleep, needs: rounded(p) }, new Date(m.at).toISOString());
    }
    // And between moments, all the way to three days: the game at the forecast's last step.
    for (let t = T0; t <= T0 + 72 * HOUR; t += t - T0 < 24 * HOUR ? 7 * MINUTE : 23 * MINUTE) {
      const shown = shownAt(snap, t);
      const p = openedAt(s, stepBefore(t));
      assert.deepEqual({ mood: shown.mood, asleep: shown.asleep, needs: shown.needs }, { mood: mood(p), asleep: p.asleep, needs: rounded(p) }, `${((t - T0) / HOUR).toFixed(2)} h`);
      // The real game is never more than one step ahead of it.
      const now = openedAt(s, t);
      for (const need of NEEDS) assert.ok(Math.abs(now[need] - p[need]) <= (t - T0 < 24 * HOUR ? 2.5 : 30), `${need} at ${(t - T0) / HOUR} h`);
    }
  });
}

test('the pet gets hungry on time and the widget says so', () => {
  const s = game((p) => { p.tummy = 45; });
  const snap = widgetSnapshot(s, T0);
  assert.equal(snap.moments[0].mood, 'content');
  const hungry = snap.moments.find((m) => m.mood === 'hungry');
  // Tummy falls 6 an hour, so it drops under 30 after 2.5 hours, which the 5-minute steps catch then.
  assert.equal(hungry.at, T0 + 2.5 * HOUR + 5 * MINUTE);
  assert.ok(openedAt(s, hungry.at).tummy < 30, 'hungry when the widget says so');
  assert.ok(openedAt(s, hungry.at - 5 * MINUTE).tummy >= 30, 'not before');
  assert.deepEqual({ look: hungry.look, low: hungry.low, line: hungry.line, word: hungry.word }, { look: 'hungry', low: 'tummy', line: MOODS.hungry.line, word: MOODS.hungry.word });
});

test('asleep, it wakes when rested, then gets peckish', () => {
  const s = STARTS.asleep();
  const snap = widgetSnapshot(s, T0);
  assert.deepEqual({ mood: snap.moments[0].mood, asleep: snap.moments[0].asleep, look: snap.moments[0].look }, { mood: 'asleep', asleep: true, look: 'sleep' });
  const woke = snap.moments.find((m) => !m.asleep);
  const rested = (100 - 40) / RATES.asleep.energy;
  assert.equal(woke.at, stepBefore(T0 + rested * HOUR) + (rested * 60 % 5 ? 5 * MINUTE : 0));
  assert.notEqual(woke.mood, 'asleep');
  assert.notEqual(woke.look, 'sleep');
  assert.equal(woke.needs.energy, 100);
  // Awake, the tummy runs down until it's hungry.
  const hungry = snap.moments.find((m) => m.mood === 'hungry');
  assert.ok(hungry && hungry.at > woke.at, 'it gets hungry after waking');
  assert.ok(openedAt(s, hungry.at).tummy < 30);
  assert.equal(hungry.low, 'tummy');
});

test('put to bed exhausted, it still wakes in the widget and the awake hours count', () => {
  const s = STARTS.exhausted();
  const snap = widgetSnapshot(s, T0);
  const woke = snap.moments.find((m) => !m.asleep);
  assert.ok(woke && woke.at < T0 + 5 * HOUR, 'wakes after about 4 hours, not three days later');
  assert.equal(snap.moments.at(-1).mood, 'hungry');
});

test('a long time away: the forecast ends hungry, at the floor, and nothing changes after it', () => {
  const s = game();
  const snap = widgetSnapshot(s, T0);
  const last = snap.moments.at(-1);
  assert.equal(last.mood, 'hungry');
  assert.ok(last.at < T0 + 72 * HOUR);
  const floor = Math.round(FLOOR / 5) * 5;
  for (const need of NEEDS) assert.equal(last.needs[need], floor, need);
  for (const days of [3, 10, 365]) {
    const p = openedAt(s, T0 + days * 24 * HOUR);
    assert.deepEqual({ mood: mood(p), needs: rounded(p) }, { mood: last.mood, needs: last.needs }, `${days} days`);
  }
  assert.ok(snap.moments.length < 150, `${snap.moments.length} moments`);
  for (let i = 1; i < snap.moments.length; i++) assert.ok(snap.moments[i].at > snap.moments[i - 1].at);
});

test('making the snapshot leaves the game state alone', () => {
  const s = game();
  const before = JSON.stringify(s);
  widgetSnapshot(s, T0 + 5 * HOUR);
  assert.equal(JSON.stringify(s), before);
});

test('the key changes when the picture does, not with every save', () => {
  const s = game();
  const a = widgetKey(widgetSnapshot(s, T0));
  const s2 = structuredClone(s);
  tick(s2, T0 + MINUTE);
  assert.equal(widgetKey(widgetSnapshot(s2, T0 + MINUTE)), a, 'a minute later looks the same');
  s2.pet.tummy = 20;
  assert.notEqual(widgetKey(widgetSnapshot(s2, T0 + MINUTE)), a, 'hungry looks different');
});

test('saving: in the app the snapshot goes with the save, in a browser it doesn\'t', () => {
  const s = game();
  const calls = [];
  saveGame(s, T0, { native: true, writeSave: (state, widget) => calls.push({ state, widget }) });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].state, s);
  const sent = JSON.parse(calls[0].widget.snapshot);
  assert.equal(sent.pet.name, 'Pip');
  assert.equal(calls[0].widget.key, widgetKey(sent));
  saveGame(s, T0, { native: false, writeSave: (state, widget) => calls.push({ state, widget }) });
  assert.deepEqual(calls[1], { state: s, widget: null });
});

test('saving never depends on the widget: if the snapshot fails, the game is still saved', () => {
  const s = game();
  Object.defineProperty(s.pet, 'tummy', { enumerable: true, get() { throw new Error('no tummy'); } });
  const calls = [];
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.doesNotThrow(() => saveGame(s, T0, { native: true, writeSave: (state, widget) => calls.push({ state, widget }) }));
  } finally {
    console.warn = warn;
  }
  assert.deepEqual(calls, [{ state: s, widget: null }]);
});

test('the snapshot has the fields and types the widget decodes (PetSnapshot.swift)', () => {
  const swift = readFileSync(new URL('../ios/PocklingWidget/PetSnapshot.swift', import.meta.url), 'utf8');
  /** The `let name: Type` lines of a Swift struct, as { name: Type }. */
  const fields = (struct) => {
    const body = swift.slice(swift.indexOf(`struct ${struct}: Decodable`));
    const block = body.slice(body.indexOf('{') + 1, body.indexOf('\n    }'));
    return Object.fromEntries([...block.matchAll(/^\s*let (\w+): (\S.*?)\s*$/gm)].map((m) => [m[1], m[2]]));
  };
  const isType = (value, type) => ({
    String: typeof value === 'string',
    Double: typeof value === 'number',
    Int: Number.isInteger(value),
    Bool: typeof value === 'boolean',
    '[String]': Array.isArray(value) && value.every((v) => typeof v === 'string'),
    '[String: Double]': value && typeof value === 'object' && Object.values(value).every((v) => typeof v === 'number'),
  })[type];
  const snap = JSON.parse(JSON.stringify(widgetSnapshot(game(), T0)));
  // The top level's own fields, outside the structs nested in it.
  const outer = swift.slice(swift.indexOf('struct PetSnapshot: Decodable'));
  const top = Object.fromEntries([...outer.slice(0, outer.indexOf('\n}')).matchAll(/^ {4}let (\w+): (\S.*?)\s*$/gm)].map((m) => [m[1], m[2]]));
  assert.deepEqual(top, { pet: 'Pet?', moments: '[Moment]' });
  for (const [struct, value] of [['Pet', snap.pet], ['Moment', snap.moments[0]]]) {
    const wanted = fields(struct);
    assert.ok(Object.keys(wanted).length >= 5, `read ${struct} from the Swift`);
    assert.deepEqual(Object.keys(value).sort(), Object.keys(wanted).sort(), `${struct}: the same fields on both sides`);
    for (const [key, type] of Object.entries(wanted)) assert.ok(isType(value[key], type), `${struct}.${key} is ${type}`);
  }
  assert.deepEqual(Object.keys(snap.moments[0].needs).sort(), [...NEEDS].sort());
  // With no pet, the widget decodes the same document with pet null and no moments.
  assert.deepEqual(JSON.parse(JSON.stringify(widgetSnapshot(newGame(), T0))), { v: 1, made: T0, pet: null, moments: [] });
});

test('every mood the game can be in has a look and words, and every look has a picture for every pet', () => {
  // The moods, found by running the game's own mood() over needs from empty to full, awake and asleep.
  const seen = new Set();
  const levels = [0, 14, 29.9, 30, 50, 60, 80, 100];
  const s = game();
  for (const asleep of [false, true]) {
    for (const tummy of levels) for (const clean of levels) for (const energy of levels) for (const fun of levels) for (const love of levels) {
      seen.add(mood({ ...s.pet, asleep, tummy, clean, energy, fun, love }));
    }
  }
  assert.deepEqual([...seen].filter((m) => !MOODS[m]), [], 'a mood the widget has no words for');
  assert.deepEqual(Object.keys(MOODS).filter((m) => !seen.has(m)), [], 'words for a mood the game never has');
  for (const m of Object.values(MOODS)) assert.ok(LOOKS.includes(m.look) && m.word && m.line);
  assert.equal(LOOKS[0], 'smile', 'the whole pictures are of the smile');
  // The widget's pictures are made by tools/widget-art.mjs: run it again after adding a breed, coat or look.
  const art = new URL('../ios/PetArt/', import.meta.url);
  const files = new Set(readdirSync(art));
  const faces = JSON.parse(readFileSync(new URL('faces.json', art), 'utf8'));
  const missing = [];
  for (const breed of BREED_IDS) {
    for (const stage of STAGES) {
      const face = faces[`${breed}-${stage.id}`];
      if (!(face?.length === 4 && face.every((n) => Number.isInteger(n) && n >= 0))) missing.push(`faces.json: ${breed}-${stage.id}`);
      for (const coat of BREEDS[breed].coats) {
        const name = `${breed}-${coat.id}-${stage.id}`;
        for (const file of [`${name}.webp`, ...LOOKS.slice(1).map((look) => `${name}-${look}.webp`)]) {
          if (!files.has(file)) missing.push(file);
        }
      }
    }
  }
  assert.deepEqual(missing, []);
  assert.ok(existsSync(new URL('egg.webp', art)), 'egg.webp');
});
