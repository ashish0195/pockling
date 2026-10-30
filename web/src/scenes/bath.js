// Bath time. Soap it up, rinse it off, towel it dry until it poofs up twice its size.
import { audio } from '../audio.js';
import { celebrate, fadeTo, game, quality, save } from '../game.js';
import { makeCanvas } from '../bake/paint.js';
import { GROUND } from '../pet.js';
import { haptic, purr as hapticPurr } from '../platform.js';
import { finishBath, setClean } from '../state.js';
import { clamp, lerp, rand, seeded, smooth, Spring, TAU } from '../util.js';
import { home } from './home.js';

const lin = (x, x0, y0, x1, y1, ...c) => {
  const g = x.createLinearGradient(x0, y0, x1, y1);
  c.forEach((col, i) => g.addColorStop(i / (c.length - 1), col));
  return g;
};

function bakeWall(view, Q) {
  const { w, h, u } = view;
  const [c, x] = makeCanvas(w * Q, h * Q);
  x.scale(Q, Q);
  x.fillStyle = lin(x, 0, 0, 0, h, '#dff6f6', '#c4ecec');
  x.fillRect(0, 0, w, h);
  // Glossy tiles.
  const t = 52 * u;
  for (let row = 0; row * t < h; row++) {
    for (let col = -1; col * t < w + t; col++) {
      const px = col * t + (row % 2 ? t / 2 : 0);
      const py = row * t;
      x.fillStyle = (row * 3 + col * 5) % 7 === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.22)';
      x.beginPath();
      x.roundRect(px + 1.5 * u, py + 1.5 * u, t - 3 * u, t - 3 * u, 7 * u);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,0.4)';
      x.beginPath();
      x.roundRect(px + 7 * u, py + 6 * u, t * 0.32, 4 * u, 2 * u);
      x.fill();
    }
  }
  // A shelf with bottles.
  const sy = h * 0.3;
  const sx = w * 0.72;
  x.fillStyle = '#fff';
  x.beginPath();
  x.roundRect(sx - 72 * u, sy, 144 * u, 10 * u, 5 * u);
  x.fill();
  const bottle = (bx, bw, bh, col) => {
    x.fillStyle = lin(x, bx, 0, bx + bw, 0, col[0], col[1]);
    x.beginPath();
    x.roundRect(bx, sy - bh, bw, bh, 7 * u);
    x.fill();
    x.fillStyle = col[1];
    x.beginPath();
    x.roundRect(bx + bw * 0.3, sy - bh - 9 * u, bw * 0.4, 11 * u, 2 * u);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.6)';
    x.beginPath();
    x.roundRect(bx + bw * 0.16, sy - bh * 0.72, bw * 0.68, bh * 0.36, 3 * u);
    x.fill();
  };
  bottle(sx - 60 * u, 28 * u, 46 * u, ['#ffc1d4', '#ff8fb0']);
  bottle(sx - 24 * u, 24 * u, 36 * u, ['#ffe39a', '#ffc247']);
  bottle(sx + 8 * u, 30 * u, 54 * u, ['#b6e4ff', '#6fbdf5']);
  // Floor.
  const fy = view.floorY + 24 * u;
  x.fillStyle = lin(x, 0, fy, 0, h, '#f6e6d8', '#e6cdb8');
  x.fillRect(0, fy, w, h - fy);
  x.fillStyle = 'rgba(120,80,60,0.14)';
  x.fillRect(0, fy, w, 3 * u);
  return { canvas: c, w, h };
}

function tubPath(x, W, H, u) {
  x.beginPath();
  x.moveTo(6 * u, 10 * u);
  x.lineTo(W - 6 * u, 10 * u);
  x.bezierCurveTo(W - 2 * u, H * 0.5, W - 34 * u, H - 8 * u, W * 0.72, H - 8 * u);
  x.lineTo(W * 0.28, H - 8 * u);
  x.bezierCurveTo(34 * u, H - 8 * u, 2 * u, H * 0.5, 6 * u, 10 * u);
  x.closePath();
}

