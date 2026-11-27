// The running game: renderer, shared textures, the saved state, the current scene, and the helpers
// every scene needs. There's one of these; scenes import it.
import { Actor } from './actor.js';
import { audio } from './audio.js';
import { defineFoods } from './bake/food.js';
import { defineFx } from './bake/fx.js';
import { defineOutfits } from './bake/outfits.js';
import { defineRoom, defineSky, lightAt } from './bake/room.js';
import { BREEDS, ROOMS, STAGES, coatOf } from './catalog.js';
import { frameFor, minFeetY, onStage } from './fold.js';
import { Assets, Renderer } from './gl.js';
import { Particles } from './particles.js';
import { Pet } from './pet.js';
import { festivalNow } from './festival.js';
import { paintPetArt, paintStickers, stickerKey } from './petArt.js';
import { askForReview, haptic, isNative, loadSave, sendPetArt, sendStickers, setHaptics, setNap, setPetName, track, writeSave } from './platform.js';
import { adopt, dailyVisit, migrate, stageOf, tick } from './state.js';
import { clamp, dayNumber, hourOf, lerp, mixRgb, seeded } from './util.js';
import { artKey, saveGame, widgetSnapshot } from './widget.js';

export const game = {
  g: null,
  assets: null,
  fx: null,
  state: null,
  pet: null,
  actor: null,
  scene: null,
  view: { w: 390, h: 844, u: 1, ui: 1, horizon: 500, floorY: 640, dpr: 2, safeTop: 0, safeBottom: 0, crease: null, stage: { x: 0, y: 0, w: 390, h: 844, cx: 195, cy: 422 } },
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

/**
 * Works out where everything goes for this screen. On an open iPhone Duo that keeps the pet off the crease
 * (web/src/fold.js): view.crease is the band, and view.stage the part of the screen the pet has to itself.
 */
export function measure() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const probe = document.getElementById('safe-probe');
  const css = probe ? getComputedStyle(probe) : null;
  const safeTop = css ? parseFloat(css.paddingTop) || 0 : 0;
  const safeBottom = css ? parseFloat(css.paddingBottom) || 0 : 0;
  const ui = clamp(Math.min(w, h) / 560, 1, 1.75);
  const { u, horizon, floorY, crease, stage } = frameFor(w, h, { fold: game.fold, pet: game.state?.pet, safeBottom, ui });
  game.view = { w, h, u, horizon, floorY, dpr, safeTop, safeBottom, landscape: w > h, crease, stage, ui };
  const root = document.documentElement;
  root.style.setProperty('--ui', String(ui));
  // The crease for the HUD (style.css), in the HUD's own pixels: it's zoomed by --ui.
  if (crease) {
    root.dataset.fold = crease.vertical ? 'book' : 'laptop';
    root.style.setProperty('--fold-a', `${crease.a / ui}px`);
    root.style.setProperty('--fold-b', `${crease.b / ui}px`);
  } else {
    delete root.dataset.fold;
  }
  game.g.resize(w, h, dpr);
}

/** x kept on the pet's stage, for a pet drawn at this scale (actor.scale × view.u). */
export function onStageX(x, scale = game.view.u) {
  return onStage(game.view, game.state?.pet, x, scale);
}

/** y for the pet's feet that keeps a pet drawn at this scale on its stage: below a laptop's crease. */
export function feetOnStage(y, scale = game.view.u) {
  return Math.max(y, minFeetY(game.view, game.state?.pet, scale));
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
  game.pet = new Pet(game.assets, { breed: p.breed, coat: p.coat, seed: p.seed, stage: stageOf(p).id, outfit: p.outfit, look: p.look }, { bakeScale: bakeScale() });
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
  // How big the room is drawn on an open Duo depends on the kind of pet (web/src/fold.js).
  if (game.fold) measure();
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

/** In the app, each save carries a fresh snapshot of the pet for the Home Screen widget (widget.js). */
function write() {
  // A save still waiting when the player starts over mustn't write the old pet back.
  if (game.demo || game.startingOver) return;
  saveGame(game.state, game.now(), { native: isNative, writeSave });
  syncPetArt();
  syncNap();
  syncStickers();
}

let napSent = null;
let napAt = 0;

/**
 * In the app, the pet's nap for the Live Activity (ios/Pockling/NapActivity.swift): when it's tucked in, when it
 * wakes, and its wake time, from the widget's own forecast (widget.js), worked out at most every 30 s while it
 * sleeps. Sent only when it changes.
 */
function syncNap() {
  if (!isNative) return;
  const p = game.state.pet;
  const now = game.now();
  if (p?.asleep && napSent?.startsWith('{"on":true') && now - napAt < 30000) return;
  let nap = { on: false };
  if (p?.asleep) {
    napAt = now;
    const up = widgetSnapshot(game.state, now).moments.find((m) => !m.asleep);
    if (up) nap = { on: true, name: p.name, breed: p.breed, coat: coatOf(p).id, stage: stageOf(p).id, ...(artKey(p) ? { art: artKey(p) } : {}), wake: up.at };
  }
  const key = JSON.stringify(nap);
  if (key === napSent) return;
  napSent = key;
  setNap(nap);
}

let painting = false;

/**
 * In the app, something of the pet's that the game paints for the phone (petArt.js), a while after a save and once
 * for each key: when the key changes (its look, its stage), it's painted again. One painting at a time, so the game
 * never stutters for long. A save for a key already waiting or painting leaves it alone: the game saves every
 * second, and in 1.4 each save put the widget's pictures off again, until the app had been away and back.
 */
function painter(what, keyOf, paint, deliver, wait) {
  let done = null;
  let waiting = null;
  let busy = null;
  let timer = 0;
  const sync = () => {
    if (!isNative) return;
    const key = keyOf(game.state.pet);
    if (!key || key === done || key === waiting || key === busy) return;
    clearTimeout(timer);
    waiting = key;
    timer = setTimeout(async () => {
      waiting = null;
      const p = game.state.pet;
      if (!p || keyOf(p) !== key || game.startingOver) return;
      if (painting) {
        sync();
        return;
      }
      painting = true;
      busy = key;
      try {
        const out = await paint(p);
        // Only if it's still that pet, that look and that stage.
        if (out && keyOf(game.state.pet) === key && !game.startingOver) deliver(out);
      } catch (err) {
        console.warn(`No ${what} this time:`, err);
      } finally {
        // Tried, whatever came of it: not again this launch.
        done = key;
        busy = null;
        painting = false;
        // A change while painting: catch up with it.
        sync();
      }
    }, wait);
  };
  return sync;
}

/**
 * A pet with a look of its own needs the widget's pictures painted for it: once a launch, and again when its look
 * or stage changes (its art key). The widget shows its breed and coat's pictures until they arrive.
 */
const syncPetArt = painter('widget pictures', artKey, paintPetArt, sendPetArt, 1500);

/**
 * Every pet's stickers for Messages, after the widget's pictures: painted when its look or age changes, and not
 * for a set the app already keeps (it tells the page, as __pocklingStickerKey).
 */
const syncStickers = painter('stickers', (p) => {
  const key = stickerKey(p);
  return key === globalThis.__pocklingStickerKey ? null : key;
}, paintStickers, sendStickers, 4000);

export function save(now = false) {
  clearTimeout(saveTimer);
  if (game.demo || game.startingOver) return;
  if (now) {
    write();
    return;
  }
  saveTimer = setTimeout(write, 800);
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
    afterHappyRound();
  }
}

