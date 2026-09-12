import {
  Suspense,
  useMemo,
  useRef,
  type MutableRefObject,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { MovementInput } from '../../game/movement';
import { HumanCharacter } from '../assets/HumanCharacter';
import { SceneCamera } from '../assets/SceneCamera';
import {
  pointAtTime,
  sampleCurve,
  timeCurve,
  type CurvePoint,
  type TimedCurve,
} from './curveMath';

const WIDTH = 10;
const DROP = 5;
const START_X = -5;
const TOP_Y = 6.2;
const laneZ = [-3.2, 0, 3.2];
const wood = { color: '#98602f', roughness: 0.82 };

function worldPoint(point: CurvePoint, z: number): [number, number, number] {
  return [START_X + point.x * WIDTH, TOP_Y - point.y * DROP, z];
}

function Track({
  curve,
  z,
  label,
}: {
  curve: TimedCurve;
  z: number;
  label: string;
}) {
  const railGeometries = useMemo(
    () =>
      [-0.33, 0.33].map((offset) => {
        const path = new THREE.CatmullRomCurve3(
          curve.points.map(
            (point) => new THREE.Vector3(...worldPoint(point, z + offset)),
          ),
        );
        return new THREE.TubeGeometry(path, 150, 0.09, 8, false);
      }),
    [curve, z],
  );
  const labelTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 180;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#f2d597';
      context.font = '700 64px Georgia, serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(label, canvas.width / 2, canvas.height / 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, [label]);
  const ties = curve.points.filter((_, index) => index % 12 === 0);
  return (
    <group>
      {railGeometries.map((geometry, index) => (
        <mesh key={index} geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial
            {...wood}
            color={index ? '#7e4825' : '#a86c35'}
          />
        </mesh>
      ))}
      {ties.map((point, index) => {
        const next =
          curve.points[Math.min(curve.points.length - 1, index * 12 + 1)];
        const angle = Math.atan2(
          (next.y - point.y) * DROP,
          (next.x - point.x) * WIDTH,
        );
        const p = worldPoint(point, z);
        return (
          <mesh key={index} position={p} rotation={[0, 0, -angle]} castShadow>
            <boxGeometry args={[0.12, 0.1, 0.92]} />
            <meshStandardMaterial {...wood} color="#bf8245" />
          </mesh>
        );
      })}
      <mesh position={[START_X - 0.15, TOP_Y + 0.65, z]}>
        <boxGeometry args={[1.9, 0.55, 0.12]} />
        <meshStandardMaterial color="#2c4d50" roughness={0.8} />
        <mesh position={[0, 0, 0.071]}>
          <planeGeometry args={[1.72, 0.4]} />
          <meshBasicMaterial map={labelTexture} transparent toneMapped={false} />
        </mesh>
      </mesh>
    </group>
  );
}

function StartGate({ z, open }: { z: number; open: boolean }) {
  const arm = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (arm.current)
      arm.current.rotation.x = THREE.MathUtils.damp(
        arm.current.rotation.x,
        open ? -1.32 : 0,
        9,
        delta,
      );
  });
  return (
    <group position={[START_X + 0.18, TOP_Y + 0.18, z]}>
      {[-0.56, 0.56].map((offset) => (
        <mesh key={offset} position={[0, 0.28, offset]} castShadow>
          <boxGeometry args={[0.14, 0.72, 0.14]} />
          <meshStandardMaterial color="#70401f" roughness={0.9} />
        </mesh>
      ))}
      <group ref={arm}>
        <mesh position={[0, 0.34, 0]} castShadow>
          <boxGeometry args={[0.13, 0.13, 1.25]} />
          <meshStandardMaterial color="#d4a54e" roughness={0.65} />
        </mesh>
      </group>
    </group>
  );
}

function Rider({
  curve,
  z,
  variant,
  raceKey,
  onTick,
  onFinish,
}: {
  curve: TimedCurve;
  z: number;
  variant: number;
  raceKey: number;
  onTick: (time: number) => void;
  onFinish: (time: number) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const localKey = useRef(0);
  const started = useRef(0);
  const completed = useRef(false);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (raceKey !== localKey.current) {
      localKey.current = raceKey;
      started.current = clock.elapsedTime;
      completed.current = false;
    }
    const elapsed = raceKey
      ? Math.min(
          curve.duration,
          Math.max(0, clock.elapsedTime - started.current),
        )
      : 0;
    const point = pointAtTime(curve, elapsed);
    const ahead = pointAtTime(curve, Math.min(curve.duration, elapsed + 0.025));
    ref.current.position.fromArray(worldPoint(point, z));
    ref.current.rotation.z = -Math.atan2(
      (ahead.y - point.y) * DROP,
      (ahead.x - point.x) * WIDTH,
    );
    if (raceKey) onTick(elapsed);
    if (raceKey && elapsed >= curve.duration && !completed.current) {
      completed.current = true;
      onFinish(curve.duration);
    }
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[0.85, 0.12, 0.72]} />
        <meshStandardMaterial color="#cf9348" roughness={0.72} />
      </mesh>
      <group
        position={[0, 0.08, 0]}
        scale={0.58}
        rotation={[0, Math.PI / 2, 0]}
      >
        <HumanCharacter variant={variant} />
      </group>
    </group>
  );
}

