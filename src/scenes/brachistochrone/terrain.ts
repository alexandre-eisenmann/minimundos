/**
 * Landform for the descent workshop.
 *
 * The drop the riders need has to come from somewhere, so the west of the
 * island is a bluff. Its east face is quarried into a flat launch terrace, and
 * a switchback path climbs the long south flank from the town lane below.
 */

export const LAND = { halfWidth: 16, halfDepth: 12 };

/** The quarried face: east of this the bluff is cut away to open air. */
export const CLIFF_X = -5;
export const TERRACE_Y = 5.98;

export const CANAL = { minX: -3, maxX: 17, minZ: -9, maxZ: -7 };
export const CANAL_BED = -0.92;
export const CANAL_WATER_Y = -0.16;

/**
 * The wheel pit, quarried back into the near flank of the bluff. Cutting the
 * hillside away is what lets the wheel stand as tall as the terrace without
 * crowding the tracks: it sits in the rock rather than out on the valley
 * floor, and the whole head of water is used between its crown and its foot.
 */
export const WHEEL_PIT = { minX: -8.35, maxX: -1.4, minZ: 7.48, maxZ: 9.55 };

/**
 * The tail race. It leaves the pit, runs north down the valley floor under
 * every one of the four tracks, and gives its water back to the head of the
 * canal, so one stream drives the works and then feeds the river.
 */
export const TAIL_RACE = {
  minX: -3.4,
  maxX: -2.5,
  minZ: CANAL.maxZ - 0.2,
  maxZ: 7.55,
};

/** Height the island sides fall to before the stone plinth takes over. */
export const SHORE_Y = -1.05;

type Mass = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  slope: number;
  power?: number;
  /** Quarried masses stop dead at this face instead of ramping east. */
  cutX?: number;
  /** Outside this band the mass is absent, leaving a cut wall along z. */
  clipZ?: [number, number];
};

const masses: Mass[] = [
  // The launch terrace and the broad flanks that carry the climbing path.
  {
    minX: -11.5,
    maxX: CLIFF_X,
    minZ: -4.6,
    maxZ: 4.6,
    height: TERRACE_Y,
    slope: 8,
    cutX: CLIFF_X,
  },
  // Lower quarry benches, flanking the notch the tracks leave through. They
  // step the working face so it does not read as one blank wall.
  {
    minX: -10.5,
    maxX: -3.4,
    minZ: 5.4,
    maxZ: 7,
    height: 2.75,
    slope: 3.2,
    cutX: -3.4,
    clipZ: [5.2, LAND.halfDepth],
  },
  {
    minX: -10.5,
    maxX: -3.4,
    minZ: -7,
    maxZ: -5.4,
    height: 2.75,
    slope: 3.2,
    cutX: -3.4,
    clipZ: [-LAND.halfDepth, -5.2],
  },
  // Summit, standing clear behind the terrace.
  {
    minX: -13.2,
    maxX: -11.8,
    minZ: -1.6,
    maxZ: 2,
    height: 8.2,
    slope: 4.6,
    power: 1.2,
  },
  // Northern shoulder.
  {
    minX: -13.4,
    maxX: -12,
    minZ: -8,
    maxZ: -6.2,
    height: 5.2,
    slope: 4.4,
    power: 1.2,
  },
  // Southern shoulder.
  {
    minX: -12.6,
    maxX: -11.2,
    minZ: 6.4,
    maxZ: 8.2,
    height: 4.2,
    slope: 4.2,
    power: 1.2,
  },
  // Foothill knoll that frames the near corner of the valley.
  {
    minX: -7.6,
    maxX: -6.6,
    minZ: 9.6,
    maxZ: 10.4,
    height: 1.9,
    slope: 3,
    power: 1.1,
  },
];

/** 1 at t <= 0, 0 at t >= 1, with zero gradient at both ends. */
function ease(t: number) {
  if (t <= 0) return 1;
  if (t >= 1) return 0;
  return 0.5 + 0.5 * Math.cos(Math.PI * t);
}

function rectDistance(
  x: number,
  z: number,
  r: { minX: number; maxX: number; minZ: number; maxZ: number },
) {
  return Math.hypot(
    Math.max(r.minX - x, 0, x - r.maxX),
    Math.max(r.minZ - z, 0, z - r.maxZ),
  );
}

function massHeight(x: number, z: number, m: Mass) {
  if (m.cutX !== undefined && x > m.cutX) return 0;
  if (m.clipZ && (z < m.clipZ[0] || z > m.clipZ[1])) return 0;
  return m.height * ease(rectDistance(x, z, m) / m.slope) ** (m.power ?? 1);
}

/** Relief settles to the shoreline before the island edge, as on Kneiphof. */
function rimTaper(x: number, z: number) {
  const margin = 2.6;
  return Math.min(
    1 - ease((LAND.halfWidth - Math.abs(x)) / margin),
    1 - ease((LAND.halfDepth - Math.abs(z)) / margin),
  );
}

type Basin = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** How far the bank slopes back from the lip of the cut. */
  batter: number;
  /**
   * Quarried basins take the hillside down with them; the canal only dips a
   * floor that was already flat, so it leaves the relief around it alone.
   */
  quarried?: boolean;
};

const basins: Basin[] = [
  { ...CANAL, batter: 0.75 },
  { ...WHEEL_PIT, batter: 0.95, quarried: true },
  { ...TAIL_RACE, batter: 0.5, quarried: true },
];

