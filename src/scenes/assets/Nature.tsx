import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Point } from '../../game/world';

// One continuous crown: its silhouette varies, but adjoining faces stay joined.
export function Tree({
  p,
  scale = 1,
  pine = false,
  slender = false,
}: {
  p: Point;
  scale?: number;
  pine?: boolean;
  slender?: boolean;
}) {
  const seed = p[0] * 3.71 + p[2] * 8.23;
  const crown = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.82, 2);
    const a = g.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const x = a.getX(i),
        y = a.getY(i),
        z = a.getZ(i);
      const n =
        1 +
        0.085 * Math.sin(x * 5 + seed) * Math.cos(z * 4 - y * 3) +
        0.045 * Math.sin(y * 7 + z * 4);
      a.setXYZ(i, x * n, y * n * 1.09, z * n * 0.9);
    }
    g.computeVertexNormals();
    const colours = [];
    const base = new THREE.Color(
      ['#547747', '#638047', '#71894b'][Math.abs(Math.floor(seed)) % 3],
    );
    for (let i = 0; i < a.count; i += 3) {
      const y = (a.getY(i) + a.getY(i + 1) + a.getY(i + 2)) / 3;
      const c = base
        .clone()
        .offsetHSL(0, 0, y * 0.012 + Math.sin(i + seed) * 0.006);
      for (let j = 0; j < 3; j++) colours.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
    return g;
  }, [seed]);
  const foliage = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (foliage.current)
      foliage.current.rotation.z =
        Math.sin(clock.elapsedTime * 0.65 + seed) * 0.012;
  });
  return (
    <group position={p} scale={scale} rotation={[0, seed, 0]}>
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.07, 0.13, 1.24, 7]} />
        <meshStandardMaterial color="#68503a" roughness={1} />
      </mesh>
      <mesh position={[0.17, 0.95, 0]} rotation={[0, 0, -0.5]} castShadow>
        <cylinderGeometry args={[0.035, 0.065, 0.65, 6]} />
        <meshStandardMaterial color="#68503a" />
      </mesh>
      <group ref={foliage}>
        {pine ? (
          [0, 1, 2].map((i) => (
            <mesh
              key={i}
              position={[0, 1.05 + i * 0.44, 0]}
              rotation={[0, i * 0.45, 0]}
              castShadow
              receiveShadow
            >
              <coneGeometry args={[0.72 - i * 0.17, 1.35 - i * 0.14, 9]} />
              <meshStandardMaterial
                color={['#315c49', '#376b51', '#447953'][i]}
                roughness={1}
                flatShading
              />
            </mesh>
          ))
        ) : (
          <mesh
            geometry={crown}
            scale={slender ? [0.65, 1.45, 0.65] : 1}
            position={[0, slender ? 1.85 : 1.57, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial vertexColors roughness={1} flatShading />
          </mesh>
        )}
      </group>
    </group>
  );
}

/** Rounded boulder with a continuous silhouette, for scree and field edges. */
export function Boulder({
  p,
  scale = 1,
  color = '#87908b',
}: {
  p: Point;
  scale?: number | Point;
  color?: string;
}) {
  const seed = p[0] * 2.13 + p[2] * 5.77;
  return (
    <mesh
      position={p}
      scale={scale}
      rotation={[seed * 0.31, seed, seed * 0.17]}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={color} roughness={0.85} flatShading />
    </mesh>
  );
}

