// Screenshots a page in headless Chrome with software WebGL, for checking art and screens by eye.
//   node tools/shot.mjs <out.png> <url path> [width] [height] [dpr] [wait ms] [js to run first]
// The dev server has to be running (npm run serve). Exits non-zero and prints any page errors.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [out, path, width = '390', height = '844', dpr = '2', wait = '1500', script] = process.argv.slice(2);
const BASE = process.env.BASE ?? 'http://localhost:8651/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = await new Promise((done) => {
  const s = createServer();
  s.listen(0, '127.0.0.1', () => {
    const p = s.address().port;
    s.close(() => done(p));
  });
});
const profile = mkdtempSync(join(tmpdir(), 'pockling-shot-'));
const proc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--remote-allow-origins=*',
  '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', 'about:blank',
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
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data);
  if (m.id) {
    pending.get(m.id)?.(m);
    pending.delete(m.id);
  } else if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    errors.push(m.params.entry.text + ' ' + (m.params.entry.url ?? ''));
  } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
  }
};
const send = (method, params = {}) => new Promise((r) => {
  const id = ++seq;
  pending.set(id, r);
  ws.send(JSON.stringify({ id, method, params }));
});

let code = 0;
try {
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: Number(width), height: Number(height), deviceScaleFactor: Number(dpr), mobile: false });
  await send('Page.navigate', { url: new URL(path, BASE).href });
  await sleep(Number(wait));
  if (script) {
    const r = await send('Runtime.evaluate', { expression: script, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) errors.push(r.result.exceptionDetails.exception?.description ?? r.result.exceptionDetails.text);
    else if (r.result?.result?.value !== undefined) console.log(JSON.stringify(r.result.result.value));
  }
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  if (errors.length) {
    console.error('PAGE ERRORS:\n' + errors.join('\n'));
    code = 1;
  }
} finally {
  ws.close();
  proc.kill();
  await sleep(400);
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
process.exit(code);
