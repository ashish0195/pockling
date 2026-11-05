// The pet as a character on stage: where it stands, how it walks and hops, and short acted scenes
// written as generators. Yield a number to wait that long; yield nothing to wait a frame.
import { audio } from './audio.js';
import { haptic } from './platform.js';
import { clamp, lerp, pick, rand } from './util.js';

export class Actor {
  constructor(pet, particles) {
    this.pet = pet;
    this.fx = particles;
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.air = 0;
    this.scale = 1;
    this.script = null;
    this.wait = 0;
    this.onDone = null;
    this.bounce = 0;
    this.dt = 1 / 60;
    this.idleFace = 'neutral';
    this.quiet = false;
  }

  get busy() {
    return Boolean(this.script);
  }

  /** Starts an acted scene, replacing whatever was going on. */
  play(generator, onDone) {
    this.script = generator;
    this.wait = 0;
    this.onDone = onDone ?? null;
    this.resume();
  }

  stop() {
    this.script = null;
    this.onDone = null;
    this.pet.walking = 0;
  }

  resume() {
    const script = this.script;
    if (!script) return;
    const step = script.next();
    // The scene may have started another one, or stopped itself. That stands.
    if (this.script !== script) return;
    if (step.done) {
      this.script = null;
      const done = this.onDone;
      this.onDone = null;
      done?.();
      return;
    }
    this.wait = typeof step.value === 'number' ? step.value : 0;
  }

  update(dt) {
    this.dt = dt;
    if (this.script) {
      this.wait -= dt;
      if (this.wait <= 0) this.resume();
    }
    const pet = this.pet;
    pet.r.hop.x = this.air;
    pet.r.hop.target = this.air;
    pet.update(dt);
  }

  // ── Building blocks ──

  *sleepFor(t) {
    yield t;
  }

  /** Trots to x. speed in pixels a second; hops along with little bounces. */
  *walkTo(x, speed = 110, { keepYaw = false } = {}) {
    const pet = this.pet;
    const dir = Math.sign(x - this.x) || 1;
    pet.r.yaw.target = dir * 0.62;
    pet.r.lean.target = dir * 0.05;
    pet.walking = 1;
    let phase = 0;
    let steps = 0;
    while (Math.abs(x - this.x) > 3) {
      const { dt } = this;
      this.x += dir * Math.min(speed * dt, Math.abs(x - this.x));
      phase += dt * (speed / 11);
      this.air = Math.abs(Math.sin(phase)) * 9 * this.scale;
      // A pitter-patter each time a little bounce lands.
      if (Math.floor(phase / Math.PI) > steps) {
        steps = Math.floor(phase / Math.PI);
        audio.step();
      }
      pet.r.sy.target = 1 + Math.cos(phase * 2) * 0.03;
      pet.r.sx.target = 1 - Math.cos(phase * 2) * 0.025;
      yield;
    }
    this.air = 0;
    pet.walking = 0;
    pet.r.sy.target = 1;
    pet.r.sx.target = 1;
    pet.r.lean.target = 0;
    if (!keepYaw) pet.r.yaw.target = 0;
    pet.squash(0.06);
  }

  /** A hop: crouch, spring up, land with a squash. */
  *hop(height = 60, dur = 0.42, { sound = true } = {}) {
    const pet = this.pet;
    pet.r.sy.target = 0.84;
    pet.r.sx.target = 1.14;
    yield 0.09;
    pet.r.sy.target = 1.14;
    pet.r.sx.target = 0.9;
    if (sound) audio.boing();
    let t = 0;
    while (t < dur) {
      t += this.dt;
      const p = clamp(t / dur);
      this.air = 4 * p * (1 - p) * height * this.scale;
      if (p > 0.5) {
        pet.r.sy.target = 1.02;
        pet.r.sx.target = 0.99;
      }
      yield;
    }
    this.air = 0;
    pet.r.sy.target = 1;
    pet.r.sx.target = 1;
    pet.squash(0.18);
    haptic('soft');
  }

  /** Back to the quiet resting pose. */
  relax(face = 'neutral') {
    const pet = this.pet;
    pet.setFace(face);
    pet.paws();
    pet.ears(0);
    pet.wag(0.2, 5.5);
    pet.r.yaw.target = 0;
    pet.r.pitch.target = 0;
    pet.r.lean.target = 0;
    pet.r.sx.target = 1;
    pet.r.sy.target = 1;
    pet.lookAt(null);
    pet.walking = 0;
    pet.tongueOut = 0;
    pet.mouthExtra = 0;
  }

