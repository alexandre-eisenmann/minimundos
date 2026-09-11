import test from 'node:test';
import assert from 'node:assert/strict';
import { pedestrianPose, pedestrianRoutes } from './townspeople.ts';
import { canWalk } from './navigation.ts';
test('all pedestrian routes stay on land or bridges and avoid buildings', () => {
  for (const route of pedestrianRoutes)
    for (let t = 0; t < 200; t += 0.1) {
      const p = pedestrianPose(route, t, 0.6).position;
      assert.ok(canWalk(p[0], p[2], [], null), `Blocked route position: ${p}`);
    }
});
test('pedestrians walk, pause, reverse and remain deterministic', () => {
  const route = pedestrianRoutes[0];
  const start = pedestrianPose(route, 0, 0.5);
  assert.deepEqual(start.position, route[0]);
  const atEnd = pedestrianPose(route, 30.5, 0.5, 2);
  assert.equal(atEnd.walking, false);
  const back = pedestrianPose(route, 33, 0.5, 2);
  assert.ok(back.walking);
  assert.ok(back.yaw < 0);
  assert.deepEqual(back, pedestrianPose(route, 33, 0.5, 2));
});
