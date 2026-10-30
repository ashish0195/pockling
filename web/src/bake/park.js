// The park: layers that scroll at different speeds, each a seamless tile. Everything wraps at TILE so
// the walk never ends.
import { css, darken, lerp, lighten, rgb, seeded, TAU } from '../util.js';
import { makeCanvas } from './paint.js';

export const TILE = 1024;

function tile(h, Q, fn) {
  const [c, x] = makeCanvas(TILE * Q, h * Q);
  x.scale(Q, Q);
  x.lineCap = 'round';
  x.lineJoin = 'round';
  fn(x, TILE, h);
  return { canvas: c, w: TILE, h };
}

/** Draws something at x, and again one tile along if it might cross the seam. */
const wrap = (x0, r, fn) => {
  fn(x0);
  if (x0 - r < 0) fn(x0 + TILE);
  if (x0 + r > TILE) fn(x0 - TILE);
};

const periodic = (x, parts) => parts.reduce((sum, [amp, freq, phase]) => sum + amp * Math.sin((x / TILE) * TAU * freq + phase), 0);

function tree(x, px, base, scale, leaf, rng) {
  const trunk = x.createLinearGradient(px - 7 * scale, 0, px + 7 * scale, 0);
  trunk.addColorStop(0, '#a87d5a');
  trunk.addColorStop(1, '#7c5a42');
  x.fillStyle = trunk;
  x.beginPath();
  x.roundRect(px - 7 * scale, base - 52 * scale, 14 * scale, 56 * scale, 5 * scale);
  x.fill();
  const lobes = [[0, -82, 42], [-28, -62, 30], [28, -62, 30], [-14, -102, 26], [16, -100, 26], [0, -54, 30]];
  const dark = darken(leaf, 0.2);
  x.fillStyle = css(dark);
  for (const [u, v, r] of lobes) {
    x.beginPath();
    x.arc(px + u * scale, base + (v + 5) * scale, r * scale, 0, TAU);
    x.fill();
  }
  x.fillStyle = css(leaf);
  for (const [u, v, r] of lobes) {
    x.beginPath();
    x.arc(px + u * scale, base + v * scale, (r - 2) * scale, 0, TAU);
    x.fill();
  }
  x.fillStyle = css(lighten(leaf, 0.26), 0.8);
  for (let i = 0; i < 7; i++) {
    x.beginPath();
    x.arc(px + rng.range(-26, 16) * scale, base + rng.range(-112, -66) * scale, rng.range(5, 13) * scale, 0, TAU);
    x.fill();
  }
}

function bakeFar(Q) {
  return tile(260, Q, (x, W, H) => {
    const layer = (base, parts, col, top) => {
      x.beginPath();
      x.moveTo(0, H);
      for (let px = 0; px <= W; px += 4) x.lineTo(px, base + periodic(px, parts));
      x.lineTo(W, H);
      x.closePath();
      const g = x.createLinearGradient(0, base - 60, 0, H);
      g.addColorStop(0, top);
      g.addColorStop(1, col);
      x.fillStyle = g;
      x.fill();
    };
    layer(130, [[34, 1, 0.4], [18, 3, 2], [8, 7, 1]], '#bfe0cf', '#d2e9ea');
    layer(174, [[26, 2, 2.2], [14, 5, 0.3], [6, 9, 4]], '#a6dcae', '#c0e6c4');
  });
}

function bakeMid(Q) {
  return tile(290, Q, (x, W, H) => {
    const r = seeded(11);
    const base = 190;
    const ground = (px) => base + periodic(px, [[16, 2, 1], [8, 5, 3]]);
    const greens = ['#6fcf7c', '#57bd72', '#8bdb7f', '#4faf7c', '#a0dd72'];
    for (let i = 0; i < 15; i++) {
      const px = (i / 15) * W + r.range(-16, 16);
      const s = r.range(0.72, 1.12);
      const leaf = rgb(r.pick(greens));
      wrap(px, 60 * s, (q) => tree(x, q, ground(px) + 8, s, leaf, seeded(i * 7 + 3)));
    }
    x.beginPath();
    x.moveTo(0, H);
    for (let px = 0; px <= W; px += 4) x.lineTo(px, ground(px));
    x.lineTo(W, H);
    x.closePath();
    const g = x.createLinearGradient(0, base - 20, 0, H);
    g.addColorStop(0, '#97e086');
    g.addColorStop(1, '#6ccb70');
    x.fillStyle = g;
    x.fill();
  });
}

