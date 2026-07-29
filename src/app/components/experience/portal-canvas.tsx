"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Z } from "./journey";
import { scroll, warpRender } from "./store";
import { WireCompanion } from "./wire-companion";
import { WireHand } from "./wire-hand";
import { PortalLight } from "./wire-light";
import {
  enclosure,
  rideY,
  WELL_Z,
  wellThroatY,
  wormholePresence,
} from "./wire-surface";
import { WireWarp } from "./wire-warp";
import { WellGrid } from "./wire-well";
import { WireWorld } from "./wire-world";
import { WireWormhole } from "./wire-wormhole";

// Camera track: one long continuous ride (the well → the ground gives way →
// corridor → open country → the ground closes → wormhole → end).
const TRACK_START = Z.TRACK_START;
const TRACK_END = Z.TRACK_END;

/**
 * Where the camera stands still under `prefers-reduced-motion`.
 *
 * visual-reference §4.5 asks for exactly this: "corridor freezes at a static
 * one-point plate; content cross-fades. **The still frame must be a good poster
 * on its own.**" Scaling the streak field to 0.22 was a discount, not a freeze —
 * the camera still travelled the full 1,106 units, which is the large-field
 * motion the setting is actually about.
 *
 * The station is the corridor rather than the well, because the spec names the
 * corridor and because a one-point plate is what a rectangular tunnel gives you
 * and a funnel does not. The cost is real and worth stating: somebody who asks
 * for reduced motion gets the tunnel but not the fall into the well — and the
 * fall is the motion, which is the thing they asked us to remove.
 */
const POSTER_Z = -34;
/**
 * The hand sits a short way in front of where the ride stops.
 *
 * Two ways to get this wrong and I found both. At -940 it was 42 units out,
 * past the fog's far plane at 105 and about 5% of frame height — visible in
 * principle, unreadable in practice. At -884 it was *behind* the camera: travel
 * is toward -z, so a z greater than `TRACK_END` is somewhere you have already
 * been. Seventeen units ahead puts it inside the fog's near plane at 26, so it
 * arrives clear rather than grey.
 */
const HAND_Z = -977;
/**
 * Off the centreline. Art-direction asks for the hand "beside a giant REGISTER
 * button" — centred it lands on the finale's own line of copy and occludes it,
 * which is the same mistake as the centred hero type the layout rule exists to
 * prevent.
 */
const HAND_X = 7.6;
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
    // Stars dim inside the closed tunnel, then blaze back up around the
    // wormhole — deep space, dense starfield.
    if (material.current) {
      const inside = enclosure(camZ);
      const worm = wormholePresence(camZ);
      const base = THREE.MathUtils.lerp(0.7, 0.12, inside);
      // The streak field replaces the starfield outright during the jump —
      // two star layers at once just reads as noise.
      material.current.opacity = THREE.MathUtils.damp(
        material.current.opacity,
        THREE.MathUtils.lerp(base, 0.92, worm) *
          (1 - warpRender(scroll.progress)),
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
 * faster scrolling adds real speed, banking and a FOV kick.
 */
function Rig() {
  const { camera } = useThree();
  const reduce = scroll.reduce;
  useFrame((state, dt) => {
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

    // FOV kick with speed (skipped for reduced motion).
    const cam = camera as THREE.PerspectiveCamera;
    const targetFov = reduce ? 55 : 55 + Math.min(v * 0.9, 16);
    const nextFov = damp(cam.fov, targetFov, 5, cdt);
    if (Math.abs(nextFov - cam.fov) > 0.01) {
      cam.fov = nextFov;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

/** Activates the finale hand once the journey is nearly complete. */
function FinaleHand() {
  const [active, setActive] = useState(false);
  const { camera, size } = useThree();
  useFrame(() => {
    const shouldBeActive = scroll.progress > 0.9;
    if (shouldBeActive !== active) setActive(shouldBeActive);
  });

  // `HAND_X` is a world offset, and a world offset is not a place on screen:
  // the same 7.6 units that sits beside the CTA on a wide desktop is off the
  // edge of a portrait phone, where the horizontal field of view is a fraction
  // as wide. Solve for the frustum's half-width at the hand's own depth and
  // keep it inside that.
  const handX = useMemo(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const distance = Math.abs(TRACK_END - HAND_Z);
    const halfHeight = Math.tan((cam.fov * Math.PI) / 360) * distance;
    const halfWidth = halfHeight * (size.width / Math.max(size.height, 1));
    return Math.min(HAND_X, halfWidth * 0.56);
  }, [camera, size]);

  return <WireHand active={active} x={handX} z={HAND_Z} />;
}

export function PortalCanvas() {
  const stars = scroll.quality === "lite" ? 2200 : 6500;
  return (
    // Decorative, and it has to say so. Every word of the ride lives in the
    // overlay's DOM, so the scene carries nothing a reader would miss — but an
    // unlabelled <canvas> is still a node a screen reader can stop on and
    // announce as nothing in particular. The placeholder this replaces on mount
    // was already `aria-hidden`; the real one being louder than its own
    // placeholder was an oversight, not a decision.
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
        camera={{ fov: 55, near: 0.1, far: 190, position: [0, 0, TRACK_START] }}
      >
        <color attach="background" args={["#0e0e10"]} />
        {/* Reaches far enough that the whole well and the curve of the ground
            beyond it are both readable from the opening frame. */}
        <fog attach="fog" args={["#0e0e10", 26, 105]} />
        <Starfield count={stars} />
        <WireWorld />
        <WellGrid />
        <WireCompanion />
        <PortalLight />
        <WireWarp />
        <WireWormhole />
        <FinaleHand />
        <Rig />
      </Canvas>
    </div>
  );
}
