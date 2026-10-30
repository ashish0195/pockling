// The Pockling itself: a rig of springs driving a soft body, a face that slides around it like a head
// turning, and a table of expressions. Everything moves through a spring, so any expression can follow
// any other and the whole creature stays alive. The local coordinates: the body's centre is (0, 0), its
// radius about 100, and it stands on the ground at y = 88.
import { BREEDS, STAGES, coatOf } from './catalog.js';
import { bakeBelly, bakeBody, bakeBrow, bakeCheek, bakeEar, bakeFoot, bakeMark, bakeNose, bakePaw, bakeTail, bakeWhisker, bakeWing, petSeed } from './bake/pet.js';
import { clamp, lerp, rand, rgb, Rig, smooth, Spring, TAU, mixRgb } from './util.js';
import { outfitAnchors } from './bake/outfits.js';

export const GROUND = 88;
const INK = rgb('#2d1b2e');

/** Every expression as targets for the face. Anything left out returns to its resting value. */
const REST = {
  open: 1, low: 0, arc: 0.6, tilt: 0, pupil: 0, sparkle: 0, heart: 0, star: 0, swirl: 0, cross: 0,
  mw: 0.72, mo: 0, mc: 0.7, mcat: 0.85, mround: 0, mwavy: 0, mtongue: 1, browY: 0, browTilt: 0, browA: 0, cheek: 0.55,
};

export const FACES = {
  neutral: {},
  smile: { mcat: 0.3, mc: 1, mw: 0.78, cheek: 0.7 },
  happy: { open: 1, low: 0.72, arc: 1, mcat: 0, mo: 0.55, mc: 1, mw: 0.92, cheek: 1, sparkle: 0.3 },
  joy: { open: 0.04, low: 1, arc: 1, mcat: 0, mo: 0.8, mc: 1, mw: 1.06, cheek: 1 },
  bliss: { open: 0.02, low: 1, arc: -1, mcat: 1, mw: 0.74, mc: 0.9, cheek: 1 },
  purr: { open: 0.03, low: 1, arc: 1, mcat: 1, mw: 0.8, mc: 0.9, cheek: 1 },
  sleep: { open: 0, low: 1, arc: -1, mcat: 0.6, mw: 0.45, mc: 0.5, cheek: 0.5 },
  sleepy: { open: 0.42, low: 0.1, tilt: 0.3, mcat: 0.2, mw: 0.5, mc: 0.25, cheek: 0.4, pupil: 0.1 },
  sad: { open: 0.86, tilt: 0.95, pupil: 0.55, sparkle: 1, mcat: 0, mc: -0.85, mw: 0.56, cheek: 0.35, browY: 1, browTilt: 1, browA: 0.9 },
  cry: { open: 0.1, low: 0.7, arc: -0.7, tilt: 0.8, mcat: 0, mc: -1, mo: 0.45, mw: 0.74, mround: 0.25, mwavy: 0.6, cheek: 0.8, browA: 0.9, browTilt: 1 },
  hungry: { open: 0.96, tilt: 0.5, pupil: 0.45, sparkle: 0.7, mcat: 0.1, mc: 0.1, mw: 0.42, mo: 0.13, cheek: 0.4, browA: 0.6, browTilt: 0.7 },
  drool: { open: 1.05, pupil: 0.85, sparkle: 1, mcat: 0, mc: 0.9, mo: 0.42, mw: 0.74, cheek: 0.9 },
  surprised: { open: 1.18, pupil: -0.8, mcat: 0, mc: 0, mo: 0.68, mw: 0.42, mround: 1, cheek: 0.6, browY: -1, browA: 0.8 },
  chew: { open: 0.72, low: 0.35, arc: 1, mcat: 0, mw: 0.5, mc: 0.6, cheek: 0.8 },
  yuck: { open: 0.1, low: 0.8, arc: -0.5, cross: 0, tilt: -0.5, mcat: 0, mc: -0.7, mo: 0.3, mw: 0.84, mwavy: 1, mtongue: 1, cheek: 0.1, browA: 1, browTilt: -0.8 },
  angry: { open: 0.82, tilt: -0.85, pupil: -0.25, mcat: 0, mc: -0.6, mw: 0.5, cheek: 0.75, browA: 1, browTilt: -1, browY: 0.8 },
  pout: { open: 0.92, tilt: 0.4, mcat: 0, mc: -0.5, mw: 0.34, cheek: 1, browA: 0.5, browTilt: 0.6 },
  listen: { open: 1.04, pupil: 0.1, sparkle: 0.3, mcat: 0, mw: 0.28, mc: 0.1, mo: 0.11, mround: 1, cheek: 0.6, browA: 0.5, browY: -0.7 },
  talk: { open: 1, sparkle: 0.2, mcat: 0, mw: 0.74, mc: 0.6, cheek: 0.7 },
  boop: { open: 1.06, pupil: -0.5, mcat: 0, mo: 0.12, mw: 0.3, mround: 1, mc: 0.2, cheek: 0.9 },
  love: { heart: 1, mcat: 0, mo: 0.48, mc: 1, mw: 0.84, cheek: 1 },
  starry: { star: 1, mcat: 0, mo: 0.6, mc: 1, mw: 0.9, cheek: 1 },
  dizzy: { swirl: 1, mcat: 0, mw: 0.62, mwavy: 1, mc: 0.15, mo: 0.16, cheek: 0.4 },
  ouch: { cross: 1, mcat: 0, mc: -0.5, mo: 0.28, mw: 0.5, mwavy: 0.5, cheek: 0.8 },
  yawn: { open: 0.06, low: 0.9, arc: -0.7, mcat: 0, mo: 1, mw: 0.74, mround: 0.84, cheek: 0.6, mtongue: 1 },
  sniff: { open: 0.62, low: 0.4, arc: 0.6, mcat: 0.5, mw: 0.28, mc: 0.3, cheek: 0.5 },
  cheeky: { open: 0.92, tilt: -0.25, sparkle: 0.3, mcat: 0.2, mc: 1, mw: 0.74, cheek: 0.9 },
  lick: { open: 0.08, low: 1, arc: 1, mcat: 0, mo: 0.55, mw: 0.72, mc: 0.9, cheek: 1 },
};

