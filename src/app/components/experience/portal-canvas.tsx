"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll } from "./store";

const ORANGE = new THREE.Color("#ff4d00");
const WHITE = new THREE.Color("#ffffff");

// How far the camera travels (in world units) across the full scroll.
const TRACK_LEN = 88;
// Depths (z) where each "world" node lives along the travel path.
const WORLD_Z = [-14, -30, -46, -62, -78];

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}

/** Drifting starfield that gives the void depth and parallax. */
function Starfield({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const o = i * 3;
      positions[o] = (Math.random() - 0.5) * 60;
      positions[o + 1] = (Math.random() - 0.5) * 60;
      positions[o + 2] = -Math.random() * TRACK_LEN - 4;
      const c = Math.random() > 0.82 ? ORANGE : WHITE;
      const t = 0.35 + Math.random() * 0.65;
      colors[o] = c.r * t;
      colors[o + 1] = c.g * t;
      colors[o + 2] = c.b * t;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [count]);

  useFrame((_, dt) => {
    if (points.current) points.current.rotation.z += dt * 0.008;
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial
        size={0.09}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** The portal itself: a glowing ring plus an inward-swirling particle vortex. */
function Portal() {
  const ring = useRef<THREE.Mesh>(null);
  const vortex = useRef<THREE.Points>(null);

  const vortexGeo = useMemo(() => {
    const n = scroll.quality === "lite" ? 900 : 2600;
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
      const o = i * 3;
      const a = Math.random() * Math.PI * 2;
      const r = 0.2 + Math.random() * 2.1;
      positions[o] = Math.cos(a) * r;
      positions[o + 1] = Math.sin(a) * r;
      positions[o + 2] = (Math.random() - 0.5) * 0.6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const breathe = 1 + Math.sin(t * 1.6) * 0.03;
    if (ring.current) {
      ring.current.rotation.z = t * 0.25;
      ring.current.scale.setScalar(breathe * (1 - scroll.warp * 0.4));
    }
    if (vortex.current) {
      vortex.current.rotation.z -= dt * (0.4 + scroll.warp * 3);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Hot event-horizon core — pushed above 1.0 so bloom catches it. */}
      <mesh>
        <sphereGeometry args={[0.16, 20, 20]} />
        <meshBasicMaterial
          color={new THREE.Color(1.8, 0.62, 0.14)}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={ring}>
        <torusGeometry args={[2, 0.1, 24, 160]} />
        <meshBasicMaterial
          color={new THREE.Color(1.3, 0.36, 0.03)}
          toneMapped={false}
        />
      </mesh>
      <points ref={vortex} geometry={vortexGeo}>
        <pointsMaterial
          size={0.05}
          sizeAttenuation
          color={ORANGE}
          transparent
          opacity={0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  );
}

/** Hyperspace speed-lines that flash during the portal traversal. */
function Warp() {
  const lines = useRef<THREE.LineSegments>(null);
  const material = useRef<THREE.LineBasicMaterial>(null);
  const count = scroll.quality === "lite" ? 120 : 320;

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i += 1) {
      const o = i * 6;
      const a = Math.random() * Math.PI * 2;
      const r = 1 + Math.random() * 12;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      const z = -2 - Math.random() * 24;
      const len = 2 + Math.random() * 6;
      positions[o] = x;
      positions[o + 1] = y;
      positions[o + 2] = z;
      positions[o + 3] = x;
      positions[o + 4] = y;
      positions[o + 5] = z + len;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count]);

  useFrame(() => {
    // Peaks mid-traversal, silent otherwise.
    const w = scroll.warp;
    const flash = Math.sin(Math.min(w, 1) * Math.PI);
    if (material.current) material.current.opacity = flash * 0.85;
    if (lines.current) lines.current.visible = flash > 0.01;
  });

  return (
    <lineSegments ref={lines} geometry={geometry} visible={false}>
      <lineBasicMaterial
        ref={material}
        color={new THREE.Color(2, 0.7, 0.2)}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </lineSegments>
  );
}

/** Glowing world nodes the camera flies past on the journey. */
function Worlds() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < group.current.children.length; i += 1) {
      const child = group.current.children[i];
      child.rotation.x = t * 0.12 + i;
      child.rotation.y = t * 0.16 + i;
    }
  });
  return (
    <group ref={group}>
      {WORLD_Z.map((z, i) => (
        <mesh
          key={z}
          position={[i % 2 === 0 ? 2.4 : -2.4, i % 2 === 0 ? 1 : -1, z]}
        >
          <icosahedronGeometry args={[0.9, 0]} />
          <meshBasicMaterial
            color={ORANGE}
            wireframe
            toneMapped={false}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
    </group>
  );
}

function Rig() {
  const { camera } = useThree();

  useFrame((state, dt) => {
    const clampedDt = Math.min(dt, 0.05);
    // Target depth: pre-enter hold at z=6, warp through to -2, then scroll dolly.
    const eased = scroll.entered ? 1 : scroll.warp;
    const preZ = THREE.MathUtils.lerp(6, -2, eased);
    const targetZ = scroll.entered ? -2 - scroll.progress * TRACK_LEN : preZ;
    camera.position.z = damp(camera.position.z, targetZ, 4, clampedDt);

    // Gentle lateral parallax — keep the camera facing straight down -z so the
    // portal stays dead-center behind the ENTER button (no look-at tilt).
    camera.position.x = damp(
      camera.position.x,
      state.pointer.x * 0.5,
      3,
      clampedDt,
    );
    camera.position.y = damp(
      camera.position.y,
      state.pointer.y * 0.35,
      3,
      clampedDt,
    );
    camera.rotation.set(0, 0, 0);
  });
  return null;
}

export function PortalCanvas() {
  const starCount = scroll.quality === "lite" ? 1400 : 4200;
  const bloomIntensity = scroll.quality === "lite" ? 0.8 : 1.15;

  return (
    <div className="xp-stage">
      <Canvas
        dpr={scroll.quality === "lite" ? [1, 1.3] : [1, 1.8]}
        gl={{
          antialias: false,
          powerPreference: "high-performance",
          alpha: false,
        }}
        camera={{ fov: 60, near: 0.1, far: 200, position: [0, 0, 6] }}
      >
        <color attach="background" args={["#090909"]} />
        <fog attach="fog" args={["#090909", 10, 90]} />
        <Starfield count={starCount} />
        <Portal />
        <Warp />
        <Worlds />
        <Rig />
        <EffectComposer>
          <Bloom
            intensity={bloomIntensity}
            luminanceThreshold={0.28}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
