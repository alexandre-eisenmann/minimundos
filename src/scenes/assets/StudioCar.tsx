import { useEffect, useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

type Point = [number, number, number];
const GOLD = '#dfad32';
const INK = '#171d21';
const SILVER = '#aeb7bd';

/** A hand-built interpretation of the 1974 LP400, not a documented TV prize.
 * Local +X is the nose. The wrapper preserves the original booth orientation.
 * Body panels, glazing and mechanical details are independent reusable meshes.
 */
function Paint() {
  return (
    <meshPhysicalMaterial
      color={GOLD}
      metalness={0.48}
      roughness={0.29}
      clearcoat={0.8}
      clearcoatRoughness={0.21}
      side={THREE.DoubleSide}
    />
  );
}
function Panel({
  points,
  color,
  glass = false,
}: {
  points: Point[];
  color?: string;
  glass?: boolean;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(points.flat(), 3),
    );
    const indices: number[] = [];
    for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {glass ? (
        <meshPhysicalMaterial
          color="#243e4c"
          roughness={0.14}
          metalness={0.4}
          clearcoat={1}
          side={THREE.DoubleSide}
        />
      ) : color ? (
        <meshStandardMaterial
          color={color}
          roughness={0.48}
          metalness={0.25}
          side={THREE.DoubleSide}
        />
      ) : (
        <Paint />
      )}
    </mesh>
  );
}
function Trim({
  points,
  radius = 0.006,
  color = INK,
}: {
  points: Point[];
  radius?: number;
  color?: string;
}) {
  const geometry = useMemo(() => {
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 1; i < points.length; i++)
      curve.add(
        new THREE.LineCurve3(
          new THREE.Vector3(...points[i - 1]),
          new THREE.Vector3(...points[i]),
        ),
      );
    return new THREE.TubeGeometry(
      curve,
      Math.max(8, points.length * 3),
      radius,
      6,
      false,
    );
  }, [points, radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} metalness={0.35} roughness={0.4} />
    </mesh>
  );
}
function Detail({
  p,
  size,
  color = INK,
  rotation = [0, 0, 0],
  metal = 0.15,
}: {
  p: Point;
  size: Point;
  color?: string;
  rotation?: Point;
  metal?: number;
}) {
  return (
    <RoundedBox
      position={p}
      args={size}
      radius={Math.min(0.018, ...size.map((v) => v * 0.2))}
      smoothness={2}
      rotation={rotation}
      castShadow
    >
      <meshStandardMaterial color={color} metalness={metal} roughness={0.35} />
    </RoundedBox>
  );
}
function Wheel({ x, side }: { x: number; side: number }) {
  return (
    <group
      position={[x, 0.355, side * 0.824]}
      rotation={[0, side < 0 ? Math.PI : 0, 0]}
    >
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.346, 0.346, 0.235, 64]} />
        <meshStandardMaterial color="#16191c" roughness={0.91} />
      </mesh>
      {[-0.08, 0.08].map((z) => (
        <mesh key={z} position={[0, 0, z]}>
          <torusGeometry args={[0.299, 0.047, 12, 64]} />
          <meshStandardMaterial color="#1e2225" roughness={0.88} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.12]}>
        <torusGeometry args={[0.224, 0.017, 10, 64]} />
        <meshStandardMaterial
          color={SILVER}
          metalness={0.85}
          roughness={0.22}
        />
      </mesh>
      <mesh position={[0, 0, 0.122]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.21, 0.21, 0.019, 48]} />
        <meshStandardMaterial
          color="#89939a"
          metalness={0.8}
          roughness={0.32}
        />
      </mesh>
      {/* Five deep circular recesses, characteristic of early cast alloy wheels. */}
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i * Math.PI * 2) / 5;
        return (
          <group
            key={i}
            position={[Math.sin(a) * 0.133, Math.cos(a) * 0.133, 0.135]}
          >
            <mesh>
              <circleGeometry args={[0.048, 24]} />
              <meshStandardMaterial color="#20282b" roughness={0.55} />
            </mesh>
            <mesh>
              <torusGeometry args={[0.049, 0.006, 6, 24]} />
              <meshStandardMaterial
                color={SILVER}
                metalness={0.8}
                roughness={0.3}
              />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 0, 0.142]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.064, 0.07, 0.028, 32]} />
        <meshStandardMaterial
          color={SILVER}
          metalness={0.85}
          roughness={0.23}
        />
      </mesh>
      <mesh position={[0, 0, 0.159]}>
        <circleGeometry args={[0.032, 24]} />
        <meshStandardMaterial color="#bfa96a" metalness={0.7} roughness={0.3} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh
          key={i}
          position={[
            Math.sin(i * Math.PI * 0.4) * 0.087,
            Math.cos(i * Math.PI * 0.4) * 0.087,
            0.138,
          ]}
        >
          <sphereGeometry args={[0.011, 8, 6]} />
          <meshStandardMaterial
            color="#e1e4e5"
            metalness={0.85}
            roughness={0.2}
          />
        </mesh>
      ))}
      {[-0.045, 0, 0.045].map((z) => (
        <mesh key={z} position={[0, 0, z]}>
          <torusGeometry args={[0.346, 0.0025, 4, 64]} />
          <meshStandardMaterial color="#090c0e" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** A single indexed strip per arch keeps the curved liner to one draw call. */
function WheelWell({ x, side }: { x: number; side: number }) {
  const geometry = useMemo(() => {
    const positions: number[] = [],
      indices: number[] = [];
    for (let i = 0; i <= 32; i++) {
      const angle = (i * Math.PI) / 32;
      for (const z of [0.838, x > 0 ? 0.775 : 0.65])
        positions.push(
          x + Math.cos(angle) * 0.401,
          0.355 + Math.sin(angle) * 0.401,
          side * z,
        );
      if (i < 32) {
        const j = i * 2;
        indices.push(j, j + 2, j + 3, j, j + 3, j + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [x, side]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color="#202326"
        roughness={0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function RegistrationPlate() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#e5ddc7';
    context.fillRect(0, 0, 256, 96);
    context.strokeStyle = '#4e514c';
    context.lineWidth = 5;
    context.strokeRect(4, 4, 248, 88);
    context.fillStyle = '#293332';
    context.font = 'bold 64px Arial';
    context.textAlign = 'center';
    context.fillText('1974', 128, 72);
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh position={[-2.001, 0.59, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[0.28, 0.105]} />
      <meshStandardMaterial map={texture} roughness={0.5} />
    </mesh>
  );
}

export function StudioCar() {
  const flank = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.96, 0.24);
    s.lineTo(-1.96, 0.75);
    s.lineTo(-1.56, 0.85);
    s.lineTo(-0.8, 0.83);
    s.lineTo(0.7, 0.78);
    s.lineTo(1.17, 0.79);
    s.lineTo(1.43, 0.74);
    s.lineTo(2.03, 0.43);
    s.lineTo(2.03, 0.24);
    s.lineTo(1.57, 0.24);
    s.lineTo(1.57, 0.355);
    s.absarc(1.17, 0.355, 0.4, 0, Math.PI, false);
    s.lineTo(0.77, 0.24);
    s.lineTo(-0.82, 0.24);
    s.lineTo(-0.82, 0.355);
    s.absarc(-1.22, 0.355, 0.4, 0, Math.PI, false);
    s.lineTo(-1.62, 0.24);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.045,
      bevelEnabled: true,
      bevelSize: 0.009,
      bevelThickness: 0.009,
      bevelSegments: 2,
      curveSegments: 24,
    });
    return g;
  }, []);
  useEffect(() => () => flank.dispose(), [flank]);
  // Longitudinal stations establish the connected shoulder and gently crowned deck.
  const stations = [
    [-1.96, 0.75, 0.76, 0.774],
    [-1.56, 0.85, 0.83, 0.874],
    [-0.8, 0.83, 0.81, 0.854],
    [0.7, 0.78, 0.79, 0.774],
    [1.17, 0.79, 0.8, 0.7032],
    [1.43, 0.74, 0.8, 0.664],
    [2.03, 0.43, 0.72, 0.454],
  ];
  const bonnet = (x: number, z: number): Point => {
    const i = stations.findIndex(
      (station, index) =>
        index < stations.length - 1 &&
        x >= station[0] &&
        x <= stations[index + 1][0],
    );
    const a = stations[i],
      b = stations[i + 1],
      t = (x - a[0]) / (b[0] - a[0]);
    const center = THREE.MathUtils.lerp(a[3], b[3], t);
    const edge = THREE.MathUtils.lerp(a[1], b[1], t);
    const innerWidth = THREE.MathUtils.lerp(a[2], b[2], t) * 0.77;
    const y = THREE.MathUtils.lerp(
      center,
      edge,
      THREE.MathUtils.clamp(
        (Math.abs(z) - innerWidth) / (0.79 - innerWidth),
        0,
        1,
      ),
    );
    return [x, y + 0.004, z];
  };
  return (
    <group rotation={[0, -Math.PI / 2, 0]}>
      <Detail p={[0, 0.235, 0]} size={[3.85, 0.07, 1.32]} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            geometry={flank}
            position={[0, 0, side > 0 ? 0.79 : -0.835]}
            castShadow
            receiveShadow
          >
            <Paint />
          </mesh>
          {stations.slice(0, -1).map(([x, y, w, crown], i) => {
            const [nx, ny, nw, nextCrown] = stations[i + 1];
            return (
              <Panel
                key={x}
                points={[
                  [x, y, side * 0.79],
                  [nx, ny, side * 0.79],
                  [nx, nextCrown, side * nw * 0.77],
                  [x, crown, side * w * 0.77],
                ]}
              />
            );
          })}
          {[-1.22, 1.17].map((x) => (
            <group key={x}>
              <Wheel x={x} side={side} />
              <WheelWell x={x} side={side} />
              <Trim
                color={GOLD}
                radius={0.007}
                points={Array.from(
                  { length: 33 },
                  (_, i): Point => [
                    x + Math.cos((i * Math.PI) / 32) * 0.406,
                    0.355 + Math.sin((i * Math.PI) / 32) * 0.406,
                    side * 0.844,
                  ],
                )}
              />
            </group>
          ))}
          <Detail
            p={[-0.02, 0.264, side * 0.824]}
            size={[1.53, 0.055, 0.055]}
          />
          {/* Scissor-door seams and recessed pull, placed on the actual flank. */}
          <Trim
            points={[
              [0.59, 0.737, side * 0.846],
              [0.58, 0.48, side * 0.846],
              [0.4, 0.31, side * 0.846],
              [-0.63, 0.31, side * 0.846],
              [-0.76, 0.7, side * 0.846],
            ]}
            radius={0.004}
            color="#6b542b"
          />
          <Detail
            p={[-0.49, 0.725, side * 0.851]}
            size={[0.14, 0.034, 0.018]}
          />
          {/* NACA-inspired inlet behind each door. */}
          <Panel
            color={INK}
            points={[
              [-0.28, 0.63, side * 0.849],
              [-0.72, 0.77, side * 0.849],
              [-0.92, 0.77, side * 0.849],
              [-0.71, 0.58, side * 0.849],
            ]}
          />
          <Trim
            points={[
              [-0.28, 0.635, side * 0.855],
              [-0.72, 0.776, side * 0.855],
              [-0.92, 0.776, side * 0.855],
            ]}
            radius={0.009}
            color={GOLD}
          />
          {/* Tapered roof pillars and inset side glass. */}
          <Panel
            points={[
              [-0.94, 0.839, side * 0.66],
              [-0.65, 1.197, side * 0.565],
              [0.03, 1.197, side * 0.565],
              [0.79, 0.778, side * 0.63],
            ]}
          />
          <Panel
            glass
            points={[
              [-0.84, 0.862, side * 0.659],
              [-0.61, 1.155, side * 0.582],
              [0.007, 1.155, side * 0.582],
              [0.663, 0.818, side * 0.638],
            ]}
          />
          <Trim
            radius={0.01}
            points={[
              [-0.84, 0.862, side * 0.663],
              [-0.61, 1.155, side * 0.586],
              [0.007, 1.155, side * 0.586],
              [0.663, 0.818, side * 0.642],
              [-0.84, 0.862, side * 0.663],
            ]}
          />
          <Trim
            radius={0.009}
            points={[
              [0.005, 1.151, side * 0.59],
              [0.18, 0.84, side * 0.65],
            ]}
          />
          <Trim
            radius={0.007}
            points={[
              [-0.78, 0.922, side * 0.65],
              [0.46, 0.919, side * 0.622],
            ]}
          />
          <Detail p={[0.41, 0.85, side * 0.77]} size={[0.06, 0.032, 0.21]} />
          <Detail
            p={[0.4, 0.891, side * 0.87]}
            size={[0.18, 0.087, 0.095]}
            color={GOLD}
          />
          <Detail
            p={[0.305, 0.891, side * 0.87]}
            size={[0.007, 0.055, 0.07]}
            color={SILVER}
            metal={0.9}
          />
          {/* Raised rear air boxes with louvred, open-looking black faces. */}
          <Panel
            points={[
              [-1.51, 0.872, side * 0.65],
              [-1.36, 1.04, side * 0.65],
              [-0.95, 1.04, side * 0.65],
              [-0.8, 0.858, side * 0.65],
            ]}
          />
          <Panel
            points={[
              [-1.36, 1.04, side * 0.65],
              [-1.36, 1.04, side * 0.44],
              [-0.95, 1.04, side * 0.44],
              [-0.95, 1.04, side * 0.65],
            ]}
          />
          <Panel
            points={[
              [-1.51, 0.872, side * 0.65],
              [-1.51, 0.872, side * 0.44],
              [-1.36, 1.04, side * 0.44],
              [-1.36, 1.04, side * 0.65],
            ]}
          />
          <Panel
            points={[
              [-1.51, 0.872, side * 0.44],
              [-1.36, 1.04, side * 0.44],
              [-0.95, 1.04, side * 0.44],
              [-0.8, 0.858, side * 0.44],
            ]}
          />
          <Panel
            color={INK}
            points={[
              [-0.95, 1.04, side * 0.65],
              [-0.95, 1.04, side * 0.44],
              [-0.8, 0.858, side * 0.44],
              [-0.8, 0.858, side * 0.65],
            ]}
          />
          {[0, 1, 2, 3].map((i) => (
            <Detail
              key={i}
              p={[-0.916 + i * 0.027, 1.003 - i * 0.033, side * 0.545]}
              size={[0.023, 0.009, 0.199]}
              color="#545650"
            />
          ))}
          {/* Flush pop-up light covers follow the bonnet slope. */}
          <Trim
            radius={0.004}
            color="#6b542b"
            points={[
              bonnet(1.21, side * 0.39),
              bonnet(1.43, side * 0.39),
              bonnet(1.61, side * 0.39),
              bonnet(1.61, side * 0.57),
              bonnet(1.43, side * 0.57),
              bonnet(1.21, side * 0.57),
              bonnet(1.21, side * 0.39),
            ]}
          />
          <Detail
            p={[2.036, 0.357, side * 0.495]}
            size={[0.025, 0.113, 0.35]}
          />
          <Detail
            p={[2.053, 0.36, side * 0.444]}
            size={[0.012, 0.075, 0.205]}
            color="#eee6c8"
            metal={0.4}
          />
          <Detail
            p={[2.054, 0.36, side * 0.603]}
            size={[0.014, 0.075, 0.08]}
            color="#d97c22"
          />
          <Detail
            p={[1.77, 0.407, side * 0.85]}
            size={[0.093, 0.043, 0.013]}
            color="#d98024"
          />
          <Detail
            p={[-1.977, 0.603, side * 0.52]}
            size={[0.032, 0.134, 0.44]}
          />
          <Detail
            p={[-1.997, 0.603, side * 0.57]}
            size={[0.014, 0.098, 0.25]}
            color="#ab2922"
          />
          <Detail
            p={[-1.997, 0.603, side * 0.378]}
            size={[0.014, 0.098, 0.115]}
            color="#d47a28"
          />
          {[0, 1].map((i) => (
            <group
              key={i}
              position={[-1.99, 0.238, side * (0.49 + i * 0.12)]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <mesh>
                <cylinderGeometry args={[0.041, 0.041, 0.19, 24]} />
                <meshStandardMaterial
                  color={SILVER}
                  metalness={0.85}
                  roughness={0.3}
                />
              </mesh>
              <mesh position={[0, 0.097, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.032, 24]} />
                <meshStandardMaterial color="#101417" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* The deck is crowned across its width, with seams at design creases. */}
      {stations.slice(0, -1).map(([x, y, w, crown], i) => {
        const [nx, ny, nw, nextCrown] = stations[i + 1];
        return (
          <Panel
            key={x}
            points={[
              [x, crown, -w * 0.77],
              [nx, nextCrown, -nw * 0.77],
              [nx, nextCrown, nw * 0.77],
              [x, crown, w * 0.77],
            ]}
          />
        );
      })}
      <Panel
        points={[
          [2.03, 0.24, -0.8],
          [2.03, 0.43, -0.79],
          [2.03, 0.454, -0.554],
          [2.03, 0.454, 0.554],
          [2.03, 0.43, 0.79],
          [2.03, 0.24, 0.8],
        ]}
      />
      <Panel
        points={[
          [-1.96, 0.24, -0.79],
          [-1.96, 0.75, -0.79],
          [-1.96, 0.774, -0.585],
          [-1.96, 0.774, 0.585],
          [-1.96, 0.75, 0.79],
          [-1.96, 0.24, 0.79],
        ]}
      />
      <Panel
        points={[
          [-0.65, 1.197, -0.565],
          [0.03, 1.197, -0.565],
          [0.03, 1.197, 0.565],
          [-0.65, 1.197, 0.565],
        ]}
      />
      <Panel
        points={[
          [0.03, 1.197, -0.565],
          [0.79, 0.778, -0.63],
          [0.79, 0.778, 0.63],
          [0.03, 1.197, 0.565],
        ]}
      />
      <Panel
        glass
        points={[
          [0.078, 1.178, -0.527],
          [0.724, 0.823, -0.593],
          [0.724, 0.823, 0.593],
          [0.078, 1.178, 0.527],
        ]}
      />
      <Trim
        radius={0.01}
        points={[
          [0.078, 1.18, -0.527],
          [0.724, 0.825, -0.593],
          [0.724, 0.825, 0.593],
          [0.078, 1.18, 0.527],
          [0.078, 1.18, -0.527],
        ]}
      />
      <Trim
        radius={0.009}
        points={[
          [0.686, 0.852, 0.31],
          [0.56, 0.923, 0.02],
          [0.405, 1.009, -0.29],
        ]}
      />
      <Panel
        points={[
          [-0.94, 0.839, -0.66],
          [-0.65, 1.197, -0.565],
          [-0.65, 1.197, 0.565],
          [-0.94, 0.839, 0.66],
        ]}
      />
      <Panel
        glass
        points={[
          [-0.916, 0.88, -0.44],
          [-0.69, 1.16, -0.39],
          [-0.69, 1.16, 0.39],
          [-0.916, 0.88, 0.44],
        ]}
      />
      <Detail
        p={[-0.41, 1.202, 0]}
        size={[0.35, 0.011, 0.17]}
        color="#655833"
      />
      {Array.from({ length: 9 }, (_, i) => (
        <Detail
          key={i}
          p={[-1.78 + i * 0.081, 0.831 + Math.min(i, 3) * 0.012, 0]}
          size={[0.042, 0.013, 0.76]}
        />
      ))}
      <Trim
        radius={0.004}
        color="#765c2b"
        points={[
          bonnet(0.84, -0.3),
          bonnet(1.17, -0.3),
          bonnet(1.43, -0.29),
          bonnet(1.82, -0.28),
          bonnet(1.82, 0.28),
          bonnet(1.43, 0.29),
          bonnet(1.17, 0.3),
          bonnet(0.84, 0.3),
        ]}
      />
      <Detail p={[1.89, 0.5, 0]} size={[0.052, 0.009, 0.043]} color="#323637" />
      <Detail p={[2.048, 0.25, 0]} size={[0.055, 0.045, 1.6]} />
      <Detail p={[2.054, 0.342, 0]} size={[0.021, 0.073, 0.51]} />
      <Detail p={[-1.983, 0.387, 0]} size={[0.05, 0.066, 1.56]} />
      <Detail
        p={[-1.987, 0.59, 0]}
        size={[0.018, 0.118, 0.28]}
        color="#d7d0b7"
      />
      <RegistrationPlate />
    </group>
  );
}
