"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Z } from "./journey";
import { FLOOR_Y, WELL_Z, wellThroatY } from "./wire-surface";

/**
 * Portal light.
 *
 * The product is called Portal and Portal is orange, so the portals in this
 * world are not tinted orange — they are *made of* orange light. It is the only
 * chromatic thing here, it is emitted rather than painted, and it exists at
 * exactly two places. Everywhere else the world is white hairlines on black,
 * which is what keeps this from reading as a colour scheme.
 *
 * THE SECOND PLACE MOVED, AND IT MOVED SOMEWHERE BETTER
 *
 * It used to be the vortex at 65% of the page. The vortex went with the second
 * crossing (see the header of `journey.ts`), which left this rule with one place
 * and the page with orange only in its first fifteen seconds.
 *
 * So the second portal is the register. You enter through orange light and you
 * leave through orange light, and the thing you leave through is the one action
 * the page exists for — which is a better argument for the colour than "there is
 * a vortex here" ever was. It also means the glow starts blooming during the FAQ
 * and is at full strength under the button: the brief's north star, lit.
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

export function useGlowTexture(ramp: GlowRamp = GLOW_RGBA) {
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
 * Light pooled on the surface.
 *
 * A billboard sprite is wrong for this one: the reference does not show a lamp
 * hanging in the throat, it shows the *surface itself* glowing where the walls
 * turn over, brightest in a band either side of the centre. So this is a disc
 * lying flat on the ground, additive, seen at a raking angle — which is what
 * squashes it into that band from the camera's point of view.
 *
 * THIS IS WHAT MAKES THE ORANGE READ AS ORANGE
 *
 * Worth stating, because the finale shipped without one and the difference was
 * measurable in a screenshot: a `Glow` sprite alone at the register rendered as
 * a pale grey haze behind the headline, not as light. The ramp's white core
 * dominates a billboard seen face on, and the orange falloff spreads too thin to
 * register against near-black.
 *
 * The raking angle is the whole trick. Foreshortened, the same ramp lays its
 * white core in a thin band on the ground and stretches the orange across the
 * frame — which is the picture. Both portals get one now, which is also what
 * makes them read as the same thing seen twice.
 */
function Pool({
  z,
  y,
  radius,
  reach,
}: {
  z: number;
  y: number;
  radius: number;
  /**
   * Omit for a pool that is simply lit. The opening well is the first frame and
   * there is no approach to it — it has to be at full strength before anyone
   * has scrolled.
   *
   * The finale needs the other behaviour. Without a ramp it would switch on
   * whole the moment it crossed the camera's far plane at 190 units, which lands
   * in the middle of the FAQ; with one it comes up under the questions and is at
   * full strength by the register.
   */
  reach?: number;
}) {
  const texture = useGlowTexture(GLOW_RGBA);
  const material = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state, dt) => {
    const mat = material.current;
    if (!mat || reach === undefined) return;
    const distance = Math.abs(state.camera.position.z - z);
    const near = 1 - THREE.MathUtils.smoothstep(distance, reach * 0.3, reach);
    mat.opacity = THREE.MathUtils.damp(mat.opacity, near * POOL_OPACITY, 3, dt);
  });

  return (
    <mesh position={[0, y + 0.15, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 64]} />
      <meshBasicMaterial
        ref={material}
        map={texture}
        transparent
        opacity={reach === undefined ? POOL_OPACITY : 0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
        fog={false}
      />
    </mesh>
  );
}

const POOL_OPACITY = 0.9;

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
      <Pool z={WELL_Z} y={wellThroatY()} radius={44} />
      <Glow z={WELL_Z} y={wellThroatY()} radius={11} reach={260} peak={0.3} />
      {/*
        The register. `reach` of 150 against a portal 34 units past the end of
        the track means it starts showing at about 88% of the page — under the
        FAQ — and is still ahead of you when the ride stops, which is what makes
        it a way out rather than a wall.

        SUNK BELOW THE FLOOR, WHICH IS THE DIFFERENCE BETWEEN LIGHT AND A LINE

        At `FLOOR_Y` this pool still read grey, and the reason is the viewing
        angle rather than the colour. The camera stands 2.8 units over the plain
        and the portal is 44 units ahead, so a disc lying on the floor is seen at
        3.4° — effectively edge-on — and the ramp's white core collapses into a
        thin bright band with the orange falloff squeezed out of frame either
        side of it.

        The opening well does not have this problem because its disc is 42 units
        down a funnel and the camera looks into it from above the rim. Seven
        units under the plain buys the same geometry cheaply: 11°, three times
        more open, and the ramp gets room to be a ramp.

        It is also the truer picture. The first portal is a hole in the ground
        with light at the bottom; so is this one. `journey.test.ts` asserts the
        ground here is dead flat, which is what lets the depth be a constant
        rather than a call into `floorY`.
      */}
      <Pool z={Z.FINALE_PORTAL} y={FLOOR_Y - 7} radius={46} reach={190} />
      <Glow z={Z.FINALE_PORTAL} y={-1.5} radius={24} reach={150} peak={0.45} />
    </group>
  );
}
