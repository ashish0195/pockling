// The Pockling's room, painted to fit the screen: a wall with a window (the real sky shows through it),
// a wooden floor with a rug, a bed, a plant, a shelf. Also the sky pieces and the light for each hour.
import { ROOMS } from '../catalog.js';
import { clamp, css, darken, lerp, lighten, mixRgb, rgb, seeded, smooth, TAU } from '../util.js';
import { makeCanvas, softDot } from './paint.js';

const lin = (x, x0, y0, x1, y1, ...c) => {
  const g = x.createLinearGradient(x0, y0, x1, y1);
  c.forEach((col, i) => g.addColorStop(i / (c.length - 1), col));
  return g;
};

function scaled(w, h, Q) {
  const [c, x] = makeCanvas(w * Q, h * Q);
  x.scale(Q, Q);
  x.lineCap = 'round';
  x.lineJoin = 'round';
  return [c, x];
}

// ── Sky ──────────────────────────────────────────────────────────────────────────────────────────

const SKIES = {
  day: ['#4fb0f5', '#8ed2fb', '#d6f1ff'],
  dawn: ['#6b7fd8', '#f5a9b8', '#ffe2b3'],
  dusk: ['#3d3488', '#c85f93', '#ffae6b'],
  night: ['#0b0f33', '#1b2159', '#34387d'],
};

export function defineSky(assets) {
  for (const [name, stops] of Object.entries(SKIES)) {
    assets.define(`sky.${name}`, () => {
      const [c, x] = makeCanvas(8, 256);
      x.fillStyle = lin(x, 0, 0, 0, 256, ...stops);
      x.fillRect(0, 0, 8, 256);
      return { canvas: c, w: 8, h: 256 };
    }, { mipmap: false });
  }
  assets.define('sky.sun', () => {
    const [c, x] = makeCanvas(256, 256);
    x.drawImage(softDot(256, '#fff2c0', { falloff: 1.4, alpha: 0.95 }), 0, 0);
    const g = x.createRadialGradient(128, 128, 2, 128, 128, 42);
    g.addColorStop(0, '#fffef2');
    g.addColorStop(0.8, '#fff0a8');
    g.addColorStop(1, 'rgba(255,230,140,0)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(128, 128, 42, 0, TAU);
    x.fill();
    return { canvas: c, w: 128, h: 128 };
  });
  assets.define('sky.moon', () => {
    const [c, x] = makeCanvas(256, 256);
    x.drawImage(softDot(256, '#cfd8ff', { falloff: 1.5, alpha: 0.6 }), 0, 0);
    x.beginPath();
    x.arc(128, 128, 44, 0, TAU);
    x.fillStyle = lin(x, 88, 88, 168, 168, '#fffdf0', '#ffe9b0');
    x.fill();
    x.fillStyle = 'rgba(214,190,130,0.4)';
    for (const [u, v, r] of [[114, 112, 9], [146, 134, 7], [122, 150, 5.5], [146, 104, 4]]) {
      x.beginPath();
      x.arc(u, v, r, 0, TAU);
      x.fill();
    }
    return { canvas: c, w: 128, h: 128 };
  });
  for (let i = 0; i < 3; i++) {
    assets.define(`sky.cloud${i}`, () => {
      const r = seeded(40 + i);
      const [c, x] = makeCanvas(320, 150);
      const lobes = [];
      const n = 6 + i;
      for (let k = 0; k < n; k++) {
        const t = k / (n - 1);
        lobes.push([34 + t * 252, 92 - Math.sin(t * Math.PI) * r.range(16, 34), r.range(24, 46) * (0.7 + Math.sin(t * Math.PI) * 0.5)]);
      }
      x.fillStyle = 'rgba(190,212,240,1)';
      for (const [u, v, q] of lobes) {
        x.beginPath();
        x.arc(u, v + 7, q, 0, TAU);
        x.fill();
      }
      x.fillRect(34, 92, 252, 26);
      x.fillStyle = '#ffffff';
      for (const [u, v, q] of lobes) {
        x.beginPath();
        x.arc(u, v, q, 0, TAU);
        x.fill();
      }
      return { canvas: c, w: 160, h: 75 };
    });
  }
  assets.define('sky.stars', () => {
    const r = seeded(3);
    const [c, x] = makeCanvas(512, 512);
    for (let i = 0; i < 170; i++) {
      x.fillStyle = `rgba(255,255,${r.range(215, 255) | 0},${r.range(0.25, 1)})`;
      x.beginPath();
      x.arc(r() * 512, r() * 512, r.range(0.6, 2.2), 0, TAU);
      x.fill();
    }
    return { canvas: c, w: 512, h: 512 };
  }, { repeat: true });
  // The star projector: soft moons and stars thrown on the wall at bedtime.
  assets.define('sky.projector', () => {
    const r = seeded(19);
    const [c, x] = makeCanvas(1024, 1024);
    const star = (px, py, q) => {
      x.save();
      x.translate(px, py);
      x.shadowColor = 'rgba(255,240,180,0.9)';
      x.shadowBlur = q * 1.1;
      x.fillStyle = 'rgba(255,246,205,0.92)';
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * TAU;
        const d = i % 2 ? q * 0.45 : q;
        x.lineTo(Math.cos(a) * d, Math.sin(a) * d);
      }
      x.closePath();
      x.fill();
      x.restore();
    };
    for (let i = 0; i < 70; i++) {
      const a = r() * TAU;
      const d = 60 + r() * 440;
      star(512 + Math.cos(a) * d, 512 + Math.sin(a) * d, r.range(5, 17));
    }
    return { canvas: c, w: 512, h: 512 };
  });
}

