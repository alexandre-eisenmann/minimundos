import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type Instance = {
  group: THREE.Object3D;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
};
function makeStore() {
  const entries = new Set<Instance>();
  const listeners = new Set<() => void>();
  let snapshot: Instance[] = [];
  let queued = false;
  const changed = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      snapshot = Array.from(entries);
      listeners.forEach((fn) => fn());
    });
  };
  return {
    entries,
    snapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    add: (entry: Instance) => {
      entries.add(entry);
      changed();
      return () => {
        entries.delete(entry);
        changed();
      };
    },
  };
}
const Context = createContext<ReturnType<typeof makeStore> | null>(null);
const hitGeometry = new THREE.BoxGeometry();
const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
/** Keep a cheap hit target in the original hierarchy so door clicks still bubble normally. */
export function StudioInstance({
  geometry,
  material,
  position,
  size,
  scale,
  rotation,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  position: [number, number, number];
  size: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const store = useContext(Context);
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    if (!store || !group.current) return;
    return store.add({ group: group.current, geometry, material });
  }, [store, geometry, material]);
  if (!store)
    return (
      <mesh
        position={position}
        scale={scale}
        rotation={rotation}
        geometry={geometry}
        material={material}
        dispose={null}
        castShadow
        receiveShadow
      />
    );
  return (
    <group ref={group} position={position} scale={scale} rotation={rotation}>
      <mesh
        scale={size}
        geometry={hitGeometry}
        material={hitMaterial}
        dispose={null}
      />
    </group>
  );
}
function Batches({ store }: { store: ReturnType<typeof makeStore> }) {
  const entries = useSyncExternalStore(store.subscribe, store.snapshot);
  const buckets = useMemo(() => {
    const buckets = new Map<
      string,
      {
        geometry: THREE.BufferGeometry;
        material: THREE.Material;
        entries: Instance[];
      }
    >();
    entries.forEach((entry) => {
      const key = `${entry.geometry.uuid}:${entry.material.uuid}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = {
          geometry: entry.geometry,
          material: entry.material,
          entries: [],
        };
        buckets.set(key, bucket);
      }
      bucket.entries.push(entry);
    });
    return buckets;
  }, [entries]);
  const meshes = useMemo(() => new Map<string, THREE.InstancedMesh>(), []);
  useFrame(({ scene }) => {
    scene.updateMatrixWorld(true);
    buckets.forEach((bucket, key) => {
      const mesh = meshes.get(key);
      if (!mesh) return;
      bucket.entries.forEach((entry, i) =>
        mesh.setMatrixAt(i, entry.group.matrixWorld),
      );
      mesh.instanceMatrix.needsUpdate = true;
    });
  });
  return (
    <>
      {Array.from(buckets, ([key, bucket]) => (
        <BatchMesh
          key={key}
          bucketKey={key}
          bucket={bucket}
          meshes={meshes}
        />
      ))}
    </>
  );
}
function BatchMesh({
  bucketKey,
  bucket,
  meshes,
}: {
  bucketKey: string;
  bucket: {
    geometry: THREE.BufferGeometry;
    material: THREE.Material;
    entries: Instance[];
  };
  meshes: Map<string, THREE.InstancedMesh>;
}) {
  const attach = useCallback(
    (mesh: THREE.InstancedMesh | null) => {
      const old = meshes.get(bucketKey);
      if (old && old !== mesh) old.dispose();
      if (mesh) meshes.set(bucketKey, mesh);
      else meshes.delete(bucketKey);
    },
    [bucketKey, meshes],
  );
  return (
    <instancedMesh
      ref={attach}
      args={[bucket.geometry, bucket.material, bucket.entries.length]}
      dispose={null}
      castShadow
      receiveShadow
      frustumCulled={false}
      raycast={() => {}}
    />
  );
}
export function StudioBatchProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => makeStore(), []);
  return (
    <Context.Provider value={store}>
      {children}
      <Batches store={store} />
    </Context.Provider>
  );
}
