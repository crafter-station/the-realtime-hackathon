"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll } from "./store";

/**
 * One continuous parametric ribbon-world:
 * - starts as an infinite wire floor (the hero grid),
 * - the path bends through curves,
 * - then the floor's edges curl up and CLOSE around you into the rectangular
 *   wire tunnel (same tunnel language as before), which you fly through.
 *
 * The floor is literally the tunnel's perimeter unrolled flat; closeFactor(z)
 * rolls it back up. Everything is one static merged geometry — the camera
 * does the traveling.
 */

// World extents (along -z).
export const WORLD_Z_START = -4;
export const WORLD_Z_END = -190;

// Tunnel cross-section (matches the previous tunnel's feel).
const HW = 13; // half width
const HH = 8.5; // half height
const RECT_CY = 5.4; // rect center height so its floor stays underfoot
const FLOOR_Y = -2.8;
const FLAT_W = 58; // unrolled floor width

const RING_STEP = 2.4;
const RING_POINTS = 44;

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Curved centerline: the path bends through S-curves mid-journey. */
export function pathX(z: number): number {
  // Window where the curves live (after the hero straight, before closing).
  const w = smoothstep(-44, -58, z) * (1 - smoothstep(-84, -98, z));
  return Math.sin((z + 44) * 0.11) * 6.5 * w;
}

/** 0 = flat floor, 1 = fully closed rectangular tunnel. */
export function closeFactor(z: number): number {
  return smoothstep(-96, -118, z);
}

/** Perimeter walk of the tunnel rect, param u in [0,1], starting top-center
 *  going clockwise. The flat floor is this exact perimeter unrolled. */
function rectPoint(u: number): [number, number] {
  const P = 4 * HW + 4 * HH; // total perimeter
  let d = u * P;
  // top-center → top-right
  if (d < HW) return [d, RECT_CY + HH];
  d -= HW;
  // right side, downward
  if (d < 2 * HH) return [HW, RECT_CY + HH - d];
  d -= 2 * HH;
  // bottom, right → left
  if (d < 2 * HW) return [HW - d, RECT_CY - HH];
  d -= 2 * HW;
  // left side, upward
  if (d < 2 * HH) return [-HW, RECT_CY - HH + d];
  d -= 2 * HH;
  // top-left → top-center
  return [-HW + d, RECT_CY + HH];
}

function profilePoint(u: number, close: number): [number, number] {
  const flatX = (u - 0.5) * FLAT_W;
  const [rx, ry] = rectPoint(u);
  return [
    THREE.MathUtils.lerp(flatX, rx, close),
    THREE.MathUtils.lerp(FLOOR_Y, ry, close),
  ];
}

export function WireWorld() {
  const material = useRef<THREE.LineBasicMaterial>(null);

  const geometry = useMemo(() => {
    const rings: number[][] = [];
    for (let z = WORLD_Z_START; z >= WORLD_Z_END; z -= RING_STEP) {
      const close = closeFactor(z);
      const cx = pathX(z);
      const ring: number[] = [];
      for (let i = 0; i <= RING_POINTS; i += 1) {
        const u = i / RING_POINTS;
        const [x, y] = profilePoint(u, close);
        ring.push(cx + x, y, z);
      }
      rings.push(ring);
    }

    const positions: number[] = [];
    // Cross-section lines (each ring's consecutive points).
    for (const ring of rings) {
      for (let i = 0; i < RING_POINTS; i += 1) {
        positions.push(
          ring[i * 3],
          ring[i * 3 + 1],
          ring[i * 3 + 2],
          ring[(i + 1) * 3],
          ring[(i + 1) * 3 + 1],
          ring[(i + 1) * 3 + 2],
        );
      }
    }
    // Longitudinal rails (point i of ring k → ring k+1) — these sweep the
    // curves and the closing motion.
    for (let k = 0; k < rings.length - 1; k += 1) {
      const a = rings[k];
      const b = rings[k + 1];
      for (let i = 0; i <= RING_POINTS; i += 2) {
        positions.push(
          a[i * 3],
          a[i * 3 + 1],
          a[i * 3 + 2],
          b[i * 3],
          b[i * 3 + 1],
          b[i * 3 + 2],
        );
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(positions), 3),
    );
    return g;
  }, []);

  useFrame((_, dt) => {
    const mat = material.current;
    if (!mat) return;
    // Lines brighten with scroll speed — the dimension-travel rush.
    const v = THREE.MathUtils.clamp(Math.abs(scroll.velocity) * 0.05, 0, 1);
    const target = THREE.MathUtils.lerp(0.3, 0.75, v);
    mat.opacity = THREE.MathUtils.damp(mat.opacity, target, 4, dt);
  });

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        ref={material}
        color="#ffffff"
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </lineSegments>
  );
}