export class Pet {
  /**
   * assets is the shared texture store; spec is { breed, coat, seed, stage } as saved in the game state.
   * Each pet's textures live under its own prefix so a new coat can replace an old one.
   */
  constructor(assets, spec, { prefix = 'pet', bakeScale = 4 } = {}) {
    this.assets = assets;
    this.prefix = prefix;
    this.S = bakeScale;
    this.spec = { ...spec };
    this.breed = BREEDS[spec.breed];
    this.coat = coatOf(spec);
    this.stage = STAGES.find((s) => s.id === spec.stage) ?? STAGES[0];
    this.outfit = spec.outfit ?? {};
    this.iris = rgb(this.coat.iris);
    this.ink = INK;
    this.dirt = 0;
    this.foam = [];
    this.fluff = 0;
    this.wet = 0;
    this.alpha = 1;
    this.tongueOut = 0;
    this.defineTextures();

    const stiff = [0, 260, 24];
    const soft = [0, 90, 12];
    this.r = new Rig({
      sx: [1, 240, 11], sy: [1, 240, 11], lean: [0, 70, 9], yaw: [0, 44, 10], pitch: [0, 44, 10], hop: soft, spin: [0, 60, 10],
      open: [1, 620, 34], low: [0, 200, 22], arc: [0.6, 200, 22], tilt: [0, 200, 22], pupil: [0, 120, 16], sparkle: stiff,
      heart: stiff, star: stiff, swirl: stiff, cross: stiff, lookX: [0, 180, 20], lookY: [0, 180, 20],
      mw: [0.72, 300, 22], mo: [0, 440, 26], mc: [0.7, 300, 24], mcat: [0.85, 300, 24], mround: stiff, mwavy: stiff, mtongue: [1, 200, 20],
      browY: stiff, browTilt: stiff, browA: stiff, cheek: [0.55, 120, 16],
      earL: [0, 150, 11], earR: [0, 150, 11], earSwing: [0, 60, 5], tailAmp: [0.2, 40, 8], tailAngle: [0, 40, 8],
      pawLx: [0, 170, 15], pawLy: [0, 170, 15], pawRx: [0, 170, 15], pawRy: [0, 170, 15], footL: [0, 300, 20], footR: [0, 300, 20],
      noseS: [1, 300, 14], jig: [0, 60, 4.5], pull: [0, 150, 11], press: [0, 200, 16],
    });
    this.t = rand(100);
    this.face = 'neutral';
    this.faceHold = 0;
    this.blinkIn = rand(1, 3);
    this.blinkT = -1;
    this.doubleBlink = false;
    this.lookIn = rand(1, 3);
    this.lookTarget = null;
    this.lookFree = [0, 0];
    this.twitchIn = rand(2, 7);
    this.breath = 1;
    this.breathRate = 1;
    this.asleep = false;
    this.walkPhase = 0;
    this.walking = 0;
    this.tailSpeed = 5.5;
    this.pullAt = [0, 0];
    this.pullBy = [0, 0];
    this.pressAt = [0, 0];
    this.mouthExtra = 0;
    this.held = null;
    this.pos = { x: 0, y: 0, s: 1 };
    this.anchors = {};
    this.setFace('neutral');
    this.tmp = [0, 0];
  }

