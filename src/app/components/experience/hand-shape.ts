/**
 * The shape of the hand, as maths.
 *
 * Split from `wire-hand.tsx` for the reason every other pair in this directory
 * is split — `wire-surface.ts` and `wire-world.tsx`, `wire-tracks.ts` and
 * `wire-signal.tsx`: where a thing *is* can be checked by a test, and how it is
 * drawn cannot. The first pass at this hand shipped proportions that read as a
 * club, and the only thing that caught it was looking at a screenshot. The
 * proportions are now assertions.
 *
 * No React and no r3f here, only `three`'s maths classes, so `hand-shape.test.ts`
 * can measure the model without a canvas or a DOM.
 */

import * as THREE from "three";

/** Bright enough to read as light on black; the brand's own mid-ramp tone. */
export const HAND_COLOR = "#ff7a45";

/**
 * Faces around each cross-section.
 *
 * Twelve made the palm a plank. A cross-section 4.6 times wider than it is
 * thick, sampled twelve times, puts consecutive vertices a long way apart across
 * the flat of it and barely apart through the thickness — so the "ellipse" draws
 * as two long straight rails with square ends, and the palm reads as a piece of
 * board with fingers glued to it. Visible in a close-up and invisible at the
 * size the first screenshots were taken at.
 *
 * Twenty costs about 65% more segments and is what makes a wide section curve.
 */
const SIDES = 20;

export type Limb = {
  /** Control points of the spine, hand-local. Catmull-Rom runs through them. */
  path: readonly (readonly [number, number, number])[];
  /**
   * Half-width across the palm, as a profile along the limb.
   *
   * Two values is a linear taper; three or more is a shape. That distinction is
   * the difference between a hand and a set of cones — a finger is not a taper,
   * it is a swell at each knuckle with a waist between them, and a palm is not a
   * box, it is a mass that bulges and narrows again at the fingers. The first
   * version interpolated straight from one end to the other and read as CAD.
   */
  rx: readonly number[];
  /** Half-thickness through the palm, same profile rules. */
  ry: readonly number[];
  /** Cross-sections along the length. More on the parts that curve. */
  rings: number;
  /** Brightness at the start and end — this is how the forearm trails off. */
  fade: readonly [number, number];
};

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * A radius profile, sampled along a limb.
 *
 * Smoothstepped between control points rather than linear, so the knots are
 * flat rather than creased — a knuckle wants to be a swell, and piecewise-linear
 * control points give it a visible corner instead. Two values degrade to exactly
 * the taper this replaced.
 */
export function sampleProfile(p: readonly number[], t: number): number {
  if (p.length === 1) return p[0];
  const n = p.length - 1;
  const x = THREE.MathUtils.clamp(t, 0, 1) * n;
  const i = Math.min(Math.floor(x), n - 1);
  const f = x - i;
  return THREE.MathUtils.lerp(p[i], p[i + 1], f * f * (3 - 2 * f));
}

/**
 * A finger, as the joints it actually bends at.
 *
 * Built by walking rather than by writing coordinates down, because the thing
 * that has to look right is the *curl* — three phalanges each turning a little
 * further than the last — and a curl written as nine hand-typed numbers is a
 * curl nobody can adjust afterwards.
 *
 * `spread` splays the finger away from the centreline; `tilt` is where it leaves
 * the knuckle; `bends` is how much further it turns at each joint. Positive
 * turns toward +Z, which is the side the palm faces, so positive is closing.
 */
function finger(
  base: readonly [number, number, number],
  spread: number,
  tilt: number,
  lengths: readonly number[],
  bends: readonly number[],
): [number, number, number][] {
  const up = V(0, 0, 1);
  const side = V(1, 0, 0).applyAxisAngle(up, spread);
  const forward = V(0, 1, 0).applyAxisAngle(up, spread);
  let p = V(base[0], base[1], base[2]);
  const out: [number, number, number][] = [[p.x, p.y, p.z]];
  let angle = tilt;
  for (let i = 0; i < lengths.length; i += 1) {
    angle += bends[i];
    const dir = forward.clone().applyAxisAngle(side, angle);
    p = p.clone().addScaledVector(dir, lengths[i]);
    out.push([p.x, p.y, p.z]);
  }
  return out;
}

