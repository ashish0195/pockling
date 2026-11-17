import assert from 'node:assert/strict';
import { test } from 'node:test';

// The website, not the app: no native bridge, so haptics go to navigator.vibrate.
globalThis.window = {};
const calls = [];
const nav = { vibrate: (pattern) => calls.push(pattern), userActivation: { hasBeenActive: false } };
Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true, writable: true });
const { haptic } = await import('../web/src/platform.js');

test('on the web, haptics wait for the first tap', () => {
  // Before it, browsers ignore vibrate, and Chrome logs a warning for every try.
  haptic('light');
  assert.deepEqual(calls, []);
  nav.userActivation.hasBeenActive = true;
  haptic('light');
  assert.deepEqual(calls, [8]);
  // A browser that can't tell still gets them.
  delete nav.userActivation;
  haptic('medium');
  assert.deepEqual(calls, [8, 16]);
});