/**
 * What the sky and the light are doing at an hour of the day. mix gives the weights of each sky;
 * ambient tints everything indoors or out; sun and moon are 0..1 along their paths or null.
 */
export function lightAt(hour) {
  const h = ((hour % 24) + 24) % 24;
  const key = [
    [0, 'night'], [5, 'night'], [6.5, 'dawn'], [8.5, 'day'], [17, 'day'], [18.8, 'dusk'], [20.2, 'night'], [24, 'night'],
  ];
  let i = 0;
  while (i < key.length - 2 && h >= key[i + 1][0]) i++;
  const t = smooth((h - key[i][0]) / (key[i + 1][0] - key[i][0]));
  const mix = { day: 0, dawn: 0, dusk: 0, night: 0 };
  mix[key[i][1]] += 1 - t;
  mix[key[i + 1][1]] += t;
  const ambientOf = { day: [1, 1, 1], dawn: [1, 0.92, 0.88], dusk: [1, 0.84, 0.8], night: [0.62, 0.62, 0.86] };
  let ambient = [0, 0, 0];
  for (const name of Object.keys(mix)) {
    ambient = [ambient[0] + ambientOf[name][0] * mix[name], ambient[1] + ambientOf[name][1] * mix[name], ambient[2] + ambientOf[name][2] * mix[name]];
  }
  const sun = h > 6 && h < 19.5 ? (h - 6) / 13.5 : null;
  const moon = h >= 19 ? (h - 19) / 11 : h < 6.5 ? (h + 5) / 11 : null;
  return { hour: h, mix, ambient, sun, moon, night: mix.night, beam: clamp(mix.day + mix.dawn * 0.5 + mix.dusk * 0.4) };
}

export function drawSky(g, assets, light, x, y, w, h) {
  for (const name of ['day', 'dawn', 'dusk', 'night']) {
    if (light.mix[name] > 0.003) g.sprite(assets.get(`sky.${name}`), x, y, { w, h, ax: 0, ay: 0, alpha: name === 'day' ? 1 : light.mix[name] });
  }
}

// ── Room ─────────────────────────────────────────────────────────────────────────────────────────

/** Where things stand in a room of this size. Shared by the painter and the game. */
export function roomLayout(view) {
  const { w, horizon, floorY, u } = view;
  return {
    window: { x: w * 0.29, y: Math.max(horizon - 340 * u, 118 * u), w: 132 * u, h: 192 * u },
    bed: { x: Math.min(w * 0.82, w - 100 * u), y: horizon + 46 * u, w: 148 * u, h: 86 * u },
    plant: { x: w * 0.09, y: horizon + 12 * u },
    shelf: { x: w * 0.74, y: Math.max(horizon - 248 * u, 150 * u), w: 124 * u },
    rug: { x: w * 0.5, y: floorY - 6 * u, rx: Math.min(w * 0.44, 190 * u), ry: 46 * u },
  };
}

