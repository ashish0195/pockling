import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BREED_IDS } from '../web/src/catalog.js';
import { CREASE_GAP, creaseOf, frameFor, minFeetY, onStage, REACH, reachOf, stageOf } from '../web/src/fold.js';

// The iPhone Duo's inner screen, in points, as the simulator reports it (iOS 27.2): a band 40 wide across the
// middle, down it when held like a book, across it standing like a laptop. 34 points of home indicator.
const BOOK = { w: 951, h: 669, fold: { y: 475.5, vertical: true, start: 455.5, end: 495.5 } };
const LAPTOP = { w: 669, h: 951, fold: { y: 475.5, vertical: false, start: 455.5, end: 495.5 } };
const SAFE = 34;
const UI = 669 / 560;

test('every kind of pet has a measured reach', () => {
  for (const breed of BREED_IDS) assert.ok(REACH[breed], breed);
  assert.deepEqual(reachOf('nobody'), { up: 280, side: 212 });
});

test('the crease is read from the app, and from the 1.3 app that sent only its middle', () => {
  assert.deepEqual(creaseOf(LAPTOP.fold, LAPTOP.w, LAPTOP.h), { vertical: false, a: 455.5, b: 495.5 });
  assert.deepEqual(creaseOf({ y: 475.5, vertical: false }, 669, 951), { vertical: false, a: 455.5, b: 495.5 });
  assert.equal(creaseOf(null, 669, 951), null);
  assert.equal(creaseOf({ y: NaN, vertical: false }, 669, 951), null);
});

test('a crease that does not split this screen in two is ignored', () => {
  // Just after the screen turns, the app can still send the last orientation's band: down the middle of a
  // 951-wide screen is near the edge of a 669-wide one.
  assert.equal(creaseOf({ y: 475.5, vertical: true, start: 455.5, end: 495.5 }, 669, 951), null);
  assert.equal(creaseOf({ y: 40, vertical: false }, 669, 951), null);
});

test('the stage is the left page of a book and the bottom page of a laptop', () => {
  const book = stageOf(BOOK.w, BOOK.h, creaseOf(BOOK.fold, BOOK.w, BOOK.h));
  assert.deepEqual([book.x, book.y, book.w, book.h], [0, 0, 455.5, 669]);
  const laptop = stageOf(LAPTOP.w, LAPTOP.h, creaseOf(LAPTOP.fold, LAPTOP.w, LAPTOP.h));
  assert.deepEqual([laptop.x, laptop.y, laptop.w, laptop.h], [0, 495.5, 669, 455.5]);
  const whole = stageOf(466, 678, null);
  assert.deepEqual([whole.x, whole.y, whole.w, whole.h, whole.cx], [0, 0, 466, 678, 233]);
});

test('without a crease the room is laid out as before', () => {
  // The outer screen of a closed Duo, and the inner one in a build without the fold API.
  for (const [w, h] of [[466, 678], [669, 951], [951, 669], [402, 874]]) {
    const f = frameFor(w, h, { safeBottom: SAFE });
    const u = Math.min(2.4, Math.max(0.62, Math.min(w, h * (w > h ? 0.78 : 0.6)) / 390));
    const horizon = Math.round(h * (w > h ? 0.56 : 0.6));
    assert.equal(f.u, u);
    assert.equal(f.horizon, horizon);
    assert.equal(f.floorY, horizon + Math.min((h - horizon) * 0.44, 150 * u));
    assert.equal(f.crease, null);
  }
});

test('standing like a laptop, every pet stands whole on the floor below the crease, above the dock', () => {
  for (const breed of BREED_IDS) {
    const f = frameFor(LAPTOP.w, LAPTOP.h, { fold: LAPTOP.fold, breed, safeBottom: SAFE, ui: UI });
    assert.equal(f.horizon, 475.5, 'the wall meets the floor on the fold');
    const view = { ...f, w: LAPTOP.w, h: LAPTOP.h };
    const top = f.floorY - REACH[breed].up * f.u;
    assert.ok(top >= 495.5 + CREASE_GAP, `${breed}'s ears clear the crease`);
    assert.ok(minFeetY(view, breed) <= f.floorY + 0.001, `${breed} fits at home`);
    assert.ok(f.floorY < LAPTOP.h - SAFE - 80, `${breed} stands above the dock`);
    assert.ok(f.u > 0.9, `${breed} is still a good size (${f.u.toFixed(2)})`);
  }
});

test('held like a book, every pet fits its page, clear of the crease', () => {
  for (const breed of BREED_IDS) {
    const f = frameFor(BOOK.w, BOOK.h, { fold: BOOK.fold, breed, safeBottom: SAFE, ui: UI });
    const view = { ...f, w: BOOK.w, h: BOOK.h };
    const x = onStage(view, breed, f.stage.cx);
    const half = REACH[breed].side * f.u;
    assert.ok(x - half >= 0, `${breed} stays on the screen`);
    assert.ok(x + half <= 455.5 - CREASE_GAP + 0.001, `${breed} stays off the crease`);
    // Asked to wander onto the crease or the other page, it stays on its own.
    assert.ok(onStage(view, breed, 600) + half <= 455.5, `${breed} doesn't wander onto the crease`);
    assert.ok(f.u > 0.9, `${breed} is still a good size (${f.u.toFixed(2)})`);
  }
});

test('off a book, onStage leaves the pet where it is, and off a laptop, so does minFeetY', () => {
  const f = frameFor(LAPTOP.w, LAPTOP.h, { fold: LAPTOP.fold, breed: 'kitling', safeBottom: SAFE, ui: UI });
  assert.equal(onStage({ ...f, w: LAPTOP.w, h: LAPTOP.h }, 'kitling', 600), 600);
  for (const [w, h, fold] of [[466, 678, null], [BOOK.w, BOOK.h, BOOK.fold], [390, 844, null]]) {
    const view = { ...frameFor(w, h, { fold, breed: 'bunling' }), w, h };
    assert.equal(minFeetY(view, 'bunling'), -Infinity);
  }
});
