/**
 * Shared, render-loop-friendly scroll state.
 *
 * Lenis (in the overlay tree) writes here every frame; the R3F `useFrame` loop
 * (in a sibling tree) reads it. A plain mutable singleton avoids React re-renders
 * on every scroll tick — the canvas reacts through the animation loop instead.
 *
 * WHAT LEFT
 *
 * `warpAmount` / `warpRender` / `streakDim` and the four thresholds behind them
 * were the hyperspace beat: a 520-streak field that played across the countdown
 * and the five track cards. The beat is gone with the rocket-launch metaphor —
 * see the header of `journey.ts` — and so is the awkward part of this module,
 * which was that scroll progress had to be translated into an effect envelope
 * here while the geometry it was supposed to agree with lived two files away.
 *
 * Nothing derived lives here now. Where the world does things is `journey.ts`,
 * how the surface responds is `wire-surface.ts`, and this is just the frame's
 * shared facts.
 */

export type Quality = "high" | "lite";

export const scroll = {
  /** Normalized scroll progress across the whole experience, 0..1. */
  progress: 0,
  /** Instantaneous scroll velocity (drives grid brightness and the FOV kick). */
  velocity: 0,
  /** Rendering budget chosen by capability detection. */
  quality: "high" as Quality,
  /**
   * `prefers-reduced-motion`, resolved once on mount.
   *
   * Lives here because four separate components were each running their own
   * `matchMedia` call for it — four chances to disagree about one fact, and in
   * practice they already did.
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
