// Everything that differs between the website and the iOS app: saving, haptics, sharing, the mic and
// reminders. In the app, a small native layer answers through window.webkit.messageHandlers.pockling
// and calls back through window.__pockling; on the web we use the browser's own APIs.

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

export function writeSave(state) {
  const text = JSON.stringify(state);
  try {
    localStorage.setItem(KEY, text);
  } catch {
    // Private windows can refuse; the game still plays.
  }
  if (bridge) send('save', { json: text });
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

// ── Reminders (app only) ─────────────────────────────────────────────────────────────────────────

export const canRemind = isNative;

export function setReminders(enabled, name) {
  if (bridge) send('reminders', { enabled, name });
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
