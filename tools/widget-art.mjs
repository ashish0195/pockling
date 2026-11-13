// Paints the pictures for the iOS app's widget (ios/PocklingWidget), which can't run the game's WebGL.
// For every breed, coat and stage: a whole picture of the pet in the first of the widget's looks (LOOKS in
// web/src/widget.js), and for each other look just the face, which the widget lays over the whole
// picture where faces.json says. Plus an egg, for before one has hatched. They're WebP files in
// ios/PetArt. Run it again after adding a breed, coat or look: npm test checks none is missing. It starts
// its own server, so nothing else needs to be running.
//   node tools/widget-art.mjs            everything (and removes pictures nothing uses any more)
//   node tools/widget-art.mjs foxling    one breed
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drive, sleep } from './drive.mjs';
import { BREED_IDS, BREEDS, STAGES } from '../web/src/catalog.js';
import { LOOKS } from '../web/src/widget.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'ios/PetArt');
const facesFile = join(out, 'faces.json');
// The longer side, in pixels: the medium widget shows the pet about 128 points tall, at 3x.
const SIDE = 384;
const QUALITY = 0.8;
// Room round the pet, as a share of its size, so the shadow's soft edge isn't cut off.
const PAD = 0.03;
// A face's edges fade out over this many pixels, all of them outside anything the look changes.
const FEATHER = 4;
const CANVAS = 1100;

const only = process.argv.slice(2);
for (const id of only) if (!BREEDS[id]) throw new Error(`no breed called ${id}`);
const breeds = only.length ? only : BREED_IDS;
const arg = (...values) => values.map((v) => JSON.stringify(v)).join(', ');

const port = await new Promise((done) => {
  const s = createServer();
  s.listen(0, '127.0.0.1', () => {
    const p = s.address().port;
    s.close(() => done(p));
  });
});
const server = spawn('python3', [join(root, 'tools/serve.py'), String(port)], { stdio: 'ignore' });
const base = `http://127.0.0.1:${port}/`;
for (let i = 0; i < 50; i++) {
  if (await fetch(`${base}tools/widget-art.html`).then((r) => r.ok, () => false)) break;
  await sleep(100);
}

mkdirSync(out, { recursive: true });
const faces = only.length && existsSync(facesFile) ? JSON.parse(readFileSync(facesFile, 'utf8')) : {};
const made = new Set();
const t0 = Date.now();
const save = (name, webp) => {
  writeFileSync(join(out, name), Buffer.from(webp, 'base64'));
  made.add(name);
};

try {
  await drive({ width: 320, height: 240, base, quiet: true }, async (d) => {
    await d.rawOpen('tools/widget-art.html');
    await d.waitFor('window.__ready', 60000);
    for (const breed of breeds) {
      const coats = BREEDS[breed].coats.map((c) => c.id);
      // One box for all of a breed's pictures, so a baby shows smaller than the pet it grows into.
      const box = { x0: CANVAS, y0: CANVAS, x1: 0, y1: 0 };
      for (const coat of coats) {
        for (const stage of STAGES) {
          const b = await d.js(`measure(${arg(breed, coat, stage.id)})`);
          box.x0 = Math.min(box.x0, b.x0);
          box.y0 = Math.min(box.y0, b.y0);
          box.x1 = Math.max(box.x1, b.x1);
          box.y1 = Math.max(box.y1, b.y1);
        }
      }
      if (box.x0 < 2 || box.y0 < 2 || box.x1 > CANVAS - 2 || box.y1 > CANVAS - 2) throw new Error(`${breed} doesn't fit the canvas: ${JSON.stringify(box)}`);
      const pad = Math.round(PAD * Math.max(box.x1 - box.x0, box.y1 - box.y0));
      const crop = { x0: box.x0 - pad, y0: box.y0 - pad, x1: box.x1 + pad, y1: box.y1 + pad };

      for (const stage of STAGES) {
        // Where the looks differ, over every coat: the face, which each look's picture is cut down to.
        const changed = { x0: CANVAS, y0: CANVAS, x1: 0, y1: 0 };
        for (const coat of coats) {
          const b = await d.js(`faceBox(${arg(breed, coat, stage.id)})`);
          changed.x0 = Math.min(changed.x0, b.x0);
          changed.y0 = Math.min(changed.y0, b.y0);
          changed.x1 = Math.max(changed.x1, b.x1);
          changed.y1 = Math.max(changed.y1, b.y1);
        }
        const face = await d.js(`placeFace(${arg(changed, crop, SIDE, FEATHER + 2)})`);
        if (face.x === 0 || face.y === 0 || face.x + face.w === face.size[0] || face.y + face.h === face.size[1]) {
          throw new Error(`${breed} ${stage.id}: the looks change pixels at the picture's edge, so a face alone won't do`);
        }
        faces[`${breed}-${stage.id}`] = [face.x, face.y, face.w, face.h];
        for (const coat of coats) {
          save(`${breed}-${coat}-${stage.id}.webp`, await d.js(`paint(${arg(breed, coat, stage.id, LOOKS[0], crop, SIDE, QUALITY)})`));
          for (const look of LOOKS.slice(1)) {
            save(`${breed}-${coat}-${stage.id}-${look}.webp`, await d.js(`paintFace(${arg(breed, coat, stage.id, look, crop, SIDE, QUALITY, face, FEATHER)})`));
          }
        }
      }
      console.log(`${breed}: ${Math.round((Date.now() - t0) / 1000)} s so far`);
    }
    save('egg.webp', await d.js(`egg('bunling', ${SIDE}, ${QUALITY})`));
  });
} finally {
  server.kill();
}

// One line per breed and stage: x, y, width and height of the face in that breed's pictures, in pixels.
const lines = Object.keys(faces).sort().map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(faces[key])}`);
writeFileSync(facesFile, `{\n${lines.join(',\n')}\n}\n`);
if (!only.length) {
  for (const name of readdirSync(out)) {
    if (name.endsWith('.webp') && !made.has(name)) rmSync(join(out, name));
  }
}
let total = 0;
for (const name of readdirSync(out)) total += statSync(join(out, name)).size;
console.log(`${made.size} pictures in ios/PetArt, ${Math.round(total / 1024)} KB in all`);
