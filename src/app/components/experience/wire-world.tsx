"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll } from "./store";
import {
  columnFade,
  FLOOR_COLS,
  FLOOR_HW,
  handoverDim,
  PERIMETER,
  ringFade,
  STEP_X,
  STEP_Z,
  settle,
  surfacePoint,
  WORLD_Z_END,
  WORLD_Z_START,
  wellCoverage,
  wrap,
} from "./wire-surface";

/**
 * Draws the one surface. Where it *is* lives in `wire-surface.ts` — this file
 * only turns that into lines and points, and decides how bright they are.
 *
 * Two line families and one point cloud, all baked once. Nothing here recomputes
 * geometry per frame; the ride is entirely a camera moving through a static
 * world, with material opacity carrying the reaction to scroll speed.
 */

export function WireWorld() {
  const gridMat = useRef<THREE.LineBasicMaterial>(null);
  const dustMat = useRef<THREE.PointsMaterial>(null);

  const gridGeometry = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const zCount = Math.floor((WORLD_Z_START - WORLD_Z_END) / STEP_Z);
    const colX = (i: number) => -FLOOR_HW + i * STEP_X;

    const seg = (
      ax: number,
      az: number,
      bx: number,
      bz: number,
      fa: number,
      fb: number,
    ) => {
      // Yield the opening to the polar mesh in `wire-well.tsx`. Rows and
      // columns laid across a radial dip read as a warped tablecloth, and two
      // grids drawn over each other read as neither. Per *point*, because the
      // mesh we are yielding to is radial — see `wellCoverage`.
      const va = fa * (1 - wellCoverage(ax, az)) * handoverDim(ax, az);
      const vb = fb * (1 - wellCoverage(bx, bz)) * handoverDim(bx, bz);
      if (va < 0.004 && vb < 0.004) return;
      const [x0, y0] = surfacePoint(ax, az);
      const [x1, y1] = surfacePoint(bx, bz);
      pos.push(x0, y0, az, x1, y1, bz);
      col.push(va, va, va, vb, vb, vb);
    };

    // Columns — the rails. Wrapped, these run the length of the corridor. The
    // last column is skipped: closed, it lands exactly on the first.
    for (let i = 0; i < FLOOR_COLS; i += 1) {
      for (let k = 0; k < zCount; k += 1) {
        const z0 = WORLD_Z_START - k * STEP_Z;
        const z1 = z0 - STEP_Z;
        seg(colX(i), z0, colX(i), z1, columnFade(i, z0), columnFade(i, z1));
      }
    }
    // Rings — across the plane, around the section once wrapped. They keep a
    // floor under the thinned columns so the surface never reads as stripes.
    for (let k = 0; k <= zCount; k += 1) {
      const z = WORLD_Z_START - k * STEP_Z;
      const rf = ringFade(k, z);
      if (rf < 0.004) continue;
      for (let i = 0; i < FLOOR_COLS; i += 1) {
        const fa = Math.max(columnFade(i, z), 0.2);
        const fb = Math.max(columnFade(i + 1, z), 0.2);
        seg(colX(i), z, colX(i + 1), z, rf * fa, rf * fb);
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

  /**
   * Points stuck to the surface — the density the lines gave up.
   *
   * Few lines and many points reads as a dense, luminous skin; many lines reads
   * as noise. That trade is the whole reason the grid could be thinned without
   * the world going bare. Positions are baked and never recomputed; only the
   * material's opacity moves.
   */
  const dustGeometry = useMemo(() => {
    const count = scroll.quality === "lite" ? 3200 : 9000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    // A golden-ratio walk rather than Math.random: even at every scale, and
    // identical on every load, so the field never clumps and never flickers
    // between reloads.
    const PHI = 0.618_033_988_75;
    for (let i = 0; i < count; i += 1) {
      const u = (i * PHI) % 1;
      const t = i / count;
      const z = WORLD_Z_START - t * (WORLD_Z_START - WORLD_Z_END);
      const [px, py] = surfacePoint((u - 0.5) * PERIMETER, z);
      pos[i * 3] = px;
      pos[i * 3 + 1] = py;
      pos[i * 3 + 2] = z;
      // Brighter where the surface is closing in — the throat reads hot.
      const v =
        (0.35 + 0.65 * wrap(z)) * (1 - wellCoverage((u - 0.5) * PERIMETER, z));
      col[i * 3] = v;
      col[i * 3 + 1] = v;
      col[i * 3 + 2] = v;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);

  useFrame((state, dt) => {
    const v = THREE.MathUtils.clamp(Math.abs(scroll.velocity) * 0.05, 0, 1);

    /*
      THE WORLD STANDS DOWN FOR THE BRIEFING

      The second act is not announced by a section, it is announced by this. Past
      `SETTLE_START` the ground has already stopped rolling (`waveWindow`) and the
      signal layer has already switched off; the last thing left making noise is
      the grid itself, so it drops to 45% and the format, schedule and FAQ are
      read over the stillest frame on the page.

      Not to zero. A briefing floating on black would lose the one thing the
      whole ride was establishing — that these answers are being given to you on
      the other side of the portal — and the register beat still has to have
      ground under it.
    */
    const quiet = 1 - 0.55 * settle(state.camera.position.z);

    /*
      THE RESTING FLOOR RISES WITH HOW CLOSED THE SECTION IS

      Brightness used to run `lerp(0.2, 0.48, v)` on scroll velocity alone. That
      is a fair rule out on open country, where the starfield, the dust and the
      portal light are all carrying the frame — and the wrong one inside the
      closed section, where this surface is the *only* thing on screen and
      `enclosure` has deliberately dimmed the sky out of it.

      The cost showed up as a dead stretch right after the hero left: stop
      scrolling anywhere in there and the closed section sat at 0.2 on a
      near-black background, which photographs as an effectively empty frame.
      Worth being precise about why that matters more than it sounds — the beats
      are exactly where a visitor stops, so the resting value is the one most of
      them actually see, and the moving value is the one that was tuned.

      So the floor is a function of `wrap` rather than a constant. Moving through
      open country is unchanged; what changes is what is there when you stop
      inside the crossing.
    */
    const enclosed = wrap(state.camera.position.z);
    // The enclosed end of both ramps was raised with the fades in
    // `wire-surface.ts`, and for the same reason: the crossing is the one frame
    // on this page with no sky, no portal light and no signal layer, so this
    // surface is the *only* thing in it. 0.46 was a corridor you passed through
    // with a countdown drawn over it; there is nothing drawn over this.
    const gridFloor = THREE.MathUtils.lerp(0.22, 0.66, enclosed);
    const dustFloor = THREE.MathUtils.lerp(0.34, 0.78, enclosed);

    if (gridMat.current) {
      gridMat.current.opacity = THREE.MathUtils.damp(
        gridMat.current.opacity,
        THREE.MathUtils.lerp(gridFloor, 0.56, v) * quiet,
        4,
        dt,
      );
    }
    if (dustMat.current) {
      dustMat.current.opacity = THREE.MathUtils.damp(
        dustMat.current.opacity,
        THREE.MathUtils.lerp(dustFloor, 0.7, v) * quiet,
        4,
        dt,
      );
    }
  });

  return (
    <group>
      <lineSegments geometry={gridGeometry}>
        <lineBasicMaterial
          ref={gridMat}
          vertexColors
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </lineSegments>
      <points geometry={dustGeometry}>
        <pointsMaterial
          ref={dustMat}
          size={0.045}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0.32}
          depthWrite={false}
          fog
        />
      </points>
    </group>
  );
}
