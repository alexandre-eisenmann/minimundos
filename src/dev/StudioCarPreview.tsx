import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  Environment,
  Lightformer,
  ContactShadows,
} from '@react-three/drei';
import { StudioCar } from '../scenes/assets/StudioCar';

function Preview() {
  const [view, setView] = useState(0);
  const views: [number, number, number][] = [
    [5.2, 2.6, 6.2],
    [-5.4, 2.3, -5.2],
    [6.5, 1.6, 0],
    [0, 2.2, 6.5],
  ];
  return (
    <main
      style={{
        height: '100vh',
        background: '#dedbd2',
        fontFamily: 'Arial, sans-serif',
        color: '#303833',
      }}
    >
      <header style={{ position: 'absolute', zIndex: 1, left: 36, top: 30 }}>
        <div style={{ fontSize: 11, letterSpacing: 3 }}>
          MINIMUNDOS / ASSET STUDY
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 500, margin: '14px 0 8px' }}>
          1974. The wedge.
        </h1>
        <div style={{ fontSize: 13 }}>
          Countach LP400-inspired studio prize · hand-built mesh
        </div>
      </header>
      <Canvas
        key={view}
        shadows
        camera={{ position: views[view], fov: 35 }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#dedbd2']} />
        <ambientLight intensity={0.45} />
        <hemisphereLight args={['#e5f4ff', '#847458', 1]} />
        <directionalLight
          position={[3, 7, 5]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
          shadow-bias={-0.0001}
        />
        <directionalLight
          position={[-4, 3, -5]}
          intensity={1.3}
          color="#d6e5ff"
        />
        <Environment resolution={128} frames={1}>
          <Lightformer
            position={[0, 5, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[7, 4, 1]}
            intensity={0.9}
          />
          <Lightformer
            position={[4, 2, 1]}
            rotation={[0, -Math.PI / 2, 0]}
            scale={[7, 2, 1]}
            intensity={1.2}
          />
          <Lightformer
            position={[-4, 3, -3]}
            rotation={[0, Math.PI / 2, 0]}
            scale={[6, 2, 1]}
            intensity={0.9}
          />
        </Environment>
        <StudioCar />
        <ContactShadows
          opacity={0.5}
          scale={12}
          blur={2.2}
          far={3}
          resolution={512}
        />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.009, 0]}
          receiveShadow
        >
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial color="#dedbd2" roughness={0.85} />
        </mesh>
        <OrbitControls
          target={[0, 0.5, 0]}
          minDistance={3.5}
          maxDistance={12}
          maxPolarAngle={Math.PI / 2 - 0.03}
        />
      </Canvas>
      <footer
        style={{
          position: 'absolute',
          bottom: 28,
          left: 36,
          right: 36,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
        }}
      >
        <span>Drag to orbit · Scroll to inspect</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Front ¾', 'Rear ¾', 'Profile', 'Front'].map((name, i) => (
            <button
              key={name}
              onClick={() => setView(i)}
              style={{
                cursor: 'pointer',
                border: '1px solid #aaa99f',
                borderRadius: 30,
                padding: '10px 18px',
                color: view === i ? '#fff' : '#333',
                background: view === i ? '#303833' : '#eeeeea',
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <a style={{ color: 'inherit' }} href="/scenes/monty-hall">
          Back to the studio ↗
        </a>
      </footer>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Preview />);
