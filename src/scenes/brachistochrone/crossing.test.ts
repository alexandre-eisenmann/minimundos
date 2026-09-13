import test from 'node:test';
import assert from 'node:assert/strict';
import { CROSSING, crossingHeight } from './crossing.ts';

test('crossing has continuous approaches and keeps feet on its deck', () => {
  const { x, z, dx, dz, halfLength, deckY, footY } = CROSSING;
  assert.equal(crossingHeight(x, z), deckY);
  for (const side of [-1, 1]) {
    const t = side * (halfLength - 1e-8);
    assert.ok(Math.abs(crossingHeight(x + dx * t, z + dz * t)! - footY) < 1e-6);
  }
  let previous = footY;
  for (let t = -halfLength + 0.001; t <= halfLength; t += 0.01) {
    const y = crossingHeight(x + dx * t, z + dz * t)!;
    assert.ok(y >= footY && y <= deckY);
    assert.ok(Math.abs(y - previous) < 0.008);
    previous = y;
  }
  assert.equal(crossingHeight(x + 5, z), undefined);
});
