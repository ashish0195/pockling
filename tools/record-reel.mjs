// Records the little clip for the collage on 9io.ai's homepage, frame by frame so software GL doesn't matter:
// close up on the pet, 720x900 like Bitfold's card next to it. The game runs at phone size and the clip is cut
// out of the middle of the screen, so a card this small still shows a face. The last half second fades into the
// first, so the loop joins up. Needs the dev server, ffmpeg and cwebp.
//   node tools/record-reel.mjs [work dir] [poster frame]
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { drive } from './drive.mjs';

const WORK = resolve(process.argv[2] ?? join(tmpdir(), 'pockling-reel'));
const POSTER = Number(process.argv[3] ?? 140);
const FPS = 30;
const FADE = 0.5;
// In CSS pixels of a 440x956 screen, around where the pet stands.
const CROP = { x: 40, y: 386, w: 360, h: 450 };

function timeline() {
  const frames = {};
  const at = (sec, code) => {
    const f = Math.round(sec * FPS);
    frames[f] = `${frames[f] ?? ''}${code};`;
  };
  const each = (from, to, code) => {
    for (let f = Math.round(from * FPS); f < Math.round(to * FPS); f++) frames[f] = `${frames[f] ?? ''}{ const i = ${f}; ${code} };`;
  };

  // Stroking the head.
  at(0, `T.scene.idleIn = 1e9; __game.actor.relax('smile'); __game.pet.settle(); T.draw(); { const a = __game.pet.anchors.top, u = __game.view.u; window.__head = [a[0], a[1] + 36 * u]; }`);
  at(0.2, `T.down(__head[0], __head[1])`);
  each(0.23, 2.6, `T.move(__head[0] + Math.sin(i * 0.2) * 58 * __game.view.u, __head[1] + Math.cos(i * 0.2) * 14 * __game.view.u);`);
  at(2.6, `T.up(__head[0], __head[1])`);

  // Nose on the glass.
  at(2.8, `__game.actor.play(T.scene.pressGlass())`);

  // Its favorite snack.
  at(5.2, `T.scene.idleIn = 1e9; __game.pet.lookAt(null); __game.state.foodsTried = ['fish', 'apple', 'carrot', 'cookie']; T.scene.giveFood('fish')`);

  // Bubbles, then a rainbow.
  at(7.7, `__goTo(__scenes.bath); (() => {
    const g = __game;
    g.pet.dirt = 0;
    T.draw();
    const c = g.pet.anchors.center;
    window.__mid = c;
    T.down(c[0], c[1]);
  })()`);
  each(7.73, 9.3, `if (!T.scene.step) T.move(__mid[0] + Math.sin(i * 0.53) * 104 * __game.view.u, __mid[1] - 34 * __game.view.u + Math.cos(i * 0.21) * 86 * __game.view.u);`);
  at(9.3, `T.up(__mid[0], __mid[1]); (() => { const s = T.scene; s.foam.length = 0; s.step = 2; s.finish(); })()`);

  // Home again, dancing.
  at(11.3, `__goTo(__scenes.home); (() => {
    const s = T.scene, g = __game;
    s.idleIn = 1e9;
    g.actor.x = g.view.w / 2;
    g.actor.stop();
    g.pet.settle();
    g.actor.play(g.actor.dance());
    T.draw();
    const c = g.pet.anchors.center;
    g.fx.heartBurst(c[0], c[1] - 20, 10);
  })()`);
  return { frames, total: Math.round(13 * FPS) };
}

const ffmpeg = (...args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });

const dir = join(WORK, 'frames');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const { frames, total } = timeline();
await drive({ width: 440, height: 956, dpr: 2, outDir: dir, quiet: true }, async (d) => {
  await d.open('web/?demo=home&breed=kitling&coat=peach&hour=15&days=12&tummy=45&love=70&fun=70&energy=90&clean=60&head=bow', 3000);
  await d.js(`(() => {
    window.__hold = true;
    let n = 123456;
    Math.random = () => {
      n = (n * 1664525 + 1013904223) >>> 0;
      return n / 4294967296;
    };
    document.getElementById('ui').style.display = 'none';
  })()`);
  await d.sleep(200);
  for (let i = 0; i < total; i++) {
    await d.js(`${frames[i] ?? ''}; T.ff(${1 / FPS}, ${1 / FPS})`);
    await d.capture(join(dir, `f${String(i).padStart(4, '0')}.jpg`), 95);
  }
});

// JPEG is BT.601; the clips are full-range BT.709 with sRGB's curve, like the other games' clips.
const crop = `crop=${CROP.w * 2}:${CROP.h * 2}:${CROP.x * 2}:${CROP.y * 2}`;
const tags = 'setparams=range=pc:colorspace=bt709:color_primaries=bt709:color_trc=iec61966-2-1';
const raw = join(WORK, 'raw.mp4');
ffmpeg('-framerate', String(FPS), '-i', join(dir, 'f%04d.jpg'),
  '-vf', `${crop},scale=in_color_matrix=bt601:out_color_matrix=bt709:in_range=pc:out_range=pc,format=yuv420p,${tags}`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', raw);
const length = total / FPS;
ffmpeg('-i', raw, '-filter_complex',
  `[0:v]split[a][b];[a]trim=start=${FADE},setpts=PTS-STARTPTS[body];[b]trim=end=${FADE},setpts=PTS-STARTPTS[head];` +
  `[body][head]xfade=transition=fade:duration=${FADE}:offset=${(length - 2 * FADE).toFixed(3)},format=yuv420p,${tags}[v]`,
  '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-crf', '24',
  '-maxrate', '1600k', '-bufsize', '3200k', '-movflags', '+faststart', '-an', join(WORK, 'reel-pockling.mp4'));
ffmpeg('-i', join(dir, `f${String(POSTER).padStart(4, '0')}.jpg`), '-vf', crop, '-update', '1', join(WORK, 'poster.png'));
execFileSync('cwebp', ['-quiet', '-q', '84', join(WORK, 'poster.png'), '-o', join(WORK, 'reel-pockling.webp')]);
console.log(`reel in ${WORK}, ${length.toFixed(1)} s`);
