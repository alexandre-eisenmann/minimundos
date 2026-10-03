import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HumanCharacter } from '../assets/HumanCharacter';
import { PlayerBeacon } from '../assets/PlayerBeacon';
import { CircularLiftGallery } from '../assets/CircularLiftGallery';
import { SceneCamera } from '../assets/SceneCamera';
import {
  StudioBox,
  StudioCar,
  StudioGoat,
  StudioSign,
  TelevisionCamera,
} from '../assets/StudioProps';
import { FootstepPlayer } from '../../game/sound';
import type { MovementInput } from '../../game/movement';
import type { Round } from './rules';
import {
  BOOTH_BACK,
  canWalk,
  DOOR_Z,
  doorX,
  spawn,
  studioWidth,
  walkRoute,
  doorPose,
  doorRows,
  LEVEL_HEIGHT,
  liftX,
  LIFT_Z,
  LIFT_RADIUS,
  LIFT_CLEARANCE,
  GALLERY_FRONT,
  landingHalfWidth,
  nearestDoor,
  canMoveLift,
  avatarSupport,
  aboardLift,
  rowLeft,
  rowCenter,
  type FloorPoint,
} from './navigation';

export type Phase = 'pick' | 'revealing' | 'switch' | 'result' | 'tour';
export type Destination = FloorPoint & {
  serial: number;
  door?: number;
};
type Props = {
  round: Round;
  phase: Phase;
  input: RefObject<MovementInput>;
  resetKey: number;
  cameraKey: number;
  paused: boolean;
  soundEnabled: boolean;
  destination: Destination | null;
  platformCommand: { level: number; serial: number } | null;
  onAvatarLevel: (level: number) => void;
  onDoor: (door: number) => void;
  onArrive: (door: number) => void;
  onNearDoor: (door: number | null) => void;
  onNearLift: (level: number | null) => void;
  onPlatformState: (level: number, moving: boolean) => void;
  onAddDoors: () => void;
  onWalk: (point: FloorPoint) => void;
  onLocation: (door: number | null) => void;
};
const cream = '#f3dc9c',
  teal = '#276361',
  coral = '#b9573d';
