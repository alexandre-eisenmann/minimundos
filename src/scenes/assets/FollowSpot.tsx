import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const metal = {
  color: '#2c3837',
  metalness: 0.5,
  roughness: 0.4,
} as const;
const chrome = {
  color: '#b4bcb6',
  metalness: 0.65,
  roughness: 0.32,
} as const;

/** Square box truss along +x, centred on the origin, as one merged mesh. */
function trussGeometry(length: number, section: number) {
  const parts: THREE.BufferGeometry[] = [];
  const add = (
    size: [number, number, number],
    position: [number, number, number],
    rotation: [number, number, number] = [0, 0, 0],
  ) => {
    const box = new THREE.BoxGeometry(...size);
    box.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...position),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
        new THREE.Vector3(1, 1, 1),
      ),
    );
    parts.push(box);
  };
  const h = section / 2,
    chord = 0.06,
    lace = 0.032;
  for (const y of [-h, h])
    for (const z of [-h, h]) add([length, chord, chord], [0, y, z]);
  const panels = Math.max(1, Math.round(length / 0.62)),
    step = length / panels,
    diagonal = Math.hypot(step, section),
    angle = Math.atan2(section, step);
  for (let i = 0; i <= panels; i++) {
    const x = -length / 2 + i * step;
    for (const z of [-h, h]) add([lace, section, lace], [x, 0, z]);
    for (const y of [-h, h]) add([lace, lace, section], [x, y, 0]);
    if (i === panels) continue;
    const mid = x + step / 2,
      sign = i % 2 ? 1 : -1;
    for (const z of [-h, h])
      add([diagonal, lace, lace], [mid, 0, z], [0, 0, sign * angle]);
    for (const y of [-h, h])
      add([diagonal, lace, lace], [mid, y, 0], [0, -sign * angle, 0]);
  }
  const merged = mergeGeometries(parts)!;
  parts.forEach((part) => part.dispose());
  return merged;
}

/** An aluminium box truss running straight from `from` to `to`. */
export function LightingTruss({
  from,
  to,
  section = 0.42,
  castShadow = true,
}: {
  from: [number, number, number];
  to: [number, number, number];
  section?: number;
  /** Overhead spans can skip shadows so their lattice doesn't stripe the set. */
  castShadow?: boolean;
}) {
  const [ax, ay, az] = from,
    [bx, by, bz] = to;
  const { length, quaternion } = useMemo(() => {
    const direction = new THREE.Vector3(bx - ax, by - ay, bz - az);
    return {
      length: direction.length(),
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(1, 0, 0),
        direction.normalize(),
      ),
    };
  }, [ax, ay, az, bx, by, bz]);
  const geometry = useMemo(
    () => trussGeometry(length, section),
    [length, section],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
      position={[(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2]}
      quaternion={quaternion}
      castShadow={castShadow}
      receiveShadow
      raycast={() => {}}
    >
      <meshStandardMaterial {...chrome} />
    </mesh>
  );
}

const beamVertex = `
  varying vec2 vUv;
  varying float vRim;
  void main() {
    vUv = uv;
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vec3 viewNormal = normalize(normalMatrix * normal);
    vRim = pow(1.0 - abs(dot(viewNormal, normalize(-viewPosition.xyz))), 1.5);
    gl_Position = projectionMatrix * viewPosition;
  }
`;
const beamFragment = `
  uniform vec3 color;
  varying vec2 vUv;
  varying float vRim;
  void main() {
    // uv.y runs from the lens (0) to the lit floor (1).
    float fade = smoothstep(0.0, 0.06, vUv.y) * (1.0 - smoothstep(0.82, 1.0, vUv.y));
    gl_FragColor = vec4(color, fade * (0.035 + 0.13 * vRim));
  }
`;

/**
 * A motorised follow spot riding a truss rail at (`height`, `z`). The trolley
 * keeps `offset` from the subject along x (within ±`travel`); the yoke pans and
 * the head tilts so the beam stays on `target` (the subject's feet).
 */
