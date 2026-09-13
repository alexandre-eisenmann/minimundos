import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Point } from '../../game/world';

/** A small summit resident, with a tapered brush and a quiet listening motion. */
export default function Fox({ p, rotation = 0, scale = 1, roam }: {
  p: Point; rotation?: number; scale?: number;
  roam?: { radiusX: number; radiusZ: number; heightAt: (x: number, z: number) => number };
}) {
  const root = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const head = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const brush = useMemo(() => {
    const shape = new THREE.LatheGeometry([
      new THREE.Vector2(0.04, 0), new THREE.Vector2(0.17, 0.2),
      new THREE.Vector2(0.23, 0.48), new THREE.Vector2(0.18, 0.75),
      new THREE.Vector2(0.10, 0.96), new THREE.Vector2(0, 1.14),
    ], 8);
    const positions = shape.attributes.position;
    const colors = [];
    for (let i = 0; i < positions.count; i++) {
      const c = new THREE.Color(positions.getY(i) > 0.76 ? '#eee0bd' : '#b95728');
      colors.push(c.r, c.g, c.b);
    }
    shape.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return shape;
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    let walking = 0;
    if (roam && root.current) {
      // Two unhurried half-loops, with a listening pause at either end.
      const phase = t % 32;
      const half = phase >= 16 ? 1 : 0;
      const u = Math.min(1, (phase - half * 16) / 12);
      const eased = u * u * (3 - 2 * u);
      const angle = (half + eased) * Math.PI;
      walking = 4 * u * (1 - u);
      const x = p[0] + Math.cos(angle) * roam.radiusX;
      const z = p[2] + Math.sin(angle) * roam.radiusZ;
      const yaw = Math.atan2(-Math.cos(angle) * roam.radiusZ, -Math.sin(angle) * roam.radiusX);
      const dx = Math.cos(yaw) * 0.35;
      const dz = -Math.sin(yaw) * 0.35;
      root.current.position.set(x, roam.heightAt(x, z) + Math.abs(Math.sin(t * 7)) * 0.018 * walking, z);
      root.current.rotation.set(0, yaw, Math.atan2(roam.heightAt(x + dx, z + dz) - roam.heightAt(x - dx, z - dz), 0.7));
    }
    legs.current.forEach((leg, i) => {
      if (leg) leg.rotation.z = Math.sin(t * 7 + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.38 * walking;
    });
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.65) * (walking ? 0.1 : 0.3);
      head.current.rotation.z = Math.sin(t * 0.9) * 0.07 * (1 - walking);
    }
    if (tail.current) tail.current.rotation.x = Math.sin(t * 0.7) * 0.08;
  });
  const fur = '#c56830';
  return (
    <group ref={root} name="summit-fox" position={p} rotation={[0, rotation, 0]} scale={scale}>
      {/* Four dark stockings beneath the long, compact body. */}
      {[-0.36, 0.35].flatMap((x, xi) => [-0.18, 0.18].map((z, zi) => (
        <group key={`${x}-${z}`} ref={el => { legs.current[xi * 2 + zi] = el; }} position={[x, 0.48, z]}>
          <mesh position={[0, -0.23, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.055, 0.5, 6]} />
            <meshStandardMaterial color="#493a2d" roughness={1} />
          </mesh>
        </group>
      )))}
      <mesh position={[0, 0.61, 0]} scale={[0.65, 0.3, 0.28]} castShadow>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={fur} roughness={1} flatShading />
      </mesh>
      <group ref={tail} position={[-0.5, 0.62, 0]}>
        <mesh geometry={brush} rotation={[0, 0, 1.98]} castShadow>
          <meshStandardMaterial vertexColors roughness={1} flatShading />
        </mesh>
      </group>
      <group ref={head} position={[0.46, 0.86, 0]}>
        <mesh scale={[0.29, 0.3, 0.25]} castShadow>
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={fur} roughness={1} flatShading />
        </mesh>
        <mesh position={[0.25, -0.09, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <coneGeometry args={[0.17, 0.43, 5]} />
          <meshStandardMaterial color="#eee0bd" roughness={1} />
        </mesh>
        <mesh position={[0.46, -0.09, 0]} scale={[0.06, 0.05, 0.06]}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#302a25" roughness={1} />
        </mesh>
        {[-1, 1].map(side => (
          <group key={side}>
            <mesh position={[-0.025, 0.29, side * 0.16]} scale={[0.65, 1, 0.75]} castShadow>
              <coneGeometry args={[0.14, 0.34, 3]} />
              <meshStandardMaterial color="#894423" roughness={1} />
            </mesh>
            <mesh position={[0.18, 0.055, side * 0.185]}>
              <sphereGeometry args={[0.028, 6, 4]} />
              <meshStandardMaterial color="#292722" roughness={0.7} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
