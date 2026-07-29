/**
 * Where the surface is.
 *
 * ONE surface carries the whole journey. It starts as a field of grid with a
 * gravity well sunk into it and stars overhead. Scroll, and the plane curls up
 * around you: the ground drops away, the edges climb, and by the time they meet
 * overhead you are inside a rectangular corridor. The corridor peels back open
 * into rolling country, runs a long way, then curls a second time — this time
 * into a circle — and hands that closed tube to the wormhole.
 *
 * There is no separate floor, no walls object, no ceiling object. A cross
 * section is described by two numbers at each depth: how closed it is (`wrap`)
 * and how square it is (`rectness`). Every vertex in the world — grid, well,
 * particles — goes through `surfacePoint`, so nothing can drift out of register
 * with anything else.
 *
 * The two curls are deliberate mirrors: swallowed at the start (the ground
 * gives way beneath you), enclosed at the end (the ground wraps around you).
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

/** The field the well is sunk into sits out here, ahead of the corridor mouth. */
export const WORLD_Z_START = Z.WORLD_Z_START;
export const WORLD_Z_END = Z.WORLD_Z_END;

// Wormhole stretch — the spiralling vortex the closed tube empties into.
export const WORM_Z_IN = Z.WORM_Z_IN;
export const WORM_Z_FULL = Z.WORM_Z_FULL;
export const WORM_Z_START = Z.WORM_Z_IN;
export const WORM_Z_END = Z.WORM_Z_END;
export const WORM_THROAT = 1.4;

// ---------------------------------------------------------------------------
// Cross-section
// ---------------------------------------------------------------------------

export const HW = 13; // corridor half width
export const WALL_H = 16.4; // corridor floor → ceiling
export const FLOOR_Y = -2.8;
export const EYE_OPEN = 2.8; // eye height over open ground

const RECT_A = HW; // 13
const RECT_B = WALL_H / 2; // 8.2

/**
 * The grid's width IS the corridor's perimeter. That is the whole trick: the
 * plane can roll into the room without a single vertex stretching, and into the
 * circle for the same reason, because a 26 x 16.4 rectangle and a circle of
 * radius 13.4937 both measure 84.8 around. Change STEP_X or FLOOR_COLS and this
 * stops being true — the seam along the top of the corridor will split open and
 * you will see it. `wire-surface.test.ts` guards the identity.
 */
export const STEP_X = 2.65;
export const STEP_Z = 2.65;
export const FLOOR_COLS = 32;
export const FLOOR_HW = (FLOOR_COLS / 2) * STEP_X; // 42.4
export const PERIMETER = FLOOR_COLS * STEP_X; // 84.8 = 2 * (2*HW + WALL_H)

/** Radius of the closed circular tube. Same perimeter, so nothing stretches. */
export const WORM_RADIUS = PERIMETER / (2 * Math.PI); // ≈ 13.4937

// ---------------------------------------------------------------------------
// Where each stretch happens, in world z
// ---------------------------------------------------------------------------

const MOUTH_OPEN = Z.MOUTH_OPEN; // plane dead flat: the field the well sits in
const MOUTH_SHUT = Z.MOUTH_SHUT; // closed into the corridor section
const FLARE_START = Z.FLARE_START; // corridor starts peeling open
const FLARE_END = Z.FLARE_END; // fully open country
const CONE_START = Z.CONE_START; // the plane starts curling a second time
const CONE_WRAPPED = Z.CONE_WRAPPED; // closed into a circular tube
const CONE_JOIN = Z.WORM_Z_IN; // tube sits on the wormhole's axis (= WORM_Z_IN)
const EXIT_START = Z.EXIT_START; // the far mouth: the tube begins to open again
const EXIT_OPEN = Z.EXIT_OPEN; // out the other side, flat country

/**
 * Coming out the far side of the wormhole.
 *
 * The reason this exists: a portal is only legible if there is something on the
 * other side of it, and until now there was not. The camera's track ended at
 * z = -662 — past `WORM_Z_FULL` and short of `WORM_Z_END` — so the page ran out
 * while you were still inside the vortex. Two portals, no arrival, and the
 * opening well and the closing wormhole read as the same gesture twice.
 *
 * So the tube opens again. This is what makes the second portal a *passage*
 * rather than a second destination, and it is the only difference between a
 * journey and a loop.
 */
export function emergence(z: number): number {
  return smoothstep(EXIT_START, EXIT_OPEN, z);
}

/** 0 = flat plane, 1 = closed all the way round. */
export function wrap(z: number): number {
  const opening =
    smoothstep(MOUTH_OPEN, MOUTH_SHUT, z) *
    (1 - smoothstep(FLARE_START, FLARE_END, z));
  const closing = smoothstep(CONE_START, CONE_WRAPPED, z) * (1 - emergence(z));
  return Math.max(opening, closing);
}

/**
 * How square the closed section is. The opening curl squares off into a room —
 * that is the poster geometry, walls and ceiling and floor. The closing curl
 * stays round, because it has to hand a circle to the vortex.
 */
export function rectness(z: number): number {
  return 1 - smoothstep(-200, -300, z);
}

/**
 * A rectangle has no half-folded form, so it is blended in late, over the last
 * of the curl — until then the section is a circular arc opening out to flat.
 */
export function rectAmount(z: number): number {
  return rectness(z) * smoothstep(0.55, 1, wrap(z));
}

/**
 * Undulations only live on the open stretch — the ground is flat while wrapped
 * at either end. Rolling hills wrapped around you read as a dented pipe, not as
 * country.
 */
