import { describe, expect, test } from "bun:test";
import * as THREE from "three";
import {
  buildHand,
  buildHandGeometry,
  handFrame,
  type Limb,
} from "./hand-shape";

/**
 * The first pass at this hand read as a club, and nothing caught it but a
 * screenshot. It typechecked, it linted, it built, and it drew a perfectly
 * clean mesh of the wrong object — because "is this a hand" is a question about
 * proportion, and proportion is exactly the kind of thing that has numbers.
 *
 * So the proportions are assertions now. Not the pose and not the colour, which
 * are taste and belong in a screenshot; the ratios that decide whether the
 * silhouette reads as an arm with a hand on the end or as a tube with stubs.
 */

const LIMBS = buildHand();
const byIndex = (i: number) => LIMBS[i];
/** Build order is fixed: forearm, wrist, palm, thumb, then four fingers. */
const FOREARM = byIndex(0);
const WRIST = byIndex(1);
const PALM = byIndex(2);
const THUMB = byIndex(3);
const FINGERS = LIMBS.slice(4);

const maxRx = (l: Limb) => Math.max(...l.rx);
const minRx = (l: Limb) => Math.min(...l.rx);
/** Radii are profiles now, so "round" means the whole profile matches. */
const same = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

/** Total spine length of a limb, walked control point to control point. */
function span(l: Limb): number {
  let d = 0;
  for (let i = 1; i < l.path.length; i += 1) {
    const [ax, ay, az] = l.path[i - 1];
    const [bx, by, bz] = l.path[i];
    d += Math.hypot(bx - ax, by - ay, bz - az);
  }
  return d;
}

describe("it is a hand and not a club", () => {
  test("the palm is the widest thing in the model", () => {
    // The single proportion that decides the silhouette. The first pass had a
    // palm barely wider than the wrist, which left nothing between the arm and
    // the fingers for the eye to read as a hand.
    for (const l of LIMBS) {
      if (l === PALM) continue;
      expect(maxRx(PALM)).toBeGreaterThan(maxRx(l));
    }
  });

  test("the palm is flat — much wider than it is thick", () => {
    // A round palm is a forearm that happens to have fingers on the end.
    const thickest = Math.max(...PALM.ry);
    expect(maxRx(PALM) / thickest).toBeGreaterThan(2.5);
  });

  test("the wrist is the waist between the arm and the palm", () => {
    /**
     * Without a narrowing here the whole limb reads as one continuous tube,
     * which is what the first pass looked like.
     *
     * Compared against the wide ends of its neighbours, not their narrow ones:
     * the limbs share their joints by construction, so the wrist's start *is*
     * the forearm's end and asserting one is under the other only ever compares
     * a number with itself.
     */
    expect(minRx(WRIST)).toBeLessThan(maxRx(FOREARM));
    expect(minRx(WRIST)).toBeLessThan(maxRx(PALM) * 0.7);
  });

  test("the forearm arrives narrower than it starts", () => {
    expect(FOREARM.rx[FOREARM.rx.length - 1]).toBeLessThan(FOREARM.rx[0]);
    expect(FOREARM.ry[FOREARM.ry.length - 1]).toBeLessThan(FOREARM.ry[0]);
  });

  test("the fingers are long enough to read as three segments", () => {
    // Four phalanx-sized stubs curled under a palm is a paw. Each finger has to
    // be a real fraction of the hand's own length to be legible at all.
    for (const f of FINGERS) {
      expect(span(f)).toBeGreaterThan(span(PALM) * 0.6);
    }
  });

  test("the fingers are slimmer than the palm they leave", () => {
    for (const f of FINGERS) expect(maxRx(f)).toBeLessThan(maxRx(PALM) * 0.4);
  });

  test("there are four fingers and one thumb, and the thumb is the odd one", () => {
    expect(FINGERS).toHaveLength(4);

    /**
     * What makes a thumb a thumb, stated twice because one of the two is easy
     * to get wrong and it is the one I got wrong first.
     *
     * It attaches *lower* — down by the wrist rather than up on the knuckle
     * line. A thumb level with the fingers is the fastest way to make a hand
     * look like a cartoon glove.
     *
     * And it travels *across* the palm rather than along it, which is the
     * opposed thumb in one number: more displacement in x than in y, where
     * every finger is the reverse.
     *
     * The first version of this asserted the thumb reached furthest out of the
     * palm's plane instead. That is true of a flat hand and false of this one —
     * curled fingers leave the plane much further than a thumb does, measured
     * at 0.69 against 0.55 — so it was a test of the pose rather than of the
     * anatomy, and it would have gone green again the moment the fingers
     * straightened.
     */
    const lowestFinger = Math.min(...FINGERS.map((f) => f.path[0][1]));
    expect(THUMB.path[0][1]).toBeLessThan(lowestFinger);

    const across = (l: Limb) => {
      const a = l.path[0];
      const b = l.path[l.path.length - 1];
      return Math.abs(b[0] - a[0]) / Math.abs(b[1] - a[1]);
    };
    expect(across(THUMB)).toBeGreaterThan(1);
    for (const f of FINGERS) expect(across(f)).toBeLessThan(1);
  });

  test("it is pointing: one finger out, three closed", () => {
    /**
     * The pose, as the two numbers that make it one.
     *
     * This test used to forbid any finger from curling past a right angle,
     * which was right for the splayed hand it was written against and is
     * exactly backwards now — three of these fingers are *supposed* to be a
     * fist. Replaced rather than relaxed, because "no finger closes much" and
     * "one finger is straight and the rest close hard" are different claims and
     * only the second one describes a hand that points at something.
     *
     * Measured as the angle between the first and last phalanx: the index is
     * nearly a straight line, and the others turn through more than a right
     * angle each.
     */
    const bendOf = (l: Limb) => {
      const p = l.path;
      const a = new THREE.Vector3(
        p[1][0] - p[0][0],
        p[1][1] - p[0][1],
        p[1][2] - p[0][2],
      ).normalize();
      const b = new THREE.Vector3(
        p[p.length - 1][0] - p[p.length - 2][0],
        p[p.length - 1][1] - p[p.length - 2][1],
        p[p.length - 1][2] - p[p.length - 2][2],
      ).normalize();
      return Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));
    };

    const [index, ...closed] = FINGERS;
    /*
      Relative rather than absolute, and the absolute version was wrong.

      It capped the index at 0.25 radians, which is a ruler — and a pointing
      finger that is dead straight reads as a spike welded to a fist. What has
      to be true is that it is *far* straighter than the ones that are closed,
      which is a claim about the pose rather than about a number.
    */
    for (const f of closed) expect(bendOf(f)).toBeGreaterThan(Math.PI / 2);
    const tightest = Math.min(...closed.map(bendOf));
    expect(bendOf(index)).toBeLessThan(0.5);
    expect(bendOf(index)).toBeLessThan(tightest / 4);
  });

  test("the closed fingers come back to the palm rather than hanging in air", () => {
    /**
     * The failure a curl angle alone cannot see. A finger 1.28 long turning
     * through 2.4 radians is unambiguously curled and still leaves its tip 0.9
     * units in front of the palm, floating — which is what the first fist
     * looked like. What matters is where the tip *ends up*.
     *
     * The palm's surface is at its half-thickness, so a fingertip within about
     * its own radius of that reads as closed onto the hand.
     */
    const palmSurface = Math.max(...PALM.ry);
    for (const f of FINGERS.slice(1)) {
      const tipZ = f.path[f.path.length - 1][2];
      expect(tipZ - palmSurface).toBeLessThan(0.35);
    }
  });
});

