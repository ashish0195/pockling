// Writes a save for a simulator, made by the game's own state.js, so a capture can start with a chosen pet.
// Used for 1.3's widget screenshot (docs/ASO.md, Screenshots):
//   node tools/widget-save.mjs "<app data>/Library/Application Support/pockling-save.json" kitling peach Mochi 12 \
//     tummy=97 clean=98 energy=96 fun=95 love=99
// <app data> is `xcrun simctl get_app_container <udid> app.pockling.Pockling data`. Arguments after the care days
// are needs (name=value), `asleep`, or `room=<room>`.
import { writeFileSync } from 'node:fs';

const root = new URL('../web/src/', import.meta.url).href;
const { newGame, adopt } = await import(root + 'state.js');
const { dayNumber } = await import(root + 'util.js');
const [out, breed, coat, name, days, ...rest] = process.argv.slice(2);
if (!out || !breed || !coat || !name || !days) {
  console.error('usage: node tools/widget-save.mjs <out> <breed> <coat> <name> <careDays> [need=value...] [asleep] [room=x]');
  process.exit(2);
}
const now = Date.now();
const s = newGame();
adopt(s, { breed, coat, name, seed: 4242 }, now - 5 * 86400000);
const p = s.pet;
p.careDays = Number(days);
p.lastCareDay = dayNumber(now);
p.lastTick = now;
p.xp = 140;
s.lastVisit = dayNumber(now);
s.streak = 3;
s.stamps = [{ day: dayNumber(now) - 2, sticker: '🌸' }, { day: dayNumber(now) - 1, sticker: '⭐' }, { day: dayNumber(now), sticker: '🍓' }];
s.totals = { fed: 12, petted: 40, washed: 3, walked: 2, played: 4, slept: 2, talked: 1 };
for (const arg of rest) {
  if (arg === 'asleep') p.asleep = true;
  else {
    const [k, v] = arg.split('=');
    if (k === 'room') { p.room = v; s.owned.rooms.push(v); } else p[k] = Number(v);
  }
}
writeFileSync(out, JSON.stringify(s));
console.log(JSON.stringify(p));