  defineTextures() {
    const a = this.assets;
    const p = this.prefix;
    const { S, coat } = this;
    const breed = this.spec.breed;
    const seed = petSeed(this.spec);
    const pale = coat.mark === 'socks' ? coat.belly : coat.mark === 'panda' ? coat.markColor : null;
    a.define(`${p}.body`, () => bakeBody(coat, seed, S));
    a.define(`${p}.belly`, () => bakeBelly(coat, seed, S));
    a.define(`${p}.ear`, () => bakeEar(breed, coat, seed, S));
    a.define(`${p}.tail`, () => bakeTail(breed, coat, seed, S));
    a.define(`${p}.paw`, () => bakePaw(coat, seed, S, { tint: pale }));
    a.define(`${p}.pawPad`, () => bakePaw(coat, seed, S, { tint: pale, pad: true }));
    a.define(`${p}.foot`, () => bakeFoot(coat, seed, S, pale));
    a.define(`${p}.nose`, () => bakeNose(coat, S));
    a.define(`${p}.cheek`, () => bakeCheek(coat, S));
    a.define(`${p}.brow`, () => bakeBrow(S, coat.fur[0]));
    if (this.breed.whiskers) a.define(`${p}.whisker`, () => bakeWhisker(coat, S));
    if (this.breed.wings) a.define(`${p}.wing`, () => bakeWing(coat, S));
    if (coat.mark && coat.mark !== 'none' && coat.mark !== 'socks') {
      a.define(`${p}.mark`, () => bakeMark(coat, seed, S));
    }
  }

  tex(name) {
    return this.assets.get(`${this.prefix}.${name}`);
  }

  setStage(id) {
    this.stage = STAGES.find((s) => s.id === id) ?? STAGES[0];
  }

  /** Change expression; hold keeps it for that long, after which it can be replaced by idle faces. */
  setFace(name, hold = 0) {
    const f = FACES[name] ?? FACES.neutral;
    for (const key of Object.keys(REST)) {
      if (this.r[key]) this.r[key].target = f[key] ?? REST[key];
    }
    this.face = name;
    this.faceHold = hold;
  }

  // ── Little movements ──

  /** A squash that springs back: positive squashes flat, negative stretches tall. */
  squash(amount, velocity = 0) {
    this.r.sy.x -= amount;
    this.r.sx.x += amount * 0.7;
    this.r.sy.v += velocity;
    this.r.jig.kick(amount * 12);
    this.r.earSwing.kick(amount * 10);
  }

  jiggle(amount) {
    this.r.jig.kick(amount);
  }

  /** Paw targets in local units, relative to where they rest. Pass nothing to lower them. */
  paws(lx = 0, ly = 0, rx = 0, ry = 0) {
    this.r.pawLx.target = lx;
    this.r.pawLy.target = ly;
    this.r.pawRx.target = rx;
    this.r.pawRy.target = ry;
  }

  ears(l = 0, r = l) {
    this.r.earL.target = l;
    this.r.earR.target = r;
  }

  wag(amount, speed = 11) {
    this.r.tailAmp.target = amount;
    this.tailSpeed = speed;
  }

  /** Look at a point in screen pixels, or null to look around freely. */
  lookAt(point) {
    this.lookTarget = point;
  }

  /** Jumps every spring to where it's heading; for first frames and screenshots. */
  settle() {
    for (const name of this.r.names) {
      const sp = this.r[name];
      sp.x = sp.target;
      sp.v = 0;
    }
  }