describe("the cross-section's axes", () => {
  /**
   * The bug this exists for was invisible to every other test in this file.
   *
   * The proportions were all correct — palm widest, palm flat, wrist narrowest —
   * and the hand still rendered as a fin standing on edge with the fingers
   * floating beside it, because the *width* was being applied through the
   * thickness. `computeFrenetFrames` picks its initial normal from the smallest
   * component of the tangent, which for a limb along +Y gives normal = X and
   * binormal = -Z: exactly swapped from what the radii are written against.
   *
   * A ratio test cannot see that. Only the axes can.
   */
  const near = (v: THREE.Vector3, x: number, y: number, z: number) => {
    expect(Math.abs(v.x - x)).toBeLessThan(1e-6);
    expect(Math.abs(v.y - y)).toBeLessThan(1e-6);
    expect(Math.abs(v.z - z)).toBeLessThan(1e-6);
  };

  test("width runs across the palm and thickness through it", () => {
    // The canonical case: a limb pointing straight up the hand.
    const { wide, thick } = handFrame(new THREE.Vector3(0, 1, 0));
    near(wide, 1, 0, 0);
    near(thick, 0, 0, 1);
  });

  test("the axes stay orthonormal wherever a limb points", () => {
    for (const l of LIMBS) {
      for (let i = 1; i < l.path.length; i += 1) {
        const [ax, ay, az] = l.path[i - 1];
        const [bx, by, bz] = l.path[i];
        const t = new THREE.Vector3(bx - ax, by - ay, bz - az);
        if (t.length() < 1e-6) continue;
        const { wide, thick } = handFrame(t);
        expect(wide.length()).toBeCloseTo(1, 6);
        expect(thick.length()).toBeCloseTo(1, 6);
        expect(Math.abs(wide.dot(thick))).toBeLessThan(1e-6);
        expect(Math.abs(wide.dot(t.clone().normalize()))).toBeLessThan(1e-6);
      }
    }
  });

  test("the limbs whose orientation matters stay clear of degeneracy", () => {
    /**
     * The one failure mode an explicit reference direction has: a tangent
     * parallel to it collapses the cross product and the frame goes to NaN.
     *
     * It only matters where the cross-section is *not* a circle, and that turns
     * out to be the whole answer to the objection the Frenet frames were reached
     * for. A curled fingertip does run close to the palm normal — the little
     * finger's last phalanx measures 0.93 of parallel — but every finger and the
     * thumb are round, and a circle has no orientation to get wrong. Whatever
     * the frame does there is invisible.
     *
     * The flat limbs are the ones whose width has somewhere to point, and all
     * three of them run along the hand, nowhere near the normal.
     */
    const normal = new THREE.Vector3(0, 0, 1);
    const flat = LIMBS.filter((l) => !same(l.rx, l.ry));
    expect(flat).toEqual([FOREARM, WRIST, PALM]);
    for (const l of flat) {
      for (let i = 1; i < l.path.length; i += 1) {
        const [ax, ay, az] = l.path[i - 1];
        const [bx, by, bz] = l.path[i];
        const t = new THREE.Vector3(bx - ax, by - ay, bz - az).normalize();
        expect(Math.abs(t.dot(normal))).toBeLessThan(0.5);
      }
    }
  });

  test("the round limbs really are round, which is what makes that safe", () => {
    for (const l of LIMBS) {
      if (l === FOREARM || l === WRIST || l === PALM) continue;
      expect(same(l.rx, l.ry)).toBe(true);
    }
  });

  test("no frame anywhere on the model comes out non-finite", () => {
    // The blunt backstop under the argument above: whatever the reasoning, the
    // numbers have to be numbers.
    for (const l of LIMBS) {
      for (let i = 1; i < l.path.length; i += 1) {
        const [ax, ay, az] = l.path[i - 1];
        const [bx, by, bz] = l.path[i];
        const { wide, thick } = handFrame(
          new THREE.Vector3(bx - ax, by - ay, bz - az),
        );
        for (const v of [wide, thick]) {
          expect(Number.isFinite(v.x + v.y + v.z)).toBe(true);
        }
      }
    }
  });
});