  get at() {
    return this.pet.anchors;
  }

  // ── Scenes ──

  *wave() {
    const pet = this.pet;
    pet.setFace('smile');
    audio.hello();
    pet.r.lean.target = -0.03;
    for (let i = 0; i < 3; i++) {
      pet.paws(0, 0, 8, -46);
      yield 0.16;
      pet.paws(0, 0, 18, -38);
      yield 0.16;
    }
    this.relax();
  }

  *yawn() {
    const pet = this.pet;
    pet.setFace('yawn');
    audio.yawn();
    pet.r.sy.target = 1.08;
    pet.r.sx.target = 0.95;
    pet.paws(-4, -8, 4, -8);
    yield 0.85;
    pet.r.sy.target = 0.96;
    pet.r.sx.target = 1.03;
    pet.setFace('sleepy');
    yield 0.4;
    this.relax();
  }

  *stretch() {
    const pet = this.pet;
    pet.setFace('bliss');
    audio.stretchy();
    pet.r.sy.target = 1.14;
    pet.r.sx.target = 0.9;
    pet.paws(-14, -56, 14, -56);
    pet.ears(-0.3);
    yield 0.7;
    pet.r.sy.target = 0.88;
    pet.r.sx.target = 1.1;
    pet.paws();
    yield 0.25;
    this.relax('smile');
    yield 0.4;
    this.relax();
  }

  *sneeze() {
    const pet = this.pet;
    pet.setFace('sniff');
    pet.r.pitch.target = -0.14;
    pet.r.noseS.kick(5);
    audio.sneeze();
    pet.r.sy.target = 1.08;
    yield 0.34;
    pet.setFace('joy');
    pet.r.pitch.target = 0.2;
    pet.squash(0.26);
    const m = this.at.mouth;
    if (m) {
      if (pet.spec.breed === 'drakling') {
        this.fx.sparkles(m[0], m[1], 14, 34);
        this.fx.stars(m[0], m[1], 5);
        audio.sparkle();
      } else {
        this.fx.bubbles(m[0], m[1], 4, 14);
        audio.bubble();
      }
    }
    haptic('light');
    yield 0.4;
    pet.setFace('cheeky');
    pet.r.pitch.target = 0;
    yield 0.5;
    this.relax();
  }

  /** Turns round to chase its own tail, three times, and gets a bit dizzy. */
  *chaseTail() {
    const pet = this.pet;
    pet.setFace('happy');
    pet.wag(1.2, 16);
    audio.wee();
    let a = 0;
    const turns = 3;
    let t = 0;
    let steps = 0;
    while (t < 1.5) {
      t += this.dt;
      a = (t / 1.5) * turns * Math.PI * 2;
      pet.r.yaw.target = Math.sin(a) * 1.05;
      this.air = Math.abs(Math.sin(a * 2)) * 6;
      if (Math.floor(t / 0.14) > steps) {
        steps = Math.floor(t / 0.14);
        audio.step();
      }
      yield;
    }
    this.air = 0;
    pet.r.yaw.target = 0;
    pet.setFace('dizzy');
    pet.wag(0.2, 5);
    audio.dizzy();
    pet.r.lean.target = 0.04;
    yield 0.4;
    pet.r.lean.target = -0.04;
    yield 0.4;
    this.relax('smile');
    yield 0.4;
    this.relax();
  }

  *dance() {
    const pet = this.pet;
    pet.setFace('happy');
    pet.wag(1, 14);
    audio.trill();
    for (let i = 0; i < 6; i++) {
      const s = i % 2 ? 1 : -1;
      pet.r.lean.target = s * 0.1;
      pet.r.yaw.target = s * 0.26;
      pet.paws(0, s > 0 ? -44 : 0, 0, s < 0 ? -44 : 0);
      pet.squash(0.08);
      // It sings its own little tune, a "la" and a tap for every step.
      if (i) audio.la(i - 1);
      audio.step();
      const t = this.at.top;
      if (t && i % 2) this.fx.notes(t[0], t[1] - 6, 1);
      yield 0.3;
    }
    this.relax('smile');
    yield 0.4;
    this.relax();
  }