export function waveWindow(z: number): number {
  return smoothstep(-132, -160, z) * (1 - smoothstep(-400, -430, z));
}

// ---------------------------------------------------------------------------
// The well
// ---------------------------------------------------------------------------

/**
 * The opening portal: a gravity well sunk into the flat field.
 *
 * This is the first thing anyone sees, and it is the one shape the whole page
 * is named after — so it is the subject of the frame, dead centre, with the
 * copy pushed off to one side rather than sitting on top of it.
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
 * Which of the two grids owns a point on the surface.
 *
 * 1 = the polar mesh draws it, 0 = the Cartesian one does. They read this same
 * function of the same point and take complementary halves, so between them
 * every point is drawn exactly once.
 *
 * It has to take x as well as z, and that is the whole reason it exists.
 * A depth-only predicate is fine for a grid made of
 * rows and columns and wrong for one made of rings: a ring of radius 170 passes
 * through z ≈ WELL_Z out at the frame edges, where depth-only says "the well
 * owns 63% of this" and the Cartesian grid happily draws the other 37% straight
 * across it. Two topologies at partial strength do not blend — they cross, and
 * you can see every crossing.
 *
 * The band is narrow and sits out where the polar mesh has already faded with
 * radius, so the handover happens between two things that are both nearly gone.
 */
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
 * and the curl runs 140..6 — they overlap by construction, and the camera looks
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
  return inside * flat;
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
  const r = WORM_RADIUS / w;
  const theta = s / r;
  return [Math.sin(theta) * r, (1 - Math.cos(theta)) * r];
}

/** The same arc length walked around the corridor's rectangle. */
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
 */
export function closedAxisHeight(z: number): number {
  return lerp(WORM_RADIUS, RECT_B, rectness(z));
}

/**
 * Vertical shift of the whole cross-section.
 *
 * The wormhole is centred on y = 0, so the finished tube has to slide onto that
 * axis before the vortex takes over — otherwise the ride arrives at the black
 * hole ten units above its mouth and the whole thing hangs off-centre. Applies
 * only once the tube is closed, so it can move the surface bodily without
 * distorting it.
 */
export function railShift(z: number): number {
  // Unwound on the way out, or the arrival plain would still be hanging on the
  // wormhole's axis with the ground nowhere near the camera.
  const g = smoothstep(CONE_WRAPPED, CONE_JOIN, z) * (1 - emergence(z));
  if (g < 1e-4) return 0;
  return -(floorY(0, z) + closedAxisHeight(z)) * g;
}

/**
 * The one place world geometry is decided. Grid, title and particles all call
 * this, which is why they can never disagree about where the surface is.
 */
export function surfacePoint(x: number, z: number): readonly [number, number] {
  const w = wrap(z);
  const base = floorY(x, z);
  if (w < 1e-4) return [x, base];
  const shift = railShift(z);
  const rect = rectAmount(z);
  const [cx, cy] = circleOffset(x, w);
  if (rect < 1e-4) return [cx, base + cy + shift];
  const [rx, ry] = rectOffset(x);
  return [lerp(cx, rx, rect), base + lerp(cy, ry, rect) + shift];
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
  const onAxis = floorY(0, z) + closedAxisHeight(z);
  return lerp(open, onAxis, smoothstep(0.2, 0.9, w)) + railShift(z);
}

/**
 * How boxed-in the camera feels. Drives the starfield: the sky is gone inside
 * the corridor and comes back progressively as the room peels open.
 */
export function enclosure(z: number): number {
  return wrap(z) * rectness(z);
}

/** 0 → 1 as the closed tube hands over to the spiralling wormhole. */
export function wormholePresence(z: number): number {
  return smoothstep(WORM_Z_IN, WORM_Z_FULL, z) * (1 - emergence(z));
}

/** The grid gives way to the vortex, which by then occupies the same surface. */
export function surfaceVisibility(z: number): number {
  return 1 - wormholePresence(z);
}

// ---------------------------------------------------------------------------
// Density
// ---------------------------------------------------------------------------

/**
 * Apparent density, not world density.
 *
 * Lines are spread evenly across the *flat* plane, but the plane spends half
 * the journey curled up. Curled, columns crowd toward the silhouette edges and
 * cross the rings at grazing angles — which is what turned the ride into a
 * cobweb of moiré.
 *
 * So they thin out as the section closes, by *fading* rather than deleting:
 * geometry stays baked and static, and a column dimming away over twenty units
 * reads as depth instead of as a line being switched off. Odd columns go first,
 * then every other survivor, so the spacing stays even at each stage instead of
 * clumping on one side.
 */
export function columnFade(index: number, z: number): number {
  const w = wrap(z);
  if (index % 2 === 1) return 1 - smoothstep(0.45, 0.75, w);
  if (index % 4 === 2) return 1 - smoothstep(0.8, 0.98, w);
  // The survivors dim too. Thinning three columns in four and leaving the
  // fourth at full strength is what made the closed corridor read as a few
  // bright scratches laid over a dense ring pattern rather than as one ruled
  // surface — the rails have to sit at the rings' weight, not above it.
  return 1 - 0.45 * smoothstep(0.5, 0.95, w);
}

/** Rings thin by the same rule, one stage later — they are what reads as speed. */
export function ringFade(index: number, z: number): number {
  if (index % 2 === 1) return 1 - smoothstep(0.6, 0.9, wrap(z));
  return 1;
}
