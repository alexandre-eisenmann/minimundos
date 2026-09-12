import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultAnchors,
  pointAtTime,
  sampleCurve,
  timeCurve,
} from './curveMath.ts';

test('all comparison curves preserve the shared endpoints', () => {
  for (const kind of ['line', 'parabola', 'custom'] as const) {
    const points = sampleCurve(kind, defaultAnchors());
    assert.deepEqual(points[0], { x: 0, y: 0 });
    assert.deepEqual(points.at(-1), { x: 1, y: 1 });
  }
});

test('the steeper parabola beats the straight ramp in the ideal model', () => {
  const line = timeCurve(sampleCurve('line', []));
  const parabola = timeCurve(sampleCurve('parabola', []));
  assert.ok(parabola.duration < line.duration);
});

test('time lookup begins and finishes exactly on the endpoints', () => {
  const curve = timeCurve(sampleCurve('custom', defaultAnchors()));
  assert.deepEqual(pointAtTime(curve, 0), curve.points[0]);
  assert.deepEqual(pointAtTime(curve, curve.duration), curve.points.at(-1));
});
