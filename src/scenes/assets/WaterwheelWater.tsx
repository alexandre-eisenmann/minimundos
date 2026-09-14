import { useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { bucketWater, bucketSpill } from './waterwheelHydraulics';

/** Finite bucket volumes with gravity-level surfaces and attached ballistic outflow. */
export function WaterwheelWater({ center, radius, halfWidth, feedAngle, pondY, count = 22 }: {
  center: [number, number, number]; radius: number; halfWidth: number;
  feedAngle: number; pondY: number; count?: number;
}) {
  const meshes = useMemo(() => Array.from({ length: count }, () => {
    const make = () => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(768), 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setDrawRange(0, 0);
      return geometry;
    };
    return { water: make(), spill: make(), foam: make() };
  }), [count]);
  useEffect(() => () => meshes.forEach(m => { m.water.dispose(); m.spill.dispose(); m.foam.dispose(); }), [meshes]);
  useFrame(({ clock }) => {
    meshes.forEach(({ water, spill, foam }, i) => {
      const angle = i / count * Math.PI * 2 - clock.elapsedTime * 0.3;
      const c = Math.cos(angle), s = Math.sin(angle);
      const { polygon } = bucketWater(angle, feedAngle);
      const vertices: number[] = [];
      const at = (p: [number, number], z: number) => [(radius + p[0]) * c - p[1] * s, (radius + p[0]) * s + p[1] * c, z];
      const depth = halfWidth - 0.07;
      for (let j = 1; j < polygon.length - 1; j++) {
        vertices.push(...at(polygon[0], depth), ...at(polygon[j], depth), ...at(polygon[j + 1], depth));
        vertices.push(...at(polygon[0], -depth), ...at(polygon[j + 1], -depth), ...at(polygon[j], -depth));
      }
      polygon.forEach((a, j) => {
        const b = polygon[(j + 1) % polygon.length];
        vertices.push(...at(a, -depth), ...at(b, -depth), ...at(b, depth), ...at(a, -depth), ...at(b, depth), ...at(a, depth));
      });
      const position = water.getAttribute('position') as THREE.BufferAttribute;
      position.array.set(vertices); position.needsUpdate = true;
      water.setDrawRange(0, vertices.length / 3); water.computeVertexNormals();
      // A sheet is made of water released at successive earlier wheel poses.
      // Keep its falling tail alive even after the bucket has finished emptying.
      const falling: number[] = [];
      const pond = pondY - center[1];
      let previous = bucketSpill(angle, feedAngle, radius, 0);
      for (let j = 1; j <= 40; j++) {
        const age = j / 40 * 1.4;
        const next = bucketSpill(angle, feedAngle, radius, age);
        const edge = (p: typeof next, side: number, t: number) => [p.x, Math.max(pond, p.y), side * Math.min(depth * 2, Math.sqrt(p.flow) * 3.4) / 2 / Math.sqrt(1 + t * 2)];
        if ((previous.flow > 0.000001 || next.flow > 0.000001) && (previous.y > pond || next.y > pond)) {
          const t = age - 1.4 / 40;
          falling.push(...edge(previous, -1, t), ...edge(next, -1, age), ...edge(next, 1, age), ...edge(previous, -1, t), ...edge(next, 1, age), ...edge(previous, 1, t));
        }
        previous = next;
      }
      // Small patches of aeration sit on the actual free surface, never in mid-air.
      const froth: number[] = [];
      polygon.forEach((a, j) => {
        const b = polygon[(j + 1) % polygon.length];
        const left = at(a, 0), right = at(b, 0);
        if (Math.abs(left[1] - right[1]) > 0.00001 || Math.abs(left[0] - right[0]) < 0.08) return;
        const lo = Math.min(left[0], right[0]), span = Math.abs(left[0] - right[0]);
        for (let k = 0; k < 4; k++) {
          const x = lo + span * (0.22 + k % 2 * 0.5);
          const z = (k / 3 - 0.5) * depth * 1.4;
          const rx = Math.min(0.065, span * 0.13) * (0.85 + 0.15 * Math.sin(clock.elapsedTime * 2 + i + k));
          const rz = 0.034, y = left[1] + 0.006;
          froth.push(x - rx,y,z, x,y,z - rz, x + rx,y,z, x - rx,y,z, x + rx,y,z, x,y,z + rz);
        }
      });
      const bubbles = foam.getAttribute('position') as THREE.BufferAttribute;
      bubbles.array.set(froth); bubbles.needsUpdate = true;
      foam.setDrawRange(0, froth.length / 3); foam.computeVertexNormals();
      const out = spill.getAttribute('position') as THREE.BufferAttribute;
      out.array.set(falling); out.needsUpdate = true;
      spill.setDrawRange(0, falling.length / 3); spill.computeVertexNormals();
    });
  });
  return <group position={center} name="bucket-water">
    {meshes.map(({ water, spill, foam }, i) => <group key={i}>
      <mesh geometry={water} frustumCulled={false}>
        <meshStandardMaterial color="#399fac" roughness={0.3} metalness={0.06} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={foam} frustumCulled={false}>
        <meshStandardMaterial color="#b4ded7" roughness={0.55} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={spill} frustumCulled={false}>
        <meshStandardMaterial color="#62bfc1" roughness={0.32} side={THREE.DoubleSide} />
      </mesh>
    </group>)}
  </group>;
}
