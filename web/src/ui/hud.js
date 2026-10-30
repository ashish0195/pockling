// Everything drawn in HTML over the stage: top bar, need rings, dock, food tray and menus. Scenes
// switch modes with show(); menus are sheets that slide up. Buttons use data-action, handled in one place.
import { audio } from '../audio.js';
import { BREEDS, FOODS, FOOD_IDS, OUTFITS, OUTFIT_IDS, ROOMS, ROOM_IDS, coatOf } from '../catalog.js';
import { applySettings, celebrate, defineRoomArt, game, save } from '../game.js';
import { foodThumb } from '../bake/food.js';
import { OUTFIT_ART } from '../bake/outfits.js';
import { canRemind, clearSave, haptic, isNative, openLink, setReminders } from '../platform.js';
import { ageDays, buyOutfit, buyRoom, levelOf, levelProgress, mood, stageOf, tasteOf, trait, useRoom, wear } from '../state.js';
import { dayNumber } from '../util.js';

const root = () => document.getElementById('ui');
const $ = (sel) => root().querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const WANTS = { hungry: 'feed', dirty: 'wash', bored: 'play', sleepy: 'sleep', lonely: null };

const outfitThumbs = new Map();

function outfitThumb(id) {
  if (!outfitThumbs.has(id)) outfitThumbs.set(id, OUTFIT_ART[id]().canvas.toDataURL('image/png'));
  return outfitThumbs.get(id);
}

export const SITE = 'https://bitfold.9io.ai/pockling/';

