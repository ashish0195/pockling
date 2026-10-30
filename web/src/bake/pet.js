// Paints every part of a Pockling for its breed and coat: body, belly, ears, tail, paws, markings.
// Sizes are in rig units (the body's radius is about 100); S is bake pixels per unit.
import { BREEDS } from '../catalog.js';
import { css, darken, hash, lighten, mixRgb, rgb, seeded, TAU } from '../util.js';
import { makeCanvas, plush, radial, softDot, superOval, tracePath } from './paint.js';

const BODY = 300;

function feather(x, w, h, cx, cy, rx, ry, inner = 0.55) {
  x.save();
  x.globalCompositeOperation = 'destination-in';
  x.translate(cx, cy);
  x.scale(1, ry / rx);
  const g = x.createRadialGradient(0, 0, rx * inner, 0, 0, rx);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.beginPath();
  x.arc(0, 0, rx * 1.02, 0, TAU);
  x.fill();
  x.restore();
}

const stopsOf = (coat) => coat.fur.map(rgb);

/** A pale coat from a single colour, for bellies and markings: same light and shade as the body. */
function tintStops(hex) {
  const c = rgb(hex);
  return [darken(mixRgb(c, [0.75, 0.55, 0.6], 0.2), 0.2), darken(c, 0.08), c, lighten(c, 0.5)];
}

export function bakeBody(coat, seed, S) {
  const size = BODY * S;
  const [c, x] = makeCanvas(size, size);
  const cx = size / 2;
  const cy = size / 2;
  const pts = radial(cx, cy, (a) => {
    const below = Math.sin(a) > 0;
    return superOval(a, (below ? 104 : 97) * S, (below ? 88 : 96) * S, below ? 2.4 : 2.08);
  }, 140);
  plush(x, {
    pts,
    cx,
    cy: cy - 2 * S,
    size: 112 * S,
    stops: stopsOf(coat),
    crown: [cx - 4 * S, cy - 62 * S],
    rng: seeded(seed),
    scale: S,
    calm: { x: cx, y: cy + 12 * S, r: 82 * S },
    tuftLen: 13,
    density: 1.15,
  });
  // A soft bloom of light over the top, and a warm shadow low down.
  x.save();
  x.globalCompositeOperation = 'source-atop';
  const top = x.createRadialGradient(cx - 34 * S, cy - 60 * S, 4 * S, cx - 34 * S, cy - 60 * S, 92 * S);
  top.addColorStop(0, 'rgba(255,255,255,0.3)');
  top.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = top;
  x.fillRect(0, 0, size, size);
  const low = x.createLinearGradient(0, cy + 40 * S, 0, cy + 100 * S);
  const deep = rgb(coat.fur[0]);
  low.addColorStop(0, css(deep, 0));
  low.addColorStop(1, css(deep, 0.34));
  x.fillStyle = low;
  x.fillRect(0, 0, size, size);
  x.restore();
  return { canvas: c, w: BODY, h: BODY };
}

export function bakeBelly(coat, seed, S) {
  const w = 170;
  const h = 150;
  const [c, x] = makeCanvas(w * S, h * S);
  const cx = (w * S) / 2;
  const cy = (h * S) / 2;
  const pts = radial(cx, cy, (a) => superOval(a, 66 * S, 56 * S, 2.1), 60);
  plush(x, { pts, cx, cy: cy - 14 * S, size: 86 * S, stops: tintStops(coat.belly), crown: [cx, cy - 62 * S], rng: seeded(seed + 5), scale: S, tuftLen: 10, density: 1.1, flat: 0.45 });
  feather(x, w * S, h * S, cx, cy, 80 * S, 68 * S, 0.62);
  return { canvas: c, w, h };
}

