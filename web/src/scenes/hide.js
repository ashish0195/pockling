// Hide and Seek. Cover your eyes, count to three, then find where it went. A tail poking out, a giggle,
// a wobbling basket: it's terrible at hiding, and that's the fun of it.
import { audio } from '../audio.js';
import { makeCanvas } from '../bake/paint.js';
import { drawSky, roomLayout } from '../bake/room.js';
import { ambient, defineRoomArt, game, petLight, quality, refreshLight } from '../game.js';
import { haptic } from '../platform.js';
import { clamp, pick, rand, smooth } from '../util.js';
import { endGame, gameBar, setHint, setScore, setSide } from './gameui.js';
import { home } from './home.js';

const ROUNDS = 4;

const lin = (x, x0, y0, x1, y1, ...c) => {
  const g = x.createLinearGradient(x0, y0, x1, y1);
  c.forEach((col, i) => g.addColorStop(i / (c.length - 1), col));
  return g;
};

const ART = {
  box(x, W, H) {
    x.fillStyle = lin(x, 0, 30, 0, H, '#e0b07d', '#b98453');
    x.beginPath();
    x.roundRect(10, 34, W - 20, H - 38, 8);
    x.fill();
    x.fillStyle = 'rgba(120,80,40,0.32)';
    x.fillRect(W / 2 - 13, 34, 26, H - 38);
    x.fillStyle = lin(x, 0, 12, 0, 44, '#ecc595', '#cf9a68');
    x.beginPath();
    x.moveTo(10, 36);
    x.lineTo(30, 14);
    x.lineTo(W - 30, 14);
    x.lineTo(W - 10, 36);
    x.closePath();
    x.fill();
  },
  basket(x, W, H) {
    x.fillStyle = lin(x, 0, 20, 0, H, '#f7d78f', '#d9a24a');
    x.beginPath();
    x.moveTo(8, 28);
    x.lineTo(W - 8, 28);
    x.lineTo(W - 22, H - 6);
    x.quadraticCurveTo(W / 2, H + 4, 22, H - 6);
    x.closePath();
    x.fill();
    x.strokeStyle = 'rgba(150,100,30,0.5)';
    x.lineWidth = 3;
    for (let i = 1; i < 5; i++) {
      x.beginPath();
      x.moveTo(8 + i * 3, 28 + i * 20);
      x.lineTo(W - 8 - i * 3, 28 + i * 20);
      x.stroke();
    }
    for (let i = 0; i < 9; i++) {
      x.beginPath();
      x.moveTo(14 + (i * (W - 28)) / 8, 28);
      x.lineTo(30 + (i * (W - 60)) / 8, H - 6);
      x.stroke();
    }
    x.fillStyle = '#f0c46a';
    x.beginPath();
    x.roundRect(0, 18, W, 16, 8);
    x.fill();
    // Laundry poking out.
    x.fillStyle = '#ff9fc0';
    x.beginPath();
    x.arc(W * 0.3, 20, 16, Math.PI, 0);
    x.fill();
    x.fillStyle = '#9fd8ff';
    x.beginPath();
    x.arc(W * 0.66, 20, 20, Math.PI, 0);
    x.fill();
  },
  cushion(x, W, H) {
    x.fillStyle = lin(x, 0, 10, 0, H, '#c4a6ff', '#8f6be0');
    x.beginPath();
    x.moveTo(12, H * 0.28);
    x.quadraticCurveTo(W / 2, 4, W - 12, H * 0.28);
    x.quadraticCurveTo(W + 6, H * 0.62, W - 8, H - 6);
    x.quadraticCurveTo(W / 2, H + 6, 8, H - 6);
    x.quadraticCurveTo(-6, H * 0.62, 12, H * 0.28);
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.22)';
    x.beginPath();
    x.ellipse(W * 0.32, H * 0.3, W * 0.2, H * 0.11, -0.2, 0, 6.3);
    x.fill();
    x.fillStyle = '#fff2a8';
    x.beginPath();
    x.arc(W / 2, H * 0.56, 6, 0, 6.3);
    x.fill();
  },
  pot(x, W, H) {
    const cx = W / 2;
    const tones = ['#4fb36f', '#62c67e', '#3f9c62', '#7fd691'];
    [-0.8, -0.36, 0, 0.4, 0.84].forEach((a, i) => {
      x.save();
      x.translate(cx, H * 0.5);
      x.rotate(a);
      x.fillStyle = tones[i % 4];
      x.beginPath();
      x.ellipse(0, -H * 0.27, W * 0.13, H * 0.27, 0, 0, 6.3);
      x.fill();
      x.restore();
    });
    x.fillStyle = lin(x, 0, 0, W, 0, '#ffd9bd', '#ec9f7d');
    x.beginPath();
    x.moveTo(W * 0.12, H * 0.48);
    x.lineTo(W * 0.88, H * 0.48);
    x.lineTo(W * 0.74, H - 4);
    x.quadraticCurveTo(cx, H + 2, W * 0.26, H - 4);
    x.closePath();
    x.fill();
  },
};

