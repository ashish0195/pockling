// The running game: renderer, shared textures, the saved state, the current scene, and the helpers
// every scene needs. There's one of these; scenes import it.
import { Actor } from './actor.js';
import { audio } from './audio.js';
import { defineFoods } from './bake/food.js';
import { defineFx } from './bake/fx.js';
import { defineOutfits } from './bake/outfits.js';
import { defineRoom, defineSky, lightAt } from './bake/room.js';
import { BREEDS, ROOMS, STAGES } from './catalog.js';
import { Assets, Renderer } from './gl.js';
import { Particles } from './particles.js';
import { Pet } from './pet.js';
import { haptic, isNative, loadSave, setHaptics, setPetName, track, writeSave } from './platform.js';
import { adopt, dailyVisit, migrate, stageOf, tick } from './state.js';
import { clamp, hourOf, lerp, mixRgb, seeded } from './util.js';

export const game = {
  g: null,
  assets: null,
  fx: null,
  state: null,
  pet: null,
  actor: null,
  scene: null,
  view: { w: 390, h: 844, u: 1, horizon: 500, floorY: 640, dpr: 2, safeTop: 0, safeBottom: 0 },
  fold: null,
  time: 0,
  light: lightAt(12),
  tilt: [0, 0],
  tiltNow: [0, 0],
  now: () => (game.fakeNow ?? Date.now()),
  hour: () => (game.fakeHour ?? hourOf(game.now())),
  listeners: {},
  ui: null,
};

// ── Boot ─────────────────────────────────────────────────────────────────────────────────────────

export function initGame(canvas, onRestored) {
  game.g = new Renderer(canvas, {
    onRestored: () => {
      game.assets.reset();
      onRestored?.();
    },
  });
  game.assets = new Assets(game.g);
  game.fx = new Particles(game.assets);
  defineFx(game.assets);
  defineSky(game.assets);
  defineOutfits(game.assets);
  defineFoods(game.assets);
  game.state = migrate(loadSave());
  applySettings();
  measure();
}

export function applySettings() {
  const s = game.state.settings;
  audio.setOn(s.sound, s.music);
  setHaptics(s.haptics);
}

export function bakeScale() {
  return game.view.dpr >= 2 ? 4 : 3;
}

/** Works out where everything goes for this screen. */
export function measure() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const probe = document.getElementById('safe-probe');
  const css = probe ? getComputedStyle(probe) : null;
  const safeTop = css ? parseFloat(css.paddingTop) || 0 : 0;
  const safeBottom = css ? parseFloat(css.paddingBottom) || 0 : 0;
  const u = clamp(Math.min(w, h * (w > h ? 0.78 : 0.6)) / 390, 0.62, 2.4);
  const foldY = game.fold && !game.fold.vertical ? game.fold.y : null;
  const horizon = foldY ?? Math.round(h * (w > h ? 0.56 : 0.6));
  const room = h - horizon;
  const floorY = horizon + Math.min(room * 0.44, 150 * u);
  game.view = { w, h, u, horizon, floorY, dpr, safeTop, safeBottom, landscape: w > h };
  document.documentElement.style.setProperty('--ui', String(clamp(Math.min(w, h) / 560, 1, 1.75)));
  game.g.resize(w, h, dpr);
}

export function quality() {
  return Math.min(game.view.dpr, 2);
}

// ── Time and light ───────────────────────────────────────────────────────────────────────────────

export function refreshLight() {
  game.light = lightAt(game.hour());
}

/** The scene's light after dimming for bedtime. */
export function ambient(dim = 0) {
  return mixRgb(game.light.ambient, [0.27, 0.28, 0.5], dim);
}

/** The pet catches less of the dark than the room does: it should always be easy to love. */
export function petLight(amb) {
  return mixRgb(amb, [1, 0.97, 0.94], 0.5);
}

// ── Pet ──────────────────────────────────────────────────────────────────────────────────────────

export function makePet() {
  const p = game.state.pet;
  if (!p) return null;
  game.pet = new Pet(game.assets, { breed: p.breed, coat: p.coat, seed: p.seed, stage: stageOf(p).id, outfit: p.outfit }, { bakeScale: bakeScale() });
  game.pet.outfit = p.outfit;
  game.actor = new Actor(game.pet, game.fx);
  audio.voiceBase = BREEDS[p.breed].voice * ({ baby: 1.3, kid: 1.14, grown: 1 }[stageOf(p).id] ?? 1);
  return game.pet;
}

