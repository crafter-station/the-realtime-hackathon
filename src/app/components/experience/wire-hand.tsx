"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { buildHandGeometry, HAND_COLOR, indexTip } from "./hand-shape";
import { scroll } from "./store";
import { useGlowTexture } from "./wire-light";

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

/**
 * Where the arm enters the frame. The aim is solved from here rather than from
 * the hand's own moving position, which would otherwise chase its own tail —
 * the rotation decides the placement and the placement would decide the
 * rotation.
 */
const ANCHOR = new THREE.Vector3(-4.6, -0.5, 0);

/**
 * The gap, and it is the whole picture.
 *
 * This is the Creation of Adam: two hands reaching, not touching. The cursor is
 * the other one. If the fingertip ever arrives the image stops being about
 * anything, so the reach is solved to land *short* — and short by a constant, so
 * the distance reads the same wherever on screen the meeting happens.
 */
const GAP = 0.55;

/**
 * How much of the way the hand actually goes.
 *
 * Not all of it. A hand that tracks the cursor exactly is a very large cursor;
 * a hand that leans most of the way toward it is reaching. It also keeps the
 * composition — the arm has to stay entering from the left, and at full reach a
 * cursor in the left margin would drag the whole hand off frame.
 */
const REACH = 0.62;

/** Bounds on where the hand may stand, so the composition survives the cursor. */
const LIMIT = { x: [-2.4, 0.5], y: [-1.3, 1.0] } as const;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export function WireHand() {
  const aim = useRef<THREE.Group>(null);
  const spark = useRef<THREE.Sprite>(null);
  const sparkMat = useRef<THREE.SpriteMaterial>(null);
  const geometry = useMemo(() => buildHandGeometry(), []);
  const glow = useGlowTexture();

  /**
   * The fixed part of the orientation, so the moving part can be a `lookAt`.
   *
   * `Object3D.lookAt` aims an object's **+Z** at a target. The hand is modelled
   * with its fingers up +Y, so this maps that onto +Z once, and then a roll
   * about the new forward decides which face of the hand you see. Everything
   * after that is one quaternion a frame with no Euler angles to reason about.
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

  /** The fingertip, in the aim group's own frame — orientation and scale baked. */
  const tipLocal = useMemo(() => {
    const [x, y, z] = indexTip();
    return new THREE.Vector3(x, y, z)
      .applyQuaternion(orient)
      .multiplyScalar(HAND_SCALE);
  }, [orient]);

  // Scratch, so the frame loop allocates nothing.
  const cursor = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const wantTip = useMemo(() => new THREE.Vector3(), []);
  const tipOffset = useMemo(() => new THREE.Vector3(), []);
  const wantPos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Matrix4(), []);
  const wantRot = useMemo(() => new THREE.Quaternion(), []);

  useFrame((state, dt) => {
    const g = aim.current;
    if (!g) return;
    const cdt = Math.min(dt, 0.05);
    const t = state.clock.elapsedTime;

    /*
      The cursor, as a place in the world.

      `state.viewport` is already the frame's size in world units at z = 0, so
      this needs no field-of-view arithmetic and stays correct when the gate
      widens its camera on a phone.
    */
    if (scroll.reduce || !scroll.pointerMoved) {
      cursor.copy(IDLE_TARGET);
    } else {
      cursor.set(
        scroll.pointer.x * state.viewport.width * 0.5,
        scroll.pointer.y * state.viewport.height * 0.5,
        0.4,
      );
    }
    // A drift on the target, not on the hand. Under a tenth of a unit and slow:
    // the difference between something holding still and something switched off.
    if (!scroll.reduce) {
      cursor.y += Math.sin(t * 0.5) * 0.06;
      cursor.x += Math.sin(t * 0.37 + 1.1) * 0.05;
    }

    // Aim along the arm — from where it enters the frame to the cursor.
    // `lookAt(target, eye, up)` in this order because that is what
    // `Object3D.lookAt` does for anything that is not a camera: +Z toward the
    // target rather than away from it.
    look.lookAt(cursor, ANCHOR, UP);
    wantRot.setFromRotationMatrix(look);
    g.quaternion.slerp(wantRot, 1 - Math.exp(-4.5 * cdt));

    /*
      Then place the hand so the fingertip lands `GAP` short of the cursor.

      Solved backwards from the tip rather than forwards from the wrist: the
      fingertip is the thing with somewhere to be, and everything behind it —
      hand, wrist, forearm, off the left edge — simply follows from where it
      has to end up.
    */
    dir.copy(cursor).sub(ANCHOR).normalize();
    wantTip.copy(cursor).addScaledVector(dir, -GAP);
    tipOffset.copy(tipLocal).applyQuaternion(g.quaternion);
    wantPos.copy(wantTip).sub(tipOffset);
    wantPos.lerpVectors(HOME, wantPos, REACH);
    wantPos.x = clamp(wantPos.x, LIMIT.x[0], LIMIT.x[1]);
    wantPos.y = clamp(wantPos.y, LIMIT.y[0], LIMIT.y[1]);
    wantPos.z = 0;

    const k = 1 - Math.exp(-3.2 * cdt);
    g.position.lerp(wantPos, k);

    /*
      The spark.

      Whatever the reach and the clamps end up doing, *this* is where the
      fingertip actually is — recomputed from the hand's real transform rather
      than from where it was asked to go, so the light never floats off the
      finger when the composition bounds bite.

      It brightens as the cursor closes and is nothing at arm's length, which is
      what makes the near-touch an event rather than a decoration.
    */
    const sp = spark.current;
    const mat = sparkMat.current;
    if (sp && mat) {
      tipOffset.copy(tipLocal).applyQuaternion(g.quaternion);
      sp.position.copy(g.position).add(tipOffset);
      const reachedBy = sp.position.distanceTo(cursor);
      const near = 1 - THREE.MathUtils.smoothstep(reachedBy, GAP, GAP * 4.5);
      mat.opacity = THREE.MathUtils.damp(mat.opacity, near * 0.85, 4, cdt);
      const size = 0.45 + near * 0.5;
      sp.scale.setScalar(THREE.MathUtils.damp(sp.scale.x, size, 4, cdt));
    }
  });

  return (
    <>
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
      {/*
        Outside the hand's group, because it is placed in world space from the
        hand's real transform — parenting it would apply that transform twice.
      */}
      <sprite ref={spark} scale={0.45}>
        <spriteMaterial
          ref={sparkMat}
          map={glow}
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </sprite>
    </>
  );
}
