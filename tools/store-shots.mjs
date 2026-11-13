// Captures the App Store's raw screens, frame by frame so software GL doesn't matter: each moment is staged
// with the game's own hooks, on a phone or iPad sized page with the real safe areas. tools/store-frame.mjs
// then sets them in a device with a headline. Needs the dev server.
//   node tools/store-shots.mjs <out dir> <phone|ipad> [dpr] [moment names...]
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { drive } from './drive.mjs';

const DEVICES = {
  // iPhone Pro Max and iPad Pro 13, the sizes the store's largest slots want.
  phone: { width: 440, height: 956, dpr: 3, safe: [62, 34] },
  ipad: { width: 1032, height: 1376, dpr: 2, safe: [32, 20] },
};

// The six kinds for the lineup, each drawn alone on a clear background as kinds-<breed>.png: breed, coat,
// face, and how its ears sit (the puppy's droop, so it fits beside a friend; the bunny's stand up). Each
// stands with its feet at KIND_FEET of the page's width across and down, its body KIND_BODY of the width
// wide; tools/store-frame.mjs places them by the same two numbers, so change them there too.
const KINDS = [
  ['kitling', 'peach', 'happy', 0], ['puppling', 'honey', 'smile', 1.1], ['bunling', 'lilac', 'smile', -0.4],
  ['foxling', 'tangerine', 'happy', 0], ['cubling', 'milktea', 'happy', 0], ['drakling', 'mint', 'smile', 0],
];
const KIND_BODY = 0.45;
const KIND_FEET = [0.5, 1.2];

const HOLD = `(() => {
  window.__hold = true;
  let n = 20261031;
  Math.random = () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
  // Time passes without drawing, because drawing is the slow part.
  window.__run = (sec, each) => {
    const g = __game;
    const dt = 1 / 30;
    let i = 0;
    for (let t = 0; t < sec; t += dt) {
      each?.(i++);
      g.time += dt;
      g.g.time = g.time;
      g.scene.update(dt);
      if (i % 6 === 0) T.draw();
    }
    T.draw();
  };
  // Where the pet's feet are on screen, after the scene's own camera.
  window.__feet = () => {
    const a = __game.pet.anchors;
    return [a.center[0], a.center[1] + 88 * a.unit];
  };
  // The camera moves in, as it does for a cuddle, so the pet reads at the size of a search result: the
  // stage scales up z times about a point on screen (x, y in CSS pixels), which can also move towards
  // (toX, toY) as far as the stage still fills the screen, and is drawn sharp at that size. The HUD over
  // it stays as it is.
  window.__zoom = (z, x, y, toX = x, toY = y) => {
    const v = __game.view;
    const c = document.getElementById('stage');
    const tx = Math.min(0, Math.max(v.w * (1 - z), toX - z * x));
    const ty = Math.min(0, Math.max(v.h * (1 - z), toY - z * y));
    __game.g.resize(v.w, v.h, devicePixelRatio * z);
    c.style.transformOrigin = '0 0';
    c.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + z + ')';
    T.draw();
  };
})()`;

// A second canvas that keeps its alpha (the game's own is opaque), with its own renderer and textures,
// for drawing a pet alone on nothing.
const ALONE = `(async () => {
  const [{ Renderer, Assets }, { Pet }, { defineFx }, { defineOutfits }] = await Promise.all(
    ['gl', 'pet', 'bake/fx', 'bake/outfits'].map((m) => import('./src/' + m + '.js')));
  document.getElementById('stage').style.display = 'none';
  document.getElementById('ui').hidden = true;
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
  const c = document.createElement('canvas');
  const getContext = c.getContext.bind(c);
  c.getContext = (type, options) => getContext(type, { ...options, alpha: true });
  c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;display:block';
  document.body.append(c);
  const g = new Renderer(c);
  const assets = new Assets(g);
  defineFx(assets);
  defineOutfits(assets);
  const W = innerWidth;
  g.resize(W, innerHeight, devicePixelRatio);
  window.__alone = (breed, coat, face, ears) => {
    const pet = new Pet(assets, { breed, coat, seed: 11, stage: 'grown', outfit: {} }, { prefix: breed, bakeScale: 4 });
    pet.setFace(face);
    pet.ears(ears);
    pet.settle();
    pet.blinkIn = 1e9;
    pet.lookIn = 1e9;
    pet.lookFree = [0, 0];
    const s = (W * ${KIND_BODY}) / (200 * pet.stage.scale);
    const st = s * pet.stage.scale;
    const x = W * ${KIND_FEET[0]};
    const y = W * ${KIND_FEET[1]};
    // Twice: the first draw bakes the textures, and a texture baked halfway through a frame can come out
    // on the wrong part.
    for (let i = 0; i < 2; i++) {
      g.begin();
      g.gl.clearColor(0, 0, 0, 0);
      g.gl.clear(g.gl.COLOR_BUFFER_BIT);
      g.sprite(assets.get('fx.shadow'), x, y + 4 * st, { w: 236 * st, h: 50 * st, alpha: 0.6 });
      pet.draw(g, x, y, s, [1, 1, 1]);
      g.end();
    }
  };
})()`;