export function bakeWall(themeId, view, Q) {
  const theme = ROOMS[themeId];
  const { w, horizon, u } = view;
  const L = roomLayout(view);
  const h = horizon + 2;
  const [c, x] = scaled(w, h, Q);
  x.fillStyle = lin(x, 0, 0, 0, h, theme.wall[0], theme.wall[1]);
  x.fillRect(0, 0, w, h);

  // Wallpaper: little scattered hearts and dots.
  const r = seeded(21);
  const dark = darken(rgb(theme.wall[1]), 0.1);
  x.fillStyle = css(dark, 0.25);
  const step = 38 * u;
  for (let row = 0; row * step * 0.8 < h; row++) {
    for (let col = -1; col * step < w + step; col++) {
      const px = col * step + (row % 2 ? step / 2 : 0);
      const py = row * step * 0.8 + 10 * u;
      if (r() < 0.5) {
        x.beginPath();
        x.arc(px, py, 2.2 * u, 0, TAU);
        x.fill();
      } else {
        const s = 3.4 * u;
        x.beginPath();
        x.moveTo(px, py + s);
        x.bezierCurveTo(px - s * 1.5, py - s * 0.2, px - s * 0.8, py - s * 1.2, px, py - s * 0.4);
        x.bezierCurveTo(px + s * 0.8, py - s * 1.2, px + s * 1.5, py - s * 0.2, px, py + s);
        x.fill();
      }
    }
  }

  // Corner shadow and a soft vignette, so the room has some depth.
  const vg = x.createRadialGradient(w / 2, h * 0.62, Math.min(w, h) * 0.2, w / 2, h * 0.62, Math.max(w, h) * 0.8);
  vg.addColorStop(0, 'rgba(120,70,70,0)');
  vg.addColorStop(1, 'rgba(120,70,70,0.2)');
  x.fillStyle = vg;
  x.fillRect(0, 0, w, h);

  // Window: frame, then a hole the sky shows through, then the crossbars and curtains.
  const win = L.window;
  const arch = (dx) => {
    const left = win.x - win.w / 2 - dx;
    const right = win.x + win.w / 2 + dx;
    const top = win.y - dx;
    const bottom = win.y + win.h + dx;
    const rad = (win.w / 2 + dx);
    x.beginPath();
    x.moveTo(left, bottom);
    x.lineTo(left, top + rad);
    x.arc(win.x, top + rad, rad, Math.PI, 0);
    x.lineTo(right, bottom);
    x.closePath();
  };
  x.save();
  x.shadowColor = 'rgba(90,50,50,0.35)';
  x.shadowBlur = 14 * u;
  x.shadowOffsetY = 6 * u;
  arch(9 * u);
  x.fillStyle = theme.trim;
  x.fill();
  x.restore();
  x.save();
  x.globalCompositeOperation = 'destination-out';
  x.fillStyle = '#000';
  arch(0);
  x.fill();
  x.restore();
  x.save();
  arch(0);
  x.clip();
  x.strokeStyle = theme.trim;
  x.lineWidth = 6 * u;
  x.beginPath();
  x.moveTo(win.x, win.y - 10);
  x.lineTo(win.x, win.y + win.h + 10);
  x.moveTo(win.x - win.w, win.y + win.h * 0.56);
  x.lineTo(win.x + win.w, win.y + win.h * 0.56);
  x.stroke();
  // Sill glass tint.
  x.fillStyle = 'rgba(255,255,255,0.05)';
  x.fillRect(win.x - win.w, win.y, win.w * 2, win.h);
  x.restore();
  // Sill.
  x.save();
  x.shadowColor = 'rgba(90,50,50,0.3)';
  x.shadowBlur = 8 * u;
  x.shadowOffsetY = 4 * u;
  x.fillStyle = theme.trim;
  x.beginPath();
  x.roundRect(win.x - win.w / 2 - 18 * u, win.y + win.h + 3 * u, win.w + 36 * u, 12 * u, 5 * u);
  x.fill();
  x.restore();

  // Curtains.
  const accent = rgb(theme.accent);
  for (const side of [-1, 1]) {
    const edge = win.x + (side * win.w) / 2;
    const top = win.y + 2 * u;
    const drop = win.h + 34 * u;
    x.beginPath();
    x.moveTo(edge + side * 18 * u, top - 12 * u);
    x.lineTo(edge - side * 26 * u, top - 12 * u);
    x.bezierCurveTo(edge - side * 12 * u, top + drop * 0.4, edge - side * 2 * u, top + drop * 0.6, edge + side * 3 * u, top + drop * 0.62);
    x.bezierCurveTo(edge + side * 3 * u, top + drop * 0.78, edge + side * 8 * u, top + drop * 0.96, edge + side * 18 * u, top + drop);
    x.closePath();
    const g = x.createLinearGradient(edge - side * 26 * u, 0, edge + side * 18 * u, 0);
    g.addColorStop(0, css(lighten(accent, 0.45)));
    g.addColorStop(1, css(lighten(accent, 0.12)));
    x.fillStyle = g;
    x.fill();
    x.strokeStyle = css(darken(accent, 0.05), 0.35);
    x.lineWidth = 2 * u;
    for (const f of [0.35, 0.68]) {
      x.beginPath();
      x.moveTo(edge + side * lerp(-26, 18, f) * u, top);
      x.quadraticCurveTo(edge + side * lerp(-12, 12, f) * u, top + drop * 0.5, edge + side * lerp(0, 16, f) * u, top + drop * 0.92);
      x.stroke();
    }
  }
  // Curtain rail.
  x.fillStyle = css(darken(rgb(theme.floor[1]), 0.1));
  x.beginPath();
  x.roundRect(win.x - win.w / 2 - 34 * u, win.y - 16 * u, win.w + 68 * u, 6 * u, 3 * u);
  x.fill();

  // Shelf with a few treasures.
  const sh = L.shelf;
  const wood = rgb(theme.floor[0]);
  x.save();
  x.shadowColor = 'rgba(70,40,40,0.32)';
  x.shadowBlur = 10 * u;
  x.shadowOffsetY = 6 * u;
  x.fillStyle = lin(x, 0, sh.y, 0, sh.y + 11 * u, css(lighten(wood, 0.2)), css(wood));
  x.beginPath();
  x.roundRect(sh.x - sh.w / 2, sh.y, sh.w, 11 * u, 4 * u);
  x.fill();
  x.restore();
  // Books.
  const bookColors = ['#ff8f8f', '#7fc7ff', '#ffd76b', '#a6e38c'];
  let bx = sh.x - sh.w / 2 + 8 * u;
  bookColors.forEach((col, i) => {
    const bw = (9 + (i % 2) * 3) * u;
    const bh = (34 + ((i * 7) % 11)) * u;
    x.fillStyle = lin(x, bx, 0, bx + bw, 0, css(lighten(rgb(col), 0.2)), col);
    x.beginPath();
    x.roundRect(bx, sh.y - bh, bw, bh, 2 * u);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.55)';
    x.fillRect(bx + 2 * u, sh.y - bh + 7 * u, bw - 4 * u, 3 * u);
    bx += bw + 1 * u;
  });
  // A pot with a little cactus.
  const pox = sh.x + 22 * u;
  x.fillStyle = lin(x, pox - 12 * u, 0, pox + 12 * u, 0, '#ffc6a8', '#ee9c78');
  x.beginPath();
  x.moveTo(pox - 12 * u, sh.y - 18 * u);
  x.lineTo(pox + 12 * u, sh.y - 18 * u);
  x.lineTo(pox + 9 * u, sh.y);
  x.lineTo(pox - 9 * u, sh.y);
  x.closePath();
  x.fill();
  x.fillStyle = lin(x, pox - 9 * u, 0, pox + 9 * u, 0, '#8fdc8a', '#57b05f');
  x.beginPath();
  x.roundRect(pox - 8 * u, sh.y - 42 * u, 16 * u, 26 * u, 8 * u);
  x.fill();
  x.beginPath();
  x.roundRect(pox + 7 * u, sh.y - 36 * u, 7 * u, 12 * u, 3.5 * u);
  x.fill();
  // A star-shaped keepsake.
  x.fillStyle = '#ffd76b';
  x.beginPath();
  const sx = sh.x + 48 * u;
  const sy = sh.y - 13 * u;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * TAU;
    const q = (i % 2 ? 5.4 : 12) * u;
    x.lineTo(sx + Math.cos(a) * q, sy + Math.sin(a) * q);
  }
  x.closePath();
  x.fill();

  // A picture frame under the shelf, with a heart in it.
  const fx = sh.x - 6 * u;
  const fy = sh.y + 34 * u;
  x.save();
  x.shadowColor = 'rgba(70,40,40,0.3)';
  x.shadowBlur = 8 * u;
  x.shadowOffsetY = 4 * u;
  x.fillStyle = theme.trim;
  x.beginPath();
  x.roundRect(fx, fy, 62 * u, 62 * u, 6 * u);
  x.fill();
  x.restore();
  x.fillStyle = css(lighten(accent, 0.6));
  x.beginPath();
  x.roundRect(fx + 6 * u, fy + 6 * u, 50 * u, 50 * u, 3 * u);
  x.fill();
  x.fillStyle = theme.accent;
  const hs = 12 * u;
  const hx = fx + 31 * u;
  const hy = fy + 31 * u;
  x.beginPath();
  x.moveTo(hx, hy + hs);
  x.bezierCurveTo(hx - hs * 1.5, hy - hs * 0.1, hx - hs * 0.9, hy - hs * 1.1, hx, hy - hs * 0.4);
  x.bezierCurveTo(hx + hs * 0.9, hy - hs * 1.1, hx + hs * 1.5, hy - hs * 0.1, hx, hy + hs);
  x.fill();

  // Skirting board, with a shadow where wall meets floor.
  const skirt = 16 * u;
  x.fillStyle = theme.trim;
  x.fillRect(0, h - skirt, w, skirt);
  x.fillStyle = 'rgba(100,60,50,0.14)';
  x.fillRect(0, h - skirt, w, 2 * u);
  x.fillStyle = lin(x, 0, h - skirt - 12 * u, 0, h - skirt, 'rgba(100,60,50,0)', 'rgba(100,60,50,0.1)');
  x.fillRect(0, h - skirt - 12 * u, w, 12 * u);
  return { canvas: c, w, h };
}

