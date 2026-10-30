// The rules of raising a Pockling, with no drawing in them: needs that move with real time, growth,
// love, berries and daily stamps. The state is a plain object that saves as JSON. A Pockling never dies
// and never leaves: at worst it's a little sad and very pleased to see you.
import { BREEDS, FOODS, OUTFITS, ROOMS, STAGES, STICKERS, TASTES } from './catalog.js';
import { clamp, dayNumber, seeded } from './util.js';

export const SAVE_VERSION = 1;

/** How much each need falls per hour, awake and asleep. Energy climbs while asleep. */
export const RATES = {
  awake: { tummy: -6, clean: -2.4, energy: -5, fun: -5, love: -1.6 },
  asleep: { tummy: -2.5, clean: -0.8, energy: 24, fun: -1, love: -0.5 },
};

/** Time away can't take a need below this, so coming back never feels like a punishment. */
export const FLOOR = 14;

export const NEEDS = ['tummy', 'clean', 'energy', 'fun', 'love'];

const HOUR = 3600000;

export function newGame() {
  return {
    v: SAVE_VERSION,
    pet: null,
    berries: 30,
    owned: { outfits: [], rooms: ['peach'] },
    settings: { sound: true, music: true, haptics: true, reminders: false },
    stamps: [],
    streak: 0,
    lastVisit: null,
    totals: { fed: 0, petted: 0, washed: 0, walked: 0, played: 0, slept: 0, talked: 0 },
    best: {},
    foodsTried: [],
    tutorial: {},
  };
}

/** Brings an old save up to date and fills in anything missing. */
export function migrate(saved) {
  const base = newGame();
  if (!saved || typeof saved !== 'object') return base;
  const s = { ...base, ...saved };
  s.owned = { ...base.owned, ...saved.owned };
  s.settings = { ...base.settings, ...saved.settings };
  s.totals = { ...base.totals, ...saved.totals };
  s.tutorial = { ...base.tutorial, ...saved.tutorial };
  s.best = { ...base.best, ...saved.best };
  s.v = SAVE_VERSION;
  if (s.pet) {
    for (const need of NEEDS) s.pet[need] = clamp(Number(s.pet[need]) || 0, 0, 100);
    if (!BREEDS[s.pet.breed]) s.pet = null;
  }
  return s;
}

export function adopt(s, { breed, coat, name, seed = 1 }, now) {
  s.pet = {
    breed,
    coat,
    name: cleanName(name) || BREEDS[breed].name,
    seed,
    born: now,
    lastTick: now,
    tummy: 72,
    clean: 92,
    energy: 88,
    fun: 62,
    love: 45,
    xp: 0,
    careDays: 0,
    lastCareDay: null,
    asleep: false,
    outfit: {},
    room: 'peach',
    bathDirt: 0,
  };
  return s.pet;
}

export function cleanName(name) {
  return String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 12);
}

// ── Time ─────────────────────────────────────────────────────────────────────────────────────────

/** Applies `hours` at a set of rates. A need can't fall below the floor from time passing. */
function apply(p, rates, hours) {
  for (const need of NEEDS) {
    const change = rates[need] * hours;
    if (change < 0) {
      if (p[need] > FLOOR) p[need] = Math.max(FLOOR, p[need] + change);
    } else {
      p[need] = Math.min(100, p[need] + change);
    }
  }
}

/** Moves the pet forward to `now`. Safe to call often; if the clock went backwards nothing changes. */
export function tick(s, now) {
  const p = s.pet;
  if (!p) return;
  const hours = (now - p.lastTick) / HOUR;
  p.lastTick = now;
  if (hours <= 0) return;
  let left = hours;
  if (p.asleep) {
    const toFull = (100 - p.energy) / RATES.asleep.energy;
    const slept = Math.min(left, Math.max(toFull, 0));
    apply(p, RATES.asleep, slept);
    left -= slept;
    if (p.energy >= 100) p.asleep = false;
  }
  if (left > 0 && !p.asleep) apply(p, RATES.awake, left);
}

// ── Reading the pet ──────────────────────────────────────────────────────────────────────────────

export function stageOf(p) {
  let stage = STAGES[0];
  for (const st of STAGES) {
    if (p.careDays >= st.days) stage = st;
  }
  return stage;
}

/** Days since hatching, counted from local midnights. */
export function ageDays(p, now) {
  return Math.max(0, dayNumber(now) - dayNumber(p.born));
}

export function happiness(p) {
  return (p.tummy + p.clean + p.energy + p.fun + p.love) / 5;
}

