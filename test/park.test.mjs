// The park behind walks and fetch: its layers scroll at different speeds (parallax), except with Reduce Motion
// on, when they all move with the ground (docs/aso/accessibility.md).
import assert from 'node:assert/strict';
import test from 'node:test';
import { drawPark } from '../web/src/bake/park.js';
import { motion } from '../web/src/particles.js';

/** How far each layer has scrolled, worked back from what drawPark asks the renderer to draw. */
function offsets(scroll) {
  const drawn = {};
  const g = {
    width: 390,
    sprite(tex, x, y, o) {
      // strip(): u0 = offset / (tex.w * h / tex.h).
      drawn[tex.id] = o.u0 * tex.w * (o.h / tex.h);
    },
  };
  const assets = { get: (id) => ({ id, w: 1024, h: 256 }) };
  drawPark(g, assets, { u: 1, w: 390, h: 844 }, scroll, null);
  return drawn;
}

function withReducedMotion(on, fn) {
  const before = Object.getOwnPropertyDescriptor(motion, 'reduced');
  Object.defineProperty(motion, 'reduced', { get: () => on, configurable: true });
  try {
    return fn();
  } finally {
    Object.defineProperty(motion, 'reduced', before);
  }
}

test('the park scrolls in parallax: far layers slower than the path', () => {
  const at = withReducedMotion(false, () => offsets(1000));
  assert.ok(Math.abs(at['park.ground'] - 1000) < 1e-6);
  assert.ok(at['park.far'] < at['park.mid'] && at['park.mid'] < at['park.near'] && at['park.near'] < at['park.ground']);
});

test('with Reduce Motion every layer moves with the path', () => {
  const at = withReducedMotion(true, () => offsets(1000));
  for (const layer of ['park.far', 'park.mid', 'park.near', 'park.ground']) {
    assert.ok(Math.abs(at[layer] - 1000) < 1e-6, `${layer} moved ${at[layer]}`);
  }
});
