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

/**
 * The jump to hyperspace, in scroll-progress space rather than world z.
 *
 * The streaks are WebGL and the track cards are DOM, so the one thing that has
 * to agree between them is *scroll position* — tying the effect to progress
 * keeps it in sync with the overlay by construction. These four numbers are the
 * section boundaries in `globals.css` divided by the total scrollable height;
 * if the `--jump` / `--cards` gaps change, change these with them.
 */
const JUMP_IN = 0.193; // "3" — streaks begin stretching
const JUMP_FULL = 0.373; // past "1", fully in hyperspace
const JUMP_HOLD = 0.626; // last track card
const JUMP_OUT = 0.686; // back out, the wire world returns

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** 0 → 1 → 0 across the hyperspace beat. */
export function warpAmount(progress: number): number {
  return (
    smoothstep(JUMP_IN, JUMP_FULL, progress) *
    (1 - smoothstep(JUMP_HOLD, JUMP_OUT, progress))
  );
}
