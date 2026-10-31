// Records the App Store preview, frame by frame so software GL doesn't matter: 886x1920, full screen, a single
// pet's day. App Store Connect wants an audio track, so it gets a silent one. Needs the dev server and ffmpeg.
//   node tools/store-preview.mjs <work dir>
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { drive } from './drive.mjs';

const WORK = resolve(process.argv[2]);
const FPS = 30;

/** What happens when: JS that runs before the frame at that second is stepped. */
function timeline() {
  const frames = {};
  const at = (sec, code) => {
    const f = Math.round(sec * FPS);
    frames[f] = `${frames[f] ?? ''}${code};`;
  };
  const each = (from, to, code) => {
    for (let f = Math.round(from * FPS); f < Math.round(to * FPS); f++) frames[f] = `${frames[f] ?? ''}{ const i = ${f}; ${code} };`;
  };

  // Nose on the glass.
  at(0, `T.scene.idleIn = 1e9; __game.actor.relax('smile'); __game.pet.settle(); __game.actor.play(T.scene.pressGlass())`);

  // Stroking the head.
  at(2.5, `T.scene.idleIn = 1e9; T.draw(); { const a = __game.pet.anchors.top, u = __game.view.u; window.__head = [a[0], a[1] + 36 * u]; T.down(__head[0], __head[1]); }`);
  each(2.53, 5.2, `T.move(__head[0] + Math.sin(i * 0.2) * 58 * __game.view.u, __head[1] + Math.cos(i * 0.2) * 14 * __game.view.u);`);
  at(5.2, `T.up(__head[0], __head[1])`);

  // Its favorite snack.
  at(5.5, `T.click('[data-action="feed"]'); __game.state.foodsTried = ['fish', 'apple', 'carrot', 'cookie']`);
  at(5.9, `T.scene.idleIn = 1e9; __game.pet.lookAt(null); T.scene.giveFood('fish')`);

  // Bubbles, then a rainbow.
  at(8.5, `__game.ui.hideTray?.(); __game.ui.hideSheet(); __goTo(__scenes.bath); (() => {
    const s = T.scene, g = __game;
    g.pet.dirt = 0;
    T.draw();
    const c = g.pet.anchors.center;
    window.__mid = c;
    T.down(c[0], c[1]);
  })()`);
  each(8.53, 10.4, `if (!T.scene.step) T.move(__mid[0] + Math.sin(i * 0.53) * 104 * __game.view.u, __mid[1] - 34 * __game.view.u + Math.cos(i * 0.21) * 86 * __game.view.u);`);
  at(10.4, `T.up(__mid[0], __mid[1]); (() => { const s = T.scene; s.foam.length = 0; s.step = 2; s.finish(); })()`);

  // A walk at sunset, and a friend.
  at(13.2, `__game.fakeHour = 18.3; __goTo(__scenes.walk); (() => {
    const s = T.scene, g = __game, v = g.view, u = v.u;
    g.actor.x = v.w * 0.26;
    s.dist = 300 * u;
    s.friendTimer = 1e9;
    T.draw();
    document.querySelector('.hint').textContent = '';
    const at = (k) => s.scroll + v.w * k;
    s.objects = s.objects.filter((o) => o.kind === 'flower');
    s.objects.push({ kind: 'berry', x: at(0.6), y: 10 * u, bob: 1 }, { kind: 'berry', x: at(0.86), y: -16 * u, bob: 2 }, { kind: 'berry', x: at(1.1), y: 12 * u, bob: 3 }, { kind: 'berry', x: at(1.34), y: -14 * u, bob: 4 });
    s.objects.push({ kind: 'fly', x: at(0.9), y: -300 * u, t: 2, hx: at(0.9), vx: 16 * u }, { kind: 'fly', x: at(1.5), y: -330 * u, t: 5, hx: at(1.5), vx: -10 * u });
    T.down(v.w * 0.84, s.pathY - 70 * u);
  })()`);
  each(13.25, 15.8, `T.scene.objects = T.scene.objects.filter((o) => o.kind !== 'mud');`);
  at(15.8, `(() => {
    const s = T.scene, g = __game;
    T.up(0, 0);
    s.friendTimer = 0;
    window.__friendAt = true;
  })()`);
  at(15.85, `(() => {
    const s = T.scene, g = __game;
    if (s.friend) s.friend.x = s.scroll + g.actor.x + 230 * g.view.u;
  })()`);

  // Hide and Seek: paws over your eyes.
  at(18.6, `__game.fakeHour = 16; __goTo(__scenes.hideGame)`);

  // Saying it back.
  at(22.2, `__goTo(__scenes.home); (() => {
    const t = __talk, s = T.scene, g = __game;
    s.idleIn = 1e9;
    g.actor.x = g.view.w / 2;
    g.actor.stop();
    g.pet.settle();
    t.init();
    t.on = true;
    s.talk = true;
    t.button(true);
    t.setState('listening');
  })()`);
  at(22.7, `__talk.setState('hearing')`);
  each(22.7, 23.9, `__talk.level = 0.45 + Math.abs(Math.sin(i * 0.5)) * 0.4;`);
  at(23.9, `__talk.setState('speaking')`);
  each(23.9, 25.2, `__talk.level = 0.3 + Math.abs(Math.sin(i * 0.45)) * 0.65;`);
  at(25.2, `__talk.stop(); __audio.stopMusic?.()`);

  // Tucked in under the stars.
  at(25.3, `__game.fakeHour = 21; T.scene.idleIn = 1e9; __game.state.pet.energy = 25; T.scene.sleep()`);
  return { frames, total: Math.round(29.2 * FPS) };
}

const ffmpeg = (...args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });

const dir = join(WORK, 'frames');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const { frames, total } = timeline();
await drive({ width: 443, height: 960, dpr: 2, safe: [59, 34], outDir: dir, quiet: true }, async (d) => {
  await d.open('web/?demo=home&breed=kitling&coat=peach&hour=15&days=12&tummy=45&love=70&fun=70&energy=90&clean=60&neck=scarf&berries=240', 3000);
  await d.js(`(() => {
    window.__hold = true;
    let n = 123456;
    Math.random = () => {
      n = (n * 1664525 + 1013904223) >>> 0;
      return n / 4294967296;
    };
    // Real-time UI would flash by, since a frame takes far longer to capture than it lasts.
    const style = document.createElement('style');
    style.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; } .toast, #toasts { display: none !important; }';
    document.head.append(style);
  })()`);
  await d.sleep(200);
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    await d.js(`${frames[i] ?? ''}; T.ff(${1 / FPS}, ${1 / FPS}); __game.ui.refresh?.()`);
    await d.capture(join(dir, `f${String(i).padStart(4, '0')}.jpg`), 95);
    if (i % 60 === 0) console.log(`frame ${i}/${total} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
});
// JPEG is BT.601 full range; App Store previews are BT.709.
ffmpeg('-framerate', String(FPS), '-i', join(dir, 'f%04d.jpg'), '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
  '-vf', 'scale=886:1920:in_color_matrix=bt601:out_color_matrix=bt709:in_range=pc:out_range=tv,format=yuv420p,setparams=range=tv:colorspace=bt709:color_primaries=bt709:color_trc=bt709',
  '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-level', '4.0', '-crf', '17', '-maxrate', '11M', '-bufsize', '22M', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', join(WORK, 'pockling-preview.mp4'));
console.log(`preview in ${WORK}`);
