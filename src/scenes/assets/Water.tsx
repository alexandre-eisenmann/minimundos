import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Point } from '../../game/world';

/** One displaced plane shared by every minimundo, so water reads alike everywhere. */
export function WaterSurface({
  width,
  depth,
  position,
  segments,
  color = '#328d96',
}: {
  width: number;
  depth: number;
  position: Point;
  segments?: [number, number];
  color?: string;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(
      width,
      depth,
      segments?.[0] ?? Math.round(width * 2),
      segments?.[1] ?? Math.round(depth * 2),
    );
    g.rotateX(-Math.PI / 2);
    return g;
  }, [width, depth, segments]);
  useFrame(({ clock }) => {
    const a = geometry.attributes.position;
    for (let i = 0; i < a.count; i++)
      a.setY(
        i,
        Math.sin(a.getX(i) * 1.8 - clock.elapsedTime * 1.4) * 0.025 +
          Math.cos(a.getZ(i) * 2.2 + clock.elapsedTime) * 0.02,
      );
    a.needsUpdate = true;
    geometry.computeVertexNormals();
  });
  return (
    <mesh geometry={geometry} position={position} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.15} />
    </mesh>
  );
}

/** Thin drifting highlights that give the current a direction. */
export function Ripples({
  count = 45,
  start = -11.2,
  span = 22.4,
  lanes = [2.7, -3.2],
  y = 0.2,
  speed = 0.48,
  color = '#92c8bd',
}: {
  count?: number;
  start?: number;
  span?: number;
  lanes?: number[];
  y?: number;
  speed?: number;
  color?: string;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    ref.current?.children.forEach((ripple, i) => {
      ripple.position.x = start + ((i * 3.17 + clock.elapsedTime * speed) % span);
    });
  });
  return (
    <group ref={ref}>
      {Array.from({ length: count }, (_, i) => (
        <mesh
          key={i}
          position={[
            start + ((i * 3.17) % span),
            y,
            lanes[i % lanes.length] + (i % 3) * 0.25,
          ]}
        >
          <boxGeometry
            args={[0.25 + (i % 4) * 0.15, 0.008, 0.025]}
          />
          <meshStandardMaterial color={color} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  );
}