function Bulb({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.065, 12, 8]} />
      <meshStandardMaterial
        color="#ffe3a1"
        emissive="#ffca68"
        emissiveIntensity={0.7}
        roughness={0.35}
      />
    </mesh>
  );
}
function DoorBooth({
  index,
  count,
  open,
  picked,
  alternative,
  final,
  prize,
  onClick,
}: {
  index: number;
  count: number;
  open: boolean;
  picked: boolean;
  alternative: boolean;
  final: boolean;
  prize: boolean;
  onClick: () => void;
}) {
  const leaves = useRef<(THREE.Group | null)[]>([]);
  const doorColor = [teal, coral, '#ba8a35'][index % 3];
  useFrame((_, delta) =>
    leaves.current.forEach((leaf, side) => {
      if (leaf)
        leaf.rotation.y = THREE.MathUtils.damp(
          leaf.rotation.y,
          open ? (side ? -1 : 1) * Math.PI * 0.47 : 0,
          4,
          delta,
        );
    }),
  );
  return (
    <group
      position={[doorX(index, count), doorPose(index, count).y, 0]}
      onClick={(event) => {
        event.stopPropagation();
        if (event.delta < 6) onClick();
      }}
    >
      <StudioBox
        position={[0, 0.095, -5.1]}
        size={[3.42, 0.15, 4.3]}
        color="#d4bd82"
      />
      <StudioBox
        position={[0, 2, BOOTH_BACK]}
        size={[3.42, 4, 0.16]}
        color="#375d58"
      />
      <StudioBox
        position={[0, 3.12, BOOTH_BACK + 0.1]}
        size={[2.9, 0.06, 0.05]}
        color="#d9bb76"
        radius={0.02}
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          <StudioBox
            position={[side * 1.69, 1.96, -5.05]}
            size={[0.18, 3.93, 4.15]}
            color="#d4bb81"
          />
          <StudioBox
            position={[side * 1.58, 1.99, DOOR_Z]}
            size={[0.21, 3.98, 0.42]}
            color={cream}
          />
          <StudioBox
            position={[side * 1.58, 1.99, DOOR_Z + 0.225]}
            size={[0.065, 3.65, 0.04]}
            color="#a7874e"
            radius={0.02}
          />
          {[0.5, 1.03, 1.56, 2.09, 2.62, 3.15, 3.68].map((y) => (
            <Bulb key={y} position={[side * 1.58, y, DOOR_Z + 0.25]} />
          ))}
        </group>
      ))}
      <StudioBox
        position={[0, 4.02, DOOR_Z - 0.18]}
        size={[3.53, 0.25, 0.85]}
        color={cream}
      />
      <StudioBox
        position={[0, 4.18, DOOR_Z - 0.18]}
        size={[3.62, 0.09, 0.88]}
        color="#ad873e"
      />
      <StudioSign
        text={`DOOR ${index + 1}`}
        position={[0, 4.035, DOOR_Z + 0.255]}
        width={2.45}
        height={0.23}
        color="#5c442d"
        background={cream}
      />
      {[-1, 1].map((side, i) => (
        <group
          key={side}
          ref={(el) => {
            leaves.current[i] = el;
          }}
          position={[side * 1.45, 0, DOOR_Z]}
        >
          <group
            position={[-side * 0.725, 0, 0]}
            onClick={(event) => {
              event.stopPropagation();
              if (event.delta < 6) onClick();
            }}
          >
            <StudioBox
              position={[0, 1.95, 0]}
              size={[1.43, 3.82, 0.14]}
              color={doorColor}
              radius={0.035}
            />
            {[-0.53, 0.53].map((x) => (
              <StudioBox
                key={x}
                position={[x, 1.95, 0.08]}
                size={[0.035, 3.4, 0.025]}
                color={cream}
                radius={0.01}
              />
            ))}
            {[0.27, 3.63].map((y) => (
              <StudioBox
                key={y}
                position={[0, y, 0.08]}
                size={[1.09, 0.035, 0.025]}
                color={cream}
                radius={0.01}
              />
            ))}
            <mesh position={[-side * 0.57, 1.55, 0.16]}>
              <sphereGeometry args={[0.07, 16, 12]} />
              <meshStandardMaterial
                color="#dbbb73"
                metalness={0.8}
                roughness={0.25}
              />
            </mesh>
          </group>
        </group>
      ))}
      {!open && (
        <group
          onClick={(event) => {
            event.stopPropagation();
            if (event.delta < 6) onClick();
          }}
        >
          <mesh
            position={[0, 2.37, DOOR_Z + 0.15]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.49, 0.49, 0.06, 48]} />
            <meshStandardMaterial color={cream} roughness={0.6} />
          </mesh>
          <StudioSign
            text={`${index + 1}`}
            position={[0, 2.37, DOOR_Z + 0.19]}
            width={0.55}
            height={0.6}
            background={cream}
            color="#5e4328"
          />
        </group>
      )}
      {(picked || alternative || final) && (
        <StudioSign
          text={
            final
              ? 'YOUR FINAL CHOICE'
              : picked
                ? 'YOUR FIRST CHOICE'
                : 'THE OTHER DOOR'
          }
          position={[0, 0.36, -2.68]}
          width={2.85}
          height={0.32}
          color={cream}
          background={picked ? '#8a4a35' : teal}
        />
      )}
      {/* Closed prizes do not render, even when the camera goes behind the set. */}
      {open && (
        <group position={[0, 0.18, -5.45]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.009, 0]}>
            <circleGeometry args={[1.35, 48]} />
            <meshStandardMaterial
              color={prize ? '#ddba65' : '#b89562'}
              roughness={0.95}
            />
          </mesh>
          <group scale={prize ? 0.76 : 1.03}>
            {prize ? <StudioCar /> : <StudioGoat variant={index} />}
          </group>
          <StudioSign
            text={prize ? 'THE GRAND PRIZE' : 'A GOAT!'}
            position={[0, 2.3, BOOTH_BACK + 5.57]}
            width={2.4}
            height={0.35}
            color={cream}
            background="#375d58"
          />
        </group>
      )}
    </group>
  );
}
const Studio = memo(function Studio({ count }: { count: number }) {
  const width = studioWidth(count);
  const crown = (doorRows(count).length - 1) * LEVEL_HEIGHT;
  const bulbs = Math.floor(width / 0.48);
  return (
    <group>
      <StudioBox
        position={[0, -0.4, 1.5]}
        size={[width, 0.8, 20.5]}
        color="#826951"
        radius={0.2}
      />
      <StudioBox
        position={[0, 0.025, 1.5]}
        size={[width - 0.15, 0.08, 20.3]}
        color="#b79263"
        radius={0.08}
      />
      <StudioBox
        position={[0, 0.09, 0.6]}
        size={[width - 0.6, 0.11, 13.5]}
        color="#e0c98f"
        radius={0.1}
      />
      {Array.from({ length: Math.round(width / 0.65) }, (_, i) => (
        <StudioBox
          key={i}
          position={[-width / 2 + 0.35 + i * 0.65, 0.084, 1.5]}
          size={[0.012, 0.012, 20]}
          color="#a3845a"
          radius={0.004}
        />
      ))}
      <StudioBox
        position={[0, 0.33, 7.08]}
        size={[width - 0.3, 0.52, 0.22]}
        color="#355b54"
      />
      <StudioBox
        position={[0, 0.55, 7.08]}
        size={[width - 0.25, 0.055, 0.26]}
        color={cream}
        radius={0.02}
      />
      {Array.from({ length: bulbs }, (_, i) => (
        <Bulb key={i} position={[-width / 2 + 0.45 + i * 0.48, 0.3, 7.21]} />
      ))}
      {/* Cutaway acoustic walls, scalloped drapery and the lighting grid. */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <StudioBox
            position={[side * (width / 2 - 0.17), 0.75, -1.5]}
            size={[0.25, 1.5, 13.5]}
            color="#56706a"
          />
          <StudioBox
            position={[side * (width / 2 - 1.3), 2.8, -6.5]}
            size={[1.6, 5.6, 0.7]}
            color={coral}
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={i}
              position={[side * (width / 2 - 1.95) + i * 0.32, 2.8, -6.05]}
              castShadow
            >
              <cylinderGeometry args={[0.22, 0.22, 5.6, 16]} />
              <meshStandardMaterial
                color={i % 2 ? '#a64b37' : '#bc5c40'}
                roughness={0.98}
              />
            </mesh>
          ))}
          <StudioBox
            position={[side * (width / 2 - 1.3), 5.7, -6.3]}
            size={[1.9, 0.22, 1.1]}
            color={cream}
          />
          <StudioBox
            position={[side * (width / 2 - 0.65), 2.9, 4]}
            size={[0.13, 5.8, 0.13]}
            color="#334b48"
          />
          <StudioBox
            position={[side * (width / 2 - 2.6), 5.8, 4]}
            size={[4, 0.12, 0.12]}
            color="#334b48"
          />
          <group
            position={[side * (width / 2 - 3.1), 5.55, 4]}
            rotation={[0.4, 0, 0]}
          >
            <StudioBox size={[0.68, 0.4, 0.65]} color="#3b4d49" />
            <mesh position={[0, -0.23, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.2, 24]} />
              <meshStandardMaterial
                color={cream}
                emissive="#edcc87"
                emissiveIntensity={0.5}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
          <group
            position={[side * (width / 2 - 2.9), 0.08, 5]}
            rotation={[0, side * 0.3, 0]}
          >
            <TelevisionCamera />
          </group>
          <StudioBox
            position={[side * (width / 2 - 2.3), 0.53, 9.8]}
            size={[3.1, 1.02, 1.1]}
            color="#31544f"
          />
          <StudioBox
            position={[side * (width / 2 - 2.3), 1.07, 9.8]}
            size={[3.22, 0.08, 1.17]}
            color="#6b5946"
          />
          {[-0.7, 0.7].map((x) => (
            <group key={x} position={[side * (width / 2 - 2.3) + x, 1.4, 9.8]}>
              <StudioBox size={[1.1, 0.65, 0.65]} color="#d4c39a" />
              <StudioSign
                text="ON AIR"
                position={[0, 0.02, 0.333]}
                width={0.87}
                height={0.4}
                background="#26423e"
                color="#a3c49d"
              />
            </group>
          ))}
        </group>
      ))}
      {[-1, 1].map((side) => (
        <StudioBox
          key={side}
          position={[
            side * (Math.min(width - 5, 17) / 2 - 0.3),
            (crown + 5.4) / 2,
            -7.3,
          ]}
          size={[0.15, crown + 5.4, 0.18]}
          color="#b69a5f"
        />
      ))}
      <StudioBox
        position={[0, crown + 5.75, -7.3]}
        size={[Math.min(width - 5, 17), 1.72, 0.34]}
        color={cream}
        radius={0.22}
      />
      <StudioSign
        text="LET’S MAKE A DEAL"
        position={[0, crown + 5.91, -7.115]}
        width={Math.min(width - 6, 15.8)}
        height={0.85}
        color={coral}
        background={cream}
      />
      <StudioSign
        text="HOLLYWOOD  ·  1975"
        position={[0, crown + 5.23, -7.115]}
        width={5.7}
        height={0.28}
        color="#6c5435"
        background={cream}
      />
      {/* Audience seated at the front, leaving a generous playable stage. */}
      {[0, 1].flatMap((row) =>
        Array.from({ length: 7 }, (_, i) => (
          <group
            key={`${row}-${i}`}
            position={[(i - 3) * 1.32, 0.11 + row * 0.23, 8.1 + row * 1.45]}
            rotation={[0, Math.PI, 0]}
          >
            <StudioBox
              position={[0, 0.42, 0]}
              size={[0.83, 0.14, 0.65]}
              color="#886143"
            />
            <StudioBox
              position={[0, 0.87, -0.31]}
              size={[0.83, 0.77, 0.13]}
              color={row ? teal : coral}
              radius={0.08}
            />
            {[-0.3, 0.3].map((x) => (
              <StudioBox
                key={x}
                position={[x, 0.24, 0]}
                size={[0.045, 0.45, 0.045]}
                color="#a08e6a"
                radius={0.01}
                metal={0.65}
              />
            ))}
            <group position={[0, 0.39, 0.05]} scale={0.88}>
              <HumanCharacter
                variant={i + row}
                coat={
                  ['#d69c37', '#397b76', '#b55d49', '#827392', '#778253'][i % 5]
                }
              />
            </group>
            {(i + row) % 3 === 0 && (
              <mesh position={[0, 1.34, 0.05]} castShadow>
                <coneGeometry args={[0.2, 0.37, 24]} />
                <meshStandardMaterial color="#d9b96f" />
              </mesh>
            )}
          </group>
        )),
      )}
      <StudioSign
        text="APPLAUSE"
        position={[0, 0.82, 10.97]}
        width={3.6}
        height={0.48}
        color={cream}
        background={teal}
      />
    </group>
  );
});

