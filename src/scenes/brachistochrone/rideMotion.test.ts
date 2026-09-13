import test from 'node:test';
import assert from 'node:assert/strict';
import { afterQueueBoarding, haulDistance, haulDuration, queueWaiting } from './rideMotion.ts';

test('a release does not empty the holding-road queue', () => {
  const spots = 3;
  const interval = 3.5;
  const boardedAt = -1e6;
  const now = 40;
  assert.equal(queueWaiting(now, boardedAt, spots, interval), spots);
  assert.equal(queueWaiting(now, now, spots, interval), 0);
  const afterOneBoards = afterQueueBoarding(
    now,
    queueWaiting(now, boardedAt, spots, interval) - 1,
    interval,
  );
  assert.equal(queueWaiting(now, afterOneBoards, spots, interval), spots - 1);
  assert.equal(queueWaiting(now + interval, afterOneBoards, spots, interval), spots);
});

test('winch starts and stops at rest without overshooting its actual stopping point', () => {
  const distance = 16.3;
  const speed = 2.6;
  const duration = haulDuration(distance, speed);
  assert.equal(haulDistance(0, distance, speed), 0);
  assert.equal(haulDistance(duration, distance, speed), distance);
  assert.equal(haulDistance(duration + 10, distance, speed), distance);
  let previous = 0;
  for (let t = 0; t < duration; t += 0.01) {
    const next = haulDistance(t, distance, speed);
    assert.ok(next >= previous && next <= distance);
    assert.ok(next - previous <= speed * 0.010001);
    previous = next;
  }
  assert.ok(haulDistance(0.01, distance, speed) < 0.001);
  assert.ok(distance - haulDistance(duration - 0.01, distance, speed) < 0.001);
});

test('cart pitch and position remain continuous through launch and runout joins', async () => {
  const { railArcAtX, railCartPose } = await import('./rideMotion.ts');
  const line = [{ x: -1.5, y: 5 }, { x: 0, y: 5 }, { x: 0.02, y: 4 }, { x: 4, y: 0 }, { x: 8, y: 0 }];
  const table = [0];
  for (let i = 1; i < line.length; i++) table.push(table[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y));
  for (const join of table.slice(1, -1)) {
    const before = railCartPose(line, table, join - 1e-6);
    const after = railCartPose(line, table, join + 1e-6);
    assert.ok(Math.abs(after.pitch - before.pitch) < 1e-4);
    assert.ok(Math.hypot(after.x - before.x, after.y - before.y) < 1e-4);
  }
  assert.deepEqual(railCartPose(line, table, 0), { x: -1.5, y: 5, pitch: 0 });
  assert.equal(railArcAtX(line, table, 4), table[3]);
});
