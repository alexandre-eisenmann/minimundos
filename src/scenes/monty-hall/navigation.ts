export type FloorPoint = { x: number; z: number; level?: number };
export const DOOR_Z = -3;
export const BOOTH_BACK = -7.1;
export const LEVEL_HEIGHT = 4.7;
/** Balanced rectangular galleries keep every floor legible and reachable. */
export function doorRows(count: number): number[] {
  if (count <= 10) return [count];
  const levels = Math.ceil(count / 10);
  const columns = Math.min(10, Math.ceil(count / levels));
  return Array.from({ length: levels }, (_, level) =>
    Math.min(columns, count - level * columns),
  );
}
export function doorPose(door: number, count: number) {
  const rows = doorRows(count);
  let offset = 0;
  for (let level = 0; level < rows.length; level++) {
    if (door < offset + rows[level])
      return {
        x: (door - offset + rows[0] / 2 - rows[level] + 0.5) * 3.65,
        y: level * LEVEL_HEIGHT,
        level,
      };
    offset += rows[level];
  }
  throw new Error('Door outside studio');
}
export const rowLeft = (count: number, level: number) =>
  (doorRows(count)[0] / 2 - doorRows(count)[level]) * 3.65 - 0.2;
export const rowCenter = (count: number, level: number) =>
  ((doorRows(count)[0] - doorRows(count)[level]) * 3.65) / 2;
export const doorX = (door: number, count: number) => doorPose(door, count).x;
export const studioWidth = (count: number) =>
  Math.max(24, doorRows(count)[0] * 3.65 + 9);
export const liftX = (_count: number) => 0;
export const LIFT_Z = 2;
export const LIFT_RADIUS = 3.25;
export const LIFT_CLEARANCE = 0.035;
export const GALLERY_FRONT = -0.4;
export const landingHalfWidth = Math.sqrt(
  (LIFT_RADIUS + LIFT_CLEARANCE) ** 2 - (GALLERY_FRONT - LIFT_Z) ** 2,
);
export const spawn: FloorPoint = { x: 0, z: 3.5, level: 0 };
export function canWalk(
  point: FloorPoint,
  count: number,
  open: number[],
  platformHeight = 0,
): boolean {
  const { x, z } = point,
    level = point.level ?? 0;
  if (!Number.isInteger(level) || level < 0 || level >= doorRows(count).length)
    return false;
  const distance = Math.hypot(x, z - LIFT_Z);
  if (level > 0 && distance <= LIFT_RADIUS + LIFT_CLEARANCE)
    return Math.abs(platformHeight - level * LEVEL_HEIGHT) < 0.01;
  if (level > 0 && z > GALLERY_FRONT - 0.1) return false;
  if (
    Math.abs(x) > studioWidth(count) / 2 - 0.65 ||
    z < BOOTH_BACK + 0.5 ||
    z > (level ? -0.55 : 6.8)
  )
    return false;
  if (level > 0 && x < rowLeft(count, level)) return false;
  if (z < DOOR_Z + 0.5)
    return open.some(
      (i) =>
        doorPose(i, count).level === level &&
        Math.abs(x - doorX(i, count)) < 1.25,
    );
  return true;
}
export function walkRoute(
  from: FloorPoint,
  to: FloorPoint,
  count = 10,
): FloorPoint[] {
  const aisle = DOOR_Z + 1,
    source = from.level ?? 0,
    target = to.level ?? 0;
  if (source !== target)
    return [
      { x: from.x, z: aisle, level: source },
      { x: liftX(count), z: aisle, level: source },
      { x: liftX(count), z: LIFT_Z, level: source },
    ];
  if (source > 0 && (from.z > -0.55 || to.z > -0.55))
    return [
      { x: from.z > -0.55 ? 0 : from.x, z: aisle, level: source },
      { x: to.z > -0.55 ? 0 : to.x, z: aisle, level: source },
      to,
    ];
  if (to.z < aisle || from.z < aisle)
    return [
      { x: from.x, z: aisle, level: source },
      { x: to.x, z: aisle, level: target },
      to,
    ];
  return [to];
}
export function nearestDoor(point: FloorPoint, count: number): number | null {
  for (let i = 0; i < count; i++) {
    const pose = doorPose(i, count);
    if (
      pose.level === (point.level ?? 0) &&
      Math.hypot(point.x - pose.x, point.z + 1.8) < 1.1
    )
      return i;
  }
  return null;
}

/** Platform commands depend only on the deck's current landing. */
export function canMoveLift(
  height: number,
  target: number,
  count: number,
): boolean {
  const source = height / LEVEL_HEIGHT;
  return (
    Number.isInteger(target) &&
    target >= 0 &&
    target < doorRows(count).length &&
    Math.abs(source - Math.round(source)) < 0.001 &&
    Math.abs(target - Math.round(source)) === 1
  );
}
export function aboardLift(point: FloorPoint, count: number): boolean {
  return Math.hypot(point.x - liftX(count), point.z - LIFT_Z) <= LIFT_RADIUS;
}

/** Feet follow a supporting deck; unsupported avatars fall onto the next surface. */
export function avatarSupport(
  point: FloorPoint & { y: number },
  velocity: number,
  oldDeck: number,
  deck: number,
  count: number,
  open: number[],
  dt: number,
): { y: number; velocity: number; level: number; grounded: boolean } {
  const feet = point.y - 0.17;
  if (
    aboardLift(point, count) &&
    Math.abs(feet - oldDeck) < 0.01 &&
    velocity === 0
  )
    return {
      y: deck + 0.17,
      velocity: 0,
      level: Math.round(deck / LEVEL_HEIGHT),
      grounded: true,
    };
  const nextVelocity = velocity - 18 * dt;
  const next = feet + nextVelocity * dt;
  let support = 0;
  for (let level = 1; level < doorRows(count).length; level++) {
    const height = level * LEVEL_HEIGHT;
    if (
      height <= feet + 0.01 &&
      !aboardLift(point, count) &&
      // The narrow clearance around the deck is supported at an aligned landing.
      // Otherwise a slow step through that seam starts a fall before boarding.
      canWalk({ ...point, level }, count, open, deck)
    )
      support = height;
  }
  if (aboardLift(point, count) && deck <= feet + 0.01)
    support = Math.max(support, deck);
  const grounded = next <= support;
  return {
    y: (grounded ? support : next) + 0.17,
    velocity: grounded ? 0 : nextVelocity,
    level: grounded ? Math.round(support / LEVEL_HEIGHT) : (point.level ?? 0),
    grounded,
  };
}
