"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll } from "./store";

const ORANGE = new THREE.Color("#ff4d00");
const WHITE = new THREE.Color("#ffffff");
// Above-1.0 orange so postprocessing bloom catches the key marks of each world.
const BRIGHT = new THREE.Color(1.3, 0.42, 0.06);

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

// Additive-orange material shared by the world marks (keeps them cohesive).
const glowPoints = {
  sizeAttenuation: true,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
} as const;

function fibSphere(n: number, radius: number) {
  const arr = new Float32Array(n * 3);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < n; i += 1) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * 2.399963229; // golden angle
    const v = new THREE.Vector3(
      Math.cos(theta) * r,
      y,
      Math.sin(theta) * r,
    ).multiplyScalar(radius);
    pts.push(v);
    arr[i * 3] = v.x;
    arr[i * 3 + 1] = v.y;
    arr[i * 3 + 2] = v.z;
  }
  return { arr, pts };
}

/** World 01 — Multiplayer: a live network of nodes wired by presence lines. */
function NetworkWorld() {
  const grp = useRef<THREE.Group>(null);
  const { pointsGeo, lineGeo } = useMemo(() => {
    const { arr, pts } = fibSphere(16, 1);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const linePos: number[] = [];
    for (let i = 0; i < pts.length; i += 1) {
      for (let j = i + 1; j < pts.length; j += 1) {
        if (pts[i].distanceTo(pts[j]) < 0.98) {
          linePos.push(
            pts[i].x,
            pts[i].y,
            pts[i].z,
            pts[j].x,
            pts[j].y,
            pts[j].z,
          );
        }
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(linePos), 3),
    );
    return { pointsGeo: pg, lineGeo: lg };
  }, []);
  useFrame((s) => {
    if (!grp.current) return;
    grp.current.rotation.y = s.clock.elapsedTime * 0.24;
    grp.current.rotation.x = Math.sin(s.clock.elapsedTime * 0.3) * 0.18;
  });
  return (
    <group ref={grp}>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial
          color={ORANGE}
          transparent
          opacity={0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </lineSegments>
      <points geometry={pointsGeo}>
        <pointsMaterial size={0.14} color={BRIGHT} {...glowPoints} />
      </points>
    </group>
  );
}

/** World 02 — Live Streaming: concentric broadcast waves rippling outward. */
function WavesWorld() {
  const rings = useRef<THREE.Mesh[]>([]);
  const RINGS = 4;
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    for (let i = 0; i < rings.current.length; i += 1) {
      const m = rings.current[i];
      if (!m) continue;
      const phase = (t * 0.42 + i / RINGS) % 1;
      m.scale.setScalar(0.25 + phase * 1.8);
      (m.material as THREE.MeshBasicMaterial).opacity =
        (1 - phase) ** 1.4 * 0.8;
    }
  });
  return (
    <group rotation={[Math.PI / 2.3, 0, 0]}>
      {Array.from({ length: RINGS }).map((_, i) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length ring set
          key={i}
          ref={(el) => {
            if (el) rings.current[i] = el;
          }}
        >
          <torusGeometry args={[1, 0.028, 10, 96]} />
          <meshBasicMaterial
            color={BRIGHT}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2.3, 0, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(1.8, 0.6, 0.15)}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** World 03 — Real-Time Location: a wire globe with blinking location pings. */
function GlobeWorld() {
  const grp = useRef<THREE.Group>(null);
  const pings = useRef<THREE.Points>(null);
  const pingGeo = useMemo(() => {
    const { arr } = fibSphere(7, 1.02);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  useFrame((s) => {
    if (grp.current) grp.current.rotation.y = s.clock.elapsedTime * 0.3;
    if (pings.current) {
      (pings.current.material as THREE.PointsMaterial).opacity =
        0.5 + Math.sin(s.clock.elapsedTime * 4) * 0.5;
    }
  });
  return (
    <group ref={grp}>
      <mesh>
        <sphereGeometry args={[1, 18, 14]} />
        <meshBasicMaterial
          color={ORANGE}
          wireframe
          transparent
          opacity={0.32}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <points ref={pings} geometry={pingGeo}>
        <pointsMaterial size={0.17} color={BRIGHT} {...glowPoints} />
      </points>
    </group>
  );
}

/** World 04 — AI Agents: an autonomous swarm orbiting a signal. */
function SwarmWorld() {
  const count = scroll.quality === "lite" ? 60 : 150;
  const seed = useMemo(() => {
    const s = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      s[i * 3] = 0.5 + Math.random() * 1;
      s[i * 3 + 1] = Math.random() * Math.PI * 2;
      s[i * 3 + 2] = 0.3 + Math.random() * 1.6;
    }
    return s;
  }, [count]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(count * 3), 3),
    );
    return g;
  }, [count]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const pos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i += 1) {
      const r = seed[i * 3];
      const a = seed[i * 3 + 1] + t * seed[i * 3 + 2];
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(t * seed[i * 3 + 2] + i) * 0.7;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    geo.attributes.position.needsUpdate = true;
  });
  return (
    <group>
      <points geometry={geo}>
        <pointsMaterial size={0.1} color={BRIGHT} {...glowPoints} />
      </points>
      <mesh>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshBasicMaterial
          color={new THREE.Color(1.8, 0.6, 0.15)}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** World 05 — Wild Signal: controlled chaos, a glitching burst of points. */
function GlitchWorld() {
  const grp = useRef<THREE.Group>(null);
  const count = scroll.quality === "lite" ? 50 : 120;
  const base = useMemo(() => {
    const b = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 1) b[i] = (Math.random() - 0.5) * 2.3;
    return b;
  }, [count]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(base.slice(), 3));
    return g;
  }, [base]);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const step = Math.floor(t * 9);
    const pos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i += 1) {
      const rnd = Math.sin(i * 12.9898 + step) * 43758.5453;
      const jit = (rnd - Math.floor(rnd) - 0.5) * 0.34;
      pos[i * 3] = base[i * 3] + jit;
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 6 + i) * 0.12;
      pos[i * 3 + 2] = base[i * 3 + 2] - jit;
    }
    geo.attributes.position.needsUpdate = true;
    if (grp.current) grp.current.rotation.z = t * 0.1;
  });
  return (
    <group ref={grp}>
      <points geometry={geo}>
        <pointsMaterial size={0.09} color={BRIGHT} {...glowPoints} />
      </points>
    </group>
  );
}

// Each world sits on the right so it never fights the left-aligned copy.
const WORLD_POS: Array<[number, number, number]> = [
  [2.8, 0.3, WORLD_Z[0]],
  [3.0, -0.5, WORLD_Z[1]],
  [2.7, 0.6, WORLD_Z[2]],
  [3.0, -0.3, WORLD_Z[3]],
  [2.7, 0.3, WORLD_Z[4]],
];

/** The five Portal-capability worlds the camera flies past on the journey. */
function Worlds() {
  return (
    <>
      <group position={WORLD_POS[0]}>
        <NetworkWorld />
      </group>
      <group position={WORLD_POS[1]}>
        <WavesWorld />
      </group>
      <group position={WORLD_POS[2]}>
        <GlobeWorld />
      </group>
      <group position={WORLD_POS[3]}>
        <SwarmWorld />
      </group>
      <group position={WORLD_POS[4]}>
        <GlitchWorld />
      </group>
    </>
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