function bakeNear(Q) {
  return tile(230, Q, (x, W, H) => {
    const r = seeded(23);
    // A low white fence.
    const fy = 118;
    const post = 62;
    x.fillStyle = '#fffaf2';
    x.fillRect(0, fy + 16, W, 8);
    x.fillRect(0, fy + 42, W, 8);
    for (let i = 0; i < W / post; i++) {
      const px = i * post + 8;
      x.fillStyle = '#fffaf2';
      x.beginPath();
      x.moveTo(px, fy + 72);
      x.lineTo(px, fy + 6);
      x.lineTo(px + 9, fy - 6);
      x.lineTo(px + 18, fy + 6);
      x.lineTo(px + 18, fy + 72);
      x.closePath();
      x.fill();
      x.fillStyle = 'rgba(160,130,110,0.22)';
      x.fillRect(px + 13, fy + 6, 5, 66);
    }
    // Bushes in front of the fence, with flowers.
    const bushes = 11;
    for (let i = 0; i < bushes; i++) {
      const px = (i / bushes) * W + r.range(-20, 20);
      const q = r.range(30, 56);
      const leaf = rgb(r.pick(['#54c077', '#46b070', '#6cd07c']));
      wrap(px, q * 2.2, (c) => {
        x.fillStyle = css(darken(leaf, 0.2));
        for (const [u, v, s] of [[-1, 0.1, 0.8], [0, -0.3, 1], [1, 0.1, 0.8]]) {
          x.beginPath();
          x.arc(c + u * q * 0.9, 172 + v * q + 4, q * s, 0, TAU);
          x.fill();
        }
        x.fillStyle = css(leaf);
        for (const [u, v, s] of [[-1, 0.1, 0.8], [0, -0.3, 1], [1, 0.1, 0.8]]) {
          x.beginPath();
          x.arc(c + u * q * 0.9, 172 + v * q, q * s - 2, 0, TAU);
          x.fill();
        }
      });
      const rr = seeded(i * 13 + 9);
      for (let f = 0; f < 6; f++) {
        const fx = px + rr.range(-q * 1.5, q * 1.5);
        const fyy = 170 + rr.range(-q * 0.9, q * 0.3);
        const col = rr.pick(['#ffd6e6', '#fff2a8', '#ffffff', '#ffb3c9']);
        wrap(fx, 8, (c) => {
          x.fillStyle = col;
          for (let p = 0; p < 5; p++) {
            const a = (p / 5) * TAU;
            x.beginPath();
            x.arc(c + Math.cos(a) * 3.4, fyy + Math.sin(a) * 3.4, 2.8, 0, TAU);
            x.fill();
          }
          x.fillStyle = '#ffb52e';
          x.beginPath();
          x.arc(c, fyy, 2, 0, TAU);
          x.fill();
        });
      }
    }
    x.fillStyle = '#6ccb70';
    x.fillRect(0, H - 6, W, 6);
  });
}

function bakeGround(Q) {
  return tile(300, Q, (x, W, H) => {
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#7fd67a');
    g.addColorStop(0.2, '#74cf71');
    g.addColorStop(1, '#58b866');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    // The path.
    const top = 58;
    const bottom = 196;
    const edge = (px, base, parts) => base + periodic(px, parts);
    x.beginPath();
    for (let px = 0; px <= W; px += 4) {
      const y = edge(px, top, [[5, 3, 1], [3, 7, 2]]);
      if (px === 0) x.moveTo(px, y);
      else x.lineTo(px, y);
    }
    for (let px = W; px >= 0; px -= 4) x.lineTo(px, edge(px, bottom, [[6, 2, 3], [3, 9, 1]]));
    x.closePath();
    const path = x.createLinearGradient(0, top, 0, bottom);
    path.addColorStop(0, '#f6e0b5');
    path.addColorStop(1, '#e8c98f');
    x.fillStyle = path;
    x.fill();
    const r = seeded(31);
    // Pebbles and specks on the path.
    for (let i = 0; i < 180; i++) {
      x.fillStyle = `rgba(150,110,70,${r.range(0.08, 0.28)})`;
      x.beginPath();
      x.ellipse(r() * W, r.range(top + 8, bottom - 8), r.range(1, 4.4), r.range(0.8, 2.2), 0, 0, TAU);
      x.fill();
    }
    // Grass strands above and below.
    const blade = (px, py, l, col) => {
      x.strokeStyle = col;
      x.lineWidth = 2.2;
      x.beginPath();
      x.moveTo(px, py);
      x.quadraticCurveTo(px + r.range(-3, 3), py - l * 0.6, px + r.range(-5, 5), py - l);
      x.stroke();
    };
    for (let i = 0; i < 340; i++) {
      const py = r() < 0.32 ? r.range(4, top - 2) : r.range(bottom + 4, H);
      blade(r() * W, py, r.range(5, 13), r() < 0.5 ? 'rgba(170,235,140,0.7)' : 'rgba(60,150,80,0.5)');
    }
    // Little flowers in the grass.
    for (let i = 0; i < 44; i++) {
      const px = r() * W;
      const py = r() < 0.3 ? r.range(6, top - 6) : r.range(bottom + 8, H - 6);
      const col = r.pick(['#ffffff', '#ffe27a', '#ffb3c9', '#d8c1ff']);
      x.fillStyle = col;
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * TAU;
        x.beginPath();
        x.arc(px + Math.cos(a) * 2.8, py + Math.sin(a) * 2.8, 2.1, 0, TAU);
        x.fill();
      }
      x.fillStyle = '#ffb52e';
      x.beginPath();
      x.arc(px, py, 1.6, 0, TAU);
      x.fill();
    }
  });
}

