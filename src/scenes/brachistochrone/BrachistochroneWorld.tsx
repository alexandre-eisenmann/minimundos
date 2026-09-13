import { Suspense, memo, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MovementInput } from '../../game/movement';
import type { Point } from '../../game/world';
import { pedestrianPose } from '../../game/townspeople';
import { HumanCharacter } from '../assets/HumanCharacter';
import { PlayerBeacon } from '../assets/PlayerBeacon';
import { SceneCamera } from '../assets/SceneCamera';
import { GableRoof, House } from '../assets/Architecture';
import { Birds, Boulder, Clouds, Tree } from '../assets/Nature';
import { Ripples, WaterSurface } from '../assets/Water';
import { CROSSING, crossingHeight } from './crossing';
import {
  afterQueueBoarding,
  haulDistance,
  haulDuration,
  queueWaiting,
  railArcAtX,
  railCartPose,
} from './rideMotion';
import { Spillway } from '../assets/Spillway';
import {
  CANAL,
  CANAL_BED,
  CANAL_WATER_Y,
  CLIFF_X,
  LAND,
  SHORE_Y,
  TAIL_RACE,
  TERRACE_Y,
  WHEEL_PIT,
  climbPath,
  inWaterWorks,
  landHeight,
  landNormalY,
  nearestOnPath,
  nearestOnPolyline,
  townRoad,
} from './terrain';
import {
  pointAtTime,
  sampleCurve,
  timeCurve,
  type CurvePoint,
  type TimedCurve,
} from './curveMath';

const WIDTH = 10;
const DROP = 5;
const GRAVITY = 9.81;
const START_X = CLIFF_X;
const TOP_Y = 6.2;
const FINISH_X = START_X + WIDTH;
const FINISH_Y = TOP_Y - DROP;
export const laneKinds = ['line', 'parabola', 'cycloid', 'custom'] as const;
export const laneNames = [
  'Straight',
  'Parabola',
  'Brachistochrone',
  'Your curve',
];
const laneZ = [-3.45, -1.15, 1.15, 3.45];

/** Level track either side of the timed section: a holding road on the launch
 *  deck, and a runout the carts coast along instead of stopping dead. */
const APPROACH = 1.5;
const HOLD_X = START_X - APPROACH;
const RUNOUT_X = FINISH_X + 3.5;

/**
 * Every lane drops the same height, so by conservation of energy every cart
 * reaches the bottom at the same speed and coasts exactly as far. Only the
 * time taken differs.
 */
const ARRIVAL_SPEED = Math.sqrt(2 * GRAVITY * DROP);
const COAST_DISTANCE = 2.9;
const COAST_DECEL = (ARRIVAL_SPEED * ARRIVAL_SPEED) / (2 * COAST_DISTANCE);
const COAST_TIME = ARRIVAL_SPEED / COAST_DECEL;
const REST_TIME = 2.8;
const RETURN_SPEED = 2.6;
const LAUNCH_ROLL = 1.15;

/**
 * The straight lane is the upper envelope of every descent, so a chord raised
 * above it clears all four tracks. One gantry hangs from that chord and each
 * lane differs only in how far its rails sag below it.
 */
const CHORD_LIFT = 1.15;
const chordY = (x: number) =>
  TOP_Y - ((x - START_X) / WIDTH) * DROP + CHORD_LIFT;
const FRAME_Z = 4.5;
const bentX = [-4.15, -1.55, 1.05, 3.65];
const CHORD_WEST = -6.9;
const CHORD_EAST = 5.6;

const DECK_Y = TOP_Y - 0.1;
const STAGE_Y = FINISH_Y - 0.09;
const ROOF_Y = 7.55;

// The frame is weathered and low in contrast; the tracks carry the warmth, so
// the eye lands on the three curves rather than on the scaffolding.
const timber = {
  post: '#9d927a',
  beam: '#a89c81',
  deck: '#c9b38f',
  rail: '#b0a385',
  brace: '#8e846d',
  dark: '#7a7864',
  plank: '#a3977c',
};
const stone = {
  pad: '#8c8970',
  coping: '#c2b48b',
  wall: '#918e76',
};
/** One tone per lane, warming across the rig, so the four read apart. The
 *  brachistochrone gets the brass so it stands out as the answer. */
const laneTimber = [
  { rail: '#bda876', shade: '#9a8556', tie: '#d9c89b' },
  { rail: '#c69a55', shade: '#a37a3c', tie: '#e0c58d' },
  { rail: '#d8a83f', shade: '#b3832a', tie: '#f0d68e' },
  { rail: '#cb8f45', shade: '#a97431', tie: '#e6c489' },
];

function worldPoint(point: CurvePoint, z: number): Point {
  return [START_X + point.x * WIDTH, TOP_Y - point.y * DROP, z];
}

/** Track height at a fraction of the run, for hangers and buffer stops. */
function heightAtRun(points: CurvePoint[], run: number) {
  for (let i = 1; i < points.length; i++)
    if (points[i].x >= run) {
      const a = points[i - 1];
      const b = points[i];
      const span = b.x - a.x;
      return a.y + (b.y - a.y) * (span > 1e-6 ? (run - a.x) / span : 0);
    }
  return points[points.length - 1].y;
}

type Station = { x: number; y: number };

/** Holding road, timed descent and runout as one continuous rail line. */
function lanePath(points: CurvePoint[]): Station[] {
  const path: Station[] = [{ x: HOLD_X, y: TOP_Y }];
  for (const point of points)
    path.push({ x: START_X + point.x * WIDTH, y: TOP_Y - point.y * DROP });
  path.push({ x: RUNOUT_X, y: FINISH_Y });
  return path;
}

function arcTable(path: Station[]) {
  const table = [0];
  for (let i = 1; i < path.length; i++)
    table.push(
      table[i - 1] +
        Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y),
    );
  return table;
}

/** Position a given distance along the rail line, for the winch-back haul. */
function stationAtArc(path: Station[], table: number[], arc: number): Station {
  const total = table[table.length - 1];
  const want = Math.max(0, Math.min(total, arc));
  let low = 0;
  let high = table.length - 1;
  while (low + 1 < high) {
    const mid = (low + high) >> 1;
    if (table[mid] <= want) low = mid;
    else high = mid;
  }
  const span = table[high] - table[low];
  const f = span > 1e-9 ? (want - table[low]) / span : 0;
  return {
    x: path[low].x + (path[high].x - path[low].x) * f,
    y: path[low].y + (path[high].y - path[low].y) * f,
  };
}

function Slab({ p, s, c, r }: { p: Point; s: Point; c: string; r?: Point }) {
  return (
    <mesh position={p} rotation={r} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.9} flatShading />
    </mesh>
  );
}

const UP = new THREE.Vector3(0, 1, 0);

/** R2 low-discrepancy sequence: scatters evenly without clumps or banding. */
function scatterPoint(
  i: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
) {
  return {
    x: minX + (((i + 1) * 0.7548776662) % 1) * (maxX - minX),
    z: minZ + (((i + 1) * 0.5698402909) % 1) * (maxZ - minZ),
  };
}

/** A squared timber running between two points, used for every frame member. */
function Beam({
  a,
  b,
  w,
  d,
  c,
}: {
  a: Point;
  b: Point;
  w: number;
  d?: number;
  c: string;
}) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const axis = vb.clone().sub(va);
  const length = axis.length() || 0.001;
  const rotation = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(
      UP,
      axis.clone().divideScalar(length),
    ),
  );
  return (
    <mesh
      position={va.clone().add(vb).multiplyScalar(0.5).toArray()}
      rotation={rotation.toArray().slice(0, 3) as Point}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[w, length, d ?? w]} />
      <meshStandardMaterial color={c} roughness={0.88} flatShading />
    </mesh>
  );
}

// ---------------------------------------------------------------- the island

const GRID = 0.25;
const ground = {
  silt: new THREE.Color('#3f564d'),
  sand: new THREE.Color('#8d8365'),
  grass: new THREE.Color('#84966d'),
  meadow: new THREE.Color('#7a8f61'),
  upland: new THREE.Color('#6b8153'),
  rock: new THREE.Color('#a1957b'),
  scree: new THREE.Color('#b2a88e'),
  paving: new THREE.Color('#a7a086'),
  tread: new THREE.Color('#a08a63'),
  shore: new THREE.Color('#6f6552'),
};

function surfaceColour(x: number, z: number, y: number) {
  const flat = landNormalY(x, z);
  const wobble =
    0.5 * Math.sin(x * 2.17 + z * 1.63) + 0.5 * Math.sin(x * 0.71 - z * 3.07);
  if (y < -0.2) return ground.silt.clone().offsetHSL(0, 0, wobble * 0.012);
  const colour =
    y < 0.22
      ? ground.sand
          .clone()
          .lerp(ground.grass, THREE.MathUtils.smoothstep(y, -0.2, 0.02))
      : y < 3.4
        ? ground.grass
            .clone()
            .lerp(ground.meadow, THREE.MathUtils.smoothstep(y, 0.22, 3.4))
        : ground.meadow
            .clone()
            .lerp(ground.upland, THREE.MathUtils.smoothstep(y, 3.4, 7.4));
  // Turf holds on the flanks; stone shows only on the quarried faces and crags.
  const bare = 1 - THREE.MathUtils.smoothstep(flat, 0.3, 0.62);
  colour.lerp(ground.rock, bare * 0.88);
  colour.lerp(ground.scree, THREE.MathUtils.smoothstep(y, 7.9, 8.7) * 0.45);
  // Quantised bedding keeps the worked face from reading as one blank slab.
  if (bare > 0.3) {
    const bed = Math.round(y * 1.7) / 1.7;
    colour.offsetHSL(
      0,
      0,
      (Math.sin(bed * 8.9) * 0.05 + Math.sin(bed * 21.3) * 0.018) * bare,
    );
  }
  if (x < CLIFF_X && y > TERRACE_Y - 0.06 && flat > 0.96)
    colour.lerp(ground.paving, 0.82);
  const climb = nearestOnPath(x, z).distance;
  const road = nearestOnPolyline(townRoad, x, z).distance;
  const worn =
    1 - THREE.MathUtils.smoothstep(Math.min(climb, road), 0.42, 0.98);
  colour.lerp(ground.tread, worn * 0.85);
  return colour.offsetHSL(0, 0, wobble * 0.016);
}

/**
 * Sample lines for one axis. A plain grid smears the quarry's sheer faces into
 * long ramps, so each cut is given a doubled line sampled either side of it:
 * the pair sits at the same place but at different heights, which renders the
 * face as a true vertical wall.
 */
function samplingAxis(min: number, max: number, cuts: number[]) {
  const lines: { at: number; sample: number }[] = [];
  for (let v = min; v <= max + 1e-6; v += GRID)
    if (!cuts.some((cut) => Math.abs(cut - v) < 1e-6))
      lines.push({ at: v, sample: v });
  for (const cut of cuts)
    lines.push({ at: cut, sample: cut - 1e-3 }, { at: cut, sample: cut + 1e-3 });
  return lines.sort((a, b) => a.at - b.at || a.sample - b.sample);
}

const CUT_X = [CLIFF_X, -3.4, WHEEL_PIT.minX, WHEEL_PIT.maxX];
const CUT_Z = [-5.2, 5.2, WHEEL_PIT.minZ, WHEEL_PIT.maxZ];

const Terrain = memo(function Terrain() {
  const geometry = useMemo(() => {
    const xs = samplingAxis(-LAND.halfWidth, LAND.halfWidth, CUT_X);
    const zs = samplingAxis(-LAND.halfDepth, LAND.halfDepth, CUT_Z);
    const cols = xs.length;
    const rows = zs.length;
    const position: number[] = [];
    const colour: number[] = [];
    const index: number[] = [];
    const push = (x: number, y: number, z: number, c: THREE.Color) => {
      position.push(x, y, z);
      colour.push(c.r, c.g, c.b);
      return position.length / 3 - 1;
    };
    const height: number[] = [];
    for (const z of zs)
      for (const x of xs) {
        const y = landHeight(x.sample, z.sample);
        height.push(y);
        push(x.at, y, z.at, surfaceColour(x.sample, z.sample, y));
      }
    for (let r = 0; r < rows - 1; r++)
      for (let c = 0; c < cols - 1; c++) {
        const a = r * cols + c;
        index.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
      }
    // A skirt closes the island sides down onto the plinth.
    const skirt = (
      ax: number,
      az: number,
      bx: number,
      bz: number,
      ah: number,
      bh: number,
    ) => {
      const topA = push(ax, ah, az, ground.shore);
      const topB = push(bx, bh, bz, ground.shore);
      const lowA = push(ax, SHORE_Y, az, ground.shore);
      const lowB = push(bx, SHORE_Y, bz, ground.shore);
      index.push(topA, lowA, topB, topB, lowA, lowB);
    };
    const at = (r: number, c: number) => height[r * cols + c];
    const xOf = (c: number) => xs[c].at;
    const zOf = (r: number) => zs[r].at;
    for (let c = 0; c < cols - 1; c++) {
      skirt(xOf(c), zOf(0), xOf(c + 1), zOf(0), at(0, c), at(0, c + 1));
      skirt(
        xOf(c),
        zOf(rows - 1),
        xOf(c + 1),
        zOf(rows - 1),
        at(rows - 1, c),
        at(rows - 1, c + 1),
      );
    }
    for (let r = 0; r < rows - 1; r++) {
      skirt(xOf(0), zOf(r), xOf(0), zOf(r + 1), at(r, 0), at(r + 1, 0));
      skirt(
        xOf(cols - 1),
        zOf(r),
        xOf(cols - 1),
        zOf(r + 1),
        at(r, cols - 1),
        at(r + 1, cols - 1),
      );
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colour, 3));
    g.setIndex(index);
    const faceted = g.toNonIndexed();
    faceted.computeVertexNormals();
    g.dispose();
    return faceted;
  }, []);
  return (
    <group name="island">
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          roughness={1}
          flatShading
          side={THREE.DoubleSide}
          shadowSide={THREE.FrontSide}
        />
      </mesh>
      <Slab
        p={[0, SHORE_Y - 0.58, 0]}
        s={[LAND.halfWidth * 2 + 0.3, 1.16, LAND.halfDepth * 2 + 0.3]}
        c="#416366"
      />
      <Slab
        p={[0, SHORE_Y - 1.19, 0]}
        s={[LAND.halfWidth * 2 + 0.2, 0.1, LAND.halfDepth * 2 + 0.2]}
        c="#26454c"
      />
    </group>
  );
});