/** An ear strip: its root is at the top of the canvas and its tip at the bottom, for ribbon(). */
export function bakeEar(breed, coat, seed, S) {
  const e = BREEDS[breed].ears;
  const L = e.length;
  const W = e.width;
  const pad = e.kind === 'flop' ? 26 : 14;
  const cw = W + pad * 2;
  const ch = L + pad * 2;
  const [c, x] = makeCanvas(cw * S, ch * S);
  const X = (u) => (cw / 2 + u) * S;
  const Y = (v) => (pad + v) * S;
  const furStops = coat.fur.map(rgb);
  const rng = seeded(seed + 11);
  const paintShape = (outline, stops, extra = {}) => plush(x, { pts: outline.map(([u, v]) => [X(u), Y(v)]), cx: X(-W * 0.1), cy: Y(L * 0.42), size: Math.max(W, L) * 0.72 * S, stops, crown: [X(0), Y(-4)], rng, scale: S, tuftLen: 5.5, density: 1.25, edge: 0.75, ...extra });
  const inner = rgb(coat.inner);
  const innerStops = [darken(inner, 0.22), darken(inner, 0.08), inner, lighten(inner, 0.35)];

  if (e.kind === 'cat' || e.kind === 'fox') {
    const tri = [[-W / 2, -2], [-W * 0.3, L * 0.32], [-W * 0.14, L * 0.74], [0, L], [W * 0.14, L * 0.74], [W * 0.3, L * 0.32], [W / 2, -2], [0, -8]];
    paintShape(tri, furStops);
    const s = e.kind === 'fox' ? 0.56 : 0.64;
    const shape = tri.map(([u, v]) => [u * s, v * s + L * 0.04]);
    paintShape(shape, innerStops, { tuftLen: 4, edge: 0.5, width: 0.7, flat: 0.5 });
    if (e.kind === 'fox') {
      // Dark tips, a fox's little socks for the ears.
      x.save();
      x.globalCompositeOperation = 'source-atop';
      const g = x.createLinearGradient(0, Y(L * 0.66), 0, Y(L));
      const dark = darken(rgb(coat.fur[0]), 0.34);
      g.addColorStop(0, css(dark, 0));
      g.addColorStop(1, css(dark, 0.85));
      x.fillStyle = g;
      x.fillRect(0, 0, cw * S, ch * S);
      x.restore();
    }
  } else if (e.kind === 'long') {
    const pts = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU;
      const v = 0.5 - 0.5 * Math.cos(a);
      const wide = (W / 2) * (0.74 + 0.26 * Math.sin(Math.PI * v) ** 0.8) * (v < 0.1 ? 0.84 : 1);
      pts.push([wide * Math.sin(a), v * L]);
    }
    paintShape(pts, furStops);
    paintShape(pts.map(([u, v]) => [u * 0.56, L * 0.1 + v * 0.78]), innerStops, { tuftLen: 5, edge: 0.4, width: 0.7, flat: 0.5 });
  } else if (e.kind === 'flop') {
    const dark = coat.markColor ? rgb(coat.markColor) : darken(rgb(coat.fur[1]), 0.12);
    const stops = [darken(dark, 0.34), darken(dark, 0.14), dark, lighten(dark, 0.26)];
    const pts = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU;
      const v = 0.5 - 0.5 * Math.cos(a);
      const wide = (W / 2) * (0.62 + 0.38 * Math.sin(Math.PI * v ** 0.72)) ;
      pts.push([wide * Math.sin(a), v * L]);
    }
    paintShape(pts, stops, { tuftLen: 8 });
  } else if (e.kind === 'round') {
    const dark = coat.mark === 'panda' ? rgb(coat.markColor) : null;
    const stops = dark ? [darken(dark, 0.3), darken(dark, 0.1), dark, lighten(dark, 0.22)] : furStops;
    const pts = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU;
      pts.push([(W / 2) * Math.cos(a), L * 0.52 + L * 0.52 * Math.sin(a)]);
    }
    paintShape(pts, stops);
    if (!dark) paintShape(pts.map(([u, v]) => [u * 0.56, L * 0.54 + (v - L * 0.52) * 0.56]), innerStops, { tuftLen: 4, edge: 0.4, width: 0.7, flat: 0.5 });
  } else if (e.kind === 'horn') {
    // Smooth little horns: no fur, a soft gradient and two ridges.
    const horn = rgb(coat.horn ?? '#ffe9a8');
    const pts = [[-W * 0.42, 0], [-W * 0.3, L * 0.4], [-W * 0.08, L * 0.84], [0, L], [W * 0.08, L * 0.84], [W * 0.3, L * 0.4], [W * 0.42, 0]];
    tracePath(x, pts.map(([u, v]) => [X(u), Y(v)]));
    const g = x.createLinearGradient(X(-W * 0.4), 0, X(W * 0.4), 0);
    g.addColorStop(0, css(lighten(horn, 0.6)));
    g.addColorStop(0.55, css(horn));
    g.addColorStop(1, css(darken(horn, 0.22)));
    x.fillStyle = g;
    x.fill();
    x.strokeStyle = css(darken(horn, 0.3), 0.55);
    x.lineWidth = 1.2 * S;
    x.lineCap = 'round';
    for (const v of [0.26, 0.52]) {
      x.beginPath();
      x.moveTo(X(-W * 0.3 * (1 - v * 0.5)), Y(L * v));
      x.quadraticCurveTo(X(0), Y(L * v + 4), X(W * 0.3 * (1 - v * 0.5)), Y(L * v));
      x.stroke();
    }
  }
  return { canvas: c, w: cw, h: ch, length: ch, pad };
}

