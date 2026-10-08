import { students } from './students.ts';
export type ClassroomPhase = 'recess' | 'settling' | 'challenge';
export function canExplore(x: number, z: number) {
  if (x < -4.8 || x > 5 || z < -3.2 || z > 4.6) return false;
  return !students.some(
    (s) => Math.abs(x - s.x) < 1.14 && z > s.z - 0.8 && z < s.z + 1.32,
  );
}
export function closestSlate(x: number, z: number) {
  let nearest: number | null = null;
  let distance = 2;
  students.forEach((s, i) => {
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < distance) {
      distance = d;
      nearest = i;
    }
  });
  return nearest;
}
