// nineio-live.js: live events (festivals, cups, challenges) for 9io's browser games, such as Pockling
// on the web, from the games service at https://9io.ai/games-api/.
//
// Its source is stocks-bot/games/client/nineio-live.js: change it there, then copy it into each game,
// as NineIO.swift is copied into the iOS apps. The contract is stocks-bot/games/CONTRACT.md,
// "GET /games-api/v1/live/{app}"; the iOS apps' side is NineIO.swift's `liveEvents()`.
//
// The request names only the game; nothing about the player is sent. The last list is kept in
// localStorage, so offline a game still shows the events it knows about, and they start and end on
// time by the device's clock.
//
//   import { liveEvents, cachedLiveEvents, isOn } from './nineio-live.js';
//   const opts = { kinds: ['snow_festival'], version: '1.4' };   // the kinds the game knows, its version
//   const first = cachedLiveEvents('pockling', opts);            // at once, no network
//   const events = await liveEvents('pockling', opts);           // asks the service when the list is stale
//   const festival = events.find((e) => e.kind === 'snow_festival' && isOn(e));
//
// Options (all optional): kinds (skip other kinds; leave it out for all), version (events with a
// min_version above it are skipped, and so is every event with a min_version when it's left out),
// maxAge (seconds a list stays fresh, 900), dev (true lists drafts too, for a build being tried out),
// base (the API, for a local server), fetch (for tests), now (ms, for tests), and fixture: an answer
// like the service's (or just its events) to use instead of asking, as is globalThis.NINEIO_LIVE.

export const BASE = 'https://9io.ai/games-api/v1/';
const STORE = '9io.live.';
const FAILURE_PAUSE = 60 * 1000; // after a failed ask, liveEvents() waits this long before asking again
const lastFailure = new Map();
const asking = new Map();

function storage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null; // storage blocked (a private window, cleared site data)
  }
}

function storeKey(app, dev) {
  return STORE + app + (dev ? '.dev' : '');
}

function read(app, dev) {
  try {
    const raw = storage()?.getItem(storeKey(app, dev));
    const entry = raw ? JSON.parse(raw) : null;
    return entry && Array.isArray(entry.events) && Number.isFinite(entry.at) ? entry : null;
  } catch {
    return null;
  }
}

function write(app, dev, events) {
  try {
    storage()?.setItem(storeKey(app, dev), JSON.stringify({ at: Date.now(), events }));
  } catch {
    // no storage: the list lasts as long as the page
  }
}

function fixtureEvents(options) {
  const fixture = options.fixture ?? globalThis.NINEIO_LIVE;
  if (fixture === undefined || fixture === null) return null;
  const events = Array.isArray(fixture) ? fixture : fixture.events;
  return Array.isArray(events) ? events : [];
}

/** Whether a version is at or after another, number by number: 1.10 is after 1.9. */
export function isVersionAtLeast(version, minimum) {
  const have = String(version).split('.').map((n) => parseInt(n, 10) || 0);
  const need = String(minimum).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(have.length, need.length); i++) {
    const a = have[i] || 0;
    const b = need[i] || 0;
    if (a !== b) return a > b;
  }
  return true;
}

/** On at `now` (ms): started, and not yet ended. */
export function isOn(event, now = Date.now()) {
  return event.start * 1000 <= now && now < event.end * 1000;
}

/** Listed but not started yet: "starting soon". */
export function isUpcoming(event, now = Date.now()) {
  return now < event.start * 1000;
}

export function hasEnded(event, now = Date.now()) {
  return now >= event.end * 1000;
}

function readable(event) {
  return Boolean(event) && typeof event.id === 'string' && typeof event.kind === 'string' &&
    typeof event.title === 'string' && Number.isFinite(event.start) && Number.isFinite(event.end);
}

function tidy(event) {
  const payload = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload) ? event.payload : {};
  const art = {};
  if (event.art && typeof event.art === 'object') {
    for (const [name, url] of Object.entries(event.art)) {
      if (typeof url === 'string' && url.startsWith('https://')) art[name] = url;
    }
  }
  return {
    ...event,
    subtitle: typeof event.subtitle === 'string' ? event.subtitle : '',
    payload,
    art,
    min_version: typeof event.min_version === 'string' ? event.min_version : null,
    draft: event.draft === true,
  };
}

function shown(events, { kinds, version, now = Date.now() }) {
  const known = kinds ? new Set(kinds) : null;
  return events
    .filter(readable)
    .map(tidy)
    .filter((e) => !known || known.has(e.kind))
    .filter((e) => e.min_version === null || (version !== undefined && isVersionAtLeast(version, e.min_version)))
    .filter((e) => !hasEnded(e, now))
    .sort((a, b) => a.start - b.start || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The last list the service gave, at once: the events of `kinds` this version shows that haven't
 * ended, the earliest start first. */
export function cachedLiveEvents(app, options = {}) {
  const events = fixtureEvents(options) ?? read(app, options.dev === true)?.events ?? [];
  return shown(events, options);
}

/** Asks the service for the game's list now. An ask already under way is shared, not doubled.
 * Resolves to true when the service answered; nothing changes when it fails. */
export function refreshLiveEvents(app, options = {}) {
  const dev = options.dev === true;
  const key = storeKey(app, dev);
  if (asking.has(key)) return asking.get(key);
  const fetcher = options.fetch || globalThis.fetch;
  const url = (options.base || BASE) + 'live/' + encodeURIComponent(app) + (dev ? '?dev=1' : '');
  const ask = (async () => {
    try {
      // The browser's HTTP cache keeps the answer 5 minutes and asks again with its ETag after that.
      const res = await fetcher(url, { credentials: 'omit', ...(dev ? { cache: 'no-store' } : {}) });
      if (res.status === 404) {
        write(app, dev, []); // a game the service doesn't know
      } else if (res.ok) {
        const answer = await res.json();
        if (!answer || !Array.isArray(answer.events)) throw new Error('not a live events answer');
        write(app, dev, answer.events);
      } else {
        throw new Error('HTTP ' + res.status);
      }
      lastFailure.delete(key);
      return true;
    } catch {
      lastFailure.set(key, Date.now());
      return false;
    } finally {
      asking.delete(key);
    }
  })();
  asking.set(key, ask);
  return ask;
}

/** The game's live events, asking the service first when the last list is older than `maxAge`
 * seconds (not within a minute of a failed ask). Offline, the last list. */
export async function liveEvents(app, options = {}) {
  if (fixtureEvents(options) === null) {
    const dev = options.dev === true;
    const key = storeKey(app, dev);
    const entry = read(app, dev);
    const age = entry ? Date.now() - entry.at : Infinity;
    const failed = lastFailure.get(key);
    const stale = age < 0 || age >= (options.maxAge ?? 15 * 60) * 1000;
    if (stale && !(failed && Date.now() - failed < FAILURE_PAUSE)) await refreshLiveEvents(app, options);
  }
  return cachedLiveEvents(app, options);
}