/** A tail strip: root at the top, tip at the bottom. */
export function bakeTail(breed, coat, seed, S) {
  const t = BREEDS[breed].tail;
  const L = t.length;
  const W = t.width;
  const pad = 16;
  const cw = W + pad * 2;
  const ch = L + pad * 2;
  const [c, x] = makeCanvas(cw * S, ch * S);
  const X = (u) => (cw / 2 + u) * S;
  const Y = (v) => (pad + v) * S;
  const rng = seeded(seed + 17);
  const stops = stopsOf(coat);
  const pts = [];
  const N = 44;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU;
    const v = 0.5 - 0.5 * Math.cos(a);
    let wide;
    if (t.kind === 'pom') wide = (W / 2) * Math.sqrt(Math.max(0, Math.sin(Math.PI * v)));
    else if (t.kind === 'bush') wide = (W / 2) * (0.34 + 0.66 * Math.sin(Math.PI * v ** 0.72)) ;
    else if (t.kind === 'spade') wide = (W / 2) * (0.52 - 0.28 * v) * (v > 0.98 ? 0.2 : 1);
    else wide = (W / 2) * (0.82 - 0.2 * v);
    pts.push([wide * Math.sin(a), v * L]);
  }
  plush(x, { pts: pts.map(([u, v]) => [X(u), Y(v)]), cx: X(-W * 0.12), cy: Y(L * 0.45), size: Math.max(W, L * 0.7) * S, stops, crown: [X(0), Y(-6)], rng, scale: S, tuftLen: t.kind === 'bush' ? 13 : 9, density: 1.3, flat: 0.35 });
  if (coat.tip) {
    const tip = rgb(coat.tip);
    const clip = pts.filter(([, v]) => v > L * 0.62);
    if (clip.length > 4) {
      const shape = pts.map(([u, v]) => [X(u * 1.02), Y(Math.max(v, L * 0.64))]);
      plush(x, { pts: shape, cx: X(-W * 0.1), cy: Y(L * 0.8), size: W * 0.8 * S, stops: [darken(tip, 0.18), darken(tip, 0.06), tip, lighten(tip, 0.6)], crown: [X(0), Y(L * 0.5)], rng, scale: S, tuftLen: 12, density: 1.3, flat: 0.5 });
    }
  }
  if (t.kind === 'spade') {
    const col = rgb(coat.inner ?? coat.belly);
    const sp = [[0, L - 34], [-20, L - 10], [0, L + 8], [20, L - 10]];
    tracePath(x, sp.map(([u, v]) => [X(u), Y(v)]));
    const g = x.createLinearGradient(X(-20), 0, X(20), 0);
    g.addColorStop(0, css(lighten(col, 0.4)));
    g.addColorStop(1, css(darken(col, 0.16)));
    x.fillStyle = g;
    x.fill();
  }
  return { canvas: c, w: cw, h: ch, length: ch };
}

