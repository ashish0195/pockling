// A walk in the park. Hold your finger down and the pet trots after it on a little lead, finding berries,
// sniffing flowers, jumping in mud and saying hello to other Pocklings.
import { Actor } from '../actor.js';
import { audio } from '../audio.js';
import { drawPark, definePark, strip } from '../bake/park.js';
import { drawSky } from '../bake/room.js';
import { BREEDS, BREED_IDS } from '../catalog.js';
import { ambient, celebrate, fadeTo, game, petLight, quality, refreshLight, save } from '../game.js';
import { Pet } from '../pet.js';
import { haptic } from '../platform.js';
import { walked } from '../state.js';
import { clamp, lerp, pick, rand, seeded, TAU } from '../util.js';
import { home } from './home.js';

const METRE = 11;
const WALK_SCALE = 0.72;

export const walk = {
  enter() {
    const { assets, view, actor, pet } = game;
    definePark(assets, quality());
    this.scroll = 0;
    this.dist = 0;
    this.far = 0;
    this.berries = 0;
    this.muddy = false;
    this.touch = null;
    this.speed = 0;
    this.objects = [];
    this.nextChunk = 0;
    this.sniffing = 0;
    this.rope = [];
    for (let i = 0; i < 12; i++) this.rope.push({ x: 0, y: 0, px: 0, py: 0 });
    this.flies = [];
    this.clouds = [0, 1, 2, 0].map((i) => ({ i, x: rand(view.w * 1.4), y: rand(0.08, 0.3), s: rand(0.6, 1.1), v: rand(4, 11) }));
    this.friendTimer = rand(10, 18);
    this.friend = null;
    this.fireflies = [];
    actor.stop();
    actor.relax('smile');
    actor.scale = WALK_SCALE;
    actor.air = 0;
    pet.settle();
    pet.dirt = game.state.pet.bathDirt ? 1 : 0;
    this.place();
    pet.wag(0.7, 10);
    this.spawnAhead();
    this.layer();
    audio.startMusic('day');
    actor.play(actor.hop(46, 0.36));
    this.ended = false;
    // A friend for the walk, baked now so it doesn't hitch later.
    const others = BREED_IDS.filter((b) => b !== game.state.pet.breed);
    const fb = pick(others);
    this.friendPet = new Pet(assets, { breed: fb, coat: pick(BREEDS[fb].coats).id, seed: 7, stage: 'kid', outfit: {} }, { prefix: 'friend', bakeScale: 2 });
    this.friendActor = new Actor(this.friendPet, game.fx);
    this.friendPet.settle();
  },

  exit() {
    game.pet.dirt = 0;
    game.actor.scale = 1;
  },

  resize() {
    definePark(game.assets, quality());
    this.place();
  },

  place() {
    const { view, actor } = game;
    this.groundY = view.h - 300 * view.u * 0.92;
    this.pathY = this.groundY + 128 * view.u;
    actor.y = this.pathY;
    actor.x = view.w * 0.42;
  },

  layer() {
    document.getElementById('layer').innerHTML = `
      <div class="gamebar">
        <span class="score" id="walkBerries">🍓 0</span>
        <span class="score" id="walkDist" style="color:var(--ink)">🐾 0 m</span>
        <span class="spacer"></span>
        <button class="chip tap" data-action="walkHome" style="padding:5px 14px;white-space:nowrap">🏠 Home</button>
      </div>
      <div class="hint" id="walkHint">Hold your finger ahead of ${esc(game.state.pet.name)} to go for a walk</div>`;
    game.ui.actions.walkHome = () => this.finish();
  },

  // ── The world ahead ──

  spawnAhead() {
    const { u, w } = game.view;
    const ahead = this.scroll + w * 1.6;
    const step = 170 * u;
    while (this.nextChunk * step < ahead) {
      const r = seeded(this.nextChunk * 7919 + 31);
      const x = this.nextChunk * step + r.range(0, step * 0.6);
      const roll = r();
      if (this.nextChunk > 1) {
        if (roll < 0.34) this.objects.push({ kind: 'berry', x, y: r.range(-34, 34) * u, bob: r() * TAU });
        else if (roll < 0.58) this.objects.push({ kind: 'flower', x, y: -56 * u, i: Math.floor(r() * 4), s: r.range(0.9, 1.2), sniffed: false });
        else if (roll < 0.7) this.objects.push({ kind: 'mud', x, y: r.range(-8, 18) * u, hit: false });
        else if (roll < 0.88) {
          this.objects.push({ kind: 'berry', x, y: r.range(-30, 30) * u, bob: r() * TAU });
          this.objects.push({ kind: 'berry', x: x + 44 * u, y: r.range(-30, 30) * u, bob: r() * TAU });
        } else {
          this.objects.push({ kind: 'fly', x, y: -130 * u, t: r() * 10, hx: x });
        }
      }
      this.nextChunk += 1;
    }
    this.objects = this.objects.filter((o) => o.x > this.scroll - w);
  },

  // ── Touch: the lead ──

  down(x, y, id) {
    audio.unlock();
    if (this.touch || this.ended) return;
    this.touch = { id, x, y };
    this.hideHint();
    const r = this.rope;
    const c = game.pet.anchors.center;
    if (c) {
      r.forEach((n, i) => {
        const t = i / (r.length - 1);
        n.x = lerp(c[0], x, t);
        n.y = lerp(c[1] + 40, y, t);
        n.px = n.x;
        n.py = n.y;
      });
    }
    audio.click();
    // Tap a butterfly: try to catch it.
    for (const o of this.objects) {
      if (o.kind === 'fly' && Math.hypot(o.sx - x, o.sy - y) < 56 * game.view.u) {
        game.actor.play(this.chaseFly(o));
        break;
      }
    }
    const f = this.friend;
    if (f && Math.hypot(x - f.screenX, y - (this.pathY - 60)) < 80 * game.view.u) {
      audio.chirrup();
    }
  },

  move(x, y, id) {
    if (this.touch?.id === id) {
      this.touch.x = x;
      this.touch.y = y;
    }
  },

  up(x, y, id) {
    if (this.touch?.id === id) this.touch = null;
  },

  hideHint() {
    const h = document.getElementById('walkHint');
    if (h) h.style.opacity = 0;
  },

  *chaseFly(o) {
    const { actor, pet } = game;
    pet.setFace('starry');
    audio.chirrup();
    pet.lookAt([o.sx, o.sy]);
    pet.paws(-8, -56, 8, -56);
    yield* actor.hop(92, 0.5);
    pet.setFace('surprised');
    game.fx.sparkles(actor.x, actor.y - 180 * game.view.u, 6, 30);
    o.vx = 150;
    yield 0.2;
    pet.setFace('cheeky');
    pet.paws();
    pet.lookAt(null);
    yield 0.4;
    actor.relax('smile');
    pet.wag(0.7, 10);
  },

  *sniff() {
    const { actor, pet } = game;
    this.sniffing = 1;
    pet.setFace('sniff');
    pet.r.pitch.target = -0.1;
    pet.r.yaw.target = 0.4;
    audio.sniff();
    pet.r.noseS.kick(6);
    yield 0.34;
    pet.r.noseS.kick(6);
    yield 0.34;
    pet.setFace('bliss');
    pet.r.noseS.kick(5);
    yield 0.25;
    const a = pet.anchors.nose;
    if (a) game.fx.hearts(a[0], a[1] - 16, 2, 16);
    game.fx.sparkles(actor.x + 40, actor.y - 120, 4, 30);
    audio.chirrup();
    if (Math.random() < 0.3) yield* actor.sneeze();
    else {
      yield 0.4;
    }
    this.sniffing = 0;
    actor.relax('smile');
    pet.wag(0.7, 10);
  },

  *splash() {
    const { actor, pet, fx } = game;
    pet.setFace('joy');
    audio.splash();
    haptic('medium');
    pet.squash(0.2);
    const col = [0.5, 0.37, 0.25];
    for (let i = 0; i < 22; i++) {
      const a = rand(Math.PI, TAU);
      const s = rand(120, 300);
      fx.add({ tex: 'fx.dot', x: actor.x, y: actor.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, ay: 780, life: rand(0.5, 0.9), size: rand(6, 15), tint: col });
    }
    this.muddy = true;
    game.state.pet.bathDirt = 1;
    pet.dirt = 1;
    audio.giggle();
    yield 0.5;
    actor.relax('smile');
    pet.wag(0.8, 11);
  },

  *meet() {
    const { actor, pet, fx } = game;
    const f = this.friend;
    this.speed = 0;
    pet.setFace('starry');
    pet.r.yaw.target = 0.34;
    pet.wag(1.2, 16);
    audio.hello();
    f.pet.setFace('happy');
    f.pet.r.yaw.target = -0.4;
    f.pet.wag(1.2, 16);
    yield* actor.hop(54, 0.38, { sound: false });
    const c = pet.anchors.center;
    if (c) fx.hearts(c[0] + 50, c[1] - 40, 4, 44);
    audio.happy();
    yield 0.8;
    actor.relax('smile');
    pet.wag(0.7, 10);
    f.leaving = true;
    f.pet.walking = 1;
    f.pet.setFace('smile');
    game.state.pet.love = Math.min(100, game.state.pet.love + 4);
  },

  // ── Every frame ──

  update(dt) {
    const { actor, pet, fx, view } = game;
    const { u, w } = view;
    actor.update(dt);
    fx.update(dt);
    refreshLight();

    let desire = 0;
    if (this.touch && !actor.busy) {
      desire = clamp((this.touch.x - actor.x) / (w * 0.3), -0.45, 1);
    }
    const target = desire * 245 * u;
    this.speed += (target - this.speed) * Math.min(1, dt * 5);
    if (actor.busy && !this.touch) this.speed *= Math.exp(-dt * 8);

    const moving = Math.abs(this.speed) > 6;
    this.scroll = Math.max(0, this.scroll + this.speed * dt);
    if (this.speed > 0) this.dist += this.speed * dt;
    this.far = Math.max(this.far, this.scroll);
    if (!actor.busy) {
      pet.walking = moving ? clamp(Math.abs(this.speed) / (150 * u)) : 0;
      pet.r.yaw.target = moving ? Math.sign(this.speed) * 0.6 : 0;
      pet.r.lean.target = clamp(this.speed / (2600 * u), -0.07, 0.07);
      if (moving) {
        this.stepPhase = (this.stepPhase ?? 0) + (Math.abs(this.speed) / (11 * u)) * dt;
        actor.air = Math.abs(Math.sin(this.stepPhase)) * 8 * u;
        const ph = Math.cos(this.stepPhase * 2);
        pet.r.sy.target = 1 + ph * 0.03;
        pet.r.sx.target = 1 - ph * 0.025;
        pet.r.footL.target = Math.max(0, Math.sin(this.stepPhase)) * 1;
        pet.r.footR.target = Math.max(0, -Math.sin(this.stepPhase)) * 1;
        if (this.touch) pet.lookAt([this.touch.x, this.touch.y]);
      } else {
        actor.air = 0;
        pet.r.sy.target = 1;
        pet.r.sx.target = 1;
        if (!this.touch) pet.lookAt(null);
      }
    }

    // Things on the path.
    this.spawnAhead();
    const px = this.scroll + actor.x;
    for (let i = this.objects.length - 1; i >= 0; i--) {
      const o = this.objects[i];
      if (o.kind === 'berry' && Math.abs(o.x - px) < 34 * u && actor.air < 40 * u) {
        const sx = o.x - this.scroll;
        const sy = this.pathY + o.y - 16 * u;
        this.objects.splice(i, 1);
        this.berries += 1;
        audio.coin();
        haptic('soft');
        fx.sparkles(sx, sy, 4, 16);
        fx.add({ tex: 'prop.berry', x: sx, y: sy, vy: -150, life: 0.5, size: 30 * u, end: 10 * u });
        document.getElementById('walkBerries').textContent = `🍓 ${this.berries}`;
      } else if (o.kind === 'mud' && !o.hit && Math.abs(o.x - px) < 34 * u) {
        o.hit = true;
        if (!actor.busy) actor.play(this.splash());
      } else if (o.kind === 'flower' && !o.sniffed && Math.abs(o.x - px) < 58 * u) {
        o.sniffed = true;
        if (!actor.busy && Math.random() < 0.55) actor.play(this.sniff());
      } else if (o.kind === 'fly') {
        o.t += dt;
        o.hx += (o.vx ?? 0) * dt;
        o.sx = o.hx - this.scroll + Math.sin(o.t * 1.3) * 34 * u;
        o.sy = this.pathY + o.y + Math.sin(o.t * 2.3) * 26 * u;
      }
    }

    // A friend comes along now and then.
    this.friendTimer -= dt;
    if (this.friendTimer <= 0 && !this.friend && this.dist > 200 * u) {
      this.friendTimer = rand(22, 40);
      this.friend = { pet: this.friendPet, actor: this.friendActor, x: this.scroll + w + 120 * u, met: false, screenX: w + 120 * u, leaving: false };
      this.friendPet.walking = 1;
      this.friendPet.r.yaw.target = -0.6;
      this.friendPet.setFace('smile');
    }
    if (this.friend) {
      const f = this.friend;
      f.pet.update(dt);
      if (!f.met) {
        f.x -= 66 * u * dt;
        f.screenX = f.x - this.scroll;
        f.pet.walkPhase += dt * 5;
        if (f.screenX < actor.x + 186 * u) {
          f.met = true;
          f.pet.walking = 0;
          if (actor.busy) actor.stop();
          actor.play(this.meet());
        }
      } else if (f.leaving) {
        f.x -= 90 * u * dt;
        f.pet.r.yaw.target = -0.6;
        f.screenX = f.x - this.scroll;
        if (f.screenX < -160 * u) this.friend = null;
      } else {
        f.screenX = f.x - this.scroll;
      }
    }

    for (const c of this.clouds) {
      c.x += c.v * dt - this.speed * dt * 0.05;
      if (c.x > w + 200) c.x = -200;
      if (c.x < -220) c.x = w + 180;
    }
    this.updateRope(dt);

    const metres = Math.floor(this.dist / (METRE * u));
    const el = document.getElementById('walkDist');
    if (el && el.textContent !== `🐾 ${metres} m`) el.textContent = `🐾 ${metres} m`;

    if (game.light.night > 0.35) {
      this.flyIn = (this.flyIn ?? 0) - dt;
      if (this.flyIn <= 0 && this.fireflies.length < 14) {
        this.flyIn = 0.5;
        this.fireflies.push({ x: rand(w), y: rand(this.groundY - 70 * u, this.groundY + 90 * u), t: 0, life: rand(3, 6), ph: rand(TAU) });
      }
      for (let i = this.fireflies.length - 1; i >= 0; i--) {
        const f = this.fireflies[i];
        f.t += dt;
        f.x += Math.sin(f.t * 1.2 + f.ph) * 22 * dt - this.speed * dt * 0.6;
        f.y += Math.cos(f.t * 1.7 + f.ph) * 15 * dt;
        if (f.t > f.life) this.fireflies.splice(i, 1);
      }
    }
  },

  updateRope(dt) {
    const r = this.rope;
    const { pet, view } = game;
    const c = pet.anchors.center;
    if (!c || !this.touch) return;
    const start = [c[0], c[1] + 42 * (pet.anchors.unit ?? 1)];
    const end = [this.touch.x, this.touch.y];
    const seg = (Math.hypot(end[0] - start[0], end[1] - start[1]) / (r.length - 1)) * 1.06;
    const g = 900 * view.u;
    for (const n of r) {
      const vx = (n.x - n.px) * 0.97;
      const vy = (n.y - n.py) * 0.97;
      n.px = n.x;
      n.py = n.y;
      n.x += vx;
      n.y += vy + g * dt * dt;
    }
    for (let k = 0; k < 6; k++) {
      r[0].x = start[0];
      r[0].y = start[1];
      r[r.length - 1].x = end[0];
      r[r.length - 1].y = end[1];
      for (let i = 0; i < r.length - 1; i++) {
        const a = r[i];
        const b = r[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const diff = (d - seg) / d / 2;
        a.x += dx * diff;
        a.y += dy * diff;
        b.x -= dx * diff;
        b.y -= dy * diff;
      }
    }
  },

  finish() {
    if (this.ended) return;
    this.ended = true;
    const { u } = game.view;
    const metres = Math.floor(this.dist / (METRE * u));
    const result = walked(game.state, metres, this.berries, this.muddy, game.now());
    save();
    const s = game.state;
    const name = esc(s.pet.name);
    game.ui.sheet(`${game.ui.head('What a walk!')}
      <div class="stats">
        <div class="stat"><b>${metres}</b><span>metres</span></div>
        <div class="stat"><b>${this.berries}</b><span>berries found</span></div>
        <div class="stat"><b>${s.totals.walked}</b><span>walks so far</span></div>
      </div>
      <p>${this.muddy ? `${name} is covered in mud and has never been happier. Bath time?` : metres > 60 ? `${name} is tired out in the best way.` : `${name} would have happily gone further.`}</p>
      <div style="height:8px"></div>
      <button class="btn" id="walkDone">Back home</button>`);
    document.getElementById('walkDone').addEventListener('click', () => {
      game.ui.hideSheet();
      fadeTo(home);
      setTimeout(() => celebrate(result), 600);
    });
  },

  // ── Drawing ──

  draw(g) {
    const { assets, actor, pet, view, fx } = game;
    const { w, h, u } = view;
    const light = game.light;
    const amb = ambient(0);
    const scroll = this.scroll;

    // Sky.
    drawSky(g, assets, light, 0, 0, w, this.groundY + 20);
    if (light.night > 0.02) {
      const stars = assets.get('sky.stars');
      g.sprite(stars, 0, 0, { ax: 0, ay: 0, w, h: this.groundY, u0: 0, u1: w / 512, v0: 0, v1: this.groundY / 512, alpha: light.night });
    }
    if (light.sun !== null) {
      const a = clamp(light.sun);
      g.sprite(assets.get('sky.sun'), lerp(w * 0.12, w * 0.88, a), lerp(this.groundY * 0.6, this.groundY * 0.12, Math.sin(a * Math.PI)), { w: 200 * u, h: 200 * u, alpha: clamp(light.mix.day + light.mix.dawn + light.mix.dusk) });
    }
    if (light.moon !== null) {
      const a = clamp(light.moon);
      g.sprite(assets.get('sky.moon'), lerp(w * 0.12, w * 0.88, a), lerp(this.groundY * 0.6, this.groundY * 0.14, Math.sin(a * Math.PI)), { w: 150 * u, h: 150 * u, alpha: clamp(light.night) });
    }
    for (const c of this.clouds) {
      const t = assets.get(`sky.cloud${c.i}`);
      g.sprite(t, c.x, this.groundY * c.y, { w: t.w * c.s * u, h: t.h * c.s * u, tint: [amb[0], amb[1], amb[2], 1 - light.night * 0.6] });
    }

    drawPark(g, assets, view, scroll, amb);

    // Things on the path, furthest back first.
    const sorted = [...this.objects].sort((a, b) => a.y - b.y);
    for (const o of sorted) {
      if (o.kind === 'fly') continue;
      const sx = o.x - scroll;
      if (sx < -120 * u || sx > w + 120 * u) continue;
      const sy = this.pathY + o.y;
      if (o.kind === 'flower') {
        const t = assets.get(`park.flower${o.i}`);
        g.sprite(t, sx, sy + 8 * u, { ay: 1, w: t.w * u * o.s, h: t.h * u * o.s, tint: amb, rot: Math.sin(game.time * 1.4 + o.x) * 0.03 });
      } else if (o.kind === 'mud') {
        const t = assets.get('fx.mud');
        g.sprite(t, sx, sy + 12 * u, { w: 130 * u, h: 52 * u, tint: amb });
      } else if (o.kind === 'berry') {
        const t = assets.get('prop.berry');
        const bob = Math.sin(game.time * 3 + o.bob) * 4 * u;
        g.sprite(assets.get('fx.shadow'), sx, sy + 12 * u, { w: 40 * u, h: 12 * u, alpha: 0.5 });
        g.sprite(t, sx, sy - 6 * u + bob, { w: 36 * u, h: 36 * u, tint: amb });
      }
    }

    // The friend, then the pet.
    const f = this.friend;
    if (f) {
      const st = f.pet.stage.scale * u * WALK_SCALE * 0.9;
      g.sprite(assets.get('fx.shadow'), f.screenX, this.pathY + 4 * u, { w: 236 * st, h: 50 * st, alpha: 0.7 });
      f.pet.draw(g, f.screenX, this.pathY, u * WALK_SCALE * 0.9, petLight(amb));
    }
    const st = pet.stage.scale * WALK_SCALE * u;
    g.sprite(assets.get('fx.shadow'), actor.x, actor.y + 4 * u, { w: 236 * st * (1 - actor.air / (800 * u)), h: 50 * st, alpha: clamp(1 - actor.air / (260 * u)) * 0.8 });
    pet.draw(g, actor.x, actor.y, u * WALK_SCALE, petLight(amb));

    // The lead.
    if (this.touch) {
      const pts = [];
      for (const n of this.rope) pts.push(n.x, n.y, 2.5 * u);
      g.ribbon(g.white, pts, { tint: [1, 0.44, 0.59] });
      g.sprite(assets.get('fx.dot'), this.touch.x, this.touch.y, { w: 16 * u, h: 16 * u, tint: [1, 0.44, 0.59] });
    }

    // Butterflies in front.
    for (const o of this.objects) {
      if (o.kind !== 'fly' || o.sx === undefined) continue;
      if (o.sx < -80 || o.sx > w + 80) continue;
      const t = assets.get('prop.butterfly');
      const flap = 0.45 + Math.abs(Math.sin(game.time * 14 + o.t)) * 0.55;
      g.sprite(t, o.sx, o.sy, { w: t.w * u * flap, h: t.h * u, tint: amb, rot: Math.sin(o.t * 2) * 0.2 });
    }

    // Close grass.
    strip(g, assets.get('park.fore'), scroll * 1.5, h - 92 * u, 92 * u, amb);

    for (const fl of this.fireflies) {
      const a = Math.sin((fl.t / fl.life) * Math.PI) * (0.6 + 0.4 * Math.sin(fl.t * 6 + fl.ph));
      g.sprite(assets.get('fx.glow'), fl.x, fl.y, { w: 28 * u, h: 28 * u, tint: [1, 0.92, 0.5], alpha: a, add: 1 });
    }
    fx.draw(g);
  },
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
