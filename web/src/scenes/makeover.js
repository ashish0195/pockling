// The Makeover: the studio (ui/studio.js) for a pet that's already home, from the menu. The pet stands on the
// same soft stage as when it hatched, and whatever the player picks is saved as its look (catalog.js, "Make
// it yours"). Its name, its age and everything it has stay just as they were.
import { audio } from '../audio.js';
import { CREASE_GAP, reachOf } from '../fold.js';
import { askForRatingNicely, fadeTo, game, save } from '../game.js';
import { haptic } from '../platform.js';
import { studio } from '../ui/studio.js';
import { bakeBackground } from './hatch.js';
import { home } from './home.js';

export const makeover = {
  enter() {
    const { assets, view, actor, pet } = game;
    assets.define('hatch.bg', () => bakeBackground());
    game.ui.show('none');
    actor.stop();
    actor.air = 0;
    this.place();
    this.fit = null;
    pet.setFace('starry');
    actor.play(actor.hop(40, 0.34, { sound: false }));
    audio.chirrup();
    const p = game.state.pet;
    const name = p.name;
    const before = p.look ? { ...p.look } : null;
    studio.open({
      pet,
      actor,
      spec: { breed: p.breed, coat: p.coat, look: p.look },
      kind: 'makeover',
      title: `${name}'s makeover ✨`,
      intro: `Change anything you like. ${name} will love it, and stays just as grown up.`,
      keep: 'Keep it like this',
      onLift: (fit) => { this.fit = fit; },
      onDone: (look) => {
        if (look) p.look = look;
        else delete p.look;
        save(true);
        haptic('success');
        const changed = JSON.stringify(look ?? null) !== JSON.stringify(before ?? null);
        fadeTo(home, { greet: true }).then(() => {
          if (!changed) return;
          setTimeout(() => game.ui.toast(`Looking fab! Tap 📸 to show ${name} off`), 1400);
          // A new look is a happy moment: the app may ask for a rating, if it's due.
          setTimeout(() => askForRatingNicely('makeover'), 4200);
        });
      },
    });
  },

  /** Centre stage, as just after hatching; on an open iPhone Duo, on the pet's own page. */
  place() {
    const { view, actor } = game;
    const room = view.h - 232 - view.safeBottom;
    actor.x = view.crease?.vertical ? view.stage.cx : view.w / 2;
    actor.y = Math.min(view.h * 0.64, room);
    actor.scale = Math.min(1.25 * view.u, room / 215);
    if (view.crease) {
      actor.y = view.crease.vertical ? Math.min(view.h * 0.66, view.h - 232 * view.ui - view.safeBottom) : view.crease.a - CREASE_GAP - 16 * view.u;
      actor.scale = Math.min(1.25 * view.u, (actor.y - 120 * view.ui) / (reachOf(game.state.pet).up * 1.06));
    }
    this.restY = actor.y;
    this.fit = null;
  },

  exit() {
    document.getElementById('layer').innerHTML = '';
  },

  resize() {
    game.assets.define('hatch.bg', () => bakeBackground());
    this.place();
    studio.rest = { y: game.actor.y, scale: game.actor.scale };
    studio.lift();
  },

  down(x, y) {
    audio.unlock();
    const { actor, pet } = game;
    if (actor.busy) return;
    const part = pet.hit(x, y);
    if (part === 'nose') actor.play(actor.boop());
    else if (part) actor.play(actor.giggle());
  },

  update(dt) {
    const { actor, fx } = game;
    fx.update(dt);
    actor.update(dt);
    if (this.fit) {
      const k = Math.min(1, dt * 7);
      actor.y += (this.fit.y - actor.y) * k;
      actor.scale += (this.fit.scale - actor.scale) * k;
    }
  },

  draw(g) {
    const { assets, view, fx, actor, pet } = game;
    g.sprite(assets.get('hatch.bg'), 0, 0, { ax: 0, ay: 0, w: view.w, h: view.h });
    const st = pet.stage.scale * actor.scale;
    g.sprite(assets.get('fx.shadow'), actor.x, actor.y + 4 * view.u, { w: 236 * st, h: 50 * st, alpha: 0.8 });
    pet.draw(g, actor.x, actor.y, actor.scale);
    fx.draw(g);
  },
};