export function bakeFloor(themeId, view, Q) {
  const theme = ROOMS[themeId];
  const { w, h: H, horizon, u } = view;
  const L = roomLayout(view);
  const h = H - horizon;
  const [c, x] = scaled(w, h, Q);
  const near = rgb(theme.floor[1]);
  const far = rgb(theme.floor[0]);
  x.fillStyle = lin(x, 0, 0, 0, h, css(lighten(far, 0.08)), css(far), css(near));
  x.fillRect(0, 0, w, h);

  // Planks fan out towards the viewer from a point up on the wall.
  const r = seeded(9);
  const vx = w / 2;
  const vy = -h * 0.9;
  const planks = 13;
  for (let i = -planks; i <= planks; i++) {
    const topX = vx + (i / planks) * w * 0.62;
    const k = (h - vy) / (0 - vy);
    const botX = vx + (topX - vx) * k;
    const tone = r.range(-0.05, 0.05);
    const next = vx + ((i + 1) / planks) * w * 0.62;
    const nextBot = vx + (next - vx) * k;
    x.fillStyle = tone > 0 ? `rgba(255,240,215,${tone})` : `rgba(80,40,20,${-tone})`;
    x.beginPath();
    x.moveTo(topX, 0);
    x.lineTo(next, 0);
    x.lineTo(nextBot, h);
    x.lineTo(botX, h);
    x.closePath();
    x.fill();
    x.strokeStyle = 'rgba(80,40,25,0.26)';
    x.lineWidth = 1.6 * u;
    x.beginPath();
    x.moveTo(topX, 0);
    x.lineTo(botX, h);
    x.stroke();
  }
  // A long soft sheen down the middle of the floor.
  const sheen = x.createRadialGradient(w * 0.42, h * 0.24, 2, w * 0.42, h * 0.24, w * 0.55);
  sheen.addColorStop(0, 'rgba(255,250,235,0.34)');
  sheen.addColorStop(1, 'rgba(255,250,235,0)');
  x.fillStyle = sheen;
  x.fillRect(0, 0, w, h);
  // Darker towards the edge of the screen.
  const edge = x.createLinearGradient(0, h * 0.5, 0, h);
  edge.addColorStop(0, 'rgba(60,30,20,0)');
  edge.addColorStop(1, 'rgba(60,30,20,0.24)');
  x.fillStyle = edge;
  x.fillRect(0, 0, w, h);

  // The rug the pet stands on.
  const rg = L.rug;
  const ry = rg.y - horizon;
  x.save();
  x.fillStyle = 'rgba(60,30,20,0.2)';
  x.beginPath();
  x.ellipse(rg.x, ry + 6 * u, rg.rx + 2, rg.ry + 2, 0, 0, TAU);
  x.fill();
  x.restore();
  const rings = [[1, theme.rug[0]], [0.84, theme.rug[1]], [0.7, theme.rug[0]], [0.56, theme.rug[1]], [0.3, theme.rug[0]]];
  for (const [f, col] of rings) {
    x.fillStyle = col;
    x.beginPath();
    x.ellipse(rg.x, ry, rg.rx * f, rg.ry * f, 0, 0, TAU);
    x.fill();
  }
  // Rug fibres.
  x.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 700; i++) {
    const a = r() * TAU;
    const d = Math.sqrt(r());
    x.beginPath();
    x.ellipse(rg.x + Math.cos(a) * d * rg.rx, ry + Math.sin(a) * d * rg.ry, 2.4 * u, 1 * u, a, 0, TAU);
    x.fill();
  }
  return { canvas: c, w, h };
}

