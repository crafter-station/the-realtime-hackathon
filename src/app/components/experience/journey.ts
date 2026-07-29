/**
 * The shape of the ride.
 *
 * One module owns the two halves that have to agree: how much scroll each
 * stretch of the page gets, and where the world's geometry does its things
 * along the camera's track. Both are here because the whole difficulty of this
 * page is that they are computed from different units — `svh` in the overlay,
 * `z` in the world — and nothing but their agreement makes a beat land on the
 * moment it was written for.
 *
 * Before this, the budget lived in `globals.css`, the `z` events in
 * `wire-surface.ts` and the hyperspace thresholds in `store.ts`. A unit test
 * cannot read a stylesheet, so nothing checked the three against each other.
 * Four pacing changes on this branch each re-derived the fractions by hand and
 * confirmed them with screenshots; one shipped a beat firing 78 units of z
 * before its event anyway.
 *
 * Pure data and arithmetic — no React, no three — so `journey.test.ts` can hold
 * it to account.
 */

/**
 * A stretch of the ride.
 *
 * Gaps need identity as much as beats do — they are what a pacing change
 * actually edits, and a height you cannot name is a height you cannot move
 * deliberately.
 */
export type Stretch = {
  /** Unique; the overlay looks its height up by this. */
  id: string;
  /** Height in `svh`. The overlay applies this; CSS no longer states it. */
  svh: number;
  /** True when the stretch carries copy — the rest is travel. */
  copy?: true;
  /** What it is, for anyone reading the budget rather than the page. */
  note: string;
};

/**
 * The ride, in order, top to bottom.
 *
 * Read it as the storyboard it is: the long fall into the well, the corridor
 * closing, a countdown, the jump, five tracks in the streaks, the prize, the
 * second curl, the countdown to kickoff, the vortex, coming out the far side,
 * and then the practical questions before the register.
 */
export const BUDGET: readonly Stretch[] = [
  {
    id: "ride",
    svh: 331,
    note: "the well, and the plane curling up into the corridor",
  },
  {
    id: "holdOn",
    copy: true,
    svh: 100,
    note: "HOLD ON — inside the closed corridor",
  },
  { id: "count3", copy: true, svh: 100, note: "3" },
  { id: "count2", copy: true, svh: 100, note: "2" },
  { id: "count1", copy: true, svh: 100, note: "1" },
  { id: "jump", svh: 60, note: "the punch — streaks at full stretch, no copy" },
  { id: "tracksIntro", copy: true, svh: 100, note: "FIVE TRACKS" },
  { id: "track1", copy: true, svh: 100, note: "MULTIPLAYER" },
  { id: "track2", copy: true, svh: 100, note: "LIVE STREAMING" },
  { id: "track3", copy: true, svh: 100, note: "REAL-TIME LOCATION" },
  { id: "track4", copy: true, svh: 100, note: "AI AGENTS" },
  { id: "track5", copy: true, svh: 100, note: "WILD SIGNAL" },
  { id: "jumpOut", svh: 100, note: "dropping back out of hyperspace" },
  { id: "prizes", copy: true, svh: 100, note: "PRIZES" },
  { id: "tunnel", svh: 248, note: "the second curl, into the closed tube" },
  { id: "kickoff", copy: true, svh: 100, note: "KICKOFF — the live countdown" },
  { id: "wormhole", svh: 228, note: "falling down the wormhole's throat" },
  {
    id: "anotherDimension",
    copy: true,
    svh: 100,
    note: "ANOTHER DIMENSION — the vortex",
  },
  { id: "emerge", svh: 200, note: "still falling, before the far mouth opens" },
  {
    id: "otherSide",
    copy: true,
    svh: 100,
    note: "THE OTHER SIDE — the walls let go",
  },
  { id: "brief", svh: 70, note: "a breath before the practical questions" },
  { id: "format", copy: true, svh: 125, note: "THE FORMAT" },
  { id: "schedule", copy: true, svh: 125, note: "SCHEDULE" },
  { id: "questions", copy: true, svh: 125, note: "QUESTIONS" },
  { id: "arrive", svh: 120, note: "open ground before the finale" },
  { id: "finale", copy: true, svh: 100, note: "REGISTER" },
];

/**
 * Where the world does things, in camera z.
 *
 * The camera runs `TRACK_START` → `TRACK_END` linearly with scroll progress, so
 * every one of these has a scroll fraction — which is what makes them
 * comparable to the budget above.
 */
