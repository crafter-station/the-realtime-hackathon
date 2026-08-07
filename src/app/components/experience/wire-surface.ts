/**
 * Where the surface is.
 *
 * ONE surface carries the whole journey. It starts as a field of grid with a
 * gravity well sunk into it and stars overhead. Scroll, and the plane curls up
 * around you: the ground drops away, the edges climb, and by the time they meet
 * overhead you are inside the portal. It opens again a moment later into rolling
 * country, which is the other side — and it stays open, because there is nothing
 * left to cross.
 *
 * There is no separate floor, no walls object, no ceiling object. A cross
 * section is described by one number at each depth — how closed it is (`wrap`) —
 * and every vertex in the world goes through `surfacePoint`, so nothing can
 * drift out of register with anything else.
 *
 * WHAT USED TO BE HERE
 *
 * A second curl, 470 units long, that closed the plane into a circular tube and
 * handed it to a spiralling vortex, which then opened again into a second plain.
 * It is gone with the rest of the second crossing — see the header of
 * `journey.ts`. What that removal leaves behind is worth stating plainly: `wrap`
 * is now a single event rather than the maximum of two, `rectness` does not need
 * to exist because the only closed section on the page is the rectangular one,
 * and `railShift` does not need to exist because nothing has to slide onto a
 * wormhole's axis. Three functions and about 90 units of z of geometry were load
 * bearing only for a beat the page no longer plays.
 *
 * Pure maths, no React and no three — so the geometry can be checked by a test
 * rather than by squinting at a canvas. `wire-world.tsx` draws what this says.
 */

import { Z } from "./journey";

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------
// Extents
// ---------------------------------------------------------------------------

/** The field the well is sunk into sits out here, ahead of the portal mouth. */
export const WORLD_Z_START = Z.WORLD_Z_START;
export const WORLD_Z_END = Z.WORLD_Z_END;

// ---------------------------------------------------------------------------
// Cross-section
// ---------------------------------------------------------------------------

export const HW = 13; // half width of the closed section
export const WALL_H = 16.4; // floor → ceiling
export const FLOOR_Y = -2.8;
export const EYE_OPEN = 2.8; // eye height over open ground

const RECT_A = HW; // 13
const RECT_B = WALL_H / 2; // 8.2

/**
 * The grid's width IS the closed section's perimeter. That is the whole trick:
 * the plane can roll into the room without a single vertex stretching, because a
 * 26 x 16.4 rectangle and a circle of radius 13.4937 both measure 84.8 around.
 * Change STEP_X or FLOOR_COLS and this stops being true — the seam along the top
 * will split open and you will see it. `wire-surface.test.ts` guards the
 * identity.
 */
export const STEP_X = 2.65;
export const STEP_Z = 2.65;
export const FLOOR_COLS = 32;
export const FLOOR_HW = (FLOOR_COLS / 2) * STEP_X; // 42.4
export const PERIMETER = FLOOR_COLS * STEP_X; // 84.8 = 2 * (2*HW + WALL_H)

/**
 * Radius of the fully-closed circular section. Same perimeter, so nothing
 * stretches.
 *
 * Still needed even though nothing on this page ends up circular: `circleOffset`
 * walks the section round an arc of *this* radius on the way to closed, and only
 * blends to the rectangle over the last of the curl. The circle is the
 * intermediate shape, not a destination.
 */
export const CLOSED_RADIUS = PERIMETER / (2 * Math.PI); // ≈ 13.4937

// ---------------------------------------------------------------------------
// Where each stretch happens, in world z
// ---------------------------------------------------------------------------

const MOUTH_OPEN = Z.MOUTH_OPEN; // plane dead flat: the field the well sits in
const MOUTH_SHUT = Z.MOUTH_SHUT; // closed all the way round: inside the portal
const FLARE_START = Z.FLARE_START; // the crossing starts peeling open
const FLARE_END = Z.FLARE_END; // out the other side, open country
const SETTLE_START = Z.SETTLE_START; // the world stops travelling
const SETTLE_END = Z.SETTLE_END;

/**
 * How much the world has stood down.
 *
 * 0 through the whole ride, 1 across the briefing. This is the page's second act
 * and the only thing that announces it — there is no "you have arrived" section
 * any more, because a section that says so while the ground is still rolling
 * under it is a caption, not an arrival.
 *
 * Read by the ground (rolling stops), the grid (dims), and the signal layer
 * (switches off). One function so those three cannot disagree about when the
 * spectacle is over.
 */
export function settle(z: number): number {
  return smoothstep(SETTLE_START, SETTLE_END, z);
}

/** 0 = flat plane, 1 = closed all the way round. */
export function wrap(z: number): number {
  return (
    smoothstep(MOUTH_OPEN, MOUTH_SHUT, z) *
    (1 - smoothstep(FLARE_START, FLARE_END, z))
  );
}

