"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { BASE_FOV, framingFov, Z } from "./journey";
import { scroll } from "./store";
import { PortalLight } from "./wire-light";
import { WireSignal } from "./wire-signal";
import { enclosure, rideY, WELL_Z, wellThroatY } from "./wire-surface";
import { WellGrid } from "./wire-well";
import { WireWorld } from "./wire-world";

// Camera track: one continuous ride — the well, the ground giving way, the
// crossing, and then open country all the way to the register.
const TRACK_START = Z.TRACK_START;
const TRACK_END = Z.TRACK_END;

/**
 * Where the camera stands still under `prefers-reduced-motion`.
 *
 * visual-reference §4.5 asks for exactly this: "corridor freezes at a static
 * one-point plate; content cross-fades. **The still frame must be a good poster
 * on its own.**"
 *
 * The station is inside the crossing, which is the only sealed section left on
 * the page and the only place a one-point plate exists — a funnel does not give
 * you one and open country certainly does not. The sealed window runs
 * `MOUTH_SHUT` (30) to `FLARE_START` (0), so this sits in the middle of it.
 *
 * The cost is real and worth stating: somebody who asks for reduced motion gets
 * the room but not the fall into the well — and the fall is the motion, which is
 * the thing they asked us to remove.
 */
const POSTER_Z = 15;

/** How far above the rim the opening frame sits, in world units. */
const OPENING_LIFT = 13;

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

/** Sparse white starfield on the pale black; recycles to feel endless. */
function Starfield({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 55;
      // The band has to start centred on the camera, not on the origin —
      // otherwise the sky is empty for the whole opening act.
      positions[i * 3 + 2] = TRACK_START + 8 - Math.random() * 88;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count]);
  useFrame((state, dt) => {
    const pts = points.current;
    if (!pts) return;
    pts.rotation.z += dt * 0.004;
    const camZ = state.camera.position.z;
    const arr = geometry.attributes.position.array as Float32Array;
    for (let i = 2; i < arr.length; i += 3) {
      if (arr[i] > camZ - 10) arr[i] -= 88;
    }
    geometry.attributes.position.needsUpdate = true;
    // The sky goes out inside the crossing and comes back on the far side. It
    // is the only thing that reports the crossing from outside the geometry, so
    // it is also what makes the sealed stretch read as sealed rather than as a
    // dark patch.
    if (material.current) {
      material.current.opacity = THREE.MathUtils.damp(
        material.current.opacity,
        THREE.MathUtils.lerp(0.7, 0.1, enclosure(camZ)),
        3,
        dt,
      );
    }
  });
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        ref={material}
        size={0.045}
        fog={false}
        sizeAttenuation
        color="#ffffff"
        transparent
        opacity={0.95}
        depthWrite={false}
      />
    </points>
  );
}

/**
 * Scroll = velocity. The camera rides the curved path the whole way;
 * faster scrolling adds real speed and a FOV kick.
 */
