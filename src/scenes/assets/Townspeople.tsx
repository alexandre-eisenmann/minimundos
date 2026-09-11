import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pedestrianPose, pedestrianRoutes } from '../../game/townspeople';
import { HumanCharacter } from './HumanCharacter';
function Townsperson({ id }: { id: number }) {
  const root = useRef<THREE.Group>(null);
  const motion = useRef(0);
  const phase = id * 13.7;
  useFrame(({ clock }) => {
    const pose = pedestrianPose(
      pedestrianRoutes[id % pedestrianRoutes.length],
      clock.elapsedTime + phase,
      0.42 + (id % 4) * 0.07,
      1.5 + (id % 3),
    );
    if (root.current) {
      root.current.position.fromArray(pose.position);
      root.current.rotation.y = pose.yaw;
      root.current.userData.walking = pose.walking;
    }
    motion.current = pose.walking ? 1 : 0;
  });
  return (
    <group
      ref={root}
      name={`townsperson-${id}`}
      scale={0.83 + (id % 3) * 0.055}
    >
      <HumanCharacter variant={id + 1} motion={motion} phase={phase} />
    </group>
  );
}
export function Townspeople() {
  return (
    <group name="townspeople">
      {Array.from({ length: 9 }, (_, i) => (
        <Townsperson key={i} id={i} />
      ))}
    </group>
  );
}
