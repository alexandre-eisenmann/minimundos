import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import {
  AdditiveBlending,
  CanvasTexture,
  DoubleSide,
  InstancedMesh,
  Object3D,
  PCFShadowMap,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  SpotLight,
  Group,
} from 'three';
import { ClassroomLife, Explorer } from './ClassroomLife';
import { HumanCharacter } from '../assets/HumanCharacter';
import type { ClassroomPhase } from './classroomMotion';
import type { MovementInput } from '../../game/movement';
import { students } from './students';
import { drawSlate, useHandwritingReady } from './handwriting';

function Box({
  p,
  s,
  color,
  rotation = [0, 0, 0],
  roughness = 0.86,
  metalness = 0,
  emissive,
  emissiveIntensity = 0,
  flat = true,
}: {
  p: [number, number, number];
  s: [number, number, number];
  color: string;
  rotation?: [number, number, number];
  roughness?: number;
  metalness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  flat?: boolean;
}) {
  return (
    <mesh position={p} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={color}
        roughness={roughness}
        metalness={metalness}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissiveIntensity}
        flatShading={flat}
      />
    </mesh>
  );
}
function Sphere({
  p,
  s,
  color,
  rotation = [0, 0, 0],
}: {
  p: [number, number, number];
  s: [number, number, number];
  color: string;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={p} scale={s} rotation={rotation} castShadow receiveShadow>
      <sphereGeometry args={[1, 24, 16]} />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}
function useSlate(lines: readonly string[], board = false, method = 'pairs') {
  const ready = useHandwritingReady();
  const texture = useMemo(() => {
    const t = new CanvasTexture(drawSlate(lines, method, board, ready));
    t.colorSpace = SRGBColorSpace;
    return t;
  }, [lines, board, method, ready]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

const boardLines = [
  'ARITHMETIC',
  '1 + 2 + 3 + · · · + 100 = ?',
  'Find the sum. Show your work.',
];
const recessLines = [
  'A little break',
  'Put your slates aside.',
  'The lesson will begin shortly.',
];
function Blackboard({ phase }: { phase: ClassroomPhase }) {
  const texture = useSlate(
    phase === 'challenge' ? boardLines : recessLines,
    true,
  );
  return (
    <group position={[0, 2.75, -4.82]}>
      <Box p={[0, 0, -0.04]} s={[5.8, 2.7, 0.16]} color="#6b442d" />
      <Box p={[0, 0, -0.12]} s={[6.05, 2.92, 0.08]} color="#4e321f" />
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[5.5, 2.4]} />
        <meshStandardMaterial map={texture} roughness={1} />
      </mesh>
      <Box p={[0, -1.34, 0.14]} s={[5.95, 0.12, 0.3]} color="#9a7148" />
      <Box p={[-1.55, -1.25, 0.22]} s={[0.22, 0.05, 0.05]} color="#eee8d7" />
      <Box p={[-1.28, -1.24, 0.2]} s={[0.2, 0.045, 0.045]} color="#f2e4b8" />
      <Box p={[0.35, -1.25, 0.21]} s={[0.18, 0.04, 0.04]} color="#d7cba8" />
      <Box p={[1.8, -1.23, 0.2]} s={[0.35, 0.09, 0.16]} color="#3c3530" />
      <Box
        p={[2.55, -0.15, 0.18]}
        s={[0.045, 1.85, 0.045]}
        color="#cbb589"
        rotation={[0, 0, -0.18]}
      />
    </group>
  );
}
function Pupil({ index }: { index: number }) {
  const student = students[index];
  return (
    <group
      position={[student.x, 0.05, student.z + 0.74]}
      rotation={[0, Math.PI, 0]}
      scale={1.58}
    >
      <HumanCharacter
        pose="sit"
        variant={index}
        coat={student.coat}
        hair={student.hair}
        phase={index * 1.35}
      />
      <mesh
        position={[0.17, 0.5, 0.13]}
        rotation={[0.9, 0.18, -0.48]}
        castShadow
      >
        <cylinderGeometry args={[0.01, 0.007, 0.26, 6]} />
        <meshStandardMaterial color="#e8dfc4" roughness={0.68} />
      </mesh>
    </group>
  );
}
const blankSlate = [''];
function Desk({
  phase,
  index,
  selected,
  onInspect,
  onHover,
}: {
  phase: ClassroomPhase;
  index: number;
  selected: boolean;
  onInspect: (i: number) => void;
  onHover: (i: number | null) => void;
}) {
  const s = students[index];
  const texture = useSlate(
    phase === 'challenge' ? s.lines : blankSlate,
    false,
    s.method,
  );
  return (
    <group position={[s.x, 0, s.z]}>
      <Box p={[0, 0.96, 0]} s={[1.95, 0.14, 1.22]} color="#a5784b" />
      <Box p={[0, 0.88, 0]} s={[1.82, 0.05, 1.1]} color="#8d6744" />
      {[-0.78, 0.78].flatMap((x) =>
        [-0.43, 0.43].map((z) => (
          <Box
            key={`${x}-${z}`}
            p={[x, 0.45, z]}
            s={[0.12, 0.9, 0.12]}
            color="#745033"
          />
        )),
      )}
      <Box p={[0, 0.4, 0.32]} s={[1.7, 0.11, 0.13]} color="#795435" />
      <Box p={[0, 0.51, 0.78]} s={[1.22, 0.12, 0.58]} color="#785033" />
      {[-0.46, 0.46].map((x) => (
        <Box
          key={x}
          p={[x, 0.24, 0.78]}
          s={[0.11, 0.5, 0.42]}
          color="#62432e"
        />
      ))}
      <group
        position={[-0.12, 1.055, 0.04]}
        rotation={[-Math.PI / 2, 0, -0.08]}
        onClick={(e) => {
          e.stopPropagation();
          onInspect(index);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(index);
        }}
        onPointerOut={() => onHover(null)}
      >
        <Box
          p={[0, 0, -0.02]}
          s={[0.85, 1.01, 0.06]}
          color={selected ? '#e5c17a' : '#554839'}
        />
        <mesh position={[0, 0, 0.016]}>
          <planeGeometry args={[0.75, 0.9]} />
          <meshStandardMaterial map={texture} roughness={0.95} />
        </mesh>
      </group>
      <Box
        p={[0.58, 1.045, 0.28]}
        s={[0.34, 0.02, 0.42]}
        color="#c4a06a"
        rotation={[0, 0.18, 0]}
      />
      <Box
        p={[0.62, 1.06, -0.2]}
        s={[0.14, 0.07, 0.09]}
        color="#e6ddbf"
        rotation={[0, -0.3, 0]}
      />
      <mesh position={[0.67, 1.08, -0.4]} castShadow>
        <cylinderGeometry args={[0.08, 0.085, 0.1, 16]} />
        <meshStandardMaterial color="#39322b" roughness={0.55} />
      </mesh>
      <mesh position={[0.69, 1.2, -0.4]} rotation={[0.35, 0.2, 0.4]} castShadow>
        <cylinderGeometry args={[0.012, 0.008, 0.22, 6]} />
        <meshStandardMaterial color="#d9d0b4" roughness={0.7} />
      </mesh>
      {index % 3 === 1 && (
        <Box
          p={[-0.72, 1.08, -0.32]}
          s={[0.28, 0.05, 0.36]}
          color="#4a4338"
          rotation={[0, 0.4, 0]}
        />
      )}
    </group>
  );
}
function WindowLight({ z }: { z: number }) {
  const light = useRef<SpotLight>(null);
  const target = useRef<Object3D>(null);
  useLayoutEffect(() => {
    if (light.current && target.current) light.current.target = target.current;
  }, []);
  return (
    <>
      <spotLight
        ref={light}
        position={[-5.02, 3.2, z]}
        color="#ffe6b5"
        intensity={20}
        distance={15}
        angle={0.64}
        penumbra={0.84}
        decay={1.55}
      />
      <object3D ref={target} position={[2.4, 0.15, z]} />
    </>
  );
}
function LightShaft({ z }: { z: number }) {
  return (
    <group position={[-3.35, 1.9, z]}>
      <mesh rotation={[0, 0, -0.46]} renderOrder={2}>
        <planeGeometry args={[6.5, 2.7]} />
        <meshBasicMaterial
          color="#ffe8c0"
          transparent
          opacity={0.1}
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh
        rotation={[0, 0.1, -0.5]}
        position={[0.15, -0.2, 0.32]}
        renderOrder={2}
      >
        <planeGeometry args={[5.6, 1.7]} />
        <meshBasicMaterial
          color="#fff4d6"
          transparent
          opacity={0.055}
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
function DustMotes() {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const reduced = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const seeds = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        x: -4.4 + (i % 11) * 0.78,
        y: 0.55 + (i % 8) * 0.38,
        z: -3.2 + ((i * 3) % 17) * 0.48,
        p: i * 0.19,
      })),
    [],
  );
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = reduced ? 0 : clock.elapsedTime;
    seeds.forEach((s, i) => {
      dummy.position.set(
        s.x + Math.sin(t * 0.14 + s.p) * 0.38,
        s.y + Math.sin(t * 0.2 + s.p) * 0.22,
        s.z + Math.cos(t * 0.11 + s.p) * 0.28,
      );
      dummy.scale.setScalar(0.011 + (i % 4) * 0.005);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, seeds.length]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial
        color="#fff6d8"
        transparent
        opacity={0.32}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
function ClassroomWindow({ z }: { z: number }) {
  return (
    <group position={[-5.28, 2.85, z]}>
      <Box p={[0.03, 0, 0]} s={[0.1, 2.52, 2.58]} color="#6a553c" />
      <Box p={[0.09, 0, 0]} s={[0.05, 2.24, 2.3]} color="#4a3c2c" />
      {[-0.54, 0.54].flatMap((pz) =>
        [-0.7, 0, 0.7].map((py) => (
          <mesh
            key={`${pz}-${py}`}
            position={[0.125, py, pz]}
            rotation={[0, Math.PI / 2, 0]}
          >
            <planeGeometry args={[0.98, 0.64]} />
            <meshStandardMaterial
              color="#d5ebe4"
              emissive="#c5e0d6"
              emissiveIntensity={0.62}
              roughness={0.12}
              metalness={0.04}
              transparent
              opacity={0.84}
            />
          </mesh>
        )),
      )}
      <Box p={[0.15, 0, 0]} s={[0.07, 2.28, 0.07]} color="#e7d8b6" />
      <Box p={[0.15, 0, 0]} s={[0.07, 0.07, 2.3]} color="#e7d8b6" />
      <Box p={[0.15, 0.7, 0]} s={[0.07, 0.06, 2.3]} color="#e4d4b0" />
      <Box p={[0.15, -0.7, 0]} s={[0.07, 0.06, 2.3]} color="#e4d4b0" />
      <Box p={[0.22, -1.28, 0]} s={[0.5, 0.14, 2.76]} color="#c4ad86" />
      <Box p={[0.18, 1.22, 0]} s={[0.16, 0.08, 2.62]} color="#7a6244" />
      {[-1, 1].map((side) => (
        <group key={side} position={[0.3, 0.12, side * 1.1]}>
          <Box p={[0, 0.95, 0]} s={[0.12, 0.1, 0.44]} color="#7b4c38" />
          <Box
            p={[0.02, 0.02, 0]}
            s={[0.08, 1.78, 0.3]}
            color="#a35d48"
            rotation={[0, 0, side * 0.07]}
          />
          <Box
            p={[0.07, -0.22, side * 0.07]}
            s={[0.07, 1.28, 0.16]}
            color="#8d4f3d"
            rotation={[0, 0, side * 0.15]}
          />
        </group>
      ))}
    </group>
  );
}
function WindowExterior() {
  return (
    <group position={[-6.2, 2.35, -0.55]}>
      <mesh position={[0, 1.15, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[7.2, 5.6]} />
        <meshBasicMaterial color="#9bb7b2" />
      </mesh>
      <mesh position={[0, -1.35, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[7.2, 3]} />
        <meshBasicMaterial color="#6a7a55" />
      </mesh>
      {[
        [-1.9, 0.1],
        [0.15, -0.25],
        [1.85, 0.4],
      ].map(([z, y], i) => (
        <group key={i} position={[0.15, y, z]}>
          <Box p={[0, -0.2, 0]} s={[0.12, 0.85, 0.12]} color="#4a3828" />
          <Sphere p={[0, 0.55, 0]} s={[0.58, 0.88, 0.42]} color="#4d6143" />
          <Sphere
            p={[0.18, 0.35, 0.12]}
            s={[0.38, 0.52, 0.3]}
            color="#5a6e4b"
          />
        </group>
      ))}
    </group>
  );
}
function WallMap() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 384;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#d4bc8e';
    ctx.fillRect(0, 0, 512, 384);
    ctx.fillStyle = '#c3a370';
    ctx.beginPath();
    ctx.ellipse(270, 188, 148, 118, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8fa39a';
    ctx.beginPath();
    ctx.ellipse(92, 86, 86, 64, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(430, 70, 70, 50, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6d8884';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(188, 70);
    ctx.quadraticCurveTo(250, 170, 318, 310);
    ctx.stroke();
    ctx.strokeStyle = '#8a6a42';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(40 + i * 80, 24);
      ctx.lineTo(70 + i * 74, 360);
      ctx.stroke();
    }
    ctx.strokeStyle = '#5d452c';
    ctx.lineWidth = 16;
    ctx.strokeRect(0, 0, 512, 384);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return map;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <group position={[3.62, 2.58, -4.96]}>
      <Box p={[0, 0, -0.03]} s={[1.72, 1.28, 0.08]} color="#6a4a30" />
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[1.52, 1.1]} />
        <meshStandardMaterial map={texture} roughness={0.92} />
      </mesh>
    </group>
  );
}
function WallClock() {
  const bob = useRef<Group>(null);
  const reduced = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  useFrame(({ clock }) => {
    if (bob.current && !reduced)
      bob.current.rotation.z = Math.sin(clock.elapsedTime * 2.15) * 0.26;
  });
  return (
    <group position={[3.95, 3.72, -4.92]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.12, 48]} />
        <meshStandardMaterial color="#6d4d32" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.07]}>
        <circleGeometry args={[0.42, 48]} />
        <meshStandardMaterial color="#e7d9b7" roughness={0.55} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <Box
            key={i}
            p={[Math.sin(a) * 0.34, Math.cos(a) * 0.34, 0.08]}
            s={[0.03, i % 3 === 0 ? 0.08 : 0.045, 0.02]}
            color="#504734"
          />
        );
      })}
      <Box p={[0, 0.12, 0.085]} s={[0.025, 0.24, 0.02]} color="#504734" />
      <Box
        p={[0.12, 0, 0.09]}
        s={[0.26, 0.02, 0.02]}
        color="#504734"
        rotation={[0, 0, 0.42]}
      />
      <group ref={bob} position={[0, -0.48, 0.05]}>
        <Box p={[0, -0.18, 0]} s={[0.02, 0.42, 0.02]} color="#5a4634" />
        <Sphere p={[0, -0.42, 0]} s={[0.07, 0.09, 0.05]} color="#7a5a36" />
      </group>
    </group>
  );
}
function IronStove() {
  return (
    <group position={[-4.48, 0, 3.72]}>
      <Box p={[0, 0.08, 0]} s={[0.72, 0.1, 0.55]} color="#3a342e" />
      {[-0.26, 0.26].flatMap((x) =>
        [-0.18, 0.18].map((z) => (
          <Box
            key={`${x}-${z}`}
            p={[x, 0.16, z]}
            s={[0.08, 0.18, 0.08]}
            color="#2f2b27"
          />
        )),
      )}
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.32, 0.9, 18]} />
        <meshStandardMaterial
          color="#3e3934"
          roughness={0.48}
          metalness={0.35}
        />
      </mesh>
      <Box p={[0.3, 0.7, 0]} s={[0.06, 0.28, 0.22]} color="#2c2824" />
      <mesh position={[0, 1.28, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.12, 0.22, 12]} />
        <meshStandardMaterial color="#4a433c" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.15, -0.15]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 1.55, 10]} />
        <meshStandardMaterial
          color="#3a3530"
          metalness={0.28}
          roughness={0.55}
        />
      </mesh>
      <mesh position={[0, 2.92, -0.42]} rotation={[0.7, 0, 0]} castShadow>
        <cylinderGeometry args={[0.065, 0.065, 0.55, 10]} />
        <meshStandardMaterial
          color="#3a3530"
          metalness={0.28}
          roughness={0.55}
        />
      </mesh>
      <pointLight
        position={[0.2, 0.7, 0.15]}
        color="#ff9a4a"
        intensity={0.55}
        distance={3.4}
      />
    </group>
  );
}
function Chandelier() {
  return (
    <group position={[0.15, 3.55, 0.25]}>
      <Box p={[0, 0.42, 0]} s={[0.04, 0.55, 0.04]} color="#5c4632" />
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.4, 0.03, 8, 28]} />
        <meshStandardMaterial
          color="#6a5136"
          roughness={0.45}
          metalness={0.32}
        />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        return (
          <group
            key={i}
            position={[Math.cos(a) * 0.4, -0.1, Math.sin(a) * 0.4]}
          >
            <mesh castShadow>
              <cylinderGeometry args={[0.035, 0.048, 0.14, 10]} />
              <meshStandardMaterial
                color="#cfc6a8"
                emissive="#ffd9a0"
                emissiveIntensity={0.4}
                roughness={0.55}
              />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <sphereGeometry args={[0.028, 10, 8]} />
              <meshStandardMaterial
                color="#fff4d4"
                emissive="#ffe2a8"
                emissiveIntensity={0.8}
              />
            </mesh>
          </group>
        );
      })}
      <pointLight intensity={0.7} color="#ffd9a8" distance={7.5} />
    </group>
  );
}
function Globe() {
  return (
    <group position={[0.95, 1.08, -3.88]}>
      <mesh>
        <cylinderGeometry args={[0.12, 0.16, 0.06, 16]} />
        <meshStandardMaterial color="#6a4e34" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.22, 0]} castShadow>
        <sphereGeometry args={[0.16, 24, 18]} />
        <meshStandardMaterial color="#6d8a7a" roughness={0.62} />
      </mesh>
      <mesh rotation={[0, 0, 0.35]}>
        <torusGeometry args={[0.175, 0.01, 6, 28]} />
        <meshStandardMaterial
          color="#c2ae7e"
          metalness={0.35}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}