  // ── Every frame ──

  update(dt) {
    const r = this.r;
    this.t += dt;
    r.step(dt);

    // Breathing, slower and deeper asleep.
    const rate = this.asleep ? 0.62 : 1.05 * this.breathRate;
    this.breath += dt * rate * TAU * 0.35;
    const b = Math.sin(this.breath);
    this.breathNow = b * (this.asleep ? 0.024 : 0.014);

    // Blinks, sometimes two in a row.
    if (!this.asleep) {
      this.blinkIn -= dt;
      if (this.blinkIn <= 0 && this.blinkT < 0) {
        this.blinkT = 0;
        this.doubleBlink = Math.random() < 0.18;
        this.blinkIn = rand(1.6, 5.2);
      }
    }
    let blink = 1;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const d = 0.15;
      const p = this.blinkT / d;
      blink = p < 0.42 ? 1 - p / 0.42 : (p - 0.42) / 0.58;
      if (this.blinkT >= d) {
        if (this.doubleBlink) {
          this.doubleBlink = false;
          this.blinkT = -0.1;
        } else {
          this.blinkT = -1;
        }
        blink = 1;
      }
      if (this.blinkT < 0 && this.blinkT > -0.99) {
        blink = 1;
        this.blinkT += dt;
        if (this.blinkT >= 0) this.blinkT = 0;
      }
    }
    this.blink = clamp(blink);

    // Eyes wander when nothing has their attention.
    if (this.lookTarget) {
      const dx = this.lookTarget[0] - this.pos.x;
      const dy = this.lookTarget[1] - (this.pos.y - 88 * this.pos.s);
      const unit = Math.max(this.pos.s, 0.01) * 180;
      r.lookX.target = clamp(dx / unit, -1, 1);
      r.lookY.target = clamp(-dy / unit, -1, 1);
    } else {
      this.lookIn -= dt;
      if (this.lookIn <= 0) {
        this.lookIn = rand(0.8, 3.4);
        this.lookFree = Math.random() < 0.45 ? [0, 0] : [rand(-0.9, 0.9), rand(-0.5, 0.6)];
      }
      r.lookX.target = this.lookFree[0];
      r.lookY.target = this.lookFree[1];
    }

    // Ear twitches.
    this.twitchIn -= dt;
    if (this.twitchIn <= 0) {
      this.twitchIn = rand(2.5, 8);
      const which = Math.random() < 0.5 ? r.earL : r.earR;
      which.kick(rand(5, 10) * (Math.random() < 0.5 ? -1 : 1));
    }

