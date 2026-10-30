// Records Pockling for 9io.ai/games, frame by frame, so the slow software GL of headless Chrome doesn't
// matter: love, nose on the glass, a snack, a bubble bath, a walk with a friend. Two loops (wide 1280x720
// for desktop, tall 576x720 for phones) with a poster each, plus the wordmark and icon. The last half
// second fades into the first, so the loop joins up. Needs the dev server, ffmpeg and cwebp.
//   node tools/record-clips.mjs [workdir]     then look at the frames, and copy into stocks-bot.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { drive } from './drive.mjs';

const WORK = resolve(process.argv[2] ?? join(tmpdir(), 'pockling-clips'));
const FPS = 30;
const FADE = 0.5;
const POSTER = 52;

const JOBS = {
  // On desktop the copy covers the left of the stage, so the action moves over to the right.
  'pockling-wide': { width: 1280, height: 720, stageX: 0.7, maxrate: 2400 },
  'pockling-tall': { width: 576, height: 720, stageX: 0.5, maxrate: 1800 },
};

/** What happens when, in frames: JS that runs before that frame is stepped. */
function timeline(frames) {
  const at = (from, code) => {
    frames[from] = `${frames[from] ?? ''}${code};`;
  };
  // Stroking the head.
  at(0, `(() => {
    const g = __game, s = T.scene;
    s.idleIn = 1e9;
    g.actor.x = g.stageX;
    g.actor.relax('smile');
    g.pet.settle();
    T.draw();
    const a = g.pet.anchors.top;
    window.__head = [a[0], a[1] + 36 * g.view.u];
  })()`);
  at(10, 'T.down(__head[0], __head[1])');
  for (let i = 11; i < 68; i++) {
    at(i, `T.move(__head[0] + Math.sin(${i} * 0.2) * 58 * __game.view.u, __head[1] + Math.cos(${i} * 0.2) * 14 * __game.view.u)`);
  }
  at(68, 'T.up(__head[0], __head[1])');
  // Nose on the glass.
  at(80, '__game.actor.play(T.scene.pressGlass())');
  // A snack.
  at(160, `T.scene.idleIn = 1e9; __game.pet.lookAt(null); T.scene.giveFood('donut')`);
  // A bubble bath.
  at(236, `__game.pet.outfit = {}; __goTo(__scenes.bath); T.scene.layer = () => {}; (() => {
    const s = T.scene;
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4;
      const d = 18 + (i % 7) * 11;
      s.foam.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.9 - 26, s: 30, target: 36 + (i % 4) * 5, r: a });
    }
    __game.pet.setFace('purr');
    __game.pet.dirt = 0;
    T.draw();
    const c = __game.pet.anchors.center;
    window.__mid = c;
    T.down(c[0], c[1]);
  })()`);
  for (let i = 237; i < 272; i++) {
    at(i, `T.move(__mid[0] + Math.sin(${i} * 0.42) * 86 * __game.view.u, __mid[1] - 20 + Math.cos(${i} * 0.27) * 54 * __game.view.u)`);
  }
  at(272, `T.up(__mid[0], __mid[1]); (() => { const s = T.scene; s.foam.length = 0; s.step = 2; s.finish(); })()`);
  // A walk in the golden hour, and a friend.
  at(330, `__game.fakeHour = 17.6; __game.pet.outfit = __game.state.pet.outfit; __goTo(__scenes.walk); (() => {
    const s = T.scene, g = __game, v = g.view;
    g.actor.x = g.stageX - 60 * v.u;
    s.objects.push({ kind: 'berry', x: g.actor.x + 110 * v.u, y: 8 * v.u, bob: 1 }, { kind: 'berry', x: g.actor.x + 190 * v.u, y: -12 * v.u, bob: 2 }, { kind: 'berry', x: g.actor.x + 280 * v.u, y: 14 * v.u, bob: 3 });
    s.objects = s.objects.filter((o) => o.kind === 'berry' || o.x > g.actor.x + 600 * v.u);
    T.draw();
    T.down(g.actor.x + 240 * v.u, s.pathY - 60 * v.u);
  })()`);
  at(392, `(() => { const s = T.scene; s.dist = 9999; s.friendTimer = 0; })()`);
  at(446, `T.up(0, 0)`);
  // Home again, dancing.
  at(452, `__game.fakeHour = 15; __goTo(__scenes.home); (() => {
    const s = T.scene, g = __game;
    s.idleIn = 1e9;
    g.actor.x = g.stageX;
    g.actor.stop();
    g.pet.settle();
    g.actor.play(g.actor.dance());
    T.draw();
    const c = g.pet.anchors.center;
    g.fx.heartBurst(c[0], c[1] - 20, 10);
  })()`);
  return 496;
}

