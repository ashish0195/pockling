// Snow for the Snow Festival (festival.js): flakes falling past the window at home, falling over the park on walks,
// and the big snowflake that waits at the window to be caught once a day. With Reduce Motion there are a third
// as many, and they drift straight down.
import { motion } from '../particles.js';
import { clamp, rand, TAU } from '../util.js';

/** Flakes in a box { x, y, w, h }, spread through it from the start. */
export function makeSnow(count) {
  const n = motion.reduced ? Math.ceil(count / 3) : count;
  return Array.from({ length: n }, () => ({ fx: Math.random(), fy: Math.random(), v: rand(0.08, 0.2), s: rand(0.6, 1.2), ph: rand(TAU) }));
}

/** Moves the flakes down the box: positions are fractions of it, so a resize keeps them in place. */
export function updateSnow(flakes, dt) {
  for (const f of flakes) {
    f.fy += f.v * dt;
    f.ph += dt * 1.3;
    if (f.fy > 1.04) {
      f.fy = -0.04;
      f.fx = Math.random();
    }
  }
}

/**
 * Draws the flakes in `box`, each `size` across at most: soft white dots, each on a faint blue halo so it shows
 * against a light sky as well as a dark one.
 */
export function drawSnow(g, assets, flakes, box, size, alpha = 0.92) {
  const dot = assets.get('fx.dot');
  for (const f of flakes) {
    const sway = motion.reduced ? 0 : Math.sin(f.ph) * size * 1.4;
    const x = box.x + f.fx * box.w + sway;
    const y = box.y + f.fy * box.h;
    const d = size * f.s;
    const a = alpha * clamp(0.55 + f.s * 0.4);
    g.sprite(dot, x, y, { w: d * 1.7, h: d * 1.7, alpha: a * 0.32, tint: [0.46, 0.6, 0.8] });
    g.sprite(dot, x, y, { w: d, h: d, alpha: a });
  }
}

/** A soft white-grey wash over a snowy sky. */
export function overcast(g, x, y, w, h) {
  g.rect(x, y, w, h, [0.9, 0.93, 0.98], 0.3);
}

/** Where the waiting snowflake floats, bobbing in front of the window: [x, y, size]. */
export function windowFlakeAt(win, u, t, shift = 0) {
  const bob = motion.reduced ? 0 : Math.sin(t * 2.1) * 6 * u;
  return [win.x + shift, win.y + win.h * 0.56 + bob, (motion.reduced ? 58 : 58 + Math.sin(t * 3.4) * 3) * u];
}
