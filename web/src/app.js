// Starts the game: bakes what's needed, picks the first scene, runs the frame loop and sends touches to
// whichever scene is on stage.
import { audio } from './audio.js';
import { BREEDS, BREED_IDS, parseLook } from './catalog.js';
import { FESTIVAL_KIND, FESTIVAL_VERSION, refreshFestival } from './festival.js';
import { applySettings, checkDaily, game, goTo, initGame, makePet, measure, save, tickState } from './game.js';
import { home } from './scenes/home.js';
import { hatch } from './scenes/hatch.js';
import { makeover } from './scenes/makeover.js';
import { visit } from './scenes/visit.js';
import { visitFromHash } from './visit.js';
import { bath, defineBathTools } from './scenes/bath.js';
import { walk } from './scenes/walk.js';
import { fetchGame } from './scenes/fetch.js';
import { snackGame } from './scenes/snack.js';
import { hideGame } from './scenes/hide.js';
import { talkMode } from './talk.js';
import { takePhoto } from './card.js';
import { defineBubbles } from './bake/props.js';
import { ui } from './ui/hud.js';
import { fadeTo } from './game.js';
import { on, ready, setKeepAwake, setPetName, startMotion } from './platform.js';
import { adopt, stageOf, trait } from './state.js';
import { clamp } from './util.js';

const canvas = document.getElementById('stage');
const params = new URLSearchParams(location.search);
const demo = params.get('demo');

// Draft live events show to the app's Debug builds (GameHost.swift sets this) and to ?dev=1 pages.
if (params.has('dev')) globalThis.__pocklingDev = true;
// ?festival=on (or =soon) stands a Snow Festival in for the games service's list, for screenshots and tests.
if (params.has('festival')) {
  const now = Math.floor(Date.now() / 1000);
  const soon = params.get('festival') === 'soon';
  globalThis.NINEIO_LIVE = { app: 'pockling', events: [{ id: 'snow-festival-demo', kind: FESTIVAL_KIND, title: 'Snow Festival', subtitle: '', start: soon ? now + 3 * 86400 : now - 3600, end: now + 30 * 86400, payload: {}, min_version: FESTIVAL_VERSION }] };
}

function fail(message) {
  document.getElementById('loader').innerHTML = `<p style="max-width:300px;text-align:center;line-height:1.4">${message}</p>`;
}

const actions = {
  wash: () => fadeTo(bath),
  walk: () => fadeTo(walk),
  play: () => {
    const s = game.state;
    const name = s.pet.name.replace(/[<&]/g, '');
    const best = (k, unit) => (s.best[k] ? `<span class="best">Best: ${s.best[k]}${unit}</span>` : '');
    ui.sheet(`${ui.head("Let's play!")}
      <button class="play-card" data-action="startGame" data-game="fetch"><span class="art">🎾</span><span><b>Fetch</b><small>Flick the ball. ${name} brings it back.</small>${best('fetch', '')}</span></button>
      <button class="play-card" data-action="startGame" data-game="snack"><span class="art">🍩</span><span><b>Snack Drop</b><small>Slide to catch the good stuff. Watch out for broccoli.</small>${best('snack', '')}</span></button>
      <button class="play-card" data-action="startGame" data-game="hide"><span class="art">🙈</span><span><b>Hide and Seek</b><small>${name} hides. You find. Listen for the giggle.</small>${best('hide', '')}</span></button>`);
  },
  startGame: (el) => {
    ui.hideSheet();
    const scene = { fetch: fetchGame, snack: snackGame, hide: hideGame }[el.dataset.game];
    fadeTo(scene);
  },
  sleep: () => home.sleep(),
  wake: () => home.wake(),
  talk: () => talkMode.toggle(),
  photo: () => takePhoto(),
  home: () => fadeTo(home),
  makeover: () => {
    ui.hideSheet();
    const p = game.state.pet;
    // Asleep, it stays in bed: the Makeover is for an awake pet.
    if (p.asleep) {
      ui.toast(`Shh… ${p.name} is asleep. Try again when it's up!`);
      return;
    }
    fadeTo(makeover);
  },
};