export const ui = {
  mode: 'none',
  actions: {},

  init(actions) {
    this.actions = actions;
    const el = root();
    el.hidden = false;
    el.innerHTML = `
      <div id="layer"></div>
      <div id="toasts"></div>
      <div id="banners"></div>
      <div id="sheets"></div>`;
    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (!b) return;
      audio.unlock();
      audio.click();
      haptic('light');
      this.run(b.dataset.action, b);
    });
  },

  run(name, el) {
    const fn = this.actions[name] ?? this[`on_${name}`];
    fn?.call(this, el);
  },

  // ── Modes ──

  show(mode) {
    this.mode = mode;
    const layer = $('#layer');
    if (mode === 'home') {
      layer.innerHTML = `
        ${this.topbar()}
        <div id="needs">
          ${[['tummy', '🍎', '#ff8a5c', 'Tummy'], ['clean', '🫧', '#5eb8ff', 'Clean'], ['energy', '⚡', '#ffc247', 'Energy'], ['fun', '🎈', '#4fcfa8', 'Fun'], ['love', '💖', '#ff6f97', 'Love']]
    .map(([k, ico, c, label]) => `<div class="ring" data-need="${k}" style="--c:${c}" role="img" aria-label="${label}"><span>${ico}</span></div>`).join('')}
        </div>
        <div id="side">
          <button class="side-btn" data-action="talk" aria-label="Talk to your pet" id="talkBtn">🎤</button>
          <button class="side-btn" data-action="photo" aria-label="Take a photo">📸</button>
          <button class="side-btn" data-action="closet" aria-label="Closet">👒</button>
        </div>
        <nav id="dock">
          ${[['feed', '🍎', 'Feed'], ['wash', '🛁', 'Wash'], ['play', '🎾', 'Play'], ['walk', '🐾', 'Walk'], ['sleep', '🌙', 'Sleep']]
    .map(([a, ico, label]) => `<button class="dock-btn" data-action="${a}" data-dock="${a}"><span class="ico">${ico}</span>${label}</button>`).join('')}
        </nav>`;
      this.refresh();
    } else if (mode === 'asleep') {
      const name = esc(game.state.pet.name);
      layer.innerHTML = `
        ${this.topbar()}
        <div id="bedtime">
          <p>Shhh… ${name} is fast asleep</p>
          <button class="btn alt" data-action="wake">☀️ Wake up</button>
        </div>`;
      this.refresh();
    } else if (mode === 'none') {
      layer.innerHTML = '';
    }
  },

  topbar() {
    return `<div id="topbar">
        <button class="chip" data-action="card" aria-label="Your pet's card">
          <span class="level-heart" id="lv">1</span>
          <span class="name-box"><span class="nm" id="nm"></span><span class="xp"><i id="xp"></i></span></span>
        </button>
        <span class="spacer"></span>
        <button class="chip berry-chip" data-action="shop" aria-label="Berries and shop">🍓 <b class="pop" id="berries">0</b></button>
        <button class="round" data-action="menu" aria-label="Menu">☰</button>
      </div>`;
  },

  /** Rings, level and berries from the current state. */
  refresh() {
    const s = game.state;
    const p = s.pet;
    if (!p) return;
    const lv = $('#lv');
    if (lv) {
      lv.textContent = levelOf(p.xp);
      $('#nm').textContent = p.name;
      $('#xp').style.width = `${Math.round(levelProgress(p.xp) * 100)}%`;
      const b = $('#berries');
      if (b.textContent !== String(s.berries)) {
        b.textContent = s.berries;
        b.classList.remove('go');
        void b.offsetWidth;
        b.classList.add('go');
      }
    }
    for (const ring of root().querySelectorAll('.ring')) {
      const v = Math.round(p[ring.dataset.need]);
      ring.style.setProperty('--v', v);
      ring.classList.toggle('low', v < 30);
      ring.setAttribute('aria-label', `${ring.getAttribute('aria-label').split(':')[0]}: ${v} percent`);
    }
    const want = WANTS[mood(p)];
    for (const b of root().querySelectorAll('.dock-btn')) b.classList.toggle('want', b.dataset.dock === want);
  },

  // ── Little messages ──

  toast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    const shelf = $('#toasts');
    while (shelf.children.length >= 2) shelf.firstChild.remove();
    shelf.append(t);
    document.getElementById('live').textContent = text;
    setTimeout(() => t.remove(), 2800);
  },

  banner(html, { onClose } = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'banner-wrap';
    wrap.innerHTML = `<div class="banner">${html}</div>`;
    $('#banners').append(wrap);
    const close = () => {
      wrap.remove();
      onClose?.();
    };
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap || e.target.closest('[data-close]')) close();
    });
    return close;
  },

  levelUp(level, gift) {
    this.banner(`<div class="big">💖</div><h2>Love level ${level}!</h2><p>You two are getting close. Here's ${gift} berries 🍓</p><button class="btn" data-close>Yay!</button>`);
  },

  grew(stageName) {
    const p = game.state.pet;
    const line = stageName === 'Grown' ? `${esc(p.name)} is all grown up. You did that.` : `${esc(p.name)} isn't a baby any more!`;
    this.banner(`<div class="big">🌟</div><h2>${esc(p.name)} grew!</h2><p>${line}</p><button class="btn" data-close>So proud</button>`);
  },

  daily(visit) {
    const p = game.state.pet;
    const line = visit.first ? `Come back every day to fill the stamp book.` : visit.streak > 1 ? `${visit.streak} days in a row. ${esc(p.name)} waited at the door.` : `${esc(p.name)} missed you!`;
    this.banner(`<div class="big">${visit.sticker}</div><h2>${visit.first ? 'Your first stamp' : 'A new day!'}</h2><p>${line}<br>+${visit.berries} berries 🍓</p><button class="btn" data-close>Hello, ${esc(p.name)}!</button>`);
  },

  // ── Sheets ──

  sheet(html) {
    this.hideSheet();
    const wrap = document.createElement('div');
    wrap.id = 'sheet-wrap';
    wrap.innerHTML = `<div class="sheet">${html}</div>`;
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap || e.target.closest('[data-close]')) this.hideSheet();
    });
    $('#sheets').append(wrap);
    return wrap;
  },

  hideSheet() {
    $('#sheets')?.replaceChildren();
    this.hideTray();
  },

  get sheetOpen() {
    return Boolean($('#sheet-wrap'));
  },

  head(title) {
    return `<div class="sheet-head"><h2>${title}</h2><button class="close" data-close aria-label="Close">✕</button></div>`;
  },

  // ── Food tray ──

  on_feed() {
    if ($('#tray')) {
      this.hideTray();
      return;
    }
    this.openTray();
  },

  openTray() {
    const s = game.state;
    const tray = document.createElement('div');
    tray.id = 'tray';
    const hints = s.foodsTried.length < 2;
    const known = s.foodsTried;
    tray.innerHTML = `
      <div class="tray-head"><span>${hints ? `Drag food to ${esc(s.pet.name)}'s mouth` : 'What sounds good?'}</span><button class="close" data-tray-close aria-label="Close">✕</button></div>
      <div class="tray-row">
        ${FOOD_IDS.map((id) => {
    const food = FOODS[id];
    const fav = known.includes(id) && tasteOf(s.pet.breed, id) === 'love';
    return `<button class="food tap${fav ? ' fav' : ''}${s.berries < food.cost ? ' poor' : ''}" data-food="${id}" aria-label="${food.name}"><img src="${foodThumb(id)}" alt="">${food.cost ? `<span class="price">🍓${food.cost}</span>` : 'Free'}</button>`;
  }).join('')}
      </div>`;
    root().append(tray);
    $('#dock')?.style.setProperty('visibility', 'hidden');
    $('#side')?.style.setProperty('visibility', 'hidden');
    tray.querySelector('[data-tray-close]').addEventListener('click', () => this.hideTray());
    this.watchTray(tray.querySelector('.tray-row'));
  },

  /**
   * One finger does three things here: lift food up to drag it, slide sideways to scroll, or tap to toss.
   * The browser can't tell these apart mid-gesture and would take the touch for scrolling, so we do it.
   */
  watchTray(row) {
    let touch = null;
    let glide = 0;
    const zoom = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui')) || 1;
    row.addEventListener('pointerdown', (e) => {
      cancelAnimationFrame(glide);
      touch = { id: e.pointerId, x: e.clientX, y: e.clientY, scroll: row.scrollLeft, mode: null, food: e.target.closest('.food')?.dataset.food, lastX: e.clientX, lastT: performance.now(), v: 0 };
    });
    row.addEventListener('pointermove', (e) => {
      if (!touch || e.pointerId !== touch.id || touch.mode === 'food') return;
      const dx = e.clientX - touch.x;
      const dy = e.clientY - touch.y;
      if (!touch.mode && Math.hypot(dx, dy) > 8) {
        touch.mode = touch.food && -dy > Math.abs(dx) * 0.6 ? 'food' : 'scroll';
        if (touch.mode === 'food') {
          game.scene.startFoodDrag?.(touch.food, e.clientX, e.clientY, e.pointerId);
          return;
        }
      }
      if (touch.mode === 'scroll') {
        row.scrollLeft = touch.scroll - dx / zoom();
        const now = performance.now();
        touch.v = (e.clientX - touch.lastX) / Math.max(1, now - touch.lastT);
        touch.lastX = e.clientX;
        touch.lastT = now;
      }
    });
    const end = (e) => {
      if (!touch || e.pointerId !== touch.id) return;
      const { mode, food, v, lastT } = touch;
      touch = null;
      if (e.type === 'pointerup' && !mode && food) game.scene.throwFood?.(food);
      if (mode === 'scroll' && performance.now() - lastT < 80) {
        let speed = v * 16;
        const step = () => {
          row.scrollLeft -= speed;
          speed *= 0.94;
          if (Math.abs(speed) > 0.3) glide = requestAnimationFrame(step);
        };
        glide = requestAnimationFrame(step);
      }
    };
    row.addEventListener('pointerup', end);
    row.addEventListener('pointercancel', end);
    row.addEventListener('wheel', (e) => {
      row.scrollLeft += e.deltaX || e.deltaY;
    }, { passive: true });
    // Keyboards and switch control arrive as a plain click.
    row.addEventListener('click', (e) => {
      const food = e.target.closest('.food')?.dataset.food;
      if (food && e.detail === 0) game.scene.throwFood?.(food);
    });
  },

  hideTray() {
    $('#tray')?.remove();
    $('#dock')?.style.removeProperty('visibility');
    $('#side')?.style.removeProperty('visibility');
  },

  // ── Menu ──

  on_menu() {
    const s = game.state;
    this.sheet(`${this.head('Menu')}
      <button class="row" data-action="stamps"><span>📖 Stamp book<small>${s.streak} day streak</small></span><span>›</span></button>
      <button class="row" data-action="closet"><span>👒 Closet<small>Hats, glasses, scarves</small></span><span>›</span></button>
      <button class="row" data-action="rooms"><span>🏠 Rooms<small>Paint the walls</small></span><span>›</span></button>
      <button class="row" data-action="card"><span>🪪 ${esc(s.pet.name)}'s card<small>Share your pet</small></span><span>›</span></button>
      <button class="row" data-action="settings"><span>⚙️ Settings</span><span>›</span></button>`);
  },

  on_settings() {
    const s = game.state.settings;
    const toggle = (key, label, sub = '') => `<button class="row" data-action="toggle" data-key="${key}" role="switch" aria-checked="${s[key]}"><span>${label}${sub ? `<small>${sub}</small>` : ''}</span><span class="switch${s[key] ? ' on' : ''}"></span></button>`;
    this.sheet(`${this.head('Settings')}
      ${toggle('sound', '🔊 Sounds')}
      ${toggle('music', '🎵 Music box')}
      ${toggle('haptics', '📳 Feel it purr', 'Vibration when you stroke your pet')}
      ${canRemind ? toggle('reminders', '🔔 Daily reminder', 'A little nudge in the evening') : ''}
      <h3>About</h3>
      <button class="row" data-action="link" data-url="${SITE}privacy/"><span>🔒 Privacy<small>Nothing leaves your device</small></span><span>›</span></button>
      <button class="row" data-action="link" data-url="${SITE}support/"><span>💬 Help and support</span><span>›</span></button>
      <p class="muted center" style="font-size:13px;margin-top:14px">Pockling, a Bitfold Original from 9io.<br>No ads. No accounts. No tracking.</p>
      <button class="row" data-action="restart" style="margin-top:10px"><span style="color:#c2355f">Start over with a new egg</span></button>`);
  },

  on_toggle(el) {
    const s = game.state.settings;
    const key = el.dataset.key;
    s[key] = !s[key];
    el.setAttribute('aria-checked', s[key]);
    el.querySelector('.switch').classList.toggle('on', s[key]);
    applySettings();
    if (key === 'music' && s.music) audio.startMusic(game.state.pet?.asleep ? 'night' : 'day');
    if (key === 'reminders') setReminders(s.reminders, game.state.pet.name);
    save();
  },

  on_link(el) {
    openLink(el.dataset.url);
  },

  on_restart() {
    const p = game.state.pet;
    this.sheet(`${this.head('Start over?')}
      <p>${esc(p.name)} and everything you've collected will be gone for good. There's no undo.</p>
      <div style="height:10px"></div>
      <button class="btn" data-close>Keep ${esc(p.name)}</button>
      <button class="btn alt" data-action="restartYes">Start over</button>`);
  },

  on_restartYes() {
    // Leaving the page normally saves it, which would bring the old pet straight back.
    game.startingOver = true;
    clearSave();
    location.reload();
  },

  // ── Stamp book ──

  on_stamps() {
    const s = game.state;
    const today = dayNumber(game.now());
    const cells = [];
    const byDay = new Map(s.stamps.map((st) => [st.day, st.sticker]));
    // The last four weeks, ending this week.
    const dow = new Date(game.now()).getDay();
    for (let i = 27 - (6 - dow); i >= -(6 - dow); i--) {
      const day = today - i;
      const sticker = byDay.get(day);
      cells.push(`<div class="stamp${day === today ? ' today' : ''}${sticker ? '' : ' empty'}">${sticker ?? ''}</div>`);
    }
    this.sheet(`${this.head('Stamp book')}
      <div class="center" style="margin-bottom:12px"><div class="streak-big">${s.streak}</div><span class="muted" style="font-weight:800">day streak</span></div>
      <div class="stamps">${cells.join('')}</div>
      <p class="muted center" style="font-size:13px;margin-top:12px">Visit every day for a new sticker and more berries. Miss a day and the streak starts again, but ${esc(s.pet.name)} will never hold it against you.</p>`);
  },

  // ── Closet and shop ──

  on_closet(el, slot = 'head') {
    const s = game.state;
    const p = s.pet;
    const slots = [['head', 'Hats'], ['face', 'Glasses'], ['neck', 'Neck']];
    const items = OUTFIT_IDS.filter((id) => OUTFITS[id].slot === slot);
    const tile = (id) => {
      const item = OUTFITS[id];
      const owned = s.owned.outfits.includes(id);
      const on = p.outfit[item.slot] === id;
      return `<button class="tile${on ? ' on' : ''}${owned || s.berries >= item.cost ? '' : ' locked'}" data-action="outfit" data-id="${id}" data-slot="${slot}"><img src="${outfitThumb(id)}" alt="">${item.name}${owned ? '' : `<span class="price">🍓 ${item.cost}</span>`}</button>`;
    };
    this.sheet(`${this.head('Closet')}
      <div class="tabs">${slots.map(([k, label]) => `<button class="tab${k === slot ? ' on' : ''}" data-action="closetTab" data-slot="${k}">${label}</button>`).join('')}</div>
      <div class="grid">${items.map(tile).join('')}</div>
      <p class="muted center" style="font-size:13px;margin-top:12px">You have 🍓 ${s.berries}. Earn more on walks, in games and by visiting every day.</p>`);
  },

  on_shop(el) {
    this.on_closet(el);
  },

  on_closetTab(el) {
    this.on_closet(el, el.dataset.slot);
  },

  on_outfit(el) {
    const s = game.state;
    const { id, slot } = el.dataset;
    const item = OUTFITS[id];
    if (!s.owned.outfits.includes(id)) {
      if (!buyOutfit(s, id)) {
        this.toast(`You need 🍓 ${item.cost - s.berries} more`);
        return;
      }
      audio.coin();
    }
    wear(s, id);
    const c = game.pet?.anchors.top;
    if (c) {
      game.fx.sparkles(c[0], c[1] + 20, 8, 50);
      audio.sparkle();
    }
    game.pet?.squash(0.1);
    game.actor?.relax('happy');
    this.on_closet(el, slot);
    this.refresh();
    save();
  },

  on_rooms() {
    const s = game.state;
    const p = s.pet;
    const tile = (id) => {
      const room = ROOMS[id];
      const owned = s.owned.rooms.includes(id);
      return `<button class="tile${p.room === id ? ' on' : ''}${owned || s.berries >= room.cost ? '' : ' locked'}" data-action="room" data-id="${id}"><span class="swatch" style="background:linear-gradient(180deg,${room.wall[0]},${room.wall[1]} 60%,${room.floor[0]} 60%)"></span>${room.name}${owned ? '' : `<span class="price">🍓 ${room.cost}</span>`}</button>`;
    };
    this.sheet(`${this.head('Rooms')}<div class="grid">${ROOM_IDS.map(tile).join('')}</div>`);
  },

  on_room(el) {
    const s = game.state;
    const { id } = el.dataset;
    if (!s.owned.rooms.includes(id)) {
      if (!buyRoom(s, id)) {
        this.toast(`You need 🍓 ${ROOMS[id].cost - s.berries} more`);
        return;
      }
      audio.coin();
    }
    useRoom(s, id);
    defineRoomArt();
    audio.sparkle();
    this.on_rooms();
    this.refresh();
    save();
  },

  // ── The pet's card ──

  /** Shows stats and a share button. makeCard comes from card.js through the actions. */
  async on_card() {
    const s = game.state;
    const p = s.pet;
    const breed = BREEDS[p.breed];
    const coat = coatOf(p);
    const wrap = this.sheet(`${this.head(esc(p.name))}
      <p class="muted" style="margin-top:-8px;font-weight:800">${trait(s)} ${coat.name} ${breed.name}, ${stageOf(p).name.toLowerCase()}</p>
      <p style="margin-bottom:0">${breed.blurb}</p>
      <div class="stats">
        <div class="stat"><b>${ageDays(p, game.now())}</b><span>days old</span></div>
        <div class="stat"><b>${levelOf(p.xp)}</b><span>love level</span></div>
        <div class="stat"><b>${s.streak}</b><span>day streak</span></div>
        <div class="stat"><b>${s.totals.fed}</b><span>snacks</span></div>
        <div class="stat"><b>${s.totals.walked}</b><span>walks</span></div>
        <div class="stat"><b>${s.totals.played}</b><span>games</span></div>
      </div>
      <button class="btn" data-action="photo">📸 Take a photo to share</button>`);
    return wrap;
  },
};

export { celebrate, isNative };
