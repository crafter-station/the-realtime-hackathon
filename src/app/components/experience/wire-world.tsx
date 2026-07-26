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
 *    out *spatially* via baked vertex colours (fading to the page black). The
 *    opening tunnel additionally dilates on its way out, so it opens into the
 *    plain rather than dissolving in front of you; the finale one keeps its
 *    shape because it collapses into the wormhole instead.
 */

// World extents (along -z).
export const WORLD_Z_START = 10;
export const WORLD_Z_END = -366;

// Wormhole stretch — a spiralling vortex that the flat grid folds into. Lives
// past the (now much longer) closing tunnel; the camera flies straight down
// its throat.
export const WORM_Z_IN = -336; // rings begin fading in
export const WORM_Z_FULL = -376; // fully present
export const WORM_Z_START = -340; // first ring
export const WORM_Z_END = -500; // black-hole throat
export const WORM_RADIUS = 16; // mouth radius
export const WORM_THROAT = 1.4; // throat radius (the dark core)

// Tunnel cross-section.
const HW = 13; // half width
const WALL_H = 16.4; // floor → ceiling
const EYE_TUNNEL = WALL_H / 2; // eye height inside the tunnel (centred)
const EYE_OPEN = 2.8; // eye height over the open floor
const FLOOR_Y = -2.8;

/**
 * The opening tunnel does not fade out where you can watch it happen: it
 * *opens*. The cross-section dilates until the walls and ceiling have swung
 * past the edge of the frustum, and only then do the lines go to zero. Three
 * ramps, deliberately staggered so no two of them land together — that
 * simultaneity is what read as a cut.
 */
const FLARE_START = -68; // the room starts dilating
const FLARE_END = -118; // fully opened out
const FLARE_MAX = 3.4; // ×13 half-width → 44, well past the frame edge
const FADE_START = -104; // lines start dimming (already off to the sides)
const FADE_END = -128; // gone
const EYE_DROP_START = -64; // camera starts sinking toward floor level
const EYE_DROP_END = -118;

// Floor grid. Wide enough that the dilated tunnel walls never outrun it.
const FLOOR_HW = 42;
const STEP_X = 2.6;
const STEP_Z = 2.6;

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** The starting tunnel: solid, then dilating, then finally faded out. */
function openingPresence(z: number): number {
  return 1 - smoothstep(FADE_START, FADE_END, z);
}

/**
 * The finale tunnel: forms, holds for a long ride, then dissolves as it hands
 * off to the wormhole (the walls collapse into the spinning vortex).
 */
function closingPresence(z: number): number {
  return smoothstep(-175, -202, z) * (1 - smoothstep(-332, -358, z));
}

/** 1 while inside a tunnel stretch, 0 out on the open floor. */
export function tunnelPresence(z: number): number {
  return Math.max(openingPresence(z), closingPresence(z));
}

/**
 * Cross-section dilation. Only the opening tunnel flares — the finale one keeps
 * its shape, because it hands off to the wormhole instead of to open ground.
 * The two stretches never overlap in z, so the share is a clean 1 or 0
 * anywhere geometry actually gets drawn.
 */
function flare(z: number): number {
  const o = openingPresence(z);
  const c = closingPresence(z);
  const share = o + c > 1e-4 ? o / (o + c) : 0;
  return 1 + share * smoothstep(FLARE_START, FLARE_END, z) * (FLARE_MAX - 1);
}

/** Tunnel half-width at z — grows as the opening tunnel splays outward. */
export function tunnelHW(z: number): number {
  return HW * flare(z);
}

/** Tunnel floor → ceiling height at z; the ceiling lifts away with the walls. */
export function tunnelWallH(z: number): number {
  return WALL_H * flare(z);
}

/**
 * How boxed-in the camera feels, as opposed to merely how many wall lines
 * exist. Drives the starfield: the sky comes back progressively as the room
 * opens out, instead of snapping in when the last line fades.
 */
export function enclosure(z: number): number {
  return tunnelPresence(z) / flare(z);
}

/** 0 → 1 as the flat grid folds into the spiralling wormhole. */
export function wormholePresence(z: number): number {
  return smoothstep(WORM_Z_IN, WORM_Z_FULL, z);
}

/** Undulations only live on the open stretch; the floor is flat in tunnels. */
function waveWindow(z: number): number {
  return smoothstep(-128, -152, z) * (1 - smoothstep(-172, -192, z));
}