  *lookAround() {
    const pet = this.pet;
    const s = Math.random() < 0.5 ? -1 : 1;
    if (Math.random() < 0.45) audio.curious();
    pet.r.yaw.target = s * 0.46;
    pet.lookFree = [s * 0.9, 0.1];
    pet.ears(s * 0.1, s * 0.1);
    yield rand(0.6, 1.1);
    pet.r.yaw.target = -s * 0.3;
    pet.lookFree = [-s * 0.8, 0.15];
    yield rand(0.5, 0.9);
    this.relax();
  }

  *scratch() {
    const pet = this.pet;
    pet.setFace('bliss');
    pet.r.lean.target = 0.08;
    for (let i = 0; i < 7; i++) {
      pet.paws(0, 0, 10, i % 2 ? -92 : -80);
      pet.r.earR.kick(4);
      audio.scritch();
      yield 0.08;
    }
    pet.paws();
    this.relax('smile');
    audio.coo();
    yield 0.3;
    this.relax();
  }

  *hum() {
    const pet = this.pet;
    pet.setFace('smile');
    for (let i = 0; i < 4; i++) {
      pet.r.lean.target = (i % 2 ? 1 : -1) * 0.05;
      audio.chirp(audio.v * pick([1, 1.12, 1.25, 1.5]), 0.26, { contour: [[0, 1], [1, 1]], vib: 0.015, vol: 0.2 });
      const t = this.at.top;
      if (t) this.fx.notes(t[0] + rand(-30, 30), t[1] + 8, 1);
      yield 0.34;
    }
    this.relax();
  }

  /** Looks up at you, wide-eyed, and says something in its own language. */
  *chatter() {
    const pet = this.pet;
    pet.setFace('talk');
    pet.r.pitch.target = 0.08;
    const n = 4 + Math.floor(rand(4));
    audio.babble(n);
    for (let i = 0; i < n; i++) {
      pet.mouthExtra = rand(0.3, 0.7);
      pet.r.mw.target = rand(0.4, 0.8);
      yield 0.08;
      pet.mouthExtra = 0;
      yield 0.05;
    }
    this.relax('smile');
    yield 0.3;
    this.relax();
  }

  // ── Reactions to being touched ──

  *boop() {
    const pet = this.pet;
    audio.boop();
    haptic('light');
    pet.setFace('boop');
    pet.r.noseS.x = 0.55;
    pet.r.noseS.kick(10);
    pet.squash(0.1);
    pet.r.pitch.target = 0.1;
    pet.ears(-0.16);
    yield 0.34;
    if (Math.random() < 0.24) {
      yield* this.sneeze();
      return;
    }
    pet.setFace(pick(['cheeky', 'happy']));
    audio.chirrup();
    pet.r.pitch.target = 0;
    yield 0.5;
    this.relax();
  }

  *giggle() {
    const pet = this.pet;
    audio.giggle();
    haptic('boing');
    pet.setFace('joy');
    pet.wag(1, 16);
    for (let i = 0; i < 4; i++) {
      pet.squash(0.13);
      pet.r.lean.target = (i % 2 ? 1 : -1) * 0.06;
      yield 0.11;
    }
    pet.r.lean.target = 0;
    const b = this.at.belly;
    if (b) this.fx.hearts(b[0], b[1] - 16, 2, 30);
    audio.heart();
    yield 0.35;
    this.relax('smile');
    yield 0.5;
    this.relax();
  }

  /** Tickled too much: laughs so hard it rolls right over. */
  *rollOver() {
    const pet = this.pet;
    audio.giggle();
    haptic('success');
    pet.setFace('joy');
    pet.wag(1.2, 18);
    pet.squash(0.2);
    yield 0.1;
    audio.wee();
    let t = 0;
    const dir = Math.random() < 0.5 ? -1 : 1;
    while (t < 0.9) {
      t += this.dt;
      const p = clamp(t / 0.9);
      const ease = p * p * (3 - 2 * p);
      pet.r.spin.x = ease * Math.PI * 2 * dir;
      pet.r.spin.target = pet.r.spin.x;
      this.air = Math.sin(p * Math.PI) * 36;
      yield;
    }
    pet.r.spin.set(0);
    this.air = 0;
    pet.squash(0.22);
    const c = this.at.center;
    if (c) this.fx.heartBurst(c[0], c[1], 10);
    audio.happy();
    yield 0.6;
    this.relax('smile');
    yield 0.5;
    this.relax();
  }

