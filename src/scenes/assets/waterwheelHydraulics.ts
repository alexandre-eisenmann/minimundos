/** Illustrative bucket hydraulics: gravity-level water clipped by the wooden cavity. */
export type SectionPoint = [number, number];
export const BUCKET_CAVITY: SectionPoint[] = [[-0.28, 0.055], [0.09, 0.055], [0.255, 0.32], [-0.28, 0.74]];
const TAU = Math.PI * 2;
const area = (p: SectionPoint[]) => Math.abs(p.reduce((sum, a, i) => {
  const b = p[(i + 1) % p.length];
  return sum + a[0] * b[1] - b[0] * a[1];
}, 0)) / 2;
const height = (p: SectionPoint, angle: number) => p[0] * Math.sin(angle) + p[1] * Math.cos(angle);
function submerged(angle: number, level: number): SectionPoint[] {
  const result: SectionPoint[] = [];
  BUCKET_CAVITY.forEach((a, i) => {
    const b = BUCKET_CAVITY[(i + 1) % BUCKET_CAVITY.length];
    const ha = height(a, angle), hb = height(b, angle);
    if (ha <= level) result.push(a);
    if ((ha <= level) !== (hb <= level)) {
      const t = (level - ha) / (hb - ha);
      result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  });
  return result;
}
function capacity(angle: number) {
  const level = Math.min(height(BUCKET_CAVITY[2], angle), height(BUCKET_CAVITY[3], angle));
  return { level, area: area(submerged(angle, level)) };
}
function bucketState(angle: number, feedAngle: number) {
  const travel = ((feedAngle + 0.11 - angle) % TAU + TAU) % TAU;
  const filling = Math.min(1, travel / 0.22);
  const amount = travel < 2.9 ? 0.10 * filling * filling * (3 - 2 * filling) : 0;
  const cap = capacity(angle);
  const flow = amount > cap.area && travel < 2.9
    ? Math.max(0, (cap.area - capacity(angle - 0.01).area) / 0.01) * 0.3 * Math.min(1, (amount - cap.area) / 0.004) : 0;
  return { amount, cap, flow };
}
export function bucketWater(angle: number, feedAngle: number) {
  const { amount, cap, flow } = bucketState(angle, feedAngle);
  let lo = Math.min(...BUCKET_CAVITY.map(p => height(p, angle))), hi = cap.level;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (area(submerged(angle, mid)) < Math.min(amount, cap.area)) lo = mid;
    else hi = mid;
  }
  return { polygon: amount > 0.00001 ? submerged(angle, (lo + hi) / 2) : [], flow };
}

/** Follow water from its actual release pose, preserving motion after a bucket empties. */
export function bucketSpill(angle: number, feedAngle: number, radius: number, age: number) {
  const emittedAngle = angle + 0.3 * age;
  const c = Math.cos(emittedAngle), s = Math.sin(emittedAngle);
  const lip = BUCKET_CAVITY[2];
  const x = (radius + lip[0]) * c - lip[1] * s;
  const y = (radius + lip[0]) * s + lip[1] * c;
  return { x: x + 0.3 * y * age, y: y - 0.3 * x * age - 4.905 * age * age,
    flow: bucketState(emittedAngle, feedAngle).flow };
}
