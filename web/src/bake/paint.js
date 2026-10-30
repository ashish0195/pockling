// Painting helpers for everything baked at start-up. The heart of it is plush(): a shape shaded like a
// soft ball and then covered in thousands of little tufts of fur, the same way an illustrator would
// paint a soft toy, so the fur has real clumps and the outline is fluffy rather than a clean line.
import { clamp, css, lerp, ramp, rgb, TAU } from '../util.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return [c, c.getContext('2d', { willReadFrequently: false })];
}

/** A closed outline from a radius-at-angle function, around (cx, cy). */
export function radial(cx, cy, fn, n = 120) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const [rx, ry] = fn(a);
    pts.push([cx + rx, cy + ry]);
  }
  return pts;
}

/** Superellipse helper: the point at angle a on a rounded-square-ish oval. */
export function superOval(a, rx, ry, n = 2) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [rx * Math.sign(c) * Math.abs(c) ** (2 / n), ry * Math.sign(s) * Math.abs(s) ** (2 / n)];
}

/** A smooth closed path through points. */
export function tracePath(x, pts) {
  x.beginPath();
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  x.moveTo(start[0], start[1]);
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    x.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
  }
  x.closePath();
}

/** An open smooth line through points. */
export function traceLine(x, pts) {
  x.beginPath();
  x.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    x.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const last = pts[pts.length - 1];
  x.lineTo(last[0], last[1]);
}

