// The Snow Festival's rules (web/src/festival.js): settings from the event's payload, snowflakes from the window
// and walks, and the rewards they earn.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULTS, OWNED_BERRIES, catchWindowFlake, festivalNow, festivalSettings, festivalSoon, festivalState, findWalkFlake, nextReward, walkFlakesLeft, windowFlakeDue,
} from '../web/src/festival.js';
import { adopt, migrate, newGame } from '../web/src/state.js';

const DAY = 86400000;
const T0 = new Date(2026, 11, 15, 18, 0, 0).getTime();
const EVENT = { id: 'snow-festival-2026', kind: 'snow_festival', title: 'Snow Festival', start: Math.floor(T0 / 1000) - 3600, end: Math.floor(T0 / 1000) + 30 * 86400, payload: {} };

function game() {
  const s = newGame();
  adopt(s, { breed: 'kitling', coat: 'peach', name: 'Mochi' }, T0);
  return s;
}

test('with no payload, the defaults are the festival', () => {
  assert.deepEqual(festivalSettings(EVENT), DEFAULTS);
  assert.deepEqual(festivalSettings(null), DEFAULTS);
});

test('a payload sets what it can, and nonsense falls back', () => {
  const set = festivalSettings({ payload: { goal: 9, outfits: ['crown', 'scarf'], steps: [3, 9], window: 2, walk: 4, room: 'snow', park: 'none' } });
  assert.deepEqual(set, { room: 'snow', park: 'none', goal: 9, outfits: ['crown', 'scarf'], steps: [3, 9], window: 2, walk: 4 });
  const odd = festivalSettings({ payload: { goal: 'lots', outfits: ['nope'], steps: [0], window: -1, walk: 99 } });
  assert.deepEqual(odd, DEFAULTS);
  assert.equal(festivalSettings({ payload: { goal: 3 } }).goal, 7, 'the goal is never short of the last reward');
});

test('one snowflake at the window a day', () => {
  const s = game();
  assert.ok(windowFlakeDue(s, EVENT, T0));
  const r = catchWindowFlake(s, EVENT, T0);
  assert.deepEqual([r.gained, r.flakes, r.goal, r.rewards], [1, 1, 7, []]);
  assert.equal(windowFlakeDue(s, EVENT, T0 + 3600000), false, 'not again today');
  assert.equal(catchWindowFlake(s, EVENT, T0 + 3600000), null);
  assert.ok(windowFlakeDue(s, EVENT, T0 + DAY), 'tomorrow, another');
});

test('walks find up to two a day', () => {
  const s = game();
  assert.equal(walkFlakesLeft(s, EVENT, T0), 2);
  assert.equal(findWalkFlake(s, EVENT, T0).flakes, 1);
  assert.equal(findWalkFlake(s, EVENT, T0).flakes, 2);
  assert.equal(findWalkFlake(s, EVENT, T0), null);
  assert.equal(walkFlakesLeft(s, EVENT, T0 + DAY), 2, 'a new day, two more');
});

test('2, 4 and 7 snowflakes earn the beanie, the hat and the scarf, once each', () => {
  const s = game();
  const got = [];
  for (let d = 0; d < 10; d++) {
    const now = T0 + d * DAY;
    for (const r of [catchWindowFlake(s, EVENT, now), findWalkFlake(s, EVENT, now), findWalkFlake(s, EVENT, now)]) if (r) got.push(...r.rewards.map((x) => x.outfit));
  }
  assert.deepEqual(got, ['beanie', 'santa', 'scarf']);
  for (const o of got) assert.ok(s.owned.outfits.includes(o));
  assert.equal(festivalState(s, EVENT).flakes, 7, 'no more than the goal');
  assert.equal(nextReward(s, EVENT), null);
  assert.equal(windowFlakeDue(s, EVENT, T0 + 20 * DAY), false, 'nothing left to catch');
  assert.equal(walkFlakesLeft(s, EVENT, T0 + 20 * DAY), 0);
});

test('a reward the player already owns gives berries instead', () => {
  const s = game();
  s.owned.outfits.push('beanie');
  const berries = s.berries;
  catchWindowFlake(s, EVENT, T0);
  const r = catchWindowFlake(s, EVENT, T0 + DAY);
  assert.deepEqual(r.rewards, [{ outfit: 'beanie', berries: OWNED_BERRIES }]);
  assert.equal(s.berries, berries + OWNED_BERRIES);
  assert.equal(s.owned.outfits.filter((o) => o === 'beanie').length, 1);
});

test('progress is kept by the event id and survives a save', () => {
  const s = game();
  catchWindowFlake(s, EVENT, T0);
  const loaded = migrate(JSON.parse(JSON.stringify(s)));
  assert.equal(festivalState(loaded, EVENT).flakes, 1);
  assert.equal(festivalState(loaded, { ...EVENT, id: 'snow-festival-2027' }).flakes, 0, 'next year starts afresh');
});

test('the festival is on only between its start and end, and only for this version and kind', () => {
  globalThis.NINEIO_LIVE = { app: 'pockling', events: [
    { ...EVENT, min_version: '1.4.1' },
    { ...EVENT, id: 'later', start: EVENT.end + 86400, end: EVENT.end + 2 * 86400 },
    { ...EVENT, id: 'too-new', min_version: '9.0' },
    { ...EVENT, id: 'cup', kind: 'winter_cup' },
  ] };
  try {
    assert.equal(festivalNow(T0)?.id, 'snow-festival-2026');
    assert.equal(festivalNow(EVENT.start * 1000 - 1), null, 'not before it starts');
    assert.equal(festivalNow(EVENT.end * 1000), null, 'not once it ends');
    assert.equal(festivalSoon(EVENT.end * 1000 + 1000)?.id, 'later');
  } finally {
    delete globalThis.NINEIO_LIVE;
  }
});
