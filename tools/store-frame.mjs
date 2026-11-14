// Sets the raw screens from tools/store-shots.mjs in a drawn device with a headline, at the sizes App Store
// Connect takes. The device is as big as the shot allows, so the pet reads at the size of a search result,
// and runs off the bottom edge. The kinds shot has no device: the six pets stand together under it.
// The PNGs come out with no alpha channel, because it rejects them otherwise.
//   node tools/store-frame.mjs <shots dir> <out dir> [phone|ipad|all] [names...]
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { drive } from './drive.mjs';

// The words in *stars* are picked out in the accent colour.
const SHOTS = [
  { name: 'glass', title: 'Your cute\n*virtual pet*', from: '#fff4d1', to: '#ffcf8f' },
  // 1.3's widget: a real Home Screen captured on an iPhone 17 Pro Max simulator, not by store-shots.mjs
  // (docs/aso/store/captures/, docs/ASO.md). iPhone only: on an iPad Home Screen the widget is too small to read.
  { name: 'widget', title: 'On your\n*Home Screen*', from: '#eaf5ff', to: '#bcd8ff', only: 'phone' },
  { name: 'love', title: 'Stroke it.\n*Feel it purr.*', from: '#ffeadf', to: '#ffb9ca' },
  { name: 'feed', title: 'Feed it.\n*It has opinions.*', from: '#f1e9ff', to: '#cbb8ff' },
  { name: 'kinds', title: 'Kitten, puppy, bunny,\n*fox, bear or dragon*', from: '#eaf5ff', to: '#bcd8ff', kinds: true },
  { name: 'bath', title: 'Bubble bath,\n*rubber duck*', from: '#e4fbf6', to: '#9fe6dc' },
  { name: 'walk', title: 'Walkies,\n*new friends*', from: '#ffdcc9', to: '#c8a4ea' },
  { name: 'talk', title: 'Say hello.\n*It says it back.*', from: '#e2fbe9', to: '#a3eac0' },
  { name: 'hide', title: 'Hide and seek.\n*No peeking!*', from: '#ffe3e9', to: '#ff9ab6', only: 'ipad' },
  { name: 'sleep', title: 'It never dies.\n*It just misses you.*', from: '#3b3070', to: '#15123a', night: true },
  { name: 'dress', title: 'Crowns, glasses,\n*tiny scarves*', from: '#fff1f7', to: '#ffc4df' },
];

// The kinds, as tools/store-shots.mjs draws them (kinds-<breed>.png), in the headline's order, each with
// its feet at KIND_FEET of the picture's width across and down and its body KIND_BODY of it wide.
const KINDS = ['kitling', 'puppling', 'bunling', 'foxling', 'cubling', 'drakling'];
const KIND_BODY = 0.45;
const KIND_FEET = [0.5, 1.2];

// screen: the screen's width, and top: where the device starts, as shares of the shot. Whatever doesn't fit
// runs off the bottom. kinds: each pet's body width (share of W) and where its feet are (shares of W and H),
// in KINDS order: two to a row on a phone, three on an iPad.
const PHONE = {
  raw: 'phone', screen: 0.875, ratio: 956 / 440, top: 0.19, font: 0.112, bezel: 0.028, radius: 0.128, island: true,
  kinds: { body: 0.37, at: [[0.285, 0.41], [0.705, 0.41], [0.28, 0.64], [0.67, 0.64], [0.285, 0.87], [0.685, 0.87]] },
};
const SETS = {
  'iphone-6.3': { ...PHONE, W: 1206, H: 2622 },
  'iphone-6.9': { ...PHONE, W: 1320, H: 2868 },
  'ipad-13': {
    raw: 'ipad', W: 2064, H: 2752, screen: 0.88, ratio: 1376 / 1032, top: 0.185, font: 0.083, bezel: 0.021, radius: 0.04, island: false,
    kinds: { body: 0.26, at: [[0.175, 0.53], [0.5, 0.53], [0.825, 0.53], [0.175, 0.87], [0.5, 0.87], [0.815, 0.87]] },
  },
};

const heart = (x, y, s, rot, alpha, color = '#fff') => `<svg class="deco" style="left:${x}%;top:${y}%;width:${s}%;transform:rotate(${rot}deg);opacity:${alpha}" viewBox="-16 -14 32 30"><path fill="${color}" d="M0 14C-24-1-14-17 0-6 14-17 24-1 0 14Z"/></svg>`;
const star = (x, y, s, rot, alpha) => `<svg class="deco" style="left:${x}%;top:${y}%;width:${s}%;transform:rotate(${rot}deg);opacity:${alpha}" viewBox="-16 -16 32 32"><path fill="#fff6d0" d="M0-15 4.5-4.8 15.6-3.6 7.2 3.9 9.6 15 0 9.3-9.6 15-7.2 3.9-15.6-3.6-4.5-4.8Z"/></svg>`;

/** The device with the raw screen in it. */
function device(set, shot, rawFile) {
  const { W, H } = set;
  const sw = W * set.screen;
  const sh = sw * set.ratio;
  const bezel = sw * set.bezel;
  const radius = sw * set.radius;
  return `<style>
    .device { position: absolute; left: ${(W - sw) / 2 - bezel}px; top: ${H * set.top}px; width: ${sw}px; height: ${sh}px; padding: ${bezel}px; border-radius: ${radius + bezel}px;
      background: #17151c; box-shadow: 0 0 0 ${W * 0.0034}px #6d6875, 0 ${W * 0.024}px ${W * 0.066}px rgba(70, 30, 60, ${shot.night ? 0.6 : 0.34}); }
    .device img { display: block; width: ${sw}px; height: ${sh}px; border-radius: ${radius}px; }
    .island { position: absolute; left: 50%; top: ${bezel + sw * 0.0315}px; width: ${sw * 0.216}px; height: ${sw * 0.0825}px; margin-left: ${-sw * 0.108}px; border-radius: ${sw * 0.0413}px; background: #000; }
  </style><div class="device"><img src="file://${rawFile}">${set.island ? '<div class="island"></div>' : ''}</div>`;
}