/** The bed, painted on its own so the pet can climb into it. Two layers: frame and blanket. */
export function bakeBed(themeId, view, Q) {
  const theme = ROOMS[themeId];
  const { u } = view;
  const W = 190 * u;
  const H = 130 * u;
  const [c, x] = scaled(W, H, Q);
  const wood = rgb(theme.floor[0]);
  const accent = rgb(theme.accent);
  const cx = W / 2;
  // Headboard.
  x.fillStyle = lin(x, 0, 6 * u, 0, 92 * u, css(lighten(wood, 0.22)), css(darken(wood, 0.04)));
  x.beginPath();
  x.roundRect(cx - 78 * u, 8 * u, 156 * u, 84 * u, [26 * u, 26 * u, 6 * u, 6 * u]);
  x.fill();
  // Mattress.
  x.fillStyle = lin(x, 0, 50 * u, 0, 104 * u, '#fffdf8', '#efe6da');
  x.beginPath();
  x.roundRect(cx - 88 * u, 54 * u, 176 * u, 50 * u, 16 * u);
  x.fill();
  // Pillow.
  x.fillStyle = lin(x, 0, 40 * u, 0, 74 * u, css(lighten(accent, 0.72)), css(lighten(accent, 0.4)));
  x.beginPath();
  x.roundRect(cx - 66 * u, 40 * u, 132 * u, 34 * u, 15 * u);
  x.fill();
  // Feet.
  x.fillStyle = css(darken(wood, 0.16));
  for (const s of [-1, 1]) {
    x.beginPath();
    x.roundRect(cx + s * 76 * u - 7 * u, 100 * u, 14 * u, 16 * u, 4 * u);
    x.fill();
  }
  return { canvas: c, w: W, h: H };
}