/** What the pet most wants right now, or how it feels if it wants for nothing. */
export function mood(p) {
  if (p.asleep) return 'asleep';
  const wants = [['tummy', 'hungry'], ['energy', 'sleepy'], ['clean', 'dirty'], ['love', 'lonely'], ['fun', 'bored']];
  let worst = null;
  let lowest = 30;
  for (const [need, name] of wants) {
    if (p[need] < lowest) {
      lowest = p[need];
      worst = name;
    }
  }
  if (worst) return worst;
  const h = happiness(p);
  if (h >= 78) return 'joyful';
  if (h >= 55) return 'content';
  return 'okay';
}

/** XP needed to reach a level: 30, 90, 180, 300... */
export function xpForLevel(level) {
  return 15 * level * (level - 1);
}

export function levelOf(xp) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

/** How far through the current level, 0 to 1. */
export function levelProgress(xp) {
  const level = levelOf(xp);
  const from = xpForLevel(level);
  return (xp - from) / (xpForLevel(level + 1) - from);
}

const TRAITS = [
  ['fed', 'Snacky'],
  ['petted', 'Cuddly'],
  ['walked', 'Adventurous'],
  ['played', 'Playful'],
  ['washed', 'Squeaky-clean'],
  ['slept', 'Sleepy'],
  ['talked', 'Chatty'],
];

/** The pet's personality, from what you do most together. */
export function trait(s) {
  const weights = { fed: 1, petted: 0.06, walked: 3, played: 2, washed: 2.5, slept: 2.5, talked: 1.2 };
  let best = 'Curious';
  let top = 0;
  for (const [key, name] of TRAITS) {
    const v = (s.totals[key] ?? 0) * weights[key];
    if (v > top) {
      top = v;
      best = name;
    }
  }
  return top < 3 ? 'Curious' : best;
}

// ── Care ─────────────────────────────────────────────────────────────────────────────────────────

function add(p, need, amount) {
  p[need] = clamp(p[need] + amount, 0, 100);
}

/**
 * Credits a caring action. Returns anything to celebrate: a new level, a new stage. The first care of
 * each calendar day is what makes a Pockling grow.
 */
function credit(s, xp, now) {
  const p = s.pet;
  const before = levelOf(p.xp);
  const stageBefore = stageOf(p).id;
  p.xp += xp;
  const today = dayNumber(now);
  if (p.lastCareDay !== today) {
    p.lastCareDay = today;
    p.careDays += 1;
  }
  const after = levelOf(p.xp);
  const gift = after > before ? 15 + after * 5 : 0;
  s.berries += gift;
  const stage = stageOf(p).id;
  return {
    levelUp: after > before ? after : null,
    gift,
    grew: stage !== stageBefore ? stage : null,
  };
}

export function tasteOf(breed, foodId) {
  const t = TASTES[breed];
  if (t.love === foodId) return 'love';
  if (t.hate === foodId) return 'hate';
  return 'fine';
}

/** Feeding. Returns { ok, reason?, taste, ...celebrations }. Hated food gets spat out, for free. */
export function feed(s, foodId, now) {
  const p = s.pet;
  const food = FOODS[foodId];
  if (!food) return { ok: false, reason: 'unknown' };
  if (p.asleep) return { ok: false, reason: 'asleep' };
  const taste = tasteOf(p.breed, foodId);
  if (taste === 'hate') {
    if (!s.foodsTried.includes(foodId)) s.foodsTried.push(foodId);
    add(p, 'fun', -2);
    return { ok: true, taste, ate: false };
  }
  if (p.tummy >= 97) return { ok: false, reason: 'full' };
  if (s.berries < food.cost) return { ok: false, reason: 'berries' };
  s.berries -= food.cost;
  add(p, 'tummy', food.tummy);
  add(p, 'fun', food.fun + (taste === 'love' ? 6 : 0));
  add(p, 'love', taste === 'love' ? 5 : 1.5);
  s.totals.fed += 1;
  if (!s.foodsTried.includes(foodId)) s.foodsTried.push(foodId);
  return { ok: true, taste, ate: true, ...credit(s, taste === 'love' ? 5 : 3, now) };
}

/** Stroking and cuddling: small amounts, called as the finger moves. */
export function cuddle(s, amount, now) {
  const p = s.pet;
  add(p, 'love', amount);
  add(p, 'fun', amount * 0.25);
  s.totals.petted += amount;
  s.cuddleBank = (s.cuddleBank ?? 0) + amount;
  if (s.cuddleBank >= 10) {
    s.cuddleBank -= 10;
    return credit(s, 2, now);
  }
  return { levelUp: null, gift: 0, grew: null };
}

