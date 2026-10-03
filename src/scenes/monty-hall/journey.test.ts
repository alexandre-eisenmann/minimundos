import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOOR_APPROACH_Z, journeyAction } from './journey.ts';
import { LEVEL_HEIGHT, LIFT_Z, doorPose } from './navigation.ts';
const p = (x: number, z: number, level = 0) => ({
  x,
  z,
  level,
  y: 0.17 + level * LEVEL_HEIGHT,
});
void test('final-door travel waits outside a missing lift, summons it, boards, then rides', () => {
  assert.deepEqual(journeyAction(p(6, -1.8), 2 * LEVEL_HEIGHT, false, 49, 50), {
    type: 'walk',
    point: { x: 0, z: -1.8, level: 0 },
  });
  assert.deepEqual(journeyAction(p(0, -1.8), 2 * LEVEL_HEIGHT, false, 49, 50), {
    type: 'lift',
    level: 1,
  });
  assert.deepEqual(journeyAction(p(0, -1.8), LEVEL_HEIGHT, false, 49, 50), {
    type: 'lift',
    level: 0,
  });
  assert.deepEqual(journeyAction(p(0, -1.8), 0, false, 49, 50), {
    type: 'walk',
    point: { x: 0, z: LIFT_Z, level: 0 },
  });
  assert.deepEqual(journeyAction(p(0, LIFT_Z), 0, false, 49, 50), {
    type: 'lift',
    level: 1,
  });
});
void test('travel pauses in transit and uses every floor before stopping at the closed final door', () => {
  for (let level = 0; level < 4; level++) {
    assert.deepEqual(
      journeyAction(p(0, LIFT_Z, level), level * LEVEL_HEIGHT, true, 49, 50),
      { type: 'wait' },
    );
    assert.deepEqual(
      journeyAction(p(0, LIFT_Z, level), level * LEVEL_HEIGHT, false, 49, 50),
      { type: 'lift', level: level + 1 },
    );
  }
  const goal = doorPose(49, 50);
  assert.deepEqual(
    journeyAction(p(0, LIFT_Z, 4), 4 * LEVEL_HEIGHT, false, 49, 50),
    { type: 'walk', point: { x: goal.x, z: DOOR_APPROACH_Z, level: 4 } },
  );
  assert.deepEqual(
    journeyAction(p(goal.x, DOOR_APPROACH_Z, 4), 4 * LEVEL_HEIGHT, false, 49, 50),
    { type: 'arrive' },
  );
});
void test('travel also descends and waits for an airborne avatar to land', () => {
  assert.deepEqual(
    journeyAction(p(0, LIFT_Z, 4), 4 * LEVEL_HEIGHT, false, 0, 50),
    { type: 'lift', level: 3 },
  );
  assert.deepEqual(journeyAction({ ...p(0, 0, 2), y: 8 }, 0, false, 0, 50), {
    type: 'wait',
  });
});
