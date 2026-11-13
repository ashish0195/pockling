// What the iOS app's Home Screen, Lock Screen and StandBy widget shows, made with each save. A widget
// can't run the game, so this works out ahead of time how the pet will feel until the game is next
// opened: it runs the game's own clock (tick in state.js) forward from now and notes each moment the
// picture changes. The app keeps the snapshot on the phone for the widget (ios/Pockling/WidgetShare.swift)
// and the widget shows each moment when its time comes (ios/PocklingWidget). Nothing in it leaves the phone.
import { BREEDS, ROOMS } from './catalog.js';
import { mood, NEEDS, stageOf, tick } from './state.js';

export const WIDGET_VERSION = 1;

/**
 * How the widget shows each mood: the pet's look (its face: pictures made by tools/widget-art.mjs), one
 * word for the Lock Screen, and a short line for the Home Screen.
 */
export const MOODS = {
  asleep: { look: 'sleep', word: 'Asleep', line: 'Fast asleep' },
  joyful: { look: 'happy', word: 'Joyful', line: 'Over the moon' },
  content: { look: 'smile', word: 'Happy', line: 'Happy and cosy' },
  okay: { look: 'smile', word: 'Okay', line: 'Doing okay' },
  hungry: { look: 'hungry', word: 'Hungry', line: 'Tummy rumbling' },
  sleepy: { look: 'sleepy', word: 'Sleepy', line: 'Ready for bed' },
  dirty: { look: 'pout', word: 'Grubby', line: 'Needs a bath' },
  lonely: { look: 'sad', word: 'Lonely', line: 'Misses you' },
  bored: { look: 'pout', word: 'Bored', line: 'Wants to play' },
};

/**
 * Every look the widget can show. Each breed, coat and stage has a whole picture in the first look, and
 * for each of the others just the face that changes.
 */
export const LOOKS = [...new Set(['smile', ...Object.values(MOODS).map((m) => m.look)])];

/** Which need is lowest, ties going the way mood() breaks them. */
const ORDER = ['tummy', 'energy', 'clean', 'love', 'fun'];

/** How far ahead to look, and how finely: the game's moods turn on whole points, a few an hour. */
const HOUR = 3600000;
const AHEAD = 72 * HOUR;
const FINE = 24 * HOUR;
const STEP_FINE = 5 * 60000;
const STEP_COARSE = HOUR;

/** The needs as the widget's rings show them: in fives, so they change a few times an hour, not every second. */
function rounded(p) {
  const out = {};
  for (const need of NEEDS) out[need] = Math.round(p[need] / 5) * 5;
  return out;
}

function lowest(p) {
  let low = ORDER[0];
  for (const need of ORDER) if (p[need] < p[low]) low = need;
  return low;
}

/** One moment: how the pet looks and feels, from `at` until the next one. */
function moment(p, at) {
  const m = mood(p);
  const shown = MOODS[m] ?? MOODS.okay;
  return { at, mood: m, look: shown.look, word: shown.word, line: shown.line, asleep: p.asleep, low: lowest(p), needs: rounded(p) };
}

const sameMoment = (a, b) => a.mood === b.mood && a.asleep === b.asleep && a.low === b.low && NEEDS.every((n) => a.needs[n] === b.needs[n]);

/**
 * The widget's snapshot of a game state at `now`: the pet, and the moments ahead in which it changes, the
 * first being now. With no pet yet (an egg to hatch) it's just { pet: null }.
 */
export function widgetSnapshot(s, now) {
  const p = s.pet;
  if (!p) return { v: WIDGET_VERSION, made: now, pet: null, moments: [] };
  const room = ROOMS[p.room] ?? ROOMS.peach;
  const stage = stageOf(p);
  const moments = [];
  for (let t = now; t <= now + AHEAD; t += t - now < FINE ? STEP_FINE : STEP_COARSE) {
    // The game ticks from the save to whenever it's opened, so each moment starts from the save too.
    const later = { pet: { ...p } };
    tick(later, t);
    const next = moment(later.pet, t);
    if (!moments.length || !sameMoment(moments[moments.length - 1], next)) moments.push(next);
  }
  return {
    v: WIDGET_VERSION,
    made: now,
    pet: {
      name: p.name,
      breed: p.breed,
      coat: p.coat,
      stage: stage.id,
      kind: `${stage.name} ${BREEDS[p.breed].name}`,
      wall: room.wall,
    },
    moments,
  };
}

/**
 * A short key for what the widget shows right now. The app asks the widget to redraw when it changes,
 * rather than with every save.
 */
export function widgetKey(snapshot) {
  const pet = snapshot.pet;
  if (!pet) return 'egg';
  const now = snapshot.moments[0];
  return [pet.name, pet.breed, pet.coat, pet.stage, pet.wall.join(','), now.mood, now.asleep, now.low, NEEDS.map((n) => now.needs[n]).join(',')].join('|');
}
