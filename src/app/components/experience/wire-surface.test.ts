import { describe, expect, test } from "bun:test";
import { Z } from "./journey";
import {
  CLOSED_AXIS_Y,
  CLOSED_RADIUS,
  FLOOR_HW,
  floorY,
  HW,
  PERIMETER,
  rideY,
  STEP_X,
  settle,
  surfacePoint,
  WALL_H,
  WELL_RADIUS,
  WELL_Z,
  WORLD_Z_END,
  WORLD_Z_START,
  wellCoverage,
  wrap,
} from "./wire-surface";

/**
 * The surface is the one thing in this project that cannot be checked by
 * looking — a seam a few hundredths of a unit wide is invisible in a still and
 * unmistakable in motion, and the failure only shows up on one stretch of a
 * long ride. These assert the invariants the geometry is built on.
 */

/** Walk the whole ride at a fine step. */
function eachZ(step = 1.5): number[] {
  const out: number[] = [];
  for (let z = WORLD_Z_START; z >= WORLD_Z_END; z -= step) out.push(z);
  return out;
}

/** A depth inside the sealed window, where the section is a closed room. */
const SEALED_Z = (Z.MOUTH_SHUT + Z.FLARE_START) / 2;

describe("cross-section identities", () => {
  test("the plane's width is exactly the closed section's perimeter", () => {
    // If this drifts, the closed section carries a split along its top.
    expect(PERIMETER).toBeCloseTo(2 * (2 * HW + WALL_H), 10);
  });

  test("the circle and the rectangle measure the same around", () => {
    expect(2 * Math.PI * CLOSED_RADIUS).toBeCloseTo(PERIMETER, 10);
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
    //
    // Stepped finer than the rest of this file: the sealed window is 30 units
    // long now rather than 470, so a 1.5 step would sample it twenty times and
    // a coverage floor would be measuring the step size.
    let checked = 0;
    for (const z of eachZ(0.4)) {
      if (wrap(z) < 0.9999) continue;
      const [lx, ly] = surfacePoint(-FLOOR_HW, z);
      const [rx, ry] = surfacePoint(FLOOR_HW, z);
      expect(Math.hypot(lx - rx, ly - ry)).toBeLessThan(0.02);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(50);
  });

  test("the sealed section is the rectangle it claims to be", () => {
    expect(wrap(SEALED_Z)).toBeGreaterThan(0.99);
    let maxX = 0;
    let maxY = -Infinity;
    let minY = Infinity;
    for (let i = 0; i <= 400; i += 1) {
      const x = -FLOOR_HW + (i / 400) * PERIMETER;
      const [px, py] = surfacePoint(x, SEALED_Z);
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
    /*
      A jump here is a visible rip in the surface as you fly through it.

      The worst case is the seam along the top of the section at the midpoint of
      the flare, where the outermost vertices travel furthest per unit of z. It
      is a steep gradient rather than a discontinuity, and the ceiling exists to
      catch it becoming one.

      WHAT CHANGED, AND WHY THE CEILING DID NOT

      This used to be waived at the same value on the grounds that the flare
      played behind a full hyperspace streak field, with the whole surface faded
      to about 5% opacity at the worst step. That argument is gone with the
      streaks — the flare is now the crossing opening, drawn at full strength,
      and it is the single most-looked-at moment on the page.

      It is kept anyway, and the reason is that the gradient is the *subject*
      here rather than an artefact: the section unrolling fast is what "you are
      through" looks like. What must not happen is a tear, and a bounded step is
      exactly the difference. The bound leaves headroom over the measured peak,
      so lengthening the sealed window at the flare's expense — the one edit that
      would make this steeper — trips it.
    */
    for (const x of [-FLOOR_HW, -20, 0, 20, FLOOR_HW]) {
      let prev = surfacePoint(x, WORLD_Z_START);
      for (let z = WORLD_Z_START - 0.5; z >= WORLD_Z_END; z -= 0.5) {
        const next = surfacePoint(x, z);
        const step = Math.hypot(next[0] - prev[0], next[1] - prev[1]);
        expect(step).toBeLessThan(1.8);
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
      const ceiling = base + Math.max(CLOSED_AXIS_Y, 2.8) * 2;
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
      const above = rideY(z) - floorY(0, z);
      expect(above).toBeLessThan(CLOSED_AXIS_Y + 0.02);
      expect(above).toBeGreaterThan(2.79);
    }
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
    // Mid-plain: the eye should be a person's height over the hills, not on an
    // axis eight units up.
    const z = -280;
    expect(wrap(z)).toBeLessThan(0.01);
    expect(rideY(z) - floorY(0, z)).toBeCloseTo(2.8, 6);
  });

  test("stands on flat ground at the opening frame", () => {
    // The first thing anyone sees: a flat field, not a curve.
    expect(wrap(WORLD_Z_START)).toBeLessThan(1e-4);
    expect(rideY(WORLD_Z_START)).toBeCloseTo(floorY(0, WORLD_Z_START) + 2.8, 6);
  });

  test("the ground has given way by the time the section closes", () => {
    // The gesture the opening is built on: between the title field and the
    // crossing the floor drops out from under the camera.
    const standing = rideY(Z.MOUTH_OPEN) - floorY(0, Z.MOUTH_OPEN);
    const flying = rideY(SEALED_Z) - floorY(0, SEALED_Z);
    expect(standing).toBeCloseTo(2.8, 1);
    expect(flying).toBeGreaterThan(7);
  });
});

describe("the far side", () => {
  test("the crossing opens, so there is somewhere to arrive", () => {
    // A portal is only legible if there is something on the other side of it.
    // This is the whole of the page's remaining spatial claim: closed here, open
    // there, and open from there on.
    expect(wrap(SEALED_Z)).toBeGreaterThan(0.99);
    expect(wrap(Z.FLARE_END)).toBeLessThan(1e-3);
    expect(wrap(Z.TRACK_END)).toBeLessThan(1e-3);
  });

  test("the camera stands on open ground at the end of the ride", () => {
    const z = Z.TRACK_END;
    expect(wrap(z)).toBeLessThan(1e-3);
    expect(rideY(z) - floorY(0, z)).toBeCloseTo(2.8, 6);
  });

  test("the ground the briefing is read over is dead flat", () => {
    /*
      `waveWindow` is what the budget pins; this is the consequence at the only
      place it matters. `floorY` on the centreline must be the bare `FLOOR_Y`
      once the world has settled — no residual roll under the format table, the
      schedule or the register.
    */
    for (const z of [Z.SETTLE_END, -600, -750, Z.TRACK_END]) {
      expect(settle(z)).toBe(1);
      expect(floorY(0, z)).toBeCloseTo(-2.8, 9);
    }
  });
});

describe("wellCoverage", () => {
  test("coverage is decided per point, not per depth", () => {
    // The invariant with teeth: at one depth, coverage must still vary with x,
    // because the mesh it is splitting is radial. A depth-only predicate — the
    // bug this replaced — returns the same value right across the frame, and
    // that is what let both grids draw the same pixels.
    const z = WELL_Z;
    const near = wellCoverage(0, z);
    const far = wellCoverage(240, z);
    expect(near).toBeGreaterThan(0.9);
    expect(far).toBeLessThan(1e-4);
    // ...and it is monotonic outward, so there is no ring where it flickers
    // back on beyond the handover.
    let prev = Number.POSITIVE_INFINITY;
    for (let x = 0; x <= 260; x += 5) {
      const c = wellCoverage(x, z);
      expect(c).toBeLessThanOrEqual(prev + 1e-9);
      prev = c;
    }
  });

  test("the well owns its own middle", () => {
    expect(wellCoverage(0, WELL_Z)).toBeGreaterThan(0.99);
  });

  test("the arrival plain belongs to the Cartesian grid, not the well", () => {
    // The bug this pins: coverage was a function of depth alone, and `wrap` is
    // 0 in *two* places — the opening field and the country out the far side.
    // So the far plain was handed to a polar mesh hundreds of units away and the
    // grid that should have drawn the ground you land on was culled. The
    // arrival rendered black.
    for (const z of [-400, -600, -844, -1000]) {
      expect(wellCoverage(0, z)).toBeLessThan(1e-4);
    }
  });

  test("the well owns its wide rings, and nothing past them", () => {
    // The bug this pins: the polar mesh is radial, so a ring of radius 170
    // passes through z ~ WELL_Z far out at the frame edges. A depth-only
    // predicate said the well owned 63% of that point and let the Cartesian
    // grid draw the other 37% straight across it — two topologies at partial
    // strength do not blend, they cross, and every crossing was visible.
    expect(wellCoverage(170, WELL_Z)).toBeGreaterThan(0.9);
    expect(wellCoverage(WELL_RADIUS * 0.5, WELL_Z)).toBeGreaterThan(0.9);
    // Past the polar mesh's outermost ring it is the Cartesian grid's ground.
    expect(wellCoverage(215, WELL_Z)).toBeLessThan(1e-4);
  });
});
