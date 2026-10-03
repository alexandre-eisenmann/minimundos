import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying float vRim;
  void main() {
    vUv = uv;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vec3 viewNormal = normalize(normalMatrix * normal);
    vRim = pow(1.0 - abs(dot(viewNormal, normalize(-viewPosition.xyz))), 1.6);
    gl_Position = projectionMatrix * viewPosition;
  }
`;
const beamFragment = `
  uniform vec3 color;
  uniform float strength;
  varying vec2 vUv;
  varying float vRim;
  void main() {
    float fade = smoothstep(0.0, 0.3, vUv.y) * (1.0 - smoothstep(0.9, 1.0, vUv.y));
    gl_FragColor = vec4(color, strength * fade * (0.06 + 0.2 * vRim));
  }
`;
const poolFragment = `
  uniform vec3 color;
  uniform float strength;
  varying vec2 vUv;
  void main() {
    float radius = length(vUv - 0.5) * 2.0;
    gl_FragColor = vec4(color, strength * 0.3 * pow(max(0.0, 1.0 - radius), 1.6));
  }
`;

/**
 * A stage lamp leaning back by `lean` (−z) and `height` above its floor pool.
 * Additive beam and pool ignore pointer input and cast no shadows.
 */
export function StudioSpotlight({
  position,
  height,
  lean = 0,
  color,
  radius = 1.3,
}: {
  position: [number, number, number];
  height: number;
  lean?: number;
  color: string;
  radius?: number;
}) {
  const uniforms = useMemo(
    () => ({
      color: { value: new THREE.Color(color) },
      strength: { value: 0 },
    }),
    [color],
  );
  // R3F copies the uniforms prop, so the fade-in goes through the live materials.
  const beam = useRef<THREE.ShaderMaterial>(null),
    pool = useRef<THREE.ShaderMaterial>(null),
    lens = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, delta) => {
    if (!beam.current || !pool.current || !lens.current) return;
    const strength = THREE.MathUtils.damp(
      beam.current.uniforms.strength.value,
      1,
      3,
      delta,
    );
    beam.current.uniforms.strength.value = strength;
    pool.current.uniforms.strength.value = strength;
    lens.current.emissiveIntensity = 1.6 * strength;
  });
  const length = Math.hypot(height, lean);
  return (
    <group position={position}>
      <group rotation={[-Math.atan2(lean, height), 0, 0]}>
        <mesh position={[0, length / 2, 0]} raycast={() => {}}>
          <cylinderGeometry args={[0.16, radius, length, 48, 1, true]} />
          <shaderMaterial
            ref={beam}
            uniforms={uniforms}
            vertexShader={vertexShader}
            fragmentShader={beamFragment}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <group position={[0, length, 0]}>
          <mesh position={[0, 0.08, 0]} castShadow raycast={() => {}}>
            <cylinderGeometry args={[0.15, 0.19, 0.22, 24]} />
            <meshStandardMaterial
              color="#3b4d49"
              metalness={0.55}
              roughness={0.35}
            />
          </mesh>
          <mesh
            position={[0, -0.032, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            raycast={() => {}}
          >
            <circleGeometry args={[0.17, 24]} />
            <meshStandardMaterial
              ref={lens}
              color="#fff4d8"
              emissive={color}
              emissiveIntensity={0}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      </group>
      <mesh
        position={[0, 0.012, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        raycast={() => {}}
      >
        <planeGeometry args={[radius * 2.6, radius * 2.6]} />
        <shaderMaterial
          ref={pool}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={poolFragment}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