export function bakeBlanket(themeId, view, Q) {
  const theme = ROOMS[themeId];
  const { u } = view;
  const W = 190 * u;
  const H = 70 * u;
  const [c, x] = scaled(W, H, Q);
  const accent = rgb(theme.accent);
  const cx = W / 2;
  x.fillStyle = lin(x, 0, 6 * u, 0, 66 * u, css(lighten(accent, 0.35)), css(accent));
  x.beginPath();
  x.moveTo(cx - 90 * u, 22 * u);
  x.bezierCurveTo(cx - 60 * u, 4 * u, cx + 60 * u, 4 * u, cx + 90 * u, 22 * u);
  x.lineTo(cx + 92 * u, 56 * u);
  x.quadraticCurveTo(cx, 72 * u, cx - 92 * u, 56 * u);
  x.closePath();
  x.fill();
  x.fillStyle = 'rgba(255,255,255,0.4)';
  for (let i = 0; i < 5; i++) {
    x.beginPath();
    x.arc(cx - 64 * u + i * 32 * u, 40 * u + (i % 2) * 7 * u, 5 * u, 0, TAU);
    x.fill();
  }
  x.strokeStyle = 'rgba(255,255,255,0.75)';
  x.lineWidth = 5 * u;
  x.beginPath();
  x.moveTo(cx - 88 * u, 22 * u);
  x.bezierCurveTo(cx - 60 * u, 6 * u, cx + 60 * u, 6 * u, cx + 88 * u, 22 * u);
  x.stroke();
  return { canvas: c, w: W, h: H };
}

