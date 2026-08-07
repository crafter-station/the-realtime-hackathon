"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { framingFov } from "./journey";
import { CRAFTER_URL, PORTAL_URL } from "./links";
import { scroll } from "./store";
import { WireHand } from "./wire-hand";

/**
 * The threshold.
 *
 * `docs/portal-experience-brief.md` opens its spine with a gate — "ENTER … Click
 * → camera flies through the portal" — and the page never had one. This is that
 * beat, built the way the rest of the site is built rather than the way the
 * brief sketched it: a hand of orange wire reaching in out of the dark, turning
 * to follow your cursor, and one control.
 *
 * WHY IT IS ITS OWN CANVAS
 *
 * The ride's camera is owned by `Rig`, which parks it at `TRACK_START` looking
 * into the well and drives it off scroll progress. Framing a hand in close-up
 * needs a different camera doing a different thing, and threading that through
 * `Rig` as a mode would put a branch for a beat that plays once into the code
 * that runs for the whole page.
 *
 * A second `<Canvas>` costs a second WebGL context for as long as the gate is
 * up, and then it unmounts and gives it back. That is the cheaper trade, and it
 * is what keeps `portal-canvas.tsx` from knowing this exists at all.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not remove the page. The landing is in the document underneath,
 * rendered and crawlable, and the gate is an overlay over it — a gate that
 * empties the DOM is a gate that hides an event listing from search. The
 * landing is `inert` while this is up so the tab order does not walk into
 * something nobody can see, and `Start` is the first and only stop.
 */

/** Sparse stars, so the hand is reaching *out of* somewhere. */
function GateStars({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    // A fixed walk rather than Math.random: the gate is the first frame of the
    // site and it should be the same first frame every time.
    const PHI = 0.618_033_988_75;
    for (let i = 0; i < count; i += 1) {
      const u = (i * PHI) % 1;
      const v = (i * PHI * 2.4) % 1;
      positions[i * 3] = (u - 0.5) * 26;
      positions[i * 3 + 1] = (v - 0.5) * 16;
      positions[i * 3 + 2] = -2 - ((i * 7) % 40) * 0.22;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count]);

  useFrame((_, dt) => {
    if (points.current) points.current.rotation.z += dt * 0.006;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        size={0.032}
        sizeAttenuation
        color="#ffffff"
        transparent
        opacity={0.65}
        depthWrite={false}
      />
    </points>
  );
}

/** The hand's framing, before any correction. Tighter than the ride's 55°. */
const GATE_FOV = 45;

export function Gate({ onStart }: { onStart: () => void }) {
  const stars = scroll.quality === "lite" ? 220 : 520;
  /*
    The same widening the ride's camera gets, for the same reason.

    `fov` is the *vertical* angle, so a portrait phone does not get a shorter
    version of this picture — it gets a slot. At 390x844 a hardcoded 45° is 22°
    across, and the hand is a wide object lying along the horizontal: it would be
    cropped to a forearm and two fingers. `journey.ts` carries the full argument;
    this is the second camera on the site and the first one to need it after the
    essay was written.

    Resolved once at mount rather than damped into, because unlike the ride there
    is nothing here to damp — the gate's camera never moves.
  */
  const fov =
    typeof window === "undefined"
      ? GATE_FOV
      : framingFov(
          window.innerWidth / Math.max(window.innerHeight, 1),
          GATE_FOV,
        );

  return (
    <div className="xp-gate">
      <div className="xp-gate__stage" aria-hidden>
        <Canvas
          dpr={scroll.quality === "lite" ? [1, 1.3] : [1, 1.8]}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          camera={{ fov, near: 0.1, far: 60, position: [0, 0, 6] }}
        >
          <color attach="background" args={["#0e0e10"]} />
          <GateStars count={stars} />
          <WireHand />
        </Canvas>
      </div>

      <div className="xp-gate__panel">
        <p className="xp-gate__brand">
          <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer">
            Portal
          </a>
          <span aria-hidden>×</span>
          <a href={CRAFTER_URL} target="_blank" rel="noopener noreferrer">
            Crafter Station
          </a>
        </p>
        {/*
          The one control, and it says what it does rather than what the theme
          would like it to say. "Enter the portal" is the brief's wording and it
          is a sentence about the decoration; the visitor is starting a page.

          Brackets because the rest of the page already numbers its cards `[01]`
          — this is the same mono voice, not a new one.
        */}
        <button type="button" className="xp-gate__start" onClick={onStart}>
          [ Start ]
        </button>
        <p className="xp-gate__note">The realtime hackathon · Aug 7–9, 2026</p>
      </div>
    </div>
  );
}
