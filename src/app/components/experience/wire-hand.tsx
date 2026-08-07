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

/**
 * Staging.
 *
 * The hand stands left of centre so that pointing at the cursor means pointing
 * *across* the frame rather than out of it, and the forearm leaves the edge
 * instead of ending in open space.
 */
const HOME = new THREE.Vector3(-1.5, -0.1, 0);
/**
 * Roll about the pointing axis — which way the palm faces as it aims.
 *
 * Solved rather than nudged. After `toForward` the palm's normal sits on local
 * -Y, and `lookAt` maps local X onto the camera axis whenever the hand points
 * across the frame — so a roll of exactly π/2 turns the palm away from the
 * viewer and shows the back of the hand square on, and 0 leaves it edge-on,
 * which is what -0.5 was doing: a pointing hand with no body to it.
 *
 * A little under π/2 gives the three-quarter the reference has, where the
 * closed fingers read as a mass rather than as a silhouette.
 */
const ROLL = 1.2;
const HAND_SCALE = 1.02;
/** Where it points before anyone has moved a mouse: out across the copy. */
const IDLE_TARGET = new THREE.Vector3(1.7, -0.5, 0.4);
const UP = new THREE.Vector3(0, 1, 0);

export function WireHand() {
  const aim = useRef<THREE.Group>(null);
  const geometry = useMemo(() => buildHandGeometry(), []);

  /**
   * The fixed part of the orientation, so the moving part can be a `lookAt`.
   *
   * `Object3D.lookAt` aims an object's **+Z** at a target. The hand is modelled
   * with its fingers up +Y, so this maps that onto +Z once, and then a roll
   * about the new forward decides which face of the hand you see. Everything
   * after that is one quaternion a frame with no Euler angles to reason about —
   * which is the whole reason the pose is built this way rather than as three
   * axis rotations tuned by screenshot.
   */
  const orient = useMemo(() => {
    const toForward = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.PI / 2,
    );
    const roll = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      ROLL,
    );
    return roll.multiply(toForward);
  }, []);

  // Scratch, so the frame loop allocates nothing.
  const target = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Matrix4(), []);
  const want = useMemo(() => new THREE.Quaternion(), []);

  useFrame((state, dt) => {
    const g = aim.current;
    if (!g) return;
    const cdt = Math.min(dt, 0.05);
    const t = state.clock.elapsedTime;

    /*
      IT POINTS AT THE CURSOR RATHER THAN LEANING TOWARD IT

      The first version added the pointer to a rest rotation, scaled to 0.42
      radians of yaw. That is a hand that tilts when you move the mouse, and it
      was reported as not following the cursor at all — correctly, because 24°
      of lean is not tracking, it is a nod.

      This solves for the direction instead: the cursor's normalised position
      becomes a point in the world at the near plane, and the hand's forward
      axis is aimed at it. `state.viewport` is already the frame's size in world
      units at z = 0, so the mapping needs no field-of-view arithmetic and stays
      correct when the gate widens its camera on a phone.
    */
    if (scroll.reduce || !scroll.pointerMoved) {
      target.copy(IDLE_TARGET);
    } else {
      target.set(
        scroll.pointer.x * state.viewport.width * 0.5,
        scroll.pointer.y * state.viewport.height * 0.5,
        0.5,
      );
    }

    /*
      A drift on the target rather than on the hand. Under a tenth of a unit and
      slow — it is not an animation, it is the difference between something
      holding still and something switched off. Skipped for reduced motion,
      which is the request this one is actually about.
    */
    if (!scroll.reduce) {
      target.y += Math.sin(t * 0.5) * 0.07;
      target.x += Math.sin(t * 0.37 + 1.1) * 0.06;
    }

    // `lookAt(target, eye, up)` in this order, because that is what
    // `Object3D.lookAt` does for anything that is not a camera: +Z toward the
    // target rather than away from it.
    look.lookAt(target, g.position, UP);
    want.setFromRotationMatrix(look);
    // Slerped rather than snapped, and frame-rate independent — a hand that
    // arrives instantly reads as a cursor, not as a hand.
    g.quaternion.slerp(want, 1 - Math.exp(-4.5 * cdt));
  });

  return (
    <group ref={aim} position={HOME} scale={HAND_SCALE}>
      <group quaternion={orient}>
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
    </group>
  );
}
