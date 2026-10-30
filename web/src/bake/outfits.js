// Hats, glasses and neckwear, painted once and worn on the rig. Each has an anchor: where it sits on
// the head or neck in rig units, and which point of its picture goes there.
import { css, darken, lighten, rgb, TAU } from '../util.js';
import { makeCanvas } from './paint.js';

const S = 3;

export const outfitAnchors = {
  bow: { x: 52, y: -84, ax: 0.5, ay: 0.5, rot: 0.3, scale: 0.9 },
  flower: { x: 50, y: -82, ax: 0.5, ay: 0.5, rot: -0.1, scale: 0.9 },
  party: { x: 0, y: -84, ax: 0.5, ay: 0.92, rot: 0.1, scale: 1 },
  beanie: { x: 0, y: -60, ax: 0.5, ay: 0.72, scale: 1, tilt: 0.5 },
  crown: { x: 0, y: -90, ax: 0.5, ay: 0.82, rot: 0.06, scale: 0.95 },
  wizard: { x: 0, y: -74, ax: 0.5, ay: 0.86, rot: -0.1, scale: 1 },
  pumpkin: { x: 0, y: -84, ax: 0.5, ay: 0.78, scale: 1 },
  santa: { x: 0, y: -68, ax: 0.42, ay: 0.72, scale: 1, rot: 0.08 },
  headphones: { x: 0, y: -28, ax: 0.5, ay: 0.5, scale: 1, tilt: 0.25 },
  glasses: { x: 0, y: 4, ax: 0.5, ay: 0.5, scale: 1, tilt: 0.18 },
  shades: { x: 0, y: 4, ax: 0.5, ay: 0.5, scale: 1, tilt: 0.18 },
  scarf: { x: 0, y: 58, ax: 0.5, ay: 0.4, scale: 1, tilt: 0.1, follow: false },
  bandana: { x: 0, y: 56, ax: 0.5, ay: 0.3, scale: 1, tilt: 0.1, follow: false },
  bowtie: { x: 0, y: 60, ax: 0.5, ay: 0.5, scale: 0.95, tilt: 0.1, follow: false },
  cape: { x: 0, y: 22, ax: 0.5, ay: 0.14, scale: 1, tilt: 0.1, follow: false },
};

function paint(w, h, fn) {
  const [c, x] = makeCanvas(w * S, h * S);
  x.scale(S, S);
  x.lineJoin = 'round';
  x.lineCap = 'round';
  fn(x, w, h);
  return { canvas: c, w, h };
}

const grad = (x, x0, y0, x1, y1, ...stops) => {
  const g = x.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
  return g;
};

const shine = (x, px, py, rx, ry, a = 0.55, rot = -0.4) => {
  x.fillStyle = `rgba(255,255,255,${a})`;
  x.beginPath();
  x.ellipse(px, py, rx, ry, rot, 0, TAU);
  x.fill();
};

