"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { trackBand } from "./journey";
import { scroll } from "./store";
import { settle, surfacePoint } from "./wire-surface";
import { bandFocus, buildMotes, signalOf } from "./wire-tracks";

/**
 * Draws the five tracks.
 *
 * What each one *does* lives in `wire-tracks.ts` — this file only turns that
 * into points on the surface and decides how bright they are, the same division
 * `wire-world.tsx` keeps with `wire-surface.ts`.
 *
 * The one thing worth stating here rather than there: every mote is placed
 * through `surfacePoint`, so the signal lies *on* the ground and rolls with it
 * rather than hanging in front of it. That is the correction to what the streak
 * field got wrong. Streaks were drawn between the reader and the track cards, so
 * making the cards legible meant dimming the effect to 46% and the effect then
 * had nothing left to say. A layer on the floor competes with nothing: the cards
 * sit left and right at eye level, the demonstration is underfoot, and both can
 * run at full strength.
 *
 * Unlike the world's grid this one is not baked — positions are rewritten every
 * frame, which is the price of the behaviours being animations rather than
 * shapes. It is bounded and small: one `Float32Array` of ~2,600 vertices,
 * rewritten in place, no allocation in the loop.
 */

/** How far past the tracks the layer is allowed to exist at all. */
const OFF = 0.004;

export function WireSignal() {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);

  const count = scroll.quality === "lite" ? 1100 : 2600;

  const { geometry, motes, positions, colors } = useMemo(() => {
    const motes = buildMotes(count);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage),
    );
    return { geometry, motes, positions, colors };
  }, [count]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const camZ = state.camera.position.z;

    /*
      Focus is per band, not per mote, so it is resolved five times rather than
      2,600. It is also the early-out: a band the camera has left contributes
      nothing, and skipping its motes wholesale is what keeps the cost flat
      across the page instead of paying for all five bands on every frame.
    */
    const focus: number[] = [];
    let anyLit = false;
    for (let b = 0; b < 5; b += 1) {
      const f = bandFocus(b, camZ);
      focus.push(f);
      if (f > OFF) anyLit = true;
    }

    if (material.current) {
      material.current.visible = anyLit;
    }
    if (!anyLit) return;

    for (let i = 0; i < motes.length; i += 1) {
      const m = motes[i];
      const f = focus[m.band];
      const o = i * 3;
      if (f <= OFF) {
        // Dark rather than moved. Leaving the position stale costs nothing —
        // an unlit point is not drawn — and rewriting it would be the work
        // this branch exists to avoid.
        colors[o] = 0;
        colors[o + 1] = 0;
        colors[o + 2] = 0;
        continue;
      }
      const band = trackBand(m.band + 1);
      const sig = signalOf(m, i, t);
      const z = band.from - sig.d;
      const [x, y] = surfacePoint(sig.s, z);
      positions[o] = x;
      // A hair above the surface. Coplanar with the grid, the two z-fight along
      // every ring and the layer reads as a flickering seam rather than as
      // something lying on the ground.
      positions[o + 1] = y + 0.06;
      positions[o + 2] = z;
      const v = sig.bright * f * (1 - settle(z));
      colors[o] = v;
      colors[o + 1] = v;
      colors[o + 2] = v;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        ref={material}
        size={0.085}
        sizeAttenuation
        vertexColors
        transparent
        // Additive, so the layer reads as light on the surface rather than as
        // paint over it — and so a mote sitting on a bright grid line adds to it
        // instead of replacing it. `depthWrite` off for the same reason every
        // other transparent layer here has it off: these must not occlude the
        // world behind them.
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        opacity={0.9}
        fog
      />
    </points>
  );
}