function bakeFore(Q) {
  return tile(120, Q, (x, W, H) => {
    const r = seeded(47);
    for (let i = 0; i < 90; i++) {
      const px = r() * W;
      const l = r.range(40, 104);
      const col = rgb(r.pick(['#3f9f5c', '#4cb064', '#62c273']));
      wrap(px, 24, (c) => {
        x.fillStyle = css(col, 0.92);
        x.beginPath();
        x.moveTo(c - 6, H);
        x.quadraticCurveTo(c - 2 + lerp(-6, 6, (px % 7) / 7), H - l * 0.6, c + lerp(-14, 14, (px % 5) / 5), H - l);
        x.quadraticCurveTo(c + 4, H - l * 0.5, c + 6, H);
        x.closePath();
        x.fill();
      });
    }
  });
}

/** A clump of tall flowers the pet can stop and sniff. */
function bakeFlower(kind) {
  const [c, x] = makeCanvas(240, 300);
  x.scale(3, 3);
  x.lineCap = 'round';
  const col = ['#ff9fc0', '#ffd24d', '#b79bff', '#ff8f7a'][kind % 4];
  const stems = [[22, 62], [40, 78], [58, 56]];
  for (const [px, top] of stems) {
    x.strokeStyle = '#4fae62';
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(40, 100);
    x.quadraticCurveTo((40 + px) / 2, 70, px, 100 - top);
    x.stroke();
    x.fillStyle = '#62c273';
    x.beginPath();
    x.ellipse((40 + px) / 2 + 6, 74, 9, 4, -0.6, 0, TAU);
    x.fill();
  }
  for (const [px, top] of stems) {
    const cy = 100 - top;
    x.fillStyle = col;
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * TAU;
      x.beginPath();
      x.ellipse(px + Math.cos(a) * 7.5, cy + Math.sin(a) * 7.5, 6.4, 4.6, a, 0, TAU);
      x.fill();
    }
    x.fillStyle = '#ffe27a';
    x.beginPath();
    x.arc(px, cy, 4.6, 0, TAU);
    x.fill();
  }
  return { canvas: c, w: 80, h: 100 };
}

export function definePark(a, Q) {
  a.define('park.far', () => bakeFar(Q), { repeat: 'x' });
  a.define('park.mid', () => bakeMid(Q), { repeat: 'x' });
  a.define('park.near', () => bakeNear(Q), { repeat: 'x' });
  a.define('park.ground', () => bakeGround(Q), { repeat: 'x' });
  a.define('park.fore', () => bakeFore(Q), { repeat: 'x' });
  for (let i = 0; i < 4; i++) a.define(`park.flower${i}`, () => bakeFlower(i));
}

/** Draws a repeating strip across the screen, scrolled by offset (in screen pixels). */
export function strip(g, tex, offset, y, h, tint) {
  const { w } = tex;
  const scale = h / tex.h;
  const viewW = g.width;
  const u0 = offset / (w * scale);
  const u1 = u0 + viewW / (w * scale);
  g.sprite(tex, 0, y, { ax: 0, ay: 0, w: viewW, h, u0, u1, tint });
}

/** The whole backdrop, used by walks and by the fetch game. */
export function drawPark(g, assets, view, scroll, tint) {
  const { u, w } = view;
  const groundH = 300 * u;
  const groundY = view.h - groundH * 0.92;
  const midH = 400 * u;
  const nearH = 230 * u;
  const farH = 520 * u;
  strip(g, assets.get('park.far'), scroll * 0.14, groundY - farH + 30 * u, farH, tint);
  strip(g, assets.get('park.mid'), scroll * 0.3, groundY - midH + 40 * u, midH, tint);
  strip(g, assets.get('park.near'), scroll * 0.58, groundY - nearH + 16 * u, nearH, tint);
  strip(g, assets.get('park.ground'), scroll, groundY, view.h - groundY + 2, tint);
  return { groundY, pathY: groundY + 128 * u, w };
}
