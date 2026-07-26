"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll, warpAmount } from "./store";

/**
 * The world is two line sets:
 *
 * 1. FLOOR — a wide wire grid that runs the whole journey. Flat inside the
 *    opening tunnel, undulating (rolling hills) across the open stretch, and
 *    then it *curls*: the plane's edges lift and wrap around the ride until
 *    they meet overhead, closing into a cone that feeds the wormhole. There is
 *    no second tunnel arriving as a separate object — the ground you are on
 *    becomes the cone, so you fly through the inside of it.
 * 2. WALLS + CEILING — only the opening tunnel. They fade *spatially* via
 *    baked vertex colours, and dilate on the way out so the tunnel opens into
 *    the plain rather than dissolving in front of you.
 */

// World extents (along -z).
export const WORLD_Z_START = 10;
export const WORLD_Z_END = -600;

// Wormhole stretch — the spiralling vortex the cone empties into. Its mouth is
// exactly the cone's closed radius, sitting on the same axis, so the handover
// is a crossfade between two surfaces that already coincide.
export const WORM_Z_IN = -580; // rings begin fading in (= CONE_JOIN)
export const WORM_Z_FULL = -620; // fully present
export const WORM_Z_START = -580; // first ring
export const WORM_Z_END = -760; // black-hole throat
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

// Floor grid. Wide enough that the dilated tunnel walls never outrun it, and
// an exact whole number of columns — the two edges have to land on the same
// point once the plane wraps, or the finished tube carries a seam up top.
const STEP_X = 2.6;
const STEP_Z = 2.6;
const FLOOR_COLS = 32; // columns across the full width (even, so x = 0 exists)
const FLOOR_HW = (FLOOR_COLS / 2) * STEP_X; // 41.6

/**
 * The cone. Rather than a second tunnel arriving as its own object, the plane
 * you are already riding rolls up around you: every point at lateral distance
 * x swings through an angle x/R about a line that stays directly overhead, so
 * the centreline never moves and the two far edges climb until they meet at
 * the top. That closes at R = FLOOR_HW / π — the radius whose half-circumference
 * is exactly the plane's half-width. Past that the finished tube glides down
 * onto the wormhole's axis, and the vortex takes over from a surface that is
 * already in the identical place.
 */
const CONE_START = -430; // the plane's edges start lifting
const CONE_WRAPPED = -520; // closed into a tube
const CONE_JOIN = -580; // tube sits on the wormhole axis (= WORM_Z_IN)
export const WORM_RADIUS = FLOOR_HW / Math.PI; // ≈13.4, the closed-tube radius

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** The starting tunnel — the only walls-and-ceiling stretch left. */
function openingPresence(z: number): number {
  return 1 - smoothstep(FADE_START, FADE_END, z);
}

/** 1 while inside the tunnel, 0 out on the open floor. */
export function tunnelPresence(z: number): number {
  return openingPresence(z);
}

/** Cross-section dilation as the opening tunnel splays out into the plain. */
function flare(z: number): number {
  return 1 + smoothstep(FLARE_START, FLARE_END, z) * (FLARE_MAX - 1);
}

/** 0 flat plane → 1 fully wrapped tube. */
function coneWrap(z: number): number {
  return smoothstep(CONE_START, CONE_WRAPPED, z);
}

/**
 * Height of the curling surface's axis. While wrapping it is the geometric
 * centre of the arc (FLOOR_Y + R), which is what keeps the centreline pinned to
 * the old floor height; once closed it glides down to y = 0 to meet the vortex.
 */
function coneAxisY(z: number): number {
  const w = coneWrap(z);
  if (w < 1e-4) return FLOOR_Y;
  const r = WORM_RADIUS / w;
  return THREE.MathUtils.lerp(
    FLOOR_Y + r,
    0,
    smoothstep(CONE_WRAPPED, CONE_JOIN, z),
  );
}

