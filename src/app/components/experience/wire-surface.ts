/**
 * Where the surface is.
 *
 * ONE surface carries the whole journey. It starts flat — a field of grid with
 * the title lying on it and stars overhead. Scroll, and the plane curls up
 * around you: the ground drops away, the edges climb, and by the time they meet
 * overhead you are inside a rectangular corridor. The corridor peels back open
 * into rolling country, runs a long way, then curls a second time — this time
 * into a circle — and hands that closed tube to the wormhole.
 *
 * There is no separate floor, no walls object, no ceiling object. A cross
 * section is described by two numbers at each depth: how closed it is (`wrap`)
 * and how square it is (`rectness`). Every vertex in the world — grid, title,
 * particles — goes through `surfacePoint`, so nothing can drift out of register
 * with anything else.
 *
 * The two curls are deliberate mirrors: swallowed at the start (the ground
 * gives way beneath you), enclosed at the end (the ground wraps around you).
 *
 * Pure maths, no React and no three — so the geometry can be checked by a test
 * rather than by squinting at a canvas. `wire-world.tsx` draws what this says.
 */

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

/** The flat title field sits out here, ahead of the corridor mouth. */
export const WORLD_Z_START = 150;
export const WORLD_Z_END = -600;

// Wormhole stretch — the spiralling vortex the closed tube empties into.
export const WORM_Z_IN = -580;
export const WORM_Z_FULL = -620;
export const WORM_Z_START = -580;
export const WORM_Z_END = -760;
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

const MOUTH_OPEN = 140; // plane dead flat: the title field
const MOUTH_SHUT = 6; // closed into the corridor section
const FLARE_START = -70; // corridor starts peeling open
const FLARE_END = -132; // fully open country
const CONE_START = -430; // the plane starts curling a second time
const CONE_WRAPPED = -520; // closed into a circular tube
const CONE_JOIN = -580; // tube sits on the wormhole's axis (= WORM_Z_IN)

/** 0 = flat plane, 1 = closed all the way round. */
export function wrap(z: number): number {
  const opening =
    smoothstep(MOUTH_OPEN, MOUTH_SHUT, z) *
    (1 - smoothstep(FLARE_START, FLARE_END, z));
  const closing = smoothstep(CONE_START, CONE_WRAPPED, z);
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

/** Rolling ground height. This is what makes the ride rise and fall. */
export function floorY(x: number, z: number): number {
  const wave =
    Math.sin(z * 0.075) * 2.6 + Math.sin(z * 0.029 + x * 0.045) * 1.25;
  return FLOOR_Y + wave * waveWindow(z);
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
  const g = smoothstep(CONE_WRAPPED, CONE_JOIN, z);
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
  return smoothstep(WORM_Z_IN, WORM_Z_FULL, z);
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
  return 1;
}

/** Rings thin by the same rule, one stage later — they are what reads as speed. */
export function ringFade(index: number, z: number): number {
  if (index % 2 === 1) return 1 - smoothstep(0.6, 0.9, wrap(z));
  return 1;
}
