import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  adopt, ageDays, buyOutfit, buyRoom, cleanName, cuddle, dailyVisit, feed, finishBath, FLOOR, goToSleep, happiness, levelOf, levelProgress, migrate, mood, NEEDS, newGame, played, RATES, stageOf, tasteOf, tick, trait, useRoom, walked, wakeUp, wear, xpForLevel,
} from '../web/src/state.js';
import { BREED_IDS, BREEDS, FOOD_IDS, FOODS, OUTFIT_IDS, OUTFITS, ROOM_IDS, ROOMS, STAGES, STICKERS, TASTES } from '../web/src/catalog.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const T0 = new Date(2026, 9, 31, 10, 0, 0).getTime();

function game(now = T0) {
  const s = newGame();
  adopt(s, { breed: 'kitling', coat: 'peach', name: 'Mochi' }, now);
  return s;
}

test('needs fall at their hourly rate while awake', () => {
  const s = game();
  const p = s.pet;
  const before = { ...p };
  tick(s, T0 + 2 * HOUR);
  for (const need of NEEDS) {
    assert.ok(Math.abs(p[need] - (before[need] + RATES.awake[need] * 2)) < 1e-6, need);
  }
});

test('time away never takes a need below the floor', () => {
  const s = game();
  tick(s, T0 + 30 * DAY);
  for (const need of NEEDS) assert.equal(s.pet[need], FLOOR, need);
  assert.equal(mood(s.pet), 'hungry');
});

test('a need already under the floor stays put rather than jumping up', () => {
  const s = game();
  s.pet.fun = 5;
  tick(s, T0 + 5 * HOUR);
  assert.equal(s.pet.fun, 5);
});

test('a clock moved backwards changes nothing', () => {
  const s = game();
  const before = { ...s.pet };
  tick(s, T0 - 10 * HOUR);
  for (const need of NEEDS) assert.equal(s.pet[need], before[need]);
  tick(s, T0 - 9 * HOUR);
  assert.ok(s.pet.tummy < before.tummy, 'time counts again from the new clock');
});

test('sleep refills energy, wakes when full, then normal time resumes', () => {
  const s = game();
  s.pet.energy = 40;
  assert.equal(goToSleep(s, T0).ok, true);
  assert.equal(mood(s.pet), 'asleep');
  const fullAfter = 60 / RATES.asleep.energy;
  tick(s, T0 + (fullAfter - 0.5) * HOUR);
  assert.equal(s.pet.asleep, true);
  tick(s, T0 + (fullAfter + 1) * HOUR);
  assert.equal(s.pet.asleep, false);
  assert.ok(Math.abs(s.pet.energy - (100 + RATES.awake.energy)) < 1e-6);
});

test('asleep, the other needs fall more slowly', () => {
  const a = game();
  const b = game();
  a.pet.energy = 20;
  b.pet.energy = 20;
  a.pet.tummy = 80;
  b.pet.tummy = 80;
  goToSleep(a, T0);
  tick(a, T0 + HOUR);
  tick(b, T0 + HOUR);
  assert.ok(a.pet.tummy > b.pet.tummy);
});

test('a wide-awake pet refuses to go to bed', () => {
  const s = game();
  s.pet.energy = 100;
  assert.deepEqual(goToSleep(s, T0), { ok: false, reason: 'awake' });
  assert.equal(s.pet.asleep, false);
});

test('waking up keeps what sleep gave', () => {
  const s = game();
  s.pet.energy = 40;
  goToSleep(s, T0);
  wakeUp(s, T0 + HOUR);
  assert.equal(s.pet.asleep, false);
  assert.ok(Math.abs(s.pet.energy - (40 + RATES.asleep.energy)) < 1e-6);
});

test('feeding fills the tummy and costs the food price', () => {
  const s = game();
  s.pet.tummy = 40;
  s.berries = 10;
  const r = feed(s, 'cookie', T0);
  assert.equal(r.ok, true);
  assert.equal(r.ate, true);
  assert.equal(s.pet.tummy, 40 + FOODS.cookie.tummy);
  assert.equal(s.berries, 10 - FOODS.cookie.cost);
});

test('basic food is always free, so a pet can never starve for lack of berries', () => {
  const free = FOOD_IDS.filter((id) => FOODS[id].cost === 0);
  assert.ok(free.length >= 3);
  for (const breed of BREED_IDS) {
    assert.ok(free.some((id) => TASTES[breed].hate !== id), `${breed} has a free food it will eat`);
  }
});

test('you can\'t pay for food you can\'t afford', () => {
  const s = game();
  s.pet.tummy = 40;
  s.berries = 1;
  assert.deepEqual(feed(s, 'cake', T0), { ok: false, reason: 'berries' });
  assert.equal(s.berries, 1);
});