  *pat() {
    const pet = this.pet;
    pet.setFace('purr');
    pet.ears(0.22);
    pet.squash(0.05);
    audio.chirp(audio.v * 1.1, 0.16, { contour: [[0, 1], [1, 1.2]], vol: 0.18 });
    yield 0.4;
    this.relax();
  }

  *flick() {
    const pet = this.pet;
    pet.setFace('surprised');
    audio.chirrup();
    pet.squash(0.12);
    pet.r.earL.kick(14);
    pet.r.earR.kick(-14);
    yield 0.3;
    pet.setFace('pout');
    yield 0.3;
    this.relax('smile');
    yield 0.2;
    this.relax();
  }

  /** Landed after being dropped from a height. */
  *landed(height) {
    const pet = this.pet;
    if (height > 180) {
      audio.ow();
      audio.stars(0.25);
      pet.setFace('dizzy');
      const t = this.at.top;
      if (t) this.fx.stars(t[0], t[1], 6);
      pet.r.lean.target = 0.05;
      yield 0.5;
      pet.r.lean.target = -0.05;
      yield 0.5;
      pet.setFace('pout');
      yield 0.5;
      pet.setFace('smile');
      yield 0.4;
    } else {
      audio.happy();
      pet.setFace('happy');
      yield 0.5;
    }
    this.relax();
  }

  /** Asks for what it needs. */
  *ask(what) {
    const pet = this.pet;
    if (what === 'hungry') {
      pet.setFace('hungry');
      pet.paws(14, -12, -14, -12);
      audio.rumble();
      pet.jiggle(5);
      yield 0.6;
      audio.whine();
      yield 1;
    } else if (what === 'sleepy') {
      yield* this.yawn();
      return;
    } else if (what === 'dirty') {
      pet.setFace('pout');
      pet.r.lean.target = 0.04;
      audio.sniff();
      yield 0.8;
    } else if (what === 'lonely') {
      pet.setFace('sad');
      pet.ears(0.34);
      audio.sad();
      yield 1.3;
    } else if (what === 'bored') {
      pet.setFace('pout');
      pet.r.yaw.target = 0.3;
      audio.mumble();
      yield 1.1;
    }
    this.relax();
  }

  *greet() {
    const pet = this.pet;
    pet.setFace('starry');
    pet.wag(1.3, 18);
    audio.hello();
    pet.ears(-0.3);
    yield* this.hop(70, 0.42, { sound: false });
    pet.setFace('joy');
    yield* this.hop(46, 0.34, { sound: false });
    const c = this.at.center;
    if (c) this.fx.hearts(c[0], c[1] - 40, 5, 60);
    audio.happy();
    pet.paws(6, -44, -6, -44);
    pet.setFace('happy');
    yield 0.8;
    this.relax('smile');
    yield 0.6;
    this.relax();
  }

  *celebrate() {
    const pet = this.pet;
    pet.setFace('starry');
    pet.wag(1.3, 18);
    pet.paws(-10, -56, 10, -56);
    for (let i = 0; i < 3; i++) {
      audio.yay(i);
      yield* this.hop(56, 0.36, { sound: false });
    }
    pet.setFace('joy');
    yield 0.7;
    this.relax('smile');
    yield 0.5;
    this.relax();
  }
}

/** Idle behaviours, weighted by how the pet feels. */
export function idleScene(actor, mood) {
  const options = {
    joyful: [['dance', 2], ['hum', 2], ['chaseTail', 1.5], ['wave', 1.5], ['lookAround', 3], ['scratch', 1], ['chatter', 2], ['stretch', 1], ['sneeze', 0.4]],
    content: [['lookAround', 4], ['hum', 1.5], ['wave', 1], ['scratch', 1.5], ['stretch', 1.5], ['chatter', 1.5], ['sneeze', 0.5], ['yawn', 1]],
    okay: [['lookAround', 4], ['scratch', 1], ['yawn', 1.5], ['chatter', 1], ['stretch', 1]],
  }[mood] ?? [['lookAround', 3], ['yawn', 1]];
  let total = 0;
  for (const [, w] of options) total += w;
  let r = Math.random() * total;
  for (const [name, w] of options) {
    r -= w;
    if (r <= 0) return actor[name]();
  }
  return actor.lookAround();
}

export { lerp };