function bakeTub(view, Q) {
  const { w, u } = view;
  const W = Math.min(w * 0.92, 380 * u);
  const H = 150 * u;
  const [c, x] = makeCanvas(W * Q, (H + 24 * u) * Q);
  x.scale(Q, Q);
  // Gold feet.
  x.fillStyle = lin(x, 0, H - 10 * u, 0, H + 20 * u, '#ffd76b', '#e8a227');
  for (const f of [0.2, 0.8]) {
    x.beginPath();
    x.roundRect(W * f - 16 * u, H - 14 * u, 32 * u, 34 * u, 12 * u);
    x.fill();
  }
  tubPath(x, W, H, u);
  x.fillStyle = lin(x, 0, 0, W, 0, '#eaf3f8', '#ffffff', '#ffffff', '#d7e5ee');
  x.fill();
  x.save();
  tubPath(x, W, H, u);
  x.clip();
  x.fillStyle = lin(x, 0, H * 0.55, 0, H, 'rgba(120,150,180,0)', 'rgba(120,150,180,0.32)');
  x.fillRect(0, 0, W, H);
  x.fillStyle = lin(x, W * 0.1, 0, W * 0.34, 0, 'rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)');
  x.beginPath();
  x.ellipse(W * 0.2, H * 0.46, 22 * u, 44 * u, 0.2, 0, TAU);
  x.fill();
  x.restore();
  // Rim.
  x.fillStyle = lin(x, 0, 0, 0, 24 * u, '#ffffff', '#dbe7ee');
  x.beginPath();
  x.roundRect(0, 0, W, 22 * u, 11 * u);
  x.fill();
  return { canvas: c, w: W, h: H + 24 * u };
}

/** The bubble bath: foam heaped up behind the rim, highest in the middle. */
function bakeWater(view, Q) {
  const { w, u } = view;
  const W = Math.min(w * 0.92, 380 * u) - 6 * u;
  const H = 86 * u;
  const [c, x] = makeCanvas(W * Q, H * Q);
  x.scale(Q, Q);
  const r = seeded(5);
  const bubbles = [];
  for (let i = 0; i < 150; i++) {
    const px = r.range(0, W);
    const heap = 18 * u + Math.sin((px / W) * Math.PI) ** 0.7 * 40 * u;
    bubbles.push([px, H - r.range(0, heap), r.range(7, 18) * u]);
  }
  bubbles.sort((a2, b2) => a2[1] - b2[1]);
  for (const [px, py, q] of bubbles) {
    const g = x.createRadialGradient(px - q * 0.3, py - q * 0.35, q * 0.1, px, py, q);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.72, '#f6fbff');
    g.addColorStop(1, '#cfe6f8');
    x.fillStyle = g;
    x.beginPath();
    x.arc(px, py, q, 0, TAU);
    x.fill();
  }
  // A few clear bubbles catching the light.
  for (let i = 0; i < 16; i++) {
    const px = r.range(8, W - 8);
    const py = H - r.range(14, 18 * u + Math.sin((px / W) * Math.PI) ** 0.7 * 40 * u);
    const q = r.range(3, 7) * u;
    x.strokeStyle = 'rgba(150,200,240,0.7)';
    x.lineWidth = 1.1 * u;
    x.beginPath();
    x.arc(px, py, q, 0, TAU);
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.9)';
    x.beginPath();
    x.arc(px - q * 0.32, py - q * 0.34, q * 0.24, 0, TAU);
    x.fill();
  }
  return { canvas: c, w: W, h: H };
}

function bakeDuck(view) {
  const size = 72;
  const [c, x] = makeCanvas(size * 3, size * 3);
  x.scale(3, 3);
  x.fillStyle = lin(x, 0, 30, 0, 66, '#ffe86b', '#ffbf2e');
  x.beginPath();
  x.moveTo(8, 42);
  x.bezierCurveTo(10, 66, 58, 68, 64, 42);
  x.bezierCurveTo(52, 46, 46, 40, 44, 34);
  x.bezierCurveTo(34, 38, 18, 36, 8, 42);
  x.fill();
  x.beginPath();
  x.arc(44, 24, 16, 0, TAU);
  x.fillStyle = lin(x, 0, 8, 0, 40, '#fff17f', '#ffcb3b');
  x.fill();
  x.fillStyle = '#ff8d3a';
  x.beginPath();
  x.ellipse(60, 27, 8, 4.4, 0.1, 0, TAU);
  x.fill();
  x.fillStyle = '#2d1b2e';
  x.beginPath();
  x.arc(49, 20, 3, 0, TAU);
  x.fill();
  x.fillStyle = '#fff';
  x.beginPath();
  x.arc(48, 19, 1, 0, TAU);
  x.fill();
  return { canvas: c, w: size, h: size };
}

