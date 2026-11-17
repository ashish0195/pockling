// Drives the game inside the iOS app on a simulator, through the app's Debug-only driver
// (ios/Pockling/GameHost.swift), with the same calls as tools/drive.mjs. tools/store-shots.mjs stages its
// moments with it on the iPhone Duo, whose screens Chrome can't be: the real app, on the real displays.
// The app has to be a Debug build, installed and running.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { HELPERS, sleep } from './drive.mjs';

const BUNDLE = 'app.pockling.Pockling';

/**
 * Opens a driver on the app in simulator `udid` and gives fn the helpers. display picks the screen that
 * shot() captures: simctl's number for it (an iPhone Duo's inner screen is 3, its outer one 1).
 */
export async function simDrive({ udid, display = null, outDir = '.' }, fn) {
  const data = execFileSync('xcrun', ['simctl', 'get_app_container', udid, BUNDLE, 'data']).toString().trim();
  const dir = join(data, 'Library', 'Caches', 'driver');
  mkdirSync(dir, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  const input = join(dir, 'in.js');
  const output = join(dir, 'out.json');
  let seq = 0;

  /** Runs body in the page as an async function and returns what it returns. */
  const run = async (body, timeout = 30000) => {
    rmSync(output, { force: true });
    const tmp = join(dir, `in-${++seq}.tmp`);
    writeFileSync(tmp, body);
    renameSync(tmp, input);
    const t0 = Date.now();
    while (!existsSync(output)) {
      if (Date.now() - t0 > timeout) throw new Error(`the app didn't answer: ${body.slice(0, 160)}`);
      await sleep(25);
    }
    const answer = JSON.parse(readFileSync(output, 'utf8'));
    rmSync(output, { force: true });
    if (!answer.ok) throw new Error(`in the app: ${answer.error}\n  while running: ${body.slice(0, 200)}`);
    return answer.value;
  };

  const api = {
    sleep,
    /** Runs JS in the page (statements too, as in Chrome's console) and returns its value, awaited. */
    js: (expression) => run(`return await (0, eval)(${JSON.stringify(expression)});`),
    /** Opens the game at a path like tools/drive.mjs's, 'web/?demo=home&...', and adds the T helpers. */
    async open(path, wait = 3000) {
      const url = `${BUNDLE_PAGE}${path.replace(/^web\/?/, '')}`;
      // The page being left is marked, so the new one can't be mistaken for it while it loads.
      await run(`window.__leaving = true; setTimeout(() => { location.href = ${JSON.stringify(url)}; }, 30); return true;`);
      await sleep(400);
      await api.waitFor('!window.__leaving && window.__game && window.__game.g && window.__game.scene', 30000);
      await sleep(wait);
      await api.js(`${HELPERS}; true`);
    },
    async waitFor(expression, timeout = 15000) {
      const t0 = Date.now();
      while (Date.now() - t0 < timeout) {
        if (await api.js(`!!(${expression})`).catch(() => false)) return true;
        await sleep(150);
      }
      throw new Error(`timed out waiting for: ${expression}`);
    },
    /** Saves a screenshot of the display as <outDir>/<name>.png, drawing a fresh frame first. */
    async shot(name, { draw = true } = {}) {
      if (draw) await api.js('T.draw()').catch(() => {});
      const file = join(outDir, `${name}.png`);
      api.capture(file);
      return file;
    },
    /** A screenshot of the display, straight from the simulator, as PNG or by the file's extension. */
    capture(file) {
      const type = file.endsWith('.jpg') ? 'jpeg' : 'png';
      execFileSync('xcrun', ['simctl', 'io', udid, 'screenshot', `--type=${type}`, ...(display ? [`--display=${display}`] : []), file], { stdio: 'ignore' });
    },
  };
  await fn(api);
}

const BUNDLE_PAGE = 'pockling://app/';
