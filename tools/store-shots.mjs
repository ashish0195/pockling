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
})()`;

const open = async (d, query) => {
  await d.open(`web/?${query}`, 2500);
  await d.js(HOLD);
  await d.sleep(150);
};

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
  },

  /** Tucked in under the star projector. */
  async sleep(d) {
    await open(d, 'demo=home&breed=puppling&coat=honey&hour=21&days=12&tummy=80&love=90&fun=80&energy=25&clean=95');
    await d.js(`T.scene.idleIn = 1e9; T.scene.sleep(); __run(7)`);
    await d.sleep(900);
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
  await drive({ ...device, dpr, outDir: out, quiet: true }, async (d) => {
    await MOMENTS[name](d);
    await d.shot(process.env.SHOT_AS ?? name);
  });
  console.log(`${name}: ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${join(out, name + '.png')}`);
}