const TOWEL_SVG = `<svg viewBox="0 0 60 50" width="30" height="26" aria-hidden="true"><rect y="6" width="60" height="44" rx="9" fill="#ff9fbc"/><rect y="34" width="60" height="5" fill="#fff" opacity=".85"/><rect y="42" width="60" height="3" fill="#fff" opacity=".85"/><rect width="60" height="24" rx="9" fill="#ffc9da"/></svg>`;

export const bath = {
  enter() {
    const { assets, view, pet, actor } = game;
    const Q = quality();
    assets.define('bath.wall', () => bakeWall(view, Q), { mipmap: false });
    assets.define('bath.tub', () => bakeTub(view, Q));
    assets.define('bath.water', () => bakeWater(view, Q));
    assets.define('bath.duck', () => bakeDuck(view));
    actor.stop();
    actor.relax('smile');
    actor.scale = 1;
    actor.air = 0;
    this.tubY = view.floorY + 6 * view.u;
    actor.x = view.w / 2;
    actor.y = this.tubY - 34 * view.u;
    pet.dirt = game.state.pet.bathDirt ? 1 : clamp((60 - game.state.pet.clean) / 60);
    pet.settle();
    this.foam = [];
    this.tool = 'soap';
    this.step = 0;
    this.wet = 0;
    this.fluff = new Spring(0, 40, 6);
    this.soaped = 0;
    this.rinsed = 0;
    this.dried = 0;
    this.touch = null;
    this.drops = [];
    this.done = false;
    this.duck = { x: view.w * 0.7, bob: 0, squeak: 0 };
    this.rainbow = 0;
    this.lastFoam = [999, 999];
    this.pointer = null;
    this.layer();
    audio.stopMusic();
  },

  exit() {
    audio.water(false);
    audio.purr(false);
    hapticPurr(false);
    game.pet.dirt = 0;
    game.pet.wet = 0;
    game.pet.overBody = null;
    game.pet.sizeBoost = 0;
  },

  resize() {
    fadeTo(bath);
  },

  layer() {
    const name = game.state.pet.name.replace(/</g, '&lt;');
    document.getElementById('layer').innerHTML = `
      <div class="gamebar"><button class="round" data-action="home" aria-label="Back home">✕</button></div>
      <div class="hint" id="bathHint"></div>
      <div id="tools">
        ${[['soap', '🧼', 'Soap'], ['shower', '🚿', 'Shower'], ['towel', TOWEL_SVG, 'Towel']].map(([t, ico, label]) => `<button class="tool" data-tool="${t}"><span class="ico">${ico}</span>${label}</button>`).join('')}
      </div>`;
    for (const b of document.querySelectorAll('.tool')) {
      b.addEventListener('click', () => {
        audio.unlock();
        audio.click();
        this.setTool(b.dataset.tool);
      });
    }
    this.setTool('soap');
    this.hint(`Rub the soap all over ${name}`);
  },

  hint(text) {
    const h = document.getElementById('bathHint');
    if (h) h.textContent = text;
  },

  setTool(t) {
    this.tool = t;
    for (const b of document.querySelectorAll('.tool')) {
      b.classList.toggle('on', b.dataset.tool === t);
    }
    this.markNext();
  },

  markNext() {
    const next = this.step === 0 ? 'soap' : this.step === 1 ? 'shower' : 'towel';
    for (const b of document.querySelectorAll('.tool')) b.classList.toggle('next', b.dataset.tool === next && next !== this.tool);
  },

  advance() {
    const name = game.state.pet.name.replace(/</g, '&lt;');
    this.step += 1;
    this.touch = null;
    this.pointer = null;
    audio.water(false);
    if (this.step === 1) {
      this.setTool('shower');
      this.hint('Rinse off the bubbles');
      audio.chirrup();
    } else if (this.step === 2) {
      this.setTool('towel');
      this.hint(`Now rub ${name} dry`);
      audio.chirrup();
    } else if (this.step === 3) {
      this.finish();
    }
  },

  finish() {
    if (this.done) return;
    this.done = true;
    const { actor, pet, fx, view } = game;
    this.hint('Squeaky clean!');
    actor.play(this.poofScene());
    void pet;
    void fx;
    void view;
  },

  *poofScene() {
    const { actor, pet, fx } = game;
    audio.purr(false);
    hapticPurr(false);
    // A big shake, drops flying everywhere.
    pet.setFace('joy');
    pet.ears(0);
    for (let i = 0; i < 8; i++) {
      pet.r.yaw.target = i % 2 ? 0.34 : -0.34;
      pet.r.lean.target = i % 2 ? 0.06 : -0.06;
      pet.jiggle(5);
      const c = pet.anchors.center;
      if (c) fx.drops(c[0], c[1], 3, 300);
      yield 0.07;
    }
    pet.r.yaw.target = 0;
    pet.r.lean.target = 0;
    yield 0.12;
    // Poof!
    this.fluff.target = 1;
    this.fluff.kick(6);
    audio.poof();
    haptic('success');
    const c = pet.anchors.center;
    if (c) {
      fx.poof(c[0], c[1], 22, 90, 62 * game.view.u);
      fx.sparkles(c[0], c[1], 20, 130);
      fx.heartBurst(c[0], c[1], 12);
    }
    this.rainbow = 0.001;
    pet.setFace('starry');
    pet.wag(1.2, 16);
    const result = finishBath(game.state, game.now());
    setClean(game.state, 100);
    game.ui.refresh();
    save();
    yield 1.6;
    pet.setFace('smile');
    yield 0.7;
    celebrate(result);
    fadeTo(home);
  },

  down(x, y, id) {
    audio.unlock();
    if (this.done) return;
    this.touch = { id, x, y };
    this.pointer = [x, y];
    if (this.tool === 'shower') audio.water(true);
    const d = this.duck;
    if (Math.hypot(x - d.x, y - (this.tubY - 54 * game.view.u)) < 40 * game.view.u) {
      d.squeak = 1;
      audio.chirp(1300, 0.14, { contour: [[0, 0.8], [1, 1.25]], type: 'square', vol: 0.14, vowel: 2400 });
      haptic('light');
    }
  },

  move(x, y, id) {
    const t = this.touch;
    if (!t || t.id !== id) return;
    const step = Math.hypot(x - t.x, y - t.y);
    t.x = x;
    t.y = y;
    this.pointer = [x, y];
    if (this.done) return;
    const { pet } = game;
    pet.lookAt([x, y]);
    const part = pet.hit(x, y);
    if (this.tool === 'soap' && part && step > 0) this.lather(x, y, step);
    if (this.tool === 'towel' && part && step > 0) this.rubDry(x, y, step);
  },

  up(x, y, id) {
    if (!this.touch || this.touch.id !== id) return;
    this.touch = null;
    this.pointer = null;
    audio.water(false);
    audio.purr(false);
    hapticPurr(false);
    const { pet, actor } = game;
    pet.lookAt(null);
    if (!this.done && !actor.busy) actor.relax(this.step === 2 ? 'smile' : 'smile');
  },

  lather(x, y, step) {
    const { pet, fx } = game;
    const l = pet.toLocal(x, y);
    this.soaped += step * 0.0022;
    if (Math.hypot(l[0] - this.lastFoam[0], l[1] - this.lastFoam[1]) > 15 && this.foam.length < 70) {
      this.lastFoam = l;
      this.foam.push({ x: clamp(l[0], -100, 100) + rand(-6, 6), y: clamp(l[1], -92, 84) + rand(-6, 6), s: 0, target: rand(30, 52), r: rand(TAU) });
      audio.soap();
      if (Math.random() < 0.7) audio.bubble();
      haptic('soft');
    }
    if (Math.random() < 0.4) fx.bubbles(x, y, 1, 18);
    pet.dirt = clamp(pet.dirt - step * 0.002);
    if (pet.face !== 'purr') pet.setFace('purr');
    if (this.step === 0 && this.foam.length >= 26) this.advance();
  },

  rinse(dt) {
    const { pet, view, fx } = game;
    const p = this.pointer;
    if (!p) return;
    const c = pet.anchors.center;
    if (!c) return;
    const u = pet.anchors.unit;
    const lx = (p[0] - c[0]) / u;
    // Water falls straight down from the shower head, washing foam in its way.
    for (let i = 0; i < 3; i++) {
      this.drops.push({ x: p[0] + rand(-20, 20) * view.u, y: p[1] + 32 * view.u, vy: rand(620, 860), vx: rand(-20, 20), a: 1 });
    }
    const overPet = Math.abs(lx) < 120 && p[1] < c[1] + 90 * u;
    if (overPet) {
      this.wet = clamp(this.wet + dt * 0.7);
      for (let i = this.foam.length - 1; i >= 0; i--) {
        const f = this.foam[i];
        if (Math.abs(f.x - lx) < 42) {
          f.target -= dt * 95;
          if (f.target <= 4) {
            this.foam.splice(i, 1);
            fx.bubbles(c[0] + f.x * u, c[1] + f.y * u, 2, 8);
            audio.pop();
          }
        }
      }
      pet.dirt = clamp(pet.dirt - dt * 0.6);
      if (pet.face !== 'ouch' && pet.face !== 'happy') pet.setFace(Math.random() < 0.5 ? 'ouch' : 'happy');
      this.rinsed += dt;
    }
    if (this.step === 1 && this.foam.length === 0 && this.rinsed > 0.4) {
      audio.water(false);
      this.advance();
    }
  },

  rubDry(x, y, step) {
    const { pet, fx } = game;
    this.dried += step * 0.002;
    this.wet = clamp(this.wet - step * 0.0022);
    this.fluff.target = clamp(this.dried * 0.45, 0, 0.5);
    pet.r.press.target = 0;
    if (pet.face !== 'purr') pet.setFace('purr');
    pet.jiggle(step * 0.05);
    if (Math.random() < 0.18) fx.drops(x, y, 2, 170);
    if (!this.purring) {
      this.purring = true;
      audio.purr(true);
      hapticPurr(true);
    }
    if (this.dried >= 1 && this.step === 2) this.advance();
  },

  update(dt) {
    const { actor, pet, fx, view } = game;
    actor.update(dt);
    fx.update(dt);
    this.fluff.step(dt);
    for (const f of this.foam) f.s += (f.target - f.s) * Math.min(1, dt * 14);
    if (this.tool === 'shower' && this.touch && !this.done) this.rinse(dt);
    if (this.tool !== 'towel' && this.purring) {
      this.purring = false;
      audio.purr(false);
      hapticPurr(false);
    }
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.y += d.vy * dt;
      d.x += d.vx * dt;
      if (d.y > this.tubY + 10 * view.u) this.drops.splice(i, 1);
    }
    this.duck.bob += dt;
    this.duck.squeak = Math.max(0, this.duck.squeak - dt * 3);
    if (this.rainbow > 0) this.rainbow = Math.min(1, this.rainbow + dt * 1.6);
    pet.wet = this.wet;
    // Wet fur clings: a little thinner and a little darker. Dry fur poofs out.
    pet.sizeBoost = this.fluff.x * 0.16 - this.wet * 0.05;
    pet.overBody = (g) => this.drawFoam(g);
    if (!actor.busy && !this.touch && Math.random() < dt * 0.25) actor.relax('smile');
  },

  drawFoam(g) {
    const { assets, pet } = game;
    const foam = assets.get('fx.foam');
    const p = [0, 0];
    for (const f of this.foam) {
      pet.deform(f.x, f.y, p);
      g.sprite(foam, p[0], p[1], { w: f.s, h: f.s, rot: f.r });
    }
  },

  draw(g) {
    const { assets, actor, pet, view, fx } = game;
    const { w, h, u } = view;
    const shade = 1 - this.wet * 0.13;
    const light = [shade, shade, shade];
    g.sprite(assets.get('bath.wall'), 0, 0, { ax: 0, ay: 0, w, h });

    const tub = assets.get('bath.tub');
    const water = assets.get('bath.water');
    // Rainbow behind everything once it's clean.
    if (this.rainbow > 0) {
      const cols = [[1, 0.42, 0.42], [1, 0.72, 0.3], [1, 0.95, 0.4], [0.5, 0.9, 0.5], [0.4, 0.72, 1], [0.7, 0.5, 1]];
      const R = Math.min(w * 0.52, 210 * u);
      cols.forEach((c, i) => {
        const r = R - i * 13 * u;
        for (let a = 0; a < 40; a++) {
          const t = a / 39;
          const ang = Math.PI + t * Math.PI * smooth(this.rainbow);
          g.sprite(assets.get('fx.dot'), w / 2 + Math.cos(ang) * r, this.tubY - 40 * u + Math.sin(ang) * r, { w: 17 * u, h: 17 * u, tint: c, alpha: 0.5 });
        }
      });
    }

    // Back of the water, then the pet, then the tub front over its feet.
    const s = u * (1 + (pet.sizeBoost ?? 0));
    g.sprite(water, w / 2, this.tubY - 112 * u, { ay: 0, tint: [0.88, 0.94, 1] });
    pet.draw(g, actor.x, actor.y, s, light);
    g.sprite(water, w / 2, this.tubY - 92 * u, { ay: 0 });
    // The duck bobs on the water.
    const d = this.duck;
    const duck = assets.get('bath.duck');
    const ds = 1 + d.squeak * 0.2;
    g.sprite(duck, d.x, this.tubY - 62 * u + Math.sin(d.bob * 2.2) * 3 * u, { w: duck.w * u * ds, h: duck.h * u * (2 - ds), rot: Math.sin(d.bob * 1.4) * 0.09 });
    g.sprite(tub, w / 2, this.tubY - 40 * u, { ay: 0 });

    // Water from the shower head.
    const dropTex = assets.get('fx.drop');
    for (const dr of this.drops) {
      g.sprite(dropTex, dr.x, dr.y, { w: 7 * u, h: 13 * u, alpha: 0.85 });
    }

    fx.draw(g);

    // The tool in your hand.
    if (this.pointer && !this.done) {
      const [px, py] = this.pointer;
      const tex = assets.get(`tool.${this.tool}`);
      const wig = this.touch ? Math.sin(game.time * 18) * 0.08 : 0;
      g.sprite(tex, px, py - 8 * u, { w: tex.w * u, h: tex.h * u, rot: wig });
    }
    void GROUND;
    void lerp;
  },
};

export function defineBathTools(assets) {
  const emoji = (key, icon, size) => assets.define(key, () => {
    const [c, x] = makeCanvas(size * 3, size * 3);
    x.font = `${size * 2.5}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(icon, (size * 3) / 2, (size * 3) / 2 + size * 0.14);
    return { canvas: c, w: size, h: size };
  });
  emoji('tool.soap', '🧼', 66);
  emoji('tool.shower', '🚿', 70);
  assets.define('tool.towel', () => {
    const [c, x] = makeCanvas(74 * 3, 74 * 3);
    x.scale(3, 3);
    x.translate(7, 12);
    x.fillStyle = lin(x, 0, 0, 0, 50, '#ffc1d4', '#ff8fb0');
    x.beginPath();
    x.roundRect(0, 6, 60, 44, 9);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.85)';
    x.fillRect(0, 34, 60, 5);
    x.fillRect(0, 42, 60, 3);
    x.fillStyle = lin(x, 0, 0, 0, 26, '#ffe0ea', '#ffb3c9');
    x.beginPath();
    x.roundRect(0, 0, 60, 24, 9);
    x.fill();
    return { canvas: c, w: 74, h: 74 };
  });
}
