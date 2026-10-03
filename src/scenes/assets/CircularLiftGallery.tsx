import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';

/** A balcony slab with an actual circular recess, shared by its deck and fascia. */
export function CircularLiftGallery({
  left,
  right,
  back,
  front,
  liftZ,
  radius,
  height,
  onClick,
}: {
  left: number;
  right: number;
  back: number;
  front: number;
  liftZ: number;
  radius: number;
  height: number;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const { slab, trim } = useMemo(() => {
    const angle = Math.asin((front - liftZ) / radius);
    const edge = Math.sqrt(radius * radius - (front - liftZ) ** 2);
    const shape = new THREE.Shape();
    shape.moveTo(left, back);
    shape.lineTo(right, back);
    shape.lineTo(right, front);
    shape.lineTo(edge, front);
    shape.absarc(0, liftZ, radius, angle, -Math.PI - angle, true);
    shape.lineTo(left, front);
    shape.closePath();
    const slab = new THREE.ExtrudeGeometry(shape, {
      depth: 0.26,
      bevelEnabled: false,
      curveSegments: 96,
    });
    const points = Array.from({ length: 65 }, (_, i) => {
      const a = angle + ((-Math.PI - 2 * angle) * i) / 64;
      return new THREE.Vector3(
        Math.cos(a) * radius,
        0,
        liftZ + Math.sin(a) * radius,
      );
    });
    const trim = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points),
      64,
      0.025,
      8,
      false,
    );
    return { slab, trim };
  }, [left, right, back, front, liftZ, radius]);
  useEffect(
    () => () => {
      slab.dispose();
      trim.dispose();
    },
    [slab, trim],
  );
  return (
    <group>
      <mesh
        geometry={slab}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, height + 0.17, 0]}
        castShadow
        receiveShadow
        onClick={onClick}
      >
        <meshStandardMaterial color="#b5aa83" roughness={0.7} />
      </mesh>
      <mesh geometry={trim} position={[0, height + 0.175, 0]}>
        <meshStandardMaterial
          color="#c7d7d9"
          metalness={0.6}
          roughness={0.25}
        />
      </mesh>
    </group>
  );
}
