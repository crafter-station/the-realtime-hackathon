"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { scroll } from "./store";
import { WELL_Z, wellThroatY } from "./wire-surface";

/**
 * The companion.
 *
 * It is waiting on the slope of the well when you arrive, and once you start
 * moving it comes with you — down the throat, through the streak field, along
 * the corridor, out the far side. Having one object persist across every act is
 * what turns a sequence of set pieces into a journey: it is the only thing in
 * the world that is in all of them, so it is the thing that makes them one
 * place rather than five.
 *
 * It replaces the standing figure, which could only ever do its job in the
 * opening frame — a person at the throat gives you scale exactly once, and then
 * you leave them behind.
 *
 * WEIGHT
 *
 * A ball that snapped to a fixed offset would read as a decal glued to the
 * lens. This one is on a spring: it is pulled toward where it should be rather
 * than placed there, so it lags when you accelerate, overshoots when you stop,
 * and swings before it settles. That lag *is* the mass — nothing else here
 * communicates weight, because there is no gravity to fall under and nothing to
 * bounce off.
 *
 * Integrated against real elapsed time rather than per-frame constants, so it
 * behaves the same at 60 and at 120Hz.
 */

/** Where it rides relative to the camera: ahead, low, a little off-centre. */
const FOLLOW = new THREE.Vector3(3.4, -2.7, -14);
/** Pull toward the target, and the drag that stops it oscillating forever. */
const STIFFNESS = 26;
const DRAG = 6.5;
/** Never nearer the lens than this, never further than that. */
const MIN_AHEAD = 11;
const MAX_AHEAD = 20;
/** How far it may swing off the follow point before we rein it back in. */
const MAX_SWING = 2.2;

export function WireCompanion() {
  const group = useRef<THREE.Group>(null);
  const velocity = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const rest = useMemo(
    () => new THREE.Vector3(0, wellThroatY() + 1.1, WELL_Z),
    [],
  );
  const started = useRef(false);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const cdt = Math.min(dt, 0.05);
    const cam = state.camera.position;

    if (!started.current) {
      g.position.copy(rest);
      started.current = true;
    }

    // It sits in the well until you move, then hands over to following. Past
    // the first stretch of scroll the rest position is behind you anyway, so
    // the blend has to be finished well before then.
    const engage = THREE.MathUtils.smoothstep(scroll.progress, 0.004, 0.055);
    target.set(cam.x + FOLLOW.x, cam.y + FOLLOW.y, cam.z + FOLLOW.z);
    target.lerpVectors(rest, target, engage);

    // A slow bob, so it reads as floating rather than as being carried. Off
    // under reduced motion — this is the one part that is pure decoration.
    if (!scroll.reduce) {
      target.y += Math.sin(state.clock.elapsedTime * 1.35) * 0.28;
    }

    // Spring, then drag. Exponential drag rather than a per-frame multiplier
    // keeps the settle identical whatever the refresh rate.
    velocity.addScaledVector(target.clone().sub(g.position), STIFFNESS * cdt);
    velocity.multiplyScalar(Math.exp(-DRAG * cdt));
    g.position.addScaledVector(velocity, cdt);

    // The ride outruns the spring — a hard scroll moves the camera faster than
    // any sane stiffness will chase, and the lag is along the travel axis, so
    // what "falling behind" actually means is the camera closing on the ball
    // until it is against the lens. Clamping the distance to the *target* does
    // not help: the target is what it is being dragged toward. The bound that
    // matters is how near the camera it may come.
    const ahead = cam.z - g.position.z;
    if (ahead < MIN_AHEAD) g.position.z = cam.z - MIN_AHEAD;
    else if (ahead > MAX_AHEAD) g.position.z = cam.z - MAX_AHEAD;
    // Sideways and vertical lag is the part that reads as weight, so that is
    // left to swing freely — it can never put the ball in your face.
    const side = Math.hypot(g.position.x - target.x, g.position.y - target.y);
    if (side > MAX_SWING) {
      const k = 1 - MAX_SWING / side;
      g.position.x += (target.x - g.position.x) * k;
      g.position.y += (target.y - g.position.y) * k;
    }

    // Roll it along its own travel, so the surface reads as a solid that turns
    // rather than a sphere sliding sideways.
    g.rotation.x += velocity.z * cdt * 0.16;
    g.rotation.y += velocity.x * cdt * 0.16;
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[0.5, 2]} />
        <meshBasicMaterial
          color="#ffffff"
          wireframe
          transparent
          opacity={0.75}
          depthWrite={false}
        />
      </mesh>
      {/* A dark core, so the wireframe reads as a surface with a far side
          rather than as a transparent cage of lines. */}
      <mesh>
        <sphereGeometry args={[0.485, 24, 16]} />
        <meshBasicMaterial color="#07090c" />
      </mesh>
    </group>
  );
}
