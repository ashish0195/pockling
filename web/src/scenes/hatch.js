// The first few minutes: pick an egg, tap it until it cracks, meet what comes out, give it a name.
// This is the moment people fall for it, so it's staged with some care.
import { Actor } from '../actor.js';
import { audio } from '../audio.js';
import { bakeCrack, bakeEgg } from '../bake/props.js';
import { BREEDS, BREED_IDS } from '../catalog.js';
import { adoptPet, bakeScale, fadeTo, game, save } from '../game.js';
import { Pet } from '../pet.js';
import { haptic } from '../platform.js';
import { clamp, hash, lerp, pick, rand, smooth, TAU } from '../util.js';
import { home } from './home.js';

const NAMES = ['Mochi', 'Bao', 'Pip', 'Nori', 'Tofu', 'Momo', 'Biscuit', 'Peanut', 'Dumpling', 'Waffle', 'Pudding', 'Clover', 'Pebble', 'Sprinkle', 'Churro', 'Maple', 'Boba', 'Kiwi', 'Taro', 'Jellybean', 'Nugget', 'Pickle', 'Button', 'Toffee', 'Marshmallow', 'Bean', 'Gizmo', 'Sunny', 'Olive', 'Mango'];

const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const hatch = {
  enter() {
    const a = game.assets;
    for (const id of BREED_IDS) {
      a.define(`egg.${id}`, () => bakeEgg(id));
      a.define(`egg.${id}.top`, () => bakeEgg(id, 'top'));
      a.define(`egg.${id}.bottom`, () => bakeEgg(id, 'bottom'));
    }
    for (const stage of [1, 2, 3]) a.define(`egg.crack${stage}`, () => bakeCrack(stage));
    a.define('hatch.bg', () => bakeBackground());
    this.phase = 'pick';
    this.selected = null;
    this.eggs = BREED_IDS.map((id, i) => ({ id, i, wob: 0, vWob: 0, scale: 0, pop: i * 0.08 }));
    this.layoutEggs();
    this.taps = 0;
    this.t = 0;
    this.shake = 0;
    this.sparkleIn = 0;
    this.topShell = null;
    this.pet = null;
    this.actor = null;
    game.ui.show('none');
    this.showPick();
  },

  exit() {
    document.getElementById('layer').innerHTML = '';
  },

  resize() {
    this.layoutEggs();
    game.assets.define('hatch.bg', () => bakeBackground());
    game.assets.drop('hatch.bg');
  },

  layoutEggs() {
    const { w, h, u } = game.view;
    const short = w > h && h < 560;
    const cols = short ? 6 : 3;
    const cellW = Math.min(w, (short ? 720 : 520) * u) / cols;
    const startX = (w - cellW * cols) / 2;
    const top = h * (short ? 0.4 : 0.3);
    const cellH = short ? h * 0.3 : Math.min(h * 0.235, 190 * u);
    for (const e of this.eggs) {
      const col = e.i % cols;
      const row = Math.floor(e.i / cols);
      e.x = startX + cellW * (col + 0.5);
      e.y = top + cellH * (row + 0.5);
    }
    this.eggW = Math.min(cellW * 0.74, cellH * 0.62);
  },

  showPick() {
    document.getElementById('layer').innerHTML = `
      <div id="hatch-top">
        <h1>A tiny friend<br>is waiting</h1>
        <p>Pick an egg. What's inside will be yours to love, feed, walk and tuck in.</p>
      </div>
      <div id="hatch">
        <p id="egg-blurb" style="min-height:44px"></p>
        <button class="btn" id="hatchBtn" disabled>Choose an egg</button>
      </div>`;
    $('hatchBtn').addEventListener('click', () => this.confirmEgg());
  },

  down(x, y) {
    audio.unlock();
    if (this.phase === 'pick') {
      for (const e of this.eggs) {
        if (Math.hypot(x - e.x, y - e.y) < this.eggW * 0.68) {
          this.choose(e);
          return;
        }
      }
    } else if (this.phase === 'crack') {
      this.tapEgg(x, y);
    } else if (this.phase === 'meet' && this.actor && !this.actor.busy) {
      const part = this.pet.hit(x, y);
      if (part === 'nose') this.actor.play(this.actor.boop());
      else if (part) this.actor.play(this.actor.giggle());
    }
  },

  choose(e) {
    if (this.selected === e) {
      this.confirmEgg();
      return;
    }
    this.selected = e;
    e.vWob = 9;
    audio.plop();
    audio.chirp(audio.v * rand(1.1, 1.4), 0.1, { contour: [[0, 1], [1, 1.3]], vol: 0.12 });
    haptic('light');
    const b = BREEDS[e.id];
    $('egg-blurb').innerHTML = `<b style="color:var(--ink)">${b.name}</b><br>${b.blurb}`;
    const btn = $('hatchBtn');
    btn.disabled = false;
    btn.textContent = `Hatch this egg`;
  },

  confirmEgg() {
    if (this.phase !== 'pick' || !this.selected) return;
    audio.unlock();
    const e = this.selected;
    this.phase = 'moving';
    this.t = 0;
    const b = BREEDS[e.id];
    const seed = hash(`${e.id}${Date.now()}`) % 100000;
    const coat = pick(b.coats).id;
    this.spec = { breed: e.id, coat, seed };
    this.pet = new Pet(game.assets, { ...this.spec, stage: 'baby', outfit: {} }, { bakeScale: bakeScale() });
    // Bake now, before it's on stage.
    for (const part of ['body', 'belly', 'ear', 'tail', 'paw', 'pawPad', 'foot', 'nose', 'cheek', 'brow']) this.pet.tex(part);
    this.actor = new Actor(this.pet, game.fx);
    audio.voiceBase = b.voice * 1.3;
    this.pet.alpha = 0;
    document.getElementById('layer').innerHTML = `<div class="hint" style="top:calc(var(--safe-t) + 70px);color:var(--ink);background:none;-webkit-backdrop-filter:none;backdrop-filter:none;font-size:21px;font-weight:900" id="hatch-hint"></div>`;
    audio.whoosh();
  },

  tapEgg(x, y) {
    const { view, fx } = game;
    const cx = view.w / 2;
    const cy = view.h * 0.46;
    if (Math.hypot(x - cx, y - cy) > 170 * view.u) return;
    this.taps += 1;
    this.shake = 1;
    audio.crack();
    haptic(this.taps >= 5 ? 'heavy' : 'medium');
    fx.sparkles(x, y, 3, 18);
    const hint = $('hatch-hint');
    if (this.taps === 2) hint.textContent = 'Something moved!';
    if (this.taps === 4) hint.textContent = 'Almost there!';
    if (this.taps >= 6) this.burst();
  },

  burst() {
    const { view, fx, assets } = game;
    this.phase = 'meet';
    this.t = 0;
    const cx = view.w / 2;
    const cy = view.h * 0.46;
    audio.poof();
    audio.fanfare();
    haptic('success');
    fx.flash(cx, cy, 760 * view.u, 0.8);
    fx.ring(cx, cy, 620 * view.u);
    fx.confetti(cx, cy - 40, 70, 120 * view.u);
    fx.stars(cx, cy, 14);
    fx.heartBurst(cx, cy, 12);
    $('hatch-hint').textContent = '';
    this.topShell = { x: cx, y: cy, vx: rand(90, 170) * (Math.random() < 0.5 ? -1 : 1), vy: -640, r: 0, vr: rand(-6, 6), alpha: 1 };
    assets.get(`egg.${this.selected.id}.top`);
    this.bottomShell = { x: cx, y: cy, alpha: 1 };
    const pet = this.pet;
    const a = this.actor;
    pet.alpha = 1;
    a.x = cx;
    const room = view.h - 232 - view.safeBottom;
    a.y = Math.min(view.h * 0.66, room);
    a.scale = Math.min(1.32 * view.u, room / 215);
    pet.setFace('sleep');
    pet.settle();
    pet.squash(0.28);
    a.play(this.meetScene());
  },

  *meetScene() {
    const pet = this.pet;
    const a = this.actor;
    yield 0.65;
    pet.setFace('sleepy');
    pet.r.open.target = 0.42;
    audio.chirp(audio.v, 0.22, { contour: [[0, 0.8], [1, 1.1]], vol: 0.14 });
    yield 0.65;
    pet.setFace('surprised');
    pet.r.yaw.target = -0.3;
    pet.lookFree = [-0.8, 0.1];
    yield 0.5;
    pet.r.yaw.target = 0.3;
    pet.lookFree = [0.8, 0.1];
    yield 0.5;
    pet.r.yaw.target = 0;
    pet.lookFree = [0, 0];
    pet.lookIn = 99;
    pet.setFace('starry');
    audio.hello();
    pet.wag(1.1, 15);
    yield* a.hop(70, 0.42, { sound: false });
    game.fx.heartBurst(pet.anchors.center[0], pet.anchors.center[1] - 20, 14);
    pet.setFace('happy');
    yield* a.hop(38, 0.32, { sound: false });
    a.relax('smile');
    pet.lookIn = 1;
    this.askName();
  },

  askName() {
    const b = BREEDS[this.spec.breed];
    const coat = b.coats.find((c) => c.id === this.spec.coat);
    const picks = [...NAMES].sort(() => Math.random() - 0.5).slice(0, 4);
    document.getElementById('layer').innerHTML = `
      <div id="hatch-top" style="top:calc(var(--safe-t) + 22px)">
        <h1 style="font-size:27px">It's ${/^[aeiou]/i.test(coat.name) ? 'an' : 'a'} ${coat.name.toLowerCase()} ${b.name}!</h1>
        <p>Say hello. What will you call it?</p>
      </div>
      <div id="hatch">
        <input class="name-input" id="petName" maxlength="12" autocomplete="off" autocapitalize="words" enterkeyhint="done" placeholder="Name your pet" aria-label="Your pet's name">
        <div class="name-picks">${picks.map((n) => `<button class="name-pick" data-name="${esc(n)}">${esc(n)}</button>`).join('')}</div>
        <button class="btn" id="nameBtn">Welcome home</button>
      </div>`;
    const input = $('petName');
    for (const b2 of document.querySelectorAll('.name-pick')) {
      b2.addEventListener('click', () => {
        input.value = b2.dataset.name;
        audio.chirrup();
        this.actor.pet.squash(0.1);
      });
    }
    input.addEventListener('blur', () => window.scrollTo(0, 0));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
        this.finish();
      }
    });
    $('nameBtn').addEventListener('click', () => this.finish());
  },

  finish() {
    const input = $('petName');
    const name = input.value.trim() || pick(NAMES);
    input.blur();
    adoptPet({ ...this.spec, name });
    game.pet = this.pet;
    this.pet.outfit = game.state.pet.outfit;
    game.actor = this.actor;
    this.actor.stop();
    this.actor.scale = 1;
    game.state.tutorial.justHatched = true;
    save(true);
    audio.startMusic('day');
    fadeTo(home, { greet: true }).then(() => {
      setTimeout(() => game.ui.toast(`Stroke ${name} with your finger!`), 1500);
      setTimeout(() => game.ui.toast(`Try booping that little nose`), 5200);
    });
  },

  update(dt) {
    const { view, fx } = game;
    this.t += dt;
    fx.update(dt);
    if (this.actor) this.actor.update(dt);
    if (this.phase === 'pick' || this.phase === 'moving') {
      for (const e of this.eggs) {
        e.scale = clamp(e.scale + dt * 4.2 * (this.t > e.pop ? 1 : 0));
        e.vWob += -e.wob * 90 * dt;
        e.vWob *= Math.exp(-5 * dt);
        e.wob += e.vWob * dt;
        // Eggs wiggle by themselves, as if there's someone in there.
        if (Math.random() < dt * 0.22) e.vWob += rand(-2.6, 2.6);
      }
    }
    if (this.phase === 'moving' && this.t > 0.55) {
      this.phase = 'crack';
      this.taps = 0;
      $('hatch-hint').textContent = 'Tap the egg!';
    }
    if (this.phase === 'crack') {
      this.shake = Math.max(0, this.shake - dt * 3.4);
      if (Math.random() < dt * 0.9) this.shake = Math.max(this.shake, 0.35);
    }
    if (this.topShell) {
      const s = this.topShell;
      s.vy += 1500 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.r += s.vr * dt;
      s.alpha = clamp(s.alpha - dt * 0.7);
      this.bottomShell.alpha = clamp(this.bottomShell.alpha - dt * 1.3);
    }
    this.sparkleIn -= dt;
    if (this.sparkleIn <= 0) {
      this.sparkleIn = 0.32;
      fx.sparkles(rand(view.w), rand(view.h * 0.75), 1, 0);
    }
  },

  draw(g) {
    const { assets, view, fx } = game;
    const { w, h, u } = view;
    g.sprite(assets.get('hatch.bg'), 0, 0, { ax: 0, ay: 0, w, h });

    if (this.phase === 'pick' || this.phase === 'moving') {
      const moving = this.phase === 'moving' ? smooth(this.t / 0.55) : 0;
      for (const e of this.eggs) {
        const tex = assets.get(`egg.${e.id}`);
        const isSel = e === this.selected;
        const pulse = isSel ? 1.14 + Math.sin(game.time * 5) * 0.025 : 1;
        const pop = easeBack(e.scale);
        let x = e.x;
        let y = e.y;
        let scale = (this.eggW / tex.w) * pop * pulse;
        let alpha = this.selected && !isSel ? 0.62 : 1;
        if (moving) {
          if (isSel) {
            x = lerp(e.x, w / 2, moving);
            y = lerp(e.y, h * 0.46, moving);
            scale = lerp(scale, (230 * u) / tex.w, moving);
          } else {
            alpha *= 1 - moving;
          }
        }
        g.sprite(assets.get('fx.shadow'), x, y + tex.h * scale * 0.47, { w: tex.w * scale * 1.05, h: 26 * scale, alpha: 0.8 * alpha });
        g.sprite(tex, x, y + (tex.h * scale) / 2, { w: tex.w * scale, h: tex.h * scale, ay: 1, rot: e.wob * 0.12, alpha });
        if (isSel && !moving) g.sprite(assets.get('fx.glow'), x, y, { w: tex.w * scale * 1.9, h: tex.w * scale * 1.9, tint: [1, 0.86, 0.6], alpha: 0.35, add: 1 });
      }
    }

    if (this.phase === 'crack') {
      const tex = assets.get(`egg.${this.selected.id}`);
      const scale = (230 * u) / tex.w;
      const sway = Math.sin(game.time * 34) * this.shake * 0.11;
      const cy = h * 0.46;
      const bottom = cy + (tex.h * scale) / 2;
      g.sprite(assets.get('fx.shadow'), w / 2, bottom - 2, { w: tex.w * scale * 1.06, h: 34 * scale, alpha: 0.85 });
      const glow = clamp(this.taps / 6);
      g.sprite(assets.get('fx.glow'), w / 2, cy, { w: 460 * u, h: 460 * u, tint: [1, 0.86, 0.55], alpha: 0.22 + glow * 0.5 + Math.sin(game.time * 6) * 0.05, add: 1 });
      g.sprite(tex, w / 2, bottom, { w: tex.w * scale, h: tex.h * scale, ay: 1, rot: sway });
      const stage = this.taps >= 5 ? 3 : this.taps >= 3 ? 2 : this.taps >= 1 ? 1 : 0;
      if (stage) g.sprite(assets.get(`egg.crack${stage}`), w / 2, bottom, { w: tex.w * scale, h: tex.h * scale, ay: 1, rot: sway });
    }

    if (this.phase === 'meet') {
      const a = this.actor;
      const pet = this.pet;
      const s = a.scale;
      const st = pet.stage.scale * s;
      g.sprite(assets.get('fx.shadow'), a.x, a.y + 4 * u, { w: 236 * st, h: 50 * st, alpha: 0.8 });
      if (this.bottomShell.alpha > 0.01) {
        const tex = assets.get(`egg.${this.selected.id}.bottom`);
        const scale = (230 * u) / tex.w;
        g.sprite(tex, w / 2, h * 0.46, { w: tex.w * scale, h: tex.h * scale, alpha: this.bottomShell.alpha });
      }
      pet.draw(g, a.x, a.y, s);
      if (this.topShell.alpha > 0.01) {
        const tex = assets.get(`egg.${this.selected.id}.top`);
        const scale = (230 * u) / tex.w;
        g.sprite(tex, this.topShell.x, this.topShell.y, { w: tex.w * scale, h: tex.h * scale, rot: this.topShell.r, alpha: this.topShell.alpha });
      }
    }
    fx.draw(g);
  },
};

const easeBack = (t) => {
  t = clamp(t);
  const c = 1.9;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

function bakeBackground() {
  const { w, h } = game.view;
  const c = document.createElement('canvas');
  c.width = Math.round(w);
  c.height = Math.round(h);
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#fff0dd');
  g.addColorStop(0.55, '#ffe0e4');
  g.addColorStop(1, '#e2dcff');
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  // Big soft blobs of light.
  for (let i = 0; i < 12; i++) {
    const px = (i * 137.5) % w;
    const py = (i * 89.7) % h;
    const r = 60 + (i % 5) * 34;
    const rg = x.createRadialGradient(px, py, 2, px, py, r);
    const col = ['255,255,255', '255,214,190', '214,226,255'][i % 3];
    rg.addColorStop(0, `rgba(${col},0.55)`);
    rg.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = rg;
    x.beginPath();
    x.arc(px, py, r, 0, TAU);
    x.fill();
  }
  return { canvas: c, w, h };
}
