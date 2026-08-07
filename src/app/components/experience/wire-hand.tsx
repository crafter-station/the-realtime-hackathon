"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { buildHandGeometry, HAND_COLOR } from "./hand-shape";
import { scroll } from "./store";

/**
 * The hand at the threshold.
 *
 * A hand reaching in out of the dark, made of orange wire, that turns to follow
 * your cursor while you decide whether to press Start. It is the first thing on
 * the site and the only thing on the gate.
 *
 * A MESH, NOT AN OUTLINE — AND THAT IS THE WHOLE DIFFERENCE
 *
 * There was a `wire-hand.tsx` here before and it was deleted in the same change
 * that built this one. It drew a palm as an eight-point polygon and each finger
 * as a few tapered rings: a *diagram* of a hand, which read at a glance as a
 * mitten and never as an object. This builds actual tubes — a spine per limb,
 * swept with an elliptical cross-section, drawn as rings plus longitudinals so
 * the surface reads as quads.
 *
 * Quads specifically. `TubeGeometry` with a wireframe material would be half the
 * code and would draw the triangulation's diagonals, which turns a clean mesh
 * into a lattice of arrowheads. The reference this is built to is a quad mesh
 * and the difference is the entire look.
 *
 * ORANGE, AND WHY THAT DOES NOT BREAK THE RULE
 *
 * `wire-light.tsx` states that orange is emitted rather than painted and exists
 * at exactly two places — the well's throat and the register. This is a third,
 * and it does not contradict that: the rule is about *the world*, which is white
 * hairlines on black, and the gate is not the world. It is the threshold you
 * cross to reach it. The hand being made of the same light as the portal is what
 * says they belong to each other.
 *
 * The geometry is baked once. Only the group's rotation moves, which is what
 * keeps a cursor-tracking object off the per-frame geometry budget entirely.
 */

/*
  Staging: reaching in from the lower left, turned so the thumb side is toward
  the camera. Rotations are applied in the group's own ZYX order by three's
  default 'XYZ' Euler, which is why the big roll sits in z.
*/
const REST_ROT = { x: 0.3, y: -0.46, z: -1.72 };
const HOME = { x: -1.15, y: -0.15, z: 0 };
/** Big enough that the forearm leaves the frame rather than ending in it. */
const HAND_SCALE = 1.02;

/** How far the cursor can turn it. Small — it is tracking you, not pointing. */
const YAW = 0.42;
const PITCH = 0.3;

export function WireHand() {
  const group = useRef<THREE.Group>(null);
  const geometry = useMemo(() => buildHandGeometry(), []);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const cdt = Math.min(dt, 0.05);
    const t = state.clock.elapsedTime;

    /*
      A hand that only moves when the mouse does is a prop. The idle is tiny —
      under two degrees — and slow enough not to read as an animation, which is
      the point: it reads as something alive holding still.
    */
    const breatheY = Math.sin(t * 0.42) * 0.03;
    const breatheX = Math.sin(t * 0.31 + 1.2) * 0.025;

    // Reduced motion keeps the hand and drops the chase. The cursor is the
    // vestibular half of this, and it is the half that was asked about.
    const chase = scroll.reduce || !scroll.pointerMoved;
    const targetY =
      REST_ROT.y + (chase ? 0 : scroll.pointer.x * YAW) + breatheY;
    const targetX =
      REST_ROT.x - (chase ? 0 : scroll.pointer.y * PITCH) + breatheX;

    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 3.4, cdt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 3.4, cdt);
    // A little bodily drift as well, so the turn does not read as a hinge.
    g.position.x = THREE.MathUtils.damp(
      g.position.x,
      HOME.x + (chase ? 0 : scroll.pointer.x * 0.22),
      3,
      cdt,
    );
    g.position.y = THREE.MathUtils.damp(
      g.position.y,
      HOME.y + (chase ? 0 : scroll.pointer.y * 0.16),
      3,
      cdt,
    );
  });

  return (
    <group
      ref={group}
      position={[HOME.x, HOME.y, HOME.z]}
      rotation={[REST_ROT.x, REST_ROT.y, REST_ROT.z]}
      scale={HAND_SCALE}
    >
      <lineSegments geometry={geometry}>
        <lineBasicMaterial
          color={HAND_COLOR}
          vertexColors
          transparent
          opacity={0.95}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
