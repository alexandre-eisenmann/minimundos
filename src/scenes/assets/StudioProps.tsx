import { useEffect, useMemo, useRef } from 'react';
import {
  useStudioBox,
  useStudioSphere,
  useStudioMaterial,
} from './studioResources';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { StudioInstance } from './StudioBatches';

type V = [number, number, number];
export function StudioBox({
  position = [0, 0, 0],
  size,
  color,
  radius = 0.06,
  metal = 0,
}: {
  position?: V;
  size: V;
  color: string;
  radius?: number;
  metal?: number;
}) {
  const geometry = useStudioBox(size, radius);
  const material = useStudioMaterial(color, metal);
  return (
    <StudioInstance
      position={position}
      size={size}
      geometry={geometry}
      material={material}
    />
  );
}

export function StudioSign({
  text,
  position,
  width,
  height = 0.6,
  color = '#ffe2a4',
  background = '#234b4b',
  fontSize = 90,
  rotation = [0, 0, 0],
}: {
  text: string;
  position: V;
  width: number;
  height?: number;
  color?: string;
  background?: string;
  fontSize?: number;
  rotation?: V;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = Math.round((512 * height) / width);
    const context = canvas.getContext('2d')!;
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `bold ${(canvas.height * 0.64 * fontSize) / 90}px Trebuchet MS, sans-serif`;
    context.fillText(text, 256, canvas.height / 2, 490);
    const next = new THREE.CanvasTexture(canvas);
    next.colorSpace = THREE.SRGBColorSpace;
    return next;
  }, [text, width, height, color, background, fontSize]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
/**
 * A numbered disc mounted across the seam of a double door, cut into one half
 * per leaf so it parts as the doors open. Each half's flat edge sits at x = 0
 * and extends towards -x (index 0) or +x (index 1); two-digit numbers put one
 * digit on each half.
 */
export function useSplitMedallion(
  text: string,
  radius: number,
  depth: number,
  color: string,
  background: string,
) {
  const width = radius * 1.12,
    height = radius * 1.22;
  const discs = useMemo(
    () =>
      [-1, 1].map((side) => {
        const shape = new THREE.Shape();
        shape.moveTo(0, -radius);
        shape.absarc(0, 0, radius, -Math.PI / 2, Math.PI / 2, side < 0);
        shape.lineTo(0, -radius);
        return new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: false,
          curveSegments: 24,
        });
      }),
    [radius, depth],
  );
  const material = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = Math.round((256 * height) / width);
    const context = canvas.getContext('2d')!;
    const mid = canvas.width / 2,
      gap = canvas.width * 0.04,
      y = canvas.height * 0.54;
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = color;
    context.textBaseline = 'middle';
    context.font = `900 ${canvas.height * 0.88}px Trebuchet MS, sans-serif`;
    if (text.length === 2) {
      context.textAlign = 'right';
      context.fillText(text[0], mid - gap, y, mid - gap * 2);
      context.textAlign = 'left';
      context.fillText(text[1], mid + gap, y, mid - gap * 2);
    } else {
      context.textAlign = 'center';
      context.fillText(text, mid, y, canvas.width - gap * 2);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map, toneMapped: false });
  }, [text, width, height, color, background]);
  const numerals = useMemo(
    () =>
      [0, 1].map((half) => {
        const geometry = new THREE.PlaneGeometry(width / 2, height);
        geometry.translate(((half ? 1 : -1) * width) / 4, 0, depth + 0.004);
        const uv = geometry.attributes.uv;
        for (let i = 0; i < uv.count; i++)
          uv.setX(i, (uv.getX(i) + half) / 2);
        return geometry;
      }),
    [width, height, depth],
  );
  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );
  useEffect(
    () => () => [...discs, ...numerals].forEach((g) => g.dispose()),
    [discs, numerals],
  );
  return { discs, numerals, numeralMaterial: material };
}
function Form({ p, s, c, r = [0, 0, 0] }: { p: V; s: V; c: string; r?: V }) {
  const geometry = useStudioSphere();
  const material = useStudioMaterial(c);
  return (
    <StudioInstance
      position={p}
      scale={s}
      rotation={r}
      size={[2, 2, 2]}
      geometry={geometry}
      material={material}
    />
  );
}
/** Soft continuous silhouette, curved horns and hooves; reusable studio prize. */
export function StudioGoat({ variant = 0 }: { variant?: number }) {
  const head = useRef<THREE.Group>(null),
    body = useRef<THREE.Group>(null),
    tail = useRef<THREE.Group>(null),
    jaw = useRef<THREE.Group>(null);
  const ears = useRef<(THREE.Group | null)[]>([]),
    eyes = useRef<(THREE.Group | null)[]>([]);
  const coat = variant % 2 ? '#e5d4af' : '#f1e7cf';
  const horn = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0.19, -0.04),
          new THREE.Vector3(0, 0.34, -0.17),
          new THREE.Vector3(0, 0.36, -0.31),
        ]),
        16,
        0.041,
        8,
        false,
      ),
    [],
  );
  useEffect(() => () => horn.dispose(), [horn]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * (1 + (variant % 7) * 0.018) + variant * 1.73;
    const nibble = Math.pow(Math.max(0, Math.sin(t * 0.31 + 0.8)), 4);
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.43) * 0.18;
      head.current.rotation.x = Math.sin(t * 0.37) * 0.055 + nibble * 0.035;
    }
    if (body.current) {
      body.current.scale.y = 1 + Math.sin(t * 1.7) * 0.014;
      body.current.rotation.z = Math.sin(t * 0.49) * 0.008;
    }
    if (jaw.current) {
      jaw.current.position.y = -0.17 - (1 + Math.sin(t * 4.8)) * 0.012 * nibble;
      jaw.current.rotation.z = Math.sin(t * 4.8) * 0.025 * nibble;
    }
    if (tail.current)
      tail.current.rotation.z =
        Math.sin(t * 2.8) * 0.12 * Math.pow(Math.max(0, Math.sin(t * 0.43)), 8);
    ears.current.forEach((ear, i) => {
      if (ear)
        ear.rotation.z =
          Math.sin(t * 7 + i) *
          0.13 *
          Math.pow(Math.max(0, Math.sin(t * 0.39 + i)), 12);
    });
    eyes.current.forEach((eye) => {
      if (eye) {
        const blink = t % 5.7;
        eye.scale.y =
          blink < 0.13 ? Math.max(0.08, Math.abs(blink - 0.065) / 0.065) : 1;
      }
    });
  });
  return (
    <group>
      <group ref={body} position={[0, 0.65, 0]}>
        <Form p={[0, 0, 0]} s={[0.37, 0.4, 0.64]} c={coat} />
      </group>
      <Form
        p={[0, 0.83, 0.4]}
        s={[0.25, 0.42, 0.3]}
        c={coat}
        r={[-0.25, 0, 0]}
      />
      {[-1, 1].flatMap((side) =>
        [-1, 1].map((end) => (
          <group key={`${side}-${end}`} position={[side * 0.24, 0, end * 0.39]}>
            <Form p={[0, 0.29, 0]} s={[0.087, 0.29, 0.096]} c={coat} />
            <StudioBox
              position={[0, 0.09, 0.02]}
              size={[0.18, 0.15, 0.22]}
              color="#53463b"
              radius={0.035}
            />
            <StudioBox
              position={[0, 0.08, 0.132]}
              size={[0.016, 0.105, 0.009]}
              color="#3c342d"
              radius={0.003}
            />
          </group>
        )),
      )}
      <group ref={tail} position={[0, 0.91, -0.57]}>
        <Form
          p={[0, 0, 0]}
          s={[0.085, 0.2, 0.095]}
          c={coat}
          r={[-0.65, 0, 0]}
        />
      </group>
      <group ref={head} position={[0, 1.04, 0.45]}>
        <Form p={[0, 0.07, 0.06]} s={[0.23, 0.3, 0.25]} c={coat} />
        <Form p={[0, -0.075, 0.25]} s={[0.19, 0.14, 0.18]} c="#d8c5a4" />
        <group ref={jaw} position={[0, -0.17, 0.26]}>
          <Form p={[0, 0, 0]} s={[0.155, 0.055, 0.145]} c="#c9b593" />
          <Form
            p={[0, -0.12, -0.055]}
            s={[0.065, 0.14, 0.07]}
            c={coat}
            r={[-0.13, 0, 0]}
          />
        </group>
        <Form
          p={[0, 0.32, 0.09]}
          s={[0.115, 0.055, 0.15]}
          c={coat}
          r={[0.2, 0, 0]}
        />
        {[-1, 1].map((side, index) => (
          <group key={side}>
            <group
              ref={(el) => {
                ears.current[index] = el;
              }}
            >
              <Form
                p={[side * 0.29, 0.14, 0.02]}
                s={[0.21, 0.075, 0.12]}
                c={coat}
                r={[0, 0, side * 0.23]}
              />
              <Form
                p={[side * 0.31, 0.153, 0.093]}
                s={[0.13, 0.035, 0.035]}
                c="#bb9c80"
                r={[0, 0, side * 0.23]}
              />
            </group>
            <group
              ref={(el) => {
                eyes.current[index] = el;
              }}
              position={[side * 0.189, 0.097, 0.191]}
            >
              <Form p={[0, 0, 0]} s={[0.054, 0.065, 0.027]} c="#715635" />
              <Form
                p={[0.001 * side, 0.002, 0.025]}
                s={[0.039, 0.013, 0.012]}
                c="#20282a"
              />
              <Form
                p={[-0.013, 0.025, 0.027]}
                s={[0.011, 0.011, 0.007]}
                c="#fff4d8"
              />
            </group>
            <Form
              p={[side * 0.073, -0.09, 0.403]}
              s={[0.022, 0.015, 0.013]}
              c="#705b4a"
            />
            <mesh
              geometry={horn}
              position={[side * 0.115, 0.28, -0.045]}
              rotation={[0, side * -0.2, side * -0.18]}
              castShadow
            >
              <meshStandardMaterial color="#a28b6b" roughness={0.9} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}
export { StudioCar } from './StudioCar';

export function TelevisionCamera() {
  return (
    <group>
      <StudioBox
        position={[0, 1.65, 0]}
        size={[0.7, 0.55, 0.9]}
        color="#4b6867"
        radius={0.05}
      />
      <StudioBox
        position={[0.43, 1.73, -0.12]}
        size={[0.25, 0.26, 0.38]}
        color="#273a3a"
      />
      <mesh
        position={[0, 1.65, -0.59]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.18, 0.22, 0.33, 24]} />
        <meshStandardMaterial color="#243436" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.65, -0.77]}>
        <circleGeometry args={[0.13, 24]} />
        <meshStandardMaterial
          color="#152930"
          metalness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.94, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.075, 1.3, 16]} />
        <meshStandardMaterial color="#b5baab" metalness={0.7} roughness={0.3} />
      </mesh>
      {[0, 2.094, 4.188].map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <StudioBox
            position={[0, 0.22, 0.29]}
            size={[0.09, 0.07, 0.68]}
            color="#61706a"
          />
          <mesh
            position={[0, 0.13, 0.6]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <cylinderGeometry args={[0.1, 0.1, 0.09, 16]} />
            <meshStandardMaterial color="#283435" />
          </mesh>
        </group>
      ))}
      <StudioBox
        position={[0, 1.99, 0]}
        size={[0.17, 0.07, 0.17]}
        color="#ae5140"
        radius={0.02}
      />
    </group>
  );
}