const Canal = memo(function Canal() {
  const span = LAND.halfWidth - CANAL.minX + 1;
  const mid = (CANAL.minZ + CANAL.maxZ) / 2;
  return (
    <group name="canal">
      <WaterSurface
        width={span}
        depth={CANAL.maxZ - CANAL.minZ + 0.5}
        position={[CANAL.minX + span / 2 - 0.5, CANAL_WATER_Y, mid]}
      />
      <Ripples
        count={26}
        start={CANAL.minX - 0.4}
        span={span + 1}
        lanes={[mid - 0.55, mid + 0.5]}
        y={CANAL_WATER_Y + 0.05}
        speed={0.34}
      />
      <Slab
        p={[(CANAL.minX + LAND.halfWidth) / 2, 0.07, CANAL.minZ - 0.18]}
        s={[LAND.halfWidth - CANAL.minX, 0.22, 0.36]}
        c={stone.coping}
      />
      {/* The near coping is broken where the tail race comes in. */}
      {[
        [CANAL.minX, TAIL_RACE.minX - 0.22],
        [TAIL_RACE.maxX + 0.22, LAND.halfWidth],
      ].map(([a, b]) => (
        <Slab
          key={a}
          p={[(a + b) / 2, 0.07, CANAL.maxZ + 0.18]}
          s={[b - a, 0.22, 0.36]}
          c={stone.coping}
        />
      ))}
      <Slab
        p={[CANAL.minX - 0.2, -0.1, (CANAL.minZ + CANAL.maxZ) / 2]}
        s={[0.42, 1.5, CANAL.maxZ - CANAL.minZ + 0.8]}
        c={stone.wall}
      />
      {[-1.4, 1.6, 4.6, 7.6, 10.6, 13.6].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.3, CANAL.minZ - 0.55]} castShadow>
            <cylinderGeometry args={[0.13, 0.17, 0.46, 9]} />
            <meshStandardMaterial color="#4d3928" roughness={1} />
          </mesh>
          <mesh position={[x, 0.55, CANAL.minZ - 0.55]} castShadow>
            <sphereGeometry args={[0.14, 9, 7]} />
            <meshStandardMaterial color="#4d3928" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
});

/** A plank bridge takes the town lane over the canal to the valley floor. */
const CanalBridge = memo(function CanalBridge() {
  const x = 2.5;
  const length = CANAL.maxZ - CANAL.minZ + 2.4;
  const mid = (CANAL.minZ + CANAL.maxZ) / 2;
  return (
    <group name="canal-bridge" position={[x, 0, mid]}>
      <Slab p={[0, 0.3, 0]} s={[1.5, 0.14, length]} c={timber.deck} />
      {Array.from({ length: 11 }, (_, i) => (
        <Slab
          key={i}
          p={[0, 0.38, -length / 2 + 0.3 + (i * (length - 0.6)) / 10]}
          s={[1.46, 0.03, 0.07]}
          c={timber.plank}
        />
      ))}
      {[-0.72, 0.72].map((side) => (
        <group key={side}>
          <Slab p={[side, 0.62, 0]} s={[0.08, 0.08, length]} c={timber.rail} />
          {[-1, -0.34, 0.34, 1].map((t) => (
            <Slab
              key={t}
              p={[side, 0.44, (t * length) / 2.2]}
              s={[0.1, 0.5, 0.1]}
              c={timber.post}
            />
          ))}
        </group>
      ))}
      {[-1, 1].map((side) => (
        <Slab
          key={side}
          p={[0, 0.02, (side * length) / 2 - side * 0.34]}
          s={[1.6, 0.5, 0.7]}
          c={stone.wall}
        />
      ))}
    </group>
  );
});

const MooredBarge = memo(function MooredBarge({
  x,
  flip = false,
}: {
  x: number;
  flip?: boolean;
}) {
  const z = (CANAL.minZ + CANAL.maxZ) / 2 + (flip ? 0.5 : -0.5);
  return (
    <group
      position={[x, CANAL_WATER_Y - 0.04, z]}
      rotation={[0, flip ? Math.PI : 0, 0]}
    >
      <Slab p={[0, 0.1, 0]} s={[2.3, 0.24, 0.78]} c="#66503a" />
      {[-1, 1].map((side) => (
        <Slab
          key={side}
          p={[side * 1.28, 0.14, 0]}
          s={[0.36, 0.2, 0.5]}
          c="#66503a"
          r={[0, 0, side * 0.18]}
        />
      ))}
      <Slab p={[0, 0.23, 0]} s={[2.1, 0.04, 0.62]} c="#be9965" />
      {[-0.42, 0.34].map((cx, i) => (
        <Slab
          key={cx}
          p={[cx, 0.35, i ? 0.1 : -0.08]}
          s={[0.42, 0.26, 0.38]}
          c={i ? '#9a7850' : '#b59468'}
        />
      ))}
      <Slab p={[0.86, 0.32, 0]} s={[0.3, 0.14, 0.56]} c="#aa895c" />
    </group>
  );
});

// ------------------------------------------------------------------ the bluff

/** Handrail and edging stones make the switchbacks readable from the valley. */
const ClimbPath = memo(function ClimbPath() {
  const { rails, steps } = useMemo(() => {
    const rails: { a: Point; b: Point }[] = [];
    const steps: { p: Point; yaw: number; width: number }[] = [];
    let carry = 0;
    for (let i = 1; i < climbPath.length; i++) {
      const a = climbPath[i - 1];
      const b = climbPath[i];
      const run = Math.hypot(b.x - a.x, b.z - a.z);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      // Downhill side of the tread, where a rail would actually be built.
      const nx = (b.z - a.z) / run;
      const nz = -(b.x - a.x) / run;
      const outward =
        landHeight(a.x + nx, a.z + nz) < landHeight(a.x - nx, a.z - nz)
          ? 1
          : -1;
      const posts = Math.max(2, Math.round(run / 1.25));
      for (let p = 0; p <= posts; p++) {
        const t = p / posts;
        const x = a.x + (b.x - a.x) * t + nx * outward * 0.78;
        const z = a.z + (b.z - a.z) * t + nz * outward * 0.78;
        const y = a.y + (b.y - a.y) * t;
        if (p < posts) {
          const tn = (p + 1) / posts;
          rails.push({
            a: [x, y + 0.66, z],
            b: [
              a.x + (b.x - a.x) * tn + nx * outward * 0.78,
              a.y + (b.y - a.y) * tn + 0.66,
              a.z + (b.z - a.z) * tn + nz * outward * 0.78,
            ],
          });
        }
        rails.push({ a: [x, y - 0.25, z], b: [x, y + 0.72, z] });
      }
      // Cut steps only where the grade needs them; elsewhere the tread is earth.
      const grade = (b.y - a.y) / run;
      if (grade > 0.22) {
        const spacing = 0.46;
        for (carry = carry % spacing; carry < run; carry += spacing) {
          const t = carry / run;
          steps.push({
            p: [
              a.x + (b.x - a.x) * t,
              a.y + (b.y - a.y) * t - 0.04,
              a.z + (b.z - a.z) * t,
            ],
            yaw,
            width: 1.12,
          });
        }
      }
    }
    return { rails, steps };
  }, []);
  return (
    <group name="climb-path">
      {steps.map((step, i) => (
        <Slab
          key={i}
          p={step.p}
          s={[step.width, 0.07, 0.26]}
          c={i % 3 ? '#a89a72' : '#b3a57c'}
          r={[0, step.yaw, 0]}
        />
      ))}
      {rails.filter(rail => crossingHeight(rail.a[0], rail.a[2]) === undefined && crossingHeight(rail.b[0], rail.b[2]) === undefined).map((rail, i) => (
        <Beam key={i} a={rail.a} b={rail.b} w={0.06} c={timber.rail} />
      ))}
    </group>
  );
});

const laneClearance = (z: number) =>
  Math.min(...laneZ.map((lane) => Math.abs(z - lane)));

/** Rubble heaped along the foot of the worked face, clear of the lane notches. */
const talus = Array.from({ length: 34 }, (_, i) => {
  const z = -8.2 + ((i * 3.77) % 16.6);
  const room = laneClearance(z);
  if (room < 0.95) return null;
  if (inWaterWorks(CLIFF_X + 0.4, z)) return null;
  const tier = i % 3;
  const size = (0.3 + ((i * 5) % 6) * 0.08) * (tier === 2 ? 0.7 : 1);
  return {
    p: [
      CLIFF_X + 0.2 + tier * 0.42 + ((i * 7) % 3) * 0.1,
      0.1 + (tier === 2 ? 0.9 : 0) + ((i * 11) % 4) * 0.07,
      z,
    ] as Point,
    s: size,
  };
}).filter((rock): rock is { p: Point; s: number } => rock !== null);

/** Gorse clinging to the worked face and its lip. */
const scrub = Array.from({ length: 40 }, (_, i) => {
  const z = -8.8 + ((i * 2.71) % 17.8);
  const room = laneClearance(z);
  if (room < 0.72) return null;
  if (inWaterWorks(CLIFF_X, z)) return null;
  const lip = i % 5 === 0;
  return {
    p: [
      CLIFF_X + (lip ? -0.55 : 0.1 + ((i * 3) % 3) * 0.07),
      lip ? TERRACE_Y + 0.05 : 0.8 + ((i * 7.3) % 4.6),
      z,
    ] as Point,
    s: (0.24 + ((i * 5) % 5) * 0.055) * (room > 1.15 ? 1 : 0.7),
  };
}).filter((bush): bush is { p: Point; s: number } => bush !== null);

/** Gaps between the lane notches, where the face can be built against. */
const faceBays: [number, number][] = [
  [-8.8, -4.2],
  [-2.75, -0.65],
  [0.65, 2.75],
  [4.2, 7.2],
];

/**
 * Stone revetment and raking shores along the foot of the face. Both sit in
 * the bays between the lane notches, so no track can ever meet them.
 */