/**
 * How visible the floor is at (x, z). Inside a tunnel the floor is clipped to
 * the tunnel's own width, so the wide grid never spills past the walls (that
 * read as a second floor behind the tunnel). Fades out over ~3 units so the
 * boundary is smooth, never a hard edge.
 */
export function floorVisibility(x: number, z: number): number {
  // The grid vanishes entirely once the wormhole takes over — no flat floor
  // showing through the vortex.
  const w = wormholePresence(z);
  const p = tunnelPresence(z);
  if (p < 0.002) return 1 - w;
  // Gate on presence, not presence itself: while the tunnel is still readable
  // the outer floor stays fully hidden, otherwise you briefly see BOTH the
  // walls and a second, wider floor behind them during the dissolve. It only
  // fades in once the tunnel is down to a few percent — by which point the
  // opening tunnel has already dilated past FLOOR_HW, so the boundary below
  // has released on its own and this gate never gets to pop.
  const clip = smoothstep(0.02, 0.18, p);
  const hw = tunnelHW(z);
  const outside = smoothstep(hw - 3.2, hw + 0.4, Math.abs(x));
  return (1 - clip * outside) * (1 - w);
}

/** Rolling floor height — this is what makes the ride rise and fall. */
export function floorY(x: number, z: number): number {
  const wave =
    Math.sin(z * 0.075) * 2.6 + Math.sin(z * 0.029 + x * 0.045) * 1.25;
  return FLOOR_Y + wave * waveWindow(z);
}

/**
 * Camera height: centred while boxed in, riding just over the rolling floor
 * once out. On the way out this sinks on its own long ramp rather than
 * following the wall opacity — otherwise the 5.4-unit drop lands in the same
 * instant as the dissolve and reads as a lurch.
 */
export function rideY(z: number): number {
  const settle = Math.max(
    1 - smoothstep(EYE_DROP_START, EYE_DROP_END, z),
    closingPresence(z),
  );
  return floorY(0, z) + THREE.MathUtils.lerp(EYE_OPEN, EYE_TUNNEL, settle);
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
      const base = floorY(0, z);
      const hw = tunnelHW(z);
      const wallH = tunnelWallH(z);
      const top = base + wallH;
      const segs = 8;
      // left wall
      for (let i = 0; i < segs; i += 1) {
        const y0 = base + (wallH * i) / segs;
        const y1 = base + (wallH * (i + 1)) / segs;
        push(-hw, y0, z, -hw, y1, z);
      }
      // right wall
      for (let i = 0; i < segs; i += 1) {
        const y0 = base + (wallH * i) / segs;
        const y1 = base + (wallH * (i + 1)) / segs;
        push(hw, y0, z, hw, y1, z);
      }
      // ceiling
      const cSegs = 12;
      for (let i = 0; i < cSegs; i += 1) {
        const x0 = -hw + (2 * hw * i) / cSegs;
        const x1 = -hw + (2 * hw * (i + 1)) / cSegs;
        push(x0, top, z, x1, top, z);
      }
    }
    // Longitudinal rails, as fractions of the cross-section so they splay
    // outward with it instead of pinching together. Spaced off the same STEP_X
    // the floor grid uses, so ceiling and walls read as the same wireframe as
    // the ground rather than as bare nested rectangles. The ceiling owns both
    // top corners; the walls stop one rung short to avoid drawing them twice.
    const rails: Array<[number, number]> = [];
    const ceilSpans = Math.round((2 * HW) / STEP_X);
    for (let i = 0; i <= ceilSpans; i += 1) {
      rails.push([(2 * i) / ceilSpans - 1, 1]);
    }
    const wallSpans = Math.round(WALL_H / STEP_X);
    for (let i = 0; i < wallSpans; i += 1) {
      rails.push([-1, i / wallSpans], [1, i / wallSpans]);
    }
    for (const [rx, ry] of rails) {
      for (let k = 0; k < zCount; k += 1) {
        const z0 = WORLD_Z_START - k * STEP_Z;
        const z1 = z0 - STEP_Z;
        if (tunnelPresence(z0) < 0.004 && tunnelPresence(z1) < 0.004) continue;
        const x0 = rx * tunnelHW(z0);
        const x1 = rx * tunnelHW(z1);
        const y0 = floorY(0, z0) + tunnelWallH(z0) * ry;
        const y1 = floorY(0, z1) + tunnelWallH(z1) * ry;
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
