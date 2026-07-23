"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll } from "./store";

const PAPER = new THREE.Color("#f4f2ee");
const DARK = new THREE.Color("#0a0a0a");
const ORANGE = new THREE.Color("#ff4d00");
const RIM = new THREE.Color(1.6, 0.5, 0.08); // >1 so bloom catches the rim

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}
function easeInOut(p: number) {
  return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
}

/** The portal: a glossy orange ring around a dark opening (the far side). */
function Portal() {
  const ring = useRef<THREE.Mesh>(null);
  const rim = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (ring.current) ring.current.rotation.z = t * 0.12;
    if (rim.current) {
      (rim.current.material as THREE.MeshBasicMaterial).opacity =
        0.75 + Math.sin(t * 1.6) * 0.12;
    }
  });
  return (
    <group>
      {/* Dark opening = the other side, seen through the ring. */}
      <mesh position={[0, 0, -0.2]}>
        <circleGeometry args={[2.12, 72]} />
        <meshBasicMaterial color={DARK} />
      </mesh>
      {/* Additive rim glow just inside the ring. */}
      <mesh ref={rim} position={[0, 0, -0.05]}>
        <ringGeometry args={[1.98, 2.16, 72]} />
        <meshBasicMaterial
          color={RIM}
          toneMapped={false}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Glossy physical ring. */}
      <mesh ref={ring}>
        <torusGeometry args={[2.2, 0.15, 40, 200]} />
        <meshPhysicalMaterial
          color={ORANGE}
          roughness={0.16}
          metalness={0.15}
          clearcoat={1}
          clearcoatRoughness={0.18}
        />
      </mesh>
    </group>
  );
}

/** The other side: a small cluster of glossy objects, revealed once through. */
function OtherSide() {
  const grp = useRef<THREE.Group>(null);
  const items = useMemo(() => {
    const rng = (seed: number) => {
      const x = Math.sin(seed * 91.7) * 43758.5;
      return x - Math.floor(x);
    };
    return Array.from({ length: 9 }, (_, i) => ({
      pos: [
        (rng(i + 1) - 0.5) * 7,
        (rng(i + 9) - 0.5) * 5,
        -8 - rng(i + 3) * 6,
      ] as [number, number, number],
      scale: 0.5 + rng(i + 5) * 0.7,
      kind: i % 3,
      tint:
        i % 4 === 0 ? ORANGE : i % 4 === 1 ? DARK : new THREE.Color("#e9e6df"),
    }));
  }, []);
  useFrame((s, dt) => {
    if (!grp.current) return;
    for (let i = 0; i < grp.current.children.length; i += 1) {
      const c = grp.current.children[i];
      c.rotation.x += dt * 0.15;
      c.rotation.y += dt * 0.2;
    }
    grp.current.position.y = Math.sin(s.clock.elapsedTime * 0.2) * 0.2;
  });
  return (
    <group ref={grp}>
      {items.map((it, i) => (
        <mesh
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed cluster
          key={i}
          position={it.pos}
          scale={it.scale}
        >
          {it.kind === 0 ? (
            <torusKnotGeometry args={[0.5, 0.18, 90, 16]} />
          ) : it.kind === 1 ? (
            <icosahedronGeometry args={[0.7, 0]} />
          ) : (
            <capsuleGeometry args={[0.35, 0.6, 8, 16]} />
          )}
          <meshPhysicalMaterial
            color={it.tint}
            roughness={0.2}
            metalness={0.1}
            clearcoat={1}
            clearcoatRoughness={0.25}
          />
        </mesh>
      ))}
    </group>
  );
}

/** Scroll dollies the camera forward, through the portal, to the other side. */
function Rig() {
  const { camera, scene } = useThree();
  useFrame((state, dt) => {
    const cdt = Math.min(dt, 0.05);
    // Complete the through-portal traversal within the first ~30% of scroll,
    // before the editorial content scrolls up and covers the canvas.
    const p = Math.min(1, scroll.progress / 0.3);
    // z: 7 (framing the portal) → -8 (among the other-side objects)
    const targetZ = THREE.MathUtils.lerp(7, -8, easeInOut(p));
    camera.position.z = damp(camera.position.z, targetZ, 4, cdt);
    camera.position.x = damp(camera.position.x, state.pointer.x * 0.4, 3, cdt);
    camera.position.y = damp(camera.position.y, state.pointer.y * 0.3, 3, cdt);
    camera.rotation.set(0, 0, 0); // face straight down -z; portal stays centered

    // Background: warm paper in front of the portal, dark once through it.
    // 0 while the camera is in front (z high), 1 once it has passed through.
    const through = 1 - THREE.MathUtils.smoothstep(camera.position.z, -1.6, 1.6);
    (scene.background as THREE.Color).copy(PAPER).lerp(DARK, through);
  });
  return null;
}

export function PortalCanvas() {
  const bloom = scroll.quality === "lite" ? 0.5 : 0.85;
  return (
    <div className="xp-stage">
      <Canvas
        dpr={scroll.quality === "lite" ? [1, 1.3] : [1, 1.8]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 50, near: 0.1, far: 60, position: [0, 0, 7] }}
      >
        <color attach="background" args={["#f4f2ee"]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 6]} intensity={2.4} />
        <directionalLight
          position={[-6, -2, 4]}
          intensity={0.8}
          color="#ffd9c2"
        />
        <pointLight
          position={[0, 0, 3]}
          intensity={6}
          distance={12}
          color="#ff8a4d"
        />
        <Portal />
        <OtherSide />
        <Rig />
        <EffectComposer>
          <Bloom
            intensity={bloom}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
