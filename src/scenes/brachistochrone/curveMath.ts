export type CurvePoint = { x: number; y: number };
export type CurveKind = 'line' | 'parabola' | 'custom';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function cubic(a: number, b: number, c: number, d: number, t: number) {
  const s = 1 - t;
  return s * s * s * a + 3 * s * s * t * b + 3 * s * t * t * c + t * t * t * d;
}

/** A smooth piecewise cubic Bézier spline through user-controlled anchors. */
export function sampleBezierSpline(
  anchors: CurvePoint[],
  count = 240,
): CurvePoint[] {
  if (anchors.length < 2)
    return [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
  const sorted = anchors
    .map((point) => ({ x: clamp01(point.x), y: clamp01(point.y) }))
    .sort((a, b) => a.x - b.x);
  const segments = sorted.length - 1;
  return Array.from({ length: count + 1 }, (_, index) => {
    const progress = index / count;
    const segment = Math.min(segments - 1, Math.floor(progress * segments));
    const t = progress * segments - segment;
    const p0 = sorted[segment];
    const p1 = sorted[segment + 1];
    const before = sorted[Math.max(0, segment - 1)];
    const after = sorted[Math.min(sorted.length - 1, segment + 2)];
    const c1 = {
      x: p0.x + (p1.x - before.x) / 6,
      y: p0.y + (p1.y - before.y) / 6,
    };
    const c2 = {
      x: p1.x - (after.x - p0.x) / 6,
      y: p1.y - (after.y - p0.y) / 6,
    };
    return {
      x: clamp01(cubic(p0.x, c1.x, c2.x, p1.x, t)),
      y: clamp01(cubic(p0.y, c1.y, c2.y, p1.y, t)),
    };
  });
}

export function sampleCurve(
  kind: CurveKind,
  anchors: CurvePoint[],
  count = 240,
): CurvePoint[] {
  if (kind === 'custom') return sampleBezierSpline(anchors, count);
  return Array.from({ length: count + 1 }, (_, index) => {
    const x = index / count;
    return { x, y: kind === 'line' ? x : 2 * x - x * x };
  });
}

export type TimedCurve = {
  points: CurvePoint[];
  elapsed: number[];
  duration: number;
};

/** Ideal frictionless descent under uniform gravity, sampled at segment midpoints. */
export function timeCurve(
  points: CurvePoint[],
  width = 10,
  drop = 5,
  gravity = 9.81,
): TimedCurve {
  const elapsed = [0];
  let total = 0;
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1];
    const b = points[index];
    const dx = (b.x - a.x) * width;
    const dy = (b.y - a.y) * drop;
    const distance = Math.hypot(dx, dy);
    const midpointDrop = Math.max(0.00001, ((a.y + b.y) * drop) / 2);
    total += distance / Math.sqrt(2 * gravity * midpointDrop);
    elapsed.push(total);
  }
  return { points, elapsed, duration: total };
}

export function pointAtTime(curve: TimedCurve, time: number): CurvePoint {
  if (time <= 0) return curve.points[0];
  if (time >= curve.duration) return curve.points.at(-1)!;
  let low = 0;
  let high = curve.elapsed.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (curve.elapsed[middle] <= time) low = middle;
    else high = middle;
  }
  const span = curve.elapsed[high] - curve.elapsed[low];
  const t = span ? (time - curve.elapsed[low]) / span : 0;
  const a = curve.points[low];
  const b = curve.points[high];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function defaultAnchors(count = 4): CurvePoint[] {
  return Array.from({ length: count }, (_, index) => {
    const x = index / (count - 1);
    return {
      x,
      y:
        index === 0
          ? 0
          : index === count - 1
            ? 1
            : Math.min(1, Math.sqrt(x) * 1.02),
    };
  });
}

export function resizeAnchors(
  anchors: CurvePoint[],
  count: number,
): CurvePoint[] {
  const sampled = sampleBezierSpline(anchors, Math.max(2, count - 1));
  return Array.from(
    { length: count },
    (_, index) =>
      sampled[Math.round((index * (sampled.length - 1)) / (count - 1))],
  );
}
