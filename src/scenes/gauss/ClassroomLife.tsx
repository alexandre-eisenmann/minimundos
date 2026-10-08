import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Shape, Vector3 } from 'three';
import { HumanCharacter } from '../assets/HumanCharacter';
import type { MovementInput } from '../../game/movement';
import {
  canExplore,
  closestSlate,
  type ClassroomPhase,
} from './classroomMotion';
import { students } from './students';

function Child({ index, phase }: { index: number; phase: ClassroomPhase }) {
  const group = useRef<Group>(null);
  const motion = useRef(1);
  const elapsed = useRef(0);
  const route = useRef(0);
  const reduced = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const s = students[index];
  const start: [number, number, number] = [-4.2 + index * 1.55, 0, 3.5];
  useFrame(({ clock }, dt) => {
    if (!group.current) return;
    if (phase === 'recess') {
      elapsed.current = 0;
      route.current = 0;
      const t = reduced
        ? index
        : clock.elapsedTime * (0.65 + index * 0.07) + index * 1.8;
      const aisle = [-4.2, -1.4, 1.4, 4.2, -1.4, 1.4][index];
      group.current.position.set(
        aisle + Math.sin(t * 0.7) * 0.09,
        0,
        0.25 + Math.sin(t) * 3.2,
      );
      group.current.rotation.y = Math.cos(t) > 0 ? 0 : Math.PI;
      motion.current = reduced ? 0 : 0.7;
    } else {
      elapsed.current += Math.min(dt, 0.05);
      const waypoints = [
        [group.current.position.x, 3.5],
        [s.x + 1.17, 3.5],
        [s.x + 1.17, s.z + 0.8],
        [s.x, s.z + 0.8],
      ];
      const target = waypoints[Math.min(route.current, 3)];
      const dx = target[0] - group.current.position.x,
        dz = target[1] - group.current.position.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.04) {
        const step = Math.min(d, dt * 3.3);
        group.current.position.x += (dx / d) * step;
        group.current.position.z += (dz / d) * step;
        group.current.rotation.y = Math.atan2(dx, dz);
        motion.current = 1;
      } else {
        route.current++;
        motion.current = 0;
      }
    }
  });
  return (
    <group ref={group} position={start} scale={1.65}>
      <HumanCharacter
        variant={index}
        coat={s.coat}
        motion={motion}
        phase={index}
      />
    </group>
  );
}
function FlyingPaper({
  index,
  ball,
  phase,
}: {
  index: number;
  ball: boolean;
  phase: ClassroomPhase;
}) {
  const group = useRef<Group>(null);
  const reduced = useMemo(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  const wing = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(0, -0.5);
    shape.lineTo(-0.43, 0.3);
    shape.lineTo(0, 0.13);
    shape.lineTo(0.43, 0.3);
    shape.lineTo(0, -0.5);
    return shape;
  }, []);
  useFrame(({ clock }, dt) => {
    if (!group.current) return;
    const t = reduced
      ? index
      : clock.elapsedTime * (ball ? 2.6 : 0.6) + index * 1.9;
    if (phase === 'recess') {
      group.current.visible = true;
      group.current.position.set(
        Math.sin(t) * 4,
        ball
          ? 0.6 + Math.abs(Math.sin(t * 0.8)) * 2.5
          : 2.6 + Math.sin(t * 0.55) * 0.6,
        Math.cos(t) * (ball ? 3.1 : 2.6),
      );
      group.current.rotation.set(
        ball ? t * 2 : -Math.PI / 2,
        ball ? t * 3 : 0,
        ball ? t : Math.atan2(Math.cos(t), -Math.sin(t)) + 0.15 * Math.sin(t),
      );
    } else {
      group.current.position.y = Math.max(
        0.12,
        group.current.position.y - dt * 3,
      );
      if (!ball) group.current.rotation.x = -Math.PI / 2;
    }
  });
  return (
    <group ref={group}>
      {ball ? (
        <mesh castShadow>
          <icosahedronGeometry args={[0.12, 0]} />
          <meshStandardMaterial color="#e3dac2" roughness={1} />
        </mesh>
      ) : (
        <>
          <mesh rotation={[0, 0.15, 0]} castShadow>
            <shapeGeometry args={[wing]} />
            <meshStandardMaterial color="#f1ead5" side={2} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0, 0.028]} rotation={[0, 0, 0.03]}>
            <boxGeometry args={[0.016, 0.65, 0.05]} />
            <meshStandardMaterial color="#d3c7a9" />
          </mesh>
        </>
      )}
    </group>
  );
}
export function ClassroomLife({ phase }: { phase: ClassroomPhase }) {
  return (
    <>
      {phase !== 'challenge' &&
        students.map((_, i) => <Child key={i} index={i} phase={phase} />)}
      {Array.from({ length: 5 }, (_, i) => (
        <FlyingPaper key={i} index={i} ball={i > 1} phase={phase} />
      ))}
    </>
  );
}
export function Explorer({
  input,
  selected,
  phase,
  onNearby,
}: {
  input: RefObject<MovementInput>;
  selected: number | null;
  phase: ClassroomPhase;
  onNearby: (i: number | null) => void;
}) {
  const group = useRef<Group>(null);
  const motion = useRef(0);
  const last = useRef<number | null>(null);
  const prior = useRef<number | null>(null);
  const goal = useRef<Vector3[]>([]);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    if (selected !== prior.current) {
      prior.current = selected;
      if (selected !== null) {
        const s = students[selected];
        goal.current =
          Math.hypot(g.position.x - s.x, g.position.z - s.z) < 2
            ? []
            : [
                new Vector3(g.position.x, 0, 3.5),
                new Vector3(s.x + 1.3, 0, 3.5),
                new Vector3(s.x + 1.3, 0, s.z + 0.1),
              ];
      }
    }
    let dx = input.current.x,
      dz = input.current.z;
    if (Math.hypot(input.current.x, input.current.z) > 0.1) goal.current = [];
    if (goal.current.length) {
      dx = goal.current[0].x - g.position.x;
      dz = goal.current[0].z - g.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.1) {
        goal.current.shift();
        dx = 0;
        dz = 0;
      } else {
        dx /= d;
        dz /= d;
      }
    }
    const speed = Math.min(dt, 0.05) * 2.5;
    if (canExplore(g.position.x + dx * speed, g.position.z))
      g.position.x += dx * speed;
    if (canExplore(g.position.x, g.position.z + dz * speed))
      g.position.z += dz * speed;
    motion.current = Math.min(1, Math.hypot(dx, dz));
    if (motion.current > 0.1) g.rotation.y = Math.atan2(dx, dz);
    const nearby =
      phase === 'challenge' ? closestSlate(g.position.x, g.position.z) : null;
    if (nearby !== last.current) {
      last.current = nearby;
      onNearby(nearby);
    }
  });
  return (
    <group ref={group} position={[4.8, 0, 3.5]} scale={1.7}>
      <HumanCharacter traveller variant={4} coat="#b28a47" motion={motion} />
      <group position={[-0.3, 0.78, 0.3]} rotation={[0, 0.2, -0.18]}>
        <mesh>
          <torusGeometry args={[0.13, 0.019, 10, 36]} />
          <meshStandardMaterial
            color="#be9552"
            metalness={0.6}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.22, 10]} />
          <meshStandardMaterial color="#5b3f29" />
        </mesh>
        <mesh>
          <circleGeometry args={[0.105, 32]} />
          <meshStandardMaterial
            color="#b8d5d5"
            transparent
            opacity={0.2}
            roughness={0.1}
            side={2}
          />
        </mesh>
      </group>
    </group>
  );
}
