// Starts the game: bakes what's needed, picks the first scene, runs the frame loop and sends touches to
// whichever scene is on stage.
import { audio } from './audio.js';
import { BREEDS, BREED_IDS } from './catalog.js';
import { applySettings, checkDaily, game, goTo, initGame, makePet, measure, save, tickState } from './game.js';
import { home } from './scenes/home.js';
import { hatch } from './scenes/hatch.js';
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
import { on, ready, setKeepAwake, startMotion, setReminders } from './platform.js';
import { adopt, stageOf, trait } from './state.js';
import { clamp } from './util.js';

const canvas = document.getElementById('stage');
const params = new URLSearchParams(location.search);
const demo = params.get('demo');

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
  on('fold', (fold) => {
    game.fold = fold;
    measure();
    game.scene?.resize?.();
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
  adopt(s, { breed, coat: params.get('coat') ?? BREEDS[breed].coats[0].id, name: params.get('name') ?? 'Mochi' }, game.now());
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
  if (!state.pet) {
    goTo(hatch);
  } else {
    tickState();
    makePet();
    goTo(demoScene() ?? home, { greet: !demo });
    if (!demo) {
      const visit = checkDaily();
      if (visit) setTimeout(() => ui.daily(visit), 900);
    }
    if (state.settings.reminders) setReminders(true, state.pet.name);
  }
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

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      measure();
      game.scene?.resize?.();
    }, 120);
  });

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
window.__scenes = { home, hatch, bath, walk, fetchGame, snackGame, hideGame };
window.__state = { trait, stageOf, BREED_IDS };
window.__talk = talkMode;
window.__audio = audio;
window.__goTo = goTo;

boot();