function Explorer({
  input,
  paused,
}: {
  input: MutableRefObject<MovementInput>;
  paused: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  const motion = useRef(0);
  const { camera, gl } = useThree();
  useFrame((_, delta) => {
    if (!ref.current) return;
    const value = paused ? { x: 0, z: 0 } : input.current;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const side = new THREE.Vector3(-forward.z, 0, forward.x);
    const direction = side
      .multiplyScalar(value.x)
      .add(forward.multiplyScalar(-value.z));
    motion.current = direction.lengthSq() ? 1 : 0;
    if (motion.current) {
      direction.normalize();
      ref.current.position.addScaledVector(
        direction,
        Math.min(delta, 0.035) * (value.sprint ? 5.5 : 3.5),
      );
      ref.current.position.x = THREE.MathUtils.clamp(
        ref.current.position.x,
        -8,
        8,
      );
      ref.current.position.z = THREE.MathUtils.clamp(
        ref.current.position.z,
        -7,
        7,
      );
      ref.current.rotation.y = Math.atan2(direction.x, direction.z);
    }
    gl.domElement.dataset.player = ref.current.position
      .toArray()
      .map((value) => value.toFixed(2))
      .join(',');
  });
  return (
    <group ref={ref} position={[-7, 0.28, -6]}>
      <HumanCharacter variant={4} traveller motion={motion} />
    </group>
  );
}

function Workshop() {
  return (
    <>
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <boxGeometry args={[19, 0.3, 16]} />
        <meshStandardMaterial color="#b08c58" roughness={1} />
      </mesh>
      <gridHelper
        args={[18, 18, '#735a3e', '#92734d']}
        position={[0, 0.045, 0]}
      />
      {[-8.5, 8.5].map((x) => (
        <mesh key={x} position={[x, 3.1, 0]} castShadow>
          <boxGeometry args={[0.45, 6.2, 15]} />
          <meshStandardMaterial color="#795334" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.7, -7.3]} castShadow>
        <boxGeometry args={[17, 1.4, 0.5]} />
        <meshStandardMaterial color="#765033" roughness={0.95} />
      </mesh>
      {Array.from({ length: 8 }, (_, index) => (
        <mesh key={index} position={[-7 + index * 2, 0.18, 6.7]} castShadow>
          <cylinderGeometry args={[0.16, 0.22, 0.35, 10]} />
          <meshStandardMaterial color="#4e6858" roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

export default function BrachistochroneWorld({
  anchors,
  gateOpen,
  raceKey,
  input,
  paused,
  onTick,
  onFinish,
}: {
  anchors: CurvePoint[];
  gateOpen: boolean;
  raceKey: number;
  input: MutableRefObject<MovementInput>;
  paused: boolean;
  onTick: (lane: number, time: number) => void;
  onFinish: (lane: number, time: number) => void;
}) {
  const curves = useMemo(
    () =>
      (['line', 'parabola', 'custom'] as const).map((kind) =>
        timeCurve(sampleCurve(kind, anchors), WIDTH, DROP),
      ),
    [anchors],
  );
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 2]}
      orthographic
      camera={{ position: [18, 18, 22], zoom: 30, near: 0.1, far: 120 }}
    >
      <color attach="background" args={['#213f45']} />
      <fog attach="fog" args={['#213f45', 45, 92]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#f3d9ad', '#4f4937', 1.25]} />
      <directionalLight
        position={[-9, 18, 10]}
        intensity={2.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <Suspense fallback={null}>
        <Workshop />
        {curves.map((curve, lane) => (
          <group key={lane}>
            <Track
              curve={curve}
              z={laneZ[lane]}
              label={['STRAIGHT', 'PARABOLA', 'YOUR CURVE'][lane]}
            />
            <StartGate z={laneZ[lane]} open={gateOpen} />
            <Rider
              curve={curve}
              z={laneZ[lane]}
              variant={lane}
              raceKey={raceKey}
              onTick={(time) => onTick(lane, time)}
              onFinish={(time) => onFinish(lane, time)}
            />
          </group>
        ))}
        <Explorer input={input} paused={paused} />
      </Suspense>
      <SceneCamera
        resetKey={0}
        position={[18, 18, 22]}
        target={[0, 2.5, 0]}
        desktopWidth={32}
      />
    </Canvas>
  );
}
