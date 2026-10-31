// Home: the room, the pet, and everything you do with your hands. Stroke, boop, tickle, stretch, pick
// up, cuddle, feed. This is where most of the time is spent, so it gets most of the love.
import { idleScene } from '../actor.js';
import { audio } from '../audio.js';
import { drawSky, roomLayout } from '../bake/room.js';
import { FOODS, STAGES } from '../catalog.js';
import { ambient, petLight, bakeScale, celebrate, checkDaily, defineRoomArt, game, refreshLight, save, setPetStage } from '../game.js';
import { GROUND } from '../pet.js';
import { haptic, purr as hapticPurr, setKeepAwake } from '../platform.js';
import { cuddle, feed, goToSleep, levelOf, mood, stageOf, tasteOf, talked, wakeUp } from '../state.js';
import { talkMode } from '../talk.js';
import { clamp, lerp, pick, rand, smooth, Spring, TAU } from '../util.js';

const THOUGHTS = { hungry: '🍎', sleepy: '🌙', dirty: '🫧', lonely: '💗', bored: '🎾' };

export const home = {
  talkable: true,

  enter({ greet = false } = {}) {
    const { actor, pet } = game;
    defineRoomArt();
    this.layout = roomLayout(game.view);
    actor.scale = 1;
    actor.x = game.view.w / 2;
    actor.y = game.view.floorY;
    actor.air = 0;
    actor.relax();
    actor.stop();
    pet.settle();
    pet.alpha = 1;
    pet.asleep = false;
    this.dim = new Spring(0, 30, 9);
    this.zoom = new Spring(1, 60, 11);
    this.lift = new Spring(0, 42, 11);
    this.pan = new Spring(0, 42, 11);
    this.focus = [game.view.w / 2, game.view.h * 0.6];
    this.touch = null;
    this.drag = null;
    this.falling = null;
    this.fallers = [];
    this.thrown = null;
    this.thought = null;
    this.glass = [];
    this.idleIn = rand(2, 4);
    this.tickles = 0;
    this.tickleAt = 0;
    this.rubGain = 0;
    this.cuddling = false;
    this.clouds = [0, 1, 2, 1].map((i, n) => ({ i, x: rand(game.view.w), y: rand(10, 90) + n * 16, v: rand(3, 9), s: rand(0.42, 0.72) }));
    this.motes = [];
    this.talk = false;
    this.bedY = this.layout.bed.y;
    game.ui.show('home');
    if (game.state.pet.asleep) {
      this.layInBed();
    } else if (greet) {
      actor.play(actor.greet());
    }
    game.ui.refresh();
    if (!game.state.pet.asleep) audio.startMusic('day');
    else audio.startMusic('night');
  },

  exit() {
    hapticPurr(false);
    audio.purr(false);
    setKeepAwake(false);
    game.ui.hideSheet();
    talkMode.stop();
  },

  /** With the closet open, the camera moves so the pet shows above it, or beside it on a wide screen. */
  liftFor(wrap) {
    const { actor, pet, view } = game;
    const sheet = wrap?.querySelector('.sheet');
    this.lift.target = 0;
    this.pan.target = 0;
    if (!sheet) return;
    const box = sheet.getBoundingClientRect();
    const outer = wrap.getBoundingClientRect();
    if (box.width < outer.width * 0.8) {
      this.pan.target = Math.max(0, actor.x - (outer.width - box.width) / 2);
      return;
    }
    const top = outer.bottom - box.height;
    // On a small screen the sheet wins over the feet, not the face.
    const headroom = actor.y - 250 * view.u * pet.stage.scale - 60;
    this.lift.target = clamp(actor.y + 14 * view.u - top, 0, Math.max(0, headroom));
  },

  resize() {
    defineRoomArt();
    this.layout = roomLayout(game.view);
    game.actor.y = game.state.pet.asleep ? this.bedY : game.view.floorY;
    if (game.state.pet.asleep) game.actor.x = this.layout.bed.x;
    else game.actor.x = clamp(game.actor.x, game.view.w * 0.2, game.view.w * 0.8);
  },

  // ── Every frame ──

  update(dt) {
    const { actor, pet, view } = game;
    const state = game.state;
    actor.update(dt);
    talkMode.update(dt);
    const p = game.state.pet;
    const grime = p.bathDirt ? 1 : clamp((32 - p.clean) / 32) * 0.8;
    game.pet.dirt += (grime - game.pet.dirt) * Math.min(1, dt * 2);
    game.fx.update(dt);
    this.dim.step(dt);
    this.zoom.step(dt);
    this.lift.step(dt);
    this.pan.step(dt);

    for (const c of this.clouds) {
      c.x += c.v * dt;
      if (c.x > view.w + 120) c.x = -120;
    }
    this.spawnMotes(dt);

    if (this.falling) this.updateFall(dt);
    if (this.carrying) this.updateCarry(dt);
    this.updateTouch(dt);
    this.updateDrag(dt);
    this.updateThrown(dt);
    this.updateFallers(dt);

    for (let i = this.glass.length - 1; i >= 0; i--) {
      const m = this.glass[i];
      m.age += dt;
      if (m.age > m.life) this.glass.splice(i, 1);
    }

    if (this.thought) {
      this.thought.t -= dt;
      if (this.thought.t <= 0) this.thought = null;
    }

    // Zzz while asleep, and it wakes itself when rested.
    if (state.pet.asleep) {
      this.zzzIn = (this.zzzIn ?? 1) - dt;
      if (this.zzzIn <= 0) {
        this.zzzIn = 1.5;
        const a = pet.anchors.top;
        if (a) game.fx.zzz(a[0] + 26, a[1] + 4);
        if (Math.random() < 0.3) audio.snore();
      }
    }

    // Boredom: do something, or ask for something.
    if (!actor.busy && !this.touch && !this.drag && !this.carrying && !this.falling && !state.pet.asleep && !this.talk) {
      this.idleIn -= dt;
      if (this.idleIn <= 0) this.idle();
    }
  },

  idle() {
    const { actor } = game;
    const state = game.state;
    const m = mood(state.pet);
    this.idleIn = rand(3.5, 8);
    if (THOUGHTS[m] && Math.random() < 0.55) {
      this.thought = { icon: THOUGHTS[m], t: 3.4 };
      actor.play(actor.ask(m));
      return;
    }
    if (m === 'joyful' && Math.random() < 0.14) {
      actor.play(this.pressGlass());
      return;
    }
    if (Math.random() < 0.3) {
      const { w, u } = game.view;
      const x = clamp(actor.x + rand(-140, 140) * u, Math.max(w * 0.2, 125 * u), Math.min(w * 0.8, w - 125 * u));
      actor.play(this.wander(x));
      return;
    }
    actor.play(idleScene(actor, m));
  },

  *wander(x) {
    const { actor } = game;
    game.pet.setFace('smile');
    yield* actor.walkTo(x, 90 * game.view.u);
    game.pet.setFace('neutral');
  },

  // ── Fun on the glass ──

  /** Comes right up to the screen and squishes its nose on the glass, fogging it up. */
  *pressGlass() {
    const { actor, pet, view } = game;
    const cx = game.stageX ?? view.w / 2;
    const startX = actor.x;
    const startY = actor.y;
    pet.setFace('starry');
    pet.wag(1.2, 15);
    audio.hello();
    yield 0.25;
    pet.setFace('cheeky');
    const big = clamp((view.w * 0.92) / (200 * view.u * pet.stage.scale), 1.6, 3.4);
    const targetY = view.h * 0.5 + GROUND * big * view.u * pet.stage.scale;
    let t = 0;
    while (t < 0.5) {
      t += actor.dt;
      const p = smooth(t / 0.5);
      actor.scale = lerp(1, big, p);
      actor.x = lerp(startX, cx, p);
      actor.y = lerp(startY, targetY, p);
      yield;
    }
    audio.boop();
    haptic('medium');
    pet.setFace('boop');
    pet.r.noseS.target = 1.9;
    pet.r.noseS.kick(8);
    pet.squash(0.12);
    pet.ears(-0.2);
    const n = pet.anchors.nose;
    if (n) {
      this.glass.push({ tex: 'fx.fog', x: n[0], y: n[1] + 14, w: 170 * view.u, h: 120 * view.u, age: 0, life: 2.4 });
      this.glass.push({ tex: 'fx.fog', x: n[0] - 30 * view.u, y: n[1] + 8, w: 120 * view.u, h: 90 * view.u, age: 0, life: 1.8 });
    }
    yield 0.32;
    pet.setFace('happy');
    pet.r.lookX.target = 0;
    yield 0.5;
    pet.r.noseS.target = 1;
    t = 0;
    while (t < 0.5) {
      t += actor.dt;
      const p = smooth(t / 0.5);
      actor.scale = lerp(big, 1, p);
      actor.x = lerp(cx, startX, p);
      actor.y = lerp(targetY, startY, p);
      yield;
    }
    actor.scale = 1;
    actor.x = startX;
    actor.y = startY;
    pet.squash(0.1);
    actor.relax('smile');
    yield 0.5;
    actor.relax();
  },

  /** A big wet lick right across the screen. */
  *lickGlass() {
    const { actor, pet, view } = game;
    const cx = game.stageX ?? view.w / 2;
    const startX = actor.x;
    const startY = actor.y;
    const big = clamp((view.w * 0.95) / (200 * view.u * pet.stage.scale), 1.6, 3.2);
    const targetY = view.h * 0.46 + GROUND * big * view.u * pet.stage.scale;
    pet.setFace('cheeky');
    let t = 0;
    while (t < 0.42) {
      t += actor.dt;
      const p = smooth(t / 0.42);
      actor.scale = lerp(1, big, p);
      actor.x = lerp(startX, cx, p);
      actor.y = lerp(startY, targetY, p);
      yield;
    }
    pet.setFace('lick');
    pet.tongueOut = 1;
    audio.chirp(audio.v * 1.1, 0.2, { contour: [[0, 1], [1, 1.2]], vol: 0.2 });
    t = 0;
    const m0 = pet.anchors.mouth;
    while (t < 0.5) {
      t += actor.dt;
      const p = smooth(t / 0.5);
      actor.y = targetY + lerp(40, -50, p) * view.u;
      pet.r.pitch.target = lerp(0.3, -0.3, p);
      yield;
    }
    audio.burst(0.16, { vol: 0.08, freq: 3200, q: 1 });
    haptic('soft');
    if (m0) this.glass.push({ tex: 'fx.lick', x: m0[0], y: m0[1] - 20 * view.u, w: 180 * view.u, h: 250 * view.u, age: 0, life: 3 });
    pet.tongueOut = 0;
    pet.setFace('happy');
    pet.r.pitch.target = 0;
    yield 0.45;
    t = 0;
    while (t < 0.45) {
      t += actor.dt;
      const p = smooth(t / 0.45);
      actor.scale = lerp(big, 1, p);
      actor.x = lerp(cx, startX, p);
      actor.y = lerp(targetY, startY, p);
      yield;
    }
    actor.scale = 1;
    actor.x = startX;
    actor.y = startY;
    actor.relax('smile');
    yield 0.4;
    actor.relax();
  },

  // ── Touch ──

  down(x, y, id) {
    const { pet, actor } = game;
    if (this.touch || this.drag) return;
    audio.unlock();
    const asleep = game.state.pet.asleep;
    const part = pet.hit(x, y);
    this.touch = { id, x0: x, y0: y, x, y, t: 0, moved: 0, part, mode: part ? 'press' : 'floor', rub: 0 };
    if (asleep) {
      if (part) {
        pet.jiggle(4);
        pet.r.earL.kick(8);
        audio.mumble();
        const a = pet.anchors.top;
        if (a) game.fx.hearts(a[0], a[1], 1, 16);
      }
      this.touch.mode = 'sleep';
      return;
    }
    pet.lookAt([x, y]);
    if (part && !this.bigMoment) {
      if (actor.busy) actor.stop();
      actor.relax(pet.face === 'neutral' ? 'smile' : pet.face);
      const l = pet.toLocal(x, y);
      pet.pressAt = l;
      pet.r.press.target = 0.75;
      audio.chirrup();
      haptic('soft');
      pet.squash(0.06);
    }
  },

  move(x, y, id) {
    if (this.drag && this.drag.id === id) {
      this.drag.x = x;
      this.drag.y = y;
      return;
    }
    const t = this.touch;
    if (!t || t.id !== id) return;
    const { pet } = game;
    const step = Math.hypot(x - t.x, y - t.y);
    t.moved += step;
    t.x = x;
    t.y = y;
    if (t.mode === 'sleep') return;
    pet.lookAt([x, y]);
    if (t.mode === 'floor' && !this.bigMoment) {
      const part = pet.hit(x, y);
      if (part) {
        t.part = part;
        t.mode = 'rub';
        game.actor.stop();
        pet.r.press.target = 0.75;
        pet.pressAt = pet.toLocal(x, y);
        this.startRub(t);
      }
    }
    if (t.part) {
      const l = pet.toLocal(x, y);
      const inside = Math.hypot(l[0], l[1]) < 128;
      if (t.mode === 'press' && t.moved > 9) {
        t.mode = 'rub';
        this.startRub(t);
      }
      if (t.mode === 'rub') {
        if (inside) {
          this.rub(t, l, step);
        } else {
          t.mode = 'stretch';
          this.stopRub();
          pet.setFace('surprised');
          audio.surprise();
          const a = pet.toLocal(t.x0, t.y0);
          pet.pullAt = [clamp(a[0], -80, 80), clamp(a[1], -80, 80)];
          pet.r.pull.target = 1;
          pet.r.press.target = 0;
        }
      }
      if (t.mode === 'stretch') {
        const c = pet.anchors.center;
        const u = pet.anchors.unit;
        const dx = (x - c[0]) / u;
        const dy = (y - c[1]) / u;
        const d = Math.hypot(dx, dy);
        const k = Math.min(1, 70 / Math.max(d, 1));
        pet.pullBy = [(dx - pet.pullAt[0]) * 0.72 * k, (dy - pet.pullAt[1]) * 0.72 * k];
        // Stretch far enough and it comes off the floor.
        if (d > 215 || (dy < -165 && d > 170)) this.pickUp(t);
        if (t.mode === 'stretch' && d < 110) {
          t.mode = 'rub';
          pet.r.pull.target = 0;
          this.startRub(t);
        }
      }
      if (t.mode === 'carry') {
        this.carryTo = [x, y];
      }
    }
  },

  up(x, y, id) {
    if (this.drag && this.drag.id === id) {
      this.releaseDrag();
      return;
    }
    const t = this.touch;
    if (!t || t.id !== id) return;
    this.touch = null;
    const { pet, actor } = game;
    pet.lookAt(null);
    pet.r.press.target = 0;
    pet.r.pull.target = 0;
    if (t.mode === 'sleep') return;
    if (t.mode === 'rub') {
      this.stopRub();
      actor.relax('smile');
      if (this.rubGain > 14 && Math.random() < 0.4) actor.play(this.afterCuddle());
      this.rubGain = 0;
    } else if (t.mode === 'stretch') {
      pet.squash(-0.12);
      pet.jiggle(14);
      audio.boing();
      haptic('boing');
      actor.relax('joy');
      actor.play((function* () {
        yield 0.6;
        actor.relax('smile');
        yield 0.3;
        actor.relax();
      })());
    } else if (t.mode === 'carry') {
      this.drop();
    } else if (t.mode === 'cuddle') {
      this.endCuddle();
    } else if (t.mode === 'press') {
      if (t.t < 0.45) this.tap(t.part, x, y);
      else actor.relax('smile');
    } else if (t.mode === 'floor' && t.moved < 14 && t.t < 0.5 && !actor.busy) {
      this.tapFloor(x, y);
    }
    if (!actor.busy && t.mode !== 'carry') this.idleIn = Math.max(this.idleIn, 2.5);
  },

  tap(part, x, y) {
    const { actor, pet } = game;
    const state = game.state;
    const res = cuddle(state, 1.2, game.now());
    celebrate(res);
    pet.r.press.target = 0;
    if (part === 'nose') {
      actor.play(actor.boop());
    } else if (part === 'belly') {
      const now = game.time;
      this.tickles = now - this.tickleAt < 1.4 ? this.tickles + 1 : 1;
      this.tickleAt = now;
      if (this.tickles >= 5) {
        this.tickles = 0;
        actor.play(actor.rollOver());
      } else {
        actor.play(actor.giggle());
      }
    } else if (part === 'head') {
      actor.play(actor.pat());
      game.fx.hearts(x, y - 8, 1, 10);
    } else if (part === 'cheek') {
      actor.play(actor.flick());
    } else {
      actor.play(actor.pat());
    }
    game.ui.refresh();
  },

  tapFloor(x, y) {
    const { actor, pet } = game;
    const { view } = game;
    if (y < view.horizon) {
      pet.lookAt([x, y]);
      setTimeout(() => pet.lookTarget && !this.touch && pet.lookAt(null), 900);
      audio.chirrup();
      return;
    }
    const tx = clamp(x, view.w * 0.14, view.w * 0.86);
    actor.play(this.trot(tx));
  },

  *trot(x) {
    const { actor, pet } = game;
    pet.setFace('smile');
    pet.wag(0.8, 12);
    yield* actor.walkTo(x, 170 * game.view.u);
    actor.relax('smile');
    yield 0.3;
    actor.relax();
  },

  startRub(t) {
    const { pet } = game;
    pet.r.press.target = 0.55;
    pet.setFace(t.part === 'belly' ? 'joy' : 'purr');
    pet.ears(0.2);
    pet.wag(0.9, 9);
    audio.purr(true);
    hapticPurr(true);
    this.heartStep = 0;
  },

  stopRub() {
    audio.purr(false);
    hapticPurr(false);
    game.pet.ears(0);
    game.pet.r.lean.target = 0;
  },

  rub(t, local, step) {
    const { pet, fx } = game;
    pet.pressAt = local;
    pet.r.lean.target = clamp(local[0] / 900, -0.08, 0.08);
    pet.r.yaw.target = clamp(local[0] / 400, -0.2, 0.2);
    this.heartStep += step;
    const gain = step * 0.03;
    this.rubGain += gain;
    const res = cuddle(game.state, gain, game.now());
    if (res.levelUp || res.grew) celebrate(res);
    if (this.heartStep > 62) {
      this.heartStep = 0;
      fx.hearts(t.x, t.y - 10, 1, 14);
      fx.sparkles(t.x, t.y, 2, 14);
      game.ui.refresh();
    }
    // Stroked long enough, the eyes turn to hearts.
    if (this.rubGain > 24 && pet.face !== 'love') pet.setFace('love');
  },

  updateTouch(dt) {
    const t = this.touch;
    if (!t) return;
    t.t += dt;
    const { pet } = game;
    // Press and hold: a big cuddle.
    if (t.mode === 'press' && t.t > 0.48 && t.moved < 9) {
      t.mode = 'cuddle';
      this.startCuddle();
    }
    if (t.mode === 'cuddle') {
      this.cuddleTime = (this.cuddleTime ?? 0) + dt;
      this.heartIn = (this.heartIn ?? 0) - dt;
      if (this.heartIn <= 0) {
        this.heartIn = 0.34;
        const c = pet.anchors.center;
        if (c) game.fx.hearts(c[0], c[1] - 20, 2, 110 * game.view.u);
        const res = cuddle(game.state, 1.6, game.now());
        if (res.levelUp || res.grew) celebrate(res);
        game.ui.refresh();
      }
      pet.r.lean.target = Math.sin(game.time * 2.2) * 0.04;
      if (this.cuddleTime > 2.4 && pet.face !== 'love') pet.setFace('love');
    }
  },

  startCuddle() {
    const { pet } = game;
    this.cuddling = true;
    this.cuddleTime = 0;
    pet.r.press.target = 0;
    pet.setFace('bliss');
    pet.ears(0.28);
    pet.wag(0.8, 7);
    this.zoom.target = 1.42;
    const c = pet.anchors.center;
    if (c) this.focus = [c[0], c[1] + 10];
    audio.purr(true);
    hapticPurr(true);
    audio.chirp(audio.v, 0.3, { contour: [[0, 0.9], [1, 1.1]], vol: 0.2 });
  },

  endCuddle() {
    const { actor } = game;
    this.cuddling = false;
    this.zoom.target = 1;
    audio.purr(false);
    hapticPurr(false);
    actor.relax('happy');
    if ((this.cuddleTime ?? 0) > 1.1) actor.play(this.afterCuddle());
    else actor.play((function* () {
      yield 0.5;
      actor.relax();
    })());
  },

  *afterCuddle() {
    const { actor } = game;
    game.pet.setFace('happy');
    audio.happy();
    yield 0.3;
    if (Math.random() < 0.5) yield* this.lickGlass();
    else yield* actor.wave();
  },

  // ── Being carried and dropped ──

  pickUp(t) {
    const { pet, actor } = game;
    t.mode = 'carry';
    actor.stop();
    pet.r.pull.target = 0;
    pet.squash(-0.2);
    pet.jiggle(10);
    this.carrying = true;
    this.carryTo = [t.x, t.y];
    this.carryV = 0;
    pet.setFace('surprised');
    pet.paws(-14, -50, 14, -50);
    pet.ears(-0.3);
    audio.surprise();
    haptic('medium');
    pet.r.sy.target = 1.1;
    pet.r.sx.target = 0.92;
    this.carrySwing = 0;
    setTimeout(() => {
      if (this.carrying) pet.setFace('happy');
    }, 700);
  },

  updateCarry(dt) {
    const { actor, pet, view } = game;
    const [x, y] = this.carryTo;
    const s = pet.anchors.unit ?? 1;
    const targetAir = clamp(view.floorY - (y + (GROUND - 20) * s), 0, view.h);
    const dx = x - actor.x;
    actor.x += dx * Math.min(1, dt * 14);
    actor.air += (targetAir - actor.air) * Math.min(1, dt * 14);
    actor.x = clamp(actor.x, 30, view.w - 30);
    pet.r.lean.target = clamp(-dx / 260, -0.28, 0.28);
    pet.r.footL.target = 0.8 + Math.sin(game.time * 14) * 0.5;
    pet.r.footR.target = 0.8 - Math.sin(game.time * 14) * 0.5;
    pet.wag(1, 12);
  },

  drop() {
    const { pet, actor } = game;
    this.carrying = false;
    pet.r.sy.target = 1.04;
    pet.r.sx.target = 0.97;
    pet.r.lean.target = 0;
    this.falling = { vy: 0, from: actor.air };
    pet.setFace(actor.air > 180 ? 'surprised' : 'happy');
  },

  updateFall(dt) {
    const { actor, pet } = game;
    const f = this.falling;
    f.vy += 2300 * dt;
    actor.air -= f.vy * dt;
    if (actor.air <= 0) {
      actor.air = 0;
      if (f.vy > 500 && !f.bounced) {
        // One bounce, big and soft.
        f.bounced = true;
        const impact = f.vy;
        f.vy = -impact * 0.34;
        pet.squash(clamp(impact / 2600, 0.14, 0.38));
        pet.jiggle(clamp(impact / 90, 6, 18));
        audio.thud();
        haptic(impact > 1100 ? 'heavy' : 'medium');
        game.fx.poof(actor.x, actor.y, 6, 60, 26 * game.view.u);
        return;
      }
      this.falling = null;
      pet.squash(0.1);
      pet.paws();
      pet.ears(0);
      pet.r.sy.target = 1;
      pet.r.sx.target = 1;
      pet.r.footL.target = 0;
      pet.r.footR.target = 0;
      actor.play(actor.landed(f.from));
    }
  },

  // ── Feeding ──

  /** Called by the food tray when a finger starts dragging food. */
  startFoodDrag(foodId, x, y, id) {
    const { actor, pet } = game;
    audio.unlock();
    audio.plop();
    if (actor.busy) actor.stop();
    actor.relax('smile');
    this.drag = { id, food: foodId, x, y, near: 0, grown: 0 };
    pet.wag(0.8, 11);
  },

  updateDrag(dt) {
    const d = this.drag;
    if (!d) return;
    const { pet, view } = game;
    d.grown = Math.min(1, d.grown + dt * 7);
    pet.lookAt([d.x, d.y]);
    const m = pet.anchors.mouth;
    if (!m) return;
    const dist = Math.hypot(d.x - m[0], d.y - m[1]);
    const near = clamp(1 - (dist - 40 * view.u) / (190 * view.u));
    d.near = near;
    const s = game.state;
    const hates = tasteOf(s.pet.breed, d.food) === 'hate' && s.foodsTried.includes(d.food);
    if (hates) {
      if (pet.face !== 'pout') pet.setFace('pout');
      pet.r.yaw.target = near > 0.3 ? -0.3 : 0;
    } else if (s.pet.tummy >= 97) {
      if (pet.face !== 'pout') pet.setFace('pout');
    } else if (near > 0.05) {
      if (pet.face !== 'drool') pet.setFace('drool');
      pet.mouthExtra = near * 0.4;
      pet.r.lean.target = clamp((d.x - m[0]) / 900, -0.08, 0.08);
      pet.r.pitch.target = clamp((m[1] - d.y) / 600, -0.14, 0.14);
    } else {
      if (pet.face === 'drool') pet.setFace('smile');
      pet.mouthExtra = 0;
    }
  },

  releaseDrag() {
    const d = this.drag;
    this.drag = null;
    const { pet, actor } = game;
    pet.lookAt(null);
    pet.mouthExtra = 0;
    pet.r.pitch.target = 0;
    pet.r.lean.target = 0;
    pet.r.yaw.target = 0;
    if (d.near > 0.55) {
      this.giveFood(d.food);
    } else {
      this.fallers.push({ food: d.food, x: d.x, y: d.y, vy: 0, vx: 0, r: 0, age: 0 });
      audio.plop();
      actor.relax('neutral');
    }
  },

  /** Throws food from the tray straight to the pet (a tap instead of a drag). */
  throwFood(foodId) {
    const { pet, view } = game;
    audio.unlock();
    audio.whoosh();
    const m = pet.anchors.mouth ?? [view.w / 2, view.h / 2];
    this.thrown = { food: foodId, x0: view.w / 2, y0: view.h - 60 * view.u, x1: m[0], y1: m[1], t: 0, dur: 0.46 };
    game.actor.stop();
    pet.setFace('drool');
    pet.mouthExtra = 0.3;
    pet.lookAt([view.w / 2, view.h]);
  },

  updateThrown(dt) {
    const f = this.thrown;
    if (!f) return;
    const { pet } = game;
    f.t += dt;
    if (pet.anchors.mouth) {
      f.x1 = pet.anchors.mouth[0];
      f.y1 = pet.anchors.mouth[1];
    }
    pet.lookAt([this.thrownX(f), this.thrownY(f)]);
    if (f.t >= f.dur) {
      this.thrown = null;
      pet.lookAt(null);
      pet.mouthExtra = 0;
      this.giveFood(f.food);
    }
  },

  thrownX(f) {
    return lerp(f.x0, f.x1, smooth(f.t / f.dur));
  },

  thrownY(f) {
    const p = f.t / f.dur;
    return lerp(f.y0, f.y1, p) - Math.sin(p * Math.PI) * 120 * game.view.u;
  },

  updateFallers(dt) {
    const { view } = game;
    for (let i = this.fallers.length - 1; i >= 0; i--) {
      const f = this.fallers[i];
      f.age += dt;
      f.vy += 1500 * dt;
      f.y += f.vy * dt;
      f.r += dt * 2;
      const floor = view.floorY + 20 * view.u;
      if (f.y > floor) {
        f.y = floor;
        f.vy *= -0.32;
        if (Math.abs(f.vy) < 60) f.vy = 0;
      }
      if (f.age > 1.4) this.fallers.splice(i, 1);
    }
  },

  giveFood(foodId) {
    const { actor } = game;
    const s = game.state;
    const taste = tasteOf(s.pet.breed, foodId);
    if (taste !== 'hate' && s.pet.tummy >= 97) {
      actor.play(this.refuse());
      return;
    }
    if (taste !== 'hate' && s.berries < FOODS[foodId].cost) {
      game.ui.toast('Not enough berries for that');
      return;
    }
    actor.play(this.eat(foodId, taste));
  },

  *refuse() {
    const { actor, pet } = game;
    pet.setFace('pout');
    pet.r.yaw.target = -0.34;
    pet.paws(14, -14, -14, -14);
    audio.burp();
    pet.squash(0.1);
    game.ui.toast(`${game.state.pet.name} is full!`);
    yield 1;
    actor.relax();
  },

  *eat(foodId, taste) {
    const { actor, pet, fx, view } = game;
    const s = game.state;
    const size = 72 * view.u;
    this.eating = { food: foodId, stage: 0, size };
    pet.setFace('drool');
    pet.r.pitch.target = 0.04;
    audio.chomp();
    pet.mouthExtra = 0.55;
    yield 0.13;

    if (taste === 'hate') {
      // One nibble, then the face.
      pet.mouthExtra = 0;
      pet.setFace('chew');
      audio.chomp();
      yield 0.34;
      this.eating.stage = 1;
      pet.setFace('yuck');
      audio.yuck();
      pet.r.yaw.target = 0.34;
      pet.squash(0.12);
      pet.jiggle(10);
      haptic('light');
      yield 0.22;
      const m = pet.anchors.mouth;
      if (m) {
        this.fallers.push({ food: foodId, stage: 1, x: m[0], y: m[1], vy: -420, vx: 0, r: 0, age: 0 });
        fx.crumbs(m[0], m[1], 8, [0.5, 0.75, 0.35]);
      }
      this.eating = null;
      const result = feed(s, foodId, game.now());
      for (let i = 0; i < 3; i++) {
        pet.r.yaw.target = i % 2 ? -0.28 : 0.28;
        yield 0.13;
      }
      pet.r.yaw.target = 0;
      pet.setFace('pout');
      game.ui.toast(`${s.pet.name} really doesn't like ${FOODS[foodId].name.toLowerCase()}`);
      yield 0.7;
      actor.relax();
      game.ui.refresh();
      celebrate(result);
      save();
      return;
    }

    // Three good bites.
    for (let b = 0; b < 3; b++) {
      pet.mouthExtra = 0;
      pet.setFace('chew');
      pet.squash(0.07);
      audio.chomp();
      haptic('soft');
      const m = pet.anchors.mouth;
      if (m) fx.crumbs(m[0], m[1], 5);
      this.eating.stage = Math.min(b + 1, 2);
      if (b === 2) this.eating = null;
      for (let c = 0; c < 2; c++) {
        pet.r.mw.target = 0.72;
        pet.r.mo.target = 0.14;
        pet.r.sy.target = 0.985;
        yield 0.085;
        pet.r.mw.target = 0.46;
        pet.r.mo.target = 0;
        pet.r.sy.target = 1.01;
        yield 0.085;
      }
      if (b < 2) {
        pet.setFace('drool');
        pet.mouthExtra = 0.42;
        yield 0.09;
      }
    }
    pet.mouthExtra = 0;
    pet.r.sy.target = 1;
    audio.gulp();
    pet.squash(-0.08);
    const result = feed(s, foodId, game.now());
    game.ui.refresh();
    yield 0.14;
    const c = pet.anchors.center;
    if (taste === 'love') {
      pet.setFace('love');
      audio.happy();
      if (c) {
        fx.heartBurst(c[0], c[1] - 20, 16);
        fx.sparkles(c[0], c[1] - 20, 10, 90);
      }
      haptic('success');
      if (!s.tutorial[`loved_${foodId}`]) {
        s.tutorial[`loved_${foodId}`] = true;
        game.ui.toast(`${s.pet.name} LOVES ${FOODS[foodId].name.toLowerCase()}!`);
      }
      yield* actor.hop(46, 0.36, { sound: false });
      yield* actor.hop(32, 0.3, { sound: false });
    } else {
      pet.setFace('happy');
      audio.yum();
      if (c) fx.hearts(c[0], c[1] - 40, 2, 40);
      yield 0.6;
    }
    if (s.pet.tummy >= 97 && Math.random() < 0.8) {
      pet.setFace('surprised');
      pet.paws(14, -12, -14, -12);
      audio.burp();
      pet.squash(0.14);
      pet.jiggle(8);
      yield 0.5;
      pet.setFace('cheeky');
      yield 0.5;
    }
    actor.relax('smile');
    celebrate(result);
    save();
    yield 0.4;
    actor.relax();
  },

  // ── Bedtime ──

  sleep() {
    const { actor } = game;
    const s = game.state;
    const r = goToSleep(s, game.now());
    if (!r.ok) {
      actor.play(this.notSleepy());
      return;
    }
    celebrate(r);
    actor.stop();
    actor.play(this.goToBed());
    game.ui.show('asleep');
    audio.stopMusic();
    audio.startMusic('night');
    save();
  },

  *notSleepy() {
    const { actor, pet } = game;
    pet.setFace('cheeky');
    pet.r.yaw.target = 0.3;
    audio.mumble();
    game.ui.toast(`${game.state.pet.name} is wide awake!`);
    yield 0.5;
    pet.r.yaw.target = -0.3;
    yield 0.4;
    actor.relax();
    yield* actor.hop(40, 0.34);
    actor.relax();
  },

  *goToBed() {
    const { actor, pet } = game;
    const bed = this.layout.bed;
    pet.setFace('sleepy');
    yield* actor.walkTo(bed.x, 130 * game.view.u, { keepYaw: true });
    // Hop up and shrink as it moves away from us.
    const startY = actor.y;
    let t = 0;
    audio.boing();
    while (t < 0.4) {
      t += actor.dt;
      const p = smooth(t / 0.4);
      actor.y = lerp(startY, this.bedY + 6 * game.view.u, p);
      actor.scale = lerp(1, 0.66, p);
      actor.air = Math.sin(p * Math.PI) * 50;
      yield;
    }
    actor.air = 0;
    pet.r.yaw.target = 0;
    pet.squash(0.1);
    this.layInBed();
    audio.yawn();
  },

  layInBed() {
    const { actor, pet } = game;
    const bed = this.layout.bed;
    actor.x = bed.x;
    actor.y = this.bedY + 6 * game.view.u;
    actor.scale = 0.66;
    actor.air = 0;
    pet.asleep = true;
    pet.setFace('sleep');
    pet.ears(0.3);
    pet.wag(0.05, 2);
    pet.r.sy.target = 0.9;
    pet.r.sx.target = 1.07;
    pet.lookAt(null);
    this.inBed = true;
    this.dim.target = 1;
    game.ui.show('asleep');
    setKeepAwake(false);
  },

  /** Lights on. Called by the Wake button, or by itself when fully rested. */
  wake() {
    const { actor, pet } = game;
    wakeUp(game.state, game.now());
    this.dim.target = 0;
    pet.asleep = false;
    audio.stopMusic();
    audio.startMusic('day');
    actor.play(this.outOfBed());
    game.ui.show('home');
    game.ui.refresh();
    save();
  },

  *outOfBed() {
    const { actor, pet, view } = game;
    pet.setFace('sleepy');
    pet.r.sy.target = 1;
    pet.r.sx.target = 1;
    pet.ears(0);
    yield 0.5;
    yield* actor.yawn();
    this.inBed = false;
    const startY = actor.y;
    const startX = actor.x;
    let t = 0;
    audio.boing();
    while (t < 0.5) {
      t += actor.dt;
      const p = smooth(t / 0.5);
      actor.y = lerp(startY, view.floorY, p);
      actor.x = lerp(startX, startX - 60 * view.u, p);
      actor.scale = lerp(0.66, 1, p);
      actor.air = Math.sin(p * Math.PI) * 60;
      yield;
    }
    actor.air = 0;
    actor.scale = 1;
    pet.squash(0.14);
    yield* actor.walkTo(view.w / 2, 130 * view.u);
    yield* actor.stretch();
    actor.relax('smile');
    yield 0.2;
    actor.relax();
  },

  // ── Things that happen to the pet ──

  grew(stageId) {
    const { actor, pet, fx } = game;
    const name = STAGES.find((s) => s.id === stageId).name;
    actor.play((function* () {
      pet.setFace('starry');
      const c = pet.anchors.center;
      yield 0.2;
      for (let i = 0; i < 4; i++) {
        pet.squash(0.12);
        audio.sparkle();
        if (c) fx.sparkles(c[0], c[1], 8, 90);
        yield 0.22;
      }
      audio.poof();
      if (c) {
        fx.flash(c[0], c[1], 520, 0.6);
        fx.ring(c[0], c[1], 420);
        fx.confetti(c[0], c[1] - 80, 60, 170);
      }
      setPetStage();
      pet.squash(-0.2);
      pet.jiggle(14);
      haptic('success');
      game.ui.grew(name);
      yield 0.2;
      yield* actor.celebrate();
    })());
  },

  /** Reacts to talking: the talk scene drives the mouth directly. */
  talked() {
    const res = talked(game.state, game.now());
    celebrate(res);
  },

  // ── Drawing ──

  draw(g) {
    const { assets, actor, pet, view, fx } = game;
    const { w, h, horizon, u } = view;
    refreshLight();
    const light = game.light;
    const dim = this.dim.x;
    const amb = ambient(dim);
    const [tx, ty] = game.tiltNow;
    const px = tx * 9 * u;
    const py = ty * 5 * u;

    g.save();
    if (this.lift.x > 0.5 || this.pan.x > 0.5) g.translate(-this.pan.x, -this.lift.x);
    const z = this.zoom.x;
    if (z !== 1) {
      g.translate(this.focus[0], this.focus[1]);
      g.scale(z);
      g.translate(-this.focus[0], -this.focus[1]);
    }

    // The sky through the window.
    const win = this.layout.window;
    const shiftW = px * 0.2;
    drawSky(g, assets, light, win.x - win.w, win.y - 20 * u, win.w * 2, win.h + 40 * u);
    if (light.night > 0.02) {
      g.sprite(assets.get('sky.stars'), win.x, win.y + win.h / 2, { w: win.w * 2, h: win.h * 1.4, alpha: light.night });
    }
    const orbit = (t, flip) => {
      const a = lerp(0.12, 0.88, clamp(t));
      return [win.x + (flip ? a - 0.5 : a - 0.5) * win.w * 1.2, win.y + win.h * (0.72 - Math.sin(a * Math.PI) * 0.56)];
    };
    if (light.sun !== null) {
      const [sx, sy] = orbit(light.sun);
      g.sprite(assets.get('sky.sun'), sx + shiftW, sy, { w: 92 * u, h: 92 * u, alpha: clamp(light.mix.day + light.mix.dawn * 0.8 + light.mix.dusk * 0.8) });
    }
    if (light.moon !== null) {
      const [mx, my] = orbit(light.moon);
      g.sprite(assets.get('sky.moon'), mx + shiftW, my, { w: 84 * u, h: 84 * u, alpha: clamp(light.night * 1.1) });
    }
    for (const c of this.clouds) {
      const t = assets.get(`sky.cloud${c.i}`);
      g.sprite(t, win.x - win.w + ((c.x / w) * win.w * 2.2) + shiftW, win.y + c.y * u, { w: t.w * c.s * u, h: t.h * c.s * u, tint: [light.ambient[0], light.ambient[1], light.ambient[2], 1 - light.night * 0.55] });
    }

    if (dim > 0.01) g.rect(win.x - win.w, win.y - 20 * u, win.w * 2, win.h + 40 * u, [0.08, 0.08, 0.2], dim * 0.62);

    // The room.
    const wall = assets.get('room.wall');
    const floor = assets.get('room.floor');
    const ax = (px * 0.3);
    g.sprite(wall, ax, 0, { ax: 0, ay: 0, w: w + 2, tint: amb });
    if (ax > 0.5 || ax < -0.5) g.rect(ax < 0 ? w + ax : 0, 0, Math.abs(ax) + 1, horizon, amb);
    g.sprite(floor, ax, horizon, { ax: 0, ay: 0, w: w + 2, tint: amb });

    // Sun on the floor.
    if (light.beam > 0.02 && dim < 0.9) {
      g.sprite(assets.get('fx.glow'), this.layout.window.x + 40 * u + ax, horizon + 66 * u, { w: 330 * u, h: 150 * u, tint: [1, 0.93, 0.74], alpha: light.beam * (1 - dim) * 0.34, add: 1 });
    }

    // Plant and bed.
    const plant = assets.get('room.plant');
    const lay = this.layout;
    g.sprite(plant, lay.plant.x + px * 0.5, lay.plant.y + 20 * u, { ay: 1, tint: amb });
    const bed = assets.get('room.bed');
    g.sprite(bed, lay.bed.x + px * 0.5, lay.bed.y + 64 * u, { ay: 1, tint: amb });

    // A bedside glow, and the star projector on the walls.
    if (dim > 0.02) {
      g.sprite(assets.get('fx.glow'), lay.bed.x + px * 0.5, lay.bed.y - 20 * u, { w: 280 * u, h: 220 * u, tint: [1, 0.74, 0.42], alpha: dim * 0.42, add: 1 });
      const proj = assets.get('sky.projector');
      const spin = game.time * 0.03;
      g.sprite(proj, w / 2, horizon * 0.64, { w: Math.max(w, h) * 1.3, h: Math.max(w, h) * 1.3, rot: spin, alpha: dim * 0.75, add: 1 });
    }

    // Motes floating in the light.
    for (const m of this.motes) {
      g.sprite(assets.get('fx.dot'), m.x + px * 0.6, m.y, { w: m.s, h: m.s, alpha: m.a * (1 - dim) * light.beam, add: 1, tint: [1, 0.96, 0.84] });
    }

    // Food dropped on the floor, behind the pet if it's further back.
    this.drawFallers(g, amb);

    // The pet.
    const s = u * actor.scale;
    const shadowAlpha = clamp(1 - actor.air / (220 * u)) * 0.85 * (1 - dim * 0.4);
    const st = pet.stage.scale * s;
    g.sprite(assets.get('fx.shadow'), actor.x + px, actor.y + 4 * u, { w: 236 * st * (1 - actor.air / (900 * u)), h: 50 * st, alpha: shadowAlpha });
    pet.draw(g, actor.x + px, actor.y, s, petLight(amb));

    if (this.inBed) {
      const blanket = assets.get('room.blanket');
      g.sprite(blanket, lay.bed.x + px * 0.5, lay.bed.y + 64 * u - 12 * u, { ay: 1, tint: amb });
    }

    // Food in the pet's paws.
    if (this.eating && pet.anchors.mouth) {
      const e = this.eating;
      const m = pet.anchors.mouth;
      g.sprite(assets.get(`food.${e.food}.${e.stage}`), m[0], m[1] + 8 * u, { w: e.size * actor.scale, h: e.size * actor.scale, tint: amb });
    }

    // Foreground: fairy lights, close to the camera, glowing at night.
    const lights = assets.get('room.lights');
    g.sprite(lights, px * 1.2, 2 * u, { ax: 0, ay: 0, tint: amb });
    if (lights.bulbs) {
      const glowAmt = clamp(light.night * 0.9 + (1 - light.mix.day) * 0.2 + dim);
      if (glowAmt > 0.03) {
        const glow = assets.get('fx.glow');
        lights.bulbs.forEach(([bx, by, col], i) => {
          const tw = 0.62 + 0.38 * Math.sin(game.time * 1.7 + i * 1.3);
          const c = col.startsWith('#') ? [parseInt(col.slice(1, 3), 16) / 255, parseInt(col.slice(3, 5), 16) / 255, parseInt(col.slice(5, 7), 16) / 255] : [1, 1, 1];
          g.sprite(glow, bx + px * 1.2, by + 2 * u, { w: 44 * u, h: 44 * u, tint: c, alpha: glowAmt * tw * 0.8, add: 1 });
        });
      }
    }

    fx.draw(g);

    // Thought bubble.
    if (this.thought && pet.anchors.top) {
      const a = pet.anchors.top;
      const t = this.thought.t;
      const pop = clamp((3.4 - t) * 6) * clamp(t * 5);
      const key = `bubble.${this.thought.icon}`;
      const tex = assets.get(key);
      const bob = Math.sin(game.time * 3) * 3;
      const bx = clamp(a[0] + 72 * u, 60 * u, w - 60 * u);
      g.sprite(tex, bx, a[1] - 26 * u + bob, { w: tex.w * u * pop, h: tex.h * u * pop });
    }

    g.restore();

    // Things on the glass stay still when the camera moves.
    for (const m of this.glass) {
      const k = m.age / m.life;
      g.sprite(assets.get(m.tex), m.x, m.y, { w: m.w, h: m.h, alpha: (1 - k) * Math.min(1, m.age * 8) });
    }

    // Dragged and thrown food is above everything.
    if (this.drag) {
      const d = this.drag;
      const size = lerp(50, 76 + d.near * 12, d.grown) * u;
      g.sprite(assets.get(`food.${d.food}.0`), d.x, d.y - 26 * u, { w: size, h: size, rot: Math.sin(game.time * 4) * 0.08 });
    }
    if (this.thrown) {
      const f = this.thrown;
      const size = 66 * u;
      g.sprite(assets.get(`food.${f.food}.0`), this.thrownX(f), this.thrownY(f), { w: size, h: size, rot: (f.t / f.dur) * TAU });
    }
  },

  drawFallers(g, amb) {
    const { assets, view } = game;
    for (const f of this.fallers) {
      const size = 58 * view.u;
      const alpha = clamp((1.4 - f.age) * 3);
      g.sprite(assets.get(`food.${f.food}.${f.stage ?? 0}`), f.x, f.y - size * 0.3, { w: size, h: size, rot: f.r, tint: amb, alpha });
    }
  },

  spawnMotes(dt) {
    const { view } = game;
    this.moteIn = (this.moteIn ?? 0) - dt;
    if (this.moteIn <= 0 && this.motes.length < 26) {
      this.moteIn = 0.25;
      this.motes.push({ x: rand(view.w), y: rand(view.h * 0.2, view.h * 0.75), vx: rand(-5, 8), vy: rand(-7, 2), s: rand(2, 5) * view.u, a: 0, life: rand(4, 9), t: 0 });
    }
    for (let i = this.motes.length - 1; i >= 0; i--) {
      const m = this.motes[i];
      m.t += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.a = Math.sin((m.t / m.life) * Math.PI) * 0.5;
      if (m.t >= m.life) this.motes.splice(i, 1);
    }
  },
};

