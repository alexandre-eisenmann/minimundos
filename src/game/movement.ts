export type MovementInput = { x: number; z: number; sprint?: boolean };

/** Circular travel with a small, rescaled dead zone for resting thumbs. */
export function analogInput(x: number, z: number, radius: number): MovementInput {
  const distance = Math.hypot(x, z);
  const strength = Math.max(0, (Math.min(distance / radius, 1) - 0.12) / 0.88);
  return distance ? { x: x / distance * strength, z: z / distance * strength } : { x: 0, z: 0 };
}

export function keyboardInput(keys: Set<string>): MovementInput {
  const x = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
  const z = Number(keys.has('ArrowDown') || keys.has('KeyS')) - Number(keys.has('ArrowUp') || keys.has('KeyW'));
  const length = Math.max(1, Math.hypot(x, z));
  return { x: x / length, z: z / length, sprint: keys.has('ShiftLeft') || keys.has('ShiftRight') };
}
