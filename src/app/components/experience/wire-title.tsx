"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll } from "./store";
import { surfacePoint, wrap } from "./wire-surface";
import { textBlockOutline } from "./wire-type";

/**
 * The title, lying on the ground.
 *
 * It is not text drawn over the world — it is part of the surface, made of the
 * same hairlines as the grid and pushed through the same `surfacePoint`. So
 * when the plane starts to curl, the title curls with it: the ground it is
 * written on gives way and takes it down into the portal. That handover is the
 * whole opening gesture, and it only works because the letters are geometry.
 *
 * Glyph space is x-right / y-up; on the ground, y becomes *depth*. The reader
 * is travelling toward -z, so the top of the letters has to be the far edge —
 * hence the negated y. Get that backwards and the title reads upside down from
 * the only vantage point that ever sees it.
 */

const LINES = ["THE REALTIME", "HACKATHON"] as const;
/** Centre of the block in world z. Far enough ahead to read on approach. */
const CENTER_Z = 120;
/** World units per glyph cell. */
const SCALE = 0.84;
/** Segments longer than this get split so they follow the ground's curve. */
const MAX_SEGMENT = 1.2;

export function WireTitle() {
  const material = useRef<THREE.LineBasicMaterial>(null);

  const geometry = useMemo(() => {
    const block = textBlockOutline(LINES);
    const pos: number[] = [];
    const col: number[] = [];

    const place = (gx: number, gy: number) => {
      const x = gx * SCALE;
      const z = CENTER_Z - gy * SCALE;
      const [px, py] = surfacePoint(x, z);
      return [px, py, z] as const;
    };

    // Brightness falls off as the ground curls: once the plane is a third of
    // the way closed the letters are raking away from the eye, and holding them
    // at full strength turns them into smeared streaks on the corridor wall.
    const fade = (gy: number) => {
      const z = CENTER_Z - gy * SCALE;
      return 1 - THREE.MathUtils.smoothstep(wrap(z), 0.18, 0.42);
    };

    for (const [x0, y0, x1, y1] of block.segments) {
      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(x1 - x0, y1 - y0) * SCALE / MAX_SEGMENT),
      );
      for (let i = 0; i < steps; i += 1) {
        const ta = i / steps;
        const tb = (i + 1) / steps;
        const ax = THREE.MathUtils.lerp(x0, x1, ta);
        const ay = THREE.MathUtils.lerp(y0, y1, ta);
        const bx = THREE.MathUtils.lerp(x0, x1, tb);
        const by = THREE.MathUtils.lerp(y0, y1, tb);
        const fa = fade(ay);
        const fb = fade(by);
        if (fa < 0.004 && fb < 0.004) continue;
        pos.push(...place(ax, ay), ...place(bx, by));
        col.push(fa, fa, fa, fb, fb, fb);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(pos), 3),
    );
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(col), 3));
    return g;
  }, []);

  useFrame((_, dt) => {
    const mat = material.current;
    if (!mat) return;
    // Full strength before the visitor moves — this is the first frame of the
    // site — then it rides the ground down and out.
    const gone = THREE.MathUtils.smoothstep(scroll.progress, 0.0, 0.14);
    mat.opacity = THREE.MathUtils.damp(mat.opacity, 1 - gone * 0.15, 5, dt);
  });

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        ref={material}
        vertexColors
        transparent
        opacity={1}
        depthWrite={false}
      />
    </lineSegments>
  );
}
