// Small helpers used everywhere: maths, colour, randomness, springs. No DOM here, so tests can use it.

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => clamp((x - a) / (b - a));
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeOut = (t) => 1 - (1 - clamp(t)) ** 3;
export const easeIn = (t) => clamp(t) ** 3;
export const easeOutBack = (t) => { t = clamp(t); const c = 1.70158; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
export const TAU = Math.PI * 2;

/** A small seeded generator (mulberry32), so a pet's fur looks the same every time. */
export function seeded(seed) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.pick = (list) => list[Math.floor(r() * list.length)];
  return r;
}

export const rand = (lo = 1, hi) => (hi === undefined ? Math.random() * lo : lo + Math.random() * (hi - lo));
export const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

// ── Colour ──────────────────────────────────────────────────────────────────────────────────────

/** '#rrggbb' to [r, g, b] in 0..1. */
export function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

export const mixRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

export function css(c, alpha = 1) {
  const f = (v) => Math.round(clamp(v) * 255);
  return alpha >= 1 ? `rgb(${f(c[0])},${f(c[1])},${f(c[2])})` : `rgba(${f(c[0])},${f(c[1])},${f(c[2])},${alpha})`;
}

/** A colour along a ramp of several stops, t in 0..1. */
export function ramp(stops, t) {
  t = clamp(t) * (stops.length - 1);
  const i = Math.min(Math.floor(t), stops.length - 2);
  return mixRgb(stops[i], stops[i + 1], t - i);
}

export const lighten = (c, t) => mixRgb(c, [1, 1, 1], t);
export const darken = (c, t) => mixRgb(c, [0, 0, 0], t);

// ── Springs ─────────────────────────────────────────────────────────────────────────────────────

/** One springy number. Every part of the pet moves through these, so nothing ever pops. */
export class Spring {
  constructor(value = 0, stiffness = 120, damping = 14) {
    this.x = value;
    this.v = 0;
    this.target = value;
    this.k = stiffness;
    this.c = damping;
  }

  step(dt) {
    this.v += (this.target - this.x) * this.k * dt;
    this.v *= Math.exp(-this.c * dt);
    this.x += this.v * dt;
    return this.x;
  }

  kick(velocity) {
    this.v += velocity;
  }

  set(value) {
    this.x = value;
    this.target = value;
    this.v = 0;
  }
}

/** A set of named springs, stepped together. */
export class Rig {
  constructor(spec) {
    for (const [name, s] of Object.entries(spec)) this[name] = new Spring(s[0], s[1], s[2]);
    this.names = Object.keys(spec);
  }

  /** Advances every spring, in small steps so they stay stable even at a low frame rate. */
  step(dt) {
    const n = Math.min(10, Math.ceil(dt * 120));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      for (const name of this.names) this[name].step(h);
    }
  }
}

// ── Time ────────────────────────────────────────────────────────────────────────────────────────

/** The local calendar day, as a number that goes up by one each day (handles daylight saving). */
export function dayNumber(ms) {
  const d = new Date(ms);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

/** Local time of day in hours, 0 to 24. */
export function hourOf(ms) {
  const d = new Date(ms);
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}