test('a full pet turns food down and nothing is charged', () => {
  const s = game();
  s.pet.tummy = 99;
  s.berries = 20;
  assert.deepEqual(feed(s, 'cookie', T0), { ok: false, reason: 'full' });
  assert.equal(s.berries, 20);
});

test('favourites give more love; hated food is spat out for free', () => {
  const s = game();
  s.pet.tummy = 20;
  s.pet.love = 50;
  s.berries = 50;
  const love = feed(s, TASTES.kitling.love, T0);
  assert.equal(love.taste, 'love');
  const afterLove = s.pet.love;
  assert.ok(afterLove > 50 + 3);
  const tummy = s.pet.tummy;
  const berries = s.berries;
  const hate = feed(s, TASTES.kitling.hate, T0);
  assert.equal(hate.taste, 'hate');
  assert.equal(hate.ate, false);
  assert.equal(s.pet.tummy, tummy);
  assert.equal(s.berries, berries);
});

test('every breed has a distinct favourite and hate from real foods', () => {
  for (const id of BREED_IDS) {
    const t = TASTES[id];
    assert.ok(FOODS[t.love], id);
    assert.ok(FOODS[t.hate], id);
    assert.notEqual(t.love, t.hate);
    assert.equal(tasteOf(id, t.love), 'love');
    assert.equal(tasteOf(id, t.hate), 'hate');
  }
});

test('it grows with days of care, not with days passing', () => {
  const s = game();
  assert.equal(stageOf(s.pet).id, 'baby');
  s.pet.tummy = 10;
  let t = T0;
  const r1 = feed(s, 'apple', t);
  assert.equal(r1.grew, null);
  assert.equal(s.pet.careDays, 1);
  feed(s, 'apple', t + HOUR);
  assert.equal(s.pet.careDays, 1, 'twice in a day counts once');
  tick(s, T0 + 20 * DAY);
  assert.equal(stageOf(s.pet).id, 'baby', 'no care, no growing');
  t = T0 + 21 * DAY;
  s.pet.tummy = 10;
  const r2 = feed(s, 'apple', t);
  assert.equal(r2.grew, 'kid');
  s.pet.careDays = STAGES[2].days - 1;
  s.pet.tummy = 10;
  const r3 = feed(s, 'apple', t + DAY);
  assert.equal(r3.grew, 'grown');
});

test('levels: thresholds rise and progress stays within 0 to 1', () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(levelOf(0), 1);
  assert.equal(levelOf(29), 1);
  assert.equal(levelOf(30), 2);
  assert.equal(levelOf(90), 3);
  for (let xp = 0; xp < 2000; xp += 37) {
    const p = levelProgress(xp);
    assert.ok(p >= 0 && p < 1, `${xp}`);
  }
});

test('a level up pays berries', () => {
  const s = game();
  s.pet.xp = 29;
  s.pet.tummy = 10;
  const berries = s.berries;
  const r = feed(s, 'apple', T0);
  assert.equal(r.levelUp, 2);
  assert.ok(s.berries > berries);
});

test('cuddling raises love and banks xp slowly', () => {
  const s = game();
  s.pet.love = 10;
  let xp = 0;
  for (let i = 0; i < 40; i++) xp = cuddle(s, 1, T0);
  assert.equal(s.pet.love, 50);
  assert.equal(s.pet.xp, 8);
  assert.ok(xp);
});

test('needs never leave 0 to 100 whatever you do', () => {
  const s = game();
  for (let i = 0; i < 50; i++) {
    cuddle(s, 50, T0);
    played(s, 'fetch', 10, T0);
    walked(s, 500, 3, true, T0);
    finishBath(s, T0);
    feed(s, 'apple', T0);
  }
  for (const need of NEEDS) assert.ok(s.pet[need] >= 0 && s.pet[need] <= 100, need);
  assert.ok(happiness(s.pet) >= 0);
});

test('a muddy walk makes it dirty, and a bath clears it', () => {
  const s = game();
  s.pet.clean = 80;
  walked(s, 100, 4, true, T0);
  assert.equal(s.pet.bathDirt, 1);
  assert.equal(s.pet.clean, 52);
  finishBath(s, T0);
  assert.equal(s.pet.clean, 100);
  assert.equal(s.pet.bathDirt, 0);
});

test('mini-game berries are capped and records are kept', () => {
  const s = game();
  const r = played(s, 'snack', 500, T0);
  assert.equal(r.berries, 40);
  assert.equal(r.record, true);
  assert.equal(played(s, 'snack', 10, T0).record, false);
  assert.equal(s.best.snack, 500);
});