function bakeSpot(kind, w, h, Q) {
  const [c, x] = makeCanvas(w * Q, h * Q);
  x.scale(Q, Q);
  ART[kind](x, w, h);
  return { canvas: c, w, h };
}

export const hideGame = {
  enter() {
    const { actor, pet, view, assets } = game;
    defineRoomArt();
    const { u, w } = view;
    const Q = quality();
    const defs = [['box', 150, 120], ['basket', 138, 116], ['cushion', 158, 104], ['pot', 120, 156]];
    defs.forEach(([k, sw, sh]) => assets.define(`hide.${k}`, () => bakeSpot(k, sw * u, sh * u, Q)));
    const fy = view.floorY;
    this.spots = [
      { kind: 'box', x: w * 0.22, y: fy + 60 * u, wob: 0, vw: 0 },
      { kind: 'basket', x: w * 0.76, y: fy + 66 * u, wob: 0, vw: 0 },
      { kind: 'cushion', x: w * 0.5, y: fy + 118 * u, wob: 0, vw: 0 },
      { kind: 'pot', x: w * 0.13, y: fy - 16 * u, wob: 0, vw: 0 },
      { kind: 'box', x: w * 0.72, y: fy - 22 * u, wob: 0, vw: 0, small: true },
    ];
    this.round = 0;
    this.score = 0;
    this.wrong = 0;
    this.phase = 'intro';
    this.hidden = null;
    this.cover = 0;
    this.giggleIn = 0;
    actor.stop();
    actor.scale = 1;
    actor.air = 0;
    actor.x = w / 2;
    actor.y = fy + 10 * u;
    pet.alpha = 1;
    pet.settle();
    actor.relax('cheeky');
    gameBar('0');
    this.side();
    this.startRound();
  },

  exit() {
    game.pet.alpha = 1;
    game.actor.scale = 1;
  },

  resize() {
    this.enter();
  },

  side() {
    setSide(`Round ${Math.min(this.round + 1, ROUNDS)} of ${ROUNDS}`);
  },

  startRound() {
    const { actor, pet } = game;
    this.phase = 'wave';
    this.wrong = 0;
    this.front = false;
    this.showPet = false;
    this.hidden = null;
    game.actor.scale = 1;
    game.actor.x = game.view.w / 2;
    game.actor.y = game.view.floorY + 10 * game.view.u;
    this.side();
    setHint(`${game.state.pet.name} wants to hide!`);
    actor.play((function* () {
      pet.setFace('cheeky');
      pet.wag(1, 14);
      yield 0.35;
      yield* actor.wave();
      hideGame.phase = 'covering';
      setHint('No peeking…');
      audio.whoosh();
    })());
  },

  /** Screen fully covered: move the pet behind something. */
  moveToSpot() {
    const { actor, pet } = game;
    const options = this.spots.filter((s) => s !== this.lastSpot);
    const spot = pick(options);
    this.lastSpot = spot;
    this.hidden = spot;
    actor.stop();
    const { u } = game.view;
    const tex = game.assets.get(`hide.${spot.kind}`);
    actor.x = spot.x + rand(-14, 14) * u;
    actor.y = spot.y - 2 * u;
    // Just small enough for everything but the tips of its ears to fit behind.
    this.hiddenScale = ((tex.h / u) * (spot.small ? 0.7 : 1) * 0.86) / (205 * pet.stage.scale);
    actor.scale = this.hiddenScale;
    actor.relax('cheeky');
    pet.settle();
    // How much it gives itself away: more in the early rounds.
    this.peek = this.round < 2 ? 'tail' : 'none';
  },

  down(x, y) {
    audio.unlock();
    if (this.phase !== 'seek') return;
    const { u } = game.view;
    const { assets } = game;
    let hit = null;
    let best = Infinity;
    for (const s of this.spots) {
      const tex = assets.get(`hide.${s.kind}`);
      const k = s.small ? 0.7 : 1;
      const cx = s.x;
      const cy = s.y - (tex.h * k) / 2;
      const d = Math.hypot((x - cx) / ((tex.w * k) / 2 + 12 * u), (y - cy) / ((tex.h * k) / 2 + 12 * u));
      if (d < 1 && d < best) {
        best = d;
        hit = s;
      }
    }
    if (!hit) return;
    hit.vw = 8;
    if (hit === this.hidden) this.found(hit);
    else {
      this.wrong += 1;
      audio.plop();
      haptic('light');
      setHint(pick(['Not there!', 'Nope!', 'Try somewhere else', 'Colder…']));
      if (this.wrong === 2) this.giggleIn = 0;
    }
  },

  move() {},
  up() {},

  found(spot) {
    const { actor, pet, fx } = game;
    this.phase = 'found';
    const points = Math.max(1, 4 - this.wrong);
    this.score += points;
    setScore(`${this.score}`);
    setHint('Found you!');
    audio.giggle();
    haptic('success');
    this.showPet = true;
    actor.play((function* () {
      pet.setFace('joy');
      pet.wag(1.3, 18);
      const startY = actor.y;
      const endY = spot.y + 24 * game.view.u;
      const from = hideGame.hiddenScale;
      let t = 0;
      audio.boing();
      while (t < 0.36) {
        t += actor.dt;
        const p = smooth(t / 0.36);
        actor.scale = from + p * (0.92 - from);
        actor.y = startY + (endY - startY) * p;
        actor.air = Math.sin(p * Math.PI) * 120 * game.view.u;
        if (p > 0.45) hideGame.front = true;
        yield;
      }
      actor.air = 0;
      pet.squash(0.16);
      const c = pet.anchors.center;
      if (c) {
        fx.heartBurst(c[0], c[1], 10);
        fx.sparkles(c[0], c[1], 8, 70);
      }
      audio.happy();
      yield 0.9;
      pet.setFace('smile');
      hideGame.round += 1;
      if (hideGame.round < ROUNDS) {
        hideGame.front = false;
        hideGame.showPet = false;
        hideGame.hidden = null;
      }
      if (hideGame.round >= ROUNDS) {
        hideGame.phase = 'over';
        hideGame.hidden = null;
        actor.scale = 1;
        actor.relax('joy');
        setHint('');
        endGame('hide', 'Found every time!', hideGame.score, `${esc(game.state.pet.name)} thinks it hid really well. Please don't say anything.`, hideGame, home);
      } else {
        hideGame.startRound();
      }
    })());
  },

  update(dt) {
    const { actor, fx } = game;
    actor.update(dt);
    fx.update(dt);
    refreshLight();
    for (const s of this.spots) {
      s.vw += -s.wob * 180 * dt;
      s.vw *= Math.exp(-6 * dt);
      s.wob += s.vw * dt;
    }
    if (this.phase === 'covering') {
      this.cover = clamp(this.cover + dt * 2.6);
      if (this.cover >= 1) {
        this.phase = 'counting';
        this.countT = 0;
        this.moveToSpot();
        audio.chirp(audio.v, 0.1, { contour: [[0, 1], [1, 1.2]], vol: 0.1 });
      }
    } else if (this.phase === 'counting') {
      this.countT += dt;
      // Little feet running about in the dark.
      this.patIn = (this.patIn ?? 0) - dt;
      if (this.patIn <= 0) {
        this.patIn = 0.12;
        audio.burst(0.03, { vol: 0.06, freq: rand(500, 900), q: 1.2 });
      }
      const n = Math.min(3, Math.floor(this.countT / 0.55) + 1);
      if (n !== this.counted) {
        this.counted = n;
        setHint(['One…', 'One… two…', 'One… two… three…'][n - 1]);
      }
      if (this.countT > 1.65) {
        this.counted = 0;
        this.phase = 'revealing';
        setHint(`Where's ${game.state.pet.name}?`);
        this.giggleIn = 3;
      }
    } else if (this.phase === 'revealing') {
      this.cover = clamp(this.cover - dt * 2.6);
      if (this.cover <= 0) this.phase = 'seek';
    } else if (this.phase === 'seek') {
      this.giggleIn -= dt;
      if (this.giggleIn <= 0 && this.hidden) {
        this.giggleIn = rand(3, 4.5);
        audio.chirp(audio.v * 1.3, 0.07, { contour: [[0, 1.2], [1, 0.9]], vol: 0.13 });
        audio.chirp(audio.v * 1.32, 0.07, { at: 0.09, contour: [[0, 1.2], [1, 0.9]], vol: 0.13 });
        audio.chirp(audio.v * 1.35, 0.07, { at: 0.18, contour: [[0, 1.2], [1, 0.9]], vol: 0.13 });
        this.hidden.vw += 4.5;
      }
    }
  },

  draw(g) {
    const { assets, actor, pet, view, fx } = game;
    const { w, horizon, h, u } = view;
    const light = game.light;
    const amb = ambient(0);
    const lay = roomLayout(view);
    const win = lay.window;
    drawSky(g, assets, light, win.x - win.w, win.y - 20 * u, win.w * 2, win.h + 40 * u);
    g.sprite(assets.get('room.wall'), 0, 0, { ax: 0, ay: 0, w: w + 2, tint: amb });
    g.sprite(assets.get('room.floor'), 0, horizon, { ax: 0, ay: 0, w: w + 2, tint: amb });

    const drawSpot = (s) => {
      const tex = assets.get(`hide.${s.kind}`);
      const k = s.small ? 0.7 : 1;
      g.sprite(assets.get('fx.shadow'), s.x, s.y + 2 * u, { w: tex.w * k * 1.05, h: 24 * u * k, alpha: 0.6 });
      g.sprite(tex, s.x, s.y + 4 * u, { ay: 1, w: tex.w * k, h: tex.h * k, rot: s.wob * 0.11, tint: amb });
    };

    const hiding = Boolean(this.hidden);
    const sorted = [...this.spots].sort((a, b) => a.y - b.y);
    for (const s of sorted) {
      if (hiding && s === this.hidden && !this.front) {
        // Behind its hiding place, with only what it forgot to tuck in showing. Later rounds, not even that.
        const sc = actor.scale * u;
        if (this.showPet || this.peek === 'tail') pet.draw(g, actor.x, actor.y, sc, petLight(amb));
      }
      drawSpot(s);
    }

    if (!hiding || this.front) {
      const st = pet.stage.scale * actor.scale * u;
      g.sprite(assets.get('fx.shadow'), actor.x, actor.y + 4 * u, { w: 236 * st, h: 50 * st, alpha: 0.8 });
      pet.draw(g, actor.x, actor.y, actor.scale * u, petLight(amb));
    }
    fx.draw(g);

    // Paws over your eyes, sliding in from the sides.
    if (this.cover > 0) {
      const c = smooth(this.cover);
      g.rect(0, 0, w, h, [0.24, 0.13, 0.18], c * 0.94);
      const paw = pet.tex('paw');
      const pad = pet.tex('pawPad');
      const size = Math.max(w * 1.05, h * 0.5);
      for (const side of [-1, 1]) {
        const x = w * 0.5 + side * w * (1.05 - c * 0.82);
        const rot = side * -0.3;
        g.sprite(paw, x, h * 0.5, { w: size, h: size, rot, flip: side > 0 });
        g.sprite(pad, x, h * 0.5, { w: size, h: size, rot, flip: side > 0 });
      }
    }
  },
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
