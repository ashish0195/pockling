// The studio: make a Pockling yours. Change its colours, markings, ears, tail, wings and eyes while it stands
// on the stage watching, and reacts to every change. It opens right after hatching (scenes/hatch.js) and, as
// the Makeover, from the menu (scenes/home.js). It only edits a look (catalog.js, "Make it yours"); the
// caller keeps or saves it.
import { audio } from '../audio.js';
import { BREEDS, BREED_IDS, IRISES, MARKS, PALETTES, cleanLook, coatOf, partsOf, surpriseLook } from '../catalog.js';
import { reachOf } from '../fold.js';
import { game } from '../game.js';
import { haptic, track } from '../platform.js';
import { pick } from '../util.js';

const TABS = [['colour', 'Colour'], ['mark', 'Markings'], ['ears', 'Ears'], ['tail', 'Tail'], ['wings', 'Wings'], ['eyes', 'Eyes']];
const EARS = { kitling: ['🐱', 'Cat'], bunling: ['🐰', 'Bunny'], puppling: ['🐶', 'Floppy'], cubling: ['🐻', 'Round'], foxling: ['🦊', 'Fox'], drakling: ['🐲', 'Horns'] };
const TAILS = { kitling: 'Curly', bunling: 'Pom-pom', puppling: 'Stubby', cubling: 'Tiny pom', foxling: 'Bushy', drakling: 'Dragon' };
const MARK_NAMES = { none: 'None', tabby: 'Tabby', socks: 'Socks', patch: 'Patch', spots: 'Spots', muzzle: 'Muzzle', panda: 'Panda', fox: 'Fox' };

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function swatch(attr, value, colours, label, on) {
  const [deep, mid, light, lightest] = colours;
  const bg = `radial-gradient(circle at 34% 30%, ${lightest} 0 12%, ${light} 34%, ${mid} 70%, ${deep})`;
  return `<button class="swatch${on ? ' on' : ''}" ${attr}="${esc(value)}" style="background:${bg}" aria-label="${esc(label)}" aria-pressed="${on}"></button>`;
}

function chip(attr, value, label, on, icon = '') {
  return `<button class="studio-chip${on ? ' on' : ''}" ${attr}="${esc(value)}" aria-pressed="${on}">${icon ? `<span aria-hidden="true">${icon}</span> ` : ''}${esc(label)}</button>`;
}

