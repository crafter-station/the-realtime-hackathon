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
};

export type ScrollState = typeof scroll;
