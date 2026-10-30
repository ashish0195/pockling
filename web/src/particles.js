// Hearts, sparkles, bubbles, crumbs, confetti: one small particle system, drawn with the sprite batch.
import { lerp, pick, rand, TAU } from './util.js';

const CONFETTI = [[1, 0.42, 0.56], [1, 0.8, 0.28], [0.36, 0.78, 1], [0.48, 0.9, 0.6], [0.72, 0.52, 1], [1, 0.6, 0.3]];

export class Particles {
  constructor(assets) {
    this.assets = assets;
    this.list = [];
  }

  clear() {
    this.list.length = 0;
  }

  add(p) {
    if (this.list.length > 420) this.list.shift();
    this.list.push({
      vx: 0, vy: 0, ax: 0, ay: 0, drag: 0, life: 1, age: 0, size: 20, end: null, rot: 0, spin: 0, alpha: 1, add: 0, tint: null, wob: 0, wobF: 3, fadeIn: 0, phase: rand(TAU),
      ...p,
    });
  }

  update(dt) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.age += dt;
      if (p.age >= p.life) {
        l.splice(i, 1);
        continue;
      }
      p.vx += p.ax * dt;
      p.vy += p.ay * dt;
      if (p.drag) {
        const k = Math.exp(-p.drag * dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
  }

  draw(g, filter) {
    for (const p of this.list) {
      if (filter && !filter(p)) continue;
      const t = p.age / p.life;
      const size = p.end === null ? p.size : lerp(p.size, p.end, t);
      let a = p.alpha;
      if (t > 0.65) a *= 1 - (t - 0.65) / 0.35;
      if (p.fadeIn && p.age < p.fadeIn) a *= p.age / p.fadeIn;
      const x = p.x + (p.wob ? Math.sin(p.age * p.wobF + p.phase) * p.wob : 0);
      const tex = this.assets.get(p.tex);
      const ratio = tex.h / tex.w;
      const w = p.flat ? size * Math.abs(Math.cos(p.age * 6 + p.phase)) + 1 : size;
      g.sprite(tex, x, p.y, { w, h: size * ratio, rot: p.rot, alpha: a, add: p.add, tint: p.tint ?? undefined });
    }
  }

  // ── Effects ──

  hearts(x, y, n = 3, spread = 40) {
    for (let i = 0; i < n; i++) {
      this.add({ tex: 'fx.heart', x: x + rand(-spread, spread), y: y + rand(-12, 12), vy: rand(-92, -52), vx: rand(-14, 14), life: rand(1.1, 1.8), size: rand(12, 26), end: rand(20, 34), wob: rand(6, 16), wobF: rand(2.5, 4.5), rot: rand(-0.3, 0.3), fadeIn: 0.1 });
    }
  }

  heartBurst(x, y, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU);
      const s = rand(70, 210);
      this.add({ tex: 'fx.heart', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, ay: 60, drag: 2.2, life: rand(0.9, 1.5), size: rand(14, 30), rot: rand(-0.4, 0.4) });
    }
  }

  sparkles(x, y, n = 4, spread = 40) {
    for (let i = 0; i < n; i++) {
      this.add({ tex: 'fx.sparkle', x: x + rand(-spread, spread), y: y + rand(-spread, spread), vy: rand(-26, -4), vx: rand(-12, 12), life: rand(0.5, 1.1), size: rand(10, 28), end: 2, spin: rand(-1.6, 1.6), add: 1, alpha: 0.95 });
    }
  }

  stars(x, y, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU);
      const s = rand(60, 200);
      this.add({ tex: 'fx.star', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30, ay: 120, drag: 1.8, life: rand(0.7, 1.3), size: rand(10, 24), spin: rand(-5, 5) });
    }
  }

  bubbles(x, y, n = 3, spread = 40) {
    for (let i = 0; i < n; i++) {
      this.add({ tex: 'fx.bubble', x: x + rand(-spread, spread), y: y + rand(-spread, spread) * 0.5, vy: rand(-90, -36), vx: rand(-14, 14), life: rand(1.2, 2.6), size: rand(10, 34), wob: rand(4, 12), wobF: rand(2, 4), fadeIn: 0.15 });
    }
  }

  crumbs(x, y, n = 6, tint) {
    for (let i = 0; i < n; i++) {
      this.add({ tex: 'fx.crumb', x: x + rand(-8, 8), y: y + rand(-4, 4), vx: rand(-110, 110), vy: rand(-170, -50), ay: 620, life: rand(0.4, 0.8), size: rand(4, 9), spin: rand(-8, 8), tint });
    }
  }

  drops(x, y, n = 6, speed = 200) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU);
      const s = rand(0.3, 1) * speed;
      const vx = Math.cos(a) * s;
      const vy = Math.sin(a) * s - 60;
      this.add({ tex: 'fx.drop', x, y, vx, vy, ay: 640, life: rand(0.4, 0.8), size: rand(6, 13), rot: Math.atan2(vy, vx) + Math.PI / 2 });
    }
  }

  confetti(x, y, n = 40, spread = 200) {
    for (let i = 0; i < n; i++) {
      this.add({ tex: 'fx.confetti', x: x + rand(-spread, spread), y: y + rand(-60, 20), vx: rand(-90, 90), vy: rand(-340, -90), ay: 320, drag: 0.9, life: rand(1.6, 3), size: rand(7, 13), spin: rand(-7, 7), flat: true, tint: pick(CONFETTI), wob: rand(6, 22), wobF: rand(2, 5) });
    }
  }

  zzz(x, y) {
    this.add({ tex: 'fx.z', x, y, vy: -22, vx: 9, life: 2.6, size: 13, end: 34, wob: 7, wobF: 1.8, rot: 0.15, fadeIn: 0.3 });
  }

  notes(x, y, n = 1) {
    for (let i = 0; i < n; i++) {
      this.add({ tex: 'fx.note', x: x + rand(-34, 34), y, vy: rand(-62, -36), vx: rand(-14, 14), life: rand(1.2, 1.9), size: rand(16, 26), wob: 10, wobF: 3, rot: rand(-0.3, 0.3), fadeIn: 0.1 });
    }
  }

  poof(x, y, n = 12, spread = 60, size = 52) {
    for (let i = 0; i < n; i++) {
      const a = rand(TAU);
      const s = rand(30, 130);
      this.add({ tex: 'fx.foam', x: x + rand(-spread, spread) * 0.4, y: y + rand(-spread, spread) * 0.4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 3, life: rand(0.4, 0.8), size: rand(size * 0.4, size), end: size * 1.3, alpha: 0.85 });
    }
  }

  ring(x, y, size = 200) {
    this.add({ tex: 'fx.ring', x, y, life: 0.5, size: 20, end: size, add: 1, alpha: 0.7 });
  }

  flash(x, y, size = 420, life = 0.5) {
    this.add({ tex: 'fx.glow', x, y, life, size: size * 0.4, end: size, add: 1, alpha: 0.95 });
  }
}
