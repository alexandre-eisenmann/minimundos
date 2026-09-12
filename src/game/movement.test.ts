import test from 'node:test';
import assert from 'node:assert/strict';
import { analogInput, keyboardInput } from './movement.ts';

test('analog input rests in dead zone, varies speed, and clamps outside the pad', () => {
  assert.deepEqual(analogInput(0, 0, 40), { x: 0, z: 0 });
  assert.deepEqual(analogInput(4, 0, 40), { x: 0, z: 0 });
  const slow = analogInput(20, 0, 40);
  assert.ok(slow.x > 0 && slow.x < 0.5);
  assert.deepEqual(analogInput(200, 0, 40), { x: 1, z: 0 });
  const diagonal = analogInput(-40, -40, 40);
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-12);
  assert.ok(diagonal.x < 0 && diagonal.z < 0);
});

test('keyboard diagonals retain normal speed and opposite keys cancel', () => {
  const diagonal = keyboardInput(new Set(['ArrowRight', 'KeyW']));
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.z) - 1) < 1e-12);
  assert.deepEqual(keyboardInput(new Set(['ArrowRight', 'KeyA'])), { x: 0, z: 0, sprint: false });
  assert.deepEqual(keyboardInput(new Set(['KeyW', 'ArrowUp', 'ShiftLeft'])), { x: 0, z: -1, sprint: true });
});
