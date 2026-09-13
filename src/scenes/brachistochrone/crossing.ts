/** Shared deck geometry and walk surface for the leat crossing. */
export const CROSSING = {
  x: -9.49, z: 4.47, dx: 0.7808688094, dz: -0.6246950476,
  halfWidth: 0.66, halfDeck: 0.9, halfLength: 1.65,
  deckY: 6.52, footY: 5.98,
};
export function crossingHeight(x: number, z: number): number | undefined {
  const dx = x - CROSSING.x;
  const dz = z - CROSSING.z;
  const along = Math.abs(dx * CROSSING.dx + dz * CROSSING.dz);
  const across = Math.abs(-dx * CROSSING.dz + dz * CROSSING.dx);
  if (across > CROSSING.halfWidth || along > CROSSING.halfLength) return undefined;
  const ramp = Math.max(0, (along - CROSSING.halfDeck) / (CROSSING.halfLength - CROSSING.halfDeck));
  return CROSSING.deckY + (CROSSING.footY - CROSSING.deckY) * ramp;
}
