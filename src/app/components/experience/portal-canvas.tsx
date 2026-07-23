"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll } from "./store";

const ASTRONAUT_URL = "/models/astronaut.glb";
const ORANGE = new THREE.Color("#ff4d00");
const RIM = new THREE.Color(1.5, 0.45, 0.06); // >1 so bloom catches the ring rim

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt);
}
function easeInOut(p: number) {
  return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
}

/** Deep-space starfield. Streams past as the camera flies forward. */
function Starfield({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 70;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 55;
      positions[i * 3 + 2] = 4 - Math.random() * 60;
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
        size={0.05}
        sizeAttenuation
        color="#ffffff"
        transparent
        opacity={0.85}
        depthWrite={false}
      />
    </points>
  );
}

/** Earth seen through the portal — a dark globe with a bright atmosphere limb. */
function Earth() {
  return (
    <group position={[0, -8.6, -15]}>
      <mesh>
        <sphereGeometry args={[7, 64, 64]} />
        <meshStandardMaterial color="#0b1e44" roughness={1} metalness={0} />
      </mesh>
      {/* Atmosphere glow (back-side additive shell). */}
      <mesh scale={1.06}>
        <sphereGeometry args={[7, 64, 64]} />
        <meshBasicMaterial
          color={new THREE.Color(0.25, 0.55, 1.5)}
          side={THREE.BackSide}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** The portal ring — glossy orange, framing the astronaut and the view of space. */
function Portal() {
  const ring = useRef<THREE.Mesh>(null);
  const rim = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (ring.current) ring.current.rotation.z = t * 0.1;
    if (rim.current) {
      (rim.current.material as THREE.MeshBasicMaterial).opacity =
        0.7 + Math.sin(t * 1.6) * 0.12;
    }
  });
  return (
    <group>
      <mesh ref={rim} position={[0, 0, -0.04]}>
        <ringGeometry args={[1.98, 2.16, 96]} />
        <meshBasicMaterial
          color={RIM}
          toneMapped={false}
          transparent
          opacity={0.75}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ring}>
        <torusGeometry args={[2.2, 0.15, 40, 220]} />
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

/** The floating astronaut — framed on the RIGHT inside the portal. */
function Astronaut() {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(ASTRONAUT_URL);
  const { actions, names } = useAnimations(animations, group);

  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = 2.7 / (size.y || 1);
    return { scale: s, offset: center.clone().multiplyScalar(-s) };
  }, [scene]);

  useEffect(() => {
    const action = actions[names[0]];
    action?.reset().fadeIn(0.5).play();
    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions, names]);

  useFrame((s) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.16) * 0.28;
    }
  });

  // Positioned to the right, slightly in front of the ring plane.
  return (
    <group ref={group} position={[0.95, -0.1, 0.55]}>
      <group scale={scale} position={offset}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

/** Scroll flies the camera forward, through the portal, out into space. */
function Rig() {
  const { camera } = useThree();
  useFrame((state, dt) => {
    const cdt = Math.min(dt, 0.05);
    // Complete the fly-through within the first ~30% of scroll, before the
    // editorial content scrolls up and covers the canvas.
    const p = Math.min(1, scroll.progress / 0.3);
    const targetZ = THREE.MathUtils.lerp(7, -10, easeInOut(p));
    camera.position.z = damp(camera.position.z, targetZ, 4, cdt);
    camera.position.x = damp(camera.position.x, state.pointer.x * 0.4, 3, cdt);
    camera.position.y = damp(camera.position.y, state.pointer.y * 0.3, 3, cdt);
    camera.rotation.set(0, 0, 0);
  });
  return null;
}

export function PortalCanvas() {
  const bloom = scroll.quality === "lite" ? 0.6 : 0.95;
  const stars = scroll.quality === "lite" ? 1600 : 4200;
  return (
    <div className="xp-stage">
      <Canvas
        dpr={scroll.quality === "lite" ? [1, 1.3] : [1, 1.8]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ fov: 50, near: 0.1, far: 80, position: [0, 0, 7] }}
      >
        <color attach="background" args={["#060608"]} />
        <ambientLight intensity={0.35} />
        {/* Sun — a bright key that lights Earth's limb and the suit, and blooms. */}
        <directionalLight position={[2.6, 3.4, -6]} intensity={3.2} />
        <pointLight
          position={[1.4, 0.4, 2.4]}
          intensity={3}
          distance={10}
          color="#ffd9c2"
        />
        <mesh position={[2.6, 3.4, -8]}>
          <sphereGeometry args={[0.28, 24, 24]} />
          <meshBasicMaterial
            color={new THREE.Color(6, 5.2, 4.2)}
            toneMapped={false}
          />
        </mesh>

        <Starfield count={stars} />
        <Earth />
        <Portal />
        {scroll.quality === "high" ? (
          <Suspense fallback={null}>
            <Astronaut />
          </Suspense>
        ) : null}
        <Rig />
        <EffectComposer>
          <Bloom
            intensity={bloom}
            luminanceThreshold={0.7}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

useGLTF.preload(ASTRONAUT_URL);
