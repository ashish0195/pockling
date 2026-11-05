// Renders every sound the game makes, offline, and reports how much of it a phone speaker can play.
// Each one is saved as a WAV, and --reel adds an M4A of them all with spoken names, for listening on a
// phone. The dev server has to be running.
//   node tools/sounds.mjs [--out dir] [--phone hz] [--reel] [names...]
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { drive } from './drive.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return null;
  args.splice(i, 1);
  return true;
};
const option = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return null;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
};
const out = option('--out') ?? 'build/sounds';
const reel = flag('--reel');
const phoneHz = Number(option('--phone') ?? 300);
const only = args;

// Methods on the audio object that aren't sounds of their own.
const NOT_SOUNDS = new Set(['constructor', 'unlock', 'makeNoise', 'setOn', 'suspend', 'resume', 'ready', 'chirp', 'burst', 'tone', 'ting', 'spaced', 'v', 'startMusic', 'stopMusic', 'barLength', 'playBar', 'bell', 'water']);
// Sounds that only make sense as a run: [calls, seconds apart, argument for each call].
const RUNS = { heart: [8, 0.2, () => undefined], la: [8, 0.3, (i) => i], yay: [3, 0.38, (i) => i], squeak: [3, 0.3, (i) => i], step: [8, 0.13, () => undefined], scritch: [7, 0.08, () => undefined] };
// What the reel says before a sound, when its name alone doesn't say when you'd hear it.
const SAID = { coo: 'coo, while stroked or held', heart: 'hearts popping up', purr: 'purr', squeak: 'squeaks, when stretched', wee: 'wheee, when swung around', stretchy: 'a big stretch', dizzy: 'dizzy, after chasing its tail', stars: 'stars, after a hard landing', curious: 'looking around', la: 'dancing', yay: 'celebrating', step: 'footsteps', scritch: 'scratching an ear', trill: 'trill, when it starts to dance', snore: 'snoring', boing: 'hop', thud: 'landing', rumble: 'hungry tummy', gulp: 'gulp', boop: 'nose boop' };
const LONG = { purr: 3, snore: 2.6, fanfare: 1.6, yawn: 1.2, dizzy: 1.2, stretchy: 1.4, rumble: 1.1 };

const RENDER = `
window.__render = async (name, seconds, run, phoneHz) => {
  const sr = 24000;
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * seconds), sr);
  let now = 0;
  Object.defineProperty(ctx, 'currentTime', { get: () => now });
  ctx.resume = () => Promise.resolve();
  const Real = window.AudioContext;
  window.AudioContext = function () { return ctx; };
  const a = new (__audio.constructor)();
  try { a.unlock(); } finally { window.AudioContext = Real; }
  a.voiceBase = __audio.voiceBase;
  // Left is what the game plays. Right is the same through a steep high-pass, 300 Hz unless asked,
  // roughly the part a phone speaker can play.
  a.master.disconnect();
  const merge = ctx.createChannelMerger(2);
  a.master.connect(merge, 0, 0);
  let hp = a.master;
  for (let i = 0; i < 3; i++) {
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = phoneHz;
    f.Q.value = Math.SQRT1_2;
    hp.connect(f);
    hp = f;
  }
  hp.connect(merge, 0, 1);
  merge.connect(ctx.destination);
  if (name === 'purr') a.purr(true);
  else if (run) for (let i = 0; i < run[0]; i++) { now = i * run[1]; a[name](run[2][i]); }
  else a[name]();
  now = 0;
  const buf = await ctx.startRendering();
  const raw = buf.getChannelData(0);
  const phone = buf.getChannelData(1);
  let end = raw.length;
  while (end > 0 && Math.abs(raw[end - 1]) < 0.002) end--;
  const rms = (d) => { let s = 0; for (let i = 0; i < end; i++) s += d[i] * d[i]; return Math.sqrt(s / Math.max(1, end)); };
  let peak = 0;
  for (let i = 0; i < end; i++) peak = Math.max(peak, Math.abs(raw[i]));
  const db = (v) => 20 * Math.log10(Math.max(v, 1e-6));
  const n = Math.min(raw.length, end + Math.round(sr * 0.05));
  const pcm = new DataView(new ArrayBuffer(44 + n * 2));
  const text = (o, s) => { for (let i = 0; i < s.length; i++) pcm.setUint8(o + i, s.charCodeAt(i)); };
  text(0, 'RIFF'); pcm.setUint32(4, 36 + n * 2, true); text(8, 'WAVEfmt '); pcm.setUint32(16, 16, true);
  pcm.setUint16(20, 1, true); pcm.setUint16(22, 1, true); pcm.setUint32(24, sr, true); pcm.setUint32(28, sr * 2, true);
  pcm.setUint16(32, 2, true); pcm.setUint16(34, 16, true); text(36, 'data'); pcm.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) pcm.setInt16(44 + i * 2, Math.max(-1, Math.min(1, raw[i])) * 32767, true);
  let bin = '';
  const bytes = new Uint8Array(pcm.buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { seconds: end / sr, peak, all: db(rms(raw)), phone: db(rms(phone)), wav: btoa(bin) };
};`;

