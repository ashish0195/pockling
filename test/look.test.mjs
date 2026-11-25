// "Make it yours" (1.4): a pet's own look, in catalog.js, and what keeps it safe in the save, the layout and
// the widget.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BREED_IDS, BREEDS, IRISES, MARKS, PALETTES, cleanLook, coatOf, huePalette, lookCode, lookCoat, paletteOf, parseLook, partsOf, surpriseLook,
} from '../web/src/catalog.js';
import { REACH, reachOf } from '../web/src/fold.js';
import { adopt, migrate, newGame } from '../web/src/state.js';
import { artKey, widgetKey, widgetSnapshot } from '../web/src/widget.js';
import { seeded } from '../web/src/util.js';

const T0 = new Date(2026, 10, 25, 10, 0, 0).getTime();
const HEX = /^#[0-9a-f]{6}$/;

test('a pet without a look is drawn exactly as its breed and coat', () => {
  for (const breed of BREED_IDS) {
    for (const coat of BREEDS[breed].coats) {
      const spec = { breed, coat: coat.id };
      assert.equal(coatOf(spec), coat, `${breed} ${coat.id}: the very same coat`);
      assert.equal(partsOf(spec), BREEDS[breed], `${breed}: the very same parts`);
      assert.deepEqual(reachOf(spec), REACH[breed]);
    }
  }
});

test('cleanLook keeps only what this version can draw', () => {
  assert.equal(cleanLook(null), null);
  assert.equal(cleanLook('bunny'), null);
  assert.equal(cleanLook({}), null);
  assert.equal(cleanLook({ ears: 'unicorn', tail: 7, wings: 'yes', palette: 'plaid', mark: 'zebra', iris: 'gold' }), null);
  assert.deepEqual(cleanLook({ ears: 'bunling', tail: 'foxling', wings: false, palette: 'hue:200', mark: 'fox', iris: 'sky', extra: 1 }),
    { ears: 'bunling', tail: 'foxling', wings: false, palette: 'hue:200', mark: 'fox', iris: 'sky' });
  assert.equal(cleanLook({ palette: 'hue:360' }), null, 'hues are 0 to 359');
  assert.equal(cleanLook({ palette: 'hue:-1' }), null);
});

test('every palette and any hue gives a whole coat of real colours', () => {
  const ids = new Set();
  for (const p of PALETTES) {
    assert.ok(!ids.has(p.id), `palette ids are unique: ${p.id}`);
    ids.add(p.id);
    assert.equal(p.fur.length, 4);
    for (const c of [...p.fur, p.belly, p.inner, p.nose, p.cheek, p.iris]) assert.match(c, HEX, p.id);
  }
  for (let h = 0; h < 360; h += 7) {
    const p = huePalette(h);
    assert.equal(paletteOf(`hue:${h}`).id, `hue:${h}`);
    assert.ok(p.name, `hue ${h} has a name`);
    for (const c of [...p.fur, p.belly, p.inner, p.nose, p.cheek, p.iris, p.wing, p.horn]) assert.match(c, HEX, `hue ${h}`);
  }
});

test('a look paints its palette, marking and eyes over the coat, with the colours each marking needs', () => {
  const base = BREEDS.kitling.coats[0];
  for (const mark of MARKS) {
    const coat = lookCoat({ palette: 'drakling.mint', mark }, base);
    assert.equal(coat.mark, mark);
    assert.deepEqual(coat.fur, BREEDS.drakling.coats[0].fur);
    if (['patch', 'spots', 'muzzle', 'panda', 'fox'].includes(mark)) assert.match(coat.markColor, HEX, `${mark} has its colour`);
    if (mark === 'fox') assert.match(coat.tip, HEX, 'a fox marking tips the tail');
  }
  const eyes = lookCoat({ iris: 'amber' }, base);
  assert.equal(eyes.iris, IRISES.find((i) => i.id === 'amber').hex);
  assert.deepEqual(eyes.fur, base.fur, 'only the eyes changed');
  assert.equal(eyes.mark, base.mark, 'and the marking stays');
});