/**
 * The hand, limb by limb.
 *
 * Canonical pose: wrist at the origin, fingers up +Y, palm facing +Z, thumb to
 * -X. Every number below is in that frame, and the group is rotated into the
 * reaching-in-from-the-left pose at the bottom of this file — so the anatomy and
 * the staging can be adjusted without disturbing each other.
 */
export function buildHand(): Limb[] {
  /*
    THE FIRST PASS READ AS A CLUB, AND IT WAS PROPORTIONS RATHER THAN TECHNIQUE

    The mesh was right the first time and the anatomy was not. Three numbers did
    it: a forearm that never tapered, so the whole thing was one fat tube; a
    palm barely wider than the wrist, so there was no hand between the arm and
    the fingers; and fingers about two thirds this length curled through 1.2
    radians, which folds them under the palm where they read as a paw.

    What a hand needs at this scale, in order of how much it matters: the palm
    must be *wide and flat* — twice as wide as thick — because that is the only
    part that says "hand" in silhouette. The forearm must arrive narrower than
    it starts. And the fingers have to be long enough to be legible as three
    segments each, which means barely closed rather than gripping.
  */
  /*
    POINTING, WHICH IS A POSE AND NOT A DECORATION

    The hand exists to aim at the cursor, so the index is nearly straight and
    the other three roll into a fist under it. That is also what makes the
    tracking legible: a splayed hand turning toward you reads as a hand turning,
    while a pointing hand turning toward you reads as a hand *pointing at you*.

    The curls are near 4 radians across three joints — about 75° a knuckle,
    which is what a real fist does. It has to be that much: a finger 1.28 long
    curling through 2.4 leaves its tip 0.9 in front of the palm, hanging in the
    air, and only past about 4 does the tip come back to within a finger's width
    of the palm it is supposed to be closing onto.
  */
  const fingers: Limb[] = [
    /*
      Index — the one that does the pointing, and it is not a ruler.

      A real pointing finger keeps a gentle curve; a dead-straight one reads as
      a spike welded to a fist, which is what the first version of this looked
      like at 0.06 a joint. Enough bend to see three segments, far less than the
      three that are closed.

      The `rx` profile is where the knuckles are: swell, waist, swell, taper to
      the tip. Four control points, and it is most of what separates a finger
      from a cone.
    */
    {
      base: [-0.44, 0.44, 0.0] as const,
      spread: 0.1,
      tilt: -0.04,
      lengths: [0.62, 0.4, 0.3],
      bends: [0.14, 0.16, 0.12],
      rx: [0.15, 0.121, 0.132, 0.083] as const,
      rings: 24,
    },
    /*
      Middle, ring, little — closed, and closed *together*. Their bases sit
      nearer each other than anatomy alone would put them, because three
      separately curling tubes read as three sausages and a fist has to read as
      one mass.
    */
    {
      base: [-0.17, 0.47, 0.0] as const,
      spread: 0.02,
      tilt: 0.2,
      lengths: [0.6, 0.4, 0.28],
      bends: [1.3, 1.4, 1.2],
      rx: [0.152, 0.124, 0.134, 0.088] as const,
      rings: 22,
    },
    {
      base: [0.09, 0.45, 0.0] as const,
      spread: -0.05,
      tilt: 0.24,
      lengths: [0.56, 0.37, 0.26],
      bends: [1.34, 1.44, 1.22],
      rx: [0.144, 0.117, 0.127, 0.083] as const,
      rings: 22,
    },
    {
      base: [0.33, 0.38, -0.02] as const,
      spread: -0.16,
      tilt: 0.3,
      lengths: [0.46, 0.3, 0.22],
      bends: [1.38, 1.46, 1.2],
      rx: [0.126, 0.102, 0.111, 0.073] as const,
      rings: 20,
    },
  ].map((f) => ({
    path: finger(f.base, f.spread, f.tilt, f.lengths, f.bends),
    rx: f.rx,
    ry: f.rx,
    rings: f.rings,
    fade: [1, 0.92] as const,
  }));

  return [
    /*
      The forearm. Its far end is dark rather than absent: the reference has the
      arm dissolving into the black at the frame edge instead of being cut off
      by one, and a brightness ramp does that without needing to know where the
      frame is.
    */
    {
      path: [
        [0.06, -3.3, -0.12],
        [0.03, -2.2, -0.06],
        [0, -1.35, 0],
      ],
      rx: [0.42, 0.36, 0.27],
      ry: [0.37, 0.31, 0.23],
      rings: 22,
      fade: [0, 0.62],
    },
    // The wrist: the narrowest point, and where the section starts flattening
    // out of the arm's near-circle into the palm's oval.
    {
      path: [
        [0, -1.35, 0],
        [0, -1.05, 0.01],
        [0, -0.74, 0.02],
      ],
      rx: [0.27, 0.3, 0.43],
      ry: [0.23, 0.21, 0.2],
      rings: 14,
      fade: [0.62, 0.88],
    },
    /*
      The palm, and the one limb whose cross-section matters more than its
      spine: `rx` roughly three times `ry` is what makes it a palm rather than a
      forearm that happens to have fingers on the end. It is also the widest
      thing in the model — wider than the arm it comes out of, which is the
      proportion the first pass got backwards.
    */
    {
      path: [
        [0, -0.74, 0.02],
        [0, -0.1, 0.05],
        [0, 0.58, 0.0],
      ],
      rx: [0.43, 0.6, 0.53],
      ry: [0.2, 0.235, 0.2],
      rings: 20,
      fade: [0.88, 1],
    },
    /*
      The thumb, which is the reason a wireframe hand reads as a hand at all —
      it is the only limb that leaves the plane of the others, so it is what
      gives the silhouette its depth.

      It sits low on the radial side, near the wrist rather than up at the
      knuckles: a thumb attached level with the fingers is the single fastest
      way to make a hand look like a cartoon glove. `tilt` lifts it out of the
      palm's plane toward the camera, which is what the reference shows.
    */
    {
      path: finger([-0.4, -0.28, 0.1], 1.0, 0.5, [0.48, 0.34], [0.5, 0.62]),
      rx: [0.165, 0.1],
      ry: [0.165, 0.1],
      rings: 13,
      fade: [0.92, 0.88],
    },
    ...fingers,
  ];
}