const ffmpeg = (...args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' });

// Cuts a transparent PNG down to what's drawn on it, plus a few pixels.
function trim(png, out, margin) {
  const [width, height] = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', png])
    .toString().trim().split(',').map(Number);
  const alpha = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', png, '-vf', 'alphaextract', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 26 });
  let [x0, y0, x1, y1] = [width, height, -1, -1];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alpha[y * width + x] <= 8) continue;
      [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    }
  }
  [x0, y0] = [Math.max(0, x0 - margin), Math.max(0, y0 - margin)];
  [x1, y1] = [Math.min(width - 1, x1 + margin), Math.min(height - 1, y1 + margin)];
  ffmpeg('-i', png, '-vf', `crop=${x1 - x0 + 1}:${y1 - y0 + 1}:${x0}:${y0}`, '-update', '1', out);
  return { file: out, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

async function record(name, job) {
  const dir = join(WORK, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const frames = {};
  const total = timeline(frames);
  await drive({ width: job.width, height: job.height, dpr: 1, outDir: dir, quiet: true }, async (d) => {
    await d.open('web/?demo=home&breed=kitling&coat=peach&hour=15&days=3&tummy=40&love=60&head=bow', 3500);
    await d.js(`(() => {
      window.__hold = true;
      let n = 123456;
      Math.random = () => {
        n = (n * 1664525 + 1013904223) >>> 0;
        return n / 4294967296;
      };
      document.getElementById('ui').style.display = 'none';
      __game.stageX = __game.view.w * ${job.stageX};
    })()`);
    await d.sleep(200);
    const t0 = Date.now();
    for (let i = 0; i < total; i++) {
      await d.js(`${frames[i] ?? ''}; T.ff(${1 / FPS}, ${1 / FPS})`);
      await d.capture(join(dir, `f${String(i).padStart(4, '0')}.jpg`));
      if (i % 60 === 0) console.log(`${name}: frame ${i}/${total} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
  });
  // JPEG is BT.601; the clips are full-range BT.709 with sRGB's curve, like the other games' clips.
  const tags = 'setparams=range=pc:colorspace=bt709:color_primaries=bt709:color_trc=iec61966-2-1';
  const raw = join(dir, 'raw.mp4');
  ffmpeg('-framerate', String(FPS), '-i', join(dir, 'f%04d.jpg'),
    '-vf', `scale=in_color_matrix=bt601:out_color_matrix=bt709:in_range=pc:out_range=pc,format=yuv420p,${tags}`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', raw);
  const length = total / FPS;
  ffmpeg('-i', raw, '-filter_complex',
    `[0:v]split[a][b];[a]trim=start=${FADE},setpts=PTS-STARTPTS[body];[b]trim=end=${FADE},setpts=PTS-STARTPTS[head];` +
    `[body][head]xfade=transition=fade:duration=${FADE}:offset=${(length - 2 * FADE).toFixed(3)},format=yuv420p,${tags}[v]`,
    '-map', '[v]', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-crf', '22',
    '-maxrate', `${job.maxrate}k`, '-bufsize', `${job.maxrate * 2}k`, '-movflags', '+faststart', '-an',
    join(WORK, `${name}.mp4`));
  execFileSync('cwebp', ['-quiet', '-q', '84', join(dir, `f${String(POSTER).padStart(4, '0')}.jpg`), '-o', join(WORK, `${name}.webp`)]);
  console.log(`${name}: ${total} frames, ${length.toFixed(1)} s`);
}

mkdirSync(WORK, { recursive: true });
for (const [name, job] of Object.entries(JOBS)) await record(name, job);
// The wordmark and icon, from tools/make-art.mjs.
const art = new URL('.art/', import.meta.url).pathname;
const cut = trim(join(art, 'wordmark.png'), join(WORK, 'wordmark.png'), 4);
execFileSync('cwebp', ['-quiet', '-q', '90', '-alpha_q', '100', cut.file, '-o', join(WORK, 'wordmark-pockling.webp')]);
console.log(`wordmark: ${cut.width} x ${cut.height}`);
execFileSync('sips', ['-z', '240', '240', join(art, 'icon-opaque.jpg'), '--out', join(WORK, 'icon-240.jpg')], { stdio: 'ignore' });
execFileSync('cwebp', ['-quiet', '-q', '88', join(WORK, 'icon-240.jpg'), '-o', join(WORK, 'icon-pockling.webp')]);
writeFileSync(join(WORK, 'DONE'), 'done\n');
console.log(`clips in ${WORK}`);