export function setPetStage() {
  const p = game.state.pet;
  game.pet.setStage(stageOf(p).id);
  audio.voiceBase = BREEDS[p.breed].voice * ({ baby: 1.3, kid: 1.14, grown: 1 }[stageOf(p).id] ?? 1);
}

export function adoptPet(spec) {
  adopt(game.state, spec, game.now());
  save(true);
  // The name is for the reminders' text on the phone; the event only says which egg it was.
  setPetName(game.state.pet.name);
  track('hatch', { breed: spec.breed, coat: spec.coat });
}

export function defineRoomArt() {
  const p = game.state.pet;
  const theme = p && ROOMS[p.room] ? p.room : 'peach';
  game.roomKey = `${theme}/${game.view.w}/${game.view.h}/${game.view.horizon}`;
  defineRoom(game.assets, theme, game.view, quality());
  for (const key of ['room.wall', 'room.floor', 'room.bed', 'room.blanket', 'room.plant', 'room.lights']) game.assets.drop(key);
}

// ── Saving ───────────────────────────────────────────────────────────────────────────────────────

let saveTimer = 0;

export function save(now = false) {
  clearTimeout(saveTimer);
  if (game.demo || game.startingOver) return;
  if (now) {
    writeSave(game.state);
    return;
  }
  saveTimer = setTimeout(() => writeSave(game.state), 800);
}

export function tickState() {
  if (game.state.pet) tick(game.state, game.now());
}

// ── Scenes ───────────────────────────────────────────────────────────────────────────────────────

export function goTo(scene, data) {
  // Coming back into the same scene halfway through (the bath starts over on a resize) is the same go.
  const sameGo = scene === game.scene && round && !round.done;
  game.scene?.exit?.();
  game.fx.clear();
  if (!sameGo) {
    endRound();
    beginRound(scene);
  }
  game.scene = scene;
  scene.enter?.(data);
  if (scene.offersNotifications && happyRound) {
    happyRound = false;
    offerNotificationsSoon();
  }
}

// ── Usage data and the notification card (the app only: in a browser, track() sends nothing) ─────

/** The game or activity being played, for its play and finish events. Scenes name it with `mode`. */
let round = null;
let happyRound = false;
let offered = false;
const launchedAt = Date.now();

function beginRound(scene) {
  if (!scene.mode) return;
  round = { mode: scene.mode, done: false };
  happyRound = false;
  track('play', { mode: scene.mode });
}

/** A game or activity came to its proper end: the score sheet, the poof after a bath, home from a walk. */
export function roundDone(props = {}) {
  if (!round || round.done) return;
  round.done = true;
  happyRound = true;
  track('finish', { mode: round.mode, result: 'done', ...props });
}

/** Leaving before the end, by the ✕. */
function endRound() {
  if (round && !round.done) track('finish', { mode: round.mode, result: 'quit' });
  round = null;
}

/**
 * Home again after a game that ended well: a good moment to offer reminders, once per launch. Never in
 * the launch the pet hatched in, nor before it has been looked after on two different days. The app
 * adds its own limits: only before iOS has asked, at most three times, days apart.
 */
function offerNotificationsSoon() {
  const p = game.state.pet;
  if (offered || !isNative || game.demo || !p || p.born >= launchedAt || p.careDays < 2) return;
  offered = true;
  game.ui?.offerNotifications?.();
}

/** A soft fade to a new scene, covering any baking it needs to do. */
export async function fadeTo(scene, data) {
  const veil = document.getElementById('veil');
  veil.classList.add('on');
  await new Promise((r) => setTimeout(r, 260));
  goTo(scene, data);
  await new Promise((r) => setTimeout(r, 40));
  veil.classList.remove('on');
}

/**
 * Shows whatever a caring action earned: level ups and growing up. Scenes call this with the result of
 * any action in state.js.
 */
export function celebrate(result) {
  if (!result) return;
  if (result.levelUp) {
    game.ui?.levelUp(result.levelUp, result.gift);
    audio.fanfare();
    haptic('success');
    const c = game.pet?.anchors.center;
    if (c) {
      game.fx.confetti(c[0], c[1] - 120, 50, game.view.w * 0.4);
      game.fx.heartBurst(c[0], c[1], 14);
    }
  }
  if (result.grew) {
    track('grow', { stage: result.grew });
    game.scene?.grew?.(result.grew);
  }
  game.ui?.refresh();
  save();
}

export function stageInfo() {
  return STAGES.find((s) => s.id === stageOf(game.state.pet).id);
}

export function checkDaily() {
  if (!game.state.pet) return null;
  const visit = dailyVisit(game.state, game.now());
  if (visit) save();
  return visit;
}

export { lerp, seeded };