export const studio = {
  /**
   * Opens over the scene, in #layer. `spec` is the pet's { breed, coat, look }; `onDone(look)` gets the
   * cleaned look (null for the breed's own). `onLift({ y, scale })` asks the scene to move the pet's feet to y
   * and draw it at scale, so the pet fits between the title and the panel (fitPet). `kind` is 'hatch' or
   * 'makeover', for the analytics event.
   */
  open({ pet, actor, spec, title, intro, keep, kind = 'hatch', onLift = () => {}, onDone }) {
    this.pet = pet;
    this.actor = actor;
    this.spec = spec;
    this.kind = kind;
    this.onLift = onLift;
    this.rest = { y: actor.y, scale: actor.scale };
    this.onDone = onDone;
    this.look = { ...(spec.look ?? {}) };
    this.start = JSON.stringify(cleanLook(this.look));
    this.tab = 'colour';
    this.changes = 0;
    this.hueOpen = String(this.look.palette ?? '').startsWith('hue:');
    $('layer').innerHTML = `
      <div id="hatch-top" class="studio-top" style="top:calc(var(--safe-t) + 22px)">
        <h1 style="font-size:27px">${esc(title)}</h1>
        <p>${esc(intro)}</p>
      </div>
      <div id="hatch" class="studio">
        <div class="studio-tabs" role="tablist" aria-label="What to change">${TABS.map(([id, label]) => `<button class="studio-tab" role="tab" data-tab="${id}">${label}</button>`).join('')}</div>
        <div class="studio-opts" id="studioOpts" role="tabpanel"></div>
        <div class="studio-row">
          <button class="studio-mini" id="studioReset" aria-label="Back to how it hatched" hidden>↺</button>
          <button class="btn alt" id="studioSurprise">🎲 Surprise me</button>
          <button class="btn" id="studioDone">${esc(keep)}</button>
        </div>
      </div>`;
    for (const b of document.querySelectorAll('.studio-tab')) {
      b.addEventListener('click', () => {
        this.tab = b.dataset.tab;
        audio.click();
        this.render();
      });
    }
    $('studioOpts').addEventListener('click', (e) => this.pickFrom(e.target.closest('button')));
    $('studioOpts').addEventListener('input', (e) => {
      if (e.target.id === 'studioHue') this.hue(Number(e.target.value), false);
    });
    $('studioOpts').addEventListener('change', (e) => {
      if (e.target.id === 'studioHue') this.hue(Number(e.target.value), true);
    });
    $('studioSurprise').addEventListener('click', () => this.surprise());
    $('studioReset').addEventListener('click', () => this.reset());
    $('studioDone').addEventListener('click', () => this.done());
    this.render();
  },

  /** The breed's own value for each part: choosing it again takes the choice away. */
  own() {
    const base = coatOf({ breed: this.spec.breed, coat: this.spec.coat });
    return {
      palette: `${this.spec.breed}.${base.id}`,
      ears: this.spec.breed,
      tail: this.spec.breed,
      wings: Boolean(BREEDS[this.spec.breed].wings),
      mark: base.mark ?? 'none',
    };
  },

  render() {
    for (const b of document.querySelectorAll('.studio-tab')) {
      const on = b.dataset.tab === this.tab;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    }
    const own = this.own();
    const spec = { ...this.spec, look: cleanLook(this.look) ?? undefined };
    const parts = partsOf(spec);
    const coat = coatOf(spec);
    let html = '';
    if (this.tab === 'colour') {
      const current = this.look.palette ?? own.palette;
      const hue = current.startsWith('hue:') ? Number(current.slice(4)) : null;
      html = `<div class="studio-scroll">${PALETTES.map((p) => swatch('data-palette', p.id, p.fur, p.name, p.id === current)).join('')}`
        + `<button class="swatch rainbow${hue != null || this.hueOpen ? ' on' : ''}" data-rainbow="1" aria-label="Any colour" aria-pressed="${hue != null}"></button></div>`;
      if (hue != null || this.hueOpen) {
        html += `<input type="range" min="0" max="359" step="1" id="studioHue" class="studio-hue" value="${hue ?? 200}" aria-label="Any colour: slide to choose">`;
      }
    } else if (this.tab === 'mark') {
      html = `<div class="studio-scroll">${MARKS.map((m) => chip('data-mark', m, MARK_NAMES[m], m === (coat.mark ?? 'none'))).join('')}</div>`;
    } else if (this.tab === 'ears') {
      const current = this.look.ears ?? own.ears;
      html = `<div class="studio-scroll">${BREED_IDS.map((b) => chip('data-ears', b, EARS[b][1], b === current, EARS[b][0])).join('')}</div>`;
    } else if (this.tab === 'tail') {
      const current = this.look.tail ?? own.tail;
      html = `<div class="studio-scroll">${BREED_IDS.map((b) => chip('data-tail', b, TAILS[b], b === current)).join('')}</div>`;
    } else if (this.tab === 'wings') {
      html = `<div class="studio-scroll">${chip('data-wings', 'no', 'No wings', !parts.wings)}${chip('data-wings', 'yes', 'Little wings', parts.wings, '🪽')}</div>`;
    } else {
      const current = this.look.iris ?? IRISES.find((i) => i.hex === coat.iris)?.id;
      html = `<div class="studio-scroll">${IRISES.map((i) => swatch('data-iris', i.id, [i.hex, i.hex, i.hex, '#ffffff'], `${i.id} eyes`, i.id === current)).join('')}</div>`;
    }
    $('studioOpts').innerHTML = html;
    // The chosen one in view, in the middle of its row.
    const on = $('studioOpts').querySelector('.studio-scroll .on');
    if (on) {
      const row = on.parentElement;
      row.scrollLeft = Math.max(0, on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2);
    }
    $('studioReset').hidden = !cleanLook(this.look);
    const done = $('studioDone');
    if (this.changes) done.textContent = 'Done!';
    this.lift();
  },

  pickFrom(b) {
    if (!b) return;
    const own = this.own();
    if (b.dataset.rainbow) {
      this.hueOpen = true;
      const current = String(this.look.palette ?? '');
      this.set('palette', current.startsWith('hue:') ? current : 'hue:200', own);
      return;
    }
    if (b.dataset.palette) this.set('palette', b.dataset.palette, own);
    else if (b.dataset.mark) this.set('mark', b.dataset.mark, own);
    else if (b.dataset.ears) this.set('ears', b.dataset.ears, own);
    else if (b.dataset.tail) this.set('tail', b.dataset.tail, own);
    else if (b.dataset.wings) this.set('wings', b.dataset.wings === 'yes', own);
    else if (b.dataset.iris) this.set('iris', b.dataset.iris, own);
  },

  /** A choice. The breed's own value is no choice at all, so a pet set back looks just as it hatched. */
  set(field, value, own = this.own(), { quiet = false } = {}) {
    const next = { ...this.look, [field]: value };
    if (field in own && own[field] === value) delete next[field];
    if (field === 'palette' && !String(value).startsWith('hue:')) this.hueOpen = false;
    this.look = next;
    this.pet.restyle(cleanLook(this.look));
    this.changes += 1;
    if (!quiet) this.react(field);
    this.render();
  },

  /** Any colour, from the slider: restyled at most ten times a second while it moves. */
  hue(h, final) {
    const now = performance.now();
    if (!final && now - (this.hueAt ?? 0) < 100) return;
    this.hueAt = now;
    const next = { ...this.look, palette: `hue:${Math.round(h) % 360}` };
    this.look = next;
    this.pet.restyle(cleanLook(this.look));
    if (final) {
      this.changes += 1;
      this.react('palette');
      this.render();
    } else {
      $('studioReset').hidden = false;
    }
  },

  surprise() {
    this.look = surpriseLook() ?? {};
    this.hueOpen = String(this.look.palette ?? '').startsWith('hue:');
    this.pet.restyle(cleanLook(this.look));
    this.changes += 1;
    this.react('surprise');
    this.render();
  },

  reset() {
    this.look = {};
    this.hueOpen = false;
    this.pet.restyle(null);
    this.changes += 1;
    this.react('reset');
    this.render();
  },

  /** The pet notices every change: a giggle, a hop, a wave, a little dance for a surprise. */
  react(kind) {
    const { pet, actor } = this;
    haptic('light');
    audio.sparkle();
    const c = pet.anchors?.center;
    if (c) game.fx.sparkles(c[0], c[1] - 40, 5, 34);
    if (actor.busy) return;
    if (kind === 'surprise') actor.play(actor.dance());
    else if (kind === 'wings') actor.play(actor.hop(52, 0.38));
    else actor.play(pick([actor.giggle(), actor.giggle(), actor.wave(), actor.hop(34, 0.3)]));
  },

  /**
   * Fits the pet between the title and the panel: its feet above the panel (unless the panel is on the other
   * page of an iPhone Duo), its ears or horns below the title, smaller if it has to be. Big ears or a
   * landscape iPad need the room.
   */
  lift() {
    requestAnimationFrame(() => {
      const panel = $('hatch');
      if (!panel || !panel.classList.contains('studio')) return;
      const v = game.view;
      const title = document.querySelector('.studio-top')?.getBoundingClientRect();
      const top = title ? title.bottom + 10 : 0;
      // Held like a book, the panel is on the other page, so the pet can have its whole page and stand lower.
      const book = Boolean(v.crease?.vertical);
      const bottom = book ? Math.max(this.rest.y, v.h * 0.8) : v.crease ? this.rest.y : Math.min(this.rest.y, panel.getBoundingClientRect().top - 12);
      const spec = { ...this.spec, look: cleanLook(this.look) ?? undefined };
      // How tall and wide it is for each unit of scale: its reach (fold.js, a grown pet at scale 1), by its stage.
      const reach = reachOf(spec);
      const per = this.pet.stage.scale / 1.05;
      const most = book ? Math.min(this.rest.scale * 1.25, (v.stage.w / 2 - 12) / (reach.side * 1.06 * per)) : this.rest.scale;
      const scale = Math.max(this.rest.scale * 0.55, Math.min(most, (bottom - top) / (reach.up * per)));
      this.onLift({ y: bottom, scale });
    });
  },

  done() {
    const look = cleanLook(this.look);
    const parts = look ? Object.keys(look).join(',') : 'none';
    track(this.kind === 'hatch' ? 'made' : 'makeover', { changes: String(this.changes), parts, changed: String(JSON.stringify(look) !== this.start) });
    audio.chirrup();
    haptic('success');
    this.onDone(look);
  },
};