function FaceWorks() {
  return (
    <group name="face-works">
      {faceBays.map(([a, b]) => {
        const arches = Math.max(1, Math.round((b - a) / 1.5));
        const shores = Math.max(1, Math.floor((b - a) / 2.1));
        return (
          <group key={a}>
            <Slab
              p={[CLIFF_X + 0.16, 0.92, (a + b) / 2]}
              s={[0.3, 1.84, b - a]}
              c={stone.wall}
            />
            <Slab
              p={[CLIFF_X + 0.2, 1.92, (a + b) / 2]}
              s={[0.42, 0.16, b - a + 0.12]}
              c={stone.coping}
            />
            {/* Blind arches, recessed into the revetment. */}
            {Array.from({ length: arches }, (_, i) => {
              const z = a + ((i + 0.5) * (b - a)) / arches;
              return (
                <group key={i}>
                  <Slab
                    p={[CLIFF_X + 0.3, 0.62, z]}
                    s={[0.1, 1.04, 0.72]}
                    c="#7e7b66"
                  />
                  <mesh
                    position={[CLIFF_X + 0.3, 1.14, z]}
                    rotation={[0, Math.PI / 2, 0]}
                    castShadow
                  >
                    <cylinderGeometry
                      args={[0.36, 0.36, 0.1, 12, 1, false, 0, Math.PI]}
                    />
                    <meshStandardMaterial color="#7e7b66" roughness={0.95} />
                  </mesh>
                </group>
              );
            })}
            {/* Raking shores propped against the higher face. */}
            {Array.from({ length: shores }, (_, i) => {
              const z = a + ((i + 0.5) * (b - a)) / shores;
              return (
                <group key={`shore-${i}`}>
                  <Beam
                    a={[CLIFF_X + 1.5, 0.06, z]}
                    b={[CLIFF_X + 0.28, 3.5, z]}
                    w={0.13}
                    c={timber.post}
                  />
                  <Beam
                    a={[CLIFF_X + 1.15, 0.06, z + 0.3]}
                    b={[CLIFF_X + 0.28, 2.3, z + 0.3]}
                    w={0.1}
                    c={timber.brace}
                  />
                  <Slab
                    p={[CLIFF_X + 1.5, 0.1, z]}
                    s={[0.5, 0.2, 0.5]}
                    c={stone.pad}
                  />
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

function Scrub({ p, s }: { p: Point; s: number }) {
  const seed = p[1] * 3.1 + p[2] * 1.7;
  return (
    <group position={p}>
      {[0, 1, 2].map((lobe) => (
        <mesh
          key={lobe}
          position={[
            Math.sin(seed + lobe * 2.1) * s * 0.5,
            Math.cos(seed + lobe) * s * 0.34,
            Math.cos(seed + lobe * 1.7) * s * 0.7,
          ]}
          rotation={[seed + lobe, seed * 0.7, lobe]}
          castShadow
        >
          <icosahedronGeometry args={[s * (0.82 - lobe * 0.14), 0]} />
          <meshStandardMaterial
            color={['#4d6b45', '#57764b', '#456242'][lobe]}
            roughness={1}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

/** Cut stone and felled timber stacked on the northern quarry bench. */
function WorksYard() {
  const z = -6.4;
  const y = landHeight(-4.3, z);
  return (
    <group position={[-4.3, y, z]}>
      {[0, 1, 2].map((tier) =>
        Array.from({ length: 3 - tier }, (_, i) => (
          <mesh
            key={`${tier}-${i}`}
            position={[-0.3 + tier * 0.16 + i * 0.34, 0.17 + tier * 0.32, 0.1]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
            receiveShadow
          >
            <cylinderGeometry args={[0.16, 0.15, 1.7, 9]} />
            <meshStandardMaterial color="#8a7050" roughness={1} />
          </mesh>
        )),
      )}
      {[-0.95, 0.72].map((x, i) => (
        <mesh key={x} position={[x, 0.23, i ? 0.95 : -0.8]} castShadow>
          <cylinderGeometry args={[0.2, 0.24, 0.46, 11]} />
          <meshStandardMaterial color="#6f4528" roughness={1} />
        </mesh>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Slab
          key={i}
          p={[-1.5 + (i % 2) * 0.62, 0.14 + Math.floor(i / 2) * 0.26, 0.9]}
          s={[0.58, 0.26, 0.46]}
          c={i % 2 ? '#9a9683' : '#8c8970'}
          r={[0, i * 0.24, 0]}
        />
      ))}
    </group>
  );
}

const Bluff = memo(function Bluff() {
  const scatter = useMemo(() => {
    const pines: { p: Point; s: number }[] = [];
    const rocks: { p: Point; s: number }[] = [];
    for (let i = 0; i < 260; i++) {
      const { x, z } = scatterPoint(i, -15.4, -5.2, -11.2, 11.2);
      const y = landHeight(x, z);
      const flat = landNormalY(x, z);
      if (y < 0.3 || flat < 0.42) continue;
      // Keep the worked terrace and the walking path clear.
      if (y > TERRACE_Y - 0.2) continue;
      if (nearestOnPath(x, z).distance < 1.8) continue;
      if (inWaterWorks(x, z)) continue;
      if (pines.some((pine) => Math.hypot(pine.p[0] - x, pine.p[2] - z) < 0.95))
        continue;
      if (i % 4 === 0 && y > 4.4)
        rocks.push({ p: [x, y + 0.14, z], s: 0.28 + ((i * 5) % 7) * 0.06 });
      else pines.push({ p: [x, y - 0.05, z], s: 0.5 + ((i * 7) % 9) * 0.055 });
    }
    return { pines, rocks };
  }, []);
  return (
    <group name="bluff">
      {scatter.pines.map((pine, i) => (
        <Tree key={i} p={pine.p} scale={pine.s} pine={i % 4 !== 0} />
      ))}
      {scatter.rocks.map((rock, i) => (
        <Boulder key={i} p={rock.p} scale={[rock.s, rock.s * 0.72, rock.s]} />
      ))}
      {/* Talus fallen from the working face, so the cliff meets the floor. */}
      {talus.map((rock, i) => (
        <Boulder
          key={i}
          p={rock.p}
          scale={[rock.s, rock.s * 0.66, rock.s * 0.9]}
          color={i % 3 ? '#a3977d' : '#978b73'}
        />
      ))}
      {scrub.map((bush, i) => (
        <Scrub key={i} p={bush.p} s={bush.s} />
      ))}
      <FaceWorks />
      <WorksYard />
      <Boulder p={[-9.4, 1.1, 10.4]} scale={[0.62, 0.44, 0.6]} />
    </group>
  );
});

/** Meadow, spectator rail and hedgerow that fill the valley around the rig. */
const Meadow = memo(function Meadow() {
  const { trees, hedge } = useMemo(() => {
    const trees: { p: Point; s: number; pine: boolean }[] = [];
    for (let i = 0; i < 620 && trees.length < 26; i++) {
      const { x, z } = scatterPoint(i, -4.4, 15.6, -11.4, 11.3);
      const y = landHeight(x, z);
      if (y < -0.04 || y > 2.4) continue;
      // The lawn between the crowd rail and the lane stays open.
      if (z < 9.4 && z > -6.6 && x < 9.4) continue;
      if (z < CANAL.maxZ + 1 && z > CANAL.minZ - 3.4) continue;
      if (nearestOnPolyline(townRoad, x, z).distance < 1.5) continue;
      if (nearestOnPath(x, z).distance < 1.7) continue;
      if (inWaterWorks(x, z)) continue;
      if (trees.some((tree) => Math.hypot(tree.p[0] - x, tree.p[2] - z) < 2))
        continue;
      trees.push({
        p: [x, y, z],
        s: 0.56 + ((i * 11) % 11) * 0.062,
        pine: i % 4 === 0,
      });
    }
    // A hedgerow follows the valley lane round to the foot of the climb.
    const hedge: { p: Point; s: number; yaw: number }[] = [];
    for (let leg = 3; leg < townRoad.length; leg++) {
      const a = townRoad[leg - 1];
      const b = townRoad[leg];
      const run = Math.hypot(b.x - a.x, b.z - a.z);
      const yaw = Math.atan2(b.x - a.x, b.z - a.z);
      const nx = (b.z - a.z) / run;
      const nz = -(b.x - a.x) / run;
      for (let d = 0.5; d < run; d += 0.95) {
        const t = d / run;
        const x = a.x + (b.x - a.x) * t + nx * 1.25;
        const z = a.z + (b.z - a.z) * t + nz * 1.25;
        if (z < 9 && z > -5.6 && x < 9.8) continue;
        const y = landHeight(x, z);
        if (y < -0.04 || y > 1.4) continue;
        hedge.push({ p: [x, y, z], s: 0.46 + ((d * 7) % 3) * 0.06, yaw });
      }
    }
    return { trees, hedge };
  }, []);
  const fenceZ = 6.1;
  return (
    <group name="meadow">
      {trees.map((tree, i) => (
        <Tree key={i} p={tree.p} scale={tree.s} pine={tree.pine} />
      ))}
      {hedge.map((bush, i) => (
        <group key={i} position={bush.p} rotation={[0, bush.yaw, 0]}>
          <mesh position={[0, bush.s * 0.62, 0]} castShadow receiveShadow>
            <icosahedronGeometry args={[bush.s, 1]} />
            <meshStandardMaterial
              color={i % 3 ? '#57764b' : '#4f6d46'}
              roughness={1}
              flatShading
            />
          </mesh>
        </group>
      ))}
      {/* Crowd rail along the south side of the run. */}
      {Array.from({ length: 12 }, (_, i) => {
        const x = -1.4 + i * 0.98;
        return (
          <group key={i}>
            <Beam
              a={[x, 0, fenceZ]}
              b={[x, 0.82, fenceZ]}
              w={0.09}
              c={timber.post}
            />
            {i < 14 && (
              <>
                <Beam
                  a={[x, 0.74, fenceZ]}
                  b={[x + 0.98, 0.74, fenceZ]}
                  w={0.07}
                  c={timber.rail}
                />
                <Beam
                  a={[x, 0.42, fenceZ]}
                  b={[x + 0.98, 0.42, fenceZ]}
                  w={0.06}
                  c={timber.rail}
                />
              </>
            )}
          </group>
        );
      })}
      {/* Benches on the dry ground east of the tail race. */}
      {[3.6, 6.2, 8.8].map((x) => (
        <group key={x} position={[x, 0, fenceZ + 1.15]}>
          <Slab p={[0, 0.42, 0]} s={[1.7, 0.09, 0.44]} c={timber.plank} />
          <Slab p={[0, 0.66, -0.19]} s={[1.7, 0.42, 0.08]} c={timber.plank} />
          {[-0.72, 0.72].map((side) => (
            <Slab
              key={side}
              p={[side, 0.2, 0]}
              s={[0.1, 0.42, 0.42]}
              c={timber.post}
            />
          ))}
        </group>
      ))}
      <Boulder p={[10.9, 0.34, 8.4]} scale={[0.78, 0.5, 0.7]} />
      <Boulder p={[13.4, 0.3, 5.2]} scale={[0.6, 0.42, 0.58]} />
      <Boulder p={[12.2, 0.3, -6.6]} scale={[0.66, 0.44, 0.6]} />
    </group>
  );
});

// ----------------------------------------------------------------- the gantry

const LEDGERS = [1.7, 3.5, 5.3];

/**
 * Two side trusses and a ladder of cross beams at chord level. Everything
 * structural stays outboard of the lanes or above them, so all three tracks
 * are read against open air.
 */
const Gantry = memo(function Gantry() {
  return (
    <group name="gantry">
      {[-FRAME_Z, FRAME_Z].map((z) => (
        <Beam
          key={z}
          a={[CHORD_WEST, chordY(CHORD_WEST), z]}
          b={[CHORD_EAST, chordY(CHORD_EAST), z]}
          w={0.19}
          d={0.28}
          c={timber.beam}
        />
      ))}
      {bentX.map((x, bent) => {
        const top = chordY(x);
        const next = bentX[bent + 1];
        return (
          <group key={x}>
            <Beam
              a={[x, top, -FRAME_Z]}
              b={[x, top, FRAME_Z]}
              w={0.15}
              d={0.19}
              c={timber.beam}
            />
            {[-FRAME_Z, FRAME_Z].map((z) => (
              <group key={z}>
                <Beam
                  a={[x, 0.02, z]}
                  b={[x, top + 0.02, z]}
                  w={0.2}
                  c={timber.post}
                />
                <Slab p={[x, 0.09, z]} s={[0.5, 0.18, 0.5]} c={stone.pad} />
                {/* Knee braces, tucked under the chord out of the sightline. */}
                {[-1, 1].map((lean) => (
                  <Beam
                    key={lean}
                    a={[x + lean * 0.05, top - 0.95, z]}
                    b={[x + lean * 0.95, top - 0.1, z]}
                    w={0.1}
                    c={timber.brace}
                  />
                ))}
                {next !== undefined &&
                  (() => {
                    const limit = Math.min(top, chordY(next)) - 0.9;
                    const levels = LEDGERS.filter((y) => y < limit);
                    return (
                      <group>
                        {levels.map((y) => (
                          <Beam
                            key={y}
                            a={[x, y, z]}
                            b={[next, y, z]}
                            w={0.095}
                            d={0.085}
                            c={timber.brace}
                          />
                        ))}
                        {/* One long brace per bay keeps the bays legible. */}
                        <Beam
                          a={[x, 0.12, z]}
                          b={[next, levels.at(-1) ?? limit, z]}
                          w={0.07}
                          d={0.09}
                          c={timber.brace}
                        />
                      </group>
                    );
                  })()}
              </group>
            ))}
          </group>
        );
      })}
      {/* The east end of each chord is footed on the landing stage. */}
      {[-FRAME_Z, FRAME_Z].map((z) => (
        <Beam
          key={z}
          a={[CHORD_EAST - 0.1, STAGE_Y, z]}
          b={[CHORD_EAST - 0.1, chordY(CHORD_EAST - 0.1), z]}
          w={0.18}
          c={timber.post}
        />
      ))}
    </group>
  );
});

// ------------------------------------------------------------------ the tracks

function Track({
  curve,
  z,
  lane,
}: {
  curve: TimedCurve;
  z: number;
  lane: number;
}) {
  const tone = laneTimber[lane];
  // The rails run unbroken from the holding road, through the timed descent,
  // out along the runout, so a cart never meets a joint or a dead end.
  const line = useMemo(() => lanePath(curve.points), [curve]);
  const rails = useMemo(
    () =>
      [-0.33, 0.33].map((offset) => {
        const path = new THREE.CatmullRomCurve3(
          line.map(
            (station) =>
              new THREE.Vector3(station.x, station.y, z + offset),
          ),
        );
        return new THREE.TubeGeometry(path, 210, 0.115, 8, false);
      }),
    [line, z],
  );
  const ties = useMemo(
    () =>
      line
        .map((station, index) => ({ station, index }))
        .filter(({ index }) => index % 15 === 8)
        .map(({ station, index }) => {
          const next = line[Math.min(line.length - 1, index + 1)];
          return {
            p: [station.x, station.y - 0.14, z] as Point,
            angle: Math.atan2(next.y - station.y, next.x - station.x),
          };
        }),
    [line, z],
  );
  // Hangers to the shared chord: their length is the lane's whole story.
  const hangers = useMemo(() => {
    const stations = 12;
    return Array.from({ length: stations }, (_, i) => {
      const run = (i + 0.5) / stations;
      const x = START_X + run * WIDTH;
      const y = TOP_Y - heightAtRun(curve.points, run) * DROP;
      return { x, y, top: chordY(x) - 0.2 };
    }).filter((hanger) => hanger.top - hanger.y > 0.26);
  }, [curve]);
  return (
    <group>
      {rails.map((geometry, index) => (
        <mesh key={index} geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial
            color={index ? tone.shade : tone.rail}
            roughness={0.78}
          />
        </mesh>
      ))}
      {ties.map((tie, index) => (
        <Slab
          key={index}
          p={tie.p}
          s={[0.15, 0.075, 0.8]}
          c={tone.tie}
          r={[0, 0, -tie.angle]}
        />
      ))}
      {hangers.map((hanger, index) => (
        <Beam
          key={index}
          a={[hanger.x, hanger.y + 0.02, z]}
          b={[hanger.x, hanger.top, z]}
          w={0.07}
          c={timber.brace}
        />
      ))}
      {/* Longitudinal stringer the hangers are pinned to. */}
      <Beam
        a={[START_X - 0.6, chordY(START_X - 0.6) - 0.14, z]}
        b={[CHORD_EAST, chordY(CHORD_EAST) - 0.14, z]}
        w={0.12}
        d={0.15}
        c={timber.beam}
      />
      {/* Buffer stop and straw bale at the far end of the runout. */}
      <Slab
        p={[RUNOUT_X + 0.24, FINISH_Y + 0.2, z]}
        s={[0.22, 0.5, 0.9]}
        c={timber.dark}
      />
      <Slab
        p={[RUNOUT_X + 0.05, FINISH_Y + 0.19, z]}
        s={[0.36, 0.36, 0.74]}
        c="#c8b478"
      />
    </group>
  );
}

function StartGate({ z, open }: { z: number; open: boolean }) {
  const arm = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (arm.current)
      arm.current.rotation.x = THREE.MathUtils.damp(
        arm.current.rotation.x,
        open ? -1.32 : 0,
        9,
        delta,
      );
  });
  return (
    <group position={[START_X - 0.42, TOP_Y + 0.12, z]}>
      {[-0.58, 0.58].map((offset) => (
        <Slab
          key={offset}
          p={[0, 0.3, offset]}
          s={[0.14, 0.76, 0.14]}
          c={timber.post}
        />
      ))}
      <group ref={arm}>
        <Slab p={[0, 0.38, 0]} s={[0.13, 0.13, 1.28]} c="#d4a54e" />
      </group>
    </group>
  );
}

function laneTexture(label: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 180;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = '#f2d597';
    context.font = '700 64px Georgia, serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function LanePlaque({ z, label }: { z: number; label: string }) {
  const texture = useMemo(() => laneTexture(label), [label]);
  return (
    <group position={[START_X - 1.22, TOP_Y + 1.24, z]}>
      {[-0.62, 0.62].map((offset) => (
        <Beam
          key={offset}
          a={[0, 0.3, offset]}
          b={[0, 0.95, offset]}
          w={0.05}
          c={timber.rail}
        />
      ))}
      <Slab p={[0, 0, 0]} s={[0.1, 0.52, 1.86]} c="#2c4d50" />
      <mesh position={[0.055, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[1.7, 0.4]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * Stretches that survive between the lane notches. Driving these off laneZ
 * keeps the parapet and the cliff revetment correct however many lanes the
 * rig carries.
 */
function baysBetweenLanes(
  from: number,
  to: number,
  clearance: number,
): [number, number][] {
  const bays: [number, number][] = [];
  let cursor = from;
  for (const z of laneZ) {
    if (z - clearance > cursor + 0.25) bays.push([cursor, z - clearance]);
    cursor = Math.max(cursor, z + clearance);
  }
  if (to > cursor + 0.25) bays.push([cursor, to]);
  return bays;
}

/** The gate lever, thrown by hand: the whole rig starts from here. */
function GateLever({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const arm = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (arm.current)
      arm.current.rotation.z = THREE.MathUtils.damp(
        arm.current.rotation.z,
        open ? -0.92 : 0.6,
        9,
        delta,
      );
  });
  return (
    <group position={[-6.05, DECK_Y, -4.18]}>
      <Slab p={[0, 0.1, 0]} s={[0.66, 0.2, 0.5]} c={stone.pad} />
      <Slab p={[0, 0.34, -0.16]} s={[0.12, 0.68, 0.1]} c="#47463e" />
      <mesh position={[0, 0.5, -0.09]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.028, 6, 14, Math.PI]} />
        <meshStandardMaterial color="#57564c" roughness={0.6} metalness={0.3} />
      </mesh>
      <group ref={arm} position={[0, 0.5, 0]}>
        <Slab p={[0, 0.36, 0]} s={[0.075, 0.82, 0.075]} c="#c9a248" />
        <mesh position={[0, 0.8, 0]} castShadow>
          <sphereGeometry args={[0.1, 12, 9]} />
          <meshStandardMaterial
            color="#d8b455"
            roughness={0.35}
            metalness={0.45}
          />
        </mesh>
      </group>
      <mesh
        position={[0, 0.66, 0]}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        <boxGeometry args={[0.8, 1.5, 0.8]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  );
}

/** The shared launch house: one roof, one deck, four gates, one lever. */
const LaunchHouse = memo(function LaunchHouse({
  gateOpen,
  onToggleGate,
}: {
  gateOpen: boolean;
  onToggleGate: () => void;
}) {
  const west = -8.3;
  const postZ = [-4.2, -2.3, 0, 2.3, 4.2];
  return (
    <group name="launch-house">
      <Slab
        p={[(west + CLIFF_X) / 2, DECK_Y - 0.07, 0]}
        s={[CLIFF_X - west, 0.14, 9]}
        c={timber.deck}
      />
      {Array.from({ length: 17 }, (_, i) => (
        <Slab
          key={i}
          p={[(west + CLIFF_X) / 2, DECK_Y + 0.025, -4.3 + i * 0.54]}
          s={[CLIFF_X - west - 0.1, 0.03, 0.1]}
          c={timber.plank}
        />
      ))}
      {[west + 0.35, CLIFF_X - 0.35].map((x) =>
        postZ.map((z) => (
          <Beam
            key={`${x}-${z}`}
            a={[x, DECK_Y, z]}
            b={[x, ROOF_Y, z]}
            w={0.16}
            c={timber.post}
          />
        )),
      )}
      {/* Plate beams and one shed roof over all four gates and the queues. */}
      {[west + 0.35, CLIFF_X - 0.35].map((x) => (
        <Beam
          key={`plate-${x}`}
          a={[x, ROOF_Y, -4.3]}
          b={[x, ROOF_Y, 4.3]}
          w={0.15}
          d={0.19}
          c={timber.beam}
        />
      ))}
      <group position={[(west + CLIFF_X) / 2, ROOF_Y + 0.06, 0]}>
        <GableRoof width={3.32} depth={8.9} height={1.02} color="#a3543d" />
      </group>
      <Slab
        p={[(west + CLIFF_X) / 2, ROOF_Y + 1.11, 0]}
        s={[0.16, 0.1, 9.05]}
        c="#6e4835"
      />
      {/* Boarded west wall, left open where the path arrives. */}
      {[
        [-4.4, -1.65],
        [1.65, 4.4],
      ].map(([a, b]) => (
        <Slab
          key={a}
          p={[west + 0.3, DECK_Y + 1.3, (a + b) / 2]}
          s={[0.1, 2.6, b - a]}
          c={timber.plank}
        />
      ))}
      <Slab
        p={[west + 0.3, DECK_Y + 2.22, 0]}
        s={[0.1, 0.76, 3.3 - 0.02]}
        c={timber.plank}
      />
      {/* Cliff parapet, opened only where a track leaves. */}
      {baysBetweenLanes(-4.5, 4.5, 0.6).map(([a, b]) => (
        <Slab
          key={a}
          p={[CLIFF_X - 0.045, TERRACE_Y + 0.26, (a + b) / 2]}
          s={[0.36, 0.56, b - a]}
          c={stone.wall}
        />
      ))}
      {laneZ.map((z, lane) => (
        <LanePlaque key={z} z={z} label={laneNames[lane].toUpperCase()} />
      ))}
      <GateLever open={gateOpen} onToggle={onToggleGate} />
    </group>
  );
});

/** The shared landing stage every lane arrives on. */
const LandingStage = memo(function LandingStage() {
  // The brachistochrone dips below the finish height and climbs back, so the
  // deck starts east of that overshoot and runs the length of the runout.
  const west = FINISH_X - 0.4;
  const east = RUNOUT_X + 0.7;
  return (
    <group name="landing-stage">
      <Slab
        p={[(west + east) / 2, STAGE_Y - 0.08, 0]}
        s={[east - west, 0.16, 9]}
        c={timber.deck}
      />
      {Array.from({ length: 18 }, (_, i) => (
        <Slab
          key={i}
          p={[(west + east) / 2, STAGE_Y + 0.025, -4.3 + i * 0.507]}
          s={[east - west - 0.12, 0.03, 0.11]}
          c={timber.plank}
        />
      ))}
      {[0, 0.34, 0.67, 1].map((t) => west + 0.3 + (east - west - 0.6) * t).map((x) =>
        [-4.1, -1.75, 1.75, 4.1].map((z) => (
          <group key={`${x}-${z}`}>
            <Beam
              a={[x, 0.02, z]}
              b={[x, STAGE_Y - 0.08, z]}
              w={0.18}
              c={timber.post}
            />
            <Slab p={[x, 0.08, z]} s={[0.44, 0.16, 0.44]} c={stone.pad} />
          </group>
        )),
      )}
      {/* Railings, left open on the west where the tracks come in. */}
      {[-4.4, 4.4].map((z) => (
        <group key={z}>
          <Beam
            a={[west, STAGE_Y + 0.62, z]}
            b={[east, STAGE_Y + 0.62, z]}
            w={0.08}
            c={timber.rail}
          />
          {[0, 0.34, 0.68, 1].map((t) => (
            <Slab
              key={t}
              p={[west + (east - west) * t, STAGE_Y + 0.33, z]}
              s={[0.1, 0.66, 0.1]}
              c={timber.post}
            />
          ))}
        </group>
      ))}
      {[-2.6, 2.6].map((z) => (
        <Beam
          key={z}
          a={[east - 0.05, STAGE_Y + 0.62, z]}
          b={[east - 0.05, STAGE_Y + 0.62, z > 0 ? 4.4 : -4.4]}
          w={0.08}
          c={timber.rail}
        />
      ))}
      {/* Stair down to the valley lane. */}
      {Array.from({ length: 6 }, (_, i) => (
        <Slab
          key={i}
          p={[east + 0.22 + i * 0.36, STAGE_Y - 0.08 - i * 0.185, 0]}
          s={[0.42, 0.16, 1.7]}
          c={timber.plank}
        />
      ))}
      {/* Arrival bell and a bench for the crowd. */}
      <group position={[east - 0.95, STAGE_Y, 3.1]}>
        {[-0.34, 0.34].map((z) => (
          <Beam
            key={z}
            a={[0, 0, z]}
            b={[0, 1.32, z]}
            w={0.1}
            c={timber.post}
          />
        ))}
        <Beam a={[0, 1.32, -0.4]} b={[0, 1.32, 0.4]} w={0.09} c={timber.beam} />
        <mesh position={[0, 1.1, 0]} castShadow>
          <coneGeometry args={[0.2, 0.32, 10]} />
          <meshStandardMaterial
            color="#c3974c"
            roughness={0.5}
            metalness={0.3}
          />
        </mesh>
      </group>
      <group position={[east - 1.1, STAGE_Y, -3.1]}>
        <Slab p={[0, 0.3, 0]} s={[0.5, 0.08, 1.6]} c={timber.plank} />
        {[-0.66, 0.66].map((z) => (
          <Slab key={z} p={[0, 0.15, z]} s={[0.44, 0.3, 0.1]} c={timber.post} />
        ))}
      </group>
    </group>
  );
});

// -------------------------------------------------------------- the water lift

/**
 * The whole works run on one head of water, all of it on the near flank where
 * the viewer meets it first. The stream rises at the summit, comes down the
 * hill in two falls with plunge pools and a leat across the worked terrace
 * between them, and is tipped by a launder onto the wheel standing in the
 * quarried pit. The wheel drives a line shaft that winds the carts back up,
 * and its tail water runs north under all four tracks to the canal.
 */

/**
 * The wheel spends the whole head it is given: its foot just clears the pit
 * bed and its crown comes up near the top of the cut. That is why the pit is
 * quarried into the flank rather than dug in the valley floor, and why the
 * wheel can be this size without ever standing in front of a track.
 */
const WHEEL = { x: -4.9, y: 2.72, z: 8.38, r: 3.48, halfWidth: 0.48 };
const PIT_BED = CANAL_BED;
const PIT_WATER = CANAL_WATER_Y;
/** The two bents stand clear of the wheel's width, so their posts may cross
 *  its face without ever fouling it. */
const BENT_Z = [7.58, 9.18];
/** Posts of each bent, straddling the axle and footed on the pit bed. */
const PIT_POST_X = [-6.85, -2.95];
/** Gearing sits outboard of the near cheek, where the viewer can see it. */
const GEAR_Z = 9.88;
/**
 * The launder, cantilevered off the pit's north lip to tip the stream onto the
 * wheel just west of the crown, which is what makes it turn.
 */
const LAUNDER = {
  head: [-5.85, 6.14, 6.62] as Point,
  mouth: [-6.25, 6.06, 8.05] as Point,
};
/** Where the launder tips onto the rim, just west of the crown, on the
 *  near cheek so the pour is in front of the wheel rather than behind it. */
const FEED: Point = [
  LAUNDER.mouth[0],
  WHEEL.y + Math.sqrt((WHEEL.r - 0.06) ** 2 - (LAUNDER.mouth[0] - WHEEL.x) ** 2),
  8.45,
];
/**
 * The haulage. A line shaft under the launch house roof, chained to the wheel
 * and carrying one winding drum per lane; each rope runs east over a sheave on
 * the cliff parapet and down its own track to the cart. The wheel therefore
 * does visibly pull the carts back up.
 */
const DRIVE = { x: -6.88, y: 7.28, r: 0.12, south: GEAR_Z, north: -4.55 };
/** Pinion on the wheel cheek, and the sprocket it chains to on the line shaft.
 *  Both sit in the same plane, so the chain is a closed loop on the near face
 *  and never has to fly through the wheel or wander off in z. */
const AXLE_GEAR_R = 1.05;
const PINION = {
  x: WHEEL.x,
  y: WHEEL.y + AXLE_GEAR_R + 0.46,
  r: 0.46,
};
const SPROCKET = { x: DRIVE.x, y: DRIVE.y, r: 0.5 };
/** Wheel to pinion (external mesh), then open-belt to the shaft sprocket. */
const PINION_RATIO = AXLE_GEAR_R / PINION.r;
const SHAFT_RATIO = PINION_RATIO * (PINION.r / SPROCKET.r);
const SHAFT_MID = (DRIVE.south + DRIVE.north) / 2;
const SHAFT_LEN = DRIVE.south - DRIVE.north;
const SHEAVE = { x: CLIFF_X - 0.16, y: 6.78, r: 0.2 };
const water = {
  deep: '#147e99',
  bright: '#389fa8',
  foam: '#d8eef0',
};
/** Darker, wetter oak than the rig, so the wheel reads as its own object
 *  against the pale gantry standing behind it. */
const WHEEL_TIMBER = {
  shroud: '#7d6b4d',
  sole: '#6d5c41',
  spoke: '#8b7754',
  bucket: '#94805b',
};

type Station3 = [number, number, number];

/**
 * A stone-lined channel between two points in space, level or pitched: floor,
 * kerbs and a moving water surface. Where the ground falls away it is carried
 * on piers, each footed on whatever it finds beneath it; where the ground
 * comes up to meet it the piers are dropped and the channel beds into the
 * hillside. Piers are also dropped where the climbing path passes, leaving the
 * channel to span it. One component therefore serves both for the level leat
 * across the terrace and for the chutes down the flanks.
 */
function Leat({
  from,
  to,
  width = 1.05,
  foaming = false,
  piered = true,
  boarded = false,
}: {
  from: Station3;
  to: Station3;
  width?: number;
  foaming?: boolean;
  /** Off where the channel is carried on framing built for it instead. */
  piered?: boolean;
  /** Timber trough rather than stone channel, for the launder over the pit. */
  boarded?: boolean;
}) {
  const span: Station3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const plan = Math.hypot(span[0], span[2]);
  const length = Math.hypot(plan, span[1]);
  const piers = useMemo(() => {
    if (!piered) return [];
    const run: Station3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
    const count = Math.max(2, Math.round(Math.hypot(run[0], run[2]) / 0.85));
    const found: { p: Point; height: number }[] = [];
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const x = from[0] + run[0] * t;
      const z = from[2] + run[2] * t;
      const top = from[1] + run[1] * t - 0.2;
      const ground = landHeight(x, z);
      // Where the hillside comes up to meet the channel it beds into the
      // ground, so a pier there would only break the line of the bank.
      if (ground > top - 0.28) continue;
      if (nearestOnPath(x, z).distance < 1.05) continue;
      const base = ground - 0.14;
      found.push({ p: [x, (base + top) / 2, z], height: top - base });
    }
    return found;
  }, [from, to, piered]);
  const ripple = useRef<THREE.Mesh>(null);
  const spray = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ripple.current)
      (
        ripple.current.material as THREE.MeshStandardMaterial
      ).emissiveIntensity = 0.08;
    spray.current?.children.forEach((fleck, i) => {
      const phase = (clock.elapsedTime * 0.8 + i / 11) % 1;
      fleck.position.x = (phase - 0.5) * (length - 0.24);
      fleck.scale.setScalar(0.55 + Math.sin(phase * Math.PI) * 0.6);
    });
  });
  return (
    <group>
      {piers.map((pier, i) => (
        <Slab
          key={i}
          p={pier.p}
          s={[0.34, pier.height, width + 0.14]}
          c={stone.pad}
        />
      ))}
      <group
        position={from.map((v, i) => v + span[i] / 2) as Station3}
        rotation={[0, Math.atan2(-span[2], span[0]), Math.atan2(span[1], plan)]}
      >
        <Slab
          p={[0, -0.11, 0]}
          s={[length, 0.22, width + 0.3]}
          c={boarded ? timber.deck : stone.wall}
        />
        {[-1, 1].map((side) => (
          <Slab
            key={side}
            p={[0, 0.11, (side * (width + 0.16)) / 2]}
            s={[length, 0.22, 0.16]}
            c={boarded ? timber.plank : stone.coping}
          />
        ))}
        {/* A body of water, not a skin of it: the trough runs brim full, so
            the channel reads as carrying weight down the hill. */}
        <mesh ref={ripple} position={[0, 0.01, 0]} receiveShadow>
          <boxGeometry args={[length - 0.02, 0.22, width - 0.02]} />
          <meshStandardMaterial
            color={water.bright}
            emissive={water.deep}
            emissiveIntensity={0.14}
            roughness={0.28}
            metalness={0.1}
          />
        </mesh>
        {foaming ? (
          <group ref={spray} position={[0, 0.14, 0]}>
            {Array.from({ length: 11 }, (_, i) => (
              <mesh key={i} position={[0, 0, ((i % 5) - 2) * width * 0.2]}>
                <icosahedronGeometry args={[0.055 + (i % 3) * 0.02, 0]} />
                <meshStandardMaterial
                  color={water.foam}
                  roughness={0.95}
                  flatShading
                />
              </mesh>
            ))}
          </group>
        ) : null}
      </group>
    </group>
  );
}

/** A basin where the water gathers: the spring head, and each step pool. */
function Cistern({
  p,
  level,
  size = 1.2,
}: {
  p: [number, number];
  level: number;
  size?: number;
}) {
  const floor = Math.min(level - 0.4, landHeight(p[0], p[1]) - 0.24);
  const depth = size * 0.92;
  return (
    <group position={[p[0], 0, p[1]]}>
      <Slab
        p={[0, (floor + level - 0.16) / 2, 0]}
        s={[size, level - 0.16 - floor, depth]}
        c={stone.wall}
      />
      {[
        [size / 2 - 0.1, 0, 0.2, depth],
        [-(size / 2 - 0.1), 0, 0.2, depth],
        [-(size / 2 - 0.12), depth / 2 - 0.1, 0.24, 0.2],
        [size / 2 - 0.12, depth / 2 - 0.1, 0.24, 0.2],
        [0, -(depth / 2 - 0.1), size, 0.2],
      ].map(([dx, dz, sx, sz]) => (
        <Slab
          key={`${dx}-${dz}`}
          p={[dx, level + 0.2, dz]}
          s={[sx, 0.26, sz]}
          c={stone.coping}
        />
      ))}
      <mesh position={[0, level - 0.05, 0]} receiveShadow>
        <boxGeometry args={[size - 0.16, 0.18, depth - 0.16]} />
        <meshStandardMaterial
          color={water.bright}
          emissive={water.deep}
          emissiveIntensity={0.22}
          roughness={0.24}
        />
      </mesh>
    </group>
  );
}

/**
 * The stream, from the spring at the summit down to the head of the launder.
 * The steep upper flank is taken in two falls with a plunge pool between them,
 * which is where most of the water is seen; below them a leat crosses the
 * worked terrace, where the climbing path steps over it on flagstones.
 */
const SPRING: [number, number] = [-12.04, 2.02];
const SPRING_LEVEL = 8.34;
/**
 * The flank falls at a steady sixty degrees, so the water takes it as two
 * broad chutes running brim full rather than as free sheets, with a plunge
 * pool between them where it gathers and turns.
 */
const PLUNGE_POOL: [number, number] = [-11.91, 2.98];
const PLUNGE_LEVEL = 7.16;
const HEAD_POOL: [number, number] = [-11.62, 3.86];
const HEAD_LEVEL = 6.2;
const TERRACE_LEAT: [Station3, Station3] = [
  [-11.3, 6.14, 4.04],
  [-5.4, 6.14, 5.56],
];

/** Off the terrace and along the top of the bench to the launder head. */
const BENCH_LEAT: [Station3, Station3] = [
  [-5.4, 6.14, 5.6],
  LAUNDER.head as Station3,
];

function LeatBridge() {
  const { halfDeck, halfLength, deckY, footY, halfWidth } = CROSSING;
  const sections = [[-halfLength, footY, -halfDeck, deckY], [-halfDeck, deckY, halfDeck, deckY], [halfDeck, deckY, halfLength, footY]];
  return <group name="leat-footbridge" position={[CROSSING.x, 0, CROSSING.z]} rotation={[0, Math.atan2(-CROSSING.dz, CROSSING.dx), 0]}>
    {sections.map(([a, ay, b, by], index) => (
      <group key={index}>
        <Beam a={[a, ay - 0.065, 0]} b={[b, by - 0.065, 0]} w={0.13} d={halfWidth * 2} c={timber.deck} />
        {[-1, 1].map(side => <Beam key={side} a={[a, ay + 0.7, side * (halfWidth - 0.04)]} b={[b, by + 0.7, side * (halfWidth - 0.04)]} w={0.065} c={timber.rail} />)}
      </group>
    ))}
    {[-halfLength, -halfDeck, halfDeck, halfLength].flatMap(along => [-1, 1].map(side => {
      const y = Math.abs(along) === halfLength ? footY : deckY;
      return <Beam key={`${along}-${side}`} a={[along, y - 0.08, side * (halfWidth - 0.04)]} b={[along, y + 0.74, side * (halfWidth - 0.04)]} w={0.085} c={timber.post} />;
    }))}
  </group>;
}

function MountainStream() {
  return (
    <group name="mountain-stream">
      {/* The spring, welling out of the crest of the hill. */}
      <Cistern p={SPRING} level={SPRING_LEVEL} size={1.15} />
      <Boulder p={[-12.66, 8.3, 1.78]} scale={[0.54, 0.46, 0.62]} />
      <Boulder p={[-12.22, 8.38, 1.32]} scale={[0.42, 0.36, 0.46]} />
      {/* The descent off the summit, which is where the viewer reads the
          volume of the stream, so the channels are broad and run full. */}
      <Spillway from={[-12.04, 8.38, 2.4]} to={[-11.91, 7.2, 2.94]} width={0.87} />
      <Cistern p={PLUNGE_POOL} level={PLUNGE_LEVEL} size={1.48} />
      <Boulder p={[-12.7, 7.18, 2.94]} scale={[0.5, 0.4, 0.56]} />
      <Spillway from={[-11.91, 7.2, 3.49]} to={[-11.62, 6.24, 3.94]} width={0.98} />
      <Cistern p={HEAD_POOL} level={HEAD_LEVEL} size={1.75} />
      <Leat from={TERRACE_LEAT[0]} to={TERRACE_LEAT[1]} width={1.08} />
      <LeatBridge />
      <Leat from={BENCH_LEAT[0]} to={BENCH_LEAT[1]} width={1.02} />
    </group>
  );
}

/** The quarried pit the wheel stands in. */
function WheelPit() {
  const width = WHEEL_PIT.maxX - WHEEL_PIT.minX + 1.2;
  const depth = WHEEL_PIT.maxZ - WHEEL_PIT.minZ + 1.1;
  const midX = (WHEEL_PIT.minX + WHEEL_PIT.maxX) / 2;
  const midZ = (WHEEL_PIT.minZ + WHEEL_PIT.maxZ) / 2;
  return (
    <group name="wheel-pit">
      <WaterSurface
        width={width}
        depth={depth}
        position={[midX, PIT_WATER, midZ]}
        color="#2498a8"
      />
      <Ripples
        count={18}
        start={WHEEL_PIT.minX}
        span={width - 0.8}
        lanes={[midZ - 0.7, midZ, midZ + 0.65]}
        y={PIT_WATER + 0.05}
        speed={0.18}
        color="#8fd4d2"
      />
      {/* Coping along the valley lip, opened where the tail race leaves. */}
      {[
        [WHEEL_PIT.minZ - 0.12, WHEEL_PIT.maxX - WHEEL_PIT.minX],
        [WHEEL_PIT.maxZ + 0.12, WHEEL_PIT.maxX - WHEEL_PIT.minX],
      ].map(([z, span]) => (
        <Slab
          key={z}
          p={[midX, PIT_WATER + 0.22, z]}
          s={[span + 0.4, 0.2, 0.32]}
          c={stone.coping}
        />
      ))}
    </group>
  );
}

/**
 * An open channel from the pit, under the four tracks, into the canal. One
 * stream therefore drives the wheel and then becomes the river.
 */
function TailRace() {
  const midX = (TAIL_RACE.minX + TAIL_RACE.maxX) / 2;
  const midZ = (TAIL_RACE.minZ + TAIL_RACE.maxZ) / 2;
  const length = TAIL_RACE.maxZ - TAIL_RACE.minZ + 0.6;
  const width = TAIL_RACE.maxX - TAIL_RACE.minX + 0.35;
  const foam = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    foam.current?.children.forEach((blob, i) => {
      const t = clock.elapsedTime * 1.6 + i * 1.4;
      blob.position.y = CANAL_WATER_Y + 0.04 + Math.sin(t) * 0.04;
      blob.scale.setScalar(0.8 + Math.sin(t * 0.9 + i) * 0.18);
    });
  });
  return (
    <group name="tail-race">
      <WaterSurface
        width={width}
        depth={length}
        position={[midX, PIT_WATER, midZ]}
        color="#2498a8"
      />
      {[-1, 1].map((side) => (
        <Slab
          key={side}
          p={[midX + side * (width / 2 + 0.06), 0.12, midZ]}
          s={[0.22, 0.28, length]}
          c={stone.coping}
        />
      ))}
      {/* The mouth into the canal, with the water arriving as one body. */}
      <group position={[midX, 0, CANAL.maxZ + 0.06]}>
        <Slab p={[0, 0.16, 0]} s={[width + 0.7, 0.24, 0.48]} c={stone.coping} />
        <mesh
          position={[0, CANAL_WATER_Y + 0.08, 0.02]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.28, 0.28, 0.4, 12, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#2e3b3c" roughness={1} flatShading />
        </mesh>
        <group ref={foam}>
          {Array.from({ length: 5 }, (_, i) => (
            <mesh
              key={i}
              position={[(i % 3) * 0.22 - 0.22, 0, -0.35 - i * 0.2]}
              rotation={[i * 0.5, i * 0.8, 0]}
            >
              <icosahedronGeometry args={[0.13 + (i % 2) * 0.03, 1]} />
              <meshStandardMaterial
                color={i % 2 ? water.foam : '#b5d9ce'}
                roughness={1}
                flatShading
              />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

const X_AXIS = new THREE.Vector3(1, 0, 0);

function placeBetween(object: THREE.Object3D, a: Point, b: Point) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz) || 0.01;
  object.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  object.scale.set(len, 1, 1);
  object.quaternion.setFromUnitVectors(
    X_AXIS,
    new THREE.Vector3(dx / len, dy / len, dz / len),
  );
}

function stationsAlong(path: Point[]) {
  const table = [0];
  for (let i = 1; i < path.length; i++)
    table.push(
      table[i - 1] +
        Math.hypot(
          path[i][0] - path[i - 1][0],
          path[i][1] - path[i - 1][1],
          path[i][2] - path[i - 1][2],
        ),
    );
  return table;
}

function pointAlong(path: Point[], table: number[], arc: number): Point {
  const total = table[table.length - 1];
  const want = ((arc % total) + total) % total;
  let low = 0;
  let high = table.length - 1;
  while (low + 1 < high) {
    const mid = (low + high) >> 1;
    if (table[mid] <= want) low = mid;
    else high = mid;
  }
  const span = table[high] - table[low];
  const f = span > 1e-9 ? (want - table[low]) / span : 0;
  return [
    path[low][0] + (path[high][0] - path[low][0]) * f,
    path[low][1] + (path[high][1] - path[low][1]) * f,
    path[low][2] + (path[high][2] - path[low][2]) * f,
  ];
}

/**
 * Closed open-belt path around two sprockets in one plane. External tangents
 * plus the wrapping arcs, so the chain is a single directed loop and never
 * leaves z.
 */
function openBeltPath(
  ax: number,
  ay: number,
  ra: number,
  bx: number,
  by: number,
  rb: number,
  z: number,
): Point[] {
  const dx = bx - ax;
  const dy = by - ay;
  const d = Math.hypot(dx, dy);
  const base = Math.atan2(dy, dx);
  const spread = Math.acos(Math.max(-1, Math.min(1, (ra - rb) / d)));
  const u = base + spread;
  const v = base - spread;
  const points: Point[] = [];
  const arc = (
    cx: number,
    cy: number,
    r: number,
    from: number,
    to: number,
    dir: 1 | -1,
  ) => {
    let end = to;
    if (dir === 1 && end <= from) end += Math.PI * 2;
    if (dir === -1 && end >= from) end -= Math.PI * 2;
    const span = end - from;
    const n = Math.max(10, Math.round(Math.abs(span) * 9));
    for (let i = 0; i <= n; i++) {
      const t = from + (span * i) / n;
      points.push([cx + r * Math.cos(t), cy + r * Math.sin(t), z]);
    }
  };
  // Around the pinion, the long way (away from the other sprocket), then
  // the upper tangent, around the shaft sprocket, then the lower tangent.
  arc(ax, ay, ra, u, v, 1);
  arc(bx, by, rb, v, u, 1);
  points.push([...points[0]]);
  return points;
}

const CHAIN_PATH = openBeltPath(
  PINION.x,
  PINION.y,
  PINION.r,
  SPROCKET.x,
  SPROCKET.y,
  SPROCKET.r,
  GEAR_Z,
);
const LINK_LEN = 0.14;

function DriveChain({ turn }: { turn: MutableRefObject<number> }) {
  const links = useRef<THREE.Group>(null);
  const table = useMemo(() => stationsAlong(CHAIN_PATH), []);
  const total = table[table.length - 1];
  const count = Math.max(16, Math.round(total / LINK_LEN));
  const band = useMemo(
    () =>
      CHAIN_PATH.slice(1).map((b, i) => ({
        a: CHAIN_PATH[i],
        b,
      })),
    [],
  );
  useFrame(() => {
    const group = links.current;
    if (!group) return;
    group.children.forEach((link, i) => {
      // Negative: the path walks the pinion counter-clockwise, but an
      // external mesh turns the pinion the other way from the wheel.
      const arc = -turn.current * PINION_RATIO * PINION.r + i * (total / count);
      const here = pointAlong(CHAIN_PATH, table, arc);
      const ahead = pointAlong(CHAIN_PATH, table, arc + LINK_LEN * 0.72);
      placeBetween(link, here, ahead);
    });
  });
  return (
    <group>
      {band.map(({ a, b }, i) => (
        <Beam key={i} a={a} b={b} w={0.055} d={0.04} c="#6e6758" />
      ))}
      <group ref={links}>
        {Array.from({ length: count }, (_, i) => (
          <mesh key={i} castShadow>
            <boxGeometry args={[1, 0.085, 0.075]} />
            <meshStandardMaterial
              color={i % 2 ? "#8a8270" : "#746c5c"}
              roughness={0.55}
              metalness={0.45}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/** Short pour from the launder mouth onto the west rim. No plunge pool. */
function LaunderFeed() {
  return <Spillway from={[LAUNDER.mouth[0], LAUNDER.mouth[1] + 0.12, LAUNDER.mouth[2]]} to={FEED} width={0.72} foam={false} />;
}

/** The bucket wheel, its frame, the line shaft and the ropes that haul. */
function WaterLift() {
  const wheel = useRef<THREE.Group>(null);
  const fill = useRef<THREE.Group>(null);
  const axleGear = useRef<THREE.Group>(null);
  const spur = useRef<THREE.Group>(null);
  const shaft = useRef<THREE.Group>(null);
  const sheaves = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const turn = useRef(0);
  const buckets = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const angle = (i / 22) * Math.PI * 2;
        return { angle, x: Math.cos(angle), y: Math.sin(angle) };
      }),
    [],
  );
  useFrame(({ clock }) => {
    turn.current = clock.elapsedTime * 0.3;
    const at = turn.current;
    if (wheel.current) wheel.current.rotation.z = at;
    if (axleGear.current) axleGear.current.rotation.z = at;
    fill.current?.children.forEach((load, i) => {
      const angle = (buckets[i].angle + at) % (Math.PI * 2);
      load.visible = angle > 1.86 && angle < 4.05;
    });
    if (spur.current) spur.current.rotation.z = -at * PINION_RATIO;
    if (shaft.current) shaft.current.rotation.z = -at * SHAFT_RATIO;
    const sheaveSpin = -at * SHAFT_RATIO * (0.22 / SHEAVE.r);
    sheaves.current?.children.forEach((sheave) => {
      sheave.rotation.z = sheaveSpin;
    });
    tail.current?.children.forEach((blob, i) => {
      const t = clock.elapsedTime * 1.7 + i * 1.3;
      blob.position.y = PIT_WATER + 0.04 + Math.sin(t) * 0.05;
      blob.scale.setScalar(0.85 + Math.sin(t * 0.8 + i) * 0.15);
    });
  });
  return (
    <group name="water-lift">
      <Leat
        from={LAUNDER.head as Station3}
        to={LAUNDER.mouth as Station3}
        width={0.82}
        piered={false}
        boarded
      />
      <LaunderFeed />

      {BENT_Z.map((z) => (
        <group key={z}>
          {PIT_POST_X.map((x) => {
            const top = x === PIT_POST_X[0] ? 5.4 : WHEEL.y + 0.55;
            return (
              <group key={x}>
                <Slab
                  p={[x, PIT_BED + 0.1, z]}
                  s={[0.72, 0.48, 0.72]}
                  c={stone.wall}
                />
                <Beam
                  a={[x, PIT_BED + 0.22, z]}
                  b={[x, top, z]}
                  w={0.26}
                  c={timber.post}
                />
              </group>
            );
          })}
          <Beam
            a={[PIT_POST_X[0] - 0.16, PIT_BED + 0.3, z]}
            b={[PIT_POST_X[1] + 0.16, PIT_BED + 0.3, z]}
            w={0.22}
            c={timber.beam}
          />
          <Beam
            a={[PIT_POST_X[0] + 0.12, PIT_BED + 0.4, z]}
            b={[WHEEL.x - 0.3, WHEEL.y - 0.12, z]}
            w={0.2}
            c={timber.brace}
          />
          <Beam
            a={[PIT_POST_X[1] - 0.12, PIT_BED + 0.4, z]}
            b={[WHEEL.x + 0.3, WHEEL.y - 0.12, z]}
            w={0.2}
            c={timber.brace}
          />
          <Slab
            p={[WHEEL.x, WHEEL.y, z]}
            s={[0.7, 0.4, 0.38]}
            c={timber.dark}
          />
        </group>
      ))}
      {[
        [PIT_POST_X[0], 5.28, 0.2] as const,
        [PIT_POST_X[0], PIT_BED + 0.32, 0.18] as const,
        [PIT_POST_X[1], WHEEL.y + 0.48, 0.18] as const,
        [PIT_POST_X[1], PIT_BED + 0.32, 0.18] as const,
        [WHEEL.x, WHEEL.y, 0.16] as const,
      ].map(([x, y, w]) => (
        <Beam
          key={`${x}-${y}`}
          a={[x, y, BENT_Z[0]]}
          b={[x, y, BENT_Z[1]]}
          w={w}
          c={timber.beam}
        />
      ))}

      {/* The wheel: shrouds, sole boards, spokes and sixteen deep buckets. */}
      <group ref={wheel} position={[WHEEL.x, WHEEL.y, WHEEL.z]}>
        {[-WHEEL.halfWidth, WHEEL.halfWidth].map((z) => (
          <group key={z}>
            {/* Shroud plate. A ring rather than a disc: the silhouette stays
                continuous but the spokes and drum still read through it. */}
            <mesh position={[0, 0, z]} castShadow>
              <ringGeometry args={[WHEEL.r - 0.72, WHEEL.r, 36]} />
              <meshStandardMaterial
                color={WHEEL_TIMBER.shroud}
                roughness={0.9}
                side={THREE.DoubleSide}
                flatShading
              />
            </mesh>
            <mesh position={[0, 0, z]} castShadow>
              <torusGeometry args={[WHEEL.r - 0.03, 0.09, 6, 36]} />
              <meshStandardMaterial
                color="#5c5342"
                roughness={0.6}
                metalness={0.35}
              />
            </mesh>
          </group>
        ))}
        {/* Sole boards closing the drum the buckets stand on. */}
        <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow castShadow>
          <cylinderGeometry
            args={[
              WHEEL.r - 0.66,
              WHEEL.r - 0.66,
              WHEEL.halfWidth * 2 - 0.02,
              32,
              1,
              false,
            ]}
          />
          <meshStandardMaterial
            color={WHEEL_TIMBER.sole}
            roughness={0.94}
            flatShading
          />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => (
          <Slab
            key={i}
            p={[0, 0, 0]}
            s={[WHEEL.r * 2 - 0.16, 0.13, 0.11]}
            c={WHEEL_TIMBER.spoke}
            r={[0, 0, (i / 8) * Math.PI]}
          />
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.32, 0.32, 1.5, 12]} />
          <meshStandardMaterial color={timber.dark} roughness={0.85} flatShading />
        </mesh>
        {buckets.map(({ angle, x, y }, i) => (
          <group
            key={i}
            position={[x * (WHEEL.r - 0.3), y * (WHEEL.r - 0.3), 0]}
            rotation={[0, 0, angle]}
          >
            {/* Start board, radial and proud of the shroud so the bucket
                mouths scallop the rim, and the bucket board canted off it. */}
            <Slab
              p={[0.06, 0, 0]}
              s={[0.68, 0.09, WHEEL.halfWidth * 2 - 0.14]}
              c={WHEEL_TIMBER.bucket}
            />
            <Slab
              p={[0.18, 0.18, 0]}
              s={[0.34, 0.095, WHEEL.halfWidth * 2 - 0.14]}
              c={WHEEL_TIMBER.bucket}
              r={[0, 0, 1.02]}
            />
          </group>
        ))}
        {/* The loads the buckets carry, shown only between the flume and the
            pond. They ride with the wheel but are switched by world angle. */}
        <group ref={fill}>
          {buckets.map(({ angle, x, y }, i) => (
            <group
              key={i}
              position={[x * (WHEEL.r - 0.3), y * (WHEEL.r - 0.3), 0]}
              rotation={[0, 0, angle]}
            >
              <mesh position={[-0.02, 0.12, 0]}>
                <boxGeometry args={[0.44, 0.18, WHEEL.halfWidth * 2 - 0.2]} />
                <meshStandardMaterial
                  color={water.bright}
                  emissive={water.deep}
                  emissiveIntensity={0.24}
                  roughness={0.24}
                />
              </mesh>
            </group>
          ))}
        </group>
      </group>
      <mesh
        position={[WHEEL.x, WHEEL.y, WHEEL.z]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.16, 0.16, 3.4, 10]} />
        <meshStandardMaterial color={timber.dark} roughness={0.8} flatShading />
      </mesh>
      <Beam
        a={[WHEEL.x, WHEEL.y + 0.1, BENT_Z[1]]}
        b={[WHEEL.x, WHEEL.y + 0.1, GEAR_Z + 0.28]}
        w={0.16}
        c={timber.beam}
      />
      {/* Spacer so the train sits clearly outboard of the near cheek. */}
      <mesh
        position={[WHEEL.x, WHEEL.y, (BENT_Z[1] + GEAR_Z) / 2]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.22, 0.22, GEAR_Z - BENT_Z[1], 10]} />
        <meshStandardMaterial color="#5c5342" roughness={0.55} metalness={0.3} />
      </mesh>
      <group ref={axleGear} position={[WHEEL.x, WHEEL.y, GEAR_Z]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry
            args={[AXLE_GEAR_R - 0.08, AXLE_GEAR_R - 0.08, 0.28, 22]}
          />
          <meshStandardMaterial color="#c4a25e" roughness={0.55} metalness={0.35} />
        </mesh>
        {Array.from({ length: 18 }, (_, i) => (
          <Slab
            key={i}
            p={[
              Math.cos((i / 18) * Math.PI * 2) * AXLE_GEAR_R,
              Math.sin((i / 18) * Math.PI * 2) * AXLE_GEAR_R,
              0,
            ]}
            s={[0.28, 0.14, 0.24]}
            c="#a8874a"
            r={[0, 0, (i / 18) * Math.PI * 2]}
          />
        ))}
      </group>
      <group ref={spur} position={[PINION.x, PINION.y, GEAR_Z]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[PINION.r - 0.06, PINION.r - 0.06, 0.36, 14]} />
          <meshStandardMaterial color="#8d7a52" roughness={0.6} metalness={0.3} />
        </mesh>
        {Array.from({ length: 10 }, (_, i) => (
          <Slab
            key={i}
            p={[
              Math.cos((i / 10) * Math.PI * 2) * PINION.r,
              Math.sin((i / 10) * Math.PI * 2) * PINION.r,
              0,
            ]}
            s={[0.16, 0.1, 0.32]}
            c="#6a5a38"
            r={[0, 0, (i / 10) * Math.PI * 2]}
          />
        ))}
      </group>
      <DriveChain turn={turn} />

      {/* Hanger posts for the shaft run south of the launch house, out to
          the sprocket that sits in the same plane as the pinion. */}
      {[5.55, 7.45, 9.35].map((z) => {
        const base = Math.max(PIT_BED + 0.1, landHeight(DRIVE.x, z) - 0.08);
        return (
          <group key={z}>
            <Slab
              p={[DRIVE.x, base + 0.1, z]}
              s={[0.48, 0.26, 0.48]}
              c={stone.pad}
            />
            <Beam
              a={[DRIVE.x, base + 0.16, z]}
              b={[DRIVE.x, DRIVE.y + 0.02, z]}
              w={0.16}
              c={timber.post}
            />
            <Slab
              p={[DRIVE.x, DRIVE.y + 0.18, z]}
              s={[0.32, 0.12, 0.28]}
              c={timber.dark}
            />
          </group>
        );
      })}

      {/* Line shaft under the launch-house roof, one drum per lane. */}
      <group ref={shaft} position={[DRIVE.x, DRIVE.y, SHAFT_MID]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[DRIVE.r, DRIVE.r, SHAFT_LEN, 10]} />
          <meshStandardMaterial color="#5c5342" roughness={0.55} metalness={0.35} />
        </mesh>
        {laneZ.map((z) => (
          <group key={z} position={[0, 0, z - SHAFT_MID]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.22, 0.22, 0.36, 12]} />
              <meshStandardMaterial color="#8a7348" roughness={0.8} flatShading />
            </mesh>
          </group>
        ))}
        <group position={[0, 0, DRIVE.south - SHAFT_MID]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry
              args={[SPROCKET.r - 0.05, SPROCKET.r - 0.05, 0.18, 14]}
            />
            <meshStandardMaterial color="#7c6b4b" roughness={0.7} flatShading />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => (
            <Slab
              key={i}
              p={[
                Math.cos((i / 12) * Math.PI * 2) * SPROCKET.r,
                Math.sin((i / 12) * Math.PI * 2) * SPROCKET.r,
                0,
              ]}
              s={[0.11, 0.07, 0.16]}
              c="#5d5137"
              r={[0, 0, (i / 12) * Math.PI * 2]}
            />
          ))}
        </group>
      </group>
      {/* Hanger bearings from the roof plate down onto the shaft. */}
      {[-3.4, -1.15, 1.15, 3.4].map((z) => (
        <Beam
          key={z}
          a={[DRIVE.x, ROOF_Y - 0.08, z]}
          b={[DRIVE.x, DRIVE.y + 0.16, z]}
          w={0.08}
          c={timber.brace}
        />
      ))}
      {/* Sheaves on the cliff parapet, and the standing house-ropes from drum
          to sheave. The running rope from sheave to cart lives on each lane. */}
      <group ref={sheaves}>
        {laneZ.map((z) => (
          <group key={z} position={[SHEAVE.x, SHEAVE.y, z]}>
            <mesh castShadow>
              <torusGeometry args={[SHEAVE.r, 0.045, 6, 14]} />
              <meshStandardMaterial
                color="#6a5a3c"
                roughness={0.55}
                metalness={0.3}
              />
            </mesh>
          </group>
        ))}
      </group>
      {laneZ.map((z) => (
        <Beam
          key={z}
          a={[DRIVE.x + 0.18, DRIVE.y, z]}
          b={[SHEAVE.x - 0.04, SHEAVE.y, z]}
          w={0.035}
          c="#6b6046"
        />
      ))}

      <group ref={tail}>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh
            key={i}
            position={[
              WHEEL.x - 2.4 + i * 0.32,
              PIT_WATER,
              WHEEL.z - 0.42 + (i % 3) * 0.36,
            ]}
            rotation={[i * 0.5, i * 0.8, 0]}
          >
            <icosahedronGeometry args={[0.18 + (i % 3) * 0.04, 1]} />
            <meshStandardMaterial
              color={i % 2 ? water.foam : '#b5d9ce'}
              roughness={1}
              flatShading
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ------------------------------------------------------------------ the riders

/** Uphill end of the deck, so the haul rope meets the cart floor instead of
 *  running through the rider. */
const CART_HITCH = { x: -0.46, y: 0.35 };

function Cart() {
  return (
    <>
      <Slab p={[0, 0.35, 0]} s={[0.86, 0.1, 0.72]} c={timber.deck} />
      <Slab p={[-0.42, 0.46, 0]} s={[0.09, 0.28, 0.72]} c={timber.beam} />
      {[-0.37, 0.37].map((wz) => (
        <Slab
          key={wz}
          p={[0, 0.44, wz]}
          s={[0.84, 0.18, 0.07]}
          c={timber.beam}
        />
      ))}
      <mesh position={[CART_HITCH.x, CART_HITCH.y, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <torusGeometry args={[0.038, 0.011, 6, 10]} />
        <meshStandardMaterial color="#5a5040" roughness={0.5} metalness={0.35} />
      </mesh>
    </>
  );
}

const QUEUE_SPOTS = [-0.52, -0.88, -1.24];
const QUEUE_INTERVAL = 3.5;

/**
 * One lane, released once per press. A cart waits on the holding road until the
 * gate lifts, is timed down the curve, coasts out along the runout, sets its
 * rider down, and is then winched back up to collect the next one from the
 * queue. The next descent waits for a fresh release.
 */
type Leg = 'board' | 'approach' | 'hold' | 'run' | 'coast' | 'rest' | 'back';

/** The same passenger steps over the low side, crosses the landing and uses its stairs. */
function ArrivingPassenger({ lane, z, start, climb, onDone }: {
  lane: number; z: number; start: number; climb: boolean; onDone: () => void;
}) {
  const root = useRef<THREE.Group>(null);
  const motion = useRef(0);
  const finished = useRef(false);
  const route = useMemo(() => {
    const aisle = z + (lane % 2 ? -0.72 : 0.72);
    const east = RUNOUT_X + 0.7;
    const points: Point[] = [
      [FINISH_X + COAST_DISTANCE, STAGE_Y, aisle],
      [east - 0.25, STAGE_Y, aisle],
      [east - 0.25, STAGE_Y, 0],
      ...Array.from({ length: 6 }, (_, i): Point => [east + 0.22 + i * 0.36, STAGE_Y - i * 0.185, 0]),
      [east + 2.45, 0, 0.4],
      ...(climb ? [
        ...townRoad.slice(4).map(p => [p.x, p.y, p.z] as Point),
        ...climbPath.slice(1).map(p => [p.x, p.y, p.z] as Point),
      ] : [
        [12, 0, 0.4], [10.6, 0, -5], [5, 0, -5.4], [2.5, 0, -6.1],
        [2.5, 0.37, -8], [2.5, 0, -9.9], [1.1, 0, -11.1],
      ] as Point[]),
    ];
    return { points, table: stationsAlong(points) };
  }, [lane, z, climb]);
  useFrame(({ clock }, delta) => {
    if (!root.current || finished.current) return;
    const elapsed = clock.elapsedTime - start;
    motion.current = elapsed > 0.35 ? 1 : 0;
    if (elapsed < 2.4) {
      // Pause, turn towards the open side, then step down onto the platform.
      const u = THREE.MathUtils.clamp((elapsed - 0.4) / 2, 0, 1);
      const ease = u * u * (3 - 2 * u);
      root.current.position.set(FINISH_X + COAST_DISTANCE,
        FINISH_Y + 0.4 + (STAGE_Y - FINISH_Y - 0.4) * ease + Math.sin(Math.PI * u) * 0.42,
        z + (lane % 2 ? -0.72 : 0.72) * ease);
      root.current.rotation.y = THREE.MathUtils.lerp(Math.PI / 2, lane % 2 ? Math.PI : 0, Math.min(1, elapsed / 0.5));
      return;
    }
    const distance = (elapsed - 2.4) * 0.78;
    const total = route.table.at(-1)!;
    const at = pointAlong(route.points, route.table, Math.min(distance, total - 0.001));
    const ahead = pointAlong(route.points, route.table, Math.min(distance + 0.08, total - 0.0001));
    root.current.position.set(at[0], crossingHeight(at[0], at[2]) ?? at[1], at[2]);
    const target = Math.atan2(ahead[0] - at[0], ahead[2] - at[2]);
    const turn = Math.atan2(Math.sin(target - root.current.rotation.y), Math.cos(target - root.current.rotation.y));
    root.current.rotation.y += turn * Math.min(1, delta * 8);
    if (distance >= total) {
      finished.current = true;
      onDone();
    }
  });
  return <group ref={root} position={[FINISH_X + COAST_DISTANCE, FINISH_Y + 0.4, z]} scale={0.72}>
    <HumanCharacter variant={lane} motion={motion} />
  </group>;
}

function Lane({
  curve,
  z,
  lane,
  gateOpen,
  onTick,
  onFinish,
  onDepart,
  onReady,
}: {
  curve: TimedCurve;
  z: number;
  lane: number;
  gateOpen: boolean;
  onTick: (lane: number, time: number) => void;
  onFinish: (lane: number, time: number) => void;
  onDepart: (lane: number) => void;
  onReady: (lane: number) => void;
}) {
  const cart = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Group>(null);
  const rider = useRef<THREE.Group>(null);
  const [passengers, setPassengers] = useState<{ id: number; start: number }[]>([]);
  const passengerId = useRef(0);
  const queue = useRef<THREE.Group>(null);
  const rope = useRef<THREE.Mesh>(null);
  const leg = useRef<Leg>('board');
  const since = useRef(-1);
  // Far in the past, so the platform starts with a full queue.
  const boarded = useRef(-1e6);
  const ridden = useRef(false);

  const { line, table, total } = useMemo(() => {
    const line = lanePath(curve.points);
    const table = arcTable(line);
    return { line, table, total: table[table.length - 1] - (RUNOUT_X - FINISH_X - COAST_DISTANCE) };
  }, [curve]);

  useFrame(({ clock }) => {
    if (!cart.current) return;
    if (since.current < 0) since.current = clock.elapsedTime;
    let t = clock.elapsedTime - since.current;
    const advance = (next: Leg, duration = t) => {
      leg.current = next;
      since.current += duration;
      t -= duration;
    };

    // Consume boundary overshoot, including after a slow or resumed frame.
    for (let transition = 0; transition < 8; transition++) {
      const previous = leg.current;
      if (leg.current === 'hold' && gateOpen) {
        ridden.current = true;
        advance('run');
        onDepart(lane);
      } else if (leg.current === 'approach' && t >= LAUNCH_ROLL) {
        advance('hold', LAUNCH_ROLL);
        onReady(lane);
      } else if (leg.current === 'run' && t >= curve.duration) {
        onFinish(lane, curve.duration);
        advance('coast', curve.duration);
      } else if (leg.current === 'coast' && t >= COAST_TIME) {
        advance('rest', COAST_TIME);
        setPassengers(current => [...current, { id: passengerId.current++, start: since.current }]);
      } else if (leg.current === 'rest' && t >= REST_TIME) {
        advance('back', REST_TIME);
      } else if (leg.current === 'back' && t >= haulDuration(total, RETURN_SPEED)) {
        advance('board', haulDuration(total, RETURN_SPEED));
      } else if (leg.current === 'board' && t >= 1.2) {
        if (ridden.current) {
          const waiting = queueWaiting(
            clock.elapsedTime,
            boarded.current,
            QUEUE_SPOTS.length,
            QUEUE_INTERVAL,
          );
          boarded.current = afterQueueBoarding(
            clock.elapsedTime,
            waiting - 1,
            QUEUE_INTERVAL,
          );
        }
        advance('approach', 1.2);
      }
      if (leg.current === previous) break;
    }

    let x = HOLD_X;
    let y = TOP_Y;
    if (leg.current === 'hold') {
      x = START_X;
    } else if (leg.current === 'approach') {
      const u = Math.min(1, t / LAUNCH_ROLL);
      x = HOLD_X + APPROACH * u * u * (3 - 2 * u);
    } else if (leg.current === 'run') {
      const at = Math.min(curve.duration, t);
      const point = pointAtTime(curve, at);
      x = START_X + point.x * WIDTH;
      y = TOP_Y - point.y * DROP;
      onTick(lane, at);
    } else if (leg.current === 'coast' || leg.current === 'rest') {
      const at = leg.current === 'coast' ? t : COAST_TIME;
      x =
        FINISH_X +
        ARRIVAL_SPEED * at -
        0.5 * COAST_DECEL * at * at;
      y = FINISH_Y;
    } else if (leg.current === 'back') {
      const arc = Math.max(0, total - haulDistance(t, total, RETURN_SPEED));
      const here = stationAtArc(line, table, arc);
      x = here.x;
      y = here.y;
    }

    const pose = railCartPose(line, table, railArcAtX(line, table, x));
    x = pose.x;
    y = pose.y;
    cart.current.position.set(x, y, z);
    cart.current.rotation.z = pose.pitch;
    wheels.current?.children.forEach(wheel => { wheel.rotation.y = -x / 0.1; });

    const carrying = ['hold', 'approach', 'run', 'coast', 'board'].includes(leg.current) ||
      (leg.current === 'rest' && !passengers.some(p => p.start === since.current));
    if (rider.current) {
      rider.current.visible = carrying;
      const u = leg.current === 'board' ? Math.min(1, t / 1.2) : 1;
      rider.current.position.set(-0.65 * (1 - u), -0.1 + 0.5 * u, 0);
    }
    // Running rope from the cliff sheave down to the cart floor. It lengthens
    // on the way out and shortens as the line shaft winds the cart back up.
    if (rope.current) {
      placeBetween(
        rope.current,
        [SHEAVE.x, SHEAVE.y - 0.04, z],
        [x + CART_HITCH.x * Math.cos(pose.pitch) - CART_HITCH.y * Math.sin(pose.pitch),
          y + CART_HITCH.x * Math.sin(pose.pitch) + CART_HITCH.y * Math.cos(pose.pitch), z],
      );
    }
    // Riders pile up behind a held gate. A release leaves them standing; only
    // the next boarding takes one away, and a new arrival fills the gap later.
    if (queue.current) {
      const waiting = queueWaiting(
        clock.elapsedTime,
        boarded.current,
        QUEUE_SPOTS.length,
        QUEUE_INTERVAL,
      );
      queue.current.children.forEach((figure, index) => {
        figure.visible = index < waiting && !(leg.current === 'board' && index === 0);
      });
    }
  });

  return (
    <group>
      <group ref={cart}>
        <group ref={wheels}>
          {[-0.29, 0.29].map((wx) =>
            [-0.33, 0.33].map((wz) => (
              <mesh
                key={`${wx}-${wz}`}
                position={[wx, 0.19, wz]}
                rotation={[Math.PI / 2, 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.1, 0.1, 0.07, 12]} />
                <meshStandardMaterial color="#5d5343" roughness={0.7} />
              </mesh>
            )),
          )}
        </group>
        <Cart />
        <group
          ref={rider}
          position={[0, 0.4, 0]}
          scale={0.72}
          rotation={[0, Math.PI / 2, 0]}
        >
          <HumanCharacter variant={lane} />
        </group>
      </group>
      <mesh ref={rope}>
        <boxGeometry args={[1, 0.032, 0.032]} />
        <meshStandardMaterial color="#6b6046" roughness={1} />
      </mesh>
      {passengers.map(passenger => (
        <ArrivingPassenger key={passenger.id} lane={lane} z={z} start={passenger.start}
          climb={(passenger.id + lane) % 3 !== 1}
          onDone={() => setPassengers(current => current.filter(p => p.id !== passenger.id))} />
      ))}
      <group ref={queue}>
        {QUEUE_SPOTS.map((offset, index) => (
          <group
            key={offset}
            position={[HOLD_X + offset, TOP_Y - 0.1, z]}
            scale={0.72}
            rotation={[0, Math.PI / 2, 0]}
          >
            <HumanCharacter variant={index === 0 ? lane : lane + index + 2} />
          </group>
        ))}
      </group>
    </group>
  );
}

// -------------------------------------------------------------------- the town

const Town = memo(function Town() {
  const quayZ = CANAL.minZ - 1.5;
  const row = [
    { x: -1.2, s: 1.85, c: '#e4c69b' },
    { x: 1.1, s: 1.7, c: '#c5b49b' },
    { x: 4.4, s: 1.95, c: '#d3c9ad' },
    { x: 8.6, s: 1.75, c: '#baa188' },
    { x: 10.9, s: 1.9, c: '#e4c69b' },
    { x: 13.4, s: 1.72, c: '#c5b49b' },
  ];
  return (
    <group name="town">
      {row.map((house) => (
        <House
          key={house.x}
          p={[house.x, 0, quayZ - 0.7]}
          s={house.s}
          c={house.c}
        />
      ))}
      <Warehouse p={[6.5, 0, quayZ - 0.9]} colour="#b47b51" tall />
      <Warehouse p={[-3.5, 0, quayZ - 0.5]} colour="#8f4d36" />
      {[-2.4, 2.8, 9.7, 12.2].map((x) => (
        <Tree key={x} p={[x, 0, quayZ + 0.3]} scale={0.62} />
      ))}
      {[0.1, 5.6, 11.4].map((x) => (
        <StreetLamp key={x} p={[x, 0, CANAL.minZ - 0.95]} />
      ))}
      <MarketStall p={[4.8, 0, CANAL.maxZ + 1.2]} colour="#a14d36" />
      <MarketStall p={[7.1, 0, CANAL.maxZ + 1.7]} colour="#d2a74e" />
      <StreetLamp p={[6, 0, CANAL.maxZ + 0.9]} />
      <StreetLamp p={[11.4, 0, 1.4]} />
      <StreetLamp p={[3.6, 0, 9.4]} />
    </group>
  );
});

function Warehouse({
  p,
  colour,
  tall = false,
}: {
  p: Point;
  colour: string;
  tall?: boolean;
}) {
  const height = tall ? 3.8 : 3.2;
  return (
    <group position={p}>
      <Slab p={[0, height / 2, 0]} s={[2.2, height, 1.8]} c={colour} />
      {[0, 1, 2].map((step) => (
        <Slab
          key={step}
          p={[0, height + 0.2 + step * 0.34, 0]}
          s={[2.05 - step * 0.5, 0.34, 1.8]}
          c={colour}
        />
      ))}
      {[-0.56, 0.56].flatMap((x) =>
        [1, 2.1, 3].map((y) =>
          y < height ? (
            <group key={`${x}-${y}`}>
              <Slab p={[x, y, 0.92]} s={[0.36, 0.6, 0.05]} c="#47666c" />
              <Slab p={[x, y, 0.955]} s={[0.045, 0.62, 0.025]} c="#eee2c7" />
              <Slab p={[x, y, 0.955]} s={[0.38, 0.045, 0.025]} c="#eee2c7" />
            </group>
          ) : null,
        ),
      )}
      <Slab p={[0, 0.68, 0.93]} s={[0.5, 1.32, 0.08]} c="#5d655b" />
      <mesh position={[0, height + 1.38, 0.86]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.78, 8]} />
        <meshStandardMaterial color={timber.post} roughness={1} />
      </mesh>
      <mesh position={[0, height + 1.02, 1]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.032, 7, 13]} />
        <meshStandardMaterial color="#c3974c" roughness={0.8} />
      </mesh>
    </group>
  );
}

function StreetLamp({ p }: { p: Point }) {
  return (
    <group position={p}>
      <mesh position={[0, 1.12, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.07, 2.24, 8]} />
        <meshStandardMaterial color="#3c4a45" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.32, 0]} castShadow>
        <octahedronGeometry args={[0.2]} />
        <meshStandardMaterial
          color="#e8c473"
          emissive="#8f6426"
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}

function MarketStall({ p, colour }: { p: Point; colour: string }) {
  return (
    <group position={p}>
      {[-0.72, 0.72].flatMap((x) =>
        [-0.42, 0.42].map((z) => (
          <Slab
            key={`${x}-${z}`}
            p={[x, 0.8, z]}
            s={[0.09, 1.6, 0.09]}
            c={timber.post}
          />
        )),
      )}
      <Slab p={[0, 1.6, 0]} s={[1.8, 0.13, 1.2]} c={colour} r={[0, 0, -0.08]} />
      <Slab p={[0, 0.72, 0]} s={[1.5, 0.16, 0.78]} c={timber.plank} />
      {[-0.48, 0, 0.48].map((x) => (
        <mesh key={x} position={[x, 0.9, 0]} castShadow>
          <sphereGeometry args={[0.14, 10, 7]} />
          <meshStandardMaterial
            color={x ? '#b16436' : '#d4a54a'}
            roughness={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- the walkers

const asPoint = (p: { x: number; y: number; z: number }): Point => [
  p.x,
  p.y,
  p.z,
];

const routes: Point[][] = [
  [
    [-1.2, 0, CANAL.minZ - 0.95],
    [6, 0, CANAL.minZ - 0.95],
    [13, 0, CANAL.minZ - 0.95],
  ],
  [
    [12.4, 0, CANAL.minZ - 1.9],
    [5, 0, CANAL.minZ - 1.9],
    [0.4, 0, CANAL.minZ - 1.9],
  ],
  [
    [2.5, 0, CANAL.minZ - 1.5],
    [2.5, 0.37, (CANAL.minZ + CANAL.maxZ) / 2],
    [2.5, 0, CANAL.maxZ + 1.4],
    [4.6, 0, CANAL.maxZ + 2.4],
  ],
  townRoad.slice(2).map(asPoint),
  climbPath.map(asPoint),
  climbPath.map(asPoint),
  [
    [-6.2, TERRACE_Y, 2.5],
    [-7.2, TERRACE_Y, 3.5],
    [-6.4, TERRACE_Y, 4.1],
  ],
  [
    [-6.1, TERRACE_Y, -2.5],
    [-7.3, TERRACE_Y, -3.4],
  ],
  [
    [FINISH_X + 2.6, STAGE_Y, 2.5],
    [FINISH_X + 0.4, STAGE_Y, 2],
  ],
  [
    [FINISH_X + 0.6, STAGE_Y, -2.1],
    [FINISH_X + 2.9, STAGE_Y, -2.6],
  ],
  [
    [-0.6, 0, 9.6],
    [3.4, 0, 10.2],
    [8, 0, 9],
  ],
];

function Walker({ id }: { id: number }) {
  const root = useRef<THREE.Group>(null);
  const motion = useRef(0);
  const route = routes[id % routes.length];
  const phase = id * 11.3;
  const speed = id === 4 ? 0.62 : id === 5 ? 0.5 : 0.44 + (id % 4) * 0.07;
  useFrame(({ clock }) => {
    const pose = pedestrianPose(
      route,
      clock.elapsedTime + phase,
      speed,
      id > 3 && id < 6 ? 3.5 : 1.6 + (id % 3),
    );
    if (root.current) {
      root.current.position.set(pose.position[0], crossingHeight(pose.position[0], pose.position[2]) ?? pose.position[1], pose.position[2]);
      root.current.rotation.y = pose.yaw;
    }
    motion.current = pose.walking ? 1 : 0;
  });
  return (
    <group ref={root} scale={0.82 + (id % 3) * 0.05}>
      <HumanCharacter variant={id + 1} motion={motion} phase={phase} />
    </group>
  );
}

const Walkers = memo(function Walkers() {
  return (
    <group name="walkers">
      {routes.map((_, id) => (
        <Walker key={id} id={id} />
      ))}
    </group>
  );
});

// --------------------------------------------------------------- the visitor

function Explorer({
  input,
  paused,
}: {
  input: MutableRefObject<MovementInput>;
  paused: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const motion = useRef(0);
  const { camera, gl } = useThree();
  useFrame((_, delta) => {
    if (!ref.current) return;
    const object = ref.current;
    const value = paused ? { x: 0, z: 0, sprint: false } : input.current;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const side = new THREE.Vector3(-forward.z, 0, forward.x);
    const direction = side
      .multiplyScalar(value.x)
      .add(forward.multiplyScalar(-value.z));
    motion.current = direction.lengthSq() ? 1 : 0;
    if (motion.current) {
      const step = Math.min(delta, 0.035) * (value.sprint ? 5.5 : 3.5);
      direction.normalize().multiplyScalar(step);
      // Water and anything steeper than the switchbacks turn the visitor back.
      // Measured against the ground underfoot, not the damped camera-facing
      // height, which lags behind on a climb and would wall the path off.
      const here = (crossingHeight(object.position.x, object.position.z) ?? landHeight(object.position.x, object.position.z));
      const walkable = (x: number, z: number) => {
        if (Math.abs(x) > LAND.halfWidth - 0.8) return false;
        if (Math.abs(z) > LAND.halfDepth - 0.8) return false;
        const y = crossingHeight(x, z) ?? landHeight(x, z);
        return y > -0.2 && y - here < step * 1.8;
      };
      const nx = object.position.x + direction.x;
      const nz = object.position.z + direction.z;
      if (walkable(nx, nz)) {
        object.position.x = nx;
        object.position.z = nz;
      } else if (walkable(nx, object.position.z)) {
        object.position.x = nx;
      } else if (walkable(object.position.x, nz)) {
        object.position.z = nz;
      }
      object.rotation.y = Math.atan2(direction.x, direction.z);
    }
    object.position.y = crossingHeight(object.position.x, object.position.z) ?? THREE.MathUtils.damp(
      object.position.y,
      (crossingHeight(object.position.x, object.position.z) ?? landHeight(object.position.x, object.position.z)),
      22,
      delta,
    );
    gl.domElement.dataset.player = object.position
      .toArray()
      .map((component) => component.toFixed(2))
      .join(',');
  });
  return (
    <group ref={ref} position={[-0.4, 0, 10.6]}>
      <PlayerBeacon />
      <HumanCharacter variant={4} traveller motion={motion} />
    </group>
  );
}

// ------------------------------------------------------------------ the world

/**
 * In this projection a cloud at height h screens the ground roughly h units
 * west and 1.3h units north of itself, so clouds kept at z below about 1.5
 * read as sky above the horizon instead of blotting out the diorama.
 */
const sky = [
  { variant: 0 as const, position: [-7.6, 11.4, -1.2] as Point, scale: 1.5 },
  { variant: 1 as const, position: [3.4, 10.5, 0.9] as Point, scale: 1.35 },
  { variant: 0 as const, position: [13.2, 12.1, -2.4] as Point, scale: 1.1 },
];

export default function BrachistochroneWorld({
  anchors,
  gateOpen,
  input,
  paused,
  onToggleGate,
  onTick,
  onFinish,
  onDepart,
  onReady,
}: {
  anchors: CurvePoint[];
  gateOpen: boolean;
  input: MutableRefObject<MovementInput>;
  paused: boolean;
  onToggleGate: () => void;
  onTick: (lane: number, time: number) => void;
  onFinish: (lane: number, time: number) => void;
  onDepart: (lane: number) => void;
  onReady: (lane: number) => void;
}) {
  const curves = useMemo(
    () =>
      laneKinds.map((kind) =>
        timeCurve(
          sampleCurve(kind, anchors, 240, WIDTH / DROP),
          WIDTH,
          DROP,
        ),
      ),
    [anchors],
  );
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 2]}
      orthographic
      camera={{ position: [24, 23, 30], zoom: 22, near: 0.1, far: 190 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#17333d']} />
      <fog attach="fog" args={['#17333d', 62, 132]} />
      {/* Lifted fill: the worked face turns away from the sun, and without it
          the whole cliff and its revetment go to a flat silhouette. */}
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#d9e7ef', '#5b6446', 1.25]} />
      <directionalLight
        position={[-14, 24, 13]}
        intensity={2.9}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-normalBias={0.03}
        shadow-bias={-0.0001}
        shadow-radius={2}
      />
      <Suspense fallback={null}>
        <group position={[0, -0.6, 0]}>
          <Terrain />
          <Canal />
          <CanalBridge />
          <MooredBarge x={9.2} />
          <MooredBarge x={1.4} flip />
          <TailRace />
          <WheelPit />
          <MountainStream />
          <WaterLift />
          <Bluff />
          <ClimbPath />
          <Meadow />
          <Town />
          <Gantry />
          <LaunchHouse gateOpen={gateOpen} onToggleGate={onToggleGate} />
          <LandingStage />
          {curves.map((curve, lane) => (
            <group key={lane}>
              <Track curve={curve} z={laneZ[lane]} lane={lane} />
              <StartGate z={laneZ[lane]} open={gateOpen} />
              <Lane
                curve={curve}
                z={laneZ[lane]}
                lane={lane}
                gateOpen={gateOpen}
                onTick={onTick}
                onFinish={onFinish}
                onDepart={onDepart}
                onReady={onReady}
              />
            </group>
          ))}
          <Walkers />
          <Explorer input={input} paused={paused} />
          <Clouds placements={sky} />
          <Birds
            count={6}
            center={[-9.6, 0, 0.4]}
            radius={[5.2, 4.4]}
            spread={0.42}
            height={10.4}
            sway={0.8}
            speed={0.2}
          />
        </group>
      </Suspense>
      <SceneCamera
        resetKey={0}
        position={[24, 23, 30]}
        target={[-0.6, 2.6, 0]}
        desktopWidth={45}
      />
    </Canvas>
  );
}