// ── Usage data, the notification card and the rating prompt (the app only) ──────────────────────

/** The game or activity being played, for its play and finish events. Scenes name it with `mode`. */
let round = null;
let happyRound = false;
let offered = false;
let rated = false;
const launchedAt = Date.now();

function beginRound(scene) {
  if (!scene.mode) return;
  round = { mode: scene.mode, done: false, ...liveProps(scene.mode) };
  happyRound = false;
  track('play', { mode: scene.mode, ...liveProps(scene.mode) });
}

/** Walks and Fetch in the Snow Festival's snow say so (live events' analytics, stocks-bot games/CONTRACT.md). */
function liveProps(mode) {
  if (mode !== 'walk' && mode !== 'fetch') return {};
  const ev = festivalNow(game.now());
  return ev ? { live: ev.id } : {};
}

/** A game or activity came to its proper end: the score sheet, the poof after a bath, home from a walk. */
export function roundDone(props = {}) {
  if (!round || round.done) return;
  round.done = true;
  happyRound = true;
  track('finish', { mode: round.mode, result: 'done', ...(round.live ? { live: round.live } : {}), ...props });
}

/** Leaving before the end, by the ✕. */
function endRound() {
  if (round && !round.done) track('finish', { mode: round.mode, result: 'quit', ...(round.live ? { live: round.live } : {}) });
  round = null;
}

/**
 * Home again after a game that ended well: a good moment to offer reminders, once per launch, from the
 * very first one, the launch the pet hatched in included (most players who hatch a pet finish a game
 * with it that first time, and only a third come back the next day, so waiting for a second day of care
 * reached almost nobody); or else, on a day whose stamp kept a streak going, for the app's rating prompt,
 * never in the launch the pet hatched in. The app adds its own limits: the card only before iOS has
 * asked (or while reminders arrive quietly), at most three times, days apart; the rating from the second
 * day of use, once per version, never in a launch that showed the card.
 */
function afterHappyRound() {
  const p = game.state.pet;
  if (!isNative || game.demo || !p) return;
  const hatchedNow = p.born >= launchedAt;
  const offer = !offered;
  const rate = !rated && !hatchedNow && keptStreakToday();
  if (!offer && !rate) return;
  offered ||= offer;
  rated ||= rate;
  game.ui?.afterHappyRound?.({ offer, rate, at: p.careDays >= 2 ? 'happy_round' : 'first_day' });
}

/** Today's stamp is in the book, and it's the second day in a row or more. */
function keptStreakToday() {
  const s = game.state;
  return s.streak >= 2 && s.lastVisit === dayNumber(game.now());
}

/** The pet grew up and the banner saying so was closed: the app may ask for a rating. */
export function grewUpAndCheered() {
  if (!isNative || game.demo || rated) return;
  rated = true;
  setTimeout(() => {
    if (game.ui?.quiet?.()) askForRatingNicely('grew');
  }, 700);
}

/**
 * Apple's rating prompt, at a happy moment, gently: the pet glows with hearts first, and the prompt comes a
 * moment later, when nothing else is on screen. Nothing of ours asks anything or gates it (Guideline 5.6.1):
 * the app decides whether it's due (NineIO.swift: from the second day, once a version) and iOS whether it
 * shows. Never mid-game, at launch or from a button.
 */
export function askForRatingNicely(moment) {
  if (!isNative || game.demo) return;
  const c = game.pet?.anchors?.center;
  if (c && game.scene === homeScene()) {
    game.fx.heartBurst(c[0], c[1] - 30, 10);
    audio.coo();
    haptic('light');
  }
  setTimeout(() => {
    if (game.ui?.quiet?.()) askForReview(moment);
  }, 1100);
}

/** The home scene, without importing it here (it imports this module). */
const homeScene = () => window.__scenes?.home;

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
