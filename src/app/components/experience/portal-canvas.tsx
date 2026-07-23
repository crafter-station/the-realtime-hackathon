"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { scroll } from "./store";
import { WireHand } from "./wire-hand";
import { WireGrid, WireTunnel } from "./wire-tunnel";

// Camera track: 6 (hero) → TRACK_END (finale). One continuous flight.
const TRACK_START = 6;
const TRACK_END = -120;
// Scene layout along the track.
const TUNNEL = { zStart: -10, zEnd: -52 } as const;
const GRID = { zStart: -55, zEnd: -128 } as const;
const HAND_Z = -126.5;

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

/** Sparse white starfield on the pale black; recycles to feel endless. */
function Starfield({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 55;
      positions[i * 3 + 2] = 8 - Math.random() * 70;
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
      if (arr[i] > camZ + 8) arr[i] -= 78;
    }
    geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        size={0.045}
        sizeAttenuation
        color="#ffffff"
        transparent
        opacity={0.7}
        depthWrite={false}
      />
    </points>
  );
}

/**
 * Scroll = velocity. The camera flies the whole track across the full scroll;
 * scrolling faster adds real speed and a FOV kick — the dimension-shift rush.
 */
function Rig() {
  const { camera } = useThree();
  const reduce = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  useFrame((state, dt) => {
    const cdt = Math.min(dt, 0.05);
    const v = Math.min(Math.abs(scroll.velocity), 30);

    // Base position from progress + a velocity surge pushing you deeper.
    const base = THREE.MathUtils.lerp(TRACK_START, TRACK_END, scroll.progress);
    const surge = reduce ? 0 : v * 0.12;
    camera.position.z = damp(camera.position.z, base - surge, 4.2, cdt);

    // Gentle pointer parallax.
    camera.position.x = damp(camera.position.x, state.pointer.x * 0.35, 3, cdt);
    camera.position.y = damp(camera.position.y, state.pointer.y * 0.25, 3, cdt);
    camera.rotation.set(0, 0, 0);

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

/** Keeps the grid hidden until the camera leaves the tunnel (no horizon line
 *  slicing through the tunnel beat). */
function GridGate({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) {
      group.current.visible = state.camera.position.z < -38;
    }
  });
  return <group ref={group}>{children}</group>;
}

/** Activates the finale hand once the journey is nearly complete. */
function FinaleHand() {
  const [active, setActive] = useState(false);
  useFrame(() => {
    const shouldBeActive = scroll.progress > 0.86;
    if (shouldBeActive !== active) setActive(shouldBeActive);
  });
  return <WireHand active={active} z={HAND_Z} />;
}

export function PortalCanvas() {
  const stars = scroll.quality === "lite" ? 1200 : 3200;
  return (
    <div className="xp-stage">
      <Canvas
        dpr={scroll.quality === "lite" ? [1, 1.3] : [1, 1.8]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 55, near: 0.1, far: 90, position: [0, 0, TRACK_START] }}
      >
        <color attach="background" args={["#0e0e10"]} />
        <Starfield count={stars} />
        <WireTunnel zStart={TUNNEL.zStart} zEnd={TUNNEL.zEnd} />
        <GridGate>
          <WireGrid zStart={GRID.zStart} zEnd={GRID.zEnd} />
        </GridGate>
        <FinaleHand />
        <Rig />
      </Canvas>
    </div>
  );
}
