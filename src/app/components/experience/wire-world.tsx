"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll } from "./store";

/**
 * The world is two independent line sets — no geometric morphing, which is what
 * made the transitions messy:
 *
 * 1. FLOOR — a wide wire grid that runs the whole journey. Flat inside the
 *    tunnels, undulating (rolling hills) across the open stretch.
 * 2. WALLS + CEILING — only present in the tunnel stretches. They fade in and
 *    out *spatially* via baked vertex colours (fading to the page black), so
 *    the tunnel simply dissolves and leaves you on the open floor.
 */

// World extents (along -z).
export const WORLD_Z_START = 10;
export const WORLD_Z_END = -215;

// Tunnel cross-section.
const HW = 13; // half width
const WALL_H = 16.4; // floor → ceiling
const EYE_TUNNEL = WALL_H / 2; // eye height inside the tunnel (centred)
const EYE_OPEN = 2.8; // eye height over the open floor
const FLOOR_Y = -2.8;

// Floor grid.
const FLOOR_HW = 34;
const STEP_X = 2.6;
const STEP_Z = 2.6;

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** 1 while inside a tunnel stretch, 0 out on the open floor. */
export function tunnelPresence(z: number): number {
  const opening = 1 - smoothstep(-28, -50, z); // the starting tunnel dissolves
  const closing = smoothstep(-126, -148, z); // the finale tunnel forms
  return Math.max(opening, closing);
}

/** Undulations only live on the open stretch; the floor is flat in tunnels. */
function waveWindow(z: number): number {
  return smoothstep(-48, -72, z) * (1 - smoothstep(-118, -138, z));
}

/**
 * How visible the floor is at (x, z). Inside a tunnel the floor is clipped to
 * the tunnel's own width, so the wide grid never spills past the walls (that
 * read as a second floor behind the tunnel). Fades out over ~3 units so the
 * boundary is smooth, never a hard edge.
 */
export function floorVisibility(x: number, z: number): number {
  const p = tunnelPresence(z);
  if (p < 0.002) return 1;
  const outside = smoothstep(HW - 3.2, HW + 0.4, Math.abs(x - pathX(z)));
  return 1 - p * outside;
}

/** Rolling floor height — this is what makes the ride rise and fall. */
export function floorY(x: number, z: number): number {
  const wave =
    Math.sin(z * 0.075) * 2.6 + Math.sin(z * 0.029 + x * 0.045) * 1.25;
  return FLOOR_Y + wave * waveWindow(z);
}

/** Curved centreline: the path drifts side to side across the open floor. */
export function pathX(z: number): number {
  const w = smoothstep(-64, -80, z) * (1 - smoothstep(-100, -114, z));
  return Math.sin((z + 64) * 0.1) * 6.5 * w;
}

/** Camera height: centred in the tunnel, riding just over the rolling floor. */
export function rideY(z: number): number {
  const p = tunnelPresence(z);
  return floorY(pathX(z), z) + THREE.MathUtils.lerp(EYE_OPEN, EYE_TUNNEL, p);
}

