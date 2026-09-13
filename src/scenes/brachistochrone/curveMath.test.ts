import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultAnchors,
  pointAtTime,
  sampleCurve,
  timeCurve,
} from './curveMath.ts';

test('all comparison curves preserve the shared endpoints', () => {
  for (const kind of ['line', 'parabola', 'cycloid', 'custom'] as const) {
    const points = sampleCurve(kind, defaultAnchors());
    assert.equal(points[0].x, 0);
    assert.equal(points[0].y, 0);
    assert.ok(Math.abs(points.at(-1)!.x - 1) < 1e-9);
    assert.ok(Math.abs(points.at(-1)!.y - 1) < 1e-9);
  }
});

test('the steeper parabola beats the straight ramp in the ideal model', () => {
  const line = timeCurve(sampleCurve('line', []));
  const parabola = timeCurve(sampleCurve('parabola', []));
  assert.ok(parabola.duration < line.duration);
});

test('the cycloid is quicker than every other curve offered', () => {
  const cycloid = timeCurve(sampleCurve('cycloid', []));
  for (const kind of ['line', 'parabola'] as const)
    assert.ok(
      cycloid.duration < timeCurve(sampleCurve(kind, [])).duration,
      `${kind} beat the brachistochrone`,
    );
  // No hand-drawn spline should be able to beat it either.
  for (const count of [3, 4, 5, 6, 7])
    assert.ok(
      cycloid.duration <
        timeCurve(sampleCurve('custom', defaultAnchors(count))).duration,
    );
});

test('the sampled cycloid matches the closed-form descent time', () => {
  // For a cycloid from the cusp, T = sweep * sqrt(radius / g).
  const sweep = 3.5095; // run:drop of 2, solved numerically
  const radius = 5 / (1 - Math.cos(sweep));
  const exact = sweep * Math.sqrt(radius / 9.81);
  const sampled = timeCurve(sampleCurve('cycloid', [], 480)).duration;
  assert.ok(
    Math.abs(sampled - exact) < 0.02,
    `sampled ${sampled.toFixed(4)} vs exact ${exact.toFixed(4)}`,
  );
});

test('the quickest path overshoots below the finish when the run is long', () => {
  const deep = sampleCurve('cycloid', [], 400, 2);
  assert.ok(Math.max(...deep.map((p) => p.y)) > 1.02, 'no overshoot');
  // A short run keeps the sweep under a half turn, so it never overshoots.
  const shallow = sampleCurve('cycloid', [], 400, 1);
  assert.ok(Math.max(...shallow.map((p) => p.y)) <= 1 + 1e-9);
});

test('time lookup begins and finishes exactly on the endpoints', () => {
  const curve = timeCurve(sampleCurve('custom', defaultAnchors()));
  assert.deepEqual(pointAtTime(curve, 0), curve.points[0]);
  assert.deepEqual(pointAtTime(curve, curve.duration), curve.points.at(-1));
});

test('the editable default is a straight descent at every control-point count', () => {
  for (let count = 3; count <= 7; count++) {
    const curve = sampleCurve('custom', defaultAnchors(count));
    for (const point of curve) assert.ok(Math.abs(point.x - point.y) < 1e-9);
    const straight = timeCurve(sampleCurve('line', []));
    // The spline samples nonuniformly; midpoint integration differs slightly.
    assert.ok(Math.abs(timeCurve(curve).duration - straight.duration) < 0.02);
  }
});
