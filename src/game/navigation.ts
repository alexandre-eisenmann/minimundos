import { bridges, type Region } from './world.ts';
export const houses = [
  { x: -9.3, z: -6.05, s: 0.8, rot: 0.08 },
  { x: -7.9, z: -6.4, s: 0.95, rot: -0.13 },
  { x: -5.8, z: -6.6, s: 0.73, rot: 0.08 },
  { x: -2.8, z: -6.25, s: 1.1, rot: 0 },
  { x: -1.3, z: -6.6, s: 0.7, rot: 0.15 },
  { x: 2.4, z: -6.2, s: 0.88, rot: -0.07 },
  { x: 4.2, z: -6.75, s: 0.74, rot: 0.12 },
  { x: 8.4, z: -6.05, s: 1.12, rot: -0.12 },
  { x: 9.95, z: -6.4, s: 0.7, rot: 0 },
  { x: -8.7, z: 6.2, s: 0.92, rot: 3.1 },
  { x: -7.3, z: 6.5, s: 0.72, rot: 3.3 },
  { x: -3.7, z: 6.35, s: 1.03, rot: 3.05 },
  { x: -1.5, z: 6.55, s: 0.8, rot: 3.2 },
  { x: 0.05, z: 6.2, s: 0.65, rot: 3.14 },
  { x: 4.1, z: 6.65, s: 1, rot: 3.05 },
  { x: 8.9, z: 6.1, s: 0.85, rot: 3.3 },
  { x: -5.8, z: -0.95, s: 0.65, rot: 0 },
  { x: -4.75, z: -1, s: 0.58, rot: 0.07 },
  { x: 0.65, z: 1, s: 0.65, rot: 3.2 },
  { x: 7.8, z: -0.8, s: 0.74, rot: 0.06 },
  { x: 9.1, z: -0.85, s: 0.58, rot: 0 },
  { x: 10.2, z: 0.9, s: 0.7, rot: 3.1 },
];
export function landAt(x: number, z: number): Region | null {
  if (Math.abs(x) > 11.2) return null;
  if (z >= 4.3 && z <= 8.2) return 'south';
  if (z <= -4.3 && z >= -8.2) return 'north';
  if (Math.abs(z) <= 1.7) {
    if (x >= -6.7 && x <= 1.7) return 'island';
    if (x >= 4.4 && x <= 11.2) return 'east';
  }
  return null;
}
export function bridgeAt(x: number, z: number) {
  return bridges.find((b) =>
    b.id === 7
      ? x >= 1.65 && x <= 4.45 && Math.abs(z) < 0.3
      : Math.abs(x - b.a[0]) < 0.3 &&
        z >= Math.min(b.a[2], b.b[2]) - 0.05 &&
        z <= Math.max(b.a[2], b.b[2]) + 0.05,
  );
}
export function canWalk(
  x: number,
  z: number,
  _used: number[],
  _currentBridge: number | null,
) {
  const land = landAt(x, z);
  if (land) {
    if (
      houses.some(
        (h) =>
          Math.abs(x - h.x) < h.s * 0.55 + 0.12 &&
          Math.abs(z - h.z) < h.s * 0.5 + 0.12,
      )
    )
      return false;
    if (Math.abs(x + 1.5) < 0.92 && z > -1.7 && z < 0.68) return false;
    return true;
  }
  const b = bridgeAt(x, z);
  return !!b;
}

export function advanceCrossing(
  state: { bank: Region; bridge: number | null },
  x: number,
  z: number,
  _used: number[],
): { bank: Region; bridge: number | null; crossed: number | null } {
  const land = landAt(x, z);
  const b = bridgeAt(x, z);
  if (!land) {
    // A landing overlaps both land and bridge geometry. Never arm a bridge
    // while still on land: a crossing starts on the span and ends on the other bank.
    const valid = b && (b.from === state.bank || b.to === state.bank);
    return { ...state, bridge: valid ? b.id : state.bridge, crossed: null };
  }
  const pending = bridges.find((candidate) => candidate.id === state.bridge);
  const crossed =
    pending &&
    land !== state.bank &&
    ((pending.from === state.bank && pending.to === land) ||
      (pending.to === state.bank && pending.from === land))
      ? pending.id
      : null;
  return { bank: crossed !== null ? land : state.bank, bridge: null, crossed };
}
