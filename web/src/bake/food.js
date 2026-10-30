// Food, painted in code, each in three states: whole, one bite gone, nearly finished.
import { FOOD_IDS } from '../catalog.js';
import { TAU } from '../util.js';
import { makeCanvas } from './paint.js';

const S = 3;
const SIZE = 100;

const lin = (x, x0, y0, x1, y1, ...c) => {
  const g = x.createLinearGradient(x0, y0, x1, y1);
  c.forEach((col, i) => g.addColorStop(i / (c.length - 1), col));
  return g;
};
const rad = (x, cx, cy, r0, r1, ...c) => {
  const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1);
  c.forEach((col, i) => g.addColorStop(i / (c.length - 1), col));
  return g;
};
const shine = (x, px, py, rx, ry, rot = -0.5, a = 0.7) => {
  x.fillStyle = `rgba(255,255,255,${a})`;
  x.beginPath();
  x.ellipse(px, py, rx, ry, rot, 0, TAU);
  x.fill();
};

export const FOOD_ART = {
  apple(x) {
    x.beginPath();
    x.moveTo(50, 28);
    x.bezierCurveTo(68, 12, 92, 28, 88, 56);
    x.bezierCurveTo(86, 78, 68, 94, 56, 90);
    x.quadraticCurveTo(50, 88, 44, 90);
    x.bezierCurveTo(32, 94, 14, 78, 12, 56);
    x.bezierCurveTo(8, 28, 32, 12, 50, 28);
    x.closePath();
    x.fillStyle = rad(x, 36, 40, 4, 62, '#ff8a80', '#f5433f', '#c9242e');
    x.fill();
    shine(x, 31, 42, 7, 14, 0.35, 0.62);
    x.strokeStyle = '#6b4226';
    x.lineWidth = 5;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(50, 28);
    x.quadraticCurveTo(50, 16, 56, 9);
    x.stroke();
    x.beginPath();
    x.moveTo(53, 20);
    x.bezierCurveTo(60, 8, 78, 8, 82, 14);
    x.bezierCurveTo(76, 26, 60, 28, 53, 20);
    x.fillStyle = lin(x, 53, 10, 82, 24, '#9be36b', '#51b64a');
    x.fill();
  },
  carrot(x) {
    x.save();
    x.translate(50, 50);
    x.rotate(0.5);
    for (const [a, l] of [[-0.5, 26], [0, 32], [0.5, 26]]) {
      x.save();
      x.translate(0, -30);
      x.rotate(a);
      x.beginPath();
      x.ellipse(0, -l * 0.6, 7, l * 0.6, 0, 0, TAU);
      x.fillStyle = lin(x, 0, -l, 0, 0, '#9be36b', '#46a845');
      x.fill();
      x.restore();
    }
    x.beginPath();
    x.moveTo(-17, -30);
    x.quadraticCurveTo(0, -38, 17, -30);
    x.quadraticCurveTo(15, 0, 2, 44);
    x.quadraticCurveTo(0, 48, -2, 44);
    x.quadraticCurveTo(-15, 0, -17, -30);
    x.closePath();
    x.fillStyle = lin(x, -18, 0, 18, 0, '#ffb25e', '#ff8a28', '#e8690f');
    x.fill();
    x.strokeStyle = 'rgba(190,80,10,0.55)';
    x.lineWidth = 2;
    x.lineCap = 'round';
    for (const [y0, w] of [[-18, 9], [-4, 7], [10, 6], [22, 4]]) {
      x.beginPath();
      x.moveTo(-w, y0);
      x.lineTo(w * 0.2, y0 + 1.5);
      x.stroke();
    }
    x.restore();
  },
  kibble(x) {
    x.beginPath();
    x.moveTo(10, 50);
    x.lineTo(90, 50);
    x.quadraticCurveTo(86, 90, 50, 90);
    x.quadraticCurveTo(14, 90, 10, 50);
    x.closePath();
    x.fillStyle = lin(x, 0, 50, 0, 90, '#7fd0ff', '#3f9fe6');
    x.fill();
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4;
      const r = 6 + i * 1.32;
      const px = 50 + Math.cos(a) * Math.min(r, 36);
      const py = 44 + Math.sin(a) * Math.min(r, 36) * 0.34 - (36 - Math.min(r, 36)) * 0.24;
      x.beginPath();
      x.arc(px, py, 6.2, 0, TAU);
      x.fillStyle = rad(x, px - 2, py - 2, 1, 7, '#e6a862', '#b0702f');
      x.fill();
    }
    x.fillStyle = 'rgba(255,255,255,0.7)';
    x.font = '900 15px ui-rounded, system-ui, sans-serif';
    x.textAlign = 'center';
    x.fillText('♥', 50, 78);
  },
  broccoli(x) {
    x.beginPath();
    x.moveTo(40, 58);
    x.quadraticCurveTo(36, 78, 38, 90);
    x.quadraticCurveTo(50, 95, 62, 90);
    x.quadraticCurveTo(64, 78, 60, 58);
    x.closePath();
    x.fillStyle = lin(x, 38, 0, 62, 0, '#c5ea8f', '#8fce5f');
    x.fill();
    for (const [u, v, r] of [[50, 26, 18], [28, 38, 16], [72, 38, 16], [38, 52, 13], [62, 52, 13], [50, 44, 16], [18, 50, 9], [82, 50, 9]]) {
      x.beginPath();
      x.arc(u, v, r, 0, TAU);
      x.fillStyle = rad(x, u - r * 0.3, v - r * 0.3, 1, r * 1.15, '#7fd262', '#3f9c44', '#2c7c38');
      x.fill();
    }
    x.fillStyle = 'rgba(255,255,255,0.22)';
    for (const [u, v] of [[44, 20], [24, 33], [66, 32], [52, 38]]) {
      x.beginPath();
      x.arc(u, v, 4, 0, TAU);
      x.fill();
    }
  },
  fish(x) {
    x.beginPath();
    x.moveTo(8, 50);
    x.bezierCurveTo(26, 22, 60, 24, 74, 50);
    x.bezierCurveTo(60, 76, 26, 78, 8, 50);
    x.closePath();
    x.fillStyle = lin(x, 0, 28, 0, 74, '#a8e0ff', '#5fb2ee', '#3a8bd0');
    x.fill();
    x.beginPath();
    x.moveTo(70, 50);
    x.lineTo(95, 30);
    x.quadraticCurveTo(88, 50, 95, 70);
    x.closePath();
    x.fillStyle = '#ffa24d';
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.3)';
    for (const [u, v] of [[38, 42], [48, 50], [38, 58], [58, 42], [58, 58]]) {
      x.beginPath();
      x.arc(u, v, 4, 0, TAU);
      x.fill();
    }
    x.beginPath();
    x.arc(24, 44, 6, 0, TAU);
    x.fillStyle = '#fff';
    x.fill();
    x.beginPath();
    x.arc(23, 44, 3.4, 0, TAU);
    x.fillStyle = '#26324a';
    x.fill();
  },
  honey(x) {
    x.beginPath();
    x.moveTo(24, 30);
    x.bezierCurveTo(4, 50, 14, 90, 50, 90);
    x.bezierCurveTo(86, 90, 96, 50, 76, 30);
    x.closePath();
    x.fillStyle = rad(x, 38, 46, 4, 60, '#ffe18a', '#ffb52e', '#d98a0f');
    x.fill();
    x.beginPath();
    x.moveTo(20, 30);
    x.quadraticCurveTo(50, 22, 80, 30);
    x.quadraticCurveTo(84, 34, 80, 38);
    x.quadraticCurveTo(50, 46, 20, 38);
    x.quadraticCurveTo(16, 34, 20, 30);
    x.fillStyle = lin(x, 0, 24, 0, 42, '#ffe9b0', '#f0b84a');
    x.fill();
    x.fillStyle = '#ffdf74';
    x.beginPath();
    x.moveTo(30, 40);
    x.quadraticCurveTo(32, 62, 38, 62);
    x.quadraticCurveTo(44, 62, 44, 42);
    x.closePath();
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.8)';
    x.font = '900 16px ui-rounded, system-ui, sans-serif';
    x.textAlign = 'center';
    x.fillText('♥', 58, 74);
    shine(x, 26, 54, 4, 10, 0.2, 0.55);
  },
  cookie(x) {
    x.beginPath();
    x.arc(50, 50, 40, 0, TAU);
    x.fillStyle = rad(x, 40, 38, 4, 48, '#f3cb8d', '#d9a15c', '#b77c3c');
    x.fill();
    for (const [u, v, r] of [[34, 34, 7], [62, 30, 6], [68, 56, 7], [42, 62, 7], [52, 46, 4.6], [24, 54, 4.6], [58, 74, 4.6]]) {
      x.beginPath();
      x.arc(u, v, r, 0, TAU);
      x.fillStyle = rad(x, u - 2, v - 2, 0.5, r + 1, '#7b4a2e', '#4a2a18');
      x.fill();
    }
    shine(x, 32, 26, 10, 4, -0.6, 0.28);
  },
  donut(x) {
    x.beginPath();
    x.arc(50, 52, 40, 0, TAU);
    x.fillStyle = rad(x, 40, 44, 6, 48, '#f6c98c', '#d89a55');
    x.fill();
    x.beginPath();
    x.moveTo(14, 44);
    x.bezierCurveTo(24, 6, 76, 6, 88, 44);
    x.quadraticCurveTo(90, 56, 80, 58);
    x.quadraticCurveTo(74, 70, 66, 60);
    x.quadraticCurveTo(58, 74, 50, 62);
    x.quadraticCurveTo(40, 74, 34, 60);
    x.quadraticCurveTo(24, 70, 20, 58);
    x.quadraticCurveTo(10, 56, 14, 44);
    x.closePath();
    x.fillStyle = lin(x, 0, 12, 0, 70, '#ffb6d3', '#ff77a8');
    x.fill();
    const cols = ['#fff27a', '#7fe0ff', '#ffffff', '#a9f58f', '#ffa45c'];
    for (let i = 0; i < 18; i++) {
      const a = i * 2.4;
      const r = 20 + (i % 4) * 5.6;
      x.save();
      x.translate(50 + Math.cos(a) * r, 40 + Math.sin(a) * r * 0.62);
      x.rotate(a * 1.7);
      x.fillStyle = cols[i % cols.length];
      x.beginPath();
      x.roundRect(-3.6, -1.3, 7.2, 2.6, 1.3);
      x.fill();
      x.restore();
    }
    x.beginPath();
    x.ellipse(50, 48, 12, 9, 0, 0, TAU);
    x.globalCompositeOperation = 'destination-out';
    x.fill();
    x.globalCompositeOperation = 'source-over';
  },
  sushi(x) {
    x.beginPath();
    x.roundRect(14, 44, 72, 40, 16);
    x.fillStyle = lin(x, 0, 44, 0, 84, '#ffffff', '#e8e4d8');
    x.fill();
    x.fillStyle = 'rgba(190,180,160,0.4)';
    for (let i = 0; i < 18; i++) {
      x.beginPath();
      x.ellipse(20 + ((i * 37) % 62), 54 + ((i * 17) % 26), 3, 1.6, i, 0, TAU);
      x.fill();
    }
    x.beginPath();
    x.moveTo(10, 40);
    x.bezierCurveTo(26, 18, 74, 18, 90, 40);
    x.bezierCurveTo(94, 52, 84, 56, 78, 54);
    x.bezierCurveTo(60, 48, 40, 48, 22, 54);
    x.bezierCurveTo(16, 56, 6, 52, 10, 40);
    x.closePath();
    x.fillStyle = lin(x, 0, 22, 0, 56, '#ff9a7a', '#ff6f52');
    x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.6)';
    x.lineWidth = 3;
    x.lineCap = 'round';
    for (const u of [28, 44, 60, 74]) {
      x.beginPath();
      x.moveTo(u, 28);
      x.quadraticCurveTo(u + 4, 38, u - 3, 48);
      x.stroke();
    }
    x.fillStyle = '#2c3a33';
    x.fillRect(42, 48, 16, 37);
  },
  icecream(x) {
    x.beginPath();
    x.moveTo(26, 50);
    x.lineTo(74, 50);
    x.lineTo(52, 96);
    x.quadraticCurveTo(50, 99, 48, 96);
    x.closePath();
    x.fillStyle = lin(x, 26, 0, 74, 0, '#f2c17a', '#d99a4c');
    x.fill();
    x.strokeStyle = 'rgba(160,100,40,0.5)';
    x.lineWidth = 1.8;
    for (let i = 0; i < 5; i++) {
      x.beginPath();
      x.moveTo(30 + i * 9, 50);
      x.lineTo(52, 92);
      x.stroke();
      x.beginPath();
      x.moveTo(70 - i * 9, 50);
      x.lineTo(48, 92);
      x.stroke();
    }
    x.beginPath();
    x.arc(50, 34, 28, 0, TAU);
    x.fillStyle = rad(x, 40, 24, 2, 34, '#fff0f6', '#ffb6d6', '#ff8cbf');
    x.fill();
    x.beginPath();
    x.moveTo(22, 40);
    x.quadraticCurveTo(26, 56, 34, 50);
    x.quadraticCurveTo(40, 60, 48, 52);
    x.quadraticCurveTo(56, 62, 62, 52);
    x.quadraticCurveTo(72, 56, 78, 40);
    x.closePath();
    x.fillStyle = '#ff9fc8';
    x.fill();
    x.beginPath();
    x.arc(50, 8, 7.5, 0, TAU);
    x.fillStyle = rad(x, 47, 5, 1, 8, '#ff7f7f', '#d92a3a');
    x.fill();
    shine(x, 36, 22, 7, 4, -0.7, 0.75);
  },
  cake(x) {
    x.beginPath();
    x.roundRect(14, 44, 72, 44, 8);
    x.fillStyle = lin(x, 0, 44, 0, 88, '#ffe3b8', '#f4bf79');
    x.fill();
    x.fillStyle = '#fff';
    x.fillRect(14, 64, 72, 5);
    x.beginPath();
    x.moveTo(12, 44);
    x.quadraticCurveTo(12, 32, 26, 32);
    x.lineTo(74, 32);
    x.quadraticCurveTo(88, 32, 88, 44);
    x.quadraticCurveTo(84, 56, 76, 48);
    x.quadraticCurveTo(68, 58, 58, 48);
    x.quadraticCurveTo(48, 60, 38, 48);
    x.quadraticCurveTo(28, 58, 22, 48);
    x.quadraticCurveTo(15, 54, 12, 44);
    x.closePath();
    x.fillStyle = lin(x, 0, 30, 0, 56, '#ffc9e0', '#ff8fbb');
    x.fill();
    x.fillStyle = '#ffd86b';
    x.fillRect(46, 12, 8, 22);
    x.fillStyle = 'rgba(255,255,255,0.5)';
    x.fillRect(46, 16, 8, 3);
    x.fillRect(46, 25, 8, 3);
    x.beginPath();
    x.moveTo(50, 2);
    x.quadraticCurveTo(58, 8, 50, 13);
    x.quadraticCurveTo(42, 8, 50, 2);
    x.fillStyle = lin(x, 0, 2, 0, 13, '#ffec7a', '#ff9d2e');
    x.fill();
    for (const u of [26, 74]) {
      x.beginPath();
      x.arc(u, 34, 6, 0, TAU);
      x.fillStyle = '#e53950';
      x.fill();
    }
  },
  chili(x) {
    x.save();
    x.translate(50, 50);
    x.rotate(0.6);
    x.beginPath();
    x.moveTo(-14, -26);
    x.bezierCurveTo(-22, 0, -14, 30, 10, 44);
    x.bezierCurveTo(12, 24, 22, 2, 16, -26);
    x.quadraticCurveTo(0, -36, -14, -26);
    x.closePath();
    x.fillStyle = lin(x, -18, 0, 20, 0, '#ff6b5e', '#e0202f');
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.5)';
    x.beginPath();
    x.ellipse(-8, -4, 3.4, 13, 0.1, 0, TAU);
    x.fill();
    x.beginPath();
    x.moveTo(-16, -26);
    x.quadraticCurveTo(0, -40, 18, -26);
    x.quadraticCurveTo(0, -18, -16, -26);
    x.fillStyle = '#4fa548';
    x.fill();
    x.strokeStyle = '#4fa548';
    x.lineWidth = 5;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(1, -32);
    x.quadraticCurveTo(1, -44, 9, -46);
    x.stroke();
    x.restore();
  },
};

