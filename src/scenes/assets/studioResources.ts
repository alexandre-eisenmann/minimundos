import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

type Disposable = { dispose(): void };
type Entry = {
  resource: Disposable;
  users: number;
  timer?: ReturnType<typeof setTimeout>;
};
const resources = new Map<string, Entry>();
function getResource<T extends Disposable>(key: string, create: () => T) {
  let entry = resources.get(key);
  if (!entry) { entry = { resource: create(), users: 0 }; resources.set(key, entry); }
  return entry;
}
function retain(entry: Entry, key: string) {
  clearTimeout(entry.timer);
  entry.users++;
  return () => {
    entry.users--;
    entry.timer = setTimeout(() => {
      if (entry.users === 0) { entry.resource.dispose(); resources.delete(key); }
    }, 0);
  };
}
/** Share repeated studio assets, releasing them after the last mounted user leaves. */
function useResource<T extends Disposable>(key: string, create: () => T): T {
  const entry = useMemo(() => getResource(key, create), [key, create]);
  useEffect(() => retain(entry, key), [entry, key]);
  return entry.resource as T;
}
export function useStudioBox(size: [number, number, number], radius: number) {
  const r = Math.min(radius, Math.min(...size) * 0.45);
  return useResource(
    `box:${size.join(',')}:${r}`,
    () => new RoundedBoxGeometry(...size, 2, r),
  );
}
export function useStudioSphere() {
  return useResource('sphere', () => new THREE.SphereGeometry(1, 20, 12));
}
export function useStudioMaterial(color: string, metal = 0, luminous = false) {
  return useResource(
    `material:${color}:${metal}:${luminous}`,
    () =>
      new THREE.MeshStandardMaterial({
        color,
        emissive: luminous ? '#ffca68' : '#000000',
        emissiveIntensity: luminous ? 0.7 : 0,
        roughness: metal ? 0.32 : 0.72,
        metalness: metal,
      }),
  );
}
