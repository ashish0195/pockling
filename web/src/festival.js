// The Snow Festival, Pockling's live event (from 1.4.1). While it's on, snow falls past the pet's window and the
// park turns white for walks and Fetch. A snowflake at the window each day, and a few more found on snowy walks,
// earn a Cozy beanie, a Winter hat and a Red scarf. The event itself comes from 9io's games service (stocks-bot
// games/CONTRACT.md, "GET /games-api/v1/live/{app}"): its dates, and these settings in its payload, so it starts
// and ends without an update. With no payload, the defaults here are the festival. The App Store event that
// points at it: docs/aso/snow-festival-event.md. No DOM here, so test/festival.test.mjs can run it.
import { OUTFITS } from './catalog.js';
import { cachedLiveEvents, isOn, isUpcoming, liveEvents } from './nineio-live.js';
import { dayNumber } from './util.js';

export const FESTIVAL_KIND = 'snow_festival';
/** This build's version, for the events' min_version. */
export const FESTIVAL_VERSION = '1.4.1';

/**
 * The settings, each one optional in the event's payload:
 *   room: 'snow' for snow at the window; park: 'snow' for a snowy park; goal: snowflakes in all;
 *   outfits: the rewards in order, and steps: the snowflakes each one needs; window: snowflakes a day from the
 *   window; walk: the most a day from walks.
 */
export const DEFAULTS = { room: 'snow', park: 'snow', goal: 7, outfits: ['beanie', 'santa', 'scarf'], steps: [2, 4, 7], window: 1, walk: 2 };

/** Berries instead of a reward the player already owns. */
export const OWNED_BERRIES = 30;

const whole = (v, lo, hi) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : null;
};

/** An event's settings: its payload where that makes sense, the defaults where it doesn't. */
export function festivalSettings(event) {
  const p = event?.payload ?? {};
  const outfits = Array.isArray(p.outfits) && p.outfits.length && p.outfits.every((o) => OUTFITS[o]) ? [...p.outfits] : [...DEFAULTS.outfits];
  let steps = Array.isArray(p.steps) && p.steps.length === outfits.length ? p.steps.map((n) => whole(n, 1, 60)) : null;
  if (!steps || steps.some((n) => n === null)) steps = outfits.length === DEFAULTS.outfits.length ? [...DEFAULTS.steps] : outfits.map((_, i) => i + 1);
  const last = Math.max(...steps);
  return {
    room: typeof p.room === 'string' ? p.room : DEFAULTS.room,
    park: typeof p.park === 'string' ? p.park : DEFAULTS.park,
    goal: Math.max(last, whole(p.goal, 1, 60) ?? last),
    outfits,
    steps,
    window: whole(p.window, 0, 5) ?? DEFAULTS.window,
    walk: whole(p.walk, 0, 10) ?? DEFAULTS.walk,
  };
}

/** The player's progress in an event, kept in the save under its id, which is never reused. */
export function festivalState(s, event) {
  s.festivals ??= {};
  const st = (s.festivals[event.id] ??= {});
  st.flakes = Number.isFinite(st.flakes) ? st.flakes : 0;
  st.window = Array.isArray(st.window) ? st.window : [];
  st.walk = st.walk && typeof st.walk === 'object' ? st.walk : {};
  st.given = Array.isArray(st.given) ? st.given : [];
  return st;
}

/** Adds snowflakes, no more than the goal, and gives whatever they reach: { gained, flakes, goal, rewards }. */
function addFlakes(s, event, n) {
  const set = festivalSettings(event);
  const st = festivalState(s, event);
  const before = st.flakes;
  st.flakes = Math.min(set.goal, st.flakes + n);
  const rewards = [];
  set.outfits.forEach((outfit, i) => {
    if (st.flakes < set.steps[i] || st.given.includes(outfit)) return;
    st.given.push(outfit);
    if (s.owned.outfits.includes(outfit)) {
      s.berries += OWNED_BERRIES;
      rewards.push({ outfit, berries: OWNED_BERRIES });
    } else {
      s.owned.outfits.push(outfit);
      rewards.push({ outfit, berries: 0 });
    }
  });
  return { gained: st.flakes - before, flakes: st.flakes, goal: set.goal, rewards };
}

/** Whether today's snowflake is waiting at the window. */
export function windowFlakeDue(s, event, now) {
  const set = festivalSettings(event);
  const st = festivalState(s, event);
  return set.window > 0 && st.flakes < set.goal && !st.window.includes(dayNumber(now));
}

/** Catching today's snowflake at the window. Null if there isn't one. */
export function catchWindowFlake(s, event, now) {
  if (!windowFlakeDue(s, event, now)) return null;
  const st = festivalState(s, event);
  st.window = [...st.window, dayNumber(now)].slice(-60);
  return addFlakes(s, event, festivalSettings(event).window);
}

/** How many more snowflakes a walk can find today. */
export function walkFlakesLeft(s, event, now) {
  const set = festivalSettings(event);
  const st = festivalState(s, event);
  if (st.flakes >= set.goal) return 0;
  return Math.max(0, set.walk - (st.walk[dayNumber(now)] ?? 0));
}

/** A snowflake found on a walk. Null when today's are all found. */
export function findWalkFlake(s, event, now) {
  if (walkFlakesLeft(s, event, now) <= 0) return null;
  const st = festivalState(s, event);
  const day = dayNumber(now);
  // Only today's count matters, so older days go.
  st.walk = { [day]: (st.walk[day] ?? 0) + 1 };
  return addFlakes(s, event, 1);
}

/** The next reward still to earn: { outfit, step } or null. */
export function nextReward(s, event) {
  const set = festivalSettings(event);
  const st = festivalState(s, event);
  const i = set.outfits.findIndex((o) => !st.given.includes(o));
  return i < 0 ? null : { outfit: set.outfits[i], step: set.steps[i] };
}

// ── The event, from the games service ───────────────────────────────────────────────────────────

/** Debug builds of the app and ?dev=1 pages see draft events too. */
const dev = () => globalThis.__pocklingDev === true;
const options = () => ({ kinds: [FESTIVAL_KIND], version: FESTIVAL_VERSION, dev: dev() });

/** The Snow Festival if it's on at `now` (ms), from the last list the service gave: at once, no network. */
export function festivalNow(now = Date.now()) {
  return cachedLiveEvents('pockling', { ...options(), now }).find((e) => isOn(e, now)) ?? null;
}

/** The next Snow Festival that hasn't started, if the service has listed one (it lists them a week ahead). */
export function festivalSoon(now = Date.now()) {
  return cachedLiveEvents('pockling', { ...options(), now }).find((e) => isUpcoming(e, now)) ?? null;
}

/** Asks the service for the list when the last one is stale; resolves to the festival on now, or null. */
export async function refreshFestival(now = () => Date.now()) {
  await liveEvents('pockling', options());
  return festivalNow(now());
}
