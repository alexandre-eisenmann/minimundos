import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { bucketWater, type SectionPoint } from './waterwheelHydraulics';

/** The inlet sheet ends at its first contact with a bucket board or water surface. */
export function WaterwheelFeed({ from, center, radius, feedAngle, width = 0.72, count = 22 }: {
  from: [number, number, number]; center: [number, number, number];
  radius: number; feedAngle: number; width?: number; count?: number;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1, 24, 20);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(({ clock }) => {
    const edges: [SectionPoint, SectionPoint][] = [];
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2 - clock.elapsedTime * 0.3;
      const c = Math.cos(angle), s = Math.sin(angle);
      const world = (p: SectionPoint): SectionPoint => [center[0] + (radius + p[0]) * c - p[1] * s, center[1] + (radius + p[0]) * s + p[1] * c];
      edges.push([world([-0.28, 0.045]), world([0.4, 0.045])], [world([0.09, 0.035]), world([0.269, 0.325])]);
      const polygon = bucketWater(angle, feedAngle).polygon;
      polygon.forEach((a, j) => edges.push([world(a), world(polygon[(j + 1) % polygon.length])]));
    }
    const position = geometry.attributes.position, colors = geometry.attributes.color;
    for (let col = 0; col <= 24; col++) {
      const x = from[0] + (col / 24 - 0.5) * width;
      const drum = center[1] + Math.sqrt(Math.max(0, (radius - 0.36) ** 2 - (x - center[0]) ** 2));
      let contact = drum;
      for (const [a, b] of edges) {
        if (Math.abs(b[0] - a[0]) < 1e-7) continue;
        const u = (x - a[0]) / (b[0] - a[0]);
        const y = a[1] + u * (b[1] - a[1]);
        if (u >= 0 && u <= 1 && y < from[1] - 0.12) contact = Math.max(contact, y);
      }
      const drop = from[1] - drum;
      const end = Math.sqrt(Math.max(0, (from[1] - contact) / drop));
      for (let row = 0; row <= 20; row++) {
        const t = row / 20 * end, index = row * 25 + col;
        position.setXYZ(index, x, from[1] - drop * t * t, from[2] + (center[2] - from[2]) * t);
        const sheen = 0.025 * Math.sin(col * 1.8) + 0.035 * Math.sin(t * 24 - clock.elapsedTime * 5);
        const color = new THREE.Color('#55b4bd');
        color.offsetHSL(0, 0, sheen);
        colors.setXYZ(index, color.r, color.g, color.b);
      }
    }
    position.needsUpdate = true; colors.needsUpdate = true;
    geometry.computeVertexNormals();
  });
  return <mesh geometry={geometry} frustumCulled={false}>
    <meshStandardMaterial vertexColors roughness={0.3} metalness={0.06} side={THREE.DoubleSide} />
  </mesh>;
}