function boot() {
  try {
    // The art repaints itself as it's needed, and the pet stays exactly where it was.
    initGame(canvas, () => game.scene?.resize?.());
  } catch (e) {
    console.error(e);
    fail('Pockling needs WebGL 2 to draw itself, and this browser doesn\'t have it. Try a newer browser?');
    return;
  }
  game.ui = ui;
  ui.init(actions);
  defineBubbles(game.assets);
  defineBathTools(game.assets);

  if (demo) applyDemo();

  listen();
  // The crease of an open iPhone Duo, from the app (web/src/fold.js), or null.
  on('fold', (fold) => {
    game.fold = fold;
    measure();
    game.scene?.resize?.();
  });
  // A reminder or a pockling:// link was opened (ios/Pockling/PetLinks.swift): show the pet. A menu closes,
  // and a game left open since the last visit gives way to the pet saying hello at home. Before an egg has
  // hatched, the eggs are the place to be anyway.
  on('open', ({ to, code } = {}) => {
    const scene = game.scene;
    // A visit link opened in the app: the friend's pet, wherever the game was (not mid-hatch).
    if (to === 'visit' && code && scene && scene !== hatch) {
      ui.hideSheet();
      fadeTo(visit, { code });
      return;
    }
    if (!scene || !game.state.pet || scene === hatch) return;
    ui.hideSheet();
    if (scene !== home) fadeTo(home, { greet: true });
    // The Snow Festival's App Store event (pockling://snowfestival, and 1.3.2's pockling://firstsnow): its card.
    if (to === 'snowfestival' || to === 'firstsnow') setTimeout(() => ui.on_festival(null, 'link'), scene !== home ? 800 : 150);
  });
  // A visit link opened in a tab where the game is already running only changes the # (visit.js).
  window.addEventListener('hashchange', () => {
    const code = visitFromHash(location.hash);
    if (code && game.scene && game.scene !== hatch) {
      ui.hideSheet();
      fadeTo(visit, { code });
    }
  });
  // The live events list: at launch, and on coming back to the game, when it's stale (festival.js).
  const festivalCheck = () => refreshFestival(() => game.now()).then(() => {
    ui.festivalChanged();
    if (game.scene === home) home.festivalUpdate();
  }, () => {});
  setTimeout(festivalCheck, 1500);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') festivalCheck();
  });
  startMotion((x, y) => {
    game.tilt = [x, y];
  });

  document.fonts?.ready?.then?.(() => {});
  setTimeout(start, 30);
}

/** Starts directly in a state for screenshots and recordings, without touching the real save. */
function applyDemo() {
  game.demo = true;
  const s = game.state;
  const breed = params.get('breed') ?? 'kitling';
  adopt(s, { breed, coat: params.get('coat') ?? BREEDS[breed].coats[0].id, name: params.get('name') ?? 'Mochi', look: parseLook(params.get('look')) }, game.now());
  const p = s.pet;
  p.careDays = Number(params.get('days') ?? 7);
  s.lastVisit = Math.floor(Date.now() / 86400000) + 2;
  for (const key of ['tummy', 'clean', 'energy', 'fun', 'love']) if (params.has(key)) p[key] = Number(params.get(key));
  if (params.has('hour')) game.fakeHour = Number(params.get('hour'));
  if (params.has('room')) p.room = params.get('room');
  if (params.has('head')) p.outfit.head = params.get('head');
  if (params.has('face')) p.outfit.face = params.get('face');
  if (params.has('neck')) p.outfit.neck = params.get('neck');
  s.berries = Number(params.get('berries') ?? 240);
  s.foodsTried = ['apple', 'carrot', 'cookie'];
  if (!params.has('sound')) {
    s.settings.sound = false;
    s.settings.music = false;
  }
  applySettings();
}