function Abacus() {
  return (
    <group position={[-0.85, 0.95, -3.72]} rotation={[0, 0.2, 0]}>
      <Box p={[0, 0, 0]} s={[0.55, 0.04, 0.32]} color="#6e4f34" />
      {[-0.14, 0, 0.14].map((z) => (
        <group key={z}>
          <Box p={[0, 0.08, z]} s={[0.5, 0.015, 0.015]} color="#cbb589" />
          {[-0.16, -0.08, 0.02, 0.12].map((x, i) => (
            <Sphere
              key={x}
              p={[x, 0.08, z]}
              s={[0.035, 0.035, 0.035]}
              color={i % 2 ? '#8b3d32' : '#d7c49a'}
            />
          ))}
        </group>
      ))}
    </group>
  );
}
function ClassroomSet() {
  return (
    <>
      <Box p={[0, -0.22, 0]} s={[11.1, 0.4, 10.5]} color="#4a382c" />
      {Array.from({ length: 26 }, (_, i) => (
        <Box
          key={i}
          p={[-5.35 + i * 0.425, 0.006 + (i % 5) * 0.001, 0]}
          s={[0.4, 0.07, 10.2]}
          color={['#b08a60', '#a57d52', '#bc976b', '#ad855b', '#9e784c'][i % 5]}
          flat={false}
        />
      ))}
      <Box p={[0, 0.04, 1.05]} s={[1.42, 0.03, 7.4]} color="#8a4634" />
      {[-2.4, 0, 2.4].map((z) => (
        <Box
          key={z}
          p={[0, 0.055, z]}
          s={[1.38, 0.012, 0.08]}
          color="#d2b48a"
        />
      ))}
      <Box p={[0, 2.45, -5.15]} s={[11, 4.9, 0.23]} color="#d2c3a5" />
      <Box p={[-5.43, 2.45, 0]} s={[0.22, 4.9, 10.3]} color="#d8cbb0" />
      <Box p={[0, 0.57, -4.99]} s={[10.8, 1.1, 0.08]} color="#867353" />
      <Box p={[-5.27, 0.57, 0]} s={[0.08, 1.1, 10.1]} color="#867353" />
      {Array.from({ length: 18 }, (_, i) => (
        <Box
          key={i}
          p={[-5 + i * 0.59, 0.57, -4.9]}
          s={[0.035, 1.1, 0.05]}
          color="#b49b6c"
        />
      ))}
      {Array.from({ length: 16 }, (_, i) => (
        <Box
          key={`side-wainscot-${i}`}
          p={[-5.22, 0.57, -4.6 + i * 0.62]}
          s={[0.05, 1.1, 0.035]}
          color="#b49b6c"
        />
      ))}
      <Box p={[0, 4.65, -4.97]} s={[11.2, 0.2, 0.3]} color="#715437" />
      <Box p={[-5.27, 4.65, 0]} s={[0.3, 0.2, 10.4]} color="#715437" />
      <Box p={[0, 4.7, -4.82]} s={[10.8, 0.1, 0.52]} color="#8d704c" />
      <Box p={[-0.85, 4.52, 3.35]} s={[8.1, 0.16, 0.18]} color="#7a5a3c" />
      <WindowExterior />
      {[-2.6, 1.5].map((z) => (
        <ClassroomWindow key={z} z={z} />
      ))}
      {[-2.6, 1.5].map((z) => (
        <LightShaft key={`shaft-${z}`} z={z} />
      ))}
      <group position={[4.2, 1.55, -5.02]}>
        <Box p={[-0.52, 0, 0]} s={[0.12, 3.1, 0.1]} color="#6f5338" />
        <Box p={[0.52, 0, 0]} s={[0.12, 3.1, 0.1]} color="#6f5338" />
        <Box p={[0, 1.52, 0]} s={[1.16, 0.12, 0.12]} color="#7a5c3e" />
        <Box p={[0, 0, 0.04]} s={[0.92, 2.95, 0.08]} color="#5c4630" />
        <Box p={[0.28, 0.12, 0.1]} s={[0.08, 0.08, 0.05]} color="#c4a15a" />
      </group>
      <group position={[-3.95, 2.15, -4.9]}>
        <Box p={[0, 0.08, 0]} s={[1.55, 0.12, 0.1]} color="#785737" />
        {[-0.58, -0.2, 0.2, 0.58].map((x, i) => (
          <group key={x}>
            <Box p={[x, -0.08, 0.12]} s={[0.045, 0.22, 0.13]} color="#504834" />
            <Sphere
              p={[x, -0.72, 0.16]}
              s={[0.17, 0.52, 0.09]}
              color={['#7b6650', '#6b735f', '#786453', '#4e5c68'][i]}
            />
            <Box p={[x, -0.38, 0.22]} s={[0.16, 0.1, 0.03]} color="#b09a72" />
          </group>
        ))}
        <Sphere
          p={[-0.38, 0.22, 0.16]}
          s={[0.14, 0.08, 0.12]}
          color="#6a4a32"
        />
        <Sphere p={[0.42, 0.2, 0.15]} s={[0.12, 0.07, 0.11]} color="#4a4036" />
      </group>
      <group position={[-4.35, 0, -3.85]}>
        <Box p={[0, 0.34, 0]} s={[0.85, 0.6, 0.65]} color="#8d6846" />
        <Box p={[0, 0.67, 0]} s={[0.94, 0.1, 0.7]} color="#aa8255" />
        {[-0.28, 0.28].map((x) => (
          <Box
            key={x}
            p={[x, 0.35, -0.34]}
            s={[0.05, 0.57, 0.025]}
            color="#564d39"
          />
        ))}
        <Box p={[0, 0.4, -0.36]} s={[0.12, 0.08, 0.03]} color="#c3a16a" />
      </group>
      <Box p={[0.1, 0.74, -3.9]} s={[2.6, 0.13, 1]} color="#8a603c" />
      {[-0.95, 1.15].map((x) => (
        <Box
          key={x}
          p={[x, 0.34, -3.9]}
          s={[0.13, 0.75, 0.65]}
          color="#684b33"
        />
      ))}
      <Box p={[-0.45, 0.88, -3.9]} s={[0.65, 0.16, 0.44]} color="#604f40" />
      <Box p={[-0.45, 0.91, -3.9]} s={[0.6, 0.09, 0.43]} color="#dfd1ae" />
      <Box
        p={[0.55, 0.86, -3.55]}
        s={[0.035, 0.06, 0.42]}
        color="#684730"
        rotation={[0, 0.35, 0]}
      />
      <Box p={[0.72, 0.82, -4.15]} s={[0.16, 0.08, 0.16]} color="#2b2722" />
      <mesh position={[0.72, 0.92, -4.15]} castShadow>
        <sphereGeometry args={[0.055, 12, 10]} />
        <meshStandardMaterial
          color="#c4a15a"
          metalness={0.55}
          roughness={0.35}
        />
      </mesh>
      <Globe />
      <Abacus />
      <group position={[3.15, 0, -3.42]} rotation={[0, 0.35, 0]} scale={1.72}>
        <HumanCharacter variant={4} coat="#3f3a34" hair="#d7cfc0" phase={9} />
      </group>
      <group position={[4.55, 0, -4.35]}>
        <Box p={[0, 0.73, 0]} s={[1.05, 1.45, 0.65]} color="#78573b" />
        {[0.38, 0.88, 1.4].map((y) => (
          <Box
            key={y}
            p={[0, y, -0.01]}
            s={[1.1, 0.07, 0.73]}
            color="#a07b51"
          />
        ))}
        {Array.from({ length: 10 }, (_, i) => (
          <Box
            key={i}
            p={[-0.42 + (i % 5) * 0.2, 0.58 + Math.floor(i / 5) * 0.52, -0.12]}
            s={[0.11, 0.4 + (i % 4) * 0.06, 0.3]}
            color={
              ['#705945', '#596858', '#8d644d', '#4d5a68', '#7a4e3c'][i % 5]
            }
            rotation={[0, 0, i === 0 ? 0.12 : 0]}
          />
        ))}
        {Array.from({ length: 4 }, (_, i) => (
          <Box
            key={`top-${i}`}
            p={[-0.32 + i * 0.2, 1.18, -0.1]}
            s={[0.1, 0.38 + (i % 2) * 0.08, 0.28]}
            color={['#6a5848', '#4f6758', '#8a5a44', '#5a4e68'][i]}
          />
        ))}
      </group>
      <group position={[4.35, 0.02, -2.15]}>
        <Box p={[0, 0.42, 0]} s={[0.85, 0.84, 0.48]} color="#6e5136" />
        <Box p={[0, 0.86, 0]} s={[0.9, 0.08, 0.52]} color="#8a6844" />
        {[-0.2, 0.18].map((x, i) => (
          <Box
            key={x}
            p={[x, 1.12, 0]}
            s={[0.28, 0.42, 0.08]}
            color={i ? '#3d4744' : '#4a4036'}
            rotation={[0, 0.08, 0]}
          />
        ))}
      </group>
      <WallClock />
      <WallMap />
      <IronStove />
      <Chandelier />
      <DustMotes />
    </>
  );
}
function Classroom({
  selected,
  onInspect,
  onHover,
  phase,
  input,
  onNearby,
}: {
  phase: ClassroomPhase;
  input: RefObject<MovementInput>;
  onNearby: (i: number | null) => void;
  selected: number | null;
  onInspect: (i: number) => void;
  onHover: (i: number | null) => void;
}) {
  return (
    <>
      <color attach="background" args={['#d4c7af']} />
      <fog attach="fog" args={['#d4c7af', 26, 52]} />
      <ambientLight intensity={0.22} />
      <hemisphereLight args={['#f3e6c8', '#6a5846', 0.48]} />
      <directionalLight
        position={[-11.5, 10.5, 1.2]}
        intensity={3.05}
        color="#fff1d0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-normalBias={0.028}
        shadow-bias={-0.00012}
        shadow-radius={2}
      />
      <directionalLight
        position={[7.5, 6.5, 9]}
        intensity={0.32}
        color="#c5d4dc"
      />
      {[-2.6, 1.5].map((z) => (
        <WindowLight key={z} z={z} />
      ))}
      <ClassroomSet />
      <Blackboard phase={phase} />
      {students.map((_, i) => (
        <group key={i}>
          {phase === 'challenge' && <Pupil index={i} />}
          <Desk
            phase={phase}
            index={i}
            selected={selected === i}
            onInspect={phase === 'challenge' ? onInspect : () => {}}
            onHover={phase === 'challenge' ? onHover : () => {}}
          />
        </group>
      ))}
      <ClassroomLife phase={phase} />
      <Explorer
        input={input}
        selected={selected}
        phase={phase}
        onNearby={onNearby}
      />
      <ContactShadows
        position={[0, -0.43, 0]}
        opacity={0.14}
        scale={25}
        blur={2.2}
        far={12}
        resolution={256}
      />
      <OrbitControls
        makeDefault
        target={[0, 1, -0.3]}
        minDistance={9}
        maxDistance={21}
        minPolarAngle={0.35}
        maxPolarAngle={1.35}
        minAzimuthAngle={-0.8}
        maxAzimuthAngle={1.5}
        enablePan={false}
      />
    </>
  );
}
export default function GaussWorld(props: {
  selected: number | null;
  onInspect: (i: number) => void;
  onHover: (i: number | null) => void;
  reset: number;
  phase: ClassroomPhase;
  input: RefObject<MovementInput>;
  onNearby: (i: number | null) => void;
}) {
  return (
    <Canvas
      key={props.reset}
      shadows={{ type: PCFShadowMap }}
      dpr={[1, 2]}
      camera={{ position: [10.5, 10, 14], fov: 43, near: 0.1, far: 80 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.04;
      }}
    >
      <Classroom {...props} />
    </Canvas>
  );
}
