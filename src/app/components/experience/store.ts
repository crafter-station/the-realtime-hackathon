/**
 * Shared, render-loop-friendly scroll state.
 *
 * Lenis (in the overlay tree) writes here every frame; the R3F `useFrame` loop
 * (in a sibling tree) reads it. A plain mutable singleton avoids React re-renders
 * on every scroll tick — the canvas reacts through the animation loop instead.
 */

export type Quality = "high" | "lite";

export const scroll = {
  /** Normalized scroll progress across the whole experience, 0..1. */
  progress: 0,
  /** Instantaneous scroll velocity (for reactive warp/shake). */
  velocity: 0,
  /** True once the visitor has clicked ENTER and flown through the portal. */
  entered: false,
  /** Traversal animation 0..1 (portal fly-through), independent of scroll. */
  warp: 0,
  /** Rendering budget chosen by capability detection. */
  quality: "high" as Quality,
  /**
   * `prefers-reduced-motion`, resolved once on mount.
   *
   * Lives here because four separate components were each running their own
   * `matchMedia` call for it — four chances to disagree about one fact, and in
   * practice they already did: the streak field checked the flag, then used it
   * only to zero a velocity term while the full-field hyperspace jump played at
   * full strength anyway.
   */
  reduce: false,
  /**
   * Pointer in normalised device coordinates, -1..1, y up.
   *
   * Tracked from `window` rather than read off r3f's `state.pointer`, because
   * the overlay `<main>` covers the canvas edge to edge — every pointer event
   * lands on a DOM section and the canvas below never hears about it. Anything
   * that wants the cursor has to be told, not ask.
   */
  pointer: { x: 0, y: 0 },
  /**
   * Whether the pointer has ever moved.
   *
   * The default (0, 0) is dead centre of the screen, which is exactly where the
   * portal is — so anything that follows the cursor would dent the subject of
   * the opening frame before the visitor has touched anything.
   */
  pointerMoved: false,
};

export type ScrollState = typeof scroll;

/**
 * The jump to hyperspace, in scroll-progress space rather than world z.
 *
 * The streaks are WebGL and the track cards are DOM, so the one thing that has
 * to agree between them is *scroll position* — tying the effect to progress
 * keeps it in sync with the overlay by construction. These four numbers are
 * section boundaries in `globals.css` divided by the total scrollable height.
 *
 * They are derived, not chosen, and two separate things move them:
 *   - any `.xp-gap--*` / `.xp-count` / `.xp-trackSlot` height in `globals.css`;
 *   - the *number* of `.xp-section`s in `experience.tsx` — adding a track card
 *     adds 100svh to the total and shifts every fraction below.
 * Re-derive them together or the streaks drift out of step with the copy.
 * Camera z is `lerp(TRACK_START, TRACK_END, progress)` in `portal-canvas.tsx`,
 * so these fractions also decide which world event each beat lands on.
 */
const JUMP_IN = 0.158; // "3" — streaks begin stretching
const JUMP_FULL = 0.286; // past "1", fully in hyperspace
const JUMP_HOLD = 0.498; // last track card
const JUMP_OUT = 0.54; // back out, the wire world returns

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * 0 → 1 → 0 across the hyperspace beat.
 *
 * The pure curve, and the thing the four thresholds above are reasoned about.
 * Renderers want `warpRender` instead.
 */
export function warpAmount(progress: number): number {
  return (
    smoothstep(JUMP_IN, JUMP_FULL, progress) *
    (1 - smoothstep(JUMP_HOLD, JUMP_OUT, progress))
  );
}

/**
 * What anything that draws should read.
 *
 * `prefers-reduced-motion` asks for less vestibular motion, not less content —
 * so under it the beat still happens and the copy still lands on it, the
 * streaks just stay short and the world never fully drops away. A full-field
 * radial rush is the single most likely thing on this page to make someone ill,
 * and until now it played at full strength no matter what the visitor asked
 * their operating system for.
 */
export function warpRender(progress: number): number {
  return warpAmount(progress) * (scroll.reduce ? 0.22 : 1);
}
