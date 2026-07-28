"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
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
const TRACK_START = 146;
const TRACK_END = -898;
/**
 * The hand sits a few units off the lens, not at the end of the world.
 *
 * It was parked at -940 against a `TRACK_END` of -898 — 42 units out, past the
 * fog's far plane at 105, about 5% of the frame, and dead centre where the
 * finale copy already is. Art-direction asks for it "beside a giant REGISTER
 * button", which means near enough to read and off to one side.
 */
const HAND_Z = -884;
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

    // Forward travel + a velocity surge pushing you deeper.
    const base = THREE.MathUtils.lerp(TRACK_START, TRACK_END, scroll.progress);
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
  useFrame(() => {
    const shouldBeActive = scroll.progress > 0.9;
    if (shouldBeActive !== active) setActive(shouldBeActive);
  });
  return <WireHand active={active} z={HAND_Z} />;
}

export function PortalCanvas() {
  const stars = scroll.quality === "lite" ? 2200 : 6500;
  return (
    <div className="xp-stage">
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