/**
 * A rectangle has no half-folded form, so it is blended in late, over the last
 * of the curl — until then the section is a circular arc opening out to flat.
 *
 * No `rectness` factor any more. There is one closed section on this page and it
 * is the room, so the only question left is how far the curl has got.
 */
export function rectAmount(z: number): number {
  return smoothstep(0.55, 1, wrap(z));
}

/**
 * Undulations only live on the open stretch — the ground is flat inside the
 * crossing and flat again once the world settles. Rolling hills wrapped around
 * you read as a dented pipe, not as country.
 *
 * The near edge is 8 units past `FLARE_END`, so the ground is fully open before
 * it starts moving. The far edge is `settle`, which is the same window the grid
 * and the signal layer stand down across — the briefing is read over ground that
 * is not doing anything.
 */
export function waveWindow(z: number): number {
  return smoothstep(-48, -90, z) * (1 - settle(z));
}

// ---------------------------------------------------------------------------
// The well
// ---------------------------------------------------------------------------

/**
 * The portal: a gravity well sunk into the flat field.
 *
 * This is the first thing anyone sees, it is the one shape the whole page is
 * named after, and since the second crossing was cut it is also the *only*
 * portal you pass through — so it is the subject of the frame, dead centre, with
 * the copy pushed off to one side rather than sitting on top of it.
 *
 * The profile is Flamm's paraboloid rather than a bowl. A cosine dish has zero
 * slope at the bottom, which reads as a dent; a well has to fall away faster
 * the closer you get, so the grid rings crowd together at the throat and the
 * eye is pulled down it. `1 - sqrt(t)` gives exactly that — finite depth at the
 * centre, slope steepening all the way in — and the outer window eases the rim
 * back to flat so there is no crease where the well meets the plain.
 *
 * The radius is softened by `WELL_THROAT` before the profile is taken. Straight
 * `1 - sqrt(r/R)` has *infinite* slope at r = 0, which is a cone point, not a
 * portal: the surface tears and the camera lurches as it crosses the middle —
 * both guarded by `wire-surface.test.ts`, and both caught there first. Swapping
 * r for `hypot(r, throat)` rounds the bottom into a mouth and bounds the slope,
 * without flattening the walls the way a smaller exponent would.
 */
export const WELL_Z = 100; // centre, far enough ahead to sit on the eye line
export const WELL_RADIUS = 62;
export const WELL_DEPTH = 42;
const WELL_THROAT = 19;

export function wellDrop(x: number, z: number): number {
  const r = Math.hypot(x, z - WELL_Z);
  const t = clamp01(Math.hypot(r, WELL_THROAT) / WELL_RADIUS);
  if (t >= 1) return 0;
  return WELL_DEPTH * (1 - Math.sqrt(t)) * (1 - smoothstep(0.72, 1, t));
}

/** Where the throat actually bottoms out — the depth the portal light sits at. */
export function wellThroatY(): number {
  return floorY(0, WELL_Z);
}

/** Where the polar mesh's outer edge hands over to the Cartesian grid. */
const COVER_IN = 168;
const COVER_OUT = 190; // = R_MAX in `wire-well.tsx`

/**
 * Darkens both grids across the seam between them.
 *
 * `wellCoverage` splits the frame, but a split is a crossfade, and a crossfade
 * between two *topologies* does not blend — at coverage 0.5 you get the polar
 * mesh at half strength and the Cartesian one at half strength drawn over each
 * other, which reads as a second, finer mesh laid across the rings. Measured at
 * (x = -6, z = 66) it was 0.62 against 0.60: both grids, both plainly visible,
 * dead centre of frame.
 *
 * The band cannot be moved somewhere unseen, because the well spans z 38..162
 * and the curl runs 140..30 — they overlap by construction, and the camera looks
 * straight down the overlap. So instead of hiding the seam, both sides are dimmed
 * across it: two grids at 15% read as nothing, where two at 60% read as a mistake.
 *
 * `4c(1-c)` peaks at exactly the coverage where the double-draw is worst and is
 * zero wherever one grid owns the point outright, so nothing outside the seam
 * loses any brightness.
 */
export function handoverDim(x: number, z: number): number {
  const c = wellCoverage(x, z);
  return 1 - 0.82 * (4 * c * (1 - c));
}

/**
 * Which of the two grids owns a point on the surface.
 *
 * 1 = the polar mesh draws it, 0 = the Cartesian one does. They read this same
 * function of the same point and take complementary halves, so between them
 * every point is drawn exactly once.
 *
 * It has to take x as well as z, and that is the whole reason it exists. A
 * depth-only predicate is fine for a grid made of rows and columns and wrong for
 * one made of rings: a ring of radius 170 passes through z ≈ WELL_Z out at the
 * frame edges, where depth-only says "the well owns 63% of this" and the
 * Cartesian grid happily draws the other 37% straight across it. Two topologies
 * at partial strength do not blend — they cross, and you can see every crossing.
 */
