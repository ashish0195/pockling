// Visits by link (1.5): "Send Mochi to visit a friend" shares a link that carries the pet itself (its name, breed,
// coat, fur seed, age and its own look), so whoever opens it meets that very pet, waving, in the web game, with a
// way to hatch their own or get the app. The pet goes after the # (https://bitfold.9io.ai/pockling/#visit=…), so
// it never reaches the server or its logs; and an iPhone with the app opens it there (pockling://visit?c=…,
// ios/Pockling/PetLinks.swift). No DOM here, so test/visit.test.mjs can run it.
import { BREEDS, BREED_IDS, IRISES, MARKS, PALETTES, STAGES, cleanLook } from './catalog.js';
import { cleanName, stageOf } from './state.js';

export const VISIT_PAGE = 'https://bitfold.9io.ai/pockling/';
/** Longer than any real code, short enough that nothing silly fits. */
const MOST = 400;

const toBase64Url = (text) => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (code) => {
  const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((code.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

/**
 * A look as six small numbers, -1 for a field it doesn't set: ears and tail (BREED_IDS), wings (0 or 1), palette
 * (PALETTES, or 1000 + a hue), marking (MARKS) and eyes (IRISES). Those lists only ever grow at the end, so an old
 * link still reads the same.
 */
function packLook(look) {
  const l = cleanLook(look);
  if (!l) return null;
  const at = (list, v) => (v === undefined ? -1 : list.indexOf(v));
  const hue = /^hue:(\d+)$/.exec(l.palette ?? '');
  return [at(BREED_IDS, l.ears), at(BREED_IDS, l.tail), l.wings === undefined ? -1 : Number(l.wings), hue ? 1000 + Number(hue[1]) : PALETTES.findIndex((p) => p.id === l.palette), at(MARKS, l.mark), IRISES.findIndex((i) => i.id === l.iris)];
}

function unpackLook(a) {
  if (!Array.isArray(a) || a.length !== 6 || !a.every(Number.isInteger)) return undefined;
  const [ears, tail, wings, palette, mark, iris] = a;
  return cleanLook({
    ears: BREED_IDS[ears],
    tail: BREED_IDS[tail],
    wings: wings === 0 || wings === 1 ? Boolean(wings) : undefined,
    palette: palette >= 1000 ? `hue:${palette - 1000}` : PALETTES[palette]?.id,
    mark: MARKS[mark],
    iris: IRISES[iris]?.id,
  }) ?? undefined;
}

/** The pet as a short code for a link: what it looks like and its name, nothing else about the player. */
export function visitCode(pet) {
  const look = packLook(pet.look);
  return toBase64Url(JSON.stringify({ n: pet.name, b: pet.breed, c: pet.coat, s: pet.seed ?? 1, g: stageOf(pet).id, ...(look ? { l: look } : {}) }));
}

/** The pet a code carries, checked field by field: { name, breed, coat, seed, stage, look }, or null. */
export function readVisit(code) {
  if (typeof code !== 'string' || !code || code.length > MOST || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
  let v;
  try {
    v = JSON.parse(fromBase64Url(code));
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object' || !BREEDS[v.b]) return null;
  const breed = BREEDS[v.b];
  const name = cleanName(v.n);
  if (!name) return null;
  const seed = Number.isInteger(v.s) && v.s >= 0 && v.s < 1e7 ? v.s : 1;
  return {
    name,
    breed: v.b,
    coat: breed.coats.some((c) => c.id === v.c) ? v.c : breed.coats[0].id,
    seed,
    stage: STAGES.some((s) => s.id === v.g) ? v.g : 'kid',
    look: unpackLook(v.l),
  };
}

/** The link to share: the web game, with the pet after the #. */
export function visitLink(pet) {
  return `${VISIT_PAGE}#visit=${visitCode(pet)}`;
}

/** The code in a page's hash ("#visit=…"), or null. */
export function visitFromHash(hash) {
  const m = /^#visit=([A-Za-z0-9_-]+)$/.exec(hash ?? '');
  return m ? m[1] : null;
}
