// Small shared pictures: shadows, glows, hearts, sparkles, bubbles, foam, zzz, crumbs, confetti.
import { css, rgb, seeded, TAU } from '../util.js';
import { makeCanvas, softDot } from './paint.js';

const S = 3;

function art(w, h, fn) {
  const [c, x] = makeCanvas(w * S, h * S);
  x.scale(S, S);
  x.lineCap = 'round';
  x.lineJoin = 'round';
  fn(x, w, h);
  return { canvas: c, w, h };
}

function heartPath(x, cx, cy, s) {
  x.beginPath();
  x.moveTo(cx, cy + s * 0.92);
  x.bezierCurveTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.92, cy - s * 1.12, cx, cy - s * 0.42);
  x.bezierCurveTo(cx + s * 0.92, cy - s * 1.12, cx + s * 1.5, cy - s * 0.1, cx, cy + s * 0.92);
  x.closePath();
}

function starPath(x, cx, cy, r, inner = 0.46, points = 5, rot = -Math.PI / 2) {
  x.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i / (points * 2)) * TAU;
    const q = i % 2 ? r * inner : r;
    const px = cx + Math.cos(a) * q;
    const py = cy + Math.sin(a) * q;
    if (i === 0) x.moveTo(px, py);
    else x.lineTo(px, py);
  }
  x.closePath();
}

