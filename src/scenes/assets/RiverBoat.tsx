import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { riverBoatPose } from '../../game/riverTraffic';

// Low, unmasted cargo skiffs: maximum height including bob is below the deck.
export function RiverBoat({
  channel,
  phase,
}: {
  channel: number;
  phase: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const passenger = useRef<THREE.Group>(null);
  const hull = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.74, 0);
    shape.lineTo(-0.5, -0.22);
    shape.lineTo(0.44, -0.22);
    shape.lineTo(0.78, 0);
    shape.lineTo(0.44, 0.22);
    shape.lineTo(-0.5, 0.22);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.025,
      bevelThickness: 0.025,
    });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const pose = riverBoatPose(t, channel, phase);
    ref.current.position.set(
      pose.x,
      0.15 + Math.sin(t * 1.5 + phase) * 0.012,
      pose.z,
    );
    ref.current.rotation.y = pose.yaw;
    if (passenger.current) {
      const distance = Math.min(
        ...[-4.5, 0.1, 6.2].map((x) => Math.abs(pose.x - x)),
      );
      const duck = THREE.MathUtils.smoothstep(distance, 1.4, 2.2);
      passenger.current.rotation.z = -1.45 * (1 - duck);
    }
  });
  return (
    <group ref={ref}>
      <mesh geometry={hull} castShadow receiveShadow>
        <meshStandardMaterial color="#66503a" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 0.14, 0]} receiveShadow>
        <boxGeometry args={[1.1, 0.025, 0.37]} />
        <meshStandardMaterial color="#be9965" roughness={1} />
      </mesh>
      {[-0.22, 0.22].map((z) => (
        <mesh key={z} position={[-0.02, 0.18, z]} castShadow>
          <boxGeometry args={[1.02, 0.075, 0.035]} />
          <meshStandardMaterial color="#967149" roughness={1} />
        </mesh>
      ))}
      {[-0.36, 0.33].map((x) => (
        <mesh key={x} position={[x, 0.19, 0]} castShadow>
          <boxGeometry args={[0.12, 0.035, 0.39]} />
          <meshStandardMaterial color="#aa895c" roughness={1} />
        </mesh>
      ))}
      {[-0.13, 0.1].map((x, i) => (
        <mesh key={x} position={[x, 0.22, i ? 0.07 : -0.055]} castShadow>
          <boxGeometry args={[0.18, 0.13, 0.18]} />
          <meshStandardMaterial
            color={i ? '#9a7850' : '#b59468'}
            roughness={1}
          />
        </mesh>
      ))}
      <group position={[-0.38, 0.18, 0]}>
        {[-0.07, 0.07].map((z) => (
          <mesh key={z} position={[0.065, 0.015, z]} castShadow>
            <boxGeometry args={[0.22, 0.075, 0.075]} />
            <meshStandardMaterial color="#394c50" />
          </mesh>
        ))}
        <group ref={passenger}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[0.14, 0.22, 0.19]} />
            <meshStandardMaterial color={channel > 0 ? '#a66445' : '#526c76'} />
          </mesh>
          <mesh position={[0, 0.29, 0]} castShadow>
            <sphereGeometry args={[0.078, 9, 7]} />
            <meshStandardMaterial color="#d9af85" roughness={1} />
          </mesh>
          <mesh position={[0, 0.36, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.105, 0.045, 7]} />
            <meshStandardMaterial color="#424c46" />
          </mesh>
          {[-0.12, 0.12].map((z) => (
            <mesh
              key={z}
              position={[0.06, 0.09, z]}
              rotation={[0, 0, -0.45]}
              castShadow
            >
              <boxGeometry args={[0.065, 0.2, 0.06]} />
              <meshStandardMaterial
                color={channel > 0 ? '#a66445' : '#526c76'}
              />
            </mesh>
          ))}
        </group>
      </group>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[-0.88, 0.025, side * 0.2]}
          rotation={[0, side * 0.2, 0]}
        >
          <boxGeometry args={[0.38, 0.008, 0.018]} />
          <meshStandardMaterial color="#a5d1c7" transparent opacity={0.65} />
        </mesh>
      ))}
    </group>
  );
}