mkdirSync(out, { recursive: true });
const results = [];
await drive({ quiet: true }, async (d) => {
  await d.open('web/?demo=home&breed=kitling&hour=11', 1500);
  await d.js(RENDER);
  const names = (await d.js(`Object.getOwnPropertyNames(Object.getPrototypeOf(__audio))`)).filter((n) => !NOT_SOUNDS.has(n) && (!only.length || only.includes(n)));
  for (const name of names) {
    const run = RUNS[name];
    const seconds = run ? run[0] * run[1] + 1 : LONG[name] ?? 0.9;
    const callArgs = run && [run[0], run[1], Array.from({ length: run[0] }, (_, i) => run[2](i))];
    const r = await d.js(`__render(${JSON.stringify(name)}, ${seconds}, ${JSON.stringify(callArgs ?? null)}, ${phoneHz})`);
    writeFileSync(join(out, `${name}.wav`), Buffer.from(r.wav, 'base64'));
    results.push({ name, ...r });
  }
});

const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('sound', 12)}${pad('length', 8)}${pad('peak', 7)}${pad('level dB', 10)}phone dB (what a ${phoneHz} Hz high-pass leaves)`);
for (const r of results) {
  const lost = r.all - r.phone;
  console.log(`${pad(r.name, 12)}${pad(r.seconds.toFixed(2), 8)}${pad(r.peak.toFixed(2), 7)}${pad(r.all.toFixed(1), 10)}${r.phone.toFixed(1)}${lost > 6 ? `   loses ${lost.toFixed(0)} dB on a phone` : ''}`);
}

if (reel) {
  // Each sound after its name, read out by the Mac's own speech voice.
  const tmp = join(out, 'reel-parts');
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const parts = [];
  const silence = join(tmp, 'gap.wav');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=24000:cl=mono', '-t', '0.7', '-c:a', 'pcm_s16le', silence]);
  for (const r of results) {
    const said = join(tmp, `${r.name}.aiff`);
    execFileSync('say', ['-v', 'Samantha', '-o', said, SAID[r.name] ?? r.name]);
    const label = join(tmp, `${r.name}-label.wav`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', said, '-ar', '24000', '-ac', '1', '-af', 'volume=0.6', '-c:a', 'pcm_s16le', label]);
    parts.push(label, silence, join(out, `${r.name}.wav`), silence);
  }
  const list = join(tmp, 'list.txt');
  writeFileSync(list, parts.map((p) => `file '${p.startsWith('/') ? p : join(process.cwd(), p)}'`).join('\n'));
  const file = join(out, 'reel.m4a');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c:a', 'aac', '-b:a', '96k', file]);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`reel: ${file}`);
}
