// A visit (visit.js): a friend's pet, from a link, waving on the soft stage the eggs hatch on. Whoever opened the link
// can hatch their own (no pet yet) or go back to theirs, and on the web get the app, or open the visit in it.
import { Actor } from '../actor.js';
import { audio } from '../audio.js';
import { BREEDS, coatOf } from '../catalog.js';
import { reachOf } from '../fold.js';
import { bakeScale, fadeTo, game } from '../game.js';
import { Pet } from '../pet.js';
import { haptic, isNative, openLink, track } from '../platform.js';
import { APP_STORE } from '../ui/hud.js';
import { readVisit } from '../visit.js';
import { bakeBackground, hatch } from './hatch.js';
import { home } from './home.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Leaves the visit behind: the page's #visit= goes, so a reload doesn't bring it back. */
function forget() {
  if (!isNative && location.hash) history.replaceState(null, '', location.pathname + location.search);
}

export const visit = {
  enter({ code } = {}) {
    const v = readVisit(code);
    this.v = v;
    this.code = code;
    game.assets.define('hatch.bg', () => bakeBackground());
    if (!v) {
      forget();
      setTimeout(() => fadeTo(game.state.pet ? home : hatch), 0);
      return;
    }
    game.ui.show('none');
    this.pet = new Pet(game.assets, { breed: v.breed, coat: v.coat, seed: v.seed, stage: v.stage, outfit: {}, look: v.look }, { prefix: 'visit', bakeScale: bakeScale() });
    this.actor = new Actor(this.pet, game.fx);
    this.voice = audio.voiceBase;
    audio.voiceBase = BREEDS[v.breed].voice * 1.14;
    this.place();
    this.pet.setFace('happy');
    this.pet.settle();
    this.actor.play(this.hello());
    track('visit_open', { from: isNative ? 'app' : 'web', has_pet: String(Boolean(game.state.pet)) });
    this.panel();
  },

  exit() {
    $('layer').innerHTML = '';
    if (this.voice) audio.voiceBase = this.voice;
    game.assets.drop('visit.');
  },

  *hello() {
    yield 0.35;
    audio.hello();
    yield* this.actor.wave();
    yield* this.actor.hop(40, 0.34, { sound: false });
    this.actor.relax('smile');
  },

  /** Centre stage, its feet clear of the panel. */
  place() {
    const { view } = game;
    const a = this.actor;
    const room = view.h - 250 - view.safeBottom;
    a.x = view.crease?.vertical ? view.stage.cx : view.w / 2;
    a.y = Math.min(view.h * 0.62, room);
    const tall = (reachOf({ breed: this.v.breed, look: this.v.look }).up * this.pet.stage.scale) / 1.05;
    a.scale = Math.max(0.5 * view.u, Math.min(1.3 * view.u, (a.y - 170 * view.ui) / tall));
  },

  panel() {
    const v = this.v;
    const name = esc(v.name);
    const mine = game.state.pet;
    const kind = `${coatOf(v).name.toLowerCase()} ${BREEDS[v.breed].name}`;
    const iPhone = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    $('layer').innerHTML = `
      <div id="hatch-top" style="top:calc(var(--safe-t) + 22px)">
        <h1 style="font-size:27px">💌 ${name} came to visit!</h1>
        <p>${name} is a one-of-a-kind ${esc(kind)}, raised by a friend. Tap to say hi!</p>
      </div>
      <div id="hatch" class="visit">
        ${mine ? `<button class="btn" id="visitHome">Back to ${esc(mine.name)}</button>` : '<button class="btn" id="visitHatch">🥚 Hatch your own</button>'}
        ${isNative ? '' : '<button class="btn alt" id="visitApp">📱 Get Pockling for iPhone</button>'}
        ${!isNative && iPhone ? `<a class="visit-open" href="pockling://visit?c=${encodeURIComponent(this.code)}">Already have Pockling? See ${name} there</a>` : ''}
      </div>`;
    $('visitHome')?.addEventListener('click', () => {
      forget();
      fadeTo(home, { greet: true });
    });
    $('visitHatch')?.addEventListener('click', () => {
      forget();
      track('visit_hatch');
      fadeTo(hatch);
    });
    $('visitApp')?.addEventListener('click', () => {
      track('visit_app');
      openLink(APP_STORE);
    });
  },

  resize() {
    if (!this.v) return;
    game.assets.define('hatch.bg', () => bakeBackground());
    this.place();
  },

  down(x, y) {
    audio.unlock();
    if (!this.v || this.actor.busy) return;
    const part = this.pet.hit(x, y);
    if (!part) return;
    haptic('light');
    this.actor.play(part === 'nose' ? this.actor.boop() : this.actor.giggle());
  },

  update(dt) {
    game.fx.update(dt);
    if (this.v) this.actor.update(dt);
  },

  draw(g) {
    const { assets, view, fx } = game;
    g.sprite(assets.get('hatch.bg'), 0, 0, { ax: 0, ay: 0, w: view.w, h: view.h });
    if (this.v) {
      const a = this.actor;
      const st = this.pet.stage.scale * a.scale;
      g.sprite(assets.get('fx.shadow'), a.x, a.y + 4 * view.u, { w: 236 * st, h: 50 * st, alpha: 0.8 });
      this.pet.draw(g, a.x, a.y, a.scale);
    }
    fx.draw(g);
  },
};