export function defineFx(a) {
  a.define('fx.shadow', () => {
    const [c, x] = makeCanvas(256, 64);
    x.translate(128, 32);
    x.scale(1, 0.25);
    const g = x.createRadialGradient(0, 0, 10, 0, 0, 126);
    g.addColorStop(0, 'rgba(60,30,40,0.62)');
    g.addColorStop(0.55, 'rgba(60,30,40,0.32)');
    g.addColorStop(1, 'rgba(60,30,40,0)');
    x.fillStyle = g;
    x.fillRect(-128, -128, 256, 256);
    return { canvas: c, w: 256, h: 64 };
  });
  a.define('fx.glow', () => ({ canvas: softDot(128, '#ffffff', { falloff: 1.1 }), w: 128, h: 128 }));
  a.define('fx.heart', () => art(40, 40, (x) => {
    heartPath(x, 20, 21, 15);
    const g = x.createLinearGradient(0, 6, 0, 36);
    g.addColorStop(0, '#ff9dbb');
    g.addColorStop(1, '#ff4d7d');
    x.fillStyle = g;
    x.fill();
    x.strokeStyle = '#e8336a';
    x.lineWidth = 1.2;
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.85)';
    x.beginPath();
    x.ellipse(13, 14.5, 4, 2.6, -0.6, 0, TAU);
    x.fill();
  }));
  a.define('fx.sparkle', () => art(40, 40, (x) => {
    const g = x.createRadialGradient(20, 20, 1, 20, 20, 18);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,248,210,0.9)');
    g.addColorStop(1, 'rgba(255,230,140,0)');
    starPath(x, 20, 20, 19, 0.13, 4);
    x.fillStyle = g;
    x.fill();
  }));
  a.define('fx.star', () => art(40, 40, (x) => {
    starPath(x, 20, 21, 16, 0.5);
    x.lineJoin = 'round';
    const g = x.createLinearGradient(0, 5, 0, 36);
    g.addColorStop(0, '#fff2a8');
    g.addColorStop(1, '#ffbf3a');
    x.fillStyle = g;
    x.strokeStyle = '#ffbf3a';
    x.lineWidth = 3;
    x.stroke();
    x.fill();
  }));
  a.define('fx.bubble', () => art(64, 64, (x) => {
    const g = x.createRadialGradient(24, 22, 4, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,0.05)');
    g.addColorStop(0.72, 'rgba(190,230,255,0.14)');
    g.addColorStop(0.95, 'rgba(160,215,255,0.62)');
    g.addColorStop(1, 'rgba(160,215,255,0)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(32, 32, 30, 0, TAU);
    x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.8)';
    x.lineWidth = 2.4;
    x.beginPath();
    x.arc(32, 32, 22, 3.5, 4.5);
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.9)';
    x.beginPath();
    x.ellipse(44, 44, 3.4, 2.2, -0.7, 0, TAU);
    x.fill();
    x.strokeStyle = 'rgba(255,170,220,0.32)';
    x.lineWidth = 1.5;
    x.beginPath();
    x.arc(32, 32, 26, 0.4, 1.4);
    x.stroke();
  }));
  a.define('fx.foam', () => art(80, 80, (x) => {
    const r = seeded(7);
    const lobes = [[40, 40, 20]];
    for (let i = 0; i < 12; i++) {
      const an = (i / 12) * TAU + r.range(-0.2, 0.2);
      const d = r.range(9, 25);
      lobes.push([40 + Math.cos(an) * d, 40 + Math.sin(an) * d, r.range(7, 14)]);
    }
    lobes.sort((p, q) => p[1] - q[1]);
    for (const [u, v, q] of lobes) {
      const g = x.createRadialGradient(u - q * 0.3, v - q * 0.35, q * 0.1, u, v, q);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.7, '#fbfdff');
      g.addColorStop(1, '#d4e7f8');
      x.fillStyle = g;
      x.beginPath();
      x.arc(u, v, q, 0, TAU);
      x.fill();
    }
  }));
  a.define('fx.drop', () => art(24, 36, (x) => {
    x.beginPath();
    x.moveTo(12, 3);
    x.bezierCurveTo(16, 12, 22, 17, 22, 24);
    x.arc(12, 24, 10, 0, Math.PI);
    x.bezierCurveTo(2, 17, 8, 12, 12, 3);
    x.closePath();
    const g = x.createLinearGradient(0, 2, 0, 34);
    g.addColorStop(0, '#d8f2ff');
    g.addColorStop(1, '#6ec4ff');
    x.fillStyle = g;
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.8)';
    x.beginPath();
    x.ellipse(8.5, 24, 2.2, 3.2, 0.3, 0, TAU);
    x.fill();
  }));
  a.define('fx.z', () => art(40, 40, (x) => {
    x.font = '900 34px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.lineWidth = 6;
    x.strokeStyle = 'rgba(70,60,140,0.7)';
    x.strokeText('z', 20, 19);
    x.fillStyle = '#eef0ff';
    x.fillText('z', 20, 19);
  }));
  a.define('fx.note', () => art(40, 48, (x) => {
    x.strokeStyle = '#8a6cf0';
    x.fillStyle = '#8a6cf0';
    x.lineWidth = 3.4;
    x.beginPath();
    x.moveTo(27, 34);
    x.lineTo(27, 8);
    x.quadraticCurveTo(32, 14, 37, 15);
    x.stroke();
    x.beginPath();
    x.ellipse(20, 35, 8.6, 6.6, -0.35, 0, TAU);
    x.fill();
  }));
  a.define('fx.crumb', () => art(16, 16, (x) => {
    x.fillStyle = '#d7a56b';
    x.beginPath();
    x.arc(8, 8, 6, 0, TAU);
    x.fill();
  }));
  a.define('fx.dot', () => ({ canvas: softDot(32, '#ffffff', { falloff: 0.1, inner: 0.7 }), w: 32, h: 32 }));
  a.define('fx.confetti', () => art(14, 22, (x) => {
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.roundRect(1, 1, 12, 20, 3);
    x.fill();
  }));
  a.define('fx.tongue', () => art(26, 34, (x) => {
    x.beginPath();
    x.moveTo(3, 0);
    x.lineTo(23, 0);
    x.lineTo(23, 20);
    x.arc(13, 21, 10, 0, Math.PI);
    x.closePath();
    const g = x.createLinearGradient(0, 0, 0, 32);
    g.addColorStop(0, '#ff7f93');
    g.addColorStop(1, '#ff9fae');
    x.fillStyle = g;
    x.fill();
    x.strokeStyle = 'rgba(190,50,80,0.55)';
    x.lineWidth = 1.4;
    x.beginPath();
    x.moveTo(13, 4);
    x.lineTo(13, 20);
    x.stroke();
  }));
  a.define('fx.dirt', () => {
    const [c, x] = makeCanvas(420, 380);
    const r = seeded(29);
    for (const [u, v, q] of [[120, 280, 40], [300, 300, 34], [340, 180, 26], [90, 170, 26], [220, 340, 30], [170, 120, 16], [280, 90, 14]]) {
      for (let i = 0; i < 26; i++) {
        const an = r() * TAU;
        const d = r() * q;
        x.fillStyle = `rgba(112,78,48,${r.range(0.16, 0.42)})`;
        x.beginPath();
        x.arc(u + Math.cos(an) * d, v + Math.sin(an) * d * 0.8, r.range(3, q * 0.42), 0, TAU);
        x.fill();
      }
    }
    return { canvas: c, w: 210, h: 190 };
  });
  a.define('fx.mud', () => art(60, 40, (x) => {
    x.fillStyle = '#7c5a3c';
    x.beginPath();
    x.ellipse(30, 22, 27, 14, 0, 0, TAU);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.22)';
    x.beginPath();
    x.ellipse(22, 17, 10, 3.4, -0.1, 0, TAU);
    x.fill();
  }));
  a.define('fx.ring', () => art(64, 64, (x) => {
    x.strokeStyle = 'rgba(255,255,255,0.9)';
    x.lineWidth = 4;
    x.beginPath();
    x.arc(32, 32, 27, 0, TAU);
    x.stroke();
  }));
  a.define('fx.lick', () => art(120, 160, (x) => {
    const g = x.createRadialGradient(60, 80, 4, 60, 80, 76);
    g.addColorStop(0, 'rgba(235,245,255,0.5)');
    g.addColorStop(0.7, 'rgba(235,245,255,0.26)');
    g.addColorStop(1, 'rgba(235,245,255,0)');
    x.fillStyle = g;
    x.beginPath();
    x.ellipse(60, 80, 52, 76, 0, 0, TAU);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.5)';
    x.beginPath();
    x.ellipse(40, 56, 7, 22, 0.2, 0, TAU);
    x.fill();
  }));
  a.define('fx.fog', () => ({ canvas: softDot(256, '#f4f9ff', { falloff: 0.5, alpha: 0.85 }), w: 256, h: 256 }));
  a.define('fx.beam', () => {
    const [c, x] = makeCanvas(128, 256);
    const g = x.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(44, 0);
    x.lineTo(84, 0);
    x.lineTo(128, 256);
    x.lineTo(0, 256);
    x.closePath();
    x.fill();
    return { canvas: c, w: 128, h: 256 };
  });
}

export { css, rgb, heartPath, starPath };
