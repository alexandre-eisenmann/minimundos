import {
  doorPose,
  LEVEL_HEIGHT,
  LIFT_Z,
  aboardLift,
  type FloorPoint,
} from './navigation.ts';
export const DOOR_APPROACH_Z = -1.8;
export type JourneyAction =
  | { type: 'wait' }
  | { type: 'arrive' }
  | { type: 'walk'; point: FloorPoint }
  | { type: 'lift'; level: number };
/**
 * Travel only across an aligned landing, board at the centre, then ride floor by
 * floor. The journey ends facing the still-closed final door.
 */
export function journeyAction(
  point: FloorPoint & { y: number },
  deck: number,
  moving: boolean,
  door: number,
  count: number,
): JourneyAction {
  if (moving) return { type: 'wait' };
  const level = point.level ?? 0;
  if (Math.abs(point.y - 0.17 - level * LEVEL_HEIGHT) > 0.02)
    return { type: 'wait' };
  const goal = doorPose(door, count);
  const destination = { x: goal.x, z: DOOR_APPROACH_Z, level: goal.level };
  if (level === goal.level) {
    return Math.hypot(point.x - destination.x, point.z - destination.z) < 0.12
      ? { type: 'arrive' }
      : { type: 'walk', point: destination };
  }
  const deckLevel = Math.round(deck / LEVEL_HEIGHT);
  if (deckLevel !== level) {
    const waiting = { x: 0, z: -1.8, level };
    if (Math.hypot(point.x, point.z - waiting.z) > 0.12)
      return { type: 'walk', point: waiting };
    return { type: 'lift', level: deckLevel + Math.sign(level - deckLevel) };
  }
  if (!aboardLift(point, count) || Math.hypot(point.x, point.z - LIFT_Z) > 0.12)
    return { type: 'walk', point: { x: 0, z: LIFT_Z, level } };
  return { type: 'lift', level: level + Math.sign(goal.level - level) };
}