    // Feet patter while walking.
    if (this.walking > 0.01) {
      this.walkPhase += dt * this.walking * 14;
      const s = Math.sin(this.walkPhase);
      r.footL.target = Math.max(0, s) * 1;
      r.footR.target = Math.max(0, -s) * 1;
    } else {
      r.footL.target = 0;
      r.footR.target = 0;
    }
  }

  /** Where a point of the undeformed body ends up after squash, lean, wobble, pull and press. */
  deform(x, y, out = this.tmp) {
    const r = this.r;
    const h = (GROUND - y) / 180; // 0 at the feet, 1 at the top of the head
    const breath = this.breathNow ?? 0;
    const sy = r.sy.x + breath;
    const dsx = r.sx.x - breath * 0.7 - 1;
    const sx = 1 + dsx * lerp(1.35, 0.6, clamp(h));
    let X = x * sx;
    let Y = GROUND - (GROUND - y) * sy;
    X += r.lean.x * (GROUND - y) * (0.55 + h * 0.45);
    const jig = r.jig.x;
    if (jig) X += Math.sin(y * 0.05 + this.t * 19) * jig * 0.55 * clamp(h + 0.2);

    if (r.press.x > 0.002) {
      const dx = X - this.pressAt[0];
      const dy = Y - this.pressAt[1];
      const d2 = dx * dx + dy * dy;
      const w = Math.exp(-d2 / 1500) * r.press.x;
      X += dx * w * 0.42;
      Y += dy * w * 0.42;
    }
    if (r.pull.x > 0.002) {
      const dx = x - this.pullAt[0];
      const dy = y - this.pullAt[1];
      const w = Math.exp(-(dx * dx + dy * dy) / 6200) * r.pull.x;
      X += this.pullBy[0] * w;
      Y += this.pullBy[1] * w;
    }
    out[0] = X;
    out[1] = Y;
    return out;
  }

  /** Slides a point of the face around the round head as it turns: x, y are as seen from the front. */
  onHead(x, y, out = this.tmp) {
    const yaw = this.r.yaw.x;
    const pitch = this.r.pitch.x;
    const radius = 104;
    const ax = Math.asin(clamp(x / radius, -0.98, 0.98)) + yaw;
    const ay = Math.asin(clamp(y / radius, -0.98, 0.98)) + pitch;
    out[0] = radius * Math.sin(ax);
    out[1] = radius * Math.sin(ay);
    out[2] = Math.cos(ax);
    out[3] = Math.cos(ay);
    return out;
  }

  /**
   * Draws the pet with its feet at (x, y). light is the scene's light colour; everything is tinted by it.
   */
  draw(g, x, y, scale, light = [1, 1, 1], { behind = null } = {}) {
    const R = this.r;
    const stage = this.stage;
    const s = scale * stage.scale;
    this.pos = { x, y: y - R.hop.x, s };
    const tint = [light[0], light[1], light[2], this.alpha];

    g.save();
    g.translate(x, y - R.hop.x - GROUND * s);
    if (R.spin.x) g.rotate(R.spin.x);
    g.scale(s);

    const yaw = R.yaw.x;
    const fy = this.deform(0, -90, [0, 0]);
    const headTop = fy[1];

    // ── Behind the body ──
    this.drawTail(g, tint, yaw);
    if (this.breed.wings) this.drawWings(g, tint, yaw);
    if (this.breed.ears.behind) this.drawEars(g, tint, yaw);
    if (this.outfit.neck === 'cape') this.drawOutfit(g, 'neck', 'cape', tint);
    behind?.(g);

    // ── The soft body ──
    const body = this.tex('body');
    const W = body.w;
    const H = body.h;
    g.grid(body, 22, 22, (u, v, out) => {
      this.deform((u - 0.5) * W, (v - 0.5) * H, out);
    }, { tint });

    // Belly, sliding a little with the turn.
    const belly = this.tex('belly');
    const bx = Math.sin(yaw) * 34;
    g.grid(belly, 10, 10, (u, v, out) => {
      this.deform((u - 0.5) * belly.w + bx, (v - 0.5) * belly.h + 34, out);
    }, { tint });

    // Body spots sit on the coat.
    if (this.coat.mark === 'spots') {
      const m = this.tex('mark');
      g.grid(m, 8, 8, (u, v, out) => {
        this.deform((u - 0.5) * m.w + Math.sin(yaw) * 26, (v - 0.5) * m.h, out);
      }, { tint });
    }

    if (this.dirt > 0.01) this.drawDirt(g, tint);
    this.overBody?.(g);

    // ── Feet and paws ──
    this.drawFeet(g, tint, yaw);

    if (this.outfit.neck && this.outfit.neck !== 'cape') this.drawOutfit(g, 'neck', this.outfit.neck, tint);

    // ── Face ──
    this.drawFace(g, tint, yaw);
    if (this.outfit.face) this.drawOutfit(g, 'face', this.outfit.face, tint);

    if (!this.breed.ears.behind) this.drawEars(g, tint, yaw);

    this.drawPaws(g, tint, yaw);

    if (this.outfit.head) this.drawOutfit(g, 'head', this.outfit.head, tint, headTop);

    g.restore();
  }

  drawTail(g, tint, yaw) {
    const R = this.r;
    const t = this.breed.tail;
    const tex = this.tex('tail');
    const scale = this.stage.tail;
    const sideShift = yaw > 0 ? lerp(66, -84, clamp(yaw / 0.55)) : lerp(66, 92, clamp(-yaw / 0.55));
    const rootLocal = this.deform(sideShift, 52, [0, 0]);
    const dir = sideShift >= 0 ? 1 : -1;
    const n = 12;
    const L = tex.length * scale;
    const seg = L / (n - 1);
    const hw = (tex.w / 2) * scale * (t.kind === 'pom' ? 1 : 1);
    const pts = new Array(n * 3);
    let a = -Math.PI / 2 + 1.12 * dir + R.tailAngle.x;
    let px = rootLocal[0];
    let py = rootLocal[1];
    const curl = t.curl;
    const wag = Math.sin(this.t * this.tailSpeed);
    for (let i = 0; i < n; i++) {
      pts[i * 3] = px;
      pts[i * 3 + 1] = py;
      pts[i * 3 + 2] = hw;
      const f = i / (n - 1);
      a += (-curl * dir * 0.13) * (0.5 + f * 1.3) + wag * R.tailAmp.x * 0.2 * (0.4 + f);
      px += Math.cos(a) * seg;
      py += Math.sin(a) * seg;
    }
    g.ribbon(tex, pts, { tint });
  }

  drawEars(g, tint, yaw) {
    const R = this.r;
    const e = this.breed.ears;
    const tex = this.tex('ear');
    const scale = this.stage.ears;
    const n = e.kind === 'long' || e.kind === 'flop' ? 12 : 6;
    const seg = (tex.length * scale) / (n - 1);
    const hw = (tex.w / 2) * scale;
    const pad = (tex.pad ?? 14) * scale;
    const tuck = e.kind === 'flop' ? 0.72 : 0.2;
    for (const side of [-1, 1]) {
      const twist = side < 0 ? R.earL.x : R.earR.x;
      const swing = R.earSwing.x * 0.05;
      const shift = this.onHead(side * e.x, e.y, [0, 0, 0, 0]);
      // Floppy ears hang off the sides of the head, so they only slide a little as it turns.
      if (e.kind === 'flop') shift[0] = side * e.x + Math.sin(yaw) * 20;
      const root = this.deform(shift[0], shift[1], [0, 0]);
      let a = -Math.PI / 2 + side * (e.angle + twist * 0.42) + yaw * 0.28;
      const pts = new Array(n * 3);
      // Start the strip back along its direction, so the padding at the root hides in the head.
      let px = root[0] - Math.cos(a) * pad * tuck;
      let py = root[1] - Math.sin(a) * pad * tuck;
      for (let i = 0; i < n; i++) {
        pts[i * 3] = px;
        pts[i * 3 + 1] = py;
        pts[i * 3 + 2] = hw;
        const f = i / (n - 1);
        const flop = (e.bend / n) * side * (0.5 + f * 1.3) + (twist * side * 0.03) + swing * (0.3 + f);
        a += flop;
        px += Math.cos(a) * seg;
        py += Math.sin(a) * seg;
      }
      g.ribbon(tex, pts, { tint });
    }
  }

  drawWings(g, tint, yaw) {
    const tex = this.tex('wing');
    const flap = Math.sin(this.t * 3.1) * 0.08 + this.r.earSwing.x * 0.02;
    const left = this.deform(-74 + yaw * 20, 0, [0, 0]);
    const right = this.deform(74 + yaw * 20, 0, [0, 0]);
    const k = this.stage.ears * 1.2;
    g.sprite(tex, right[0], right[1], { w: tex.w * k, h: tex.h * k, ax: 0.08, ay: 0.78, rot: -0.12 - flap, tint });
    g.save();
    g.translate(left[0], left[1]);
    g.scale(-1, 1);
    g.sprite(tex, 0, 0, { w: tex.w * k, h: tex.h * k, ax: 0.08, ay: 0.78, rot: -0.12 - flap, tint });
    g.restore();
  }

  drawFeet(g, tint, yaw) {
    const R = this.r;
    const foot = this.tex('foot');
    const shift = Math.sin(yaw) * 16;
    for (const side of [-1, 1]) {
      const lift = (side < 0 ? R.footL.x : R.footR.x) * 12;
      const p = this.deform(side * 40 + shift, 78, [0, 0]);
      g.sprite(foot, p[0], p[1] - lift, { w: foot.w * 0.92, h: foot.h * 0.92 * R.sy.x, rot: side * 0.08, tint });
    }
  }

  drawPaws(g, tint, yaw) {
    const R = this.r;
    const paw = this.tex('paw');
    const pad = this.tex('pawPad');
    const shift = Math.sin(yaw) * 22;
    for (const side of [-1, 1]) {
      const ox = side < 0 ? R.pawLx.x : R.pawRx.x;
      const oy = side < 0 ? R.pawLy.x : R.pawRy.x;
      const p = this.deform(side * 55 + shift, 54, [0, 0]);
      const raised = clamp(-oy / 30);
      const t = raised > 0.55 ? pad : paw;
      g.sprite(t, p[0] + ox, p[1] + oy, { w: paw.w * 0.7, h: paw.h * 0.7, rot: side * (0.2 + raised * 0.25), tint });
    }
  }

  drawDirt(g, tint) {
    const t = this.assets.get('fx.dirt');
    g.grid(t, 8, 8, (u, v, out) => {
      this.deform((u - 0.5) * 210, (v - 0.5) * 190 + 2, out);
    }, { tint, alpha: clamp(this.dirt) });
  }

  drawFace(g, tint, yaw) {
    const R = this.r;
    const stage = this.stage;
    const eyeScale = stage.eyes;
    const eyeR = 27 * eyeScale;
    const ex = 45 + (eyeScale - 1) * 10;
    const ey = 4 + (eyeScale - 1) * 16;
    const head = [0, 0, 0, 0];
    const p = [0, 0];

    // Markings under the eyes.
    if (this.coat.mark && this.coat.mark !== 'none' && this.coat.mark !== 'socks' && this.coat.mark !== 'spots') {
      const m = this.tex('mark');
      this.onHead(m.x ?? 0, m.y ?? 0, head);
      this.deform(head[0], head[1], p);
      g.sprite(m, p[0], p[1], { w: m.w * Math.max(head[2], 0.5), h: m.h, tint });
    }

    // Cheeks.
    const cheek = this.tex('cheek');
    const cheekAmt = R.cheek.x;
    for (const side of [-1, 1]) {
      this.onHead(side * 66, 33, head);
      this.deform(head[0], head[1], p);
      g.sprite(cheek, p[0], p[1], { w: cheek.w * Math.max(head[2], 0.4), h: cheek.h * 0.66, tint, alpha: clamp(cheekAmt) * Math.min(head[2] * 1.4, 1) });
    }

    // Whiskers.
    if (this.breed.whiskers) {
      const w = this.tex('whisker');
      for (const side of [-1, 1]) {
        this.onHead(side * 78, 26, head);
        this.deform(head[0], head[1], p);
        g.save();
        g.translate(p[0], p[1]);
        g.scale(side * Math.max(head[2], 0.1), 1);
        g.sprite(w, 0, 0, { ax: 0.1, tint, rot: Math.sin(this.t * 2.3 + side) * 0.03 });
        g.restore();
      }
    }

    // Eyes.
    const blink = this.blink ?? 1;
    const look = { lookX: R.lookX.x, lookY: R.lookY.x };
    for (const side of [-1, 1]) {
      this.onHead(side * ex, ey, head);
      this.deform(head[0], head[1], p);
      const c = clamp(head[2], 0.05, 1);
      g.save();
      g.translate(p[0], p[1]);
      g.scale(Math.max(c, 0.2) * lerp(1, R.sx.x, 0.5), lerp(1, R.sy.x, 0.5));
      if (this.r.lean.x) g.rotate(this.r.lean.x * 0.5);
      g.eye(0, 0, eyeR, {
        open: R.open.x * blink,
        low: clamp(R.low.x),
        arc: R.arc.x,
        tilt: R.tilt.x,
        lookX: look.lookX,
        lookY: look.lookY,
        pupil: R.pupil.x,
        sparkle: clamp(R.sparkle.x),
        heart: clamp(R.heart.x),
        star: clamp(R.star.x),
        swirl: clamp(R.swirl.x),
        cross: clamp(R.cross.x),
        iris: this.iris,
        ink: this.ink,
      }, side, tint, tint[3]);
      g.restore();

      // Eyebrows, only when the mood calls for them.
      if (R.browA.x > 0.02) {
        const brow = this.tex('brow');
        this.onHead(side * (ex + 2), ey - eyeR - 8 + R.browY.x * -4 + 4, head);
        this.deform(head[0], head[1], p);
        g.sprite(brow, p[0], p[1], { w: brow.w * 0.9, h: brow.h, rot: side * R.browTilt.x * 0.42, tint, alpha: clamp(R.browA.x) * 0.9 });
      }
    }

    // Nose.
    const nose = this.tex('nose');
    this.onHead(0, 17 + (eyeScale - 1) * 12, head);
    this.deform(head[0], head[1], p);
    const noseAt = [p[0], p[1]];
    g.sprite(nose, p[0], p[1], { w: nose.w * 0.62 * R.noseS.x * Math.max(head[2], 0.4), h: nose.h * 0.62 * R.noseS.x, tint });

    // Mouth.
    this.onHead(0, 26 + (eyeScale - 1) * 12, head);
    this.deform(head[0], head[1], p);
    const mouthAt = [p[0], p[1]];
    const open = R.mo.x + this.mouthExtra;
    g.save();
    g.translate(p[0], p[1]);
    g.scale(Math.max(head[2], 0.45), 1);
    const size = 17 + clamp(open) * 3;
    g.mouth(0, 2 + clamp(open) * 8, size, {
      w: Math.max(R.mw.x, 0.08),
      open: Math.max(open, 0),
      curve: R.mc.x,
      cat: clamp(R.mcat.x),
      round: clamp(R.mround.x),
      wavy: clamp(R.mwavy.x),
      tongue: clamp(R.mtongue.x),
      fang: this.breed.fang ? 1 : 0,
      ink: this.ink,
    }, tint, tint[3]);
    g.restore();

    // A little tongue poking out, for licks and raspberries.
    if (this.tongueOut > 0.01) {
      const t = this.assets.get('fx.tongue');
      g.sprite(t, mouthAt[0], mouthAt[1] + 6, { w: 26, h: 34 * this.tongueOut, ay: 0, tint });
    }

    this.anchors.mouth = g.toScreen(mouthAt[0], mouthAt[1] + 4);
    this.anchors.nose = g.toScreen(noseAt[0], noseAt[1]);
    this.onHead(0, ey, head);
    this.deform(head[0], head[1], p);
    this.anchors.eyes = g.toScreen(p[0], p[1]);
    this.deform(0, -80, p);
    this.anchors.top = g.toScreen(p[0], p[1]);
    this.deform(0, 40, p);
    this.anchors.belly = g.toScreen(p[0], p[1]);
    this.deform(0, 0, p);
    this.anchors.center = g.toScreen(p[0], p[1]);
    this.anchors.unit = g.unit;
    this.onHead(0, ey, head);
    this.deform(head[0], head[1], p);
    this.faceAt = [p[0], p[1], head[2]];
  }

  drawOutfit(g, slot, id, tint, headTop) {
    const tex = this.assets.get(`outfit.${id}`);
    const a = outfitAnchors[id];
    if (!a) return;
    const head = [0, 0, 0, 0];
    const p = [0, 0];
    if (a.follow === false) {
      this.deform(a.x + Math.sin(this.r.yaw.x) * 28, a.y, p);
      head[2] = 1;
    } else {
      this.onHead(a.x, a.y, head);
      this.deform(head[0], head[1], p);
    }
    const yawTilt = this.r.yaw.x * (a.tilt ?? 0.3);
    const squeeze = slot === 'face' ? Math.max(head[2], 0.5) : 1;
    g.sprite(tex, p[0], p[1], { w: tex.w * (a.scale ?? 1) * squeeze, h: tex.h * (a.scale ?? 1), ax: a.ax ?? 0.5, ay: a.ay ?? 0.5, rot: (a.rot ?? 0) + this.r.lean.x * 0.7 + yawTilt, tint });
  }

  /** Is a screen point on the pet? Returns which part, or null. */
  hit(px, py) {
    const a = this.anchors;
    if (!a.center) return null;
    const u = a.unit;
    const dx = (px - a.center[0]) / u;
    const dy = (py - a.center[1]) / u;
    if (dx * dx + dy * dy > 125 * 125) return null;
    if (a.nose) {
      const nx = (px - a.nose[0]) / u;
      const ny = (py - a.nose[1]) / u;
      if (nx * nx + ny * ny < 20 * 20) return 'nose';
    }
    if (dy < -30) return 'head';
    if (dy > 36) return 'belly';
    return Math.abs(dx) > 52 ? 'cheek' : 'face';
  }

  /** Screen point to local rig units, ignoring deformation. */
  toLocal(px, py) {
    const a = this.anchors;
    if (!a.center) return [0, 0];
    const u = a.unit;
    return [(px - a.center[0]) / u, (py - a.center[1]) / u];
  }
}

export { smooth, mixRgb, Spring };