function Player({
  soundEnabled,
  count,
  open,
  input,
  destination,
  platformCommand,
  onAvatarLevel,
  resetKey,
  paused,
  onLocation,
  onNearDoor,
  onNearLift,
  onArrive,
  onLiftHeight,
  onPlatformState,
}: {
  count: number;
  open: number[];
  input: Props['input'];
  destination: Props['destination'];
  platformCommand: Props['platformCommand'];
  onAvatarLevel: Props['onAvatarLevel'];
  resetKey: number;
  paused: boolean;
  soundEnabled: boolean;
  onLocation: Props['onLocation'];
  onNearDoor: Props['onNearDoor'];
  onNearLift: Props['onNearLift'];
  onArrive: Props['onArrive'];
  onLiftHeight: (height: number) => void;
  onPlatformState: Props['onPlatformState'];
}) {
  const footsteps = useMemo(() => new FootstepPlayer(), []);
  useEffect(() => {
    const unlock = () => {
      if (soundEnabled && !paused) footsteps.unlock();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [footsteps, soundEnabled, paused]);
  useEffect(() => () => footsteps.dispose(), [footsteps]);
  const group = useRef<THREE.Group>(null),
    motion = useRef(0),
    position = useRef({ ...spawn, level: 0, y: 0.17 });
  const platformHeight = useRef(0),
    inTransit = useRef(false),
    platformTarget = useRef(0),
    verticalVelocity = useRef(0);
  const route = useRef<FloorPoint[]>([]),
    lastRoom = useRef<number | null>(null),
    lastNear = useRef<number | null>(null),
    lastLift = useRef<number | null>(null),
    arrival = useRef<number | null>(null);
  const vectors = useRef({
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    direction: new THREE.Vector3(),
  });
  useEffect(() => {
    position.current = { ...spawn, level: 0, y: 0.17 };
    route.current = [];
    arrival.current = null;
    onLocation(null);
    lastRoom.current = null;
    lastNear.current = null;
    lastLift.current = null;
    onNearDoor(null);
    onNearLift(null);
    platformHeight.current = 0;
    platformTarget.current = 0;
    verticalVelocity.current = 0;
    inTransit.current = false;
    onLiftHeight(0);
    onPlatformState(0, false);
  }, [
    resetKey,
    onLocation,
    onLiftHeight,
    onNearDoor,
    onNearLift,
    onPlatformState,
  ]);
  useEffect(() => {
    if (destination) {
      route.current = walkRoute(position.current, destination, count);
      arrival.current = destination.door ?? null;
    }
  }, [destination, count]);
  useEffect(() => {
    if (
      platformCommand &&
      !inTransit.current &&
      canMoveLift(platformHeight.current, platformCommand.level, count)
    ) {
      platformTarget.current = platformCommand.level * LEVEL_HEIGHT;
      inTransit.current = true;
      onPlatformState(Math.round(platformHeight.current / LEVEL_HEIGHT), true);
    }
  }, [platformCommand, count, onPlatformState]);
  useFrame(({ camera, gl, clock }, delta) => {
    if (!group.current) return;
    const p = position.current,
      v = vectors.current,
      target = route.current[0];
    const dt = Math.min(delta, 0.04),
      analog = input.current;
    const oldDeck = platformHeight.current;
    if (!paused && inTransit.current) {
      const distance = platformTarget.current - oldDeck;
      platformHeight.current +=
        Math.sign(distance) * Math.min(Math.abs(distance), dt * 5.2);
      onLiftHeight(platformHeight.current);
      if (Math.abs(platformHeight.current - platformTarget.current) < 0.001) {
        inTransit.current = false;
        onPlatformState(
          Math.round(platformTarget.current / LEVEL_HEIGHT),
          false,
        );
      }
    }
    let dx = 0,
      dz = 0;
    if (!paused && Math.hypot(analog.x, analog.z) > 0.05) {
      if (arrival.current !== null) onArrive(-1);
      route.current = [];
      arrival.current = null;
      camera.getWorldDirection(v.forward);
      v.forward.y = 0;
      v.forward.normalize();
      v.right.crossVectors(v.forward, camera.up).normalize();
      v.direction
        .copy(v.right)
        .multiplyScalar(analog.x)
        .addScaledVector(v.forward, -analog.z);
      dx = v.direction.x;
      dz = v.direction.z;
    } else if (!paused && target) {
      const distance = Math.hypot(target.x - p.x, target.z - p.z);
      if (distance < 0.09) {
        route.current.shift();
        if (!route.current.length && arrival.current !== null) {
          const door = arrival.current;
          arrival.current = null;
          onArrive(door);
        }
      } else {
        dx = (target.x - p.x) / distance;
        dz = (target.z - p.z) / distance;
      }
    }
    const step = dt * (analog.sprint ? 5 : 3.8),
      beforeX = p.x,
      beforeZ = p.z;
    if (
      canWalk(
        {
          x: p.x + dx * step,
          z: p.z,
          level: p.z > GALLERY_FRONT || p.y < LEVEL_HEIGHT ? 0 : p.level,
        },
        count,
        open,
        platformHeight.current,
      )
    )
      p.x += dx * step;
    if (
      canWalk(
        {
          x: p.x,
          z: p.z + dz * step,
          level: p.z > GALLERY_FRONT || p.y < LEVEL_HEIGHT ? 0 : p.level,
        },
        count,
        open,
        platformHeight.current,
      )
    )
      p.z += dz * step;
    if (!paused) {
      const support = avatarSupport(
        p,
        verticalVelocity.current,
        oldDeck,
        platformHeight.current,
        count,
        open,
        dt,
      );
      p.y = support.y;
      p.level = support.level;
      verticalVelocity.current = support.velocity;
      onAvatarLevel(p.level);
    }
    const riding =
      aboardLift(p, count) &&
      Math.abs(p.y - 0.17 - platformHeight.current) < 0.01;
    const airborne =
      verticalVelocity.current !== 0 ||
      Math.abs(p.y - 0.17 - p.level * LEVEL_HEIGHT) > 0.01;
    motion.current = Math.hypot(p.x - beforeX, p.z - beforeZ) > 0.001 ? 1 : 0;
    footsteps.update(
      clock.elapsedTime,
      Boolean(motion.current) &&
        soundEnabled &&
        !paused &&
        !document.hidden &&
        !airborne,
      true,
    );
    group.current.position.set(p.x, p.y, p.z);
    if (motion.current) group.current.rotation.y = Math.atan2(dx, dz);
    const room =
      p.z < DOOR_Z - 0.6
        ? (open.find(
            (i) =>
              doorPose(i, count).level === p.level &&
              Math.abs(p.x - doorX(i, count)) < 1.25,
          ) ?? null)
        : null;
    if (room !== lastRoom.current) {
      lastRoom.current = room;
      onLocation(room);
    }
    const near = airborne ? null : nearestDoor(p, count);
    if (near !== lastNear.current) {
      lastNear.current = near;
      onNearDoor(near);
    }
    const nearLift =
      !airborne &&
      !inTransit.current &&
      doorRows(count).length > 1 &&
      Math.abs(platformHeight.current - p.level * LEVEL_HEIGHT) < 0.01 &&
      Math.hypot(p.x - liftX(count), p.z - LIFT_Z) < LIFT_RADIUS - 0.2
        ? p.level
        : null;
    if (nearLift !== lastLift.current) {
      lastLift.current = nearLift;
      onNearLift(nearLift);
    }
    gl.domElement.dataset.avatar = `${p.x.toFixed(2)},${p.z.toFixed(2)},${p.level},${p.y.toFixed(2)}`;
    gl.domElement.dataset.lift = platformHeight.current.toFixed(2);
    gl.domElement.dataset.riding = String(Boolean(riding));
  });
  return (
    <group ref={group}>
      <HumanCharacter traveller coat="#448c92" motion={motion} />
      <PlayerBeacon />
    </group>
  );
}
function Host({ target }: { target: FloorPoint }) {
  const group = useRef<THREE.Group>(null),
    motion = useRef(0);
  useFrame((_, delta) => {
    if (!group.current) return;
    const p = group.current.position,
      dx = target.x - p.x,
      dz = target.z - p.z;
    motion.current = Math.hypot(dx, dz) > 0.12 ? 0.65 : 0;
    p.x = THREE.MathUtils.damp(p.x, target.x, 2.5, delta);
    p.z = THREE.MathUtils.damp(p.z, target.z, 2.5, delta);
    group.current.rotation.y = motion.current ? Math.atan2(dx, dz) : 0;
  });
  return (
    <group ref={group} position={[target.x, 0.17, target.z]} scale={1.1}>
      <HumanCharacter variant={4} coat="#733c2c" motion={motion} />
      <group position={[0.29, 0.43, 0.16]} rotation={[0.25, 0, -0.3]}>
        <mesh>
          <cylinderGeometry args={[0.018, 0.018, 0.31, 12]} />
          <meshStandardMaterial
            color="#b9b4a3"
            metalness={0.8}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[0, 0.17, 0]}>
          <sphereGeometry args={[0.05, 16, 12]} />
          <meshStandardMaterial color="#2e3838" />
        </mesh>
      </group>
    </group>
  );
}
function Galleries({
  count,
  onWalk,
}: {
  count: number;
  onWalk: Props['onWalk'];
}) {
  const rows = doorRows(count),
    right = (rows[0] * 3.65) / 2 + 0.2;
  return (
    <group>
      {rows.slice(1).map((size, index) => {
        const level = index + 1,
          y = level * LEVEL_HEIGHT,
          left = rowLeft(count, level),
          center = rowCenter(count, level);
        return (
          <group key={level}>
            <StudioBox
              position={[center, y - 0.12, -5.2]}
              size={[size * 3.65 + 0.2, 0.28, 4.5]}
              color="#b7a071"
            />
            <CircularLiftGallery
              left={left}
              right={right}
              back={-2.7}
              front={GALLERY_FRONT}
              liftZ={LIFT_Z}
              radius={LIFT_RADIUS + LIFT_CLEARANCE}
              height={y}
              onClick={(event) => {
                event.stopPropagation();
                if (event.delta < 6)
                  onWalk({ x: event.point.x, z: event.point.z, level });
              }}
            />
            {[
              [left, -landingHalfWidth],
              [landingHalfWidth, right],
            ].map(([start, end]) => (
              <group key={start}>
                <StudioBox
                  position={[(start + end) / 2, y - 0.18, GALLERY_FRONT]}
                  size={[end - start, 0.22, 0.08]}
                  color="#244c48"
                />
                <StudioBox
                  position={[(start + end) / 2, y + 0.13, GALLERY_FRONT]}
                  size={[end - start, 0.04, 0.05]}
                  color="#cfb675"
                  metal={0.5}
                />
              </group>
            ))}
            {[
              [left, -landingHalfWidth],
              [landingHalfWidth, right],
            ].map(([start, end]) => (
              <StudioBox
                key={start}
                position={[(start + end) / 2, y + 0.72, -0.43]}
                size={[end - start, 0.055, 0.055]}
                color="#bdac83"
                metal={0.5}
              />
            ))}
            {Array.from(
              { length: Math.ceil((right - left) / 1.7) },
              (_, i) => left + 0.3 + i * 1.7,
            )
              .filter((x) => Math.abs(x) > landingHalfWidth)
              .map((x) => (
                <StudioBox
                  key={x}
                  position={[x, y + 0.4, -0.43]}
                  size={[0.04, 0.8, 0.04]}
                  color="#8f957d"
                  metal={0.4}
                />
              ))}
            {[-landingHalfWidth, landingHalfWidth].map((x) => (
              <group key={x} position={[x, y, -0.43]}>
                <StudioBox
                  position={[0, 0.46, 0]}
                  size={[0.09, 0.92, 0.09]}
                  color="#d7e5e7"
                  metal={0.6}
                />
                <Bulb position={[0, 0.97, 0]} />
              </group>
            ))}
            {[-1, 1].map((side) => (
              <StudioBox
                key={side}
                position={[
                  center + side * ((size * 3.65) / 2 - 0.16),
                  y - LEVEL_HEIGHT / 2,
                  -3.08,
                ]}
                size={[0.12, LEVEL_HEIGHT, 0.12]}
                color="#8d754d"
              />
            ))}
          </group>
        );
      })}
    </group>
  );
}
function StudioLift({
  count,
  heightRef,
  onWalk,
}: {
  count: number;
  heightRef: RefObject<number>;
  onWalk: Props['onWalk'];
}) {
  const deck = useRef<THREE.Group>(null);
  const piston = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const height = heightRef.current;
    if (deck.current) deck.current.position.y = height;
    if (piston.current) {
      piston.current.scale.y = Math.max(0.08, height);
      piston.current.position.y = height / 2;
    }
  });
  return (
    <group position={[0, 0, LIFT_Z]}>
      <mesh position={[0, 0.05, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.22, 1.48, 0.2, 64]} />
        <meshStandardMaterial
          color="#6d898e"
          metalness={0.65}
          roughness={0.25}
        />
      </mesh>
      <mesh ref={piston} castShadow receiveShadow>
        <cylinderGeometry args={[0.82, 0.82, 1, 64]} />
        <meshStandardMaterial
          color="#d8e6ec"
          metalness={0.7}
          roughness={0.19}
          emissive="#8faebd"
          emissiveIntensity={0.18}
        />
      </mesh>
      <group
        ref={deck}
        onClick={(event) => {
          event.stopPropagation();
          if (event.delta < 6)
            onWalk({
              x: 0,
              z: LIFT_Z,
              level: Math.round(heightRef.current / LEVEL_HEIGHT),
            });
        }}
      >
        <Host target={{ x: -1.25, z: -0.25 }} />
        <mesh position={[0, 0.035, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[LIFT_RADIUS, LIFT_RADIUS, 0.25, 96]} />
          <meshStandardMaterial
            color="#c6d5d9"
            metalness={0.65}
            roughness={0.24}
          />
        </mesh>
        <mesh
          position={[0, 0.17, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[LIFT_RADIUS - 0.09, 96]} />
          <meshStandardMaterial color="#b94c35" roughness={0.64} />
        </mesh>
        {[LIFT_RADIUS - 0.18, LIFT_RADIUS - 0.34].map((radius) => (
          <mesh
            key={radius}
            position={[0, 0.175, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[radius, radius + 0.045, 96]} />
            <meshStandardMaterial
              color="#ffe2a4"
              emissive="#ffc66a"
              emissiveIntensity={0.3}
            />
          </mesh>
        ))}
        <StudioSign
          text={
            doorRows(count).length > 1
              ? '↑  STUDIO LIFT  ↓'
              : 'MAKE YOUR CHOICE'
          }
          position={[0, 0.18, 0.8]}
          rotation={[-Math.PI / 2, 0, 0]}
          width={3.6}
          height={0.55}
          background="#b94c35"
          color={cream}
        />
        <StudioSign
          text="STUDIO LIFT"
          position={[0, 0.02, LIFT_RADIUS + 0.015]}
          width={2.3}
          height={0.19}
          background="#375d58"
          color={cream}
        />
      </group>
    </group>
  );
}
function StageLever({
  count,
  enabled,
  onPull,
}: {
  count: number;
  enabled: boolean;
  onPull: () => void;
}) {
  const lever = useRef<THREE.Group>(null),
    pulled = useRef(0);
  useFrame((_, dt) => {
    if (lever.current) {
      pulled.current = Math.max(0, pulled.current - dt);
      lever.current.rotation.x = THREE.MathUtils.damp(
        lever.current.rotation.x,
        pulled.current > 0 ? -0.7 : 0.35,
        8,
        dt,
      );
    }
  });
  return (
    <group
      position={[6.2, 0.17, 3.6]}
      onClick={(event) => {
        event.stopPropagation();
        if (event.delta < 6 && enabled) {
          pulled.current = 0.6;
          onPull();
        }
      }}
    >
      <StudioBox position={[0, 0.4, 0]} size={[1.08, 0.8, 0.75]} color={teal} />
      <StudioBox
        position={[0, 0.85, 0]}
        size={[1.2, 0.1, 0.88]}
        color="#ad8b4d"
        metal={0.5}
      />
      <group ref={lever} position={[0, 0.92, 0]}>
        <mesh position={[0, 0.33, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.66, 16]} />
          <meshStandardMaterial
            color="#d5c69b"
            metalness={0.75}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.14, 24, 16]} />
          <meshStandardMaterial
            color={enabled ? coral : '#655c4a'}
            roughness={0.35}
          />
        </mesh>
      </group>
      <StudioSign
        text="+ DOORS"
        position={[0, 0.45, 0.39]}
        width={0.91}
        height={0.24}
        background={teal}
        color={cream}
      />
      <StudioSign
        text={`${count} ON STAGE`}
        position={[0, 0.2, 0.39]}
        width={0.91}
        height={0.14}
        background={teal}
        color={cream}
      />
    </group>
  );
}
export default function MontyHallWorld(props: Props) {
  const {
    round,
    phase,
    input,
    resetKey,
    cameraKey,
    paused,
    destination,
    onDoor,
    onWalk,
    onLocation,
    onArrive,
    onNearDoor,
    onNearLift,
    onAddDoors,
  } = props;
  const liftHeight = useRef(0);
  const onLiftHeight = useCallback((height: number) => {
    liftHeight.current = height;
  }, []);
  const rows = doorRows(round.count);
  const height = (rows.length - 1) * LEVEL_HEIGHT;
  const allOpen = phase === 'result' || phase === 'tour';
  const open = useMemo(
    () =>
      allOpen
        ? Array.from({ length: round.count }, (_, i) => i)
        : round.revealed,
    [allOpen, round.count, round.revealed],
  );
  const width = studioWidth(round.count);
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      orthographic
      camera={{ position: [17, 21, 27], zoom: 28, near: 0.1, far: 180 }}
      dpr={[1, 2]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <color attach="background" args={['#20383b']} />
      <ambientLight intensity={0.45} />
      <hemisphereLight args={['#ffedca', '#3f5451', 0.85]} />
      <directionalLight
        position={[-12, height + 23, 24]}
        intensity={2.1}
        color="#fff0d3"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-width / 2 - 4}
        shadow-camera-right={width / 2 + 4}
        shadow-camera-top={height + 19}
        shadow-camera-bottom={-19}
        shadow-normalBias={0.035}
        shadow-bias={-0.00015}
      />
      <directionalLight
        position={[12, 8, -4]}
        intensity={0.65}
        color="#b7d7d0"
      />
      <SceneCamera
        minimumZoom={2}
        resetKey={cameraKey + resetKey * 100}
        position={[width * 0.22, height * 0.5 + width * 0.5, width * 0.95]}
        target={[0, height * 0.47 + 1, -0.5]}
        desktopWidth={width + 12}
        compactWidth={width + 13}
        portraitWidth={width + 5}
        verticalSpan={height + 25}
      />
      <Studio count={round.count} />
      {rows.length > 1 && (
        <group>
          {/* Continuous fluted end piers and a stepped cornice frame the galleries. */}
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[side * ((rows[0] * 3.65) / 2 + 0.65), 0, -4.9]}
            >
              <StudioBox
                position={[0, (height + 4.4) / 2, 0]}
                size={[0.85, height + 4.4, 4.9]}
                color="#254d49"
              />
              {[-0.26, 0, 0.26].map((x) => (
                <StudioBox
                  key={x}
                  position={[x, (height + 4.4) / 2, 2.48]}
                  size={[0.07, height + 4.4, 0.07]}
                  color="#b29a62"
                  metal={0.55}
                />
              ))}
              <StudioBox
                position={[0, 0.24, 0]}
                size={[1.12, 0.48, 5.1]}
                color="#b8a071"
              />
            </group>
          ))}
          <StudioBox
            position={[0, height + 4.48, -2.95]}
            size={[rows[0] * 3.65 + 2.8, 0.32, 0.85]}
            color="#b39964"
          />
          <StudioBox
            position={[0, height + 4.7, -2.95]}
            size={[rows[0] * 3.65 + 3.15, 0.12, 1.05]}
            color="#e0c995"
          />
        </group>
      )}
      <StudioLift count={round.count} heightRef={liftHeight} onWalk={onWalk} />
      <StageLever
        count={round.count}
        enabled={
          round.count < 50 &&
          (phase === 'pick' || phase === 'result' || phase === 'tour')
        }
        onPull={onAddDoors}
      />
      <Galleries count={round.count} onWalk={onWalk} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.16, 0]}
        onClick={(event) => {
          if (event.delta < 6) onWalk({ x: event.point.x, z: event.point.z });
        }}
      >
        <planeGeometry args={[width - 0.6, 14]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {Array.from({ length: round.count }, (_, index) => (
        <DoorBooth
          key={`${resetKey}-${index}`}
          index={index}
          count={round.count}
          open={open.includes(index)}
          picked={round.initial === index}
          alternative={phase === 'switch' && round.alternative === index}
          final={round.final === index}
          prize={round.prize === index}
          onClick={() => onDoor(index)}
        />
      ))}

      <Player
        soundEnabled={props.soundEnabled}
        count={round.count}
        open={open}
        input={input}
        destination={destination}
        platformCommand={props.platformCommand}
        onAvatarLevel={props.onAvatarLevel}
        resetKey={resetKey}
        paused={paused}
        onLocation={onLocation}
        onArrive={onArrive}
        onNearDoor={onNearDoor}
        onNearLift={onNearLift}
        onLiftHeight={onLiftHeight}
        onPlatformState={props.onPlatformState}
      />
    </Canvas>
  );
}
