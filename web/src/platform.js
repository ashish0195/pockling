// Everything that differs between the website and the iOS app: saving, haptics, sharing, the mic,
// reminders and usage data. In the app, a small native layer answers through
// window.webkit.messageHandlers.pockling and calls back through window.__pockling; on the web we use
// the browser's own APIs.

const bridge = window.webkit?.messageHandlers?.pockling ?? null;
const listeners = new Map();

export const isNative = Boolean(bridge);

function send(cmd, data = {}) {
  bridge?.postMessage({ cmd, ...data });
}

/** Native code calls this to deliver events to the game. */
window.__pockling = {
  emit(event, payload) {
    for (const fn of listeners.get(event) ?? []) fn(payload);
  },
};

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}

const KEY = 'pockling.save';

export function loadSave() {
  try {
    // The app writes its saved copy into the page before the game starts.
    const text = window.__pocklingSave ?? localStorage.getItem(KEY);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/**
 * Saves the game. In the app, widget is the Home Screen widget's snapshot of the pet ({ snapshot, key },
 * from widget.js): the app keeps it on the phone for the widget.
 */
export function writeSave(state, widget = null) {
  const text = JSON.stringify(state);
  try {
    localStorage.setItem(KEY, text);
  } catch {
    // Private windows can refuse; the game still plays.
  }
  if (bridge) send('save', widget ? { json: text, widget: widget.snapshot, widgetKey: widget.key } : { json: text });
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
  if (bridge) send('save', { json: '' });
}

// ── Touch feel ───────────────────────────────────────────────────────────────────────────────────

let hapticsOn = true;

export function setHaptics(value) {
  hapticsOn = value;
  if (!value) purr(false);
}

const PATTERNS = { light: 8, medium: 16, heavy: 28, success: [12, 40, 18], soft: 6, boing: [10, 30, 10] };

export function haptic(kind = 'light') {
  if (!hapticsOn) return;
  if (bridge) send('haptic', { kind });
  else navigator.vibrate?.(PATTERNS[kind] ?? 10);
}

/** A continuous purr you can feel, while being stroked. */
export function purr(on_) {
  if (bridge) send('purr', { on: on_ && hapticsOn });
}

// ── Sharing ──────────────────────────────────────────────────────────────────────────────────────

/** Shares or saves a picture. blob is a PNG; returns how it went. */
export async function shareImage(blob, text, filename) {
  if (bridge) {
    const data = await new Promise((done) => {
      const r = new FileReader();
      r.onload = () => done(String(r.result).split(',')[1]);
      r.readAsDataURL(blob);
    });
    send('share', { png: data, text });
    return 'shared';
  }
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'saved';
}

export function openLink(url) {
  if (bridge) send('open', { url });
  else window.open(url, '_blank', 'noopener');
}

// ── Notifications and usage data (app only) ──────────────────────────────────────────────────────
//
// The app's NineIO (ios/Pockling/NineIO.swift) sends 9io anonymous usage events and looks after
// notifications. The website sends nothing: without the bridge, everything here does nothing.

/**
 * Records a usage event: a lower_snake_case name and a few short properties, such as a game's mode key
 * or a score. Never the pet's name or anything the player typed.
 */
export function track(name, props = {}) {
  if (!bridge) return;
  const strings = {};
  for (const [key, value] of Object.entries(props)) strings[key] = String(value);
  send('track', { name, props: strings });
}

let asked = 0;
const waiting = new Map();

on('answer', ({ id, value }) => {
  waiting.get(id)?.(value);
  waiting.delete(id);
});

/** Asks the app something and waits for its answer: null in a browser. */
function ask(cmd, data = {}) {
  if (!bridge) return Promise.resolve(null);
  const id = ++asked;
  return new Promise((done) => {
    waiting.set(id, done);
    send(cmd, { ...data, id });
  });
}

/**
 * The player's choices: { reminders, news, analytics, allowed }, allowed being whether iOS lets the app
 * show notifications. The answers below carry them too, as they stand afterwards.
 */
export const notifySettings = () => ask('notifySettings');

/** key is reminders, news or analytics. Turning on a notification one asks iOS; blocked: it said no. */
export const setNotifySetting = (key, value) => ask('notifySet', { key, on: value });

/** { offer }: whether to show our own "turn on notifications?" card now. */
export const canOfferNotifications = () => ask('notifyOffer');

/** answer is all (reminders and news), reminders or later. { granted }: iOS allowed them. */
export const answerNotificationOffer = (answer) => ask('notifyAnswer', { answer });

/** Opens Pockling's page in iOS Settings, to allow notifications. */
export function openNotificationSettings() {
  send('openSettings');
}

/**
 * A happy moment, once nothing is going on (the pet grew up, a day that kept a streak going): the app
 * may show iOS's rating prompt. The app decides whether it's due: from the second day of use, once per
 * version, never in a launch that showed the notification card. moment is a lower_snake_case key.
 */
export function askForReview(moment) {
  send('review', { at: moment });
}

/** The pet's name, for the text of reminders on the phone (null before an egg has hatched). */
export function setPetName(name) {
  send('pet', { name });
}

/** Tells the app's layer what the game is doing, so it can keep the screen awake or stop the mic. */
export function setKeepAwake(on_) {
  if (bridge) send('keepAwake', { on: on_ });
}

// ── The mic, for talk-back ───────────────────────────────────────────────────────────────────────

/**
 * Native: the app records, pitches up and plays back, sending us levels for the lips. Events:
 *   talk:state { state: 'listening' | 'hearing' | 'speaking' | 'denied' | 'error' }
 *   talk:level { level: 0..1 }
 * The web version of the same thing lives in talk.js and calls the same callbacks.
 */
export function nativeTalk(start) {
  send(start ? 'talkStart' : 'talkStop');
}

// ── Motion, for parallax ─────────────────────────────────────────────────────────────────────────

export function startMotion(onTilt) {
  if (bridge) {
    on('motion', ({ x, y }) => onTilt(x, y));
    send('motion', { on: true });
    return;
  }
  const handler = (e) => {
    if (e.gamma == null) return;
    onTilt(Math.max(-1, Math.min(1, e.gamma / 28)), Math.max(-1, Math.min(1, ((e.beta ?? 45) - 45) / 28)));
  };
  // iOS Safari asks permission for motion; we simply don't bother the player for a small effect there.
  if (typeof DeviceOrientationEvent !== 'undefined' && !DeviceOrientationEvent.requestPermission) {
    window.addEventListener('deviceorientation', handler);
  }
}

export function ready() {
  send('ready');
}
