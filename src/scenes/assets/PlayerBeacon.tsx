import { useMemo } from 'react';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  varying float vRim;
  void main() {
    vUv = uv;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vec3 viewNormal = normalize(normalMatrix * normal);
    vRim = pow(1.0 - abs(dot(viewNormal, normalize(-viewPosition.xyz))), 2.0);
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const beamFragment = `
  uniform vec3 color;
  varying vec2 vUv;
  varying float vRim;
  void main() {
    float fade = smoothstep(0.0, 0.08, vUv.y)
      * (1.0 - smoothstep(0.45, 1.0, vUv.y));
    gl_FragColor = vec4(color, fade * (0.09 + 0.22 * vRim));
  }
`;

const haloFragment = `
  uniform vec3 color;
  varying vec2 vUv;
  void main() {
    float radius = length(vUv - 0.5) * 2.0;
    float glow = pow(max(0.0, 1.0 - radius), 2.0);
    gl_FragColor = vec4(color, glow * 0.35);
  }
`;

// A steady, softly fading marker: no scene lights, shadows or pointer blocking.
export function PlayerBeacon() {
  const uniforms = useMemo(() => ({ color: { value: new THREE.Color('#ffe3a0') } }), []);
  return (
    <group>
      <mesh position={[0, 2.65, 0]} raycast={() => {}}>
        <cylinderGeometry args={[0.48, 0.38, 5.3, 48, 1, true]} />
        <shaderMaterial
          uniforms={uniforms} vertexShader={vertexShader} fragmentShader={beamFragment}
          transparent depthWrite={false} side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending} toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}>
        <planeGeometry args={[1.5, 1.5]} />
        <shaderMaterial
          uniforms={uniforms} vertexShader={vertexShader} fragmentShader={haloFragment}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.024, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => {}}>
        <ringGeometry args={[0.32, 0.36, 48]} />
        <meshBasicMaterial color="#ffe3a0" transparent opacity={0.85} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
