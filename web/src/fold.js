// The iPhone Duo's crease. Opened, its inner screen folds down the middle when it's held like a book, and
// across the middle when it stands like a laptop. The app tells the game where the crease is
// (ios/Pockling/GameScreen.swift), as a band, even while the phone lies flat, so nothing jumps as the hinge
// moves. The game keeps the pet, its buttons and its menus off the band: the pet gets one side of it to
// itself, its stage. Held like a book, that's the left page, and menus open on the right one. Standing like a
// laptop, it's the bottom page: the floor, with the wall standing up behind it.
//
// Pure numbers, no DOM, so test/fold.test.mjs can check them.

/** How far the pet keeps from the crease, in CSS pixels. */
export const CREASE_GAP = 12;

/**
 * Room under the pet standing like a laptop, in the HUD's own pixels (before its zoom): for the dock, and
 * for the food tray to leave its mouth in view when it opens.
 */
export const FLOOR_ROOM = 116;

/**
 * How far a grown pet of each kind reaches above its feet, and out to its widest side (its tail or its ears),
 * standing at view.u 1. Measured from the drawn pets; a younger pet is smaller. The bunny's ears are the
 * tallest and the puppy's the widest.
 */
export const REACH = {
  kitling: { up: 232, side: 134 },
  bunling: { up: 280, side: 158 },
  puppling: { up: 209, side: 212 },
  cubling: { up: 225, side: 122 },
  foxling: { up: 244, side: 185 },
  drakling: { up: 234, side: 153 },
};
const MOST = { up: 280, side: 212 };
/** Wagging, hopping and stretching take it a little further than it stands. */
export const SWAY = 1.06;

/**
 * A pet's reach: by breed id, or for a pet ({ breed, look }) with the player's own ears, tail and wings
 * (catalog.js partsOf), from the breeds they came from. The ears set its height; the widest of ears, tail and
 * wings, its sides.
 */
export function reachOf(pet) {
  if (!pet || typeof pet === 'string') return REACH[pet] ?? MOST;
  const own = REACH[pet.breed] ?? MOST;
  const look = pet.look;
  if (!look) return own;
  const ears = REACH[look.ears] ?? own;
  const tail = REACH[look.tail] ?? own;
  const winged = typeof look.wings === 'boolean' ? look.wings : pet.breed === 'drakling';
  return { up: ears.up, side: Math.max(ears.side, tail.side, winged ? REACH.drakling.side : 0) };
}

/**
 * The crease from the app's message, { y, vertical, start, end } in CSS pixels across the screen (y is the
 * middle, and the 1.3 app sent only y and vertical), as { vertical, a, b }: where the band starts and ends.
 * Null without one, and for one that doesn't divide this screen into two pages, as a message sent just
 * before the screen turned can.
 */
export function creaseOf(fold, w, h) {
  if (!fold || !Number.isFinite(fold.y)) return null;
  const vertical = Boolean(fold.vertical);
  const span = vertical ? w : h;
  const a = Number.isFinite(fold.start) ? fold.start : fold.y - 20;
  const b = Number.isFinite(fold.end) ? fold.end : fold.y + 20;
  if (!(b > a) || a < span * 0.3 || b > span * 0.7) return null;
  return { vertical, a, b };
}

/** The pet's part of the screen, { x, y, w, h, cx, cy }: all of it, or the page beside the crease. */
export function stageOf(w, h, crease) {
  let r = { x: 0, y: 0, w, h };
  if (crease?.vertical) r = { x: 0, y: 0, w: crease.a, h };
  else if (crease) r = { x: 0, y: crease.b, w, h: h - crease.b };
  return { ...r, cx: r.x + r.w / 2, cy: r.y + r.h / 2 };
}

/**
 * Where the room goes on a screen w by h (CSS pixels): u, the scale everything is drawn at; the horizon,
 * where the wall meets the floor; floorY, where the pet stands at home; the crease and the stage. safeBottom
 * is the safe area under the HUD, and ui the HUD's zoom.
 */
export function frameFor(w, h, { fold = null, pet = null, breed = pet, safeBottom = 0, ui = 1 } = {}) {
  const crease = creaseOf(fold, w, h);
  const stage = stageOf(w, h, crease);
  const reach = reachOf(breed);
  let u = clamp(Math.min(w, h * (w > h ? 0.78 : 0.6)) / 390, 0.62, 2.4);
  let horizon = Math.round(h * (w > h ? 0.56 : 0.6));
  let floorY = horizon + Math.min((h - horizon) * 0.44, 150 * u);
  if (crease && !crease.vertical) {
    // A laptop: the wall stands up behind the crease and the floor lies in front of it, so the floor starts on
    // the fold, and the pet stands on the floor whole, just above the dock.
    horizon = (crease.a + crease.b) / 2;
    floorY = h - safeBottom - FLOOR_ROOM * ui;
    u = clamp(Math.min(u, (floorY - crease.b - CREASE_GAP) / (reach.up * SWAY)), 0.62, 2.4);
  } else if (crease) {
    // A book: the pet has the left page, which is about a phone's screen, so it's drawn at a phone's size,
    // and no wider than the page.
    const page = Math.min(crease.a, h * 0.6) / 390;
    u = clamp(Math.min(u, page, (crease.a - 2 * CREASE_GAP) / (2 * reach.side * SWAY)), 0.62, 2.4);
    floorY = horizon + Math.min((h - horizon) * 0.44, 150 * u);
  }
  return { u, horizon, floorY, crease, stage };
}

/**
 * The highest the pet's feet can be with all of it below a laptop's crease, for a pet drawn at this scale
 * (actor.scale × view.u), so its ears are off the fold. Without that crease, anywhere goes.
 */
export function minFeetY(view, pet, scale = view.u) {
  if (!view.crease || view.crease.vertical) return -Infinity;
  return view.crease.b + CREASE_GAP + reachOf(pet).up * SWAY * scale;
}

/** An x for the pet clamped into its stage, keeping its widest side clear of a book's crease. */
export function onStage(view, pet, x, scale = view.u) {
  if (!view.crease?.vertical) return x;
  const half = reachOf(pet).side * SWAY * scale;
  const lo = view.stage.x + Math.min(half + CREASE_GAP, view.stage.w / 2);
  const hi = view.stage.x + view.stage.w - Math.min(half + CREASE_GAP, view.stage.w / 2);
  return clamp(x, lo, hi);
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}