function Bird({
  i,
  center,
  radius,
  spread,
  height,
  sway,
  speed,
}: {
  i: number;
  center: Point;
  radius: [number, number];
  spread: number;
  height: number;
  sway: number;
  speed: number;
}) {
  const ref = useRef<THREE.Group>(null),
    l = useRef<THREE.Group>(null),
    r = useRef<THREE.Group>(null);
  const wing = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [0, 0, 0.06, 0.21, 0.025, 0.11, 0.46, -0.01, -0.045, 0, 0, -0.06],
        3,
      ),
    );
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    return g;
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + i * 1.7;
    if (ref.current) {
      ref.current.position.set(
        center[0] + Math.sin(t) * (radius[0] + i * spread),
        center[1] + height + Math.sin(t * 1.6) * sway,
        center[2] + Math.cos(t) * (radius[1] + i * spread),
      );
      ref.current.rotation.y = -t;
      ref.current.rotation.z = Math.sin(t) * 0.12;
    }
    if (l.current && r.current) {
      const flap = Math.sin(t * 19) * 0.38;
      l.current.rotation.z = flap;
      r.current.rotation.z = -flap;
    }
  });
  return (
    <group ref={ref}>
      <mesh scale={[0.065, 0.055, 0.19]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#deded0" />
      </mesh>
      <group ref={l}>
        <mesh geometry={wing}>
          <meshStandardMaterial color="#e5e6da" side={THREE.DoubleSide} />
        </mesh>
      </group>
      <group ref={r} scale={[-1, 1, 1]}>
        <mesh geometry={wing}>
          <meshStandardMaterial color="#e5e6da" side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.025, 0.09, 5]} />
        <meshStandardMaterial color="#bc9b53" />
      </mesh>
    </group>
  );
}

/** A flock on nested elliptical orbits; defaults match the Königsberg sky. */
export function Birds({
  count = 7,
  center = [0, 0, 0],
  radius = [6, 4],
  spread = 0.3,
  height = 4,
  sway = 0.6,
  speed = 0.25,
}: {
  count?: number;
  center?: Point;
  radius?: [number, number];
  spread?: number;
  height?: number;
  sway?: number;
  speed?: number;
}) {
  return (
    <group name="birds">
      {Array.from({ length: count }, (_, i) => (
        <Bird
          key={i}
          i={i}
          center={center}
          radius={radius}
          spread={spread}
          height={height}
          sway={sway}
          speed={speed}
        />
      ))}
    </group>
  );
}

