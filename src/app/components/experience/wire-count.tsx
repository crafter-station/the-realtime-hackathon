"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { beatFraction, Z } from "./journey";
import { scroll } from "./store";
import { rideY } from "./wire-surface";

/**
 * The countdown, standing in the corridor.
 *
 * Every word on this page was DOM floating over the canvas — the world and the
 * copy never touched, and the type read as a caption track laid over a film.
 * These are the first characters that live in the world: they sit at a fixed z
 * inside the closed corridor, take the scene's fog, grow as you close on them,
 * and you fly through them.
 *
 * WHY THE COUNTDOWN FIRST
 *
 * It is one glyph per beat. Legibility is the whole risk here — a wire title
 * lived on this page once and was deleted because it lay flat on the ground at a
 * 6° viewing angle, about 58 units wide against 43 visible, unreadable by
 * construction. The lesson was about *angle*, not about the idea, so this is a
 * billboard: a sprite cannot be seen edge-on. A single digit is also the
 * cheapest possible test of whether type in this world reads at all.
 *
 * WHY PIXEL AND NOT THE HEADLINE FACE
 *
 * `visual-reference.md` §3 gives `Geist Pixel Square` one job — "the countdown,
 * all times, all dates, all counts" — and gives Space Grotesk another: "section
 * titles, track names, the wordmark". The DOM numerals have been set in Space
 * Grotesk, which is the headline face doing the numerals' job. These are on the
 * face the system asks for.
 *
 * WHY A CANVAS TEXTURE AND NOT REAL TEXT GEOMETRY
 *
 * Text geometry would need the font parsed at runtime, and the only copy of this
 * face reachable from the browser is a `woff2` under `public/`, which is the
 * format text-geometry parsers are least likely to read. Canvas takes the font
 * the page has already loaded, by name, and cannot disagree with what the DOM is
 * using. It is also the pattern `wire-light.tsx` already uses for its glow ramp.
 * The face is a pixel face, so a raster of it loses nothing.
 */

/** How tall a numeral stands, in world units. The corridor is 16.4 floor to ceiling. */
const GLYPH_H = 9.2;
/** Distance at which a numeral starts to appear, and where it has gone again. */
const FADE_IN = 78;
const FADE_OUT = 16;
/**
 * How far beyond its beat each numeral stands.
 *
 * A beat's z is where the camera *arrives* during that beat, so a glyph placed
 * there is one you are inside rather than one you read — the first version put
 * the 3 six units from the lens and it filled the frame as an abstract shape.
 * Held back 28 units, it subtends about a third of frame height while its beat
 * has the screen, then goes before you reach it.
 */
const STAND_OFF = 28;

const DIGITS = ["3", "2", "1"] as const;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Where a beat sits along the camera track, in world z. */
function beatZ(id: string): number {
  return lerp(Z.TRACK_START, Z.TRACK_END, beatFraction(id));
}

/**
 * Draws one glyph to a texture in the face the page has already loaded.
 *
 * The family name comes from the CSS custom property rather than being written
 * out, because `next/font` generates it at build time — hardcoding a guess would
 * silently fall back to a system face and nobody would notice until the pixels
 * looked wrong.
 */
function drawGlyph(digit: string, family: string): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${size * 0.78}px ${family}`;
    ctx.fillText(digit, size / 2, size / 2 + size * 0.02);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  // The glyph is drawn once at 512 and viewed from a long way off to very close.
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

function Numeral({
  digit,
  z,
  texture,
}: {
  digit: string;
  z: number;
  texture: THREE.Texture;
}) {
  const sprite = useRef<THREE.Sprite>(null);
  const material = useRef<THREE.SpriteMaterial>(null);

  useFrame((state, dt) => {
    const s = sprite.current;
    const mat = material.current;
    if (!s || !mat) return;

    // Signed, not absolute: a numeral behind the camera is gone, not arriving.
    // Travel is toward -z, so a camera z *below* the glyph's has passed it.
    const ahead = state.camera.position.z - z;

    // `smoothstep` takes an ascending range and returns 0 below the first edge —
    // handing it a descending one to mean "fade the other way" does not invert
    // it, it just reads as 0 everywhere near the glyph. Written that way, the
    // *far* numerals were the visible ones and the one you were about to fly
    // through was blank. Ascending range, then subtract.
    const arriving =
      1 - THREE.MathUtils.smoothstep(ahead, FADE_IN * 0.45, FADE_IN);
    const leaving = THREE.MathUtils.smoothstep(ahead, 0, FADE_OUT);
    const target = arriving * leaving;

    mat.opacity = THREE.MathUtils.damp(
      mat.opacity,
      target,
      6,
      Math.min(dt, 0.05),
    );
    // Grows on approach, so it reads as something you are arriving at rather
    // than a decal that happens to be in front of you.
    const scale = GLYPH_H * lerp(0.82, 1, arriving);
    s.scale.setScalar(
      THREE.MathUtils.damp(s.scale.x, scale, 5, Math.min(dt, 0.05)),
    );
  });

  return (
    <sprite
      ref={sprite}
      position={[0, rideY(z) + 0.6, z]}
      scale={[GLYPH_H, GLYPH_H, 1]}
    >
      <spriteMaterial
        ref={material}
        map={texture}
        transparent
        opacity={0}
        depthWrite={false}
        // Takes the corridor's fog, which is most of what makes it belong to the
        // world rather than sit on top of it.
        fog
      />
    </sprite>
  );
}

export function WireCount() {
  // The face the page actually loaded, read once on mount. Empty on the server,
  // which is why the sprites wait for it rather than drawing into a fallback.
  const [family, setFamily] = useState("");

  useEffect(() => {
    let cancelled = false;
    const resolve = () => {
      if (cancelled) return;
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue("--font-geist-pixel")
        .trim();
      if (value) setFamily(value);
    };
    // `document.fonts.ready` rather than an effect alone: a canvas asked to draw
    // in a face the browser has not finished loading silently gets a system one.
    void document.fonts.ready.then(resolve);
    return () => {
      cancelled = true;
    };
  }, []);

  const textures = useMemo(() => {
    if (!family) return null;
    return DIGITS.map((d) => drawGlyph(d, family));
  }, [family]);

  useEffect(() => {
    return () => {
      for (const t of textures ?? []) t.dispose();
    };
  }, [textures]);

  // Under reduced motion the camera never travels, so a numeral pinned to a z
  // the camera never reaches would simply never appear. The DOM countdown stays
  // the one that runs in that case.
  if (!textures || scroll.reduce) return null;

  return (
    <group>
      {DIGITS.map((d, i) => (
        <Numeral
          key={d}
          digit={d}
          z={beatZ(`count${3 - i}`) - STAND_OFF}
          texture={textures[i]}
        />
      ))}
    </group>
  );
}
