"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { WELL_Z, WORM_Z_END, wellThroatY } from "./wire-surface";

/**
 * Portal light.
 *
 * The product is called Portal and Portal is orange, so the portals in this
 * world are not tinted orange — they are *made of* orange light. It is the only
 * chromatic thing here, it is emitted rather than painted, and it exists at
 * exactly two places: the throat the opening well drains into, and the vortex
 * at the end. Everywhere else the world is white hairlines on black, which is
 * what keeps this from reading as a colour scheme.
 *
 * Both portals share one ramp. They had two while the opening was cyan, and the
 * second was the only thing making the claim above false.
 *
 * The core is white and only the falloff is orange. Saturated orange across a
 * whole surface reads as fire; a white-hot centre bleeding to orange reads as
 * energy. That distinction is doing most of the work.
 *
 * Deliberately not bloom. A post-processing pass would cost frames and would
 * have to be switched off on the `lite` tier, which is every phone — and this
 * is the first thing anyone sees. An additive sprite gets most of the way there
 * and looks identical on every device.
 *
 * TRIED IT, WITH NUMBERS — see #33
 *
 * `@react-three/postprocessing` is already a dependency, so a `Bloom` pass gated
 * to the `high` tier was built and measured rather than argued about.
 *
 * The frame cost turned out to be nothing: 60.2fps median against a 59.9
 * baseline, identical p95 at 17.2ms, at 1280×800. The original objection was
 * wrong on that point.
 *
 * It looked worse anyway, and the reason is the palette rather than the
 * settings. This style is white hairlines on near-black, so *the lines are the
 * brightest thing in frame* — any threshold low enough to catch the orange
 * throat also catches the grid, and the grid stops being hairline. Raising the
 * threshold from 0.62 to 0.88 did not rescue it. Routing through an
 * `EffectComposer` also shifted the whole image warmer and more saturated, not
 * only the bright parts, which is a colour-management change and not bloom at
 * all.
 *
 * The precision of the wireframe *is* the style — `visual-reference.md` calls it
 * Wireframe Transit — and bloom trades exactly that away. So this stands, and
 * now it stands on a measurement instead of an assumption.
 */

const GLOW_RGBA = [
  [0, "rgba(255,255,255,1)"],
  [0.12, "rgba(255,236,214,0.92)"],
  [0.28, "rgba(255,150,70,0.55)"],
  [0.55, "rgba(255,77,0,0.18)"],
  [1, "rgba(255,77,0,0)"],
] as const;

type GlowRamp = readonly (readonly [number, string])[];

function useGlowTexture(ramp: GlowRamp = GLOW_RGBA) {
  return useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const g = ctx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2,
      );
      for (const [stop, color] of ramp) g.addColorStop(stop, color);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [ramp]);
}

/**
 * The light pooled in the bottom of the well.
 *
 * A billboard sprite is wrong for this one: the reference does not show a lamp
 * hanging in the throat, it shows the *surface itself* glowing where the walls
 * turn over, brightest in a band either side of the centre. So this is a disc
 * lying flat on the floor of the well, additive, seen at a raking angle — which
 * is what squashes it into that band from the camera's point of view.
 */
function WellPool({ z, y, radius }: { z: number; y: number; radius: number }) {
  const texture = useGlowTexture(GLOW_RGBA);
  return (
    <mesh position={[0, y + 0.15, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 64]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        fog={false}
      />
    </mesh>
  );
}

/**
 * One glow, sitting at a depth, brightening as you close on it. Scale grows a
 * little on approach so it feels like something you are arriving at rather than
 * a decal that happens to be in front of the camera.
 */
function Glow({
  z,
  y = 0,
  radius,
  reach,
  peak,
}: {
  z: number;
  y?: number;
  radius: number;
  reach: number;
  peak: number;
}) {
  const sprite = useRef<THREE.Sprite>(null);
  const material = useRef<THREE.SpriteMaterial>(null);
  const texture = useGlowTexture();

  useFrame((state, dt) => {
    const mat = material.current;
    const s = sprite.current;
    if (!mat || !s) return;
    const distance = Math.abs(state.camera.position.z - z);
    // Off entirely until the portal is within reach — no ambient orange haze.
    const near = 1 - THREE.MathUtils.smoothstep(distance, reach * 0.25, reach);
    mat.opacity = THREE.MathUtils.damp(mat.opacity, near * peak, 3, dt);
    const scale = radius * THREE.MathUtils.lerp(0.55, 1, near);
    s.scale.setScalar(THREE.MathUtils.damp(s.scale.x, scale, 3, dt));
  });

  return (
    <sprite ref={sprite} position={[0, y, z]} scale={[radius, radius, 1]}>
      <spriteMaterial
        ref={material}
        map={texture}
        transparent
        opacity={0}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        fog={false}
      />
    </sprite>
  );
}

export function PortalLight() {
  return (
    <group>
      {/*
        The throat of the opening well. `reach` is deliberately far larger than
        the distance the camera starts at, because this one is not something you
        approach — it is lit in the first frame, before any scroll, and the well
        is drawn around it. It was previously parked at the corridor mouth with
        a reach shorter than that opening distance, so it read as zero until a
        third of the way down the page.
      */}
      <WellPool z={WELL_Z} y={wellThroatY()} radius={44} />
      <Glow z={WELL_Z} y={wellThroatY()} radius={11} reach={260} peak={0.3} />
      {/* The vortex at the end of the ride. */}
      <Glow z={WORM_Z_END + 30} radius={26} reach={130} peak={0.62} />
    </group>
  );
}
