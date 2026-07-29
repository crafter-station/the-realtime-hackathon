"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll, warpRender } from "./store";

/**
 * The jump to hyperspace: a field of stars streaking radially out of the
 * vanishing point.
 *
 * Each star is a quad lying along z. That is the whole trick — a shape parallel
 * to the view axis projects to a streak pointing straight away from the centre
 * of frame, and the further off-axis the star sits the longer that streak
 * reads. So "stretch the quads" *is* "jump to lightspeed", with no per-star
 * direction maths.
 *
 * Quads rather than line segments because WebGL ignores `linewidth` — every
 * LineBasicMaterial renders one hairline pixel no matter what you ask for, and
 * hairlines at this density read as static rather than as motion. Two triangles
 * per star costs little and buys a real, controllable thickness.
 *
 * The field rides with the camera, and nothing is drawn until the beat starts:
 * length and brightness both scale off `warpAmount`, so at rest the whole thing
 * collapses to invisible slivers.
 */

const DEPTH = 90; // how far back the field extends
const R_MIN = 2.4; // leaves the dark core the reference has
const R_MAX = 62;
const SPEED = 46; // world units per second of streaming
const LEN_MAX = 30;
// World-space half-width per unit of distance. Scaling with distance is what
// keeps the streaks an even weight across the frame instead of fattening up as
// they sweep past — ≈2.5px tall on a 900px viewport at this FOV.
const HALF_WIDTH = 0.0016;

export function WireWarp() {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const { camera } = useThree();

  const count = scroll.quality === "lite" ? 190 : 520;

  const reduce = scroll.reduce;

  // Six vertices per star: two triangles spanning head → tail.
  const { geometry, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 18);
    const colors = new Float32Array(count * 18);
    // x, y, z of the head plus a per-star length multiplier.
    const data = new Float32Array(count * 4);
    // Head bright, tail falling off, so the streak reads as motion not a rod.
    const shade = [1, 1, 0.08, 1, 0.08, 0.08];
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      // sqrt keeps the density even across the disc instead of clumping at the
      // centre, which is what leaves a clean dark core.
      const radius = R_MIN + (R_MAX - R_MIN) * Math.sqrt(Math.random());
      data[i * 4] = Math.cos(angle) * radius;
      data[i * 4 + 1] = Math.sin(angle) * radius;
      data[i * 4 + 2] = -Math.random() * DEPTH;
      // Varied lengths — a field of identical dashes looks manufactured.
      data[i * 4 + 3] = 0.45 + Math.random() * 0.85;
      for (let v = 0; v < 6; v += 1) {
        const c = shade[v];
        colors[i * 18 + v * 3] = c;
        colors[i * 18 + v * 3 + 1] = c;
        colors[i * 18 + v * 3 + 2] = c;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return { geometry: g, seeds: data };
  }, [count]);

  useFrame((_, dt) => {
    const amount = warpRender(scroll.progress);
    const mat = material.current;
    if (mat) {
      mat.opacity = THREE.MathUtils.damp(mat.opacity, amount, 6, dt);
    }
    const g = group.current;
    if (g) g.position.z = camera.position.z;

    // Nothing to move or stretch while the beat is closed.
    if (amount < 0.002 && (mat?.opacity ?? 0) < 0.002) return;

    // Scroll velocity kicks the streaks longer — scrolling harder feels faster.
    const v = reduce ? 0 : Math.min(Math.abs(scroll.velocity), 30);
    const len = amount * LEN_MAX * (1 + v * 0.03);
    const step = Math.min(dt, 0.05) * SPEED * (0.35 + amount);

    const arr = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i += 1) {
      let z = seeds[i * 4 + 2] + step;
      if (z > 6) z -= DEPTH; // recycle to the back of the field
      seeds[i * 4 + 2] = z;

      const x = seeds[i * 4];
      const y = seeds[i * 4 + 1];
      const tail = z - len * seeds[i * 4 + 3];

      // Widen across the radius, so the quad faces the camera on the axis.
      const r = Math.hypot(x, y) || 1;
      const w = HALF_WIDTH * Math.max(4, -z);
      const px = (-y / r) * w;
      const py = (x / r) * w;

      const b = i * 18;
      // Triangle 1: head+, head-, tail+
      arr[b] = x + px;
      arr[b + 1] = y + py;
      arr[b + 2] = z;
      arr[b + 3] = x - px;
      arr[b + 4] = y - py;
      arr[b + 5] = z;
      arr[b + 6] = x + px;
      arr[b + 7] = y + py;
      arr[b + 8] = tail;
      // Triangle 2: head-, tail-, tail+
      arr[b + 9] = x - px;
      arr[b + 10] = y - py;
      arr[b + 11] = z;
      arr[b + 12] = x - px;
      arr[b + 13] = y - py;
      arr[b + 14] = tail;
      arr[b + 15] = x + px;
      arr[b + 16] = y + py;
      arr[b + 17] = tail;
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry} frustumCulled={false}>
        <meshBasicMaterial
          ref={material}
          vertexColors
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
          fog={false}
        />
      </mesh>
    </group>
  );
}
