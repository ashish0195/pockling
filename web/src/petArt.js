// The widget's pictures of a pet with a look of its own (catalog.js, "Make it yours"). tools/widget-art.mjs
// paints every breed and coat ahead of time, into the app (ios/PetArt). A look the player made can't be
// painted ahead, so the game paints it here, in the app, the same way as tools/widget-art.html: a whole
// picture in the widget's first look, and each other look's face alone, with where the faces go. The app
// keeps them in the App Group's folder ("petArt" in ios/Pockling/GameHost.swift, then WidgetShare.swift),
// where the widget finds them by the snapshot's `art` key (widget.js artKey; ios/PocklingWidget/PetArt.swift).
// Only the stage the pet is at: when it grows, its key changes and it's painted again.
import { defineFx } from './bake/fx.js';
import { defineOutfits } from './bake/outfits.js';
import { Assets, Renderer } from './gl.js';
import { Pet } from './pet.js';
import { stageOf } from './state.js';
import { artKey, LOOKS } from './widget.js';

// Each look is a face from the game's own table, as in tools/widget-art.html.
const FACE = { smile: 'smile', sleep: 'sleep', happy: 'happy', hungry: 'hungry', sleepy: 'sleepy', sad: 'sad', pout: 'pout' };
const SIZE = 900; // the canvas, in pixels
const SCALE = 1.6; // canvas pixels per pet unit, before the stage's own size
const FEET = 700; // where it stands
const SIDE = 384; // the pictures' longer side, as tools/widget-art.mjs
const PAD = 0.03;
const FEATHER = 4;

function canvas2d(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })];
}

/** A moment for the game to draw a frame between steps, so painting never stalls it. */
const breathe = () => new Promise((done) => setTimeout(done, 16));

