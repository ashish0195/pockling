// Lays screenshots out on one sheet with their names, for looking at many screens at once.
//   node tools/sheet.mjs <out.png> <columns> <thumb width> <file.png> [file.png...]
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';

const [out, cols, thumb, ...files] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dir = mkdtempSync(join(tmpdir(), 'pockling-sheet-'));
const html = join(dir, 'sheet.html');
writeFileSync(html, `<!doctype html><body style="margin:0;background:#333;font:600 13px system-ui;color:#fff">
<div style="display:grid;grid-template-columns:repeat(${cols},${thumb}px);gap:8px;padding:8px">
${files.map((f) => `<figure style="margin:0"><img src="file://${resolve(f)}" style="width:100%;display:block;border-radius:6px"><figcaption style="padding:3px 0">${basename(f, '.png')}</figcaption></figure>`).join('')}
</div></body>`);
const port = await new Promise((done) => {
  const s = createServer();
  s.listen(0, '127.0.0.1', () => {
    const p = s.address().port;
    s.close(() => done(p));
  });
});
const proc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${join(dir, 'profile')}`, '--remote-allow-origins=*',
  '--no-first-run', '--hide-scrollbars', 'about:blank',
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
ws.onmessage = ({ data }) => {
  const m = JSON.parse(data);
  if (m.id) {
    pending.get(m.id)?.(m);
    pending.delete(m.id);
  }
};
const send = (method, params = {}) => new Promise((r) => {
  const id = ++seq;
  pending.set(id, r);
  ws.send(JSON.stringify({ id, method, params }));
});
await send('Page.enable');
const width = Number(cols) * (Number(thumb) + 8) + 8;
await send('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: `file://${html}` });
await sleep(900);
const size = await send('Runtime.evaluate', { expression: 'document.documentElement.scrollHeight', returnByValue: true });
await send('Emulation.setDeviceMetricsOverride', { width, height: size.result.result.value, deviceScaleFactor: 1, mobile: false });
await sleep(150);
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
ws.close();
proc.kill();
await sleep(300);
rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
