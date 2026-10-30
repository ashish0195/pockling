// Odds and ends: thought bubbles with an emoji inside, berries, balls, eggs.
import { BREEDS } from '../catalog.js';
import { css, darken, lighten, rgb, seeded, TAU } from '../util.js';
import { makeCanvas } from './paint.js';

const S = 3;

function art(w, h, fn) {
  const [c, x] = makeCanvas(w * S, h * S);
  x.scale(S, S);
  x.lineCap = 'round';
  x.lineJoin = 'round';
  fn(x, w, h);
  return { canvas: c, w, h };
}

const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export function defineBubbles(a) {
  for (const icon of ['🍎', '🌙', '🫧', '💗', '🎾', '🦴', '❓', '❗', '💤']) {
    a.define(`bubble.${icon}`, () => art(92, 84, (x) => {
      x.fillStyle = 'rgba(120,80,90,0.16)';
      x.beginPath();
      x.ellipse(50, 40, 40, 33, 0, 0, TAU);
      x.fill();
      x.fillStyle = '#fffdf9';
      for (const [u, v, r] of [[50, 36, 34], [28, 40, 20], [72, 40, 20], [40, 22, 19], [62, 22, 18]]) {
        x.beginPath();
        x.arc(u, v, r, 0, TAU);
        x.fill();
      }
      x.beginPath();
      x.arc(18, 68, 6.5, 0, TAU);
      x.fill();
      x.beginPath();
      x.arc(8, 79, 3.8, 0, TAU);
      x.fill();
      x.font = `36px ${EMOJI_FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(icon, 50, 38);
    }));
  }
  a.define('prop.berry', () => art(48, 48, (x) => {
    x.beginPath();
    x.moveTo(24, 44);
    x.bezierCurveTo(6, 34, 4, 16, 14, 13);
    x.quadraticCurveTo(24, 9, 34, 13);
    x.bezierCurveTo(44, 16, 42, 34, 24, 44);
    x.closePath();
    const g = x.createLinearGradient(0, 10, 0, 44);
    g.addColorStop(0, '#ff7d8b');
    g.addColorStop(1, '#e8324f');
    x.fillStyle = g;
    x.fill();
    x.fillStyle = 'rgba(255,240,180,0.9)';
    for (const [u, v] of [[16, 20], [24, 24], [32, 20], [19, 30], [29, 30], [24, 36]]) {
      x.beginPath();
      x.ellipse(u, v, 1.2, 1.8, 0, 0, TAU);
      x.fill();
    }
    x.fillStyle = '#5ec35a';
    for (const a0 of [-0.9, -0.3, 0.3, 0.9]) {
      x.save();
      x.translate(24, 13);
      x.rotate(a0);
      x.beginPath();
      x.ellipse(0, -5, 3.4, 7, 0, 0, TAU);
      x.fill();
      x.restore();
    }
    x.fillStyle = 'rgba(255,255,255,0.6)';
    x.beginPath();
    x.ellipse(14, 21, 2.2, 4, 0.4, 0, TAU);
    x.fill();
  }));
  a.define('prop.ball', () => art(64, 64, (x) => {
    const g = x.createRadialGradient(24, 22, 3, 32, 32, 32);
    g.addColorStop(0, '#fff08a');
    g.addColorStop(1, '#ffb82e');
    x.fillStyle = g;
    x.beginPath();
    x.arc(32, 32, 29, 0, TAU);
    x.fill();
    x.save();
    x.beginPath();
    x.arc(32, 32, 29, 0, TAU);
    x.clip();
    x.strokeStyle = '#ff6f97';
    x.lineWidth = 7;
    x.beginPath();
    x.arc(-4, 32, 30, 0, TAU);
    x.stroke();
    x.beginPath();
    x.arc(68, 32, 30, 0, TAU);
    x.stroke();
    x.restore();
    x.fillStyle = 'rgba(255,255,255,0.75)';
    x.beginPath();
    x.ellipse(22, 18, 7, 4, -0.6, 0, TAU);
    x.fill();
  }));
  a.define('prop.butterfly', () => art(48, 40, (x) => {
    x.fillStyle = '#ffa24d';
    for (const s of [-1, 1]) {
      x.beginPath();
      x.ellipse(24 + s * 11, 15, 10, 12, s * 0.5, 0, TAU);
      x.fill();
      x.beginPath();
      x.ellipse(24 + s * 8, 28, 7, 8, -s * 0.4, 0, TAU);
      x.fill();
    }
    x.fillStyle = 'rgba(255,255,255,0.7)';
    for (const s of [-1, 1]) {
      x.beginPath();
      x.arc(24 + s * 12, 14, 3.4, 0, TAU);
      x.fill();
    }
    x.strokeStyle = '#4a3540';
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(24, 10);
    x.lineTo(24, 32);
    x.stroke();
  }));
}

// ── Eggs ─────────────────────────────────────────────────────────────────────────────────────────

const eggPath = (x, W, H) => {
  const cx = W / 2;
  x.beginPath();
  x.moveTo(cx, 6);
  x.bezierCurveTo(cx + W * 0.34, 6, cx + W * 0.46, H * 0.5, cx + W * 0.44, H * 0.64);
  x.bezierCurveTo(cx + W * 0.42, H * 0.86, cx + W * 0.2, H - 6, cx, H - 6);
  x.bezierCurveTo(cx - W * 0.2, H - 6, cx - W * 0.42, H * 0.86, cx - W * 0.44, H * 0.64);
  x.bezierCurveTo(cx - W * 0.46, H * 0.5, cx - W * 0.34, 6, cx, 6);
  x.closePath();
};

function eggPattern(x, kind, spot, W, H) {
  x.fillStyle = spot;
  x.strokeStyle = spot;
  const r = seeded(kind.length * 13 + 5);
  if (kind === 'spots') {
    for (const [u, v, q] of [[0.34, 0.3, 13], [0.62, 0.22, 9], [0.7, 0.5, 15], [0.3, 0.6, 16], [0.54, 0.74, 12], [0.8, 0.72, 8], [0.18, 0.44, 7]]) {
      x.beginPath();
      x.arc(W * u, H * v, q, 0, TAU);
      x.fill();
    }
  } else if (kind === 'hearts') {
    for (const [u, v, q] of [[0.36, 0.3, 10], [0.66, 0.38, 13], [0.3, 0.62, 13], [0.62, 0.72, 11], [0.5, 0.5, 7]]) {
      const px = W * u;
      const py = H * v;
      x.beginPath();
      x.moveTo(px, py + q);
      x.bezierCurveTo(px - q * 1.5, py - q * 0.1, px - q * 0.9, py - q * 1.1, px, py - q * 0.4);
      x.bezierCurveTo(px + q * 0.9, py - q * 1.1, px + q * 1.5, py - q * 0.1, px, py + q);
      x.fill();
    }
  } else if (kind === 'paws') {
    for (const [u, v, q] of [[0.4, 0.28, 0.8], [0.64, 0.5, 1], [0.34, 0.68, 1]]) {
      const px = W * u;
      const py = H * v;
      x.beginPath();
      x.ellipse(px, py + 5 * q, 10 * q, 8 * q, 0, 0, TAU);
      x.fill();
      for (const [a, b] of [[-9, -5], [-3, -10], [3, -10], [9, -5]]) {
        x.beginPath();
        x.arc(px + a * q, py + b * q, 3.5 * q, 0, TAU);
        x.fill();
      }
    }
  } else if (kind === 'stars') {
    for (const [u, v, q] of [[0.36, 0.28, 11], [0.66, 0.42, 14], [0.32, 0.62, 13], [0.62, 0.74, 10], [0.5, 0.18, 6]]) {
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * TAU;
        const d = i % 2 ? q * 0.45 : q;
        x.lineTo(W * u + Math.cos(a) * d, H * v + Math.sin(a) * d);
      }
      x.closePath();
      x.fill();
    }
  } else if (kind === 'zig') {
    x.lineWidth = 8;
    for (const v of [0.34, 0.56, 0.76]) {
      x.beginPath();
      for (let i = 0; i <= 8; i++) {
        const px = W * (0.04 + (i / 8) * 0.92);
        const py = H * v + (i % 2 ? -8 : 8);
        if (i === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      x.stroke();
    }
  } else if (kind === 'scales') {
    x.lineWidth = 3.6;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        const px = W * (0.08 + col * 0.15) + (row % 2 ? W * 0.075 : 0);
        const py = H * (0.16 + row * 0.11);
        if (r() < 0.86) {
          x.beginPath();
          x.arc(px, py, 10, 0, Math.PI);
          x.stroke();
        }
      }
    }
  }
}

export function bakeEgg(breedId, part = 'whole') {
  const b = BREEDS[breedId].egg;
  const W = 150;
  const H = 188;
  return art(W, H, (x) => {
    x.save();
    if (part !== 'whole') {
      // Clip along a zigzag crack.
      const y = H * 0.52;
      x.beginPath();
      if (part === 'top') {
        x.moveTo(-5, -5);
        x.lineTo(W + 5, -5);
        x.lineTo(W + 5, y);
      } else {
        x.moveTo(-5, H + 5);
        x.lineTo(W + 5, H + 5);
        x.lineTo(W + 5, y);
      }
      const n = 8;
      for (let i = n; i >= 0; i--) x.lineTo((W * i) / n, y + (i % 2 ? -11 : 11));
      x.closePath();
      x.clip();
    }
    eggPath(x, W, H);
    const base = rgb(b.base);
    const g = x.createRadialGradient(W * 0.36, H * 0.28, 6, W * 0.5, H * 0.56, H * 0.62);
    g.addColorStop(0, css(lighten(base, 0.72)));
    g.addColorStop(0.55, css(base));
    g.addColorStop(1, css(darken(base, 0.16)));
    x.fillStyle = g;
    x.fill();
    x.save();
    eggPath(x, W, H);
    x.clip();
    x.globalAlpha = 0.85;
    eggPattern(x, b.pattern, b.spot, W, H);
    x.globalAlpha = 1;
    // Shade over the pattern, so it sits on the curve.
    const shade = x.createRadialGradient(W * 0.38, H * 0.34, H * 0.12, W * 0.5, H * 0.55, H * 0.64);
    shade.addColorStop(0, 'rgba(255,255,255,0.26)');
    shade.addColorStop(0.6, 'rgba(255,255,255,0)');
    shade.addColorStop(1, 'rgba(110,60,50,0.28)');
    x.fillStyle = shade;
    x.fillRect(0, 0, W, H);
    x.restore();
    x.fillStyle = 'rgba(255,255,255,0.7)';
    x.beginPath();
    x.ellipse(W * 0.34, H * 0.22, 12, 20, -0.5, 0, TAU);
    x.fill();
    x.restore();
  });
}

export function bakeCrack(stage) {
  const W = 150;
  const H = 188;
  return art(W, H, (x) => {
    const r = seeded(9);
    const y = H * 0.5;
    // A wandering line across the shell, in short irregular steps.
    const points = [];
    for (let px = 6, i = 0; px < W - 6; i++) {
      points.push([px, y + (i % 2 ? -1 : 1) * r.range(1.5, 7.5)]);
      px += r.range(6, 13);
    }
    const n = points.length - 1;
    const part = stage === 1 ? [0.36, 0.64] : stage === 2 ? [0.16, 0.86] : [0, 1];
    const a = Math.round(n * part[0]);
    const b = Math.round(n * part[1]);
    // A filled shape, thin at the ends and wider in the middle.
    const shape = (dy, col, thick) => {
      x.fillStyle = col;
      x.beginPath();
      for (let i = a; i <= b; i++) {
        const w = Math.sin(((i - a) / (b - a)) * Math.PI) ** 0.7 * thick;
        if (i === a) x.moveTo(points[i][0], points[i][1] + dy - w);
        else x.lineTo(points[i][0], points[i][1] + dy - w);
      }
      for (let i = b; i >= a; i--) {
        const w = Math.sin(((i - a) / (b - a)) * Math.PI) ** 0.7 * thick;
        x.lineTo(points[i][0], points[i][1] + dy + w);
      }
      x.closePath();
      x.fill();
    };
    shape(1.2, 'rgba(255,255,255,0.75)', 1.1);
    shape(0, 'rgba(112,78,60,0.9)', stage === 1 ? 0.8 : stage === 2 ? 1.1 : 1.5);
    if (stage >= 2) {
      // Little branches off the main crack.
      x.strokeStyle = 'rgba(112,78,60,0.75)';
      x.lineCap = 'round';
      x.lineJoin = 'round';
      x.lineWidth = 1;
      for (const [f, dir] of [[0.38, -1], [0.62, 1], [0.48, 1], [0.72, -1]].slice(0, stage === 2 ? 2 : 4)) {
        const [px, py] = points[Math.round(n * f)];
        x.beginPath();
        x.moveTo(px, py);
        x.lineTo(px + r.range(-3, 3), py + dir * r.range(5, 8));
        x.lineTo(px + r.range(-4, 4), py + dir * r.range(10, 15));
        x.stroke();
      }
    }
  });
}
