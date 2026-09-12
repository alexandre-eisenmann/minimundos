import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';

/** Shared orthographic camera language for every minimundo. */
export function SceneCamera({
  resetKey = 0,
  target = [0, 0, 0],
  position = [20, 24, -27],
  desktopWidth = 31,
}: {
  resetKey?: number;
  target?: [number, number, number];
  position?: [number, number, number];
  desktopWidth?: number;
}) {
  const { camera, gl, size } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const [targetX, targetY, targetZ] = target;
  const [positionX, positionY, positionZ] = position;

  useEffect(() => {
    const next = new OrbitControls(camera, gl.domElement);
    next.enableDamping = true;
    next.dampingFactor = 0.08;
    next.enablePan = true;
    next.minPolarAngle = 0.32;
    next.maxPolarAngle = 1.25;
    next.minZoom = 8;
    next.maxZoom = 65;
    next.zoomSpeed = 1.2;
    next.rotateSpeed = 0.6;
    next.target.set(targetX, targetY, targetZ);
    controls.current = next;
    return () => {
      next.dispose();
      controls.current = null;
    };
  }, [camera, gl, targetX, targetY, targetZ]);

  useEffect(() => {
    const compact = window.matchMedia('(max-width: 850px)').matches;
    const portrait = compact && size.height > size.width;
    camera.position.set(positionX, positionY, positionZ);
    const orthographic = camera as THREE.OrthographicCamera;
    orthographic.zoom = Math.max(
      8,
      Math.min(
        36,
        size.width / (portrait ? 22 : compact ? 30 : desktopWidth),
        size.height / 21,
      ),
    );
    orthographic.updateProjectionMatrix();
    controls.current?.target.set(targetX, targetY, targetZ);
    controls.current?.update();
  }, [
    camera,
    desktopWidth,
    positionX,
    positionY,
    positionZ,
    resetKey,
    size.height,
    size.width,
    targetX,
    targetY,
    targetZ,
  ]);

  useFrame(() => {
    controls.current?.update();
    gl.domElement.dataset.camera = [
      ...camera.position.toArray(),
      (camera as THREE.OrthographicCamera).zoom,
    ]
      .map((value) => value.toFixed(2))
      .join(',');
  });

  return null;
}
