import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { adopt, goToSleep, mood, NEEDS, newGame, RATES, tick } from '../web/src/state.js';
import { BREED_IDS, BREEDS, STAGES } from '../web/src/catalog.js';
import { LOOKS, MOODS, widgetKey, widgetSnapshot } from '../web/src/widget.js';

const HOUR = 3600000;
const T0 = new Date(2026, 10, 14, 9, 0, 0).getTime();

function game() {
  const s = newGame();
  adopt(s, { breed: 'bunling', coat: 'mocha', name: 'Pip' }, T0);
  return s;
}

/** The moment the widget shows at time t: the last one that has started. */
function shownAt(snap, t) {
  return snap.moments.filter((m) => m.at <= t).at(-1);
}

test('no pet yet: the widget gets an empty snapshot', () => {
  const snap = widgetSnapshot(newGame(), T0);
  assert.equal(snap.pet, null);
  assert.deepEqual(snap.moments, []);
  assert.equal(widgetKey(snap), 'egg');
});

test('the snapshot names the pet and its looks', () => {
  const s = game();
  s.pet.careDays = 3;
  s.pet.room = 'mint';
  const snap = widgetSnapshot(s, T0);
  assert.deepEqual(
    { name: snap.pet.name, breed: snap.pet.breed, coat: snap.pet.coat, stage: snap.pet.stage, kind: snap.pet.kind },
    { name: 'Pip', breed: 'bunling', coat: 'mocha', stage: 'kid', kind: 'Kid Bunling' },
  );
  assert.deepEqual(snap.pet.wall, ['#dcf7ec', '#bfeedd']);
  assert.equal(snap.moments[0].at, T0);
});

test('every moment is what the game would show if it were opened then', () => {
  const s = game();
  s.pet.tummy = 45;
  s.pet.energy = 70;
  const snap = widgetSnapshot(s, T0);
  for (const hours of [0, 0.5, 1, 2.4, 3, 6, 11, 20, 40, 71]) {
    const t = T0 + hours * HOUR;
    const opened = structuredClone(s);
    tick(opened, t);
    const shown = shownAt(snap, t);
    // The forecast is checked every 5 minutes for the first day, so a change can show up to 5 minutes late.
    const fiveEarlier = structuredClone(s);
    tick(fiveEarlier, t - 5 * 60000);
    assert.ok([mood(opened.pet), mood(fiveEarlier.pet)].includes(shown.mood), `${hours} h: ${shown.mood}`);
    for (const need of NEEDS) assert.ok(Math.abs(shown.needs[need] - opened.pet[need]) <= 3.5, `${hours} h ${need}`);
  }
});

test('the pet gets hungry on time and the widget says so', () => {
  const s = game();
  s.pet.tummy = 45;
  const snap = widgetSnapshot(s, T0);
  assert.equal(snap.moments[0].mood, 'content');
  const hungry = snap.moments.find((m) => m.mood === 'hungry');
  // Tummy falls 6 an hour, so it drops under 30 after 2.5 hours.
  assert.ok(Math.abs(hungry.at - (T0 + 2.5 * HOUR)) <= 5 * 60000, new Date(hungry.at).toISOString());
  assert.equal(hungry.look, 'hungry');
  assert.equal(hungry.low, 'tummy');
  assert.equal(hungry.line, MOODS.hungry.line);
});

test('asleep, it wakes when rested, then gets peckish', () => {
  const s = game();
  s.pet.energy = 40;
  goToSleep(s, T0);
  const snap = widgetSnapshot(s, T0);
  assert.equal(snap.moments[0].mood, 'asleep');
  assert.equal(snap.moments[0].asleep, true);
  assert.equal(snap.moments[0].look, 'sleep');
  const woke = snap.moments.find((m) => !m.asleep);
  const rested = (100 - 40) / RATES.asleep.energy;
  assert.ok(Math.abs(woke.at - (T0 + rested * HOUR)) <= 5 * 60000);
  assert.notEqual(woke.mood, 'asleep');
});

test('the forecast settles: a long time away ends hungry and stays that way', () => {
  const snap = widgetSnapshot(game(), T0);
  const last = snap.moments.at(-1);
  assert.equal(last.mood, 'hungry');
  assert.ok(last.at < T0 + 72 * HOUR);
  assert.ok(snap.moments.length < 150, `${snap.moments.length} moments`);
  // Each moment is a change from the one before.
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
  tick(s2, T0 + 60000);
  assert.equal(widgetKey(widgetSnapshot(s2, T0 + 60000)), a, 'a minute later looks the same');
  s2.pet.tummy = 20;
  assert.notEqual(widgetKey(widgetSnapshot(s2, T0 + 60000)), a, 'hungry looks different');
});

test('every mood the game has is shown, and every look has a picture for every pet', () => {
  for (const m of ['asleep', 'joyful', 'content', 'okay', 'hungry', 'sleepy', 'dirty', 'lonely', 'bored']) assert.ok(MOODS[m], m);
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