/**
 * Where the guard hands the ground back, downrange of the well.
 *
 * A HOLE IN THE WORLD, AND THE SHAPE OF IT
 *
 * `inside` is a radius from the well's centre at z 100, and 190 of radius
 * reaches all the way to z -90. That was harmless while the plane was wrapped
 * across that whole stretch, because `flat` zeroed the coverage — the old
 * corridor ran to z -164 and nothing was ever both flat *and* inside the radius.
 *
 * Shortening the crossing to end at z -40 created exactly that state, and it is
 * not a dimming, it is an absence: from z -40 to -80 the Cartesian grid was
 * culled outright, while `wire-well.tsx` had already faded its polar mesh to
 * zero on scroll progress by 0.14. Forty units of ground drawn by neither, which
 * on the page is about 50svh landing on the FIVE TRACKS beat — reported as "hay
 * como un hueco aquí", which is precisely what it was.
 *
 * So the guard is bounded downrange as well as radially. The well is a *place*,
 * it spans z 38..162, and once you are through the crossing it is a hundred
 * units behind you: there is nothing left to arbitrate.
 *
 * The handback runs z 14 → -11, and both ends are solved rather than picked.
 *
 * It has to finish before `flat` recovers, or the two guards cross and coverage
 * *rises again* on the way out. `flat` starts letting go once `wrap` falls below
 * 0.75, which on a 40-unit flare is z -10.8 — so a handback ending at -26, the
 * first value tried, left a 12-unit band peaking at 0.063 coverage where the
 * Cartesian grid lost a fifth of its brightness for no reason. Small enough
 * never to be noticed and the same species of accident as the hole above, which
 * is the argument for solving it rather than eyeballing it.
 *
 * Ending at -11 also keeps the seam inside the crossing, where `wrap` is still
 * 0.82 and the grid is thinned — so the handover happens somewhere it cannot be
 * seen, and is over long before the ground the tracks are read on.
 */
const COVER_BEHIND_IN = 14;
const COVER_BEHIND_OUT = -11;

export function wellCoverage(x: number, z: number): number {
  const r = Math.hypot(x, z - WELL_Z);
  const inside = 1 - smoothstep(COVER_IN, COVER_OUT, r);
  // The curl guard has to start *late*. `wrap` is already 0.21 at the well's
  // own centre, so a window opening at 0.05 diluted the well's ownership of its
  // own middle to 63% and let the Cartesian grid draw the other 37% right
  // through the bowl. Invisible in a still, because the polar mesh is far
  // brighter there — but it is two grids over one surface, which is the whole
  // thing this function exists to prevent.
  const flat = 1 - smoothstep(0.35, 0.75, wrap(z));
  const ahead = 1 - smoothstep(COVER_BEHIND_IN, COVER_BEHIND_OUT, z);
  return inside * flat * ahead;
}

/**
 * Rolling ground height. This is what makes the ride rise and fall.
 *
 * The well lives here rather than in `surfacePoint` on purpose: `rideY` reads
 * this same function, so the camera falls down the throat with the grid instead
 * of gliding over a hole. One source of truth for where the ground is, which is
 * the rule the rest of this module is built on.
 */
export function floorY(x: number, z: number): number {
  const wave =
    Math.sin(z * 0.075) * 2.6 + Math.sin(z * 0.029 + x * 0.045) * 1.25;
  return FLOOR_Y + wave * waveWindow(z) - wellDrop(x, z);
}

// ---------------------------------------------------------------------------
// The bend
// ---------------------------------------------------------------------------

/**
 * Lateral position `s` (arc length from the bottom centre, which is just the
 * flat x) mapped onto a circle that is `w` closed. Offsets are measured from
 * the *bottom* of the section, so w → 0 collapses to the flat plane exactly and
 * the world can pipe every vertex through here unconditionally.
 */
export function circleOffset(s: number, w: number): readonly [number, number] {
  if (w < 1e-4) return [s, 0];
  const r = CLOSED_RADIUS / w;
  const theta = s / r;
  return [Math.sin(theta) * r, (1 - Math.cos(theta)) * r];
}

/** The same arc length walked around the closed section's rectangle. */
export function rectOffset(s: number): readonly [number, number] {
  const sign = s < 0 ? -1 : 1;
  const t = Math.abs(s);
  if (t <= RECT_A) return [sign * t, 0];
  if (t <= RECT_A + 2 * RECT_B) return [sign * RECT_A, t - RECT_A];
  const back = t - RECT_A - 2 * RECT_B;
  return [sign * (RECT_A - back), 2 * RECT_B];
}