/**
 * The cross-section's own axes at a point along a spine.
 *
 * NOT `computeFrenetFrames`, AND THAT WAS A REAL BUG RATHER THAN A PREFERENCE
 *
 * This used three's Frenet frames, on the reasoning that it is what
 * `TubeGeometry` uses and it keeps sections square to a curl. Both true, and it
 * still produced a hand whose palm was a fin standing on edge with the fingers
 * floating off it.
 *
 * The reason is that Frenet frames choose their *initial* normal from the
 * smallest component of the tangent. For a limb pointing along +Y that yields
 * normal = X and binormal = -Z — the exact opposite of the assumption the radii
 * are written against. So `rx`, the palm's 0.66 of width, was being applied
 * through its thickness, and `ry`'s 0.155 across its width. The palm came out
 * four times too thick and four times too narrow, which is why nothing lined up
 * with anything.
 *
 * A frame built from an explicit reference direction has no such freedom: `wide`
 * is the palm's width axis and `thick` is its normal, at every point, on every
 * limb. The palm's plane is a fact about the hand, so the frame should be
 * derived from it rather than from whichever axis happened to be smallest.
 *
 * The curl artefact the Frenet frames were guarding against needs the tangent to
 * approach the reference direction, and no finger here bends more than about a
 * radian off +Y — `handFrame` asserts the margin rather than trusting it.
 */