export const Z = {
  TRACK_START: 146,
  TRACK_END: -960,

  WORLD_Z_START: 150,
  WORLD_Z_END: -1140,

  /** Plane dead flat: the field the well sits in. */
  MOUTH_OPEN: 140,
  /** Closed into the corridor section. */
  MOUTH_SHUT: 6,
  /** Corridor starts peeling open. */
  FLARE_START: -70,
  /** Fully open country. */
  FLARE_END: -132,
  /** The plane starts curling a second time. */
  CONE_START: -430,
  /** Closed into a circular tube. */
  CONE_WRAPPED: -520,
  /** Tube sits on the wormhole's axis. */
  CONE_JOIN: -580,
  /** The far mouth: the tube begins to open again. */
  EXIT_START: -740,
  /** Out the other side, flat country. */
  EXIT_OPEN: -800,

  WORM_Z_IN: -580,
  WORM_Z_FULL: -620,
  WORM_Z_END: -760,
} as const;

export type WorldEvent = keyof typeof Z;

/**
 * Which beat is choreographed against which moment in the world.
 *
 * This table is the specification of correctness for any pacing change: cut a
 * gap, and these are what must still hold. Tolerances are per-pin because the
 * beats differ in what "landing on" means — KICKOFF is meant to arrive exactly
 * as the tube finishes closing, while HOLD ON only has to be inside the
 * corridor somewhere.
 */
export const BEAT_PINS: readonly {
  beat: string;
  event: WorldEvent;
  tolerance: number;
  why: string;
}[] = [
  {
    beat: "holdOn",
    event: "MOUTH_SHUT",
    tolerance: 0.05,
    why: "'about to enter another dimension' while the walls close around you",
  },
  {
    beat: "tracksIntro",
    event: "FLARE_END",
    tolerance: 0.04,
    why: "the tracks arrive as the corridor opens out into country",
  },
  {
    beat: "kickoff",
    event: "CONE_WRAPPED",
    tolerance: 0.03,
    why: "the countdown lands exactly as the tube finishes closing",
  },
  {
    beat: "anotherDimension",
    event: "WORM_Z_FULL",
    tolerance: 0.04,
    why: "the vortex beat plays once the vortex is actually there",
  },
  {
    beat: "otherSide",
    event: "EXIT_START",
    tolerance: 0.03,
    why: "'you're through' at the moment the walls let go — the whole point",
  },
  {
    beat: "format",
    event: "EXIT_OPEN",
    tolerance: 0.04,
    why: "the briefing reads on open ground, not mid-emergence",
  },
];

export function totalSvh(): number {
  return BUDGET.reduce((a, s) => a + s.svh, 0);
}

/**
 * Progress reaches 1 when the finale's top reaches the top of the window, not
 * when the document ends — so the last screen is not scrollable distance.
 */
export function maxScrollSvh(): number {
  return totalSvh() - 100;
}

/** Where a beat begins, as a fraction of the scrollable height. */
export function beatFraction(beat: string): number {
  let top = 0;
  for (const s of BUDGET) {
    if (s.id === beat) return top / maxScrollSvh();
    top += s.svh;
  }
  throw new Error(`journey: no stretch named "${beat}"`);
}

/** The height of a named stretch, as a CSS length the overlay can apply. */
/**
 * The briefing panels are the one place the budget cannot fully dictate the
 * page: their height is content-driven, and at a short viewport the FAQ's five
 * rows exceed a single screen — measured at 114svh in a 480px window against an
 * allowance of 100. They are given headroom rather than a fixed height, so the
 * budget predicts the page down to roughly a 440px-tall window and content
 * growth takes over below that. Every other stretch is exact.
 */
export function heightOf(id: string): string {
  const s = BUDGET.find((x) => x.id === id);
  if (!s) throw new Error(`journey: no stretch named "${id}"`);
  return `${s.svh}svh`;
}

/** Where a world event happens, as a fraction of the scrollable height. */
export function worldFraction(event: WorldEvent): number {
  return (Z.TRACK_START - Z[event]) / (Z.TRACK_START - Z.TRACK_END);
}

/**
 * The hyperspace beat, derived rather than hand-tuned.
 *
 * These four used to be literal decimals that had to be re-typed whenever a
 * section moved — the failure being silent, since the streaks and the copy
 * would simply drift apart. Anchored to the countdown and the track cards
 * instead, they follow the budget on their own.
 */
export function warpWindow() {
  const gap = 100 / maxScrollSvh(); // one section, as a fraction
  return {
    /** "3" — streaks begin stretching, just after the numeral lands. */
    in: beatFraction("count3") + gap * 0.245,
    /** Past "1", fully in hyperspace by the time the tracks are introduced. */
    full: beatFraction("tracksIntro") + gap * 0.373,
    /** Held through the last track card, then released. */
    hold: beatFraction("track5") + gap * 1.425,
    /** Back out mid-PRIZES; the wire world returns under the copy. */
    out: beatFraction("prizes") + gap * 0.682,
  };
}