export function bakePaw(coat, seed, S, { w = 38, h = 42, tint = null, pad = false } = {}) {
  const m = 10;
  const [c, x] = makeCanvas((w + m * 2) * S, (h + m * 2) * S);
  const cx = ((w + m * 2) * S) / 2;
  const cy = ((h + m * 2) * S) / 2;
  const stops = tint ? tintStops(tint) : stopsOf(coat);
  const pts = radial(cx, cy, (a) => superOval(a, (w / 2) * S, (h / 2) * S, 2.1), 40);
  plush(x, { pts, cx: cx - 3 * S, cy: cy - 4 * S, size: Math.max(w, h) * 0.62 * S, stops, crown: [cx, cy - h * 0.6 * S], rng: seeded(seed + (pad ? 31 : 37)), scale: S, tuftLen: 6, density: 1.2 });
  if (pad) {
    const nose = rgb(coat.inner ?? '#ffb1a8');
    const bean = (bx, by, br) => {
      x.fillStyle = css(nose, 0.95);
      x.beginPath();
      x.ellipse(cx + bx * S, cy + by * S, br * S, br * 0.84 * S, 0, 0, TAU);
      x.fill();
    };
    bean(0, 5, 8);
    bean(-9.5, -7, 3.5);
    bean(0, -11, 3.7);
    bean(9.5, -7, 3.5);
  }
  return { canvas: c, w: w + m * 2, h: h + m * 2 };
}

/** A foot seen from the front, with two little toe lines. */
export function bakeFoot(coat, seed, S, tint) {
  const w = 52;
  const h = 34;
  const m = 10;
  const [c, x] = makeCanvas((w + m * 2) * S, (h + m * 2) * S);
  const cx = ((w + m * 2) * S) / 2;
  const cy = ((h + m * 2) * S) / 2;
  const stops = tint ? tintStops(tint) : stopsOf(coat);
  const pts = radial(cx, cy, (a) => superOval(a, (w / 2) * S, (h / 2) * S, 2.3), 40);
  plush(x, { pts, cx: cx - 4 * S, cy: cy - 6 * S, size: w * 0.6 * S, stops, crown: [cx, cy - h * 0.9 * S], rng: seeded(seed + 41), scale: S, tuftLen: 5, density: 1.2 });
  x.strokeStyle = css(darken(stops[1], 0.28), 0.6);
  x.lineWidth = 1.7 * S;
  x.lineCap = 'round';
  for (const u of [-8, 8]) {
    x.beginPath();
    x.moveTo(cx + u * S, cy + (h * 0.16) * S);
    x.lineTo(cx + u * 0.96 * S, cy + (h * 0.42) * S);
    x.stroke();
  }
  return { canvas: c, w: w + m * 2, h: h + m * 2 };
}

export function bakeNose(coat, S) {
  const w = 30;
  const h = 24;
  const [c, x] = makeCanvas(w * S, h * S);
  const col = rgb(coat.nose);
  const cx = (w * S) / 2;
  const cy = (h * S) / 2;
  x.beginPath();
  x.moveTo(cx - 9 * S, cy - 5 * S);
  x.quadraticCurveTo(cx, cy - 8.5 * S, cx + 9 * S, cy - 5 * S);
  x.quadraticCurveTo(cx + 11 * S, cy - 1 * S, cx + 3 * S, cy + 5 * S);
  x.quadraticCurveTo(cx, cy + 7 * S, cx - 3 * S, cy + 5 * S);
  x.quadraticCurveTo(cx - 11 * S, cy - 1 * S, cx - 9 * S, cy - 5 * S);
  x.closePath();
  const g = x.createLinearGradient(0, cy - 8 * S, 0, cy + 7 * S);
  g.addColorStop(0, css(lighten(col, 0.22)));
  g.addColorStop(1, css(darken(col, 0.14)));
  x.fillStyle = g;
  x.fill();
  x.fillStyle = 'rgba(255,255,255,0.75)';
  x.beginPath();
  x.ellipse(cx - 3.2 * S, cy - 3 * S, 2.6 * S, 1.6 * S, -0.3, 0, TAU);
  x.fill();
  return { canvas: c, w, h };
}

export function bakeCheek(coat, S) {
  const size = 64;
  const c = softDot(size * S, coat.cheek, { falloff: 0.25, alpha: 0.95 });
  return { canvas: c, w: size, h: size };
}

/** Soft little eyebrows. */
export function bakeBrow(S, color) {
  const w = 30;
  const h = 14;
  const [c, x] = makeCanvas(w * S, h * S);
  x.fillStyle = css(rgb(color), 0.82);
  x.beginPath();
  x.ellipse((w * S) / 2, (h * S) / 2, 11 * S, 3.6 * S, 0, 0, TAU);
  x.fill();
  return { canvas: c, w, h };
}

