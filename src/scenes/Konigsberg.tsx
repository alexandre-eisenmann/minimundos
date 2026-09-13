import type { MovementInput } from '../game/movement';
import {
  Suspense,
  useMemo,
  useRef,
  type MutableRefObject,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Tree, Waterfalls, Clouds, Birds, Boulder } from './assets/Nature';
import { WaterSurface, Ripples } from './assets/Water';
import { RiverBoat } from './assets/RiverBoat';
import { HumanCharacter } from './assets/HumanCharacter';
import { PlayerBeacon } from './assets/PlayerBeacon';
import { Townspeople } from './assets/Townspeople';
import { House, Cathedral } from './assets/Architecture';
import { SceneCamera } from './assets/SceneCamera';
import { houses, landAt, advanceCrossing, canWalk } from '../game/navigation';
import { FootstepPlayer } from '../game/sound';
import * as THREE from 'three';
import { bridges, type Region, type Point } from '../game/world';
const mat = (color: string) => ({ color, roughness: 0.85, flatShading: true });
function Box({
  p,
  s,
  c,
  ...props
}: {
  p: Point;
  s: Point;
  c: string;
  [key: string]: any;
}) {
  return (
    <mesh position={p} castShadow receiveShadow {...props}>
      <boxGeometry args={s} />
      <meshStandardMaterial {...mat(c)} />
    </mesh>
  );
}
export type Journey = { points: Point[]; key: number };
function Traveller({
  journey,
  onArrive,
  at,
  used,
  onManualCross,
  playerPosition,
  input,
  paused,
  soundEnabled,
  footsteps,
}: {
  journey: Journey;
  onArrive: () => void;
  at: Region;
  used: number[];
  onManualCross: (id: number) => void;
  playerPosition: MutableRefObject<Point>;
  input: MutableRefObject<MovementInput>;
  paused: boolean;
  soundEnabled: boolean;
  footsteps: FootstepPlayer;
}) {
  const ref = useRef<THREE.Group>(null);
  const motion = useRef(0);
  const step = useRef(0),
    key = useRef(-1),
    bridge = useRef<number | null>(null),
    bank = useRef(at);
  const { camera, gl } = useThree();
  useFrame(({ clock }, dt) => {
    if (!ref.current) return;
    const obj = ref.current;
    if (key.current !== journey.key) {
      key.current = journey.key;
      step.current = 1;
      obj.position.fromArray(journey.points[0]);
      bridge.current = null;
      bank.current = landAt(obj.position.x, obj.position.z) ?? at;
    }
    let walking = false;
    const target = journey.points[step.current];
    if (target) {
      const delta = new THREE.Vector3(...target).sub(obj.position);
      const distance = delta.length();
      const amount = Math.min(dt, 0.035) * 4.8;
      if (distance <= amount) {
        obj.position.fromArray(target);
        step.current++;
        if (step.current === journey.points.length) {
          bank.current = landAt(obj.position.x, obj.position.z) ?? at;
          onArrive();
        }
      } else {
        obj.position.add(delta.normalize().multiplyScalar(amount));
        obj.rotation.y = Math.atan2(delta.x, delta.z);
      }
      walking = true;
    } else if (!paused) {
      const { x: dx, z: dz } = input.current;
      if (dx || dz) {
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const side = new THREE.Vector3(-forward.z, 0, forward.x);
        const move = side
          .multiplyScalar(dx)
          .add(forward.multiplyScalar(-dz))
          .normalize()
          .multiplyScalar(
            Math.min(dt, 0.035) *
              Math.min(1, Math.hypot(dx, dz)) *
              (input.current.sprint ? 6 : 3.8),
          );
        const nx = obj.position.x + move.x,
          nz = obj.position.z + move.z;
        if (canWalk(nx, nz, used, bridge.current)) {
          obj.position.x = nx;
          obj.position.z = nz;
          walking = true;
        } else if (canWalk(nx, obj.position.z, used, bridge.current)) {
          obj.position.x = nx;
          walking = true;
        } else if (canWalk(obj.position.x, nz, used, bridge.current)) {
          obj.position.z = nz;
          walking = true;
        }
        obj.rotation.y = Math.atan2(move.x, move.z);
        const result = advanceCrossing(
          { bank: bank.current, bridge: bridge.current },
          obj.position.x,
          obj.position.z,
          used,
        );
        bank.current = result.bank;
        bridge.current = result.bridge;
        if (result.crossed !== null) onManualCross(result.crossed);
      }
    }
    motion.current = walking ? 1 : 0;
    footsteps.update(
      clock.elapsedTime,
      soundEnabled && walking,
      bridge.current !== null || Boolean(target && step.current === 2),
    );
    playerPosition.current = [obj.position.x, obj.position.y, obj.position.z];
    gl.domElement.dataset.player = playerPosition.current
      .map((n) => n.toFixed(3))
      .join(',');
  });
  return (
    <group ref={ref} scale={1.1}>
      <HumanCharacter traveller motion={motion} />
      <PlayerBeacon />
    </group>
  );
}
function Bridge({
  b,
  used,
  onCross,
  labelVisible,
}: {
  b: (typeof bridges)[number];
  used: boolean;
  onCross: (id: number) => void;
  labelVisible: boolean;
}) {
  const horizontal = b.id === 7;
  const length = horizontal ? b.b[0] - b.a[0] : Math.abs(b.b[2] - b.a[2]);
  const center: Point = [(b.a[0] + b.b[0]) / 2, 0.62, (b.a[2] + b.b[2]) / 2];
  return (
    <group
      position={center}
      rotation={[0, horizontal ? Math.PI / 2 : 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onCross(b.id);
      }}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = 'auto')}
    >
      <Box
        p={[0, 0, 0]}
        s={[0.83, 0.15, length + 0.2]}
        c={used ? '#bd9960' : '#d2b18a'}
      />
      {Array.from({ length: 10 }, (_, i) => (
        <Box
          key={i}
          p={[0, 0.085, -length / 2 + (i * length) / 9]}
          s={[0.8, 0.025, 0.04]}
          c="#a58b69"
        />
      ))}
      {[-0.46, 0.46].map((x) => (
        <group key={x}>
          <Box p={[x, 0.27, 0]} s={[0.065, 0.07, length + 0.25]} c="#b99772" />
          {[-1, 0, 1].map((z) => (
            <Box
              key={z}
              p={[x, 0.12, (z * length) / 2]}
              s={[0.1, 0.4, 0.1]}
              c="#ad8e69"
            />
          ))}
          <Box p={[x * 0.7, -0.28, 0]} s={[0.22, 0.55, 0.36]} c="#807d67" />
        </group>
      ))}
      {labelVisible && (
        <Html position={[0, 0.73, 0]} center zIndexRange={[20, 0]}>
          <button
            className={`bridge-marker${used ? ' crossed' : ''}`}
            title={`${b.name} · ${used ? 'Crossed' : 'Not yet crossed'}`}
            aria-label={`Cross ${b.name}${used ? ', already crossed' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onCross(b.id);
            }}
          >
            {b.id}
          </button>
        </Html>
      )}
    </group>
  );
}
function Landscape() {
  const trees = useMemo(
    () =>
      Array.from({ length: 37 }, (_, i) => ({
        x: -10.7 + ((i * 7.31) % 21.1),
        z:
          i < 21
            ? -7.65 + Math.sin(i * 5) * 0.37
            : 7.4 + Math.sin(i * 3) * 0.55,
        s: 0.5 + ((i * 7) % 11) * 0.067,
      })),
    [],
  );
  return (
    <>
      <Box p={[0, -0.7, 0]} s={[23, 1.4, 17]} c="#416366" />
      <Box p={[0, -1.43, 0]} s={[22.9, 0.1, 16.9]} c="#26454c" />
      <WaterSurface width={23} depth={17} position={[0, 0.14, 0]} />
      <Ripples />
      <Waterfalls />
      <Clouds />
      {[
        { p: [0, 0.25, -6.4], s: [23, 0.75, 4.2] },
        { p: [0, 0.25, 6.4], s: [23, 0.75, 4.2] },
        { p: [-2.5, 0.25, 0], s: [8.4, 0.75, 3.4] },
        { p: [7.95, 0.25, 0], s: [7.1, 0.75, 3.4] },
      ].map((l, i) => (
        <group key={i}>
          <Box p={l.p as Point} s={l.s as Point} c="#84966d" />
          <Box
            p={[l.p[0], 0.08, l.p[2]]}
            s={[l.s[0] + 0.08, 0.55, l.s[2] + 0.08]}
            c="#8c8970"
          />
        </group>
      ))}
      {[-5.1, 5.1].map((z) => (
        <Box key={z} p={[0, 0.641, z]} s={[22, 0.025, 0.55]} c="#c2b48b" />
      ))}
      <Box p={[-2.5, 0.641, 0]} s={[8, 0.025, 0.55]} c="#c2b48b" />
      <Box p={[8, 0.641, 0]} s={[7, 0.025, 0.55]} c="#c2b48b" />
      {trees.map((t, i) => (
        <Tree key={i} p={[t.x, 0.62, t.z]} scale={t.s} pine={i % 3 === 0} />
      ))}
      {houses.map((h, i) => (
        <House
          key={i}
          p={[h.x, 0.65, h.z]}
          s={h.s}
          rot={h.rot}
          c={['#e4c69b', '#c5b49b', '#baa188', '#d3c9ad'][i % 4]}
        />
      ))}
      <group position={[5.3, 0.64, 6.3]}>
        <Box p={[0, 0.4, 0]} s={[1.2, 0.8, 0.65]} c="#94734c" />
        <Box p={[0, 0.95, 0]} s={[1.5, 0.09, 1]} c="#b76f4b" />
        <Box p={[0, 0.82, 0]} s={[1.35, 0.09, 0.9]} c="#dbc391" />
      </group>
      <Cathedral />
      <RiverBoat channel={-3} phase={2.4} />
      <RiverBoat channel={3} phase={0.8} />
      <Birds />
      <Townspeople />
      {[-10.3, 10.4].map((x) => (
        <group key={x}>
          <Boulder p={[x, 1, -7]} scale={1.2} />
          <Tree p={[x, 0.62, 6]} scale={1.25} pine />
        </group>
      ))}
    </>
  );
}
export default function Konigsberg({
  at,
  used,
  onCross,
  journey,
  onArrive,
  resetKey,
  zoomStep,
  onManualCross,
  playerPosition,
  input,
  paused,
  labelsVisible,
  soundEnabled,
  footsteps,
}: {
  at: Region;
  used: number[];
  onCross: (id: number) => void;
  journey: Journey;
  onArrive: () => void;
  resetKey: number;
  zoomStep: number;
  onManualCross: (id: number) => void;
  playerPosition: MutableRefObject<Point>;
  input: MutableRefObject<MovementInput>;
  paused: boolean;
  labelsVisible: boolean;
  soundEnabled: boolean;
  footsteps: FootstepPlayer;
}) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 2]}
      orthographic
      camera={{ position: [20, 24, -27], zoom: 32, near: 0.1, far: 150 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#17333d']} />
      <fog attach="fog" args={['#17333d', 52, 105]} />
      <ambientLight intensity={0.4} />
      <hemisphereLight args={['#d9e7ef', '#5b6446', 1.0]} />
      <directionalLight
        position={[-10.6, 20, -7.2]}
        intensity={3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
        shadow-normalBias={0.025}
        shadow-bias={-0.0001}
        shadow-radius={2}
      />
      <Suspense fallback={null}>
        <group position={[0, -0.6, 0]}>
          <Landscape />
          {bridges.map((b) => (
            <Bridge
              key={b.id}
              b={b}
              used={used.includes(b.id)}
              onCross={onCross}
              labelVisible={labelsVisible}
            />
          ))}
          <Traveller
            journey={journey}
            onArrive={onArrive}
            at={at}
            used={used}
            onManualCross={onManualCross}
            playerPosition={playerPosition}
            input={input}
            paused={paused}
            soundEnabled={soundEnabled}
            footsteps={footsteps}
          />
        </group>
      </Suspense>
      <SceneCamera resetKey={resetKey + zoomStep} />
    </Canvas>
  );
}
