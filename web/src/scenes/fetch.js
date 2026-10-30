// Fetch. Flick the ball up the screen; the harder the flick, the further it goes. The pet tears after it,
// sometimes catches it in the air, and brings it back. Five throws.
import { audio } from '../audio.js';
import { definePark, drawPark } from '../bake/park.js';
import { drawSky } from '../bake/room.js';
import { ambient, game, petLight, quality, refreshLight } from '../game.js';
import { haptic } from '../platform.js';
import { clamp, lerp } from '../util.js';
import { endGame, gameBar, setHint, setScore, setSide } from './gameui.js';
import { home } from './home.js';

const THROWS = 5;
const HOME_Z = 0.22;

export const fetchGame = {
  enter() {
    const { assets, actor, pet, view } = game;
    definePark(assets, quality());
    actor.stop();
    actor.relax('starry');
    actor.scale = 1;
    actor.air = 0;
    pet.settle();
    pet.wag(1, 14);
    this.score = 0;
    this.throws = 0;
    this.phase = 'ready';
    this.ball = { x: 0, z: 0, h: 0, vx: 0, vz: 0, vh: 0, spin: 0, held: true, out: false };
    this.petZ = HOME_Z;
    this.petX = view.w * 0.5;
    this.touch = null;
    this.layout();
    gameBar('0 m');
    setSide(`🎾 ${THROWS}`);
    setHint(`Flick the ball up the screen`);
    this.waitT = 0;
    audio.hello();
  },

  exit() {
    game.actor.scale = 1;
  },

  resize() {
    definePark(game.assets, quality());
    this.layout();
  },

  layout() {
    const { view } = game;
    const { h, u } = view;
    this.groundY = h - 300 * u * 0.92;
    this.nearY = h - 150 * u;
    this.farY = this.groundY + 26 * u;
    this.ballHome = [view.w / 2, h - 86 * u];
  },

  /** Screen position for a point on the lawn: z 0 is at your feet, 1 is far away. */
  project(x, z) {
    const { view } = game;
    const t = 1 - (1 - clamp(z)) ** 1.8;
    const y = lerp(this.nearY, this.farY, t);
    const scale = lerp(1, 0.3, t);
    const sx = view.w / 2 + (x - view.w / 2) * scale;
    return [sx, y, scale];
  },

  down(x, y, id) {
    audio.unlock();
    if (this.phase !== 'ready' || this.touch) return;
    this.touch = { id, x0: x, y0: y, x, y, t: performance.now(), hist: [[x, y, performance.now()]] };
    game.pet.lookAt([x, y]);
    game.pet.setFace('drool');
    audio.click();
  },

  move(x, y, id) {
    const t = this.touch;
    if (!t || t.id !== id) return;
    t.x = x;
    t.y = y;
    t.hist.push([x, y, performance.now()]);
    if (t.hist.length > 7) t.hist.shift();
    game.pet.lookAt([x, y]);
  },

  up(x, y, id) {
    const t = this.touch;
    if (!t || t.id !== id) return;
    this.touch = null;
    const { u } = game.view;
    const first = t.hist[0];
    const last = t.hist[t.hist.length - 1];
    const dt = Math.max(0.016, (last[2] - first[2]) / 1000);
    const vy = (first[1] - last[1]) / dt;
    const vx = (last[0] - first[0]) / dt;
    if (vy < 240 * u) {
      game.pet.setFace('cheeky');
      setHint('Flick it harder, upward!');
      return;
    }
    this.throwBall(vx, vy);
  },

  throwBall(vx, vy) {
    const { view } = game;
    const { u } = view;
    const power = clamp(vy / (2400 * u), 0.12, 1);
    const b = this.ball;
    b.x = view.w / 2 + (this.touchX ?? 0);
    b.z = 0;
    b.h = 60 * u;
    b.vz = 0.3 + power * 0.48;
    b.vh = (320 + power * 460) * u;
    b.vx = clamp(vx * 0.42, -340 * u, 340 * u);
    b.spin = power * 16;
    b.held = false;
    b.out = true;
    b.bounces = 0;
    this.throws += 1;
    this.phase = 'flying';
    this.flyT = 0;
    this.caught = false;
    setHint('');
    setSide(`🎾 ${THROWS - this.throws}`);
    audio.whoosh();
    haptic('medium');
    const { pet } = game;
    pet.setFace('starry');
    audio.chirrup();
    pet.wag(1.3, 18);
    pet.squash(0.15);
  },

  update(dt) {
    const { actor, pet, fx, view } = game;
    const { u } = view;
    actor.update(dt);
    fx.update(dt);
    refreshLight();
    const b = this.ball;

    if (this.phase === 'flying') {
      this.flyT += dt;
      b.z += b.vz * dt;
      b.x += b.vx * dt;
      b.h += b.vh * dt;
      b.vh -= 1000 * u * dt;
      b.vx *= Math.exp(-0.3 * dt);
      const margin = view.w * 0.8;
      b.x = clamp(b.x, view.w / 2 - margin, view.w / 2 + margin);
      if (b.h <= 0) {
        b.h = 0;
        b.bounces += 1;
        if (b.bounces < 3 && Math.abs(b.vh) > 140 * u) {
          b.vh = Math.abs(b.vh) * 0.42;
          b.vz *= 0.56;
          b.vx *= 0.7;
          audio.plop();
        } else {
          b.vh = 0;
          b.vz *= Math.exp(-5 * dt);
          b.vx *= Math.exp(-5 * dt);
        }
      }
      b.z = Math.min(b.z, 0.98);
      // It watches the ball go over its head, then tears off after it.
      if (this.flyT > 0.28) this.runTo(b.x, b.z, dt, 0.72);
      else pet.r.pitch.target = -0.2;
      // Close enough, and the ball within jumping reach: catch it in the air.
      const close = Math.abs(this.petZ - b.z) < 0.05 && Math.abs(this.petX - b.x) < 110 * u;
      if (close && !this.caught && this.flyT > 0.28) {
        if (b.h > 12 * u && b.h < 170 * u) {
          this.catchBall(true);
        } else if (b.h <= 12 * u) {
          this.catchBall(false);
        }
      }
    } else if (this.phase === 'return') {
      const done = this.runTo(view.w / 2, HOME_Z, dt, 0.6);
      b.x = this.petX;
      b.z = this.petZ;
      if (done) this.dropBall();
    } else if (this.phase === 'ready' && this.touch) {
      b.held = true;
    }

    // Put the actor where its depth says, scaled for the distance.
    const [sx, sy, sc] = this.project(this.petX, this.petZ);
    actor.x = sx;
    actor.y = sy;
    actor.scale = sc;
  },

  runTo(x, z, dt, speed) {
    const { pet, actor, view } = game;
    const dz = z - this.petZ;
    const dx = x - this.petX;
    const stepZ = Math.sign(dz) * Math.min(Math.abs(dz), speed * dt);
    const stepX = Math.sign(dx) * Math.min(Math.abs(dx), (420 * view.u) * dt);
    this.petZ += stepZ;
    this.petX += stepX;
    const moving = Math.abs(dz) > 0.012 || Math.abs(dx) > 5;
    pet.walking = moving ? 1.6 : 0;
    pet.r.yaw.target = moving ? clamp(dx / (140 * view.u), -0.8, 0.8) : 0;
    pet.r.pitch.target = dz > 0.02 ? 0.3 : dz < -0.02 ? -0.12 : 0;
    if (moving) {
      this.phaseStep = (this.phaseStep ?? 0) + dt * 15;
      actor.air = Math.abs(Math.sin(this.phaseStep)) * 16 * actor.scale * view.u;
      const q = Math.cos(this.phaseStep * 2);
      pet.r.sy.target = 1 + q * 0.05;
      pet.r.sx.target = 1 - q * 0.04;
    } else {
      actor.air = 0;
      pet.r.sy.target = 1;
      pet.r.sx.target = 1;
    }
    return !moving;
  },

  catchBall(inAir) {
    const { actor, pet, view, fx } = game;
    const b = this.ball;
    this.caught = true;
    b.held = true;
    b.out = false;
    pet.walking = 0;
    const metres = Math.round(b.z * 62 + 3);
    const bonus = inAir ? 10 : 0;
    this.score += metres + bonus;
    setScore(`${this.score} m`);
    audio.chomp();
    haptic(inAir ? 'success' : 'light');
    this.phase = 'caught';
    const m = pet.anchors.mouth;
    if (m) {
      fx.sparkles(m[0], m[1], inAir ? 12 : 4, 30);
      if (inAir) fx.stars(m[0], m[1], 6);
    }
    if (inAir) game.ui.toast('Nice catch! +10');
    actor.play((function* () {
      pet.setFace(inAir ? 'starry' : 'happy');
      pet.mouthExtra = 0.34;
      if (inAir) {
        yield* actor.hop(120 * view.u, 0.46, { sound: false });
      } else {
        yield 0.2;
      }
      audio.chirrup();
      pet.setFace('happy');
      fetchGame.phase = 'return';
    })());
  },

  dropBall() {
    const { actor, pet, fx } = game;
    this.phase = 'dropping';
    actor.play((function* () {
      pet.walking = 0;
      actor.air = 0;
      pet.r.yaw.target = 0;
      pet.r.pitch.target = 0;
      pet.setFace('starry');
      pet.mouthExtra = 0;
      audio.plop();
      fetchGame.ball.held = false;
      fetchGame.ball.h = 0;
      pet.wag(1.3, 18);
      yield 0.3;
      const c = pet.anchors.center;
      if (c) fx.hearts(c[0], c[1] - 40, 3, 40);
      audio.happy();
      yield* actor.hop(46, 0.36, { sound: false });
      if (fetchGame.throws >= THROWS) {
        pet.setFace('joy');
        const best = fetchGame.score;
        endGame('fetch', 'Good throwing!', best, `${esc(game.state.pet.name)} wants to go again. ${esc(game.state.pet.name)} always wants to go again.`, fetchGame, home);
        fetchGame.phase = 'over';
      } else {
        fetchGame.phase = 'ready';
        const b = fetchGame.ball;
        b.held = true;
        b.z = 0;
        b.h = 0;
        setHint(`${THROWS - fetchGame.throws} more`);
        pet.setFace('drool');
        pet.lookAt(null);
      }
    })());
  },

  draw(g) {
    const { assets, actor, pet, view, fx } = game;
    const { w, u } = view;
    const light = game.light;
    const amb = ambient(0);
    drawSky(g, assets, light, 0, 0, w, this.groundY + 20);
    if (light.sun !== null) {
      g.sprite(assets.get('sky.sun'), w * 0.76, this.groundY * 0.3, { w: 180 * u, h: 180 * u, alpha: clamp(1 - light.night) });
    }
    if (light.moon !== null) g.sprite(assets.get('sky.moon'), w * 0.76, this.groundY * 0.3, { w: 140 * u, h: 140 * u, alpha: light.night });
    drawPark(g, assets, view, 340, amb);

    const b = this.ball;
    const [ballX, ballY, ballS] = this.project(b.x, b.z);
    const ballTex = assets.get('prop.ball');

    // Ball's shadow on the grass.
    if (b.out) {
      g.sprite(assets.get('fx.shadow'), ballX, ballY, { w: 66 * u * ballS, h: 18 * u * ballS, alpha: clamp(1 - b.h / (420 * u)) * 0.8 });
    }

    const ballBehind = b.out && b.z > this.petZ;
    const paintBall = () => {
      const size = 58 * u * ballS;
      g.sprite(ballTex, ballX, ballY - b.h * ballS - size * 0.4, { w: size, h: size, rot: (b.spin * game.time) % 6.28 });
    };
    if (ballBehind) paintBall();

    const st = pet.stage.scale * actor.scale * u;
    g.sprite(assets.get('fx.shadow'), actor.x, actor.y + 3 * u * actor.scale, { w: 236 * st, h: 50 * st, alpha: clamp(1 - actor.air / (240 * u)) * 0.8 });
    pet.draw(g, actor.x, actor.y, actor.scale * u, petLight(amb));

    if (b.out && !ballBehind) paintBall();

    // Ball in the pet's mouth.
    if (this.phase === 'caught' || this.phase === 'return') {
      const m = pet.anchors.mouth;
      if (m) {
        const size = 44 * u * actor.scale;
        g.sprite(ballTex, m[0], m[1] + 2, { w: size, h: size });
      }
    }

    // Ball at your feet, ready to throw.
    if (this.phase === 'ready' || this.phase === 'dropping') {
      const t = this.touch;
      const px = t ? t.x : this.ballHome[0];
      const py = t ? t.y : this.ballHome[1] + Math.sin(game.time * 3) * 3 * u;
      const size = 74 * u;
      if (!t) g.sprite(assets.get('fx.shadow'), px, py + size * 0.42, { w: 86 * u, h: 22 * u, alpha: 0.7 });
      g.sprite(ballTex, px, py, { w: size, h: size, rot: t ? (t.x - t.x0) * 0.02 : 0 });
    }
    fx.draw(g);
  },
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