const open = async (d, query) => {
  await d.open(`web/?${query}`, 2500);
  await d.js(HOLD);
  await d.sleep(150);
};

/** The camera in z times, about the pet's feet unless at (page code) works out another point. */
const zoom = (d, z, at = '__feet()') => d.js(`__zoom(${z}, ...${at})`);

const MOMENTS = {
  /** Stroking the head: purring, hearts all over. */
  async love(d) {
    await open(d, 'demo=home&breed=cubling&coat=cocoa&hour=15&days=12&tummy=85&love=90&fun=80&energy=90&clean=95&head=bow');
    await d.js(`(() => {
      const g = __game, s = T.scene;
      s.idleIn = 1e9;
      g.actor.relax('smile');
      g.pet.settle();
      T.draw();
      const a = g.pet.anchors.top, u = g.view.u;
      const x = a[0], y = a[1] + 36 * u;
      T.down(x, y);
      __run(4.2, (i) => T.move(x + Math.sin(i * 0.2) * 58 * u, y + Math.cos(i * 0.2) * 14 * u));
    })()`);
    await zoom(d, 1.4);
  },

  /** Nose on the glass, fogging it up. */
  async glass(d) {
    await open(d, 'demo=home&breed=kitling&coat=peach&hour=11&days=12&tummy=80&love=90&fun=80&energy=90&clean=95');
    await d.js(`(() => {
      T.scene.idleIn = 1e9;
      __game.actor.play(T.scene.pressGlass());
      __run(1.05);
    })()`);
  },

  /** Its favourite snack, by hand, with the tray open. */
  async feed(d) {
    await open(d, 'demo=home&breed=bunling&coat=lilac&hour=12&days=12&tummy=45&love=85&fun=80&energy=90&clean=95&berries=860');
    await d.js(`T.scene.idleIn = 1e9; T.click('[data-action="feed"]')`);
    await d.sleep(600);
    const taste = await d.js(`(async () => { const c = await import('./src/catalog.js'); return c.TASTES.bunling; })()`);
    const love = Array.isArray(taste.love) ? taste.love[0] : taste.love;
    await d.js(`__game.state.foodsTried = ['${love}', 'apple', 'carrot', 'cookie']; T.scene.giveFood('${love}'); __run(1.05)`);
    // Not so far that the bunny's ears run off the screen.
    await zoom(d, 1.2);
  },

  /** A ball of bubbles, the real way: soap on a dirty fox. */
  async bath(d) {
    await open(d, 'demo=bath&breed=foxling&coat=ember&hour=15&days=12&clean=30');
    await d.js(`(() => {
      const g = __game;
      T.draw();
      const c = g.pet.anchors.center, u = g.view.u;
      T.down(c[0], c[1]);
      __run(8, (i) => {
        if (T.scene.step > 0 && T.scene.foam.length) return;
        T.move(c[0] + Math.sin(i * 0.53) * 104 * u, c[1] - 34 * u + Math.cos(i * 0.21) * 86 * u);
      });
      T.up(c[0], c[1]);
      __run(0.25);
    })()`);
    await zoom(d, 1.3);
  },

  /** Clean, fluffy, under a rainbow. */
  async rainbow(d) {
    await open(d, 'demo=bath&breed=foxling&coat=ember&hour=15&days=12&clean=30');
    await d.js(`(() => {
      const s = T.scene;
      __game.pet.dirt = 0;
      s.foam.length = 0;
      s.step = 2;
      s.finish();
      __run(2.6);
    })()`);
  },

  /** Out for a walk at sunset, meeting a friend. */
  async walk(d) {
    await open(d, 'demo=walk&breed=kitling&coat=peach&hour=7&days=12&energy=90&neck=scarf');
    await d.js(`(() => {
      const s = T.scene, g = __game, v = g.view, u = v.u;
      g.fakeHour = 18.3;
      g.actor.x = v.w * 0.29;
      s.dist = 300 * u;
      s.friendTimer = 1e9;
      __run(0.1);
      document.querySelector('.hint').textContent = '';
      const at = (k) => s.scroll + v.w * k;
      s.objects = s.objects.filter((o) => o.kind === 'flower');
      s.objects.push({ kind: 'berry', x: at(0.5), y: 44 * u, bob: 1 }, { kind: 'berry', x: at(0.64), y: 62 * u, bob: 2 }, { kind: 'berry', x: at(0.14), y: 58 * u, bob: 3 });
      s.objects.push({ kind: 'fly', x: at(0.8), y: -310 * u, t: 2, hx: at(0.8) }, { kind: 'fly', x: at(0.13), y: -350 * u, t: 5, hx: at(0.13) });
      s.friendTimer = 0;
      __run(0.1);
      const f = s.friend;
      f.x = s.scroll + g.actor.x + 192 * u;
      for (let i = 0; i < 40 && !f.met; i++) __run(0.1);
      __run(1.7);
      // In until the two of them fill the screen from side to side, which on a phone they already do.
      const a = g.pet.anchors, b = s.friendPet.anchors;
      const left = a.center[0] - 125 * a.unit, right = b.center[0] + 125 * b.unit;
      const z = Math.min(1.4, (0.92 * v.w) / (right - left));
      if (z > 1.02) __zoom(z, (left + right) / 2, __feet()[1]);
    })()`);
  },

  /** Hide and Seek: paws over your eyes while it counts. */
  async hide(d) {
    await open(d, 'demo=hide&breed=kitling&coat=lilac&hour=16&days=12');
    await d.js(`(() => {
      const s = T.scene;
      for (let i = 0; i < 80 && s.phase !== 'counting'; i++) __run(0.1);
      __run(0.7);
    })()`);
  },

  /** Saying it back, lips moving. */
  async talk(d) {
    await open(d, 'demo=home&breed=drakling&coat=mint&hour=10&days=12&tummy=80&love=90&fun=80&energy=90&clean=95');
    await d.js(`(() => {
      const t = __talk, s = T.scene, g = __game;
      s.idleIn = 1e9;
      t.init();
      t.on = true;
      s.talk = true;
      g.actor.stop();
      t.button(true);
      t.setState('hearing');
      t.level = 0.7;
      __run(1.4);
      t.setState('speaking');
      __run(0.42, () => { t.level = 0.82; });
    })()`);
    // Its wings stay on the screen.
    await zoom(d, 1.3);
  },

  /** Tucked in under the star projector. */
  async sleep(d) {
    await open(d, 'demo=home&breed=puppling&coat=honey&hour=21&days=12&tummy=80&love=90&fun=80&energy=25&clean=95');
    await d.js(`T.scene.idleIn = 1e9; T.scene.sleep(); __run(7)`);
    await d.sleep(900);
    // The bed is off to one side: the pet comes in towards the middle.
    await zoom(d, 1.6, `(() => { const c = __game.pet.anchors.center; return [c[0], c[1], __game.view.w / 2, c[1]]; })()`);
  },

  /** Dressed up, with the closet open and the pet above it. */
  async dress(d) {
    await open(d, 'demo=home&breed=bunling&coat=lilac&hour=16&days=30&berries=2400&tummy=80&love=90&fun=80&energy=90&clean=95&neck=scarf&face=glasses');
    await d.js(`(() => {
      const s = __game.state;
      s.owned.outfits.push('crown', 'scarf', 'glasses');
      s.pet.outfit.head = 'crown';
      T.scene.idleIn = 1e9;
      __run(0.4);
      __game.ui.on_closet(document.body, 'head');
      __game.actor.relax('happy');
      __run(1.8);
    })()`);
    await d.sleep(500);
    // Not so far that the crown goes up under the Dynamic Island.
    await zoom(d, 1.15);
  },

  /** The six kinds, each alone on a clear background; tools/store-frame.mjs stands them together. */
  async kinds(d) {
    await open(d, 'demo=home&breed=kitling&coat=peach&hour=12&days=12');
    await d.js(ALONE);
    await d.transparent();
    const saved = [];
    for (const [breed, coat, face, ears] of KINDS) {
      await d.js(`__alone('${breed}', '${coat}', '${face}', ${ears})`);
      await d.sleep(150);
      saved.push(`kinds-${breed}`);
      await d.shot(saved.at(-1), { draw: false });
    }
    return saved;
  },

  /** The egg bursting open. */
  async hatch(d) {
    await d.open('web/', 2500);
    await d.js(HOLD);
    const egg = await d.js(`(() => { const e = T.scene.eggs[1]; return [e.x, e.y]; })()`);
    await d.js(`T.tap(${egg[0]}, ${egg[1]}); T.click('#hatchBtn'); __run(2)`);
    const w = await d.js(`[__game.view.w / 2, __game.view.h * 0.46]`);
    for (let i = 0; i < 6; i++) await d.js(`T.tap(${w[0]}, ${w[1]}); __run(0.25)`);
    await d.js(`__run(1.3)`);
  },
};

const [outArg, kind = 'phone', dprArg, ...names] = process.argv.slice(2);
const device = DEVICES[kind];
const out = resolve(outArg, kind);
mkdirSync(out, { recursive: true });
const dpr = Number(dprArg ?? device.dpr);
for (const name of names.length ? names : Object.keys(MOMENTS)) {
  const t0 = Date.now();
  let saved;
  await drive({ ...device, dpr, outDir: out, quiet: true }, async (d) => {
    // A moment that saves its own pictures says which.
    saved = await MOMENTS[name](d);
    if (!saved) await d.shot(process.env.SHOT_AS ?? name);
  });
  console.log(`${name}: ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${(saved ?? [name]).map((f) => join(out, f + '.png')).join(', ')}`);
}
