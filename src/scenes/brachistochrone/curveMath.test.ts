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
  const sweep = 3.5083687685244755; // run:drop of 2, solved numerically
  const radius = 5 / (1 - Math.cos(sweep));
  const exact = sweep * Math.sqrt(radius / 9.81);
  const sampled = timeCurve(sampleCurve('cycloid', [], 480)).duration;
  assert.ok(
    Math.abs(sampled - exact) < 0.000002,
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

test('straight ramp timing includes acceleration from rest at every resolution', () => {
  const exact = Math.sqrt(2 * 5 / 9.81) * Math.hypot(10, 5) / 5;
  for (const count of [1, 8, 240, 1000]) {
    const timed = timeCurve(sampleCurve('line', [], count));
    assert.ok(Math.abs(timed.duration - exact) < 1e-12);
    const halfway = pointAtTime(timed, exact / 2);
    assert.ok(Math.abs(halfway.x - 0.25) < 1e-12);
    assert.ok(Math.abs(halfway.y - 0.25) < 1e-12);
  }
});

test('a steep seven-anchor custom track cannot win through initial-speed integration bias', () => {
  // The old midpoint-speed rule reported about 1.795 s, beating its 1.798 s cycloid.
  const anchors = [
    { x: 0, y: 0 }, { x: 0.0501, y: 0.3266 },
    { x: 0.175, y: 0.6249 }, { x: 0.3666, y: 0.8705 },
    { x: 0.52, y: 0.965 }, { x: 0.76, y: 0.965 }, { x: 1, y: 1 },
  ];
  for (const count of [90, 240, 960]) {
    const custom = timeCurve(sampleCurve('custom', anchors, count)).duration;
    const cycloid = timeCurve(sampleCurve('cycloid', [], count)).duration;
    assert.ok(custom > cycloid, `custom ${custom} vs cycloid ${cycloid}`);
    assert.ok(custom > 1.81 && custom < 1.82);
  }
});

test('a level start cannot accelerate from rest, and repeated points add no time', () => {
  assert.equal(timeCurve([{ x: 0, y: 0 }, { x: 0.2, y: 0 }, { x: 1, y: 1 }]).duration, Infinity);
  const points = sampleCurve('line', []);
  assert.equal(timeCurve([points[0], ...points]).duration, timeCurve(points).duration);
});
