// Takes a photo of the pet right off the stage and lays it out as a card to share.
import { audio } from './audio.js';
import { BREEDS, coatOf } from './catalog.js';
import { game } from './game.js';
import { haptic, shareImage, track } from './platform.js';
import { ageDays, levelOf, stageOf, trait } from './state.js';
import { TAU } from './util.js';

const FONT = 'ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SHORT_LINK = 'bitfold.9io.ai/pockling';

/** The current frame of the stage, cropped to a square around the pet. */
function grabPhoto() {
  const { g, pet, view } = game;
  game.g.begin(1, 0.95, 0.9);
  game.scene.draw(g);
  game.g.end();
  const c = pet.anchors.center ?? [view.w / 2, view.h * 0.6];
  const unit = pet.anchors.unit ?? view.u;
  const dpr = view.dpr;
  const size = Math.min(Math.max(310 * unit, 240 * view.u), Math.min(view.w, view.h));
  let x = c[0] - size / 2;
  let y = c[1] - size * 0.56;
  x = Math.max(0, Math.min(view.w - size, x));
  y = Math.max(0, Math.min(view.h - size, y));
  const out = document.createElement('canvas');
  out.width = 960;
  out.height = 960;
  const ctx = out.getContext('2d');
  ctx.drawImage(g.canvas, x * dpr, y * dpr, size * dpr, size * dpr, 0, 0, 960, 960);
  return out;
}

function makeCard(photo) {
  const s = game.state;
  const p = s.pet;
  const W = 1080;
  const H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#fff3e4');
  bg.addColorStop(1, '#ffdfe8');
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);
  // Scattered hearts in the background.
  x.fillStyle = 'rgba(255,140,170,0.16)';
  for (let i = 0; i < 26; i++) {
    const px = (i * 311) % W;
    const py = (i * 197) % H;
    const q = 14 + (i % 4) * 7;
    x.beginPath();
    x.moveTo(px, py + q);
    x.bezierCurveTo(px - q * 1.5, py - q * 0.1, px - q * 0.9, py - q * 1.1, px, py - q * 0.4);
    x.bezierCurveTo(px + q * 0.9, py - q * 1.1, px + q * 1.5, py - q * 0.1, px, py + q);
    x.fill();
  }
  // A slightly tilted instant photo.
  x.save();
  x.translate(W / 2, 520);
  x.rotate(-0.024);
  x.shadowColor = 'rgba(90,40,60,0.3)';
  x.shadowBlur = 44;
  x.shadowOffsetY = 20;
  x.fillStyle = '#fffefb';
  x.beginPath();
  x.roundRect(-430, -430, 860, 960, 18);
  x.fill();
  x.shadowColor = 'transparent';
  x.save();
  x.beginPath();
  x.roundRect(-390, -390, 780, 780, 10);
  x.clip();
  x.drawImage(photo, -390, -390, 780, 780);
  x.restore();
  x.fillStyle = '#4a3540';
  x.textAlign = 'center';
  x.font = `900 76px ${FONT}`;
  x.fillText(p.name, 0, 478);
  x.restore();

  const breed = BREEDS[p.breed];
  const coat = coatOf(p);
  x.textAlign = 'center';
  x.fillStyle = '#4a3540';
  x.font = `800 44px ${FONT}`;
  x.fillText(`${trait(s)} ${coat.name.toLowerCase()} ${breed.name}`, W / 2, 1120);
  x.fillStyle = '#8c7480';
  x.font = `700 36px ${FONT}`;
  const age = ageDays(p, game.now());
  const ageText = age === 0 ? 'hatched today' : `${age} day${age === 1 ? '' : 's'} old`;
  x.fillText(`${ageText}  ·  love level ${levelOf(p.xp)}  ·  ${s.streak} day streak`, W / 2, 1180);

  // The way in for whoever sees it.
  x.fillStyle = '#ff6f97';
  x.beginPath();
  const pillW = 680;
  x.roundRect((W - pillW) / 2, 1228, pillW, 76, 38);
  x.fill();
  x.fillStyle = '#fff';
  x.font = `800 34px ${FONT}`;
  x.fillText(`Hatch your own · ${SHORT_LINK}`, W / 2, 1278);
  return c;
}

/** Flash, sound, then the card in a sheet with a share button. */
export async function takePhoto() {
  const { ui, actor, pet, view } = game;
  ui.hideSheet();
  if (!game.state.pet.asleep && !actor.busy) {
    actor.relax('happy');
    pet.setFace('happy');
    pet.paws(0, 0, 8, -46);
  }
  await new Promise((r) => setTimeout(r, 260));
  const photo = grabPhoto();
  track('photo');
  audio.camera();
  haptic('medium');
  flash(view);
  const card = makeCard(photo);
  const blob = await new Promise((r) => card.toBlob(r, 'image/png'));
  const url = URL.createObjectURL(blob);
  const name = game.state.pet.name;
  if (!game.state.pet.asleep) {
    setTimeout(() => {
      if (!actor.busy) actor.relax();
    }, 700);
  }
  const wrap = ui.sheet(`${ui.head('Say cheese!')}
    <img class="card-preview" src="${url}" alt="A photo card of ${name.replace(/"/g, '')}">
    <button class="btn" id="shareCard">Share ${name.replace(/</g, '&lt;')}</button>`);
  wrap.querySelector('#shareCard').addEventListener('click', async () => {
    audio.click();
    const text = `Meet ${name}, my Pockling! Hatch your own: https://${SHORT_LINK}`;
    const how = await shareImage(blob, text, `${name.replace(/[^\w]+/g, '-').toLowerCase() || 'pockling'}-pockling.png`);
    if (how === 'saved') ui.toast('Saved to your downloads');
  });
}

function flash() {
  const v = document.getElementById('veil');
  v.style.transition = 'none';
  v.style.background = '#fff';
  v.classList.add('on');
  requestAnimationFrame(() => {
    v.style.transition = 'opacity 0.45s ease';
    v.classList.remove('on');
    setTimeout(() => {
      v.style.background = '';
      v.style.transition = '';
    }, 500);
  });
}

export { stageOf, TAU };
