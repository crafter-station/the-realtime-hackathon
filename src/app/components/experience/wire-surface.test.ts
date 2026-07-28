import { describe, expect, test } from "bun:test";
import {
  closedAxisHeight,
  FLOOR_HW,
  floorY,
  HW,
  PERIMETER,
  railShift as railShiftOf,
  rideY,
  STEP_X,
  surfacePoint,
  WALL_H,
  WORLD_Z_END,
  WORLD_Z_START,
  WORM_RADIUS,
  WORM_Z_IN,
  wrap,
} from "./wire-surface";

/**
 * The surface is the one thing in this project that cannot be checked by
 * looking — a seam a few hundredths of a unit wide is invisible in a still and
 * unmistakable in motion, and the failure only shows up on one stretch of a
 * 750-unit ride. These assert the invariants the geometry is built on.
 */

/** Walk the whole ride at a fine step. */
function eachZ(step = 1.5): number[] {
  const out: number[] = [];
  for (let z = WORLD_Z_START; z >= WORLD_Z_END; z -= step) out.push(z);
  return out;
}

describe("cross-section identities", () => {
  test("the plane's width is exactly the corridor's perimeter", () => {
    // If this drifts, the closed corridor carries a split along its top.
    expect(PERIMETER).toBeCloseTo(2 * (2 * HW + WALL_H), 10);
  });

  test("the circle and the rectangle measure the same around", () => {
    expect(2 * Math.PI * WORM_RADIUS).toBeCloseTo(PERIMETER, 10);
  });

  test("the grid divides the perimeter evenly", () => {
    expect(PERIMETER / STEP_X).toBeCloseTo(Math.round(PERIMETER / STEP_X), 10);
  });
});

describe("surfacePoint", () => {
  test("is flat wherever the plane is unwrapped", () => {
    const z = WORLD_Z_START;
    expect(wrap(z)).toBeLessThan(1e-4);
    for (const x of [-FLOOR_HW, -10, 0, 10, FLOOR_HW]) {
      const [px, py] = surfacePoint(x, z);
      expect(px).toBeCloseTo(x, 9);
      expect(py).toBeCloseTo(floorY(x, z), 9);
    }
  });

  test("closes without a seam once fully wrapped", () => {
    // The two far edges of the plane must land on the same point overhead.
    // Only asserted where the curl has actually finished — a plane that is
    // still closing is *supposed* to have a gap, and that gap shutting is the
    // motion you watch.
    let checked = 0;
    for (const z of eachZ()) {
      if (wrap(z) < 0.9999) continue;
      const [lx, ly] = surfacePoint(-FLOOR_HW, z);
      const [rx, ry] = surfacePoint(FLOOR_HW, z);
      expect(Math.hypot(lx - rx, ly - ry)).toBeLessThan(0.02);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(50);
  });

  test("the closed corridor is the rectangle it claims to be", () => {
    // z = -40 sits in the corridor: fully wrapped, fully square.
    const z = -40;
    expect(wrap(z)).toBeGreaterThan(0.99);
    let maxX = 0;
    let maxY = -Infinity;
    let minY = Infinity;
    for (let i = 0; i <= 400; i += 1) {
      const x = -FLOOR_HW + (i / 400) * PERIMETER;
      const [px, py] = surfacePoint(x, z);
      maxX = Math.max(maxX, Math.abs(px));
      maxY = Math.max(maxY, py);
      minY = Math.min(minY, py);
    }
    expect(maxX).toBeCloseTo(HW, 1);
    expect(maxY - minY).toBeCloseTo(WALL_H, 1);
  });

  test("never produces a non-finite point anywhere on the ride", () => {
    for (const z of eachZ(0.75)) {
      for (let i = 0; i <= 32; i += 1) {
        const x = -FLOOR_HW + (i / 32) * PERIMETER;
        const [px, py] = surfacePoint(x, z);
        expect(Number.isFinite(px)).toBe(true);
        expect(Number.isFinite(py)).toBe(true);
      }
    }
  });

  test("is continuous along z — no tears between stretches", () => {
    // A jump here is a visible rip in the surface as you fly through it.
    for (const x of [-FLOOR_HW, -20, 0, 20, FLOOR_HW]) {
      let prev = surfacePoint(x, WORLD_Z_START);
      for (let z = WORLD_Z_START - 0.5; z >= WORLD_Z_END; z -= 0.5) {
        const next = surfacePoint(x, z);
        const step = Math.hypot(next[0] - prev[0], next[1] - prev[1]);
        expect(step).toBeLessThan(1.2);
        prev = next;
      }
    }
  });
});

describe("the ride", () => {
  test("the camera is never outside the section it is travelling through", () => {
    for (const z of eachZ()) {
      const y = rideY(z);
      const base = floorY(0, z);
      const ceiling = base + Math.max(closedAxisHeight(z), 2.8) * 2;
      expect(y).toBeGreaterThan(base - 0.01);
      expect(y).toBeLessThan(ceiling + 0.01);
    }
  });

  test("never overshoots the axis it is climbing toward", () => {
    // The bounce this guards against: chasing a half-folded plane's geometric
    // centre lifts the eye to fifteen units and drops it back to eight, right
    // where the ground is meant to be giving way in one clean move.
    for (const z of eachZ()) {
      if (wrap(z) < 1e-4) continue;
      const above = rideY(z) - floorY(0, z) - railShiftOf(z);
      expect(above).toBeLessThan(closedAxisHeight(z) + 0.02);
      expect(above).toBeGreaterThan(2.79);
    }
  });

  test("the finished tube sits on the wormhole's axis", () => {
    // The vortex is centred on y = 0. Arrive anywhere else and the black hole
    // hangs off to one side for the whole finale.
    expect(Math.abs(rideY(WORM_Z_IN))).toBeLessThan(0.05);
    const [, bottomY] = surfacePoint(0, WORM_Z_IN);
    expect(Math.abs(bottomY + WORM_RADIUS)).toBeLessThan(0.05);
  });

  test("the camera height is continuous — no lurch", () => {
    let prev = rideY(WORLD_Z_START);
    for (let z = WORLD_Z_START - 0.5; z >= WORLD_Z_END; z -= 0.5) {
      const next = rideY(z);
      expect(Math.abs(next - prev)).toBeLessThan(0.35);
      prev = next;
    }
  });

  test("rides just over the ground where the world is open", () => {
    // Mid-plain: the eye should be a person's height over the hills, not on a
    // tube axis thirteen units up.
    const z = -280;
    expect(wrap(z)).toBeLessThan(0.01);
    expect(rideY(z) - floorY(0, z)).toBeCloseTo(2.8, 6);
  });

  test("stands on flat ground at the opening frame", () => {
    // The first thing anyone sees: a flat field, not a curve.
    expect(wrap(WORLD_Z_START)).toBeLessThan(1e-4);
    expect(rideY(WORLD_Z_START)).toBeCloseTo(floorY(0, WORLD_Z_START) + 2.8, 6);
  });

  test("the ground has given way by the time the corridor closes", () => {
    // The gesture the opening is built on: between the title field and the
    // corridor the floor drops out from under the camera.
    const standing = rideY(140) - floorY(0, 140);
    const flying = rideY(0) - floorY(0, 0);
    expect(standing).toBeCloseTo(2.8, 1);
    expect(flying).toBeGreaterThan(7);
  });
});
