import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Point } from '../../game/world';

/** A continuous, opaque cascade with a rounded lip and attached flowing ribbons. */
export function Spillway({ from, to, width = 1, foam = true }: { from: Point; to: Point; width?: number; foam?: boolean }) {
  const run = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const drop = from[1] - to[1];
  const ribbons = useRef<THREE.Group>(null);
  const surface = (t: number) => [run * t, -drop * t * t] as const;
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, 12, 32);
    const positions = g.attributes.position;
    const colors: number[] = [];
    for (let row = 0; row <= 32; row++) {
      const t = row / 32;
      for (let col = 0; col <= 12; col++) {
        const u = col / 12;
        positions.setXYZ(row * 13 + col, run * t, -drop * t * t, (u - 0.5) * width * (1 - 0.06 * t));
        const color = new THREE.Color(['#359ca7', '#48adb4', '#62bfc1', '#3ca5ae'][col % 4]);
        colors.push(color.r, color.g, color.b);
      }
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [run, drop, width]);
  useFrame(({ clock }) => {
    ribbons.current?.children.forEach((ribbon, i) => {
      const t = (clock.elapsedTime * 0.65 + i * 0.173) % 1;
      const [x, y] = surface(t);
      ribbon.position.set(x, y + 0.024, ((i % 5) / 4 - 0.5) * width * 0.82);
      ribbon.rotation.z = Math.atan2(-2 * drop * t, run);
      ribbon.scale.x = Math.sin(Math.PI * t) * 0.7 + 0.2;
    });
  });
  return (
    <group position={from} rotation={[0, Math.atan2(from[2] - to[2], to[0] - from[0]), 0]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.35} metalness={0.08} />
      </mesh>
      <group ref={ribbons}>
        {Array.from({ length: 10 }, (_, i) => (
          <mesh key={i}>
            <boxGeometry args={[0.17, 0.012, 0.018]} />
            <meshStandardMaterial color="#b8e1dc" roughness={0.6} />
          </mesh>
        ))}
      </group>
      {foam && Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[run + Math.sin(i * 2.4) * 0.05, -drop + 0.025, (i / 6 - 0.5) * width * 0.92]} scale={[1, 0.24, 0.72]}>
          <icosahedronGeometry args={[0.13 + (i % 3) * 0.02, 1]} />
          <meshStandardMaterial color={i % 2 ? '#b7dcd3' : '#d5e9df'} roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}
