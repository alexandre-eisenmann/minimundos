import test from 'node:test';
import assert from 'node:assert/strict';
import { bucketWater, bucketSpill, BUCKET_CAVITY } from '../assets/waterwheelHydraulics.ts';
const feed = Math.acos(1.85 / 3.18);
const area = (p: [number, number][]) => Math.abs(p.reduce((sum, a, i) => {
  const b = p[(i + 1) % p.length];
  return sum + a[0] * b[1] - b[0] * a[1];
}, 0)) / 2;
test('bucket water stays below the lowest open lip at every orientation', () => {
  for (let angle = -Math.PI; angle < Math.PI; angle += 0.013) {
    const level = (p: [number, number]) => p[0] * Math.sin(angle) + p[1] * Math.cos(angle);
    const lip = Math.min(level(BUCKET_CAVITY[2]), level(BUCKET_CAVITY[3]));
    for (const p of bucketWater(angle, feed).polygon) assert.ok(level(p) <= lip + 1e-8);
  }
});
test('filling and draining are continuous, and empty buckets return without water', () => {
  let previous = 0;
  for (let travel = 0; travel < Math.PI * 2; travel += 0.001) {
    const current = area(bucketWater(feed + 0.11 - travel, feed).polygon);
    assert.ok(Math.abs(current - previous) < 0.001, `jump at ${travel}`);
    if (travel > 0.23) assert.ok(current <= previous + 0.00001, `refilled at ${travel}`);
    if (travel > 2.9) assert.equal(current, 0);
    previous = current;
  }
});
test('bucket hydraulics repeat identically after complete revolutions', () => {
  for (let angle = -2; angle < 2; angle += 0.1) {
    const a = bucketWater(angle, feed), b = bucketWater(angle - 20 * Math.PI, feed);
    assert.ok(Math.abs(area(a.polygon) - area(b.polygon)) < 1e-8);
    assert.ok(Math.abs(a.flow - b.flow) < 1e-8);
  }
});

test('loaded buckets carry a substantial volume and spill before the lower quadrant', () => {
  assert.ok(area(bucketWater(0.5, feed).polygon) > 0.09);
  assert.ok(bucketWater(-0.15, feed).flow > 0);
});
test('released water remains in flight after its bucket empties', () => {
  const currentAngle = -1.1;
  assert.equal(bucketWater(currentAngle, feed).flow, 0);
  const trailing = bucketSpill(currentAngle, feed, 3.18, 0.5);
  assert.ok(trailing.flow > 0);
  const emission = bucketSpill(currentAngle + 0.15, feed, 3.18, 0);
  assert.ok(trailing.y < emission.y);
  assert.ok(Math.abs(trailing.x - (emission.x + 0.3 * emission.y * 0.5)) < 1e-10);
});
