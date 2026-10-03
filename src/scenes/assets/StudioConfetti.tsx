import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** One instanced draw for a finite, local shower of paper above the winning booth. */
export function StudioConfetti({
  position,
  paused,
}: {
  position: [number, number, number];
  paused: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const elapsed = useRef(0);
  const reduced = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const particles = useMemo(
    () =>
      Array.from({ length: 160 }, (_, i) => ({
        x: Math.sin(i * 12.9898) * 2.7,
        z: Math.cos(i * 7.23) * 1.7,
        delay: (i % 32) * 0.09,
        speed: 1.1 + (i % 7) * 0.12,
        phase: i * 2.4,
      })),
    [],
  );
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colors = ['#f4ca68', '#de785a', '#71bcb0', '#fff1ca'];
  useFrame((_, delta) => {
    if (!mesh.current) return;
    if (!paused) elapsed.current += Math.min(delta, 0.05);
    mesh.current.visible = !reduced && elapsed.current < 9;
    particles.forEach((p, i) => {
      const t = elapsed.current - p.delay;
      const visible = t >= 0 && t < 5;
      dummy.position.set(
        p.x + Math.sin(t * 2 + p.phase) * 0.35,
        2 - t * p.speed,
        p.z + Math.sin(t + p.phase) * 0.3,
      );
      dummy.rotation.set(t * 3 + p.phase, t * 2, t + p.phase);
      dummy.scale.setScalar(visible ? 1 : 0);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={position}>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, particles.length]}
        frustumCulled={false}
        onUpdate={(m) => {
          particles.forEach((_, i) =>
            m.setColorAt(i, new THREE.Color(colors[i % colors.length])),
          );
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
        }}
      >
        <planeGeometry args={[0.18, 0.32]} />
        <meshStandardMaterial side={THREE.DoubleSide} roughness={0.8} />
      </instancedMesh>
    </group>
  );
}
