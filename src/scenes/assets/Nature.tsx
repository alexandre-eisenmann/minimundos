import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Point } from '../../game/world';

// One continuous crown: its silhouette varies, but adjoining faces stay joined.
export function Tree({
  p,
  scale = 1,
  pine = false,
}: {
  p: Point;
  scale?: number;
  pine?: boolean;
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
            position={[0, 1.57, 0]}
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
function Cloud({ variant }: { variant: 0 | 1 }) {
  const shape = cloudShapes[variant],
    ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.x =
        shape.position[0] +
        Math.sin(clock.elapsedTime * shape.speed + shape.phase) * 1.15;
      ref.current.position.y =
        shape.position[1] +
        Math.sin(clock.elapsedTime * 0.09 + shape.phase) * 0.1;
    }
  });
  return (
    <group
      ref={ref}
      position={shape.position}
      rotation={[0, variant ? -0.42 : 0.22, 0]}
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
export function Clouds() {
  return (
    <>
      <Cloud variant={0} />
      <Cloud variant={1} />
    </>
  );
}
