import { useMemo, useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type Point = [number, number, number];
const palettes = [
  { coat: '#c46436', skin: '#e7ad79', hair: '#3d2924', accent: '#f5d48c' },
  { coat: '#287b86', skin: '#bb794f', hair: '#241f27', accent: '#ebbd61' },
  { coat: '#8b507e', skin: '#f0bf94', hair: '#783c24', accent: '#ead9b2' },
  { coat: '#557348', skin: '#8f573d', hair: '#292320', accent: '#f0c06a' },
  { coat: '#416ba0', skin: '#d99a70', hair: '#b9a99a', accent: '#e3d6bd' },
];

// Shared smooth surfaces keep silhouettes continuous even at close camera distances.
const sphere = new THREE.SphereGeometry(1, 24, 16);
function Form({
  p,
  s,
  c,
  r = [0, 0, 0],
}: {
  p: Point;
  s: Point;
  c: string;
  r?: Point;
}) {
  return (
    <mesh
      geometry={sphere}
      position={p}
      scale={s}
      rotation={r}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={c} roughness={0.76} />
    </mesh>
  );
}
function Smile() {
  const geometry = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(-0.054, 0, 0),
          new THREE.Vector3(0, -0.037, 0.018),
          new THREE.Vector3(0.058, 0.006, 0),
        ),
        12,
        0.008,
        6,
        false,
      ),
    [],
  );
  return (
    <mesh geometry={geometry} position={[0, 0.744, 0.159]}>
      <meshStandardMaterial color="#6b332a" roughness={0.9} />
    </mesh>
  );
}