/**
 * Where a point of the flat grid ends up once the plane has curled. Returns the
 * bent (x, y); at w → 0 it collapses back to the flat plane exactly, so the
 * floor geometry can pipe every vertex through this unconditionally.
 */
function bendPoint(x: number, z: number): readonly [number, number] {
  const w = coneWrap(z);
  if (w < 1e-4) return [x, floorY(x, z)];
  const r = WORM_RADIUS / w;
  const theta = (x / FLOOR_HW) * Math.PI * w; // = x / r
  return [Math.sin(theta) * r, coneAxisY(z) - Math.cos(theta) * r];
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

/**
 * Undulations only live on the open stretch: the floor is flat inside the
 * tunnel, and flat again before CONE_START so the plane is level when it
 * begins to curl (rolling hills wrapped around you read as a dented pipe).
 */
function waveWindow(z: number): number {
  return smoothstep(-128, -145, z) * (1 - smoothstep(-412, -430, z));
}

/**
 * How visible the floor is at (x, z). Inside a tunnel the floor is clipped to
 * the tunnel's own width, so the wide grid never spills past the walls (that
 * read as a second floor behind the tunnel). Fades out over ~3 units so the
 * boundary is smooth, never a hard edge.
 */
export function floorVisibility(x: number, z: number): number {
  // The grid hands over to the vortex, which by then occupies the same surface.
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
  const settle = 1 - smoothstep(EYE_DROP_START, EYE_DROP_END, z);
  const open =
    floorY(0, z) + THREE.MathUtils.lerp(EYE_OPEN, EYE_TUNNEL, settle);
  const w = coneWrap(z);
  if (w < 1e-4) return open;
  // Rise off the plane onto the tube's axis as it closes overhead. Chased only
  // once the wrap is well underway — early on the arc's centre is hundreds of
  // units up (a nearly flat plane is an arc of a nearly infinite circle), and
  // following it from the start would fire the camera into the sky.
  return THREE.MathUtils.lerp(open, coneAxisY(z), smoothstep(0.3, 1, w));
}

export function WireWorld() {
  const floorMat = useRef<THREE.LineBasicMaterial>(null);
  const shellMat = useRef<THREE.LineBasicMaterial>(null);

  // ---- Floor: undulating wire grid, curling into the cone ----------------
  // Every vertex goes through bendPoint, so the same grid is the plain, the
  // curl and the cone. The lines along z become the cone's longitudinal rails
  // and the lines across x become its rings — no second object, no crossfade.
  const floorGeometry = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const seg = (ax: number, az: number, bx: number, bz: number) => {
      const va = floorVisibility(ax, az);
      const vb = floorVisibility(bx, bz);
      if (va < 0.004 && vb < 0.004) return;
      const [x0, y0] = bendPoint(ax, az);
      const [x1, y1] = bendPoint(bx, bz);
      pos.push(x0, y0, az, x1, y1, bz);
      col.push(va, va, va, vb, vb, vb);
    };

    const zCount = Math.floor((WORLD_Z_START - WORLD_Z_END) / STEP_Z);
    const colX = (i: number) => -FLOOR_HW + i * STEP_X;
    // Lines running along z — the cone's longitudinal rails once wrapped. The
    // last column is skipped: wrapped, it lands on top of the first one.
    for (let i = 0; i < FLOOR_COLS; i += 1) {
      for (let k = 0; k < zCount; k += 1) {
        const z0 = WORLD_Z_START - k * STEP_Z;
        seg(colX(i), z0, colX(i), z0 - STEP_Z);
      }
    }
    // Lines running across x — the cone's rings once wrapped.
    for (let k = 0; k <= zCount; k += 1) {
      const z = WORLD_Z_START - k * STEP_Z;
      for (let i = 0; i < FLOOR_COLS; i += 1) {
        seg(colX(i), z, colX(i + 1), z);
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
    // ...and the whole world drops away for the jump, leaving only the streaks.
    const target =
      THREE.MathUtils.lerp(0.32, 0.78, v) *
      (1 - warpAmount(scroll.progress) ** 0.6);
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
