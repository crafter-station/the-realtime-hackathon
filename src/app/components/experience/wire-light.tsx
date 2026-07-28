"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { WORM_Z_END } from "./wire-surface";

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
 * The core is white and only the falloff is orange. Saturated orange across a
 * whole surface reads as fire; a white-hot centre bleeding to orange reads as
 * energy. That distinction is doing most of the work.
 *
 * Deliberately not bloom. A post-processing pass would cost frames and would
 * have to be switched off on the `lite` tier, which is every phone — and this
 * is the first thing anyone sees. An additive sprite gets most of the way there
 * and looks identical on every device.
 */

const GLOW_RGBA = [
  [0, "rgba(255,255,255,1)"],
  [0.12, "rgba(255,236,214,0.92)"],
  [0.28, "rgba(255,150,70,0.55)"],
  [0.55, "rgba(255,77,0,0.18)"],
  [1, "rgba(255,77,0,0)"],
] as const;

function useGlowTexture() {
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
      for (const [stop, color] of GLOW_RGBA) g.addColorStop(stop, color);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/**
 * One glow, sitting at a depth, brightening as you close on it. Scale grows a
 * little on approach so it feels like something you are arriving at rather than
 * a decal that happens to be in front of the camera.
 */
function Glow({
  z,
  radius,
  reach,
  peak,
}: {
  z: number;
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
    <sprite ref={sprite} position={[0, 0, z]} scale={[radius, radius, 1]}>
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
      {/* The throat the opening well drains into — the corridor mouth. */}
      <Glow z={2} radius={26} reach={125} peak={0.85} />
      {/* The vortex at the end of the ride. */}
      <Glow z={WORM_Z_END + 30} radius={34} reach={150} peak={1} />
    </group>
  );
}
