// Sets the raw screens from tools/store-shots.mjs in a drawn device with a headline, at the sizes App Store
// Connect takes. The PNGs come out with no alpha channel, because it rejects them otherwise.
//   node tools/store-frame.mjs <shots dir> <out dir> [phone|ipad|all] [names...]
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { drive } from './drive.mjs';

// The words in *stars* are picked out in the accent colour.
const SHOTS = [
  { name: 'glass', title: 'Nose on\n*your screen*', from: '#fff4d1', to: '#ffcf8f' },
  { name: 'love', title: 'Stroke it.\n*Feel it purr.*', from: '#ffeadf', to: '#ffb9ca' },
  { name: 'feed', title: 'Feed it.\n*It has opinions.*', from: '#f1e9ff', to: '#cbb8ff' },
  { name: 'bath', title: 'Bubble bath,\n*rubber duck*', from: '#e4fbf6', to: '#9fe6dc' },
  { name: 'walk', title: 'Walkies,\n*new friends*', from: '#ffdcc9', to: '#c8a4ea' },
  { name: 'hide', title: 'Hide and seek.\n*No peeking!*', from: '#ffe3e9', to: '#ff9ab6' },
  { name: 'talk', title: 'Say hello.\n*It says it back.*', from: '#e2fbe9', to: '#a3eac0' },
  { name: 'sleep', title: 'Tuck it in,\n*under the stars*', from: '#3b3070', to: '#15123a', night: true },
  { name: 'dress', title: 'Crowns, glasses,\n*tiny scarves*', from: '#fff1f7', to: '#ffc4df' },
  { name: 'hatch', title: 'Tap the egg.\n*Say hi.*', from: '#fff3e2', to: '#dfcfff' },
];

const SETS = {
  'iphone-6.3': { raw: 'phone', W: 1206, H: 2622, screen: 0.755, ratio: 956 / 440, top: 0.2, font: 0.112, bezel: 0.028, radius: 0.128, island: true },
  'iphone-6.9': { raw: 'phone', W: 1320, H: 2868, screen: 0.755, ratio: 956 / 440, top: 0.2, font: 0.112, bezel: 0.028, radius: 0.128, island: true },
  'ipad-13': { raw: 'ipad', W: 2064, H: 2752, screen: 0.76, ratio: 1376 / 1032, top: 0.185, font: 0.083, bezel: 0.021, radius: 0.04, island: false },
};

const heart = (x, y, s, rot, alpha, color = '#fff') => `<svg class="deco" style="left:${x}%;top:${y}%;width:${s}%;transform:rotate(${rot}deg);opacity:${alpha}" viewBox="-16 -14 32 30"><path fill="${color}" d="M0 14C-24-1-14-17 0-6 14-17 24-1 0 14Z"/></svg>`;
const star = (x, y, s, rot, alpha) => `<svg class="deco" style="left:${x}%;top:${y}%;width:${s}%;transform:rotate(${rot}deg);opacity:${alpha}" viewBox="-16 -16 32 32"><path fill="#fff6d0" d="M0-15 4.5-4.8 15.6-3.6 7.2 3.9 9.6 15 0 9.3-9.6 15-7.2 3.9-15.6-3.6-4.5-4.8Z"/></svg>`;

function page(shot, set, rawFile) {
  const { W, H } = set;
  const sw = W * set.screen;
  const sh = sw * set.ratio;
  const bezel = sw * set.bezel;
  const radius = sw * set.radius;
  const top = H * set.top;
  const accent = shot.night ? '#ffd76e' : '#f0407c';
  const ink = shot.night ? '#ffffff' : '#4a3540';
  const title = shot.title.replace(/\*(.+?)\*/g, '<em>$1</em>').replace('\n', '<br>');
  const mark = shot.night ? star : heart;
  const a = shot.night ? 0.8 : 0.62;
  const deco = [
    mark(3, 3.2, 8, -18, a), mark(90, 2.4, 7, 16, a), mark(92, 11.5, 4.4, 24, a * 0.8), mark(4.5, 13, 3.6, -12, a * 0.8),
    mark(3.5, 40, 4.6, -20, a * 0.7), mark(93.5, 52, 3.8, 18, a * 0.7), mark(3, 74, 3.4, 14, a * 0.6), mark(94, 86, 5, -14, a * 0.6),
  ].join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
    body { background: linear-gradient(170deg, ${shot.from}, ${shot.to}); position: relative; font-family: "Arial Rounded MT Bold", ui-rounded, system-ui, sans-serif; }
    .deco { position: absolute; height: auto; }
    h1 { position: absolute; left: 0; right: 0; top: ${(top - W * set.font * 2.16) / 2}px; margin: 0; text-align: center; font-weight: normal; font-size: ${W * set.font}px; line-height: 1.08; letter-spacing: -0.012em; color: ${ink}; }
    h1 em { font-style: normal; color: ${accent}; }
    .device { position: absolute; left: ${(W - sw) / 2 - bezel}px; top: ${top}px; width: ${sw}px; height: ${sh}px; padding: ${bezel}px; border-radius: ${radius + bezel}px;
      background: #17151c; box-shadow: 0 0 0 ${W * 0.0034}px #6d6875, 0 ${W * 0.024}px ${W * 0.066}px rgba(70, 30, 60, ${shot.night ? 0.6 : 0.34}); }
    .device img { display: block; width: ${sw}px; height: ${sh}px; border-radius: ${radius}px; }
    .island { position: absolute; left: 50%; top: ${bezel + sw * 0.0315}px; width: ${sw * 0.216}px; height: ${sw * 0.0825}px; margin-left: ${-sw * 0.108}px; border-radius: ${sw * 0.0413}px; background: #000; }
  </style></head><body>${deco}<h1>${title}</h1><div class="device"><img src="file://${rawFile}">${set.island ? '<div class="island"></div>' : ''}</div></body></html>`;
}

const [shotsArg, outArg, which = 'all', ...names] = process.argv.slice(2);
const shotsDir = resolve(shotsArg);
const outDir = resolve(outArg);
const tmp = join(outDir, '_html');
mkdirSync(tmp, { recursive: true });
for (const [setName, set] of Object.entries(SETS)) {
  if (which !== 'all' && set.raw !== which) continue;
  const dir = join(outDir, setName);
  mkdirSync(dir, { recursive: true });
  const shots = SHOTS.filter((s) => !names.length || names.includes(s.name));
  await drive({ width: set.W, height: set.H, dpr: 1, outDir: tmp, quiet: true, base: 'http://localhost:8651/' }, async (d) => {
    for (const shot of shots) {
      const order = String(SHOTS.indexOf(shot) + 1).padStart(2, '0');
      const html = join(tmp, `${setName}-${shot.name}.html`);
      writeFileSync(html, page(shot, set, join(shotsDir, set.raw, `${shot.name}.png`)));
      await d.rawOpen(`file://${html}`);
      await d.waitFor(`document.images[0] && document.images[0].complete && document.images[0].naturalWidth > 0`);
      await d.sleep(120);
      const png = await d.shot(`${setName}-${shot.name}`, { draw: false });
      const final = join(dir, `${order}-${shot.name}.png`);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-pix_fmt', 'rgb24', final]);
      console.log(final);
    }
  });
}
rmSync(tmp, { recursive: true, force: true });
