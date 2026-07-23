"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type Finger = {
  base: THREE.Vector3;
  dir: THREE.Vector3;
  length: number;
  ringWidth: number;
};

/** Fraction of finger length per phalanx, proximal → distal. */
const PHALANX_FRACTIONS = [0.4, 0.33, 0.27];

function addSegment(positions: number[], a: THREE.Vector3, b: THREE.Vector3) {
  positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
}

/**
 * Builds a stylized wireframe hand as one ordered list of line-segment
 * vertices: palm outline + wrist stub first, then each finger in turn, so a
 * `setDrawRange` sweep over the array reads as a natural "draw-on".
 */
function buildHandPositions(): Float32Array {
  const positions: number[] = [];

  // Palm — an 8-point rounded polygon outline, wrist at the bottom.
  const palm = [
    new THREE.Vector3(-0.42, -0.3, 0),
    new THREE.Vector3(-0.6, 0.2, 0),
    new THREE.Vector3(-0.32, 0.85, 0),
    new THREE.Vector3(0.1, 0.92, 0),
    new THREE.Vector3(0.42, 0.8, 0),
    new THREE.Vector3(0.68, 0.45, 0),
    new THREE.Vector3(0.55, -0.05, 0),
    new THREE.Vector3(0.15, -0.28, 0),
  ];
  for (let i = 0; i < palm.length; i += 1) {
    addSegment(positions, palm[i], palm[(i + 1) % palm.length]);
  }

  // Wrist stub, dropping from the two lower palm corners.
  const wristLeftTop = palm[0];
  const wristRightTop = palm[7];
  const wristLeftBottom = new THREE.Vector3(-0.38, -0.55, 0);
  const wristRightBottom = new THREE.Vector3(0.05, -0.55, 0);
  addSegment(positions, wristLeftTop, wristLeftBottom);
  addSegment(positions, wristRightTop, wristRightBottom);
  addSegment(positions, wristLeftBottom, wristRightBottom);

  // Fingers radiate from the palm's top edge; the thumb angles off the side.
  const fingers: Finger[] = [
    {
      base: new THREE.Vector3(-0.34, 0.86, 0),
      dir: new THREE.Vector3(-0.08, 1, 0).normalize(),
      length: 0.75,
      ringWidth: 0.055,
    },
    {
      base: new THREE.Vector3(-0.08, 0.93, 0),
      dir: new THREE.Vector3(0, 1, 0).normalize(),
      length: 0.85,
      ringWidth: 0.055,
    },
    {
      base: new THREE.Vector3(0.2, 0.88, 0),
      dir: new THREE.Vector3(0.08, 1, 0).normalize(),
      length: 0.8,
      ringWidth: 0.05,
    },
    {
      base: new THREE.Vector3(0.46, 0.74, 0),
      dir: new THREE.Vector3(0.24, 1, 0).normalize(),
      length: 0.6,
      ringWidth: 0.045,
    },
    {
      base: new THREE.Vector3(0.62, 0.38, 0),
      dir: new THREE.Vector3(0.78, 0.55, 0).normalize(),
      length: 0.55,
      ringWidth: 0.06,
    },
  ];

  for (const finger of fingers) {
    const perp = new THREE.Vector3(-finger.dir.y, finger.dir.x, 0);
    let cursor = finger.base.clone();
    const joints = [finger.base.clone()];
    for (const fraction of PHALANX_FRACTIONS) {
      const next = cursor
        .clone()
        .addScaledVector(finger.dir, finger.length * fraction);
      addSegment(positions, cursor, next);
      joints.push(next);
      cursor = next;
    }
    // Three cross-section rings (simplified as crossbars), shrinking distally.
    for (let i = 0; i < 3; i += 1) {
      const center = joints[i];
      const halfWidth = finger.ringWidth * (1 - i * 0.18);
      const ringA = center.clone().addScaledVector(perp, halfWidth);
      const ringB = center.clone().addScaledVector(perp, -halfWidth);
      addSegment(positions, ringA, ringB);
    }
  }

  return new Float32Array(positions);
}

/**
 * A wireframe hand, built purely from lines, that draws itself out of
 * nothing when `active` and follows the cursor around a fixed depth `z`.
 */
export function WireHand({ active, z }: { active: boolean; z: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  const progress = useRef(0);
  const reducedMotion = useRef(false);

  const positions = useMemo(() => buildHandPositions(), []);
  const totalVertices = positions.length / 3;

  useEffect(() => {
    reducedMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    geometryRef.current?.computeBoundingSphere();
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const target = active ? 1 : 0;
    // ~1.2s damped ease in either direction, for both motion styles.
    progress.current = THREE.MathUtils.damp(progress.current, target, 3.2, dt);

    const geometry = geometryRef.current;
    if (geometry) {
      const revealCount = Math.floor(progress.current * totalVertices);
      geometry.setDrawRange(0, revealCount);
    }
    if (materialRef.current) {
      materialRef.current.opacity = progress.current * 0.9;
    }

    const group = groupRef.current;
    if (!group) return;

    if (reducedMotion.current) {
      // No cursor tilt — hold in place with a gentle static float only.
      group.position.x = THREE.MathUtils.damp(group.position.x, 0, 3, dt);
      group.position.y = THREE.MathUtils.damp(group.position.y, 0, 3, dt);
      group.position.y += Math.sin(state.clock.elapsedTime) * 0.02;
      group.position.z = z;
      group.rotation.x = THREE.MathUtils.damp(group.rotation.x, 0, 3, dt);
      group.rotation.z = THREE.MathUtils.damp(group.rotation.z, 0, 3, dt);
      return;
    }

    const targetX = state.pointer.x * 2.2;
    const targetY = state.pointer.y * 1.4;
    group.position.x = THREE.MathUtils.damp(group.position.x, targetX, 4, dt);
    group.position.y = THREE.MathUtils.damp(group.position.y, targetY, 4, dt);
    group.position.y += Math.sin(state.clock.elapsedTime) * 0.02;
    group.position.z = THREE.MathUtils.damp(group.position.z, z, 4, dt);

    const targetRotZ = state.pointer.x * -0.25;
    const targetRotX = state.pointer.y * 0.2;
    group.rotation.z = THREE.MathUtils.damp(
      group.rotation.z,
      targetRotZ,
      4,
      dt,
    );
    group.rotation.x = THREE.MathUtils.damp(
      group.rotation.x,
      targetRotX,
      4,
      dt,
    );
  });

  return (
    <group ref={groupRef} position={[0, 0, z]}>
      <lineSegments frustumCulled={false}>
        <bufferGeometry ref={geometryRef}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          ref={materialRef}
          color="#ffffff"
          transparent
          opacity={0}
        />
      </lineSegments>
    </group>
  );
}