export function FollowSpot({
  target,
  height,
  z,
  travel,
  offset = 0,
  color = '#fff0cf',
  intensity = 4.5,
  radius = 0.9,
  lag = 0.9,
  wash = 16,
  washIntensity = 1.7,
  occluders = [],
}: {
  target: RefObject<THREE.Vector3>;
  height: number;
  z: number;
  travel: number;
  offset?: number;
  color?: string;
  intensity?: number;
  radius?: number;
  /** How quickly the trolley catches up with the subject (damping rate). */
  lag?: number;
  /** Radius of the soft surround that falls off into the darker stage. */
  wash?: number;
  washIntensity?: number;
  /** Solid volumes that stop the visible beam (the light itself uses shadows). */
  occluders?: THREE.Box3[];
}) {
  const trolley = useRef<THREE.Group>(null),
    pan = useRef<THREE.Group>(null),
    tilt = useRef<THREE.Group>(null),
    beam = useRef<THREE.Mesh>(null),
    light = useRef<THREE.SpotLight>(null),
    surround = useRef<THREE.SpotLight>(null);
  const aim = useMemo(() => new THREE.Object3D(), []);
  const pivot = useMemo(() => new THREE.Vector3(), []);
  const ray = useMemo(() => new THREE.Ray(), []),
    hit = useMemo(() => new THREE.Vector3(), []);
  const uniforms = useMemo(
    () => ({ color: { value: new THREE.Color(color) } }),
    [color],
  );
  const lens = 0.5;
  useFrame((_, delta) => {
    const goal = target.current;
    if (!trolley.current || !pan.current || !tilt.current || !goal) return;
    trolley.current.position.x = THREE.MathUtils.damp(
      trolley.current.position.x,
      THREE.MathUtils.clamp(goal.x + offset, -travel, travel),
      lag,
      Math.min(delta, 0.05),
    );
    tilt.current.getWorldPosition(pivot);
    const dx = goal.x - pivot.x,
      dy = goal.y - pivot.y,
      dz = goal.z - pivot.z,
      across = Math.hypot(dx, dz),
      distance = Math.hypot(across, dy);
    pan.current.rotation.y = Math.atan2(dx, dz);
    tilt.current.rotation.x = Math.atan2(-dy, across);
    ray.origin.copy(pivot);
    ray.direction.set(dx, dy, dz).divideScalar(distance || 1);
    let reach = distance;
    for (const box of occluders) {
      if (!ray.intersectBox(box, hit)) continue;
      const along = hit.distanceTo(pivot);
      if (along > lens && along < reach - 0.05) reach = along;
    }
    const length = Math.max(0.1, reach - lens);
    if (beam.current) {
      beam.current.scale.set(1, length, 1);
      beam.current.position.z = lens + length / 2;
    }
    aim.position.set(0, 0, distance);
    if (light.current) light.current.angle = Math.atan(radius / distance);
    if (surround.current)
      surround.current.angle = Math.atan(wash / distance);
  });
  return (
    <group position={[0, height, z]}>
      <group ref={trolley} position={[offset, 0, 0]}>
        <mesh position={[0, -0.33, 0]} castShadow raycast={() => {}}>
          <boxGeometry args={[0.62, 0.2, 0.56]} />
          <meshStandardMaterial {...metal} />
        </mesh>
        {[-0.22, 0.22].map((x) => (
          <mesh
            key={x}
            position={[x, -0.25, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            raycast={() => {}}
          >
            <cylinderGeometry args={[0.07, 0.07, 0.6, 16]} />
            <meshStandardMaterial color="#1f2a29" roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, -0.55, 0]} raycast={() => {}}>
          <cylinderGeometry args={[0.045, 0.045, 0.3, 12]} />
          <meshStandardMaterial {...chrome} />
        </mesh>
        <group ref={pan} position={[0, -0.72, 0]}>
          <mesh castShadow raycast={() => {}}>
            <boxGeometry args={[0.8, 0.07, 0.16]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          {[-0.37, 0.37].map((x) => (
            <mesh key={x} position={[x, -0.24, 0]} castShadow raycast={() => {}}>
              <boxGeometry args={[0.06, 0.48, 0.16]} />
              <meshStandardMaterial {...metal} />
            </mesh>
          ))}
          <group ref={tilt} position={[0, -0.42, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow raycast={() => {}}>
              <cylinderGeometry args={[0.3, 0.25, 0.9, 32]} />
              <meshStandardMaterial color="#c4573f" metalness={0.35} roughness={0.42} />
            </mesh>
            <mesh
              position={[0, 0, lens - 0.04]}
              rotation={[Math.PI / 2, 0, 0]}
              raycast={() => {}}
            >
              <cylinderGeometry args={[0.32, 0.32, 0.1, 32]} />
              <meshStandardMaterial {...chrome} />
            </mesh>
            <mesh position={[0, 0, lens + 0.012]} raycast={() => {}}>
              <circleGeometry args={[0.26, 32]} />
              <meshStandardMaterial
                color="#fff6df"
                emissive={color}
                emissiveIntensity={2.2}
                toneMapped={false}
              />
            </mesh>
            {[-0.12, 0, 0.12].map((step) => (
              <mesh key={step} position={[0, 0.27, step - 0.15]} raycast={() => {}}>
                <boxGeometry args={[0.24, 0.07, 0.03]} />
                <meshStandardMaterial {...metal} />
              </mesh>
            ))}
            <mesh ref={beam} rotation={[Math.PI / 2, 0, 0]} raycast={() => {}}>
              <cylinderGeometry args={[radius * 0.85, 0.22, 1, 40, 1, true]} />
              <shaderMaterial
                uniforms={uniforms}
                vertexShader={beamVertex}
                fragmentShader={beamFragment}
                transparent
                depthWrite={false}
                side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
            <primitive object={aim} />
            <spotLight
              ref={light}
              position={[0, 0, lens]}
              target={aim}
              color={color}
              intensity={intensity}
              decay={0}
              penumbra={0.55}
              castShadow
              shadow-mapSize={[1024, 1024]}
              shadow-bias={-0.0004}
              shadow-normalBias={0.03}
              shadow-camera-near={1}
              shadow-camera-far={90}
            />
            <spotLight
              ref={surround}
              position={[0, 0, lens]}
              target={aim}
              color={color}
              intensity={washIntensity}
              decay={0}
              penumbra={0.7}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-bias={-0.0004}
              shadow-normalBias={0.03}
              shadow-camera-near={1}
              shadow-camera-far={90}
            />
          </group>
        </group>
      </group>
    </group>
  );
}
