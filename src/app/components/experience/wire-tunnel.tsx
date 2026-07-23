"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll } from "./store";

const RECT_COUNT = 24;
const RECT_HALF_WIDTH = 3.6;
const RECT_HALF_HEIGHT = 2.3;
/** Fractions along each edge where an extra midpoint rail is added. */
const EDGE_MIDPOINTS = [1 / 3, 2 / 3];

const GRID_X_MIN = -30;
const GRID_X_MAX = 30;
const GRID_STEP = 1.5;
const GRID_BASE_Y = -2.2;

function clampedVelocityFactor() {
  return THREE.MathUtils.clamp(Math.abs(scroll.velocity) * 0.05, 0, 1);
}

/** Rectangular cross-sections + rails receding to a vanishing point. */
export function WireTunnel({ zStart, zEnd }: { zStart: number; zEnd: number }) {
  const material = useRef<THREE.LineBasicMaterial>(null);

  const loopsGeometry = useMemo(() => {
    const positions = new Float32Array(RECT_COUNT * 4 * 2 * 3);
    let offset = 0;
    for (let i = 0; i < RECT_COUNT; i += 1) {
      const t = i / (RECT_COUNT - 1);
      const z = THREE.MathUtils.lerp(zStart, zEnd, t);
      const hw = RECT_HALF_WIDTH;
      const hh = RECT_HALF_HEIGHT;
      const corners: Array<[number, number]> = [
        [-hw, hh],
        [hw, hh],
        [hw, -hh],
        [-hw, -hh],
      ];
      for (let c = 0; c < 4; c += 1) {
        const [ax, ay] = corners[c];
        const [bx, by] = corners[(c + 1) % 4];
        positions[offset++] = ax;
        positions[offset++] = ay;
        positions[offset++] = z;
        positions[offset++] = bx;
        positions[offset++] = by;
        positions[offset++] = z;
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [zStart, zEnd]);

  const railsGeometry = useMemo(() => {
    const hw = RECT_HALF_WIDTH;
    const hh = RECT_HALF_HEIGHT;
    const rails: Array<[number, number]> = [
      [-hw, hh],
      [hw, hh],
      [hw, -hh],
      [-hw, -hh],
    ];
    for (const t of EDGE_MIDPOINTS) {
      rails.push([-hw + 2 * hw * t, hh]); // top
      rails.push([-hw + 2 * hw * t, -hh]); // bottom
      rails.push([-hw, -hh + 2 * hh * t]); // left
      rails.push([hw, -hh + 2 * hh * t]); // right
    }
    const positions = new Float32Array(rails.length * 2 * 3);
    let offset = 0;
    for (const [x, y] of rails) {
      positions[offset++] = x;
      positions[offset++] = y;
      positions[offset++] = zStart;
      positions[offset++] = x;
      positions[offset++] = y;
      positions[offset++] = zEnd;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [zStart, zEnd]);

  useFrame((_, dt) => {
    const mat = material.current;
    if (!mat) return;
    const target = THREE.MathUtils.lerp(0.4, 0.9, clampedVelocityFactor());
    mat.opacity = THREE.MathUtils.damp(mat.opacity, target, 4, dt);
  });

  return (
    <group>
      <lineSegments geometry={loopsGeometry}>
        <lineBasicMaterial
          ref={material}
          color="#ffffff"
          transparent
          opacity={0.5}
        />
      </lineSegments>
      <lineSegments geometry={railsGeometry}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.5} />
      </lineSegments>
    </group>
  );
}

/** Infinite mathematical floor grid receding to the horizon. */
export function WireGrid({ zStart, zEnd }: { zStart: number; zEnd: number }) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.LineBasicMaterial>(null);

  const geometry = useMemo(() => {
    const xLines = Math.floor((GRID_X_MAX - GRID_X_MIN) / GRID_STEP) + 1;
    const zLines = Math.floor(Math.abs(zEnd - zStart) / GRID_STEP) + 1;
    const positions = new Float32Array((xLines + zLines) * 2 * 3);
    let offset = 0;
    // Lines parallel to z, stepping across x.
    for (let i = 0; i < xLines; i += 1) {
      const x = GRID_X_MIN + i * GRID_STEP;
      positions[offset++] = x;
      positions[offset++] = 0;
      positions[offset++] = zStart;
      positions[offset++] = x;
      positions[offset++] = 0;
      positions[offset++] = zEnd;
    }
    // Lines parallel to x, stepping across z.
    for (let i = 0; i < zLines; i += 1) {
      const z = zStart + i * GRID_STEP * Math.sign(zEnd - zStart || 1);
      positions[offset++] = GRID_X_MIN;
      positions[offset++] = 0;
      positions[offset++] = z;
      positions[offset++] = GRID_X_MAX;
      positions[offset++] = 0;
      positions[offset++] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [zStart, zEnd]);

  useFrame((state, dt) => {
    const g = group.current;
    const mat = material.current;
    if (g) {
      g.position.y =
        GRID_BASE_Y + Math.sin(state.clock.elapsedTime * 0.4) * 0.15;
    }
    if (mat) {
      const target = THREE.MathUtils.lerp(0.25, 0.6, clampedVelocityFactor());
      mat.opacity = THREE.MathUtils.damp(mat.opacity, target, 4, dt);
    }
  });

  return (
    <group ref={group} position={[0, GRID_BASE_Y, 0]}>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial
          ref={material}
          color="#ffffff"
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
