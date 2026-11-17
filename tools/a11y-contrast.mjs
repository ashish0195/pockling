// Measures the WCAG contrast of every visible piece of text on each of Pockling's screens (the web build, as
// the app shows it), for the App Store's Accessibility Nutrition Labels (docs/aso/accessibility.md). Text on a
// solid or gradient background is measured against it (each gradient stop, worst case); text with only the
// game's art behind it is listed as ART, for a look at that screen's screenshot. Needs the dev server.
//   node tools/a11y-contrast.mjs <out dir>
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { drive } from './drive.mjs';

const OUT = process.argv[2];
const HOME = 'web/?demo=home&breed=kitling&coat=peach&hour=15&days=12&tummy=45&love=70&fun=70&energy=90&clean=60&neck=scarf&berries=240';

const MEASURE = `(() => {
  const parse = (c) => { const m = c.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const over = (top, bottom) => { const a = top[3]; return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const stops = (img) => (img.match(/rgba?\\([^)]+\\)/g) || []).map(parse);
  // Background layers from the element up: each layer is a list of candidate colours (gradient stops).
  const layersOf = (el) => {
    const layers = [];
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const bg = parse(cs.backgroundColor);
      const g = cs.backgroundImage && cs.backgroundImage !== 'none' ? stops(cs.backgroundImage) : [];
      if (g.length) layers.push(g);
      if (bg && bg[3] > 0) layers.push([bg]);
      // The page's own colour is behind the game's canvas, so text that only reaches it is on the art,
      // seen through the translucent panels above it: measured against the page colour, marked ~.
      const page = e === document.body;
      if (bg && bg[3] >= 1) return { layers, solid: true, page };
      if (g.length && g.every((c) => c[3] >= 1)) return { layers, solid: true, page };
    }
    return { layers, solid: false };
  };
  const opacityOf = (el) => { let o = 1; for (let e = el; e; e = e.parentElement) o *= Number(getComputedStyle(e).opacity); return o; };
  const zoomOf = (el) => { let z = 1; for (let e = el; e; e = e.parentElement) { const v = Number(getComputedStyle(e).zoom); if (v) z *= v; } return z; };
  const seen = new Set();
  const rows = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent.replace(/\\s+/g, ' ').trim();
    if (!text || !/[A-Za-z0-9\\u0900-\\u097F]/.test(text)) continue;
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (el.closest('.sr-only, [aria-hidden="true"]')) continue;
    const op = opacityOf(el);
    if (op < 0.05) continue;
    const fg0 = parse(cs.color);
    const { layers, solid, page } = layersOf(el);
    const size = parseFloat(cs.fontSize) * zoomOf(el);
    const bold = Number(cs.fontWeight) >= 700;
    const large = size >= 24 || (size >= 18.66 && bold);
    let worst = null;
    if (solid) {
      // Every combination of gradient stops, bottom layer first, then the text (with its opacity) on top.
      let bases = [[255, 255, 255, 1]];
      for (const layer of layers.slice().reverse()) bases = bases.flatMap((b) => layer.map((c) => over(c, b)));
      for (const b of bases) {
        const fg = over([fg0[0], fg0[1], fg0[2], fg0[3] * op], b);
        const k = ratio(fg, b);
        if (!worst || k < worst) worst = k;
      }
    }
    rows.push({ text: text.slice(0, 48), size: Math.round(size * 10) / 10, bold, large, color: cs.color, shadow: cs.textShadow !== 'none',
      ratio: worst && Math.round(worst * 100) / 100, need: large ? 3 : 4.5, onArt: !solid || page, approx: page, cls: (el.className && String(el.className).slice(0, 30)) || el.tagName.toLowerCase() });
  }
  return rows;
})()`;

const report = {};
const screens = [];
await drive({ width: 390, height: 844, dpr: 2, safe: [59, 34], outDir: OUT, quiet: true }, async (d) => {
  const look = async (name, setup = '') => {
    if (setup) await d.js(setup);
    await d.sleep(500);
    report[name] = await d.js(MEASURE);
    await d.shot(name);
    screens.push(name);
  };
  // Hatching: a new player, nothing saved.
  await d.open('web/', 2500);
  await look('hatch');
  await d.open(HOME, 2500);
  await d.js('T.scene.idleIn = 1e9; true');
  await look('home');
  await look('tray', `T.click('[data-action="feed"]'); true`);
  await d.js('__game.ui.hideTray?.(); true');
  // Sheets: the menu, and the ones it opens (the closet, the card and the shop also open from the HUD).
  for (const [name, inMenu] of [['menu', false], ['settings', true], ['rooms', true], ['stamps', true], ['closet', false], ['card', false], ['shop', false]]) {
    await d.js('__game.ui.hideSheet?.(); true');
    if (inMenu) { await d.js(`T.click('[data-action="menu"]'); true`); await d.sleep(300); }
    await look(name, `T.click('#ui [data-action="${name}"]'); true`);
  }
  await d.js('__game.ui.hideSheet?.(); true');
  await look('play', `T.click('[data-action="play"]'); true`);
  await d.js('__game.ui.hideSheet?.(); true');
  await d.open(HOME.replace('hour=15', 'hour=21'), 2500);
  await d.js('T.scene.idleIn = 1e9; true');
  await look('night');
  await look('bedtime', 'T.scene.sleep(); T.ff(2); true');
  for (const demo of ['bath', 'walk', 'hide', 'fetch', 'snack']) {
    await d.open(HOME.replace('demo=home', `demo=${demo}`), 2500);
    await d.js('T.ff(1.5); true');
    await look(demo);
  }
});
writeFileSync(join(OUT, 'contrast.json'), JSON.stringify(report, null, 1));
for (const name of screens) {
  const rows = report[name];
  const low = rows.filter((r) => r.ratio && r.ratio < r.need && !r.approx);
  const art = rows.filter((r) => r.onArt);
  console.log(`${name.padEnd(9)} ${String(rows.length).padStart(3)} texts, ${low.length} below WCAG AA, ${art.length} on the game's art`);
  for (const r of low) console.log(`   LOW ${r.ratio}:1 (needs ${r.need}) ${r.size}px${r.bold ? ' bold' : ''} ${r.color} "${r.text}" [${r.cls}]`);
  for (const r of art) console.log(`   ART ${r.ratio ? `~${r.ratio}:1 (needs ${r.need}) ` : ''}${r.size}px${r.bold ? ' bold' : ''} ${r.color}${r.shadow ? ' +shadow' : ''} "${r.text}" [${r.cls}]`);
}