export const OUTFIT_ART = {
  bow: () => paint(70, 50, (x) => {
    const lobe = (s) => {
      x.beginPath();
      x.moveTo(35, 25);
      x.bezierCurveTo(35 + s * 6, 4, 35 + s * 32, 0, 35 + s * 33, 15);
      x.bezierCurveTo(35 + s * 34, 30, 35 + s * 30, 46, 35 + s * 28, 44);
      x.bezierCurveTo(35 + s * 16, 42, 35 + s * 6, 34, 35, 25);
      x.closePath();
      x.fillStyle = grad(x, 0, 0, 0, 50, '#ff9fc4', '#ff5f97');
      x.fill();
      x.strokeStyle = '#d93f79';
      x.lineWidth = 1.6;
      x.stroke();
      shine(x, 35 + s * 18, 14, 8, 4);
    };
    lobe(-1);
    lobe(1);
    x.fillStyle = grad(x, 0, 18, 0, 34, '#ffa8c9', '#f0568e');
    x.beginPath();
    x.roundRect(29, 17, 12, 16, 5);
    x.fill();
    x.strokeStyle = '#d93f79';
    x.stroke();
  }),
  flower: () => paint(60, 60, (x) => {
    for (let i = 0; i < 8; i++) {
      x.save();
      x.translate(30, 30);
      x.rotate((i / 8) * TAU);
      x.beginPath();
      x.ellipse(0, -15, 7.5, 13, 0, 0, TAU);
      x.fillStyle = grad(x, 0, -28, 0, -2, '#ffffff', '#f4ecff');
      x.fill();
      x.strokeStyle = 'rgba(180,160,210,0.6)';
      x.lineWidth = 1;
      x.stroke();
      x.restore();
    }
    x.beginPath();
    x.arc(30, 30, 10, 0, TAU);
    x.fillStyle = grad(x, 0, 20, 0, 40, '#ffe27a', '#ffb22e');
    x.fill();
    x.strokeStyle = '#e8941b';
    x.stroke();
    shine(x, 27, 26, 3.5, 2.2, 0.8);
  }),
  party: () => paint(70, 86, (x) => {
    x.beginPath();
    x.moveTo(35, 8);
    x.lineTo(60, 78);
    x.quadraticCurveTo(35, 88, 10, 78);
    x.closePath();
    x.save();
    x.clip();
    x.fillStyle = grad(x, 0, 0, 70, 0, '#7fd0ff', '#4fa6ff');
    x.fillRect(0, 0, 70, 90);
    x.strokeStyle = '#ffe36e';
    x.lineWidth = 7;
    for (let i = -2; i < 7; i++) {
      x.beginPath();
      x.moveTo(-10, i * 18);
      x.lineTo(80, i * 18 + 34);
      x.stroke();
    }
    x.restore();
    x.strokeStyle = '#2e7fd6';
    x.lineWidth = 1.8;
    x.beginPath();
    x.moveTo(35, 8);
    x.lineTo(60, 78);
    x.quadraticCurveTo(35, 88, 10, 78);
    x.closePath();
    x.stroke();
    x.beginPath();
    x.arc(35, 9, 8, 0, TAU);
    x.fillStyle = grad(x, 0, 2, 0, 16, '#ffb3d0', '#ff5f97');
    x.fill();
    shine(x, 33, 6, 2.6, 1.8, 0.8);
  }),
  beanie: () => paint(150, 98, (x) => {
    x.beginPath();
    x.moveTo(14, 70);
    x.bezierCurveTo(14, 18, 136, 18, 136, 70);
    x.closePath();
    x.fillStyle = grad(x, 0, 16, 0, 70, '#8fd4c6', '#4fa998');
    x.fill();
    x.strokeStyle = '#37867a';
    x.lineWidth = 2;
    x.stroke();
    x.strokeStyle = 'rgba(40,120,110,0.55)';
    x.lineWidth = 2.2;
    for (let i = 0; i < 8; i++) {
      const u = 26 + i * 14.2;
      x.beginPath();
      x.moveTo(u, 70);
      x.quadraticCurveTo(75 + (u - 75) * 0.6, 30, 75 + (u - 75) * 0.25, 22);
      x.stroke();
    }
    x.beginPath();
    x.roundRect(6, 62, 138, 28, 12);
    x.fillStyle = grad(x, 0, 62, 0, 90, '#f7f3e4', '#ddd4b8');
    x.fill();
    x.strokeStyle = '#bcb190';
    x.stroke();
    x.beginPath();
    x.arc(75, 18, 13, 0, TAU);
    x.fillStyle = grad(x, 0, 5, 0, 31, '#fffdf4', '#e0d7bb');
    x.fill();
    x.strokeStyle = '#bcb190';
    x.stroke();
  }),
  crown: () => paint(90, 66, (x) => {
    x.beginPath();
    x.moveTo(10, 56);
    x.lineTo(5, 18);
    x.lineTo(26, 36);
    x.lineTo(45, 7);
    x.lineTo(64, 36);
    x.lineTo(85, 18);
    x.lineTo(80, 56);
    x.quadraticCurveTo(45, 64, 10, 56);
    x.closePath();
    x.fillStyle = grad(x, 0, 6, 0, 62, '#fff0a6', '#ffc533', '#e0941b');
    x.fill();
    x.strokeStyle = '#b86f0e';
    x.lineWidth = 2;
    x.stroke();
    for (const [u, v, c] of [[45, 12, '#ff5f8f'], [8, 22, '#6fc8ff'], [82, 22, '#6fe0a8']]) {
      x.beginPath();
      x.arc(u, v, 5.6, 0, TAU);
      x.fillStyle = c;
      x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.2)';
      x.lineWidth = 1;
      x.stroke();
      shine(x, u - 1.4, v - 1.8, 1.8, 1.2, 0.9);
    }
    x.fillStyle = '#ff5f8f';
    x.beginPath();
    x.arc(45, 45, 6, 0, TAU);
    x.fill();
    shine(x, 43.5, 43, 2, 1.4, 0.9);
  }),
  wizard: () => paint(130, 118, (x) => {
    x.beginPath();
    x.moveTo(62, 6);
    x.bezierCurveTo(76, 26, 96, 70, 104, 96);
    x.lineTo(26, 96);
    x.bezierCurveTo(36, 66, 50, 30, 62, 6);
    x.closePath();
    x.fillStyle = grad(x, 0, 6, 0, 96, '#8d73ea', '#5840b8');
    x.fill();
    x.strokeStyle = '#3e2c8c';
    x.lineWidth = 2;
    x.stroke();
    x.beginPath();
    x.ellipse(65, 98, 60, 13, 0, 0, TAU);
    x.fillStyle = grad(x, 0, 86, 0, 111, '#7f66df', '#4d38a8');
    x.fill();
    x.stroke();
    x.fillStyle = '#ffe27a';
    for (const [u, v, r] of [[60, 48, 6], [78, 72, 4.6], [46, 76, 3.8], [66, 26, 3.2]]) {
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU - Math.PI / 2;
        const q = i % 2 ? r * 0.42 : r;
        x.lineTo(u + Math.cos(a) * q, v + Math.sin(a) * q);
      }
      x.closePath();
      x.fill();
    }
  }),
  pumpkin: () => paint(92, 74, (x) => {
    x.fillStyle = '#5ea34e';
    x.beginPath();
    x.moveTo(44, 16);
    x.quadraticCurveTo(44, 6, 54, 3);
    x.lineTo(58, 10);
    x.quadraticCurveTo(52, 13, 52, 18);
    x.closePath();
    x.fill();
    for (const [u, rx] of [[20, 18], [72, 18], [34, 18], [58, 18], [46, 16]]) {
      x.beginPath();
      x.ellipse(u, 44, rx, 28, 0, 0, TAU);
      x.fillStyle = grad(x, 0, 16, 0, 72, '#ffb04f', '#f07a1e');
      x.fill();
      x.strokeStyle = '#c95e10';
      x.lineWidth = 1.6;
      x.stroke();
    }
    shine(x, 34, 28, 9, 4, 0.45);
  }),
  santa: () => paint(150, 110, (x) => {
    x.beginPath();
    x.moveTo(18, 84);
    x.bezierCurveTo(26, 28, 74, 6, 112, 30);
    x.bezierCurveTo(128, 40, 134, 56, 132, 70);
    x.lineTo(120, 68);
    x.bezierCurveTo(116, 58, 112, 54, 106, 52);
    x.bezierCurveTo(112, 66, 116, 76, 118, 84);
    x.closePath();
    x.fillStyle = grad(x, 0, 12, 0, 84, '#ff7a7a', '#d93b47');
    x.fill();
    x.strokeStyle = '#a92433';
    x.lineWidth = 2;
    x.stroke();
    x.beginPath();
    x.roundRect(6, 74, 124, 26, 13);
    x.fillStyle = grad(x, 0, 74, 0, 100, '#ffffff', '#e3e6ee');
    x.fill();
    x.strokeStyle = '#bcc2d0';
    x.stroke();
    x.beginPath();
    x.arc(130, 78, 13, 0, TAU);
    x.fillStyle = grad(x, 0, 65, 0, 91, '#ffffff', '#dfe3ec');
    x.fill();
    x.stroke();
  }),
  headphones: () => paint(252, 170, (x) => {
    x.beginPath();
    x.moveTo(30, 108);
    x.bezierCurveTo(28, 6, 224, 6, 222, 108);
    x.strokeStyle = '#ff6f91';
    x.lineWidth = 11;
    x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.35)';
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(44, 70);
    x.bezierCurveTo(60, 18, 192, 18, 208, 70);
    x.stroke();
    for (const u of [27, 225]) {
      x.beginPath();
      x.ellipse(u, 118, 22, 34, 0, 0, TAU);
      x.fillStyle = grad(x, 0, 84, 0, 152, '#ff90aa', '#e0456f');
      x.fill();
      x.strokeStyle = '#b92d55';
      x.lineWidth = 2;
      x.stroke();
      shine(x, u - 6, 102, 6, 9, 0.4, 0.2);
    }
  }),
  glasses: () => paint(170, 74, (x) => {
    for (const u of [40, 130]) {
      x.beginPath();
      x.arc(u, 37, 31, 0, TAU);
      x.fillStyle = 'rgba(255,255,255,0.12)';
      x.fill();
      x.strokeStyle = '#5a3a2e';
      x.lineWidth = 5.5;
      x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.65)';
      x.lineWidth = 3.4;
      x.beginPath();
      x.arc(u, 37, 22, 3.6, 4.5);
      x.stroke();
    }
    x.strokeStyle = '#5a3a2e';
    x.lineWidth = 5;
    x.beginPath();
    x.moveTo(70, 33);
    x.quadraticCurveTo(85, 25, 100, 33);
    x.stroke();
  }),
  shades: () => paint(186, 76, (x) => {
    x.strokeStyle = '#26202c';
    x.lineWidth = 6;
    x.beginPath();
    x.moveTo(6, 22);
    x.lineTo(180, 22);
    x.stroke();
    for (const u of [50, 136]) {
      x.beginPath();
      x.moveTo(u - 40, 20);
      x.lineTo(u + 40, 20);
      x.quadraticCurveTo(u + 42, 62, u + 4, 66);
      x.quadraticCurveTo(u - 40, 66, u - 40, 20);
      x.closePath();
      x.fillStyle = grad(x, 0, 18, 0, 66, '#3b3548', '#16121c');
      x.fill();
      x.strokeStyle = '#100c16';
      x.lineWidth = 3;
      x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.5)';
      x.lineWidth = 5;
      x.beginPath();
      x.moveTo(u - 24, 46);
      x.lineTo(u - 6, 28);
      x.stroke();
    }
  }),
  scarf: () => paint(210, 104, (x) => {
    x.beginPath();
    x.moveTo(16, 18);
    x.quadraticCurveTo(105, 54, 194, 18);
    x.quadraticCurveTo(204, 34, 196, 48);
    x.quadraticCurveTo(105, 88, 14, 48);
    x.quadraticCurveTo(6, 34, 16, 18);
    x.closePath();
    x.fillStyle = grad(x, 0, 18, 0, 80, '#ff8a8a', '#e04d55');
    x.fill();
    x.strokeStyle = '#b5303d';
    x.lineWidth = 2;
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 6; i++) {
      x.save();
      x.translate(36 + i * 28, 42 + Math.sin((i / 5) * Math.PI) * 15);
      x.rotate(0.2 * (i - 2.5) * -0.3);
      x.fillRect(-4, -9, 8, 18);
      x.restore();
    }
    x.beginPath();
    x.moveTo(146, 56);
    x.quadraticCurveTo(162, 76, 150, 100);
    x.lineTo(124, 96);
    x.quadraticCurveTo(128, 76, 118, 62);
    x.closePath();
    x.fillStyle = grad(x, 0, 56, 0, 100, '#ff7f85', '#d94650');
    x.fill();
    x.strokeStyle = '#b5303d';
    x.stroke();
  }),
  bandana: () => paint(190, 96, (x) => {
    x.beginPath();
    x.moveTo(14, 12);
    x.quadraticCurveTo(95, 40, 176, 12);
    x.lineTo(95, 88);
    x.closePath();
    x.fillStyle = grad(x, 0, 12, 0, 88, '#6fb6ff', '#3d84e0');
    x.fill();
    x.strokeStyle = '#2a64b5';
    x.lineWidth = 2;
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.8)';
    for (const [u, v] of [[60, 30], [95, 38], [130, 30], [78, 50], [112, 50], [95, 66]]) {
      x.beginPath();
      x.arc(u, v, 3.4, 0, TAU);
      x.fill();
    }
  }),
  bowtie: () => paint(90, 54, (x) => {
    const wing = (s) => {
      x.beginPath();
      x.moveTo(45, 27);
      x.lineTo(45 + s * 38, 8);
      x.quadraticCurveTo(45 + s * 44, 27, 45 + s * 38, 46);
      x.closePath();
      x.fillStyle = grad(x, 0, 8, 0, 46, '#ffb35a', '#f2802c');
      x.fill();
      x.strokeStyle = '#c75f15';
      x.lineWidth = 2;
      x.stroke();
    };
    wing(-1);
    wing(1);
    x.beginPath();
    x.roundRect(37, 18, 16, 18, 5);
    x.fillStyle = '#ff9b3f';
    x.fill();
    x.strokeStyle = '#c75f15';
    x.stroke();
  }),
  cape: () => paint(260, 190, (x) => {
    x.beginPath();
    x.moveTo(52, 8);
    x.quadraticCurveTo(130, 28, 208, 8);
    x.bezierCurveTo(238, 70, 250, 130, 254, 176);
    x.quadraticCurveTo(218, 158, 188, 180);
    x.quadraticCurveTo(160, 160, 130, 184);
    x.quadraticCurveTo(100, 160, 72, 180);
    x.quadraticCurveTo(42, 158, 6, 176);
    x.bezierCurveTo(10, 130, 22, 70, 52, 8);
    x.closePath();
    x.fillStyle = grad(x, 0, 8, 0, 180, '#ff6f7f', '#c92f45');
    x.fill();
    x.strokeStyle = '#8f1f30';
    x.lineWidth = 2.4;
    x.stroke();
  }),
};

/** Registers every outfit texture with the shared store. */
export function defineOutfits(assets) {
  for (const [id, art] of Object.entries(OUTFIT_ART)) assets.define(`outfit.${id}`, art);
}

export { css, darken, lighten, rgb };