function start() {
  const state = game.state;
  // A visit link (visit.js): the friend's pet first, whether or not this player has one yet.
  const visiting = !demo && visitFromHash(location.hash);
  if (visiting) {
    if (state.pet) {
      tickState();
      makePet();
    }
    goTo(visit, { code: visiting });
  } else if (!state.pet) {
    goTo(hatch);
  } else {
    tickState();
    makePet();
    goTo(demoScene() ?? home, { greet: !demo });
    if (!demo) {
      const visit = checkDaily();
      if (visit) setTimeout(() => ui.daily(visit), 900);
    }
  }
  // For the text of reminders on the phone. Whether they're on is the app's to know.
  setPetName(state.pet?.name ?? null);
  document.getElementById('veil').classList.remove('on');
  document.getElementById('loader').classList.add('done');
  setTimeout(() => document.getElementById('loader')?.remove(), 400);
  ready();
  requestAnimationFrame(frame);
}

function demoScene() {
  return { bath, walk, fetch: fetchGame, snack: snackGame, hide: hideGame, home }[demo] ?? null;
}

// ── Frame loop ───────────────────────────────────────────────────────────────────────────────────

let resizeTimer = 0;

/** Lays everything out again once the screen has stopped changing size. */
function remeasure() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeTimer = 0;
    measure();
    game.scene?.resize?.();
  }, 120);
}

let last = performance.now();
let tickIn = 1;

function frame(now) {
  requestAnimationFrame(frame);
  if (game.g.lost || window.__hold) return;
  const dt = clamp((now - last) / 1000, 0, 0.05);
  last = now;
  game.time += dt;
  game.g.time = game.time;
  game.tiltNow[0] += (game.tilt[0] - game.tiltNow[0]) * Math.min(1, dt * 5);
  game.tiltNow[1] += (game.tilt[1] - game.tiltNow[1]) * Math.min(1, dt * 5);

  tickIn -= dt;
  if (tickIn <= 0) {
    tickIn = 1;
    tickState();
    ui.refresh();
    save();
    const scene = game.scene;
    if (scene === home && home.inBed && game.state.pet && !game.state.pet.asleep) home.wake();
  }

  // A turn of the screen, or an iPhone Duo opening, can end without a resize event at its final size (seen
  // as a square room on an open Duo): if the size has moved, lay out again.
  if (!resizeTimer && (window.innerWidth !== game.view.w || window.innerHeight !== game.view.h)) remeasure();

  const scene = game.scene;
  if (!scene) return;
  scene.update(dt);
  game.g.begin(1, 0.95, 0.9);
  scene.draw(game.g);
  game.g.end();
  window.__frames = (window.__frames ?? 0) + 1;
}

// ── Input ────────────────────────────────────────────────────────────────────────────────────────

function listen() {
  canvas.addEventListener('pointerdown', (e) => {
    audio.unlock();
    if (ui.sheetOpen) return;
    e.preventDefault();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Fine: we also listen on the window.
    }
    game.scene?.down?.(e.clientX, e.clientY, e.pointerId);
  });
  window.addEventListener('pointermove', (e) => {
    game.pointer = [e.clientX, e.clientY];
    game.scene?.move?.(e.clientX, e.clientY, e.pointerId);
  }, { passive: true });
  const end = (e) => game.scene?.up?.(e.clientX, e.clientY, e.pointerId);
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  window.addEventListener('resize', remeasure);

  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      save(true);
      talkMode.stop();
      audio.purr(false);
      audio.suspend();
      setKeepAwake(false);
    } else {
      audio.resume();
      tickState();
      last = performance.now();
      if (game.state.pet) {
        ui.refresh();
        const visit = checkDaily();
        if (visit) ui.daily(visit);
        if (Date.now() - hiddenAt > 20 * 60000 && game.scene === home && !game.state.pet.asleep) {
          game.actor.play(game.actor.greet());
        }
      }
    }
  });
  window.addEventListener('pagehide', () => save(true));
}

// Hooks for tests and recordings.
window.__game = game;
window.__scenes = { home, hatch, makeover, visit, bath, walk, fetchGame, snackGame, hideGame };
window.__state = { trait, stageOf, BREED_IDS };
window.__talk = talkMode;
window.__audio = audio;
window.__goTo = goTo;

boot();