test('parts come from the breeds the look names, and the pet stays its own breed', () => {
  const parts = partsOf({ breed: 'kitling', coat: 'peach', look: { ears: 'bunling', tail: 'drakling', wings: true } });
  assert.equal(parts.ears, BREEDS.bunling.ears);
  assert.equal(parts.tail, BREEDS.drakling.tail);
  assert.equal(parts.wings, true);
  assert.equal(parts.whiskers, false, 'whiskers come with the cat ears');
  assert.equal(parts.voice, BREEDS.kitling.voice, 'it still sounds like a Kitling');
  assert.equal(partsOf({ breed: 'drakling', coat: 'mint', look: { palette: 'lemon' } }).wings, true, "a Drakling keeps its wings unless they're taken off");
  assert.equal(partsOf({ breed: 'drakling', coat: 'mint', look: { wings: false } }).wings, false);
  assert.equal(partsOf({ breed: 'bunling', coat: 'lilac', look: { ears: 'kitling' } }).whiskers, true);
});

test('its reach follows its ears, tail and wings, so it always fits on an iPhone Duo page', () => {
  const tall = reachOf({ breed: 'puppling', look: { ears: 'bunling' } });
  assert.equal(tall.up, REACH.bunling.up, 'bunny ears are the tallest');
  const wide = reachOf({ breed: 'cubling', look: { tail: 'foxling', wings: true } });
  assert.ok(wide.side >= REACH.foxling.side && wide.side >= REACH.drakling.side);
  for (const ears of BREED_IDS) {
    for (const tail of BREED_IDS) {
      const r = reachOf({ breed: 'kitling', look: { ears, tail, wings: true } });
      assert.ok(r.up <= Math.max(...Object.values(REACH).map((x) => x.up)));
      assert.ok(r.side <= Math.max(...Object.values(REACH).map((x) => x.side)));
    }
  }
});

test('the save keeps a good look, drops a bad one, and old saves load unchanged', () => {
  const s = newGame();
  adopt(s, { breed: 'foxling', coat: 'arctic', name: 'Pip', look: { ears: 'bunling', palette: 'galaxy', mark: 'nonsense' } }, T0);
  assert.deepEqual(s.pet.look, { ears: 'bunling', palette: 'galaxy' });
  const again = migrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(again.pet.look, { ears: 'bunling', palette: 'galaxy' });
  const bad = JSON.parse(JSON.stringify(s));
  bad.pet.look = { ears: 'giraffe' };
  assert.equal(migrate(bad).pet.look, undefined, 'nothing drawable: no look');
  const old = newGame();
  adopt(old, { breed: 'kitling', coat: 'peach', name: 'Mochi' }, T0);
  const loaded = migrate(JSON.parse(JSON.stringify(old)));
  assert.equal('look' in loaded.pet, false, 'a 1.3 pet gets no look');
  assert.deepEqual(loaded.pet, old.pet);
});

test('a look as text reads back the same', () => {
  const look = { ears: 'bunling', tail: 'foxling', wings: true, palette: 'hue:200', mark: 'fox', iris: 'sky' };
  assert.equal(lookCode(look), 'ears:bunling,tail:foxling,wings:1,palette:hue:200,mark:fox,iris:sky');
  assert.deepEqual(parseLook(lookCode(look)), look);
  assert.deepEqual(parseLook('palette:drakling.mint,wings:0'), { wings: false, palette: 'drakling.mint' });
  assert.equal(parseLook('nonsense'), null);
  assert.equal(parseLook(''), null);
});

test('"Surprise me" only ever makes looks the game can draw', () => {
  const rnd = seeded(7);
  for (let i = 0; i < 300; i++) {
    const look = surpriseLook(rnd);
    assert.deepEqual(cleanLook(look), look);
  }
});

test('the widget gets its own pictures only for a pet with a look, and new ones when it changes or grows', () => {
  const s = newGame();
  adopt(s, { breed: 'kitling', coat: 'peach', name: 'Mochi' }, T0);
  assert.equal(artKey(s.pet), null);
  assert.equal('art' in widgetSnapshot(s, T0).pet, false);
  s.pet.look = { palette: 'ocean' };
  const key = artKey(s.pet);
  assert.match(key, /^c[0-9a-z]{1,14}$/, 'a key the app accepts (WidgetShare.saveArt)');
  const snap = widgetSnapshot(s, T0);
  assert.equal(snap.pet.art, key);
  assert.ok(widgetKey(snap).includes(key), 'the widget redraws for new pictures');
  s.pet.look = { palette: 'ocean', ears: 'bunling' };
  assert.notEqual(artKey(s.pet), key, 'a new look, new pictures');
  const now = artKey(s.pet);
  s.pet.careDays = 7;
  assert.notEqual(artKey(s.pet), now, 'growing up, new pictures');
});