function bite(x, bites) {
  x.save();
  x.globalCompositeOperation = 'destination-out';
  for (const [u, v, r] of bites) {
    x.beginPath();
    x.arc(u, v, r, 0, TAU);
    x.fill();
  }
  x.restore();
}

const BITES = [
  [],
  [[86, 22, 20], [68, 12, 13], [94, 44, 13]],
  [[86, 22, 26], [66, 10, 19], [94, 50, 22], [52, 6, 14], [76, 66, 19], [40, 16, 12]],
];

export function bakeFood(id, stage = 0) {
  const [c, x] = makeCanvas(SIZE * S, SIZE * S);
  x.scale(S, S);
  x.lineCap = 'round';
  x.lineJoin = 'round';
  FOOD_ART[id](x);
  bite(x, BITES[stage]);
  return { canvas: c, w: SIZE, h: SIZE };
}

export function defineFoods(assets) {
  for (const id of FOOD_IDS) {
    for (let stage = 0; stage < 3; stage++) assets.define(`food.${id}.${stage}`, () => bakeFood(id, stage));
  }
}

const thumbs = new Map();

/** A small picture of a food for the tray, as a data URL. */
export function foodThumb(id) {
  if (!thumbs.has(id)) {
    const [c, x] = makeCanvas(160, 160);
    x.scale(1.6, 1.6);
    x.lineCap = 'round';
    x.lineJoin = 'round';
    FOOD_ART[id](x);
    thumbs.set(id, c.toDataURL('image/png'));
  }
  return thumbs.get(id);
}