/**
 * Height of the *closed* section's axis above its own floor.
 *
 * Deliberately independent of how far the curl has actually progressed. A
 * half-closed plane is an arc of a very large circle, so its geometric centre
 * sits tens of units overhead and races downward as the curl tightens; a camera
 * that chases it climbs to fifteen units and then sinks back to eight, which
 * reads as a bounce at the exact moment the ground is supposed to be giving way
 * cleanly. Aiming at where the axis will *end up* keeps the rise monotonic.
 *
 * A constant now the only closed section is the room — it used to interpolate
 * toward the circular tube's centre, and there is no circular tube.
 */
export const CLOSED_AXIS_Y = RECT_B;

/**
 * The one place world geometry is decided. Grid, well and particles all call
 * this, which is why they can never disagree about where the surface is.
 */
export function surfacePoint(x: number, z: number): readonly [number, number] {
  const w = wrap(z);
  const base = floorY(x, z);
  if (w < 1e-4) return [x, base];
  const rect = rectAmount(z);
  const [cx, cy] = circleOffset(x, w);
  if (rect < 1e-4) return [cx, base + cy];
  const [rx, ry] = rectOffset(x);
  return [lerp(cx, rx, rect), base + lerp(cy, ry, rect)];
}

/**
 * Camera height. Just over the ground while open; rises onto the section's axis
 * as it closes, which is what reads as the floor dropping away beneath you.
 * Chased only once the curl is underway — early on the arc's centre is hundreds
 * of units up (a nearly flat plane is an arc of a nearly infinite circle) and
 * following it from the start would fire the camera into the sky.
 */
export function rideY(z: number): number {
  const w = wrap(z);
  const open = floorY(0, z) + EYE_OPEN;
  if (w < 1e-4) return open;
  const onAxis = floorY(0, z) + CLOSED_AXIS_Y;
  return lerp(open, onAxis, smoothstep(0.2, 0.9, w));
}

/**
 * How boxed-in the camera feels. Drives the starfield: the sky is gone inside
 * the crossing and comes back as it peels open.
 *
 * Identical to `wrap` now that the only closed section is the room. Kept as its
 * own name because the starfield is asking a different question than the
 * geometry is — "can I see out" rather than "how folded is this" — and the two
 * were separate concepts before the second curl went, not the same one twice.
 */
export function enclosure(z: number): number {
  return wrap(z);
}

// ---------------------------------------------------------------------------
// Density
// ---------------------------------------------------------------------------

/**
 * Apparent density, not world density.
 *
 * Lines are spread evenly across the *flat* plane, but the plane curls up for
 * the crossing. Curled, columns crowd toward the silhouette edges and cross the
 * rings at grazing angles — which is what turned the ride into a cobweb of
 * moiré.
 *
 * So they thin out as the section closes, by *fading* rather than deleting:
 * geometry stays baked and static, and a column dimming away over twenty units
 * reads as depth instead of as a line being switched off. Odd columns go first,
 * then every other survivor, so the spacing stays even at each stage instead of
 * clumping on one side.
 */
/*
  RETUNED FOR A CROSSING RATHER THAN A CORRIDOR, AND THE DIFFERENCE IS LENGTH

  These were calibrated against a closed section 470 units long that the camera
  spent a third of the page inside. Over that distance the moiré is the dominant
  artefact and thinning three columns in four to nothing is the right trade.

  The closed section is now 70 units and you are through it in about 90svh. At
  that length there is no time for moiré to establish and the opposite failure
  takes over: at the old values the crossing rendered as two faint corner rails
  and a great deal of black — measured in a screenshot at 14% depth, which is
  the page's single climax and was its emptiest frame.

  So the fades still thin, because the geometry reason they exist has not gone
  away, and they thin to a floor rather than to zero.
*/
export function columnFade(index: number, z: number): number {
  const w = wrap(z);
  if (index % 2 === 1) return 1 - 0.78 * smoothstep(0.35, 0.65, w);
  if (index % 4 === 2) return 1 - 0.55 * smoothstep(0.65, 0.9, w);
  // The survivors dim too. Leaving every fourth column at full strength is what
  // made the closed section read as a few bright scratches laid over a fainter
  // ring pattern rather than as one ruled surface — the rails have to sit at
  // the rings' weight, not above it.
  return 1 - 0.3 * smoothstep(0.4, 0.9, w);
}

/** Rings thin by the same rule, one stage later — they are what reads as speed. */
export function ringFade(index: number, z: number): number {
  if (index % 2 === 1) return 1 - 0.7 * smoothstep(0.45, 0.8, wrap(z));
  if (index % 4 === 2) return 1 - 0.35 * smoothstep(0.7, 0.95, wrap(z));
  return 1 - 0.15 * smoothstep(0.75, 0.98, wrap(z));
}