describe("the geometry it builds", () => {
  const geometry = buildHandGeometry();
  const pos = geometry.attributes.position.array as Float32Array;
  const col = geometry.attributes.color.array as Float32Array;

  test("every limb has enough control points to frame a curve", () => {
    // `computeFrenetFrames` on a two-point Catmull-Rom is degenerate and
    // produces NaN normals, which takes the whole draw call with it.
    for (const l of LIMBS) expect(l.path.length).toBeGreaterThanOrEqual(3);
  });

  test("nothing is non-finite", () => {
    // One NaN in a position attribute poisons the bounding sphere and three
    // stops drawing the object entirely — silently.
    for (let i = 0; i < pos.length; i += 1) {
      expect(Number.isFinite(pos[i])).toBe(true);
    }
    for (let i = 0; i < col.length; i += 1) {
      expect(Number.isFinite(col[i])).toBe(true);
    }
  });

  test("brightness stays a fraction", () => {
    for (let i = 0; i < col.length; i += 1) {
      expect(col[i]).toBeGreaterThanOrEqual(0);
      expect(col[i]).toBeLessThanOrEqual(1);
    }
  });

  test("positions and colours agree, and it is drawn as line pairs", () => {
    expect(col.length).toBe(pos.length);
    expect((pos.length / 3) % 2).toBe(0);
  });

  test("the forearm dissolves rather than ending in a bright cap", () => {
    // The reference has the arm fading into the black at the frame edge. A
    // limb that ends at full brightness ends in a visible ring instead, which
    // reads as an amputation.
    expect(FOREARM.fade[0]).toBeLessThan(0.1);
  });

  test("it is a mesh rather than a sketch", () => {
    // Cheap guard on the thing that makes this read as a surface at all. The
    // outline version this replaced was about 120 segments.
    expect(pos.length / 6).toBeGreaterThan(1500);
  });

  test("it fits the frame it is staged in", () => {
    // The gate camera sits 6 units back at 45°, so anything past ~6 units from
    // the origin is off screen however the group is turned.
    let far = 0;
    for (let i = 0; i < pos.length; i += 3) {
      far = Math.max(far, Math.hypot(pos[i], pos[i + 1], pos[i + 2]));
    }
    expect(far).toBeLessThan(6);
  });
});
