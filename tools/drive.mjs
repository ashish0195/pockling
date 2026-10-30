// Drives the game in headless Chrome with software WebGL: used by the smoke test and for checking screens.
// Software GL is slow, so tests step scenes by hand with T.ff instead of waiting for frames.
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HELPERS = `
window.T = {
  get g() { return window.__game; },
  get scene() { return window.__game.scene; },
  ff(sec, dt = 1 / 30) {
    const g = window.__game;
    let sinceDraw = 0;
    for (let t = 0; t < sec; t += dt) {
      g.time += dt;
      g.g.time = g.time;
      g.scene.update(dt);
      sinceDraw += dt;
      if (sinceDraw >= 0.2) {
        sinceDraw = 0;
        this.draw();
      }
    }
    this.draw();
  },
  draw() {
    const g = window.__game;
    g.g.begin(1, 0.95, 0.9);
    g.scene.draw(g.g);
    g.g.end();
  },
  down(x, y, id = 1) { window.__game.scene.down?.(x, y, id); },
  move(x, y, id = 1) { window.__game.pointer = [x, y]; window.__game.scene.move?.(x, y, id); },
  up(x, y, id = 1) { window.__game.scene.up?.(x, y, id); },
  tap(x, y, id = 1) { this.down(x, y, id); this.up(x, y, id); },
  swipe(x0, y0, x1, y1, steps = 12, dt = 1 / 30) {
    this.down(x0, y0);
    for (let i = 1; i <= steps; i++) {
      this.move(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps);
      this.ff(dt, dt);
    }
    this.up(x1, y1);
  },
  click(sel) {
    const el = document.querySelector(sel);
    if (!el) throw new Error('nothing matches ' + sel);
    el.click();
  },
  has(sel) { return !!document.querySelector(sel); },
  text(sel) { return document.querySelector(sel)?.textContent ?? null; },
  pet() {
    const p = window.__game.state.pet;
    return p && { name: p.name, tummy: Math.round(p.tummy), clean: Math.round(p.clean), energy: Math.round(p.energy), fun: Math.round(p.fun), love: Math.round(p.love), asleep: p.asleep, xp: p.xp };
  },
};
`;

/** Opens a browser and gives fn a set of helpers. Throws at the end if the page logged any errors. */
export async function drive(options, fn) {
  const { width = 390, height = 844, dpr = 1, base = process.env.BASE ?? 'http://localhost:8651/', outDir = process.env.SHOTS ?? join(tmpdir(), 'pockling-shots'), quiet = false, media = false } = options;
  mkdirSync(outDir, { recursive: true });
  const port = await new Promise((done) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const p = s.address().port;
      s.close(() => done(p));
    });
  });
  const profile = mkdtempSync(join(tmpdir(), 'pockling-drive-'));
  const proc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--remote-allow-origins=*',
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required',
    '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    ...(media ? ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] : []),
    'about:blank',
  ], { stdio: 'ignore' });

  let page;
  for (let i = 0; i < 100 && !page; i++) {
    try {
      page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
    } catch {
      // not listening yet
    }
    if (!page) await sleep(150);
  }
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let seq = 0;
  const pending = new Map();
  const errors = [];
  const noise = /favicon|navigator\.vibrate|icon\.png|og\.jpg/;
  ws.onmessage = ({ data }) => {
    const m = JSON.parse(data);
    let text = null;
    if (m.id) {
      pending.get(m.id)?.(m);
      pending.delete(m.id);
    } else if (m.method === 'Runtime.exceptionThrown') {
      text = m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text;
    } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      text = `${m.params.entry.text} ${m.params.entry.url ?? ''}`;
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      text = m.params.args.map((a) => a.value ?? a.description).join(' ');
    }
    if (text && !noise.test(text)) errors.push(text);
  };
  const send = (method, params = {}) => new Promise((r) => {
    const id = ++seq;
    pending.set(id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const api = {
    errors,
    sleep,
    /** Runs JS in the page and returns its value. */
    async js(expression) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) {
        const e = r.result.exceptionDetails;
        throw new Error(`in page: ${e.exception?.description ?? e.text}\n  while running: ${expression.slice(0, 200)}`);
      }
      return r.result?.result?.value;
    },
    async open(path, wait = 3000) {
      await send('Page.navigate', { url: new URL(path, base).href });
      await api.waitFor('window.__game && window.__game.g', 12000).catch((e) => {
        throw new Error(`${e.message}\n${errors.join('\n')}`);
      });
      await sleep(wait);
      await api.js(HELPERS);
    },
    /** Screenshots after this keep the page's transparency. */
    transparent() {
      return send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    },
    /** Opens a page that isn't the game. */
    async rawOpen(path) {
      await send('Page.navigate', { url: new URL(path, base).href });
    },
    /** Waits until an expression is true in the page. */
    async waitFor(expression, timeout = 15000) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) {
        if (await api.js(`!!(${expression})`).catch(() => false)) return true;
        await sleep(120);
      }
      throw new Error(`timed out waiting for: ${expression}`);
    },
    /** Saves a screenshot under SHOTS, drawing a fresh frame first. */
    async shot(name, { draw = true, wait = 0 } = {}) {
      if (draw) await api.js('T.draw()').catch(() => {});
      if (wait) await sleep(wait);
      const r = await send('Page.captureScreenshot', { format: 'png' });
      const file = join(outDir, `${name}.png`);
      writeFileSync(file, Buffer.from(r.result.data, 'base64'));
      if (!quiet) console.log(`  shot ${file}`);
      return file;
    },
  };

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false });
  if (media) {
    await send('Emulation.setFocusEmulationEnabled', { enabled: true });
    await send('Browser.grantPermissions', { permissions: ['audioCapture'], origin: new URL(base).origin });
  }
  try {
    await fn(api);
  } finally {
    ws.close();
    proc.kill();
    await sleep(400);
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
  if (errors.length) throw new Error(`page errors:\n${[...new Set(errors)].join('\n')}`);
}