/** Three drawn whiskers on one side. */
export function bakeWhisker(coat, S) {
  const w = 46;
  const h = 34;
  const [c, x] = makeCanvas(w * S, h * S);
  x.strokeStyle = css(darken(rgb(coat.fur[0]), 0.28), 0.66);
  x.lineWidth = 1.5 * S;
  x.lineCap = 'round';
  for (const [dy, end] of [[-9, -13], [0, 0], [9, 13]]) {
    x.beginPath();
    x.moveTo(2 * S, (h / 2 + dy * 0.45) * S);
    x.quadraticCurveTo(26 * S, (h / 2 + dy * 0.7) * S, (w - 2) * S, (h / 2 + end) * S);
    x.stroke();
  }
  return { canvas: c, w, h };
}

/**
 * Face and body markings, painted as fur over the top. Returns null for none. Each has its own place
 * on the face and moves with it as the head turns.
 */
export function bakeMark(coat, seed, S) {
  const mark = coat.mark;
  const rng = seeded(seed + 53);
  if (mark === 'tabby') {
    const w = 90;
    const h = 50;
    const [c, x] = makeCanvas(w * S, h * S);
    const col = darken(rgb(coat.fur[1]), 0.1);
    x.lineCap = 'round';
    x.strokeStyle = css(col, 0.58);
    x.shadowColor = css(col, 0.7);
    x.shadowBlur = 3 * S;
    for (const [u, top, bot, thick] of [[-20, 12, 30, 5.5], [0, 6, 34, 6.5], [20, 12, 30, 5.5]]) {
      x.lineWidth = thick * S;
      x.beginPath();
      x.moveTo((w / 2 + u) * S, top * S);
      x.quadraticCurveTo((w / 2 + u * 0.7) * S, ((top + bot) / 2) * S, (w / 2 + u * 0.56) * S, bot * S);
      x.stroke();
    }
    x.shadowBlur = 0;
    x.globalCompositeOperation = 'destination-out';
    x.fillStyle = 'rgba(0,0,0,0.3)';
    for (let i = 0; i < 700; i++) {
      x.beginPath();
      x.arc(rng() * w * S, rng() * h * S, rng.range(0.4, 1.1) * S, 0, TAU);
      x.fill();
    }
    return { canvas: c, w, h, y: -66, x: 0, kind: mark };
  }
  if (mark === 'patch') {
    const size = 96;
    const [c, x] = makeCanvas(size * S, size * S);
    const col = rgb(coat.markColor);
    const stops = [darken(col, 0.3), darken(col, 0.1), col, lighten(col, 0.3)];
    const cx = (size * S) / 2;
    const pts = radial(cx, cx, (a) => superOval(a, 36 * S, 38 * S, 2.1), 40);
    plush(x, { pts, cx, cy: cx - 6 * S, size: 56 * S, stops, crown: [cx, cx - 40 * S], rng, scale: S, tuftLen: 8, density: 1.25, flat: 0.2 });
    return { canvas: c, w: size, h: size, x: -44, y: 0, kind: mark };
  }
  if (mark === 'panda') {
    const w = 170;
    const h = 90;
    const [c, x] = makeCanvas(w * S, h * S);
    const col = rgb(coat.markColor);
    const stops = [darken(col, 0.25), darken(col, 0.1), col, lighten(col, 0.2)];
    for (const side of [-1, 1]) {
      const cx = (w / 2 + side * 44) * S;
      const cy = (h / 2 + 2) * S;
      const pts = radial(cx, cy, (a) => {
        const [px, py] = superOval(a, 30 * S, 37 * S, 2);
        const t = side * 0.5;
        return [px * Math.cos(t) - py * Math.sin(t), px * Math.sin(t) + py * Math.cos(t)];
      }, 36);
      plush(x, { pts, cx, cy: cy - 6 * S, size: 54 * S, stops, crown: [cx, cy - 40 * S], rng, scale: S, tuftLen: 6, density: 1.2, flat: 0.3 });
    }
    return { canvas: c, w, h, x: 0, y: 2, kind: mark };
  }
  if (mark === 'muzzle') {
    const w = 88;
    const h = 70;
    const [c, x] = makeCanvas(w * S, h * S);
    const stops = tintStops(coat.markColor);
    const cx = (w * S) / 2;
    const cy = (h * S) / 2;
    const pts = radial(cx, cy, (a) => superOval(a, 35 * S, 26 * S, 2.1), 36);
    plush(x, { pts, cx, cy: cy - 8 * S, size: 54 * S, stops, crown: [cx, cy - 34 * S], rng, scale: S, tuftLen: 6, density: 1.2, flat: 0.5 });
    feather(x, w * S, h * S, cx, cy, 44 * S, 34 * S, 0.68);
    return { canvas: c, w, h, x: 0, y: 30, kind: mark };
  }
  if (mark === 'fox') {
    const w = 230;
    const h = 130;
    const [c, x] = makeCanvas(w * S, h * S);
    const stops = tintStops(coat.markColor);
    const X = (u) => (w / 2 + u) * S;
    const Y = (v) => (h / 2 + v) * S;
    // Two big white cheeks sweeping up and out, meeting under the mouth.
    const pts = [[-84, -4], [-66, -16], [-40, -10], [-20, 2], [0, 6], [20, 2], [40, -10], [66, -16], [84, -4], [74, 18], [46, 32], [0, 38], [-46, 32], [-74, 18]];
    plush(x, { pts: pts.map(([u, v]) => [X(u), Y(v)]), cx: X(0), cy: Y(0), size: 110 * S, stops, crown: [X(0), Y(-30)], rng, scale: S, tuftLen: 7, density: 1.1, flat: 0.55, edge: 0.7 });
    return { canvas: c, w, h, x: 0, y: 34, kind: mark };
  }
  if (mark === 'spots') {
    const w = 230;
    const h = 230;
    const [c, x] = makeCanvas(w * S, h * S);
    const col = rgb(coat.markColor);
    const stops = [darken(col, 0.2), col, col, lighten(col, 0.2)];
    for (const [u, v, r] of [[-62, -52, 15], [40, -68, 11], [72, 24, 13], [-76, 34, 10], [14, -82, 7]]) {
      const cx = (w / 2 + u) * S;
      const cy = (h / 2 + v) * S;
      const pts = radial(cx, cy, (a) => superOval(a, r * S, r * 0.9 * S, 2), 22);
      plush(x, { pts, cx, cy, size: r * 1.5 * S, stops, crown: [cx, cy - r * S], rng, scale: S, tuftLen: 5, density: 1.2, flat: 0.5 });
    }
    return { canvas: c, w, h, x: 0, y: 0, kind: mark, body: true };
  }
  return null;
}