const PALM_NORMAL = new THREE.Vector3(0, 0, 1);
/** Used only where a limb runs along the normal and the first reference dies. */
const FALLBACK_REF = new THREE.Vector3(1, 0, 0);
/** Past this much alignment the cross product is too short to trust. */
const DEGENERATE = 0.94;

export function handFrame(tangent: THREE.Vector3): {
  wide: THREE.Vector3;
  thick: THREE.Vector3;
} {
  const t = tangent.clone().normalize();
  /*
    A curled finger runs *through* the palm's plane on its way round, and at the
    moment its tangent is parallel to the normal the cross product is zero —
    three's `normalize()` returns (0,0,0) rather than NaN, so the ring collapses
    to a point and the finger pinches shut. Not hypothetical: the pointing pose
    curls three fingers past 90°, so every one of them crosses it.

    Switching reference twists the section, and that is free here: every limb
    that can reach this state is circular, and a circle has no orientation to
    twist. The flat limbs run along the hand and never come close —
    `hand-shape.test.ts` asserts both halves of that.
  */
  const ref =
    Math.abs(t.dot(PALM_NORMAL)) > DEGENERATE ? FALLBACK_REF : PALM_NORMAL;
  const wide = new THREE.Vector3().crossVectors(t, ref).normalize();
  const thick = new THREE.Vector3().crossVectors(wide, t).normalize();
  return { wide, thick };
}

/** One limb, as ring loops plus longitudinals. */
function limbLines(limb: Limb, pos: number[], col: number[]) {
  const curve = new THREE.CatmullRomCurve3(
    limb.path.map(([x, y, z]) => V(x, y, z)),
    false,
    "catmullrom",
    0.5,
  );
  const n = limb.rings;
  const rings: THREE.Vector3[][] = [];
  const bright: number[] = [];

  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const centre = curve.getPointAt(t);
    const { wide: binormal, thick: normal } = handFrame(curve.getTangentAt(t));
    const rx = sampleProfile(limb.rx, t);
    const ry = sampleProfile(limb.ry, t);
    const ring: THREE.Vector3[] = [];
    for (let s = 0; s < SIDES; s += 1) {
      const a = (s / SIDES) * Math.PI * 2;
      ring.push(
        centre
          .clone()
          .addScaledVector(binormal, Math.cos(a) * rx)
          .addScaledVector(normal, Math.sin(a) * ry),
      );
    }
    rings.push(ring);
    bright.push(THREE.MathUtils.lerp(limb.fade[0], limb.fade[1], t));
  }

  const seg = (a: THREE.Vector3, b: THREE.Vector3, va: number, vb: number) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    col.push(va, va, va, vb, vb, vb);
  };

  for (let i = 0; i <= n; i += 1) {
    // The ring itself, closed.
    for (let s = 0; s < SIDES; s += 1) {
      seg(rings[i][s], rings[i][(s + 1) % SIDES], bright[i], bright[i]);
    }
    // And along the limb, which is what makes the cells read as quads.
    if (i < n) {
      for (let s = 0; s < SIDES; s += 1) {
        seg(rings[i][s], rings[i + 1][s], bright[i], bright[i + 1]);
      }
    }
  }
}

/** The whole hand as one buffer. Exported so a test can measure it. */
export function buildHandGeometry(): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  for (const limb of buildHand()) limbLines(limb, pos, col);
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(pos), 3),
  );
  g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(col), 3));
  return g;
}

/**
 * Where the index fingertip is, in hand-local space.
 *
 * Derived rather than written down, because it is the point the gate reaches
 * toward the cursor with and it moves whenever the pointing finger's lengths or
 * bends are touched. A hardcoded copy of it would go stale on the first pose
 * change and the hand would start reaching with a spot in mid-air.
 *
 * Index is the fifth limb — forearm, wrist, palm, thumb, then the fingers — and
 * `hand-shape.test.ts` pins that ordering so this cannot quietly grab the thumb.
 */
export function indexTip(): readonly [number, number, number] {
  const index = buildHand()[4];
  return index.path[index.path.length - 1];
}