function Rig() {
  const { camera, size } = useThree();
  const reduce = scroll.reduce;
  // `_` for the frame state: this rig reads the camera off `useThree` rather than
  // off the per-frame state, so only the delta is wanted — same shape as the
  // other `useFrame((_, dt)` callbacks in the renderers.
  useFrame((_, dt) => {
    const cdt = Math.min(dt, 0.05);
    const v = Math.min(Math.abs(scroll.velocity), 30);

    // Forward travel + a velocity surge pushing you deeper — or, for reduced
    // motion, no travel at all: the camera holds its station and the copy
    // scrolls over a still frame.
    const base = reduce
      ? POSTER_Z
      : THREE.MathUtils.lerp(TRACK_START, TRACK_END, scroll.progress);
    const surge = reduce ? 0 : v * 0.12;
    const camZ = damp(camera.position.z, base - surge, 4.2, cdt);
    camera.position.z = camZ;

    // The run is dead straight down the centreline — only mouse parallax
    // shifts you off it.
    camera.position.x = damp(
      camera.position.x,
      scroll.pointer.x * 0.35,
      4,
      cdt,
    );
    // The opening frame looks at the well from above its rim, not from the
    // plain at standing height — a gravity well only reads as a well when you
    // can see into it. This is a camera move, not a change to where the ground
    // is: `rideY` still returns eye height over the surface, and the lift is
    // spent by the time the ground itself starts falling away.
    const aim = THREE.MathUtils.smoothstep(camZ, WELL_Z + 15, TRACK_START);
    camera.position.y = damp(
      camera.position.y,
      rideY(camZ) + OPENING_LIFT * aim + scroll.pointer.y * 0.25,
      4,
      cdt,
    );

    // No yaw or bank without a curve to lean into; pitch still follows the
    // slope of the rolling floor.
    camera.rotation.order = "YXZ";
    const slope = (rideY(camZ - 5) - rideY(camZ)) / 5;
    // The opening frame is the well, so the camera has to be *looking* at it.
    // On the flat rim the slope term is ~0, which would leave the throat down
    // at the bottom edge; aim straight at it instead and hand back to the slope
    // once the ground itself starts falling away.
    const aimPitch = -Math.atan2(
      camera.position.y - wellThroatY(),
      camZ - WELL_Z,
    );
    const pitch = reduce
      ? 0
      : THREE.MathUtils.lerp(Math.atan(slope) * 0.55, aimPitch, aim);
    camera.rotation.x = damp(camera.rotation.x, pitch, 4, cdt);

    // FOV kick with speed (skipped for reduced motion), over whatever base the
    // viewport's shape asks for. The kick is scaled back by however much the
    // base was already widened — a phone starting at 78° does not need another
    // 16 on top to sell speed, and 94° would bow the room's rails.
    const cam = camera as THREE.PerspectiveCamera;
    const fovBase = framingFov(size.width / Math.max(size.height, 1));
    const targetFov = reduce
      ? fovBase
      : fovBase + Math.min(v * 0.9, 16) * (BASE_FOV / fovBase);
    const nextFov = damp(cam.fov, targetFov, 5, cdt);
    if (Math.abs(nextFov - cam.fov) > 0.01) {
      cam.fov = nextFov;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

export function PortalCanvas() {
  const stars = scroll.quality === "lite" ? 2200 : 6500;
  /*
    The opening fov, resolved before the first frame rather than damped into.

    `Rig` corrects the field every frame, but it damps — so a phone mounting at a
    hardcoded 55 would play a half-second zoom out to 78 on load, over the one
    frame that has to be right immediately. Reading the viewport here costs
    nothing: this component only ever mounts behind `experience.tsx`'s `mounted`
    gate, so `window` is always there.
  */
  const openingFov =
    typeof window === "undefined"
      ? BASE_FOV
      : framingFov(window.innerWidth / Math.max(window.innerHeight, 1));
  return (
    // Decorative, and it has to say so. Every word of the ride lives in the
    // overlay's DOM, so the scene carries nothing a reader would miss — but an
    // unlabelled <canvas> is still a node a screen reader can stop on and
    // announce as nothing in particular.
    <div className="xp-stage" aria-hidden>
      <Canvas
        dpr={scroll.quality === "lite" ? [1, 1.3] : [1, 1.8]}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          // Lets the frame be read back after it is drawn, which is the only
          // way to capture this canvas — for OG art, and for looking at the
          // thing while building it.
          preserveDrawingBuffer: true,
        }}
        camera={{
          fov: openingFov,
          near: 0.1,
          far: 190,
          position: [0, 0, TRACK_START],
        }}
      >
        <color attach="background" args={["#0e0e10"]} />
        {/* Reaches far enough that the whole well and the curve of the ground
            beyond it are both readable from the opening frame. */}
        <fog attach="fog" args={["#0e0e10", 26, 105]} />
        <Starfield count={stars} />
        <WireWorld />
        <WellGrid />
        {/*
          Skipped outright under reduced motion rather than frozen. The camera
          holds station inside the crossing, which is 100+ units short of the
          first band — so the layer would be drawing five animated worlds that
          are never in frame. Every one of the five behaviours is also motion
          with nothing motivating it once the camera stops, which is the exact
          thing the request asks us not to do.
        */}
        {scroll.reduce ? null : <WireSignal />}
        <PortalLight />
        <Rig />
      </Canvas>
    </div>
  );
}