export function bakeWing(coat, S) {
  const w = 72;
  const h = 64;
  const [c, x] = makeCanvas(w * S, h * S);
  const col = rgb(coat.wing ?? '#ffc4d6');
  x.save();
  const X = (u) => u * S;
  const Y = (v) => v * S;
  x.beginPath();
  x.moveTo(X(4), Y(50));
  x.quadraticCurveTo(X(12), Y(10), X(46), Y(6));
  x.quadraticCurveTo(X(70), Y(6), X(66), Y(22));
  x.quadraticCurveTo(X(58), Y(24), X(58), Y(34));
  x.quadraticCurveTo(X(48), Y(34), X(46), Y(44));
  x.quadraticCurveTo(X(34), Y(42), X(28), Y(52));
  x.quadraticCurveTo(X(16), Y(50), X(4), Y(50));
  x.closePath();
  const g = x.createLinearGradient(X(4), Y(50), X(60), Y(6));
  g.addColorStop(0, css(darken(col, 0.1)));
  g.addColorStop(1, css(lighten(col, 0.42)));
  x.fillStyle = g;
  x.fill();
  x.strokeStyle = css(darken(col, 0.24), 0.65);
  x.lineWidth = 1.6 * S;
  x.lineCap = 'round';
  for (const [ex, ey] of [[50, 11], [50, 28], [32, 40]]) {
    x.beginPath();
    x.moveTo(X(8), Y(48));
    x.quadraticCurveTo(X((8 + ex) / 2 - 2), Y((48 + ey) / 2 - 6), X(ex), Y(ey));
    x.stroke();
  }
  x.restore();
  return { canvas: c, w, h, ax: 0.08, ay: 0.78 };
}

export function petSeed(pet) {
  return hash(`${pet.breed}/${pet.coat}/${pet.seed ?? 1}`);
}