export function WireWorld() {
  const floorMat = useRef<THREE.LineBasicMaterial>(null);
  const shellMat = useRef<THREE.LineBasicMaterial>(null);

  // ---- Floor: undulating wire grid --------------------------------------
  const floorGeometry = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const seg = (ax: number, az: number, bx: number, bz: number) => {
      const va = floorVisibility(ax, az);
      const vb = floorVisibility(bx, bz);
      if (va < 0.004 && vb < 0.004) return;
      pos.push(ax, floorY(ax, az), az, bx, floorY(bx, bz), bz);
      col.push(va, va, va, vb, vb, vb);
    };

    const zCount = Math.floor((WORLD_Z_START - WORLD_Z_END) / STEP_Z);
    // Lines running along z.
    for (let x = -FLOOR_HW; x <= FLOOR_HW; x += STEP_X) {
      for (let k = 0; k < zCount; k += 1) {
        const z0 = WORLD_Z_START - k * STEP_Z;
        seg(x, z0, x, z0 - STEP_Z);
      }
    }
    // Lines running across x.
    for (let k = 0; k <= zCount; k += 1) {
      const z = WORLD_Z_START - k * STEP_Z;
      for (let x = -FLOOR_HW; x < FLOOR_HW; x += STEP_X) {
        seg(x, z, x + STEP_X, z);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(pos), 3),
    );
    g.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(col), 3),
    );
    return g;
  }, []);

  // ---- Walls + ceiling: present only in the tunnel stretches -------------
  const shellGeometry = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const push = (
      ax: number,
      ay: number,
      az: number,
      bx: number,
      by: number,
      bz: number,
    ) => {
      const ca = tunnelPresence(az);
      const cb = tunnelPresence(bz);
      if (ca < 0.004 && cb < 0.004) return;
      pos.push(ax, ay, az, bx, by, bz);
      col.push(ca, ca, ca, cb, cb, cb);
    };

    const zCount = Math.floor((WORLD_Z_START - WORLD_Z_END) / STEP_Z);
    // Cross-sections: up the left wall, across the ceiling, down the right.
    for (let k = 0; k <= zCount; k += 1) {
      const z = WORLD_Z_START - k * STEP_Z;
      if (tunnelPresence(z) < 0.004) continue;
      const cx = pathX(z);
      const base = floorY(cx, z);
      const top = base + WALL_H;
      const segs = 8;
      // left wall
      for (let i = 0; i < segs; i += 1) {
        const y0 = base + (WALL_H * i) / segs;
        const y1 = base + (WALL_H * (i + 1)) / segs;
        push(cx - HW, y0, z, cx - HW, y1, z);
      }
      // right wall
      for (let i = 0; i < segs; i += 1) {
        const y0 = base + (WALL_H * i) / segs;
        const y1 = base + (WALL_H * (i + 1)) / segs;
        push(cx + HW, y0, z, cx + HW, y1, z);
      }
      // ceiling
      const cSegs = 12;
      for (let i = 0; i < cSegs; i += 1) {
        const x0 = cx - HW + (2 * HW * i) / cSegs;
        const x1 = cx - HW + (2 * HW * (i + 1)) / cSegs;
        push(x0, top, z, x1, top, z);
      }
    }
    // Longitudinal rails along the walls and ceiling.
    const rails: Array<[number, number]> = [
      [-HW, 0],
      [-HW, 0.5],
      [-HW, 1],
      [HW, 0],
      [HW, 0.5],
      [HW, 1],
      [-0.5, 1],
      [0, 1],
      [0.5, 1],
    ];
    for (const [rx, ry] of rails) {
      for (let k = 0; k < zCount; k += 1) {
        const z0 = WORLD_Z_START - k * STEP_Z;
        const z1 = z0 - STEP_Z;
        if (tunnelPresence(z0) < 0.004 && tunnelPresence(z1) < 0.004) continue;
        const x0 = pathX(z0) + (Math.abs(rx) <= 1 ? rx * HW : rx);
        const x1 = pathX(z1) + (Math.abs(rx) <= 1 ? rx * HW : rx);
        const y0 = floorY(pathX(z0), z0) + WALL_H * ry;
        const y1 = floorY(pathX(z1), z1) + WALL_H * ry;
        push(x0, y0, z0, x1, y1, z1);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(pos), 3),
    );
    g.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(col), 3),
    );
    return g;
  }, []);

  useFrame((_, dt) => {
    // Lines brighten with scroll speed — the dimension-travel rush.
    const v = THREE.MathUtils.clamp(Math.abs(scroll.velocity) * 0.05, 0, 1);
    const target = THREE.MathUtils.lerp(0.32, 0.78, v);
    if (floorMat.current) {
      floorMat.current.opacity = THREE.MathUtils.damp(
        floorMat.current.opacity,
        target,
        4,
        dt,
      );
    }
    if (shellMat.current) {
      shellMat.current.opacity = THREE.MathUtils.damp(
        shellMat.current.opacity,
        target,
        4,
        dt,
      );
    }
  });

  return (
    <group>
      <lineSegments geometry={floorGeometry}>
        <lineBasicMaterial
          ref={floorMat}
          vertexColors
          transparent
          opacity={0.32}
          depthWrite={false}
        />
      </lineSegments>
      <lineSegments geometry={shellGeometry}>
        <lineBasicMaterial
          ref={shellMat}
          vertexColors
          transparent
          opacity={0.32}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
