import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { CanvasTexture, SRGBColorSpace, Group } from 'three';
import { ClassroomLife, Explorer } from './ClassroomLife';
import type { ClassroomPhase } from './classroomMotion';
import type { MovementInput } from '../../game/movement';
import { students } from './students';
import { drawSlate, useHandwritingReady } from './handwriting';

function Box({
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
    <mesh position={p} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}
function Sphere({
  p,
  s,
  color,
}: {
  p: [number, number, number];
  s: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={p} scale={s} castShadow>
      <sphereGeometry args={[1, 20, 16]} />
      <meshStandardMaterial color={color} roughness={0.83} />
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
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[5.5, 2.4]} />
        <meshStandardMaterial map={texture} roughness={1} />
      </mesh>
      <Box p={[0, -1.34, 0.14]} s={[5.95, 0.12, 0.3]} color="#9a7148" />
      <Box p={[-1.4, -1.25, 0.2]} s={[0.22, 0.05, 0.05]} color="#eee8d7" />
      <Box p={[1.8, -1.23, 0.2]} s={[0.35, 0.09, 0.16]} color="#3c3530" />
    </group>
  );
}
function Pupil({ index }: { index: number }) {
  const student = students[index];
  const head = useRef<Group>(null);
  const arm = useRef<Group>(null);
  const reduced = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  useFrame(({ clock }) => {
    if (reduced) return;
    const t = clock.elapsedTime + index * 1.7;
    if (head.current)
      head.current.rotation.x = 0.13 + Math.sin(t * 0.65) * 0.035;
    if (arm.current) arm.current.rotation.y = Math.sin(t * 2.4) * 0.065;
  });
  return (
    <group position={[student.x, 0, student.z + 0.8]}>
      <Box p={[0, 0.51, 0.15]} s={[1.25, 0.12, 0.65]} color="#785033" />
      {[-0.48, 0.48].map((x) => (
        <Box
          key={x}
          p={[x, 0.24, 0.15]}
          s={[0.12, 0.52, 0.45]}
          color="#62432e"
        />
      ))}
      <Sphere p={[0, 0.96, 0.04]} s={[0.34, 0.46, 0.22]} color={student.coat} />
      <Box p={[0, 0.86, -0.18]} s={[0.3, 0.35, 0.05]} color="#d7c9a9" />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Box
            p={[side * 0.2, 0.42, -0.14]}
            s={[0.19, 0.6, 0.21]}
            color="#53473d"
          />
          <Sphere
            p={[side * 0.2, 0.12, -0.25]}
            s={[0.14, 0.1, 0.25]}
            color="#322c28"
          />
        </group>
      ))}
      <group ref={head} position={[0, 1.56, -0.02]}>
        <Sphere p={[0, 0, 0]} s={[0.28, 0.32, 0.255]} color="#ddb18a" />
        <Sphere
          p={[0, 0.17, 0.04]}
          s={[0.29, 0.2, 0.255]}
          color={student.hair}
        />
        <Sphere
          p={[-0.18, 0.025, -0.16]}
          s={[0.08, 0.14, 0.07]}
          color={student.hair}
        />
        <Sphere
          p={[0, -0.055, -0.255]}
          s={[0.055, 0.065, 0.06]}
          color="#d2a17c"
        />
        {[-1, 1].map((side) => (
          <group key={side}>
            <Sphere
              p={[side * 0.11, 0.025, -0.224]}
              s={[0.042, 0.047, 0.023]}
              color="#efe3cf"
            />
            <Sphere
              p={[side * 0.11, 0.023, -0.246]}
              s={[0.02, 0.026, 0.008]}
              color="#342c27"
            />
            <Sphere
              p={[side * 0.276, -0.01, 0]}
              s={[0.045, 0.07, 0.05]}
              color="#d5a47e"
            />
          </group>
        ))}
      </group>
      <group ref={arm} position={[0.28, 1.15, -0.04]}>
        <Box
          p={[0.04, -0.03, -0.23]}
          s={[0.19, 0.2, 0.55]}
          color={student.coat}
          rotation={[0.14, -0.2, 0]}
        />
        <Sphere
          p={[-0.01, -0.11, -0.52]}
          s={[0.105, 0.07, 0.13]}
          color="#ddb18a"
        />
        <Box
          p={[-0.01, -0.02, -0.54]}
          s={[0.025, 0.2, 0.025]}
          color="#ddd8bf"
          rotation={[0.1, 0, -0.3]}
        />
      </group>
      <Box
        p={[-0.29, 1.1, -0.23]}
        s={[0.18, 0.18, 0.48]}
        color={student.coat}
      />
      <Sphere
        p={[-0.28, 1.05, -0.46]}
        s={[0.11, 0.065, 0.11]}
        color="#ddb18a"
      />
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
          <meshStandardMaterial map={texture} />
        </mesh>
      </group>
      <Box
        p={[0.62, 1.06, -0.2]}
        s={[0.14, 0.07, 0.09]}
        color="#e6ddbf"
        rotation={[0, -0.3, 0]}
      />
      <mesh position={[0.67, 1.08, -0.4]} castShadow>
        <cylinderGeometry args={[0.08, 0.085, 0.1, 16]} />
        <meshStandardMaterial color="#39322b" />
      </mesh>
    </group>
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
      <color attach="background" args={['#e6dfd0']} />
      <fog attach="fog" args={['#e6dfd0', 24, 48]} />
      <ambientLight intensity={0.8} />
      <hemisphereLight args={['#fff5df', '#827461', 1.5]} />
      <directionalLight
        position={[-7, 10, 3]}
        intensity={2.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-normalBias={0.04}
      />
      <group>
        <Box p={[0, -0.22, 0]} s={[11.1, 0.4, 10.5]} color="#554334" />
        {Array.from({ length: 24 }, (_, i) => (
          <Box
            key={i}
            p={[-5.25 + i * 0.455, 0.005, 0]}
            s={[0.44, 0.07, 10.2]}
            color={['#b08a60', '#a98258', '#bc976b', '#ad855b'][i % 4]}
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
        <Box p={[0, 4.65, -4.97]} s={[11.2, 0.2, 0.3]} color="#715437" />
        <Box p={[-5.27, 4.65, 0]} s={[0.3, 0.2, 10.4]} color="#715437" />
        {[-2.6, 1.5].map((z) => (
          <group key={z} position={[-5.28, 2.85, z]}>
            <Box p={[0.04, 0, 0]} s={[0.05, 2.35, 2.42]} color="#7b6546" />
            <Box p={[0.085, 0, 0]} s={[0.06, 2.12, 2.17]} color="#b7d4ca" />
            <Box p={[0.13, 0, 0]} s={[0.08, 2.2, 0.09]} color="#e7d8b6" />
            <Box p={[0.13, 0, 0]} s={[0.08, 0.09, 2.2]} color="#e7d8b6" />
            <Box p={[0.2, -1.2, 0]} s={[0.42, 0.12, 2.6]} color="#c9b28c" />
          </group>
        ))}
        <Blackboard phase={phase} />
        <group position={[-3.95, 2.15, -4.9]}>
          <Box p={[0, 0, 0]} s={[1.2, 0.12, 0.1]} color="#785737" />
          {[-0.38, 0.05, 0.43].map((x, i) => (
            <group key={x}>
              <Box
                p={[x, -0.08, 0.12]}
                s={[0.045, 0.22, 0.13]}
                color="#504834"
              />
              <Sphere
                p={[x, -0.65, 0.15]}
                s={[0.16, 0.48, 0.08]}
                color={['#7b6650', '#6b735f', '#786453'][i]}
              />
              <Box p={[x, -0.38, 0.21]} s={[0.15, 0.1, 0.03]} color="#b09a72" />
            </group>
          ))}
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
          p={[0.7, 0.86, -3.9]}
          s={[0.035, 0.06, 0.64]}
          color="#684730"
          rotation={[0, 0.2, 0]}
        />
        <group position={[3.75, 0, -3.85]}>
          <Box p={[0, 1.08, 0]} s={[0.57, 0.94, 0.35]} color="#51483c" />
          <Box p={[0, 1.38, -0.2]} s={[0.22, 0.36, 0.04]} color="#eadfc7" />
          <Sphere p={[0, 1.88, 0]} s={[0.28, 0.34, 0.26]} color="#d0a07c" />
          <Sphere p={[0, 2.09, 0.07]} s={[0.3, 0.16, 0.23]} color="#d5cab5" />
          {[-1, 1].map((side) => (
            <group key={side}>
              <Box
                p={[side * 0.18, 0.4, 0]}
                s={[0.2, 0.8, 0.23]}
                color="#4b453b"
              />
              <Sphere
                p={[side * 0.18, 0.07, -0.08]}
                s={[0.15, 0.1, 0.27]}
                color="#302d27"
              />
              <Box
                p={[side * 0.38, 1.11, 0]}
                s={[0.18, 0.7, 0.22]}
                color="#51483c"
              />
              <Sphere
                p={[side * 0.38, 0.74, 0]}
                s={[0.09, 0.12, 0.09]}
                color="#d0a07c"
              />
              <Sphere
                p={[side * 0.105, 1.92, -0.239]}
                s={[0.02, 0.03, 0.01]}
                color="#342c27"
              />
            </group>
          ))}
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
          {Array.from({ length: 7 }, (_, i) => (
            <Box
              key={i}
              p={[-0.4 + i * 0.13, 0.65, -0.15]}
              s={[0.1, 0.42 + (i % 3) * 0.05, 0.31]}
              color={['#705945', '#596858', '#8d644d'][i % 3]}
              rotation={[0, 0, i === 0 ? 0.13 : 0]}
            />
          ))}
        </group>
        <group position={[3.8, 3.5, -4.92]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.46, 0.46, 0.1, 48]} />
            <meshStandardMaterial color="#6d4d32" />
          </mesh>
          <mesh position={[0, 0, 0.065]}>
            <circleGeometry args={[0.39, 48]} />
            <meshStandardMaterial color="#e7d9b7" />
          </mesh>
          <Box p={[0, 0.1, 0.08]} s={[0.025, 0.22, 0.02]} color="#504734" />
          <Box
            p={[0.12, 0, 0.085]}
            s={[0.25, 0.02, 0.02]}
            color="#504734"
            rotation={[0, 0, 0.4]}
          />
        </group>
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
      </group>
      <ClassroomLife phase={phase} />
      <Explorer
        input={input}
        selected={selected}
        phase={phase}
        onNearby={onNearby}
      />
      <ContactShadows
        position={[0, -0.43, 0]}
        opacity={0.25}
        scale={25}
        blur={2.5}
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
      shadows
      dpr={[1, 1.6]}
      camera={{ position: [10.5, 10, 14], fov: 43 }}
      gl={{ antialias: true }}
    >
      <Classroom {...props} />
    </Canvas>
  );
}