/** A canvas as base64 PNG, encoded off the main path where the browser can (Safari can't encode WebP). */
function png(c) {
  return new Promise((done, fail) => {
    c.toBlob((blob) => {
      if (!blob) return fail(new Error('the picture could not be encoded'));
      const reader = new FileReader();
      reader.onload = () => done(String(reader.result).split(',')[1]);
      reader.onerror = () => fail(reader.error);
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
}

/**
 * Paints the pictures of `p` (the saved pet) for its stage: { key, stage, whole, faces: { look: png }, face:
 * [x, y, w, h], size: [w, h] }, the pictures as base64 PNG. Null for a pet without a look, or without WebGL.
 * A step at a time, a frame apart.
 */
export async function paintPetArt(p) {
  const key = artKey(p);
  if (!key) return null;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  // See-through round the pet, and pixels kept after drawing so they can be copied: asked for before the
  // renderer asks for its own, opaque, context, which then gets this one.
  const gl0 = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: true });
  if (!gl0) return null;
  try {
    const g = new Renderer(canvas);
    const assets = new Assets(g);
    defineOutfits(assets);
    defineFx(assets);
    g.resize(SIZE, SIZE, 1);
    const stage = stageOf(p).id;
    const pet = new Pet(assets, { breed: p.breed, coat: p.coat, seed: p.seed ?? 1, stage, outfit: {}, look: p.look }, { prefix: 'art', bakeScale: 3 });
    const [work, wx] = canvas2d(SIZE, SIZE);

    const draw = (look, read = true) => {
      pet.setFace(FACE[look]);
      pet.t = 0;
      pet.breathNow = 0;
      pet.blink = 1;
      pet.lookFree = [0, 0];
      pet.settle();
      g.begin(0, 0, 0);
      const gl = g.gl;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const s = SCALE * pet.stage.scale;
      g.sprite(assets.get('fx.shadow'), SIZE / 2, FEET + 4 * s, { w: 236 * s, h: 50 * s, alpha: 0.55 });
      pet.draw(g, SIZE / 2, FEET, SCALE);
      g.end();
      wx.clearRect(0, 0, SIZE, SIZE);
      wx.drawImage(canvas, 0, 0);
      return read ? wx.getImageData(0, 0, SIZE, SIZE).data : null;
    };
    const box = () => ({ x0: SIZE, y0: SIZE, x1: 0, y1: 0 });
    const grow = (b, x, y) => {
      if (x < b.x0) b.x0 = x;
      if (x >= b.x1) b.x1 = x + 1;
      if (y < b.y0) b.y0 = y;
      if (y >= b.y1) b.y1 = y + 1;
    };

    // The whole pet's box, with a little room round it.
    const base = draw(LOOKS[0]).slice();
    const opaque = box();
    for (let i = 3; i < base.length; i += 4) if (base[i] > 6) grow(opaque, ((i - 3) / 4) % SIZE, Math.floor((i - 3) / 4 / SIZE));
    const pad = Math.round(PAD * Math.max(opaque.x1 - opaque.x0, opaque.y1 - opaque.y0));
    const crop = { x0: Math.max(0, opaque.x0 - pad), y0: Math.max(0, opaque.y0 - pad), x1: Math.min(SIZE, opaque.x1 + pad), y1: Math.min(SIZE, opaque.y1 + pad) };
    const bw = crop.x1 - crop.x0;
    const bh = crop.y1 - crop.y0;
    const k = SIDE / Math.max(bw, bh);
    const w = Math.round(bw * k);
    const h = Math.round(bh * k);

    // What the other looks change: the face, as far as eyes, brows, mouth and blush reach.
    const changed = box();
    for (const look of LOOKS.slice(1)) {
      await breathe();
      const data = draw(look);
      for (let i = 0; i < data.length; i += 4) {
        const d = Math.abs(data[i] - base[i]) + Math.abs(data[i + 1] - base[i + 1]) + Math.abs(data[i + 2] - base[i + 2]) + Math.abs(data[i + 3] - base[i + 3]);
        if (d > 6) grow(changed, (i / 4) % SIZE, Math.floor(i / 4 / SIZE));
      }
    }
    const margin = FEATHER + 2;
    const fx0 = Math.max(0, Math.floor((changed.x0 - crop.x0) * k) - margin);
    const fy0 = Math.max(0, Math.floor((changed.y0 - crop.y0) * k) - margin);
    const fx1 = Math.min(w, Math.ceil((changed.x1 - crop.x0) * k) + margin);
    const fy1 = Math.min(h, Math.ceil((changed.y1 - crop.y0) * k) + margin);
    const face = { x: fx0, y: fy0, w: Math.max(1, fx1 - fx0), h: Math.max(1, fy1 - fy0) };

    const picture = () => {
      const [out, ox] = canvas2d(w, h);
      ox.imageSmoothingEnabled = true;
      ox.imageSmoothingQuality = 'high';
      ox.drawImage(work, crop.x0, crop.y0, bw, bh, 0, 0, w, h);
      return out;
    };
    await breathe();
    draw(LOOKS[0], false);
    const whole = await png(picture());
    const faces = {};
    for (const look of LOOKS.slice(1)) {
      await breathe();
      draw(look, false);
      const full = picture();
      const [patch, px] = canvas2d(face.w, face.h);
      px.drawImage(full, face.x, face.y, face.w, face.h, 0, 0, face.w, face.h);
      const [mask, mx] = canvas2d(face.w, face.h);
      mx.filter = `blur(${FEATHER / 2}px)`;
      mx.fillStyle = '#fff';
      mx.fillRect(FEATHER, FEATHER, face.w - FEATHER * 2, face.h - FEATHER * 2);
      px.globalCompositeOperation = 'destination-in';
      px.drawImage(mask, 0, 0);
      faces[look] = await png(patch);
    }
    return { key, stage, whole, faces, face: [face.x, face.y, face.w, face.h], size: [w, h] };
  } finally {
    // A second WebGL context is costly on a phone: give this one back straight away.
    gl0.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
