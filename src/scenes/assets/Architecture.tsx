import { useMemo } from 'react';
import * as THREE from 'three';
import type { Point } from '../../game/world';
function Timber({ p, s, c }: { p: Point; s: Point; c: string }) {
  return (
    <mesh position={p} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={0.95} />
    </mesh>
  );
}
export function GableRoof({
  width = 1.25,
  depth = 1.16,
  height = 0.55,
  color = '#994d36',
}: {
  width?: number;
  depth?: number;
  height?: number;
  color?: string;
}) {
  const geometry = useMemo(() => {
    const w = width / 2,
      d = depth / 2;
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [-w, 0, -d, w, 0, -d, 0, height, -d, -w, 0, d, w, 0, d, 0, height, d],
        3,
      ),
    );
    g.setIndex([
      0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 2, 5, 4, 2, 4, 1, 0, 1, 4, 0, 4, 3,
    ]);
    g.computeVertexNormals();
    return g;
  }, [width, depth, height]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.95} flatShading />
    </mesh>
  );
}
export function House({
  p,
  c = '#e5c89b',
  s = 1,
  rot = 0,
}: {
  p: Point;
  c?: string;
  s?: number;
  rot?: number;
}) {
  const variant = Math.abs(Math.round(p[0] * 9)) % 3;
  return (
    <group position={p} scale={s} rotation={[0, rot, 0]}>
      <Timber p={[0, 0.065, 0]} s={[1.1, 0.13, 1]} c="#8a8475" />
      <Timber p={[0, 0.66, 0]} s={[1, 1.2, 0.9]} c={c} />
      <group position={[0, 1.26, 0]}>
        <GableRoof color={['#a3543d', '#88513d', '#a46c46'][variant]} />
      </group>
      <Timber p={[0, 1.82, 0]} s={[0.075, 0.055, 1.22]} c="#6e4835" />
      {[-0.53, 0.53].map((x) => (
        <Timber key={x} p={[x, 1.25, 0]} s={[0.06, 0.09, 1.2]} c="#6d513a" />
      ))}
      <Timber p={[0.28, 1.7, -0.22]} s={[0.17, 0.62, 0.19]} c="#a77c5e" />
      <Timber p={[0.28, 2.02, -0.22]} s={[0.23, 0.07, 0.25]} c="#765d4a" />
      <Timber p={[0, 0.37, 0.46]} s={[0.23, 0.6, 0.045]} c="#5d655b" />
      <Timber p={[0, 0.06, 0.58]} s={[0.36, 0.1, 0.3]} c="#aaa58e" />
      {[-0.31, 0.31].map((x) => (
        <group key={x}>
          <Timber p={[x, 0.9, 0.464]} s={[0.21, 0.3, 0.035]} c="#47666c" />
          <Timber p={[x, 0.9, 0.49]} s={[0.025, 0.31, 0.025]} c="#eee2c7" />
          <Timber p={[x, 0.9, 0.49]} s={[0.22, 0.025, 0.025]} c="#eee2c7" />
          <Timber p={[x, 0.72, 0.49]} s={[0.29, 0.06, 0.1]} c="#b0a28c" />
          {[-1, 1].map((n) => (
            <Timber
              key={n}
              p={[x + n * 0.15, 0.9, 0.47]}
              s={[0.075, 0.32, 0.05]}
              c={variant === 0 ? '#5f7266' : '#8b7454'}
            />
          ))}
        </group>
      ))}
      {[-0.48, 0.48].map((x) => (
        <Timber
          key={x}
          p={[x, 0.7, 0.47]}
          s={[0.045, 1.08, 0.04]}
          c="#89755b"
        />
      ))}
      <Timber p={[0, 0.6, 0.47]} s={[1, 0.055, 0.035]} c="#887258" />
      {/* Rear and side windows keep the town readable from either riverbank. */}
      {[-0.28, 0.28].map((x) => (
        <group key={`rear-${x}`}>
          <Timber p={[x, 0.88, -0.464]} s={[0.22, 0.31, 0.035]} c="#47666c" />
          <Timber p={[x, 0.88, -0.49]} s={[0.025, 0.32, 0.025]} c="#eee2c7" />
          <Timber p={[x, 0.88, -0.49]} s={[0.23, 0.025, 0.025]} c="#eee2c7" />
          <Timber p={[x, 0.7, -0.49]} s={[0.29, 0.06, 0.1]} c="#b0a28c" />
        </group>
      ))}
      {[-0.51, 0.51].map((x) => (
        <group key={`side-${x}`}>
          <Timber p={[x, 0.88, 0]} s={[0.035, 0.31, 0.22]} c="#47666c" />
          <Timber
            p={[x * 1.025, 0.88, 0]}
            s={[0.025, 0.32, 0.025]}
            c="#eee2c7"
          />
          <Timber
            p={[x * 1.025, 0.88, 0]}
            s={[0.025, 0.025, 0.23]}
            c="#eee2c7"
          />
        </group>
      ))}
      {variant === 1 && (
        <Timber p={[0, 1.16, 0.47]} s={[1, 0.045, 0.04]} c="#89755b" />
      )}
    </group>
  );
}

export function Cathedral() {
  return (
    <group position={[-1.5, 0.62, -0.4]} rotation={[0, Math.PI, 0]}>
      <Timber p={[0, 0.9, 0]} s={[1.3, 1.8, 1.8]} c="#bf8962" />
      <group position={[0, 1.8, 0]}>
        <GableRoof width={1.58} depth={2.05} height={0.8} color="#526d66" />
      </group>
      <Timber p={[-0.6, 1.35, 0.9]} s={[0.63, 2.7, 0.65]} c="#c99b72" />
      <mesh position={[-0.6, 3.05, 0.9]} castShadow>
        <coneGeometry args={[0.48, 1.1, 4]} />
        <meshStandardMaterial color="#416d6a" roughness={0.95} flatShading />
      </mesh>
      <Timber p={[-0.6, 3.7, 0.9]} s={[0.035, 0.38, 0.035]} c="#dabc70" />
      <Timber p={[-0.6, 3.74, 0.9]} s={[0.2, 0.035, 0.035]} c="#dabc70" />
      <Timber p={[0, 0.38, 0.925]} s={[0.3, 0.76, 0.05]} c="#435759" />
      <Timber p={[0, 0.8, 0.95]} s={[0.4, 0.08, 0.09]} c="#d5b28b" />
      {[-0.66, 0.66].map((x) => (
        <group key={x}>
          {[-0.55, 0.05, 0.58].map((z) => (
            <Timber
              key={z}
              p={[x, 1.1, z]}
              s={[0.04, 0.65, 0.21]}
              c="#496269"
            />
          ))}
        </group>
      ))}
      {[-0.43, 0.43].map((x) => (
        <Timber key={x} p={[x, 1.1, 0.915]} s={[0.2, 0.7, 0.04]} c="#496269" />
      ))}
    </group>
  );
}