test('buying: not twice, not without berries; wearing toggles and needs ownership', () => {
  const s = game();
  s.berries = 30;
  assert.equal(wear(s, 'bow'), false);
  assert.equal(buyOutfit(s, 'crown'), false);
  assert.equal(buyOutfit(s, 'bow'), true);
  assert.equal(s.berries, 30 - OUTFITS.bow.cost);
  assert.equal(buyOutfit(s, 'bow'), false);
  assert.equal(wear(s, 'bow'), true);
  assert.equal(s.pet.outfit.head, 'bow');
  assert.equal(wear(s, 'bow'), true);
  assert.equal(s.pet.outfit.head, null);
});

test('rooms: the first is free and others must be bought', () => {
  const s = game();
  s.berries = 1000;
  assert.equal(useRoom(s, 'mint'), false);
  assert.equal(buyRoom(s, 'mint'), true);
  assert.equal(useRoom(s, 'mint'), true);
  assert.equal(s.pet.room, 'mint');
});

test('the catalogue is sound', () => {
  for (const id of BREED_IDS) {
    const b = BREEDS[id];
    assert.ok(b.coats.length >= 3, id);
    for (const c of b.coats) assert.equal(c.fur.length, 4, `${id}/${c.id}`);
  }
  for (const id of OUTFIT_IDS) assert.ok(['head', 'face', 'neck'].includes(OUTFITS[id].slot), id);
  assert.equal(ROOMS.peach.cost, 0);
  assert.ok(ROOM_IDS.length >= 4);
});

test('daily visit: once a day, the streak counts consecutive days and breaks on a gap', () => {
  const s = game();
  const d1 = dailyVisit(s, T0);
  assert.equal(d1.streak, 1);
  assert.equal(d1.first, true);
  assert.ok(STICKERS.includes(d1.sticker));
  assert.equal(dailyVisit(s, T0 + HOUR), null);
  const d2 = dailyVisit(s, T0 + DAY);
  assert.equal(d2.streak, 2);
  assert.ok(d2.berries > d1.berries);
  const d3 = dailyVisit(s, T0 + 4 * DAY);
  assert.equal(d3.streak, 1);
  assert.equal(s.stamps.length, 3);
});

test('daily visit ignores a clock moved back, so it can\'t be farmed', () => {
  const s = game();
  dailyVisit(s, T0);
  const berries = s.berries;
  assert.equal(dailyVisit(s, T0 - 3 * DAY), null);
  assert.equal(s.berries, berries);
});

test('daily visit crosses a daylight-saving change as one day', () => {
  // US clocks go back on 1 November 2026: that local day is 25 hours long.
  const s = game();
  dailyVisit(s, new Date(2026, 10, 1, 0, 30).getTime());
  const next = dailyVisit(s, new Date(2026, 10, 2, 23, 30).getTime());
  assert.equal(next.streak, 2);
});

test('age counts calendar days from hatching', () => {
  const s = game(new Date(2026, 9, 31, 23, 50).getTime());
  assert.equal(ageDays(s.pet, new Date(2026, 9, 31, 23, 59).getTime()), 0);
  assert.equal(ageDays(s.pet, new Date(2026, 10, 1, 0, 1).getTime()), 1);
});

test('a personality emerges from what you do most', () => {
  const s = game();
  assert.equal(trait(s), 'Curious');
  s.totals.walked = 5;
  assert.equal(trait(s), 'Adventurous');
  s.totals.petted = 2000;
  assert.equal(trait(s), 'Cuddly');
});

test('names are tidied and cut to length, and an empty name falls back to the breed', () => {
  assert.equal(cleanName('  Mo   chi  '), 'Mo chi');
  assert.equal(cleanName('A very very long name'), 'A very very ');
  const s = newGame();
  adopt(s, { breed: 'foxling', coat: 'arctic', name: '   ' }, T0);
  assert.equal(s.pet.name, 'Foxling');
});

test('migrate survives junk and fills gaps without losing the pet', () => {
  assert.deepEqual(migrate(null).owned.rooms, ['peach']);
  const s = game();
  const saved = JSON.parse(JSON.stringify(s));
  delete saved.settings;
  saved.pet.tummy = 'oops';
  saved.pet.love = 900;
  const m = migrate(saved);
  assert.equal(m.pet.name, 'Mochi');
  assert.equal(m.settings.sound, true);
  assert.equal(m.pet.tummy, 0);
  assert.equal(m.pet.love, 100);
  assert.equal(migrate({ pet: { breed: 'nonsense' } }).pet, null);
});
