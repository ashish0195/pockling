// Visits by link (web/src/visit.js): a pet packed into a link's code and read back, and nothing else let in.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readVisit, visitCode, visitFromHash, visitLink } from '../web/src/visit.js';
import { adopt, newGame } from '../web/src/state.js';

const T0 = new Date(2026, 10, 25, 10, 0, 0).getTime();

function pet(extra = {}) {
  const s = newGame();
  adopt(s, { breed: 'foxling', coat: 'arctic', name: 'Biscuit', seed: 4242, ...extra }, T0);
  s.pet.careDays = 3;
  return s.pet;
}

test('a pet goes into a link and comes back the same', () => {
  const p = pet({ look: { ears: 'bunling', palette: 'hue:200', wings: true } });
  const link = visitLink(p);
  assert.match(link, /^https:\/\/bitfold\.9io\.ai\/pockling\/#visit=[A-Za-z0-9_-]+$/);
  const back = readVisit(visitFromHash(link.slice(link.indexOf('#'))));
  assert.deepEqual(back, { name: 'Biscuit', breed: 'foxling', coat: 'arctic', seed: 4242, stage: 'kid', look: { ears: 'bunling', wings: true, palette: 'hue:200' } });
});

test('a pet without a look, and a name in any script', () => {
  const back = readVisit(visitCode(pet({ name: 'मोची 🐾' })));
  assert.equal(back.name, 'मोची 🐾');
  assert.equal(back.look, undefined);
});

test('the code is short enough for a message', () => {
  const p = pet({ name: 'Marshmallow', look: { ears: 'drakling', tail: 'foxling', wings: true, palette: 'bunling.lilac', mark: 'spots', iris: 'violet' } });
  assert.ok(visitCode(p).length < 140, String(visitCode(p).length));
  assert.deepEqual(readVisit(visitCode(p)).look, { ears: 'drakling', tail: 'foxling', wings: true, palette: 'bunling.lilac', mark: 'spots', iris: 'violet' });
});

test('anything that is not a pet is turned away', () => {
  for (const bad of [null, '', 'a b', '%%%', 'x'.repeat(500), btoa('{"n":"Pip","b":"unicorn"}'), btoa('{"b":"kitling"}'), btoa('not json')]) {
    assert.equal(readVisit(bad), null, String(bad).slice(0, 20));
  }
  // A known breed with an unknown coat or stage falls back to ones that exist, and a long name is cut.
  const odd = readVisit(btoa(JSON.stringify({ n: 'A very very long name indeed', b: 'kitling', c: 'plaid', g: 'ancient', s: -5 })).replace(/=+$/, ''));
  assert.deepEqual(odd, { name: 'A very very ', breed: 'kitling', coat: 'peach', seed: 1, stage: 'kid', look: undefined });
});

test('only a #visit= hash is a visit', () => {
  assert.equal(visitFromHash('#visit=abc_-1'), 'abc_-1');
  assert.equal(visitFromHash('#other=abc'), null);
  assert.equal(visitFromHash(''), null);
  assert.equal(visitFromHash(undefined), null);
});
