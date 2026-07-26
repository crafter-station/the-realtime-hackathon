"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll } from "./store";
import {
  WORM_RADIUS,
  WORM_THROAT,
  WORM_Z_END,
  WORM_Z_START,
  wormholePresence,
} from "./wire-world";

/**
 * The flat grid folds into a wormhole: concentric rings receding down -z, each
 * one twisted a little further than the last, so the longitudinal rails read as
 * spiral arms swirling into a dark throat (the black hole). It's a single baked
 * line set — vertex colours carry the spatial fade-in (wormholePresence) and the
 * darkening toward the throat, so there's no per-frame geometry work. The whole
 * group spins slowly around its axis to feel alive.
 */

const SPOKES = 20; // points around each ring
const RING_STEP = 2.1; // z spacing between rings
const TWIST = 0.05; // radians of swirl per world unit of depth
const ARMS = 6; // brighter spiral arms threaded through the mesh

/** Radius taper: wide mouth that rushes down to a tight throat near the core. */
function wormRadius(u: number): number {
  // u: 0 at the mouth → 1 at the throat.
  const shape = (1 - u) ** 1.6;
  return THREE.MathUtils.lerp(WORM_THROAT, WORM_RADIUS, shape);
}

/** Brightness of a vertex: fade in with presence, dim toward the dark throat. */
function bright(pres: number, u: number): number {
  return pres * (1 - u * 0.72);
}

export function WireWormhole() {
  const group = useRef<THREE.Group>(null);
  const meshMat = useRef<THREE.LineBasicMaterial>(null);
  const armsMat = useRef<THREE.LineBasicMaterial>(null);

  const rings = useMemo(() => {
    const count = Math.floor((WORM_Z_START - WORM_Z_END) / RING_STEP) + 1;
    const out: Array<{
      z: number;
      u: number;
      radius: number;
      angle: number;
      pres: number;
    }> = [];
    for (let k = 0; k < count; k += 1) {
      const z = WORM_Z_START - k * RING_STEP;
      const u = THREE.MathUtils.clamp(
        (WORM_Z_START - z) / (WORM_Z_START - WORM_Z_END),
        0,
        1,
      );
      out.push({
        z,
        u,
        radius: wormRadius(u),
        angle: (WORM_Z_START - z) * TWIST,
        pres: wormholePresence(z),
      });
    }
    return out;
  }, []);

  // ---- Rings + spiral rails (the full wire mesh) -------------------------
  const meshGeometry = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    const pt = (r: (typeof rings)[number], s: number) => {
      const a = r.angle + (s / SPOKES) * Math.PI * 2;
      return [Math.cos(a) * r.radius, Math.sin(a) * r.radius, r.z] as const;
    };
    const push = (
      p: readonly [number, number, number],
      q: readonly [number, number, number],
      ca: number,
      cb: number,
    ) => {
      if (ca < 0.004 && cb < 0.004) return;
      pos.push(p[0], p[1], p[2], q[0], q[1], q[2]);
      col.push(ca, ca, ca, cb, cb, cb);
    };

    for (let i = 0; i < rings.length; i += 1) {
      const r = rings[i];
      const cr = bright(r.pres, r.u);
      // Ring outline.
      for (let s = 0; s < SPOKES; s += 1) {
        push(pt(r, s), pt(r, s + 1), cr, cr);
      }
      // Longitudinal rails to the next ring — twist makes them spiral.
      const next = rings[i + 1];
      if (next) {
        const cn = bright(next.pres, next.u);
        for (let s = 0; s < SPOKES; s += 1) {
          push(pt(r, s), pt(next, s), cr, cn);
        }
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
  }, [rings]);

  // ---- A handful of bright spiral arms threaded down the throat ----------
  const armsGeometry = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];
    for (let arm = 0; arm < ARMS; arm += 1) {
      const base = (arm / ARMS) * Math.PI * 2;
      for (let i = 0; i < rings.length - 1; i += 1) {
        const r = rings[i];
        const n = rings[i + 1];
        const ca = bright(r.pres, r.u);
        const cb = bright(n.pres, n.u);
        if (ca < 0.004 && cb < 0.004) continue;
        const a0 = r.angle + base;
        const a1 = n.angle + base;
        pos.push(
          Math.cos(a0) * r.radius,
          Math.sin(a0) * r.radius,
          r.z,
          Math.cos(a1) * n.radius,
          Math.sin(a1) * n.radius,
          n.z,
        );
        col.push(ca, ca, ca, cb, cb, cb);
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
  }, [rings]);

  useFrame((_, dt) => {
    const g = group.current;
    if (g) g.rotation.z += dt * 0.06; // slow swirl
    const v = THREE.MathUtils.clamp(Math.abs(scroll.velocity) * 0.05, 0, 1);
    const target = THREE.MathUtils.lerp(0.5, 0.95, v);
    if (meshMat.current) {
      meshMat.current.opacity = THREE.MathUtils.damp(
        meshMat.current.opacity,
        target * 0.85,
        4,
        dt,
      );
    }
    if (armsMat.current) {
      armsMat.current.opacity = THREE.MathUtils.damp(
        armsMat.current.opacity,
        target,
        4,
        dt,
      );
    }
  });

  return (
    <group ref={group}>
      <lineSegments geometry={meshGeometry}>
        <lineBasicMaterial
          ref={meshMat}
          vertexColors
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>
      <lineSegments geometry={armsGeometry}>
        <lineBasicMaterial
          ref={armsMat}
          vertexColors
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