/** Original storybook cast; visual reconstruction, not historical portraiture. */
export function HumanCharacter({
  variant = 0,
  motion,
  phase = 0,
  traveller = false,
  coat,
}: {
  variant?: number;
  motion?: RefObject<number>;
  phase?: number;
  traveller?: boolean;
  coat?: string;
}) {
  const palette = palettes[variant % palettes.length];
  const jacket = coat ?? palette.coat;
  const body = useRef<THREE.Group>(null),
    head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]),
    arms = useRef<(THREE.Group | null)[]>([]);
  const blend = useRef(0);
  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime + phase;
    blend.current = THREE.MathUtils.damp(
      blend.current,
      motion?.current ?? 0,
      10,
      delta,
    );
    const stride = Math.sin(t * (traveller ? 11 : 7));
    legs.current.forEach((limb, i) => {
      if (limb) limb.rotation.x = stride * (i ? -1 : 1) * 0.48 * blend.current;
    });
    arms.current.forEach((limb, i) => {
      if (limb) limb.rotation.x = stride * (i ? 1 : -1) * 0.36 * blend.current;
    });
    if (body.current) {
      body.current.position.y =
        Math.abs(Math.cos(t * (traveller ? 11 : 7))) * 0.015 * blend.current;
      body.current.rotation.z = stride * 0.025 * blend.current;
    }
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.67) * 0.09 * (1 - blend.current);
      head.current.rotation.z = Math.sin(t * 0.9) * 0.025;
    }
    const blink = t % 4.9;
    if (eyes.current)
      eyes.current.scale.y =
        blink < 0.14 ? Math.max(0.08, Math.abs(blink - 0.07) / 0.07) : 1;
  });
  return (
    <group name={`human-${traveller ? 'traveller' : variant}`}>
      {[-1, 1].map((side, i) => (
        <group
          key={side}
          ref={(el) => {
            legs.current[i] = el;
          }}
          position={[side * 0.082, 0.29, 0]}
        >
          <Form p={[0, -0.09, 0]} s={[0.066, 0.145, 0.075]} c="#38434a" />
          <Form p={[0, -0.235, 0.038]} s={[0.083, 0.052, 0.121]} c="#302b2a" />
          <Form p={[0, -0.208, 0.002]} s={[0.073, 0.059, 0.079]} c="#594033" />
        </group>
      ))}
      <group ref={body}>
        <Form p={[0, 0.443, 0]} s={[0.18, 0.224, 0.126]} c={jacket} />
        <Form
          p={[0, 0.598, 0.069]}
          s={[0.099, 0.053, 0.076]}
          c={palette.accent}
        />
        <Form
          p={[0.028, 0.53, 0.12]}
          s={[0.043, 0.084, 0.019]}
          c={palette.accent}
          r={[0, 0, -0.22]}
        />
        {[0.46, 0.385].map((y) => (
          <Form
            key={y}
            p={[0, y, 0.126]}
            s={[0.014, 0.014, 0.01]}
            c="#eabe69"
          />
        ))}
        {[-1, 1].map((side, i) => (
          <group
            key={side}
            ref={(el) => {
              arms.current[i] = el;
            }}
            position={[side * 0.164, 0.565, 0]}
            rotation={[0, 0, side * 0.12]}
          >
            <Form
              p={[side * 0.019, -0.083, 0]}
              s={[0.066, 0.13, 0.075]}
              c={jacket}
            />
            <Form
              p={[side * 0.03, -0.181, 0.008]}
              s={[0.055, 0.035, 0.059]}
              c={palette.accent}
            />
            <Form
              p={[side * 0.033, -0.222, 0.018]}
              s={[0.055, 0.063, 0.053]}
              c={palette.skin}
            />
            <Form
              p={[side * 0.004, -0.212, 0.051]}
              s={[0.025, 0.037, 0.027]}
              c={palette.skin}
            />
          </group>
        ))}
        {traveller && (
          <group>
            <Form p={[0, 0.447, -0.143]} s={[0.143, 0.162, 0.08]} c="#74503a" />
            <Form p={[0, 0.537, -0.188]} s={[0.14, 0.069, 0.051]} c="#a77b4b" />
            {[-1, 1].map((side) => (
              <Form
                key={side}
                p={[side * 0.116, 0.49, 0.086]}
                s={[0.023, 0.133, 0.035]}
                c="#74503a"
                r={[0, 0, side * -0.18]}
              />
            ))}
          </group>
        )}
        <group position={[0, 0.79, 0]} ref={head}>
          <group position={[0, -0.79, 0]}>
            <Form
              p={[0, 0.805, 0]}
              s={[0.207, 0.221, 0.176]}
              c={palette.skin}
            />
            {[-1, 1].map((side) => (
              <group key={side}>
                <Form
                  p={[side * 0.202, 0.804, 0]}
                  s={[0.044, 0.063, 0.042]}
                  c={palette.skin}
                />
                <Form
                  p={[side * 0.223, 0.806, 0.026]}
                  s={[0.018, 0.034, 0.015]}
                  c="#be755b"
                />
                <Form
                  p={[side * 0.108, 0.772, 0.131]}
                  s={[0.059, 0.041, 0.032]}
                  c={palette.skin}
                />
                <Form
                  p={[side * 0.079, 0.898 + (side === 1 ? 0.007 : 0), 0.151]}
                  s={[0.056, 0.014, 0.018]}
                  c={palette.hair}
                  r={[0, 0, side * -0.12]}
                />
              </group>
            ))}
            <group ref={eyes} position={[0, 0.845, 0]}>
              {[-1, 1].map((side) => (
                <group key={side}>
                  <Form
                    p={[side * 0.078, 0, 0.153]}
                    s={[0.051, 0.055, 0.026]}
                    c="#fff5df"
                  />
                  <Form
                    p={[side * 0.074, -0.003, 0.176]}
                    s={[0.028, 0.035, 0.012]}
                    c={variant % 2 ? '#523e2d' : '#326572'}
                  />
                  <Form
                    p={[side * 0.074, -0.002, 0.187]}
                    s={[0.017, 0.025, 0.006]}
                    c="#17242b"
                  />
                  <Form
                    p={[side * 0.074 - 0.007, 0.011, 0.193]}
                    s={[0.008, 0.009, 0.003]}
                    c="#ffffff"
                  />
                </group>
              ))}
            </group>
            <Form
              p={[0, 0.792, 0.177]}
              s={[0.039, 0.041, 0.043]}
              c={palette.skin}
            />
            <Smile />
            <Form
              p={[0, 0.96, -0.038]}
              s={[0.205, 0.098, 0.167]}
              c={palette.hair}
            />
            <Form
              p={[-0.109, 0.939, 0.073]}
              s={[0.101, 0.055, 0.093]}
              c={palette.hair}
              r={[0, 0, 0.35]}
            />
            <Form
              p={[0.05, 0.971, 0.078]}
              s={[0.137, 0.06, 0.09]}
              c={palette.hair}
              r={[0, 0, -0.2]}
            />
            {[-1, 1].map((side) => (
              <Form
                key={side}
                p={[side * 0.182, 0.876, -0.015]}
                s={[0.026, 0.076, 0.084]}
                c={palette.hair}
              />
            ))}
            {variant % 3 === 1 && (
              <Form
                p={[0, 0.936, -0.176]}
                s={[0.101, 0.092, 0.075]}
                c={palette.hair}
              />
            )}
            {variant % 3 === 2 &&
              [-1, 1].map((side) => (
                <Form
                  key={side}
                  p={[side * 0.036, 0.758, 0.177]}
                  s={[0.042, 0.019, 0.019]}
                  c={palette.hair}
                  r={[0, 0, side * 0.18]}
                />
              ))}
          </group>
        </group>
      </group>
    </group>
  );
}