/** How deep the water is cut here, and how much ground was taken to cut it. */
function excavate(x: number, z: number) {
  let dip = 0;
  let cut = 0;
  for (const b of basins) {
    const held = ease(rectDistance(x, z, b) / b.batter);
    if (held <= 0) continue;
    dip = Math.min(dip, CANAL_BED * held);
    if (b.quarried) cut = Math.max(cut, held);
  }
  return { dip, cut };
}

/**
 * Crumple on the flanks so the bluff reads as rock and turf rather than a
 * smooth dome. It fades out on the flat valley floor and on the worked
 * terrace, both of which have to stay level.
 */
function crumple(x: number, z: number, relief: number) {
  const slopes = Math.min(1, relief / 1.3);
  if (slopes <= 0) return 0;
  const bench = 1 - ease(rectDistance(x, z, masses[0]) / 1.3);
  if (bench <= 0) return 0;
  // Broad spurs and gullies first, then finer breaks, so the flanks read as
  // folded ground rather than a smooth cone.
  const spur = Math.sin(x * 0.74 + z * 0.52) * Math.cos(z * 0.61 - x * 0.43);
  const gully = 0.62 - Math.abs(Math.sin(x * 0.83 - z * 1.07));
  const breaks =
    0.42 * Math.sin(x * 2.19 - z * 1.63) +
    0.24 * Math.cos(x * 3.71 + z * 3.13) +
    0.12 * Math.sin(x * 6.7 - z * 5.9);
  return (spur * 0.62 + gully * 0.72 + breaks) * 0.46 * slopes * bench;
}

export type PathPoint = { x: number; y: number; z: number };

/**
 * Switchbacks up the south flank, then across the terrace to the launch house.
 * Elevations sit close to the natural slope so the tread reads as a cut shelf.
 */
export const climbPath: PathPoint[] = [
  { x: -1.6, y: 0.04, z: 11 },
  { x: -4.2, y: 0.4, z: 10.7 },
  // The climb keeps south and west of the wheel pit, so the tread is never
  // undercut by the quarrying.
  { x: -8.2, y: 1.55, z: 10.45 },
  { x: -12.8, y: 2.76, z: 9.8 },
  { x: -12.4, y: 3.39, z: 7.8 },
  { x: -8, y: 4.62, z: 6.5 },
  { x: -11.4, y: 5.65, z: 6 },
  { x: -10.78, y: TERRACE_Y, z: 5.50 },
  { x: -9.49, y: TERRACE_Y, z: 4.47 },
  { x: -8.20, y: TERRACE_Y, z: 3.44 },
  { x: -8.6, y: TERRACE_Y, z: 1.6 },
  { x: -6.4, y: TERRACE_Y, z: 0 },
];

/** The lane along the quay and round the valley that leads to the climb. */
export const townRoad: PathPoint[] = [
  { x: 2.5, y: 0, z: -9.9 },
  { x: 2.5, y: 0, z: -6.1 },
  { x: 5, y: 0, z: -5.4 },
  { x: 10.6, y: 0, z: -5 },
  { x: 12, y: 0, z: 0.4 },
  { x: 10, y: 0, z: 6.4 },
  { x: 4.4, y: 0, z: 9.4 },
  { x: -1.6, y: 0, z: 11 },
];

const TREAD = 0.72;
const SHELF = 1.6;

/** Nearest point on a polyline, with its elevation, measured on the ground plane. */
export function nearestOnPolyline(line: PathPoint[], x: number, z: number) {
  let best = { distance: Infinity, y: 0, t: 0, segment: 0 };
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const lengthSq = dx * dx + dz * dz;
    const t = lengthSq
      ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / lengthSq))
      : 0;
    const distance = Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
    if (distance < best.distance)
      best = { distance, y: a.y + (b.y - a.y) * t, t, segment: i - 1 };
  }
  return best;
}

export const nearestOnPath = (x: number, z: number) =>
  nearestOnPolyline(climbPath, x, z);

/** True on the pit or the tail race, where trees and talus must stay off. */
export function inWaterWorks(x: number, z: number) {
  return (
    rectDistance(x, z, WHEEL_PIT) < 0.55 ||
    rectDistance(x, z, TAIL_RACE) < 0.4
  );
}

/** Fraction of the path shelf felt at a distance from its centre line. */
export function pathWeight(distance: number) {
  return ease((distance - TREAD) / (SHELF - TREAD));
}

export function landHeight(x: number, z: number): number {
  let relief = 0;
  for (const m of masses) relief = Math.max(relief, massHeight(x, z, m));
  relief *= rimTaper(x, z);
  relief = Math.max(0, relief + crumple(x, z, relief));
  const near = nearestOnPath(x, z);
  const weight = pathWeight(near.distance);
  if (weight > 0) relief = relief * (1 - weight) + near.y * weight;
  // The switchback is a cut shelf, so the workings pass under it rather than
  // through it: wherever the tread holds the ground, the digging stops.
  const spare = 1 - weight;
  const { dip, cut } = excavate(x, z);
  return relief * (1 - cut * spare) + dip * spare;
}

/** Central difference gradient, used for slope-aware colouring and facing. */
export function landNormalY(x: number, z: number, step = 0.25) {
  const dx = (landHeight(x + step, z) - landHeight(x - step, z)) / (2 * step);
  const dz = (landHeight(x, z + step) - landHeight(x, z - step)) / (2 * step);
  return 1 / Math.sqrt(1 + dx * dx + dz * dz);
}

/** True where a walker or a building can stand: on the island, out of the water. */
export function isStandable(x: number, z: number) {
  return (
    Math.abs(x) < LAND.halfWidth - 0.5 &&
    Math.abs(z) < LAND.halfDepth - 0.5 &&
    landHeight(x, z) > CANAL_BED * 0.25
  );
}