/** The six kinds standing together, the nearer (lower) ones in front, on a soft glow. */
function kinds(set, shotsDir) {
  const { W, H } = set;
  const k = set.kinds;
  const width = (W * k.body) / KIND_BODY;
  const pets = KINDS.map((breed, i) => {
    const [x, y] = [W * k.at[i][0], H * k.at[i][1]];
    return `<img class="kind" style="left:${x - width * KIND_FEET[0]}px;top:${y - width * KIND_FEET[1]}px;width:${width}px;z-index:${Math.round(k.at[i][1] * 100)}" src="file://${join(shotsDir, set.raw, `kinds-${breed}.png`)}">`;
  });
  const top = H * Math.min(...k.at.map(([, y]) => y)) - width * 0.6;
  const bottom = H * Math.max(...k.at.map(([, y]) => y));
  return `<style>
    .kind { position: absolute; height: auto; }
    .glow { position: absolute; left: ${-W * 0.15}px; width: ${W * 1.3}px; top: ${top - W * 0.25}px; height: ${bottom - top + W * 0.5}px; border-radius: 50%;
      background: radial-gradient(closest-side, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0)); }
  </style><div class="glow"></div>${pets.join('')}`;
}

function page(shot, set, shotsDir) {
  const { W, H } = set;
  const top = H * set.top;
  const accent = shot.night ? '#ffd76e' : '#f0407c';
  const ink = shot.night ? '#ffffff' : '#4a3540';
  const title = shot.title.split('\n').map((line) => `<span>${line.replace(/\*(.+?)\*/g, '<em>$1</em>')}</span>`).join('<br>');
  const mark = shot.night ? star : heart;
  const a = shot.night ? 0.8 : 0.62;
  const deco = [
    mark(3, 3.2, 8, -18, a), mark(90, 2.4, 7, 16, a), mark(92, 11.5, 4.4, 24, a * 0.8), mark(4.5, 13, 3.6, -12, a * 0.8),
    mark(3.5, 40, 4.6, -20, a * 0.7), mark(93.5, 52, 3.8, 18, a * 0.7), mark(3, 74, 3.4, 14, a * 0.6), mark(94, 86, 5, -14, a * 0.6),
  ].join('');
  const font = W * set.font;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
    body { background: linear-gradient(170deg, ${shot.from}, ${shot.to}); position: relative; font-family: "Arial Rounded MT Bold", ui-rounded, system-ui, sans-serif; }
    .deco { position: absolute; height: auto; }
    h1 { position: absolute; left: 0; right: 0; top: ${(top - font * 2.16) / 2}px; margin: 0; text-align: center; font-weight: normal; font-size: ${font}px; line-height: 1.08; letter-spacing: -0.012em; color: ${ink}; white-space: nowrap; z-index: 100; }
    h1 em { font-style: normal; color: ${accent}; }
  </style></head><body>${deco}<h1>${title}</h1>${shot.kinds ? kinds(set, shotsDir) : device(set, shot, join(shotsDir, set.raw, `${shot.name}.png`))}
  <script>
    // A long headline gets a smaller size rather than running into the edges; it stays centred above the
    // device, and a decoration that would touch its words makes way.
    document.fonts.ready.then(() => {
      const h = document.querySelector('h1');
      const lines = [...h.querySelectorAll('span')];
      const widest = Math.max(...lines.map((s) => s.getBoundingClientRect().width));
      const size = ${font} * Math.min(1, ${W * 0.9} / widest);
      h.style.fontSize = size + 'px';
      h.style.top = (${top} - size * 2.16) / 2 + 'px';
      const words = lines.map((s) => s.getBoundingClientRect());
      const gap = ${W * 0.012};
      for (const d of document.querySelectorAll('.deco')) {
        const r = d.getBoundingClientRect();
        if (words.some((b) => r.left < b.right + gap && r.right > b.left - gap && r.top < b.bottom && r.bottom > b.top)) d.remove();
      }
      window.__fitted = true;
    });
  </script></body></html>`;
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
  // A whole set replaces the last one, so a shot that has gone or moved doesn't linger.
  if (!names.length) for (const f of readdirSync(dir)) if (f.endsWith('.png')) rmSync(join(dir, f));
  // Each set is numbered by its own shots: a shot marked `only` is left out of the other device's set.
  const setShots = SHOTS.filter((s) => !s.only || s.only === set.raw);
  const shots = setShots.filter((s) => !names.length || names.includes(s.name));
  await drive({ width: set.W, height: set.H, dpr: 1, outDir: tmp, quiet: true, base: 'http://localhost:8651/' }, async (d) => {
    for (const shot of shots) {
      const order = String(setShots.indexOf(shot) + 1).padStart(2, '0');
      const html = join(tmp, `${setName}-${shot.name}.html`);
      writeFileSync(html, page(shot, set, shotsDir));
      await d.rawOpen(`file://${html}`);
      await d.waitFor(`window.__fitted && [...document.images].every((i) => i.complete && i.naturalWidth > 0)`);
      await d.sleep(120);
      const png = await d.shot(`${setName}-${shot.name}`, { draw: false });
      const final = join(dir, `${order}-${shot.name}.png`);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-pix_fmt', 'rgb24', final]);
      console.log(final);
    }
  });
}
rmSync(tmp, { recursive: true, force: true });
