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
export const WORLD_Z_START = 10;
export const WORLD_Z_END = -215;

// Tunnel cross-section (matches the previous tunnel's feel).
const HW = 13; // half width
const HH = 8.5; // half height
const RECT_CY = 5.4; // rect center height so its floor stays underfoot
const FLOOR_Y = -2.8;
const FLAT_W = 58; // unrolled floor width

const RING_STEP = 2.4;

/**
 * Perimeter samples anchored ON the rectangle's corners, so the tunnel reads as
 * a crisp rectangle instead of a chamfered polygon. Each edge is subdivided in
 * proportion to its length.
 */
const RING_U: number[] = (() => {
  const P = 4 * HW + 4 * HH;
  const c1 = HW / P;
  const c2 = (HW + 2 * HH) / P;
  const c3 = (3 * HW + 2 * HH) / P;
  const c4 = (3 * HW + 4 * HH) / P;
  const segments: Array<[number, number]> = [
    [0, c1],
    [c1, c2],
    [c2, c3],
    [c3, c4],
    [c4, 1],
  ];
  const us: number[] = [];
  for (const [a, b] of segments) {
    const steps = Math.max(2, Math.round((b - a) * 48));
    for (let i = 0; i < steps; i += 1) us.push(a + ((b - a) * i) / steps);
  }
  us.push(1);
  return us;
})();

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Curved centerline: the path bends through S-curves mid-journey. */
export function pathX(z: number): number {
  // Window where the curves live (after the hero straight, before closing).
  const w = smoothstep(-74, -88, z) * (1 - smoothstep(-112, -126, z));
  return Math.sin((z + 74) * 0.11) * 6.5 * w;
}

/** 0 = flat floor, 1 = fully closed rectangular tunnel.
 *  The journey STARTS inside a closed tunnel, opens out to the flat plane,
 *  then closes again for the finale run. */
export function closeFactor(z: number): number {
  const opening = 1 - smoothstep(-44, -62, z);
  const closing = smoothstep(-124, -146, z);
  return Math.max(opening, closing);
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

/**
 * Ride height: centered in the tunnel's cross-section while it is closed (so
 * the view is symmetric, vanishing point dead centre), just above the plane
 * once it opens out.
 */
export function rideY(z: number): number {
  return RECT_CY * closeFactor(z);
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
      for (const u of RING_U) {
        const [x, y] = profilePoint(u, close);
        ring.push(cx + x, y, z);
      }
      rings.push(ring);
    }

    const positions: number[] = [];
    // Cross-section lines (each ring's consecutive points).
    const N = RING_U.length;
    for (const ring of rings) {
      for (let i = 0; i < N - 1; i += 1) {
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
    // Longitudinal rails (point i of ring k → ring k+1). Skipped across the
    // morph bands, where they would fan out into messy diagonals — there the
    // cross-sections alone read the shape changing.
    for (let k = 0; k < rings.length - 1; k += 1) {
      const zk = WORLD_Z_START - k * RING_STEP;
      const ck = closeFactor(zk);
      const morphing = ck > 0.03 && ck < 0.97;
      if (morphing) continue;
      const a = rings[k];
      const b = rings[k + 1];
      for (let i = 0; i < N; i += 3) {
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