/** Is a point inside a polygon? */
export function inside(pts, px, py) {
  let hit = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** One tapered, gently bent tuft of fur. */
function tuft(x, px, py, dx, dy, len, width, bend) {
  const nx = -dy;
  const ny = dx;
  const tipX = px + dx * len + nx * bend;
  const tipY = py + dy * len + ny * bend;
  const midX = px + dx * len * 0.5 + nx * bend * 0.25;
  const midY = py + dy * len * 0.5 + ny * bend * 0.25;
  x.beginPath();
  x.moveTo(px + nx * width, py + ny * width);
  x.quadraticCurveTo(midX + nx * width, midY + ny * width, tipX, tipY);
  x.quadraticCurveTo(midX - nx * width, midY - ny * width, px - nx * width, py - ny * width);
  x.closePath();
  x.fill();
}

/**
 * Paints a plush shape.
 *   pts    the outline
 *   cx, cy, size   the ball its shading follows, size being its radius
 *   stops  colours from deepest shadow to brightest light, as [r, g, b]
 *   crown  where the fur grows out from
 *   rng    seeded random
 *   scale  pixels per unit, so tuft sizes stay the same at any bake size
 *   calm   optional { x, y, r }: fur is quieter here, to keep the face clean
 *   tuftLen, density  how long and how many
 *   edge   how far tufts break the outline
 */
export function plush(x, { pts, cx, cy, size, stops, crown, rng, scale = 1, calm, tuftLen = 12, density = 1, edge = 1, light = [-0.38, -0.72, 0.58], flat = 0, width: tuftWidth = 1 }) {
  const shadeAt = (px, py) => {
    const nx = (px - cx) / size;
    const ny = (py - cy) / size;
    const d2 = nx * nx + ny * ny;
    const nz = Math.sqrt(Math.max(0.02, 1 - Math.min(d2, 1)));
    const dot = light[0] * nx + light[1] * ny + light[2] * nz;
    // Wrapped light, so shadows stay soft; a little bounce from the floor under the belly.
    const bounce = clamp((ny - 0.45) * 0.9) * 0.14;
    return clamp(lerp(0.5 + dot * 0.5, 0.62, flat) + bounce);
  };
  const colourAt = (px, py, jitter = 0) => ramp(stops, clamp(shadeAt(px, py) + jitter));

  // The shaded ball underneath.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [px, py] of pts) {
    minX = Math.min(minX, px);
    minY = Math.min(minY, py);
    maxX = Math.max(maxX, px);
    maxY = Math.max(maxY, py);
  }
  const layer = document.createElement('canvas');
  const step = 2;
  layer.width = Math.max(2, Math.ceil((maxX - minX) / step) + 2);
  layer.height = Math.max(2, Math.ceil((maxY - minY) / step) + 2);
  const lx = layer.getContext('2d');
  const img = lx.createImageData(layer.width, layer.height);
  for (let j = 0, k = 0; j < layer.height; j++) {
    for (let i = 0; i < layer.width; i++, k += 4) {
      const c = colourAt(minX + i * step, minY + j * step);
      img.data[k] = c[0] * 255;
      img.data[k + 1] = c[1] * 255;
      img.data[k + 2] = c[2] * 255;
      img.data[k + 3] = 255;
    }
  }
  lx.putImageData(img, 0, 0);
  x.save();
  tracePath(x, pts);
  x.clip();
  x.imageSmoothingEnabled = true;
  x.drawImage(layer, minX, minY, layer.width * step, layer.height * step);
  x.restore();

  // Flow: outward from the crown, wandering a little.
  const flow = (px, py) => {
    let dx = px - crown[0];
    let dy = py - crown[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const wander = Math.sin(px * 0.021 / scale + py * 0.013 / scale) * 0.32 + Math.sin(py * 0.037 / scale - px * 0.009 / scale) * 0.2;
    const c = Math.cos(wander);
    const s = Math.sin(wander);
    return [dx * c - dy * s, dx * s + dy * c];
  };

  const quiet = (px, py) => {
    if (!calm) return 1;
    const d = Math.hypot(px - calm.x, py - calm.y) / calm.r;
    return lerp(0.45, 1, clamp(d * d));
  };

  // Tufts that break the outline go down first.
  const area = (maxX - minX) * (maxY - minY);
  const perimeter = pts.reduce((sum, p, i) => sum + Math.hypot(p[0] - pts[(i + 1) % pts.length][0], p[1] - pts[(i + 1) % pts.length][1]), 0);
  const edgeCount = Math.round((perimeter / (scale * 1.1)) * density);
  for (let i = 0; i < edgeCount; i++) {
    const f = rng() * pts.length;
    const a = pts[Math.floor(f) % pts.length];
    const b = pts[(Math.floor(f) + 1) % pts.length];
    const t = f - Math.floor(f);
    const px = lerp(a[0], b[0], t);
    const py = lerp(a[1], b[1], t);
    let ox = px - cx;
    let oy = py - cy;
    const ol = Math.hypot(ox, oy) || 1;
    ox /= ol;
    oy /= ol;
    const [fx, fy] = flow(px, py);
    let dx = ox * 0.55 + fx * 0.75;
    let dy = oy * 0.55 + fy * 0.75;
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl;
    dy /= dl;
    const len = rng.range(0.42, 0.92) * tuftLen * scale * edge;
    x.fillStyle = css(colourAt(px, py, rng.range(-0.08, 0.05)));
    tuft(x, px - dx * len * 0.4, py - dy * len * 0.4, dx, dy, len, rng.range(1.7, 3.2) * scale * tuftWidth, rng.range(-2.5, 2.5) * scale);
  }

  // Then the coat, from the bottom up, so higher fur lies over lower fur like shingles.
  const count = Math.round((area / (scale * scale * 15)) * density);
  const tufts = [];
  for (let i = 0; i < count; i++) {
    const px = rng.range(minX, maxX);
    const py = rng.range(minY, maxY);
    if (inside(pts, px, py)) tufts.push([px, py]);
  }
  tufts.sort((a, b) => b[1] - a[1]);
  for (const [px, py] of tufts) {
    const q = quiet(px, py);
    const [dx, dy] = flow(px, py);
    const len = rng.range(0.6, 1.25) * tuftLen * scale * lerp(0.75, 1, q);
    const w = rng.range(1.1, 2.3) * scale * tuftWidth;
    const bend = rng.range(-3.5, 3.5) * scale;
    // A shadow under each clump, then the clump, and now and then a bright strand on top.
    x.fillStyle = css(colourAt(px, py + 2 * scale, -0.13 * q), 0.5);
    tuft(x, px + w * 0.4, py + w * 0.4, dx, dy, len, w * 1.1, bend);
    x.fillStyle = css(colourAt(px, py, rng.range(-0.05, 0.07) * q));
    tuft(x, px, py, dx, dy, len * 0.94, w, bend);
    if (rng() < 0.22) {
      x.fillStyle = css(colourAt(px, py, 0.16 * q), 0.75);
      tuft(x, px, py, dx, dy, len * 0.7, w * 0.42, bend * 0.8);
    }
  }
}

/** A soft round blob of colour, for glows, cheeks and shadows. */
export function softDot(size, color, { falloff = 1, inner = 0, alpha = 1 } = {}) {
  const [c, x] = makeCanvas(size, size);
  const g = x.createRadialGradient(size / 2, size / 2, inner * size * 0.5, size / 2, size / 2, size / 2);
  const rgbc = typeof color === 'string' ? rgb(color) : color;
  const stops = 8;
  for (let i = 0; i <= stops; i++) {
    const t = i / stops;
    g.addColorStop(t, css(rgbc, alpha * (1 - t) ** (1 + falloff)));
  }
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  return c;
}

/** Fills the current path with a vertical gradient. */
export function vgrad(x, y0, y1, ...stops) {
  const g = x.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([t, color]) => g.addColorStop(t, color));
  return g;
}

/** Rounded rectangle path. */
export function rr(x, left, top, w, h, r) {
  x.beginPath();
  x.roundRect(left, top, w, h, r);
}
