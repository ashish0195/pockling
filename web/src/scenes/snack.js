// Snack Drop. Slide the pet along the floor and catch what falls: good food, gold stars. Catch the food it
// hates three times and it's over.
import { audio } from '../audio.js';
import { drawSky, roomLayout } from '../bake/room.js';
import { FOODS, TASTES } from '../catalog.js';
import { ambient, defineRoomArt, game, petLight, refreshLight } from '../game.js';
import { haptic } from '../platform.js';
import { clamp, pick, rand } from '../util.js';
import { endGame, gameBar, setHint, setScore, setSide } from './gameui.js';
import { home } from './home.js';

const LENGTH = 45;

export const snackGame = {
  enter() {
    const { actor, pet, view } = game;
    defineRoomArt();
    this.layoutRoom = roomLayout(view);
    actor.stop();
    actor.relax('drool');
    actor.scale = 0.78;
    actor.air = 0;
    actor.x = view.w / 2;
    actor.y = view.floorY + 30 * view.u;
    pet.settle();
    pet.wag(1, 13);
    this.targetX = actor.x;
    this.items = [];
    this.spawnIn = 0.8;
    this.t = 0;
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.over = false;
    const taste = TASTES[game.state.pet.breed];
    this.bad = taste.hate;
    this.good = Object.keys(FOODS).filter((f) => f !== taste.hate && f !== 'kibble' && f !== 'cake');
    gameBar('0');
    this.side();
    setHint(`Slide to catch snacks. Dodge the ${FOODS[this.bad].name.toLowerCase()}!`);
    setTimeout(() => setHint(''), 2800);
  },

  exit() {
    game.actor.scale = 1;
    game.pet.mouthExtra = 0;
  },

  resize() {
    defineRoomArt();
    this.layoutRoom = roomLayout(game.view);
    game.actor.y = game.view.floorY + 30 * game.view.u;
  },

  side() {
    const left = Math.max(0, Math.ceil(LENGTH - this.t));
    setSide(`${'💖'.repeat(this.lives)}${'🤍'.repeat(3 - this.lives)}  ${left}s`);
  },

  down(x, y) {
    audio.unlock();
    this.targetX = x;
    game.pet.setFace('drool');
  },

  move(x) {
    if (game.pointer && !this.over) this.targetX = x;
  },

  up() {},

  update(dt) {
    const { actor, pet, fx, view } = game;
    const { u, w, h } = view;
    actor.update(dt);
    fx.update(dt);
    refreshLight();
    if (this.over) return;

    this.t += dt;
    const before = Math.ceil(LENGTH - (this.t - dt));
    if (Math.ceil(LENGTH - this.t) !== before) this.side();

    // The pet runs after your finger.
    const dx = this.targetX - actor.x;
    actor.x += dx * Math.min(1, dt * 12);
    actor.x = clamp(actor.x, 56 * u, w - 56 * u);
    const moving = Math.abs(dx) > 8;
    pet.walking = moving ? 1.4 : 0;
    pet.r.yaw.target = clamp(dx / (120 * u), -0.7, 0.7);
    pet.r.lean.target = clamp(dx / (1800 * u), -0.1, 0.1);
    this.stepPh = (this.stepPh ?? 0) + (moving ? dt * 16 : 0);
    actor.air = moving ? Math.abs(Math.sin(this.stepPh)) * 7 * u : 0;

    // Things fall faster as time goes on.
    const pace = 1 + this.t / 26;
    this.spawnIn -= dt * pace;
    if (this.spawnIn <= 0) {
      this.spawnIn = rand(0.5, 0.95);
      const r = Math.random();
      const kind = r < 0.2 + this.t * 0.002 ? 'bad' : r < 0.27 ? 'star' : 'good';
      const food = kind === 'bad' ? this.bad : kind === 'good' ? pick(this.good) : null;
      this.items.push({ kind, food, x: rand(36 * u, w - 36 * u), y: -40 * u, vy: rand(190, 260) * u * pace, r: rand(-1, 1), spin: rand(-3, 3), wob: rand(6.28) });
    }

    const m = pet.anchors.mouth ?? [actor.x, actor.y - 60];
    let nearest = Infinity;
    let nearestItem = null;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.y += it.vy * dt;
      it.r += it.spin * dt;
      const sway = Math.sin(this.t * 2 + it.wob) * 10 * u;
      it.sx = it.x + sway;
      const dist = Math.hypot(it.sx - m[0], it.y - m[1]);
      if (it.kind !== 'bad' && dist < nearest) {
        nearest = dist;
        nearestItem = it;
      }
      if (dist < 52 * u) {
        this.items.splice(i, 1);
        this.catchItem(it);
        if (this.over) return;
      } else if (it.y > h + 60 * u) {
        this.items.splice(i, 1);
        if (it.kind === 'good') this.combo = 0;
      }
    }
    pet.mouthExtra = clamp(1 - nearest / (170 * u)) * 0.6;
    pet.lookAt(nearestItem ? [nearestItem.sx, nearestItem.y] : null);
    if (this.t >= LENGTH) this.finish();
  },

  catchItem(it) {
    const { pet, fx, actor } = game;
    const m = pet.anchors.mouth ?? [actor.x, actor.y];
    if (it.kind === 'bad') {
      this.lives -= 1;
      this.combo = 0;
      audio.yuck();
      haptic('heavy');
      pet.setFace('yuck');
      pet.squash(0.18);
      pet.jiggle(12);
      fx.crumbs(m[0], m[1], 8, [0.5, 0.75, 0.35]);
      setTimeout(() => {
        if (!this.over) pet.setFace('drool');
      }, 700);
      this.side();
      if (this.lives <= 0) this.finish();
      return;
    }
    this.combo += 1;
    const points = it.kind === 'star' ? 5 : 1 + Math.floor(this.combo / 6);
    this.score += points;
    setScore(`${this.score}`);
    if (it.kind === 'star') {
      audio.chime();
      haptic('success');
      fx.stars(m[0], m[1], 9);
      fx.sparkles(m[0], m[1], 8, 40);
      pet.setFace('starry');
      setTimeout(() => {
        if (!this.over) pet.setFace('drool');
      }, 500);
    } else {
      audio.chomp();
      haptic('soft');
      fx.crumbs(m[0], m[1], 5);
      pet.setFace('chew');
      setTimeout(() => {
        if (!this.over) pet.setFace('drool');
      }, 160);
      if (this.combo > 0 && this.combo % 6 === 0) {
        fx.hearts(m[0], m[1] - 30, 3, 40);
        game.ui.toast(`${this.combo} in a row!`);
        audio.happy();
      }
    }
    pet.squash(0.1);
    pet.jiggle(4);
  },

  finish() {
    if (this.over) return;
    this.over = true;
    const { pet, actor } = game;
    pet.walking = 0;
    actor.air = 0;
    pet.mouthExtra = 0;
    pet.r.yaw.target = 0;
    pet.r.lean.target = 0;
    this.items = [];
    const full = game.state.pet.name.replace(/[<&]/g, '');
    actor.play(actor.celebrate());
    endGame('snack', this.lives > 0 ? 'What a feast!' : 'Too much of the bad stuff', this.score, this.lives > 0 ? `${full} caught ${this.score} points of snacks. Burp.` : `${full} is making a face, but had a great time.`, snackGame, home);
  },

  draw(g) {
    const { assets, actor, pet, view, fx } = game;
    const { w, horizon, u } = view;
    const light = game.light;
    const amb = ambient(0);
    const lay = this.layoutRoom;
    const win = lay.window;
    drawSky(g, assets, light, win.x - win.w, win.y - 20 * u, win.w * 2, win.h + 40 * u);
    g.sprite(assets.get('room.wall'), 0, 0, { ax: 0, ay: 0, w: w + 2, tint: amb });
    g.sprite(assets.get('room.floor'), 0, horizon, { ax: 0, ay: 0, w: w + 2, tint: amb });

    const st = pet.stage.scale * actor.scale * u;
    g.sprite(assets.get('fx.shadow'), actor.x, actor.y + 4 * u, { w: 236 * st, h: 50 * st, alpha: 0.8 });
    pet.draw(g, actor.x, actor.y, actor.scale * u, petLight(amb));

    for (const it of this.items) {
      const size = 62 * u;
      if (it.kind === 'star') {
        g.sprite(assets.get('fx.glow'), it.sx, it.y, { w: size * 1.8, h: size * 1.8, tint: [1, 0.9, 0.5], alpha: 0.7, add: 1 });
        g.sprite(assets.get('fx.star'), it.sx, it.y, { w: size, h: size, rot: it.r });
      } else {
        g.sprite(assets.get(`food.${it.food}.0`), it.sx, it.y, { w: size, h: size, rot: it.r * 0.5 });
        if (it.kind === 'bad') g.sprite(assets.get('fx.glow'), it.sx, it.y, { w: size * 1.3, h: size * 1.3, tint: [1, 0.3, 0.3], alpha: 0.28, add: 1 });
      }
    }
    fx.draw(g);
  },
};