export function bakePlant(view, Q) {
  const { u } = view;
  const W = 240 * u;
  const H = 190 * u;
  const [c, x] = scaled(W, H, Q);
  const cx = W / 2;
  const r = seeded(77);
  // Leaves, back to front.
  const leaf = (a, l, wide, col) => {
    x.save();
    x.translate(cx, 124 * u);
    x.rotate(a);
    x.beginPath();
    x.moveTo(0, 0);
    x.bezierCurveTo(wide, -l * 0.35, wide * 0.8, -l * 0.8, 0, -l);
    x.bezierCurveTo(-wide * 0.8, -l * 0.8, -wide, -l * 0.35, 0, 0);
    x.closePath();
    x.fillStyle = col;
    x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.28)';
    x.lineWidth = 1.5 * u;
    x.beginPath();
    x.moveTo(0, -4 * u);
    x.lineTo(0, -l * 0.9);
    x.stroke();
    x.restore();
  };
  const tones = ['#3f9c62', '#4fb36f', '#62c67e', '#7fd691'];
  const leaves = [[-0.9, 96, 18], [0.86, 92, 18], [-0.5, 112, 20], [0.46, 110, 20], [-0.16, 118, 20], [0.2, 104, 19], [-1.18, 74, 15], [1.14, 72, 15]];
  leaves.forEach(([a, l, wd], i) => leaf(a + r.range(-0.03, 0.03), l * u, wd * u, tones[(i + 1) % tones.length]));
  // Pot.
  x.fillStyle = lin(x, cx - 34 * u, 0, cx + 34 * u, 0, '#fff2e0', '#f7cfa9', '#e0a97d');
  x.beginPath();
  x.moveTo(cx - 34 * u, 120 * u);
  x.lineTo(cx + 34 * u, 120 * u);
  x.lineTo(cx + 25 * u, 182 * u);
  x.quadraticCurveTo(cx, 188 * u, cx - 25 * u, 182 * u);
  x.closePath();
  x.fill();
  x.fillStyle = '#fff6ea';
  x.beginPath();
  x.roundRect(cx - 38 * u, 114 * u, 76 * u, 14 * u, 6 * u);
  x.fill();
  return { canvas: c, w: W, h: H };
}

/** A string of fairy lights across the top of the room. Returns the bulbs' positions too. */
export function bakeLights(view, Q) {
  const { w, u } = view;
  const H = 46 * u;
  const [c, x] = scaled(w, H, Q);
  const n = Math.round(w / (66 * u));
  const span = w / n;
  x.strokeStyle = 'rgba(90,70,70,0.55)';
  x.lineWidth = 1.6 * u;
  x.beginPath();
  x.moveTo(0, 6 * u);
  const bulbs = [];
  const colors = ['#ffd76b', '#ff8fa8', '#8fd8ff', '#b9f08f', '#d3a6ff'];
  for (let i = 0; i < n; i++) {
    const x0 = i * span;
    const x1 = x0 + span;
    x.quadraticCurveTo((x0 + x1) / 2, 30 * u, x1, 6 * u);
    for (const f of [0.28, 0.72]) {
      const px = lerp(x0, x1, f);
      const py = (1 - f) * (1 - f) * 6 * u + 2 * (1 - f) * f * 30 * u + f * f * 6 * u;
      bulbs.push([px, py + 7 * u, colors[bulbs.length % colors.length]]);
    }
  }
  x.stroke();
  for (const [px, py, col] of bulbs) {
    x.fillStyle = css(darken(rgb(col), 0.08));
    x.beginPath();
    x.ellipse(px, py, 4.2 * u, 5.8 * u, 0, 0, TAU);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.75)';
    x.beginPath();
    x.ellipse(px - 1.4 * u, py - 1.8 * u, 1.2 * u, 1.8 * u, 0, 0, TAU);
    x.fill();
    x.fillStyle = 'rgba(90,70,70,0.8)';
    x.fillRect(px - 2 * u, py - 8 * u, 4 * u, 3 * u);
  }
  return { canvas: c, w, h: H, bulbs };
}

export function defineRoom(assets, themeId, view, Q) {
  assets.define('room.wall', () => bakeWall(themeId, view, Q), { mipmap: false });
  assets.define('room.floor', () => bakeFloor(themeId, view, Q), { mipmap: false });
  assets.define('room.bed', () => bakeBed(themeId, view, Q));
  assets.define('room.blanket', () => bakeBlanket(themeId, view, Q));
  assets.define('room.plant', () => bakePlant(view, Q));
  assets.define('room.lights', () => bakeLights(view, Q));
}

export { mixRgb };
