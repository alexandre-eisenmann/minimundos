import type { Point } from './world.ts';
export const pedestrianRoutes: Point[][] = [
  [
    [-10, 0.7, -5.08],
    [-2, 0.7, -5.08],
    [5, 0.7, -5.08],
  ],
  [
    [-7, 0.7, -4.94],
    [1, 0.7, -4.94],
    [10, 0.7, -4.94],
  ],
  [
    [-10, 0.7, 5.03],
    [-3, 0.7, 5.03],
    [3, 0.7, 5.03],
  ],
  [
    [-2, 0.7, 4.94],
    [5, 0.7, 4.94],
    [10, 0.7, 4.94],
  ],
  [
    [4.8, 0.7, 0],
    [7, 0.7, 0],
    [10.5, 0.7, 0],
  ],
  [
    [-5.8, 0.7, 0.1],
    [-3, 0.7, 0.1],
    [-3, 0.7, 1.4],
    [-1, 0.7, 1.4],
  ],
  [
    [4.5, 0.7, -5.1],
    [6.2, 0.7, -5.1],
    [6.2, 0.7, 0],
    [6.2, 0.7, 5.1],
    [8, 0.7, 5.1],
  ],
];
/** Deterministic ping-pong walks with an idle pause at each end. */
export function pedestrianPose(
  route: Point[],
  time: number,
  speed: number,
  pause = 2,
) {
  const points = [...route, ...route.slice(0, -1).reverse()];
  const segments = points
    .slice(1)
    .map((b, i) => ({
      a: points[i],
      b,
      length: Math.hypot(b[0] - points[i][0], b[2] - points[i][2]),
    }));
  const duration =
    segments.reduce((n, s) => n + s.length / speed, 0) + pause * 2;
  let t = ((time % duration) + duration) % duration;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i],
      seconds = s.length / speed;
    const yaw = Math.atan2(s.b[0] - s.a[0], s.b[2] - s.a[2]);
    if (t <= seconds) {
      const f = t / seconds;
      return {
        position: [
          s.a[0] + (s.b[0] - s.a[0]) * f,
          s.a[1] + (s.b[1] - s.a[1]) * f,
          s.a[2] + (s.b[2] - s.a[2]) * f,
        ] as Point,
        yaw,
        walking: true,
      };
    }
    t -= seconds;
    if (i === route.length - 2 || i === segments.length - 1) {
      if (t < pause) return { position: s.b, yaw, walking: false };
      t -= pause;
    }
  }
  return { position: route[0], yaw: 0, walking: false };
}
