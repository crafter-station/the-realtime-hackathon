"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll } from "./store";
import {
  handoverDim,
  surfacePoint,
  WELL_RADIUS,
  WELL_Z,
  wellCoverage,
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
 * Cursor gravity.
 *
 * The one thing on the page that answers back. A gravity well is a mass bending
 * the sheet it sits in, so the honest interaction is to let the visitor be a
 * second mass: the grid dips toward the pointer, and the dip follows.
 *
 * Done on the GPU, in the vertex stage, because it has to be. The mesh is
 * ~15,000 segments baked once; re-walking 30,000 vertices in JavaScript every
 * frame to move them a few units would cost more than the entire rest of the
 * frame. `onBeforeCompile` lets the displacement ride along in the shader for
 * free, and the geometry stays static and uploaded exactly once.
 *
 * The falloff is Gaussian rather than the well's own `1 - sqrt` profile: this
 * is a dent, not a second portal, and a sharp throat here would compete with
 * the real one three metres away.
 */
const POINTER = new THREE.Vector2();

/**
 * `String.replace` on a miss returns the string unchanged, which for a shader
 * patch is the worst possible failure: three.js renames a chunk, the injection
 * silently does nothing, `vReveal` is declared but never written, and the grid
 * either vanishes or stops responding — with no error anywhere. Fail loudly at
 * compile time instead.
 */
function inject(src: string, marker: string, body: string): string {
  if (!src.includes(marker)) {
    throw new Error(`wire-well: shader marker "${marker}" not found`);
  }
  return src.replace(marker, body);
}
/** Past the outermost ring, so the wave finishes clear of the drawn mesh. */
const REVEAL_MAX = 230;

function useCursorGravity(strength: number) {
  const uniforms = useRef({
    uCursor: { value: new THREE.Vector2(9999, 9999) },
    uPull: { value: 0 },
    // Radius the reveal wave has reached, in world units. Starts inside the
    // throat so the very first frame is dark but for the light itself.
    uReveal: { value: 0 },
  });

  const onBeforeCompile = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uCursor = uniforms.current.uCursor;
      shader.uniforms.uPull = uniforms.current.uPull;
      shader.uniforms.uReveal = uniforms.current.uReveal;
      let vert = inject(
        shader.vertexShader,
        "#include <common>",
        `#include <common>
         uniform vec2 uCursor;
         uniform float uPull;
         uniform float uReveal;
         varying float vReveal;`,
      );
      vert = inject(
        vert,
        "#include <begin_vertex>",
        `#include <begin_vertex>
         float gd = distance(vec2(transformed.x, transformed.z), uCursor);
         transformed.y -= uPull * exp(-(gd * gd) / 1500.0);
         // The opening wave: the throat lights first and the sheet resolves
         // outward from it, so the world reads as switching on rather than
         // as having been there all along.
         float rr = distance(vec2(transformed.x, transformed.z),
                             vec2(0.0, ${WELL_Z.toFixed(1)}));
         vReveal = 1.0 - smoothstep(uReveal - 26.0, uReveal, rr);`,
      );
      shader.vertexShader = vert;

      let frag = inject(
        shader.fragmentShader,
        "#include <common>",
        `#include <common>
         varying float vReveal;`,
      );
      frag = inject(
        frag,
        "#include <color_fragment>",
        `#include <color_fragment>
         diffuseColor.a *= vReveal;`,
      );
      shader.fragmentShader = frag;
    },
    [],
  );

  useFrame((state, dt) => {
    // The reveal runs once, on its own clock, and is the only thing here not
    // driven by scroll — an entrance is a thing that happens *to* you, not
    // something you have to do. Reduced motion gets the same wave at four
    // times the speed rather than none: it is an opacity ramp, not a rush.
    const rv = uniforms.current.uReveal;
    if (rv.value < REVEAL_MAX) {
      rv.value = Math.min(
        REVEAL_MAX,
        rv.value + dt * (scroll.reduce ? 900 : 175),
      );
    }

    // Pointer is NDC; the well lies flat, so a ray onto the y = throat plane is
    // the honest mapping from screen to sheet. Without it the dip drifts away
    // from the cursor as the camera pitches down toward the throat.
    const target = uniforms.current.uCursor.value;
    if (scroll.reduce || scroll.quality === "lite" || !scroll.pointerMoved) {
      uniforms.current.uPull.value = 0;
      return;
    }
    const ray = state.raycaster;
    ray.setFromCamera(
      POINTER.set(scroll.pointer.x, scroll.pointer.y),
      state.camera,
    );
    const dir = ray.ray.direction;
    const origin = ray.ray.origin;
    const planeY = wellThroatY();
    if (Math.abs(dir.y) > 1e-4) {
      const t = (planeY - origin.y) / dir.y;
      if (t > 0 && t < 400) {
        target.set(origin.x + dir.x * t, origin.z + dir.z * t);
      }
    }
    // Only while the well is the thing you are looking at.
    const near = 1 - THREE.MathUtils.smoothstep(scroll.progress, 0.02, 0.13);
    uniforms.current.uPull.value = THREE.MathUtils.damp(
      uniforms.current.uPull.value,
      strength * near,
      6,
      dt,
    );
  });

  return onBeforeCompile;
}

export function WellGrid() {
  const material = useRef<THREE.LineBasicMaterial>(null);
  const onBeforeCompile = useCursorGravity(15);

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
      const x = r * Math.cos(theta);
      const z = WELL_Z + r * Math.sin(theta);
      const lit =
        1 -
        THREE.MathUtils.smoothstep(r, WELL_RADIUS * 0.06, WELL_RADIUS * 0.9);
      // No brightness floor. A floor meant the rings never actually ended, so
      // the outermost ones kept drawing at a fifth strength right across the
      // Cartesian grid they were supposed to have handed over to.
      const out = 1 - THREE.MathUtils.smoothstep(r, WELL_RADIUS * 1.1, R_MAX);
      return wellCoverage(x, z) * handoverDim(x, z) * out * (0.55 + 2.8 * lit);
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
          onBeforeCompile={onBeforeCompile}
        />
      </lineSegments>
    </group>
  );
}