export function setClean(s, value) {
  s.pet.clean = clamp(value, 0, 100);
}

export function finishBath(s, now) {
  const p = s.pet;
  p.clean = 100;
  add(p, 'fun', 6);
  add(p, 'love', 4);
  p.bathDirt = 0;
  s.totals.washed += 1;
  return credit(s, 6, now);
}

export function goToSleep(s, now) {
  tick(s, now);
  const p = s.pet;
  if (p.energy >= 97) return { ok: false, reason: 'awake' };
  p.asleep = true;
  s.totals.slept += 1;
  return { ok: true, ...credit(s, 3, now) };
}

export function wakeUp(s, now) {
  tick(s, now);
  s.pet.asleep = false;
}

const GAME_REWARD = { fetch: 3, snack: 0.5, hide: 4, bubbles: 0.35 };

/** After a mini-game: fun goes up, energy and tummy come down, and the score earns berries. */
export function played(s, game, score, now) {
  const p = s.pet;
  add(p, 'fun', 22);
  add(p, 'love', 4);
  add(p, 'energy', -9);
  add(p, 'tummy', -5);
  s.totals.played += 1;
  const berries = Math.min(40, Math.round(score * (GAME_REWARD[game] ?? 1)));
  s.berries += berries;
  const record = score > (s.best[game] ?? 0);
  if (record) s.best[game] = score;
  return { berries, record, ...credit(s, 6, now) };
}

/** After a walk: metres walked, berries found, and whether it went through the mud. */
export function walked(s, metres, found, muddy, now) {
  const p = s.pet;
  const share = clamp(metres / 150);
  add(p, 'fun', 10 + share * 22);
  add(p, 'love', 3 + share * 6);
  add(p, 'energy', -(4 + share * 10));
  add(p, 'tummy', -(2 + share * 6));
  add(p, 'clean', -(muddy ? 28 : 6));
  if (muddy) p.bathDirt = 1;
  s.totals.walked += 1;
  s.berries += found;
  return credit(s, 4 + Math.round(share * 6), now);
}

export function talked(s, now) {
  const p = s.pet;
  add(p, 'fun', 3);
  add(p, 'love', 1.5);
  s.totals.talked += 1;
  return credit(s, 1, now);
}

// ── Things to own ────────────────────────────────────────────────────────────────────────────────

export function buyOutfit(s, id) {
  const item = OUTFITS[id];
  if (!item || s.owned.outfits.includes(id)) return false;
  if (s.berries < item.cost) return false;
  s.berries -= item.cost;
  s.owned.outfits.push(id);
  return true;
}

export function wear(s, id) {
  const item = OUTFITS[id];
  const p = s.pet;
  if (!item || !s.owned.outfits.includes(id)) return false;
  p.outfit[item.slot] = p.outfit[item.slot] === id ? null : id;
  return true;
}

export function buyRoom(s, id) {
  const room = ROOMS[id];
  if (!room || s.owned.rooms.includes(id)) return false;
  if (s.berries < room.cost) return false;
  s.berries -= room.cost;
  s.owned.rooms.push(id);
  return true;
}

export function useRoom(s, id) {
  if (!s.owned.rooms.includes(id)) return false;
  s.pet.room = id;
  return true;
}

// ── Daily visit ──────────────────────────────────────────────────────────────────────────────────

/**
 * The first visit of a calendar day: a stamp for the book, and a gift that grows with the streak.
 * Returns null if today is already stamped.
 */
export function dailyVisit(s, now) {
  const today = dayNumber(now);
  if (s.lastVisit === today) return null;
  if (s.lastVisit !== null && today < s.lastVisit) {
    // The clock went backwards. Don't hand out anything, just wait for it to catch up.
    return null;
  }
  s.streak = s.lastVisit === today - 1 ? s.streak + 1 : 1;
  s.lastVisit = today;
  const rng = seeded(today * 2654435761);
  const sticker = STICKERS[Math.floor(rng() * STICKERS.length)];
  s.stamps.push({ day: today, sticker });
  if (s.stamps.length > 400) s.stamps.shift();
  const berries = 10 + Math.min(s.streak, 10) * 2;
  s.berries += berries;
  return { berries, sticker, streak: s.streak, first: s.stamps.length === 1 };
}