// Rounded crest and connected curtain share a single surface; spray is secondary.
function Cascade({ centerZ, variant }: { centerZ: number; variant: number }) {
  const curtain = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, 32, 32);
    const a = g.attributes.position;
    const colors = [];
    for (let row = 0; row <= 32; row++)
      for (let col = 0; col <= 32; col++) {
        const i = row * 33 + col,
          u = col / 32,
          t = row / 32;
        const angle = (Math.min(t / 0.13, 1) * Math.PI) / 2;
        const x = -11.3 - 0.29 * Math.sin(angle) - Math.max(0, t - 0.13) * 0.11;
        const y =
          t < 0.13
            ? 0.16 - 0.29 * (1 - Math.cos(angle))
            : -0.13 - ((t - 0.13) / 0.87) * 2.42;
        const width = 2.6 * (1 - 0.045 * t);
        a.setXYZ(i, x, y, -3 + (u - 0.5) * width);
        const c = new THREE.Color(
          (col + variant) % 4 === 0
            ? '#59b7bd'
            : (col + variant) % 4 === 1
              ? '#369ba7'
              : '#29909d',
        );
        colors.push(c.r, c.g, c.b);
      }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [variant]);
  const spray = useRef<THREE.Group>(null),
    foam = useRef<THREE.Group>(null),
    glints = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (variant ? 1.07 : 1) + variant * 2.31;
    glints.current?.children.forEach((m, i) => {
      const phase = (t * (0.65 + (i % 3) * 0.08) + i * 0.237) % 1;
      m.position.y = -0.15 - phase * 2.35;
      m.position.x = -11.62 - phase * 0.12;
    });
    spray.current?.children.forEach((m, i) => {
      const phase = (t * 0.55 + i * 0.173) % 1;
      m.position.y = -0.55 - phase * phase * 2.15;
      m.position.x = -11.65 - phase * (0.16 + (i % 4) * 0.09);
      m.position.z =
        -4.17 + (i % 13) * 0.19 + Math.sin(i * 7 + variant) * phase * 0.1;
      m.scale.setScalar(0.4 + Math.sin(phase * Math.PI) * 0.6);
    });
    foam.current?.children.forEach((m, i) => {
      m.position.y = -2.59 + Math.sin(t * 1.8 + i * 1.9) * 0.035;
      m.scale.setScalar(0.95 + Math.sin(t * 1.4 + i) * 0.08);
    });
  });
  return (
    <group position={[0, 0, centerZ - 3]} rotation={[0, Math.PI, 0]}>
      <mesh geometry={curtain}>
        <meshStandardMaterial
          vertexColors
          roughness={0.32}
          metalness={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
      <group ref={glints}>
        {Array.from({ length: 13 }, (_, i) => (
          <mesh key={i} position={[-11.64, 0, -4.15 + i * 0.19]}>
            <boxGeometry
              args={[0.014, 0.55 + (i % 4) * 0.17, 0.021 + (i % 3) * 0.008]}
            />
            <meshBasicMaterial color="#a2d8d4" transparent opacity={0.45} />
          </mesh>
        ))}
      </group>
      <group ref={spray}>
        {Array.from({ length: 30 }, (_, i) => (
          <mesh key={i}>
            <icosahedronGeometry args={[0.035 + (i % 4) * 0.012, 0]} />
            <meshStandardMaterial
              color={i % 3 ? '#b6ded7' : '#e0eee3'}
              roughness={0.5}
            />
          </mesh>
        ))}
      </group>
      <group ref={foam}>
        {Array.from({ length: 9 }, (_, i) => (
          <group
            key={i}
            position={[
              -11.77 + Math.sin(i * 3 + variant * 2) * 0.15,
              -2.59,
              -4.15 + i * 0.28,
            ]}
          >
            <mesh
              scale={[1, 0.65, 0.88]}
              rotation={[i * 0.4 + variant, i * 0.7, 0]}
            >
              <icosahedronGeometry args={[0.24 + (i % 3) * 0.045, 1]} />
              <meshStandardMaterial
                color={i % 2 ? '#b5d9ce' : '#d4e7da'}
                roughness={1}
                flatShading
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

// Eastern land divides the river into two 2.6-unit-wide outlets.
export function Waterfalls() {
  return (
    <>
      <Cascade centerZ={-3} variant={0} />
      <Cascade centerZ={3} variant={1} />
    </>
  );
}

/**
 * A free-standing fall, placed anywhere. The lip curls over at the top and the
 * sheet, its glints, its spray and its plunge pool all read as one body of
 * water rather than a curtain with particles floating near it.
 */
export function Waterfall({
  p,
  height,
  width = 1.1,
  variant = 0,
}: {
  p: [number, number, number];
  height: number;
  width?: number;
  variant?: number;
}) {
  const ROWS = 26;
  const COLS = 14;
  const curtain = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, COLS, ROWS);
    const a = g.attributes.position;
    const colors: number[] = [];
    for (let row = 0; row <= ROWS; row++)
      for (let col = 0; col <= COLS; col++) {
        const index = row * (COLS + 1) + col;
        const u = col / COLS;
        const t = row / ROWS;
        const lip = Math.min(t / 0.15, 1) * (Math.PI / 2);
        const x =
          0.26 * Math.sin(lip) + Math.max(0, t - 0.15) * 0.13;
        const y =
          t < 0.15
            ? 0.14 - 0.26 * (1 - Math.cos(lip))
            : -0.11 - ((t - 0.15) / 0.85) * height;
        const spread = width * (1 - 0.06 * t);
        a.setXYZ(index, x, y, (u - 0.5) * spread);
        const shade = new THREE.Color(
          (col + variant) % 4 === 0
            ? '#59b7bd'
            : (col + variant) % 4 === 1
              ? '#369ba7'
              : '#29909d',
        );
        colors.push(shade.r, shade.g, shade.b);
      }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [height, width, variant]);
  const glints = useRef<THREE.Group>(null);
  const spray = useRef<THREE.Group>(null);
  const foam = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + variant * 1.7;
    glints.current?.children.forEach((mesh, i) => {
      const phase = (t * (0.7 + (i % 3) * 0.09) + i * 0.31) % 1;
      mesh.position.y = -0.14 - phase * height;
      mesh.position.x = 0.3 + phase * 0.12;
    });
    spray.current?.children.forEach((mesh, i) => {
      const phase = (t * 0.62 + i * 0.197) % 1;
      mesh.position.y = -height + 0.42 - phase * phase * 0.6;
      mesh.position.x = 0.36 + phase * (0.12 + (i % 3) * 0.08);
      mesh.position.z =
        (((i % 7) / 6 - 0.5) * width) + Math.sin(i * 5 + variant) * phase * 0.1;
      mesh.scale.setScalar(0.42 + Math.sin(phase * Math.PI) * 0.58);
    });
    foam.current?.children.forEach((mesh, i) => {
      mesh.position.y = -height + Math.sin(t * 1.9 + i * 1.7) * 0.03;
      mesh.scale.setScalar(0.94 + Math.sin(t * 1.5 + i) * 0.09);
    });
  });
  return (
    <group position={p}>
      <mesh geometry={curtain}>
        <meshStandardMaterial
          vertexColors
          roughness={0.32}
          metalness={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
      <group ref={glints}>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={[0.3, 0, ((i / 6 - 0.5) * width) * 0.86]}>
            <boxGeometry args={[0.016, 0.4 + (i % 3) * 0.15, 0.022]} />
            <meshBasicMaterial color="#a2d8d4" transparent opacity={0.42} />
          </mesh>
        ))}
      </group>
      <group ref={spray}>
        {Array.from({ length: 14 }, (_, i) => (
          <mesh key={i}>
            <icosahedronGeometry args={[0.032 + (i % 3) * 0.011, 0]} />
            <meshStandardMaterial
              color={i % 3 ? '#b6ded7' : '#e0eee3'}
              roughness={0.5}
            />
          </mesh>
        ))}
      </group>
      <group ref={foam}>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh
            key={i}
            position={[0.4 + Math.sin(i * 3 + variant) * 0.12, 0, ((i / 4 - 0.5) * width) * 0.9]}
            scale={[1, 0.62, 0.86]}
            rotation={[i * 0.4 + variant, i * 0.7, 0]}
          >
            <icosahedronGeometry args={[0.19 + (i % 3) * 0.04, 1]} />
            <meshStandardMaterial
              color={i % 2 ? '#b5d9ce' : '#d4e7da'}
              roughness={1}
              flatShading
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const cloudShapes = [
  {
    position: [-6.6, 5.5, -5] as Point,
    speed: 0.035,
    phase: 0.7,
    lobes: [
      [-0.57, 0, 0, 0.51, 0.8],
      [-0.17, 0.23, -0.02, 0.65, 1.05],
      [0.38, 0.09, 0.02, 0.62, 0.8],
      [0.78, -0.07, 0.08, 0.37, 0.7],
      [-0.1, -0.2, 0.2, 0.42, 0.55],
    ],
  },
  {
    position: [6.1, 6.7, 3] as Point,
    speed: 0.023,
    phase: 3.2,
    lobes: [
      [-0.92, -0.02, 0.12, 0.37, 0.55],
      [-0.45, 0.08, 0.04, 0.49, 0.7],
      [0.03, 0.36, -0.12, 0.69, 1.16],
      [0.48, 0.05, 0.08, 0.53, 0.77],
      [0.89, -0.03, 0.12, 0.4, 0.57],
      [0.2, -0.24, 0.23, 0.48, 0.48],
    ],
  },
];
export type CloudPlacement = {
  variant?: 0 | 1;
  position?: Point;
  scale?: number;
  drift?: number;
  rotation?: number;
};
function Cloud({ variant = 0, position, scale = 1, drift, rotation }: CloudPlacement) {
  const shape = cloudShapes[variant];
  const origin = position ?? shape.position;
  const travel = drift ?? 1.15;
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.x =
        origin[0] + Math.sin(clock.elapsedTime * shape.speed + shape.phase) * travel;
      ref.current.position.y =
        origin[1] + Math.sin(clock.elapsedTime * 0.09 + shape.phase) * 0.1;
    }
  });
  return (
    <group
      ref={ref}
      position={origin}
      scale={scale}
      rotation={[0, rotation ?? (variant ? -0.42 : 0.22), 0]}
    >
      {shape.lobes.map(([x, y, z, r, h], i) => (
        <mesh
          key={i}
          position={[x, y, z]}
          scale={[1, h, 0.75 + (i % 3) * 0.09]}
          rotation={[i * 0.31, i * 0.47, i * 0.16]}
        >
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color="#e2e8dd" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

const defaultSky: CloudPlacement[] = [{ variant: 0 }, { variant: 1 }];

export function Clouds({
  placements = defaultSky,
}: {
  placements?: CloudPlacement[];
}) {
  return (
    <group name="clouds">
      {placements.map((placement, i) => (
        <Cloud key={i} {...placement} />
      ))}
    </group>
  );
}
