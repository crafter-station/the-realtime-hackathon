"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll } from "./store";
import {
  surfacePoint,
  WELL_RADIUS,
  WELL_Z,
  wellPresence,
  wellThroatY,
} from "./wire-surface";

/**
 * The well, drawn in polar.
 *
 * The rest of the world is a Cartesian grid, and it has to be: it rolls into a
 * corridor, and rows-and-columns is what makes that fold legible. But a
 * Cartesian grid laid over a radial dip reads as a warped tablecloth — the
 * lines run past the throat instead of into it, and the eye has nothing to
 * follow down. A gravity well is a radial object and wants radial coordinates:
 * rings around the centre and spokes out of it, so every line in the frame
 * points at the portal.
 *
 * So the opening is drawn twice over. This mesh owns the frame while the well
 * does, `WireWorld` fades up as it fades out, and the handover happens out on
 * the flat plain where neither is doing anything interesting.
 *
 * Heights come from `surfacePoint` like everything else, so the rings sit on
 * exactly the same surface the camera rides and the Cartesian grid draws.
 */

/**
 * The one hue in the opening. Note this is *not* Portal orange — the reference
 * this frame is matched against is cyan, and the brief's rule that orange is
 * the only chromatic thing in the world still holds everywhere downstream.
 * Swapping the opening back to orange is this constant and `PORTAL_GLOW`.
 */
export const WELL_CYAN = "#6ff0e6";

/** Reaches well past the rim so the plain around the well is ruled too. */
const R_MAX = 190;
const RINGS = 64;
const SPOKES = 120;
/** Rings crowd toward the throat, which is where the eye is going. */
const RING_BIAS = 1.15;

const ringRadius = (i: number) => R_MAX * (i / RINGS) ** RING_BIAS;

/**
 * A person, standing on the floor of the well.
 *
 * Doing all the work of scale. Without it the well is an abstract funnel and
 * could be a metre across or a light-year; with it the walls read as enormous
 * and the whole frame acquires a horizon. It is a silhouette rather than a
 * model on purpose — anything with detail would invite you to look at *it*,
 * and the subject is the portal it is standing in.
 *
 * Billboarded, because a flat cut-out seen from the side stops being a person.
 */
function WellFigure() {
  const texture = useMemo(() => {
    const w = 64;
    const h = 128;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#05070a";
      // head, torso, legs — a stance, not an anatomy
      ctx.beginPath();
      ctx.arc(w / 2, h * 0.13, w * 0.11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(w * 0.37, h * 0.22, w * 0.26, h * 0.4);
      ctx.fillRect(w * 0.4, h * 0.6, w * 0.08, h * 0.38);
      ctx.fillRect(w * 0.52, h * 0.6, w * 0.08, h * 0.38);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  const height = 3.4;
  return (
    <sprite
      position={[0, wellThroatY() + height / 2, WELL_Z]}
      scale={[height / 2, height, 1]}
    >
      <spriteMaterial
        map={texture}
        transparent
        depthWrite={false}
        fog={false}
      />
    </sprite>
  );
}

export function WellGrid() {
  const material = useRef<THREE.LineBasicMaterial>(null);

  const geometry = useMemo(() => {
    const pos: number[] = [];
    const col: number[] = [];

    const point = (r: number, theta: number) => {
      const x = r * Math.cos(theta);
      const z = WELL_Z + r * Math.sin(theta);
      const [px, py] = surfacePoint(x, z);
      return [px, py, z] as const;
    };

    // Brightness falls off outward so the ruled plain dissolves into the dark
    // instead of ending on a visible circle, and dies wherever the plane has
    // started to curl — past that point this mesh is not what you are looking
    // at, and two grids at once is just noise.
    //
    // The `lit` term is what sells it. In the reference the light is not a haze
    // hanging in front of the mesh, it is the *surface* glowing where the walls
    // turn over — so the lines themselves have to blow out near the throat.
    // Vertex colours above 1 clamp at render, which is exactly the over-exposed
    // band the reference has either side of the figure.
    const fade = (r: number, theta: number) => {
      const z = WELL_Z + r * Math.sin(theta);
      const out = 1 - THREE.MathUtils.smoothstep(r, WELL_RADIUS * 1.1, R_MAX);
      const lit =
        1 -
        THREE.MathUtils.smoothstep(r, WELL_RADIUS * 0.06, WELL_RADIUS * 0.9);
      return wellPresence(z) * (0.22 + 0.78 * out) * (0.55 + 2.8 * lit);
    };

    const seg = (
      ra: number,
      ta: number,
      rb: number,
      tb: number,
      scale: number,
    ) => {
      const fa = fade(ra, ta) * scale;
      const fb = fade(rb, tb) * scale;
      if (fa < 0.004 && fb < 0.004) return;
      pos.push(...point(ra, ta), ...point(rb, tb));
      col.push(fa, fa, fa, fb, fb, fb);
    };

    // Rings.
    for (let i = 1; i <= RINGS; i += 1) {
      const r = ringRadius(i);
      for (let s = 0; s < SPOKES; s += 1) {
        const t0 = (s / SPOKES) * Math.PI * 2;
        const t1 = ((s + 1) / SPOKES) * Math.PI * 2;
        seg(r, t0, r, t1, 1);
      }
    }
    // Spokes. Every one is drawn, but the innermost rings drop half of them:
    // at the throat they all converge on a single point, and the full set turns
    // the centre into a solid disc rather than a mouth.
    for (let s = 0; s < SPOKES; s += 1) {
      const t = (s / SPOKES) * Math.PI * 2;
      for (let i = 0; i < RINGS; i += 1) {
        const inner = ringRadius(i) < WELL_RADIUS * 0.3;
        if (inner && s % 2 === 1) continue;
        seg(ringRadius(i), t, ringRadius(i + 1), t, 0.7);
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
    const mat = material.current;
    if (!mat) return;
    // Full strength before the visitor moves — this is the first frame of the
    // site — then it hands the world back to the Cartesian grid.
    const gone = THREE.MathUtils.smoothstep(scroll.progress, 0.02, 0.14);
    mat.opacity = THREE.MathUtils.damp(mat.opacity, 0.9 * (1 - gone), 4, dt);
  });

  return (
    <group>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial
          ref={material}
          color={WELL_CYAN}
          vertexColors
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </lineSegments>
      <WellFigure />
    </group>
  );
}
