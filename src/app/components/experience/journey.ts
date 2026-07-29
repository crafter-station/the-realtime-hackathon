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
  /**
   * Height in `svh`.
   *
   * The overlay applies this for the gaps and the briefing panels. The
   * fixed-height beats — sections, numerals, track slots — are still sized by
   * `globals.css` at one screen each, and the budget states the same number so
   * the arithmetic is right. That is a duplication, and #17 is where it goes.
   */
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

  /** The far mouth: the tube begins to open again. */
  EXIT_START: -740,
  /** Out the other side, flat country. */
  EXIT_OPEN: -800,

  /** The tube sits on the wormhole's axis here, and the vortex takes over. */
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

/**
 * Copy-bearing stretches deliberately not tied to a world event.
 *
 * A waiver rather than an omission: the countdown numerals and the track cards
 * ride the hyperspace beat, which is derived from the budget itself, so pinning
 * them to a z event would be pinning them to themselves. Naming them here is
 * what lets the pinning test treat every *other* unpinned section as a mistake.
 */
export const UNPINNED = new Set([
  "count3",
  "count2",
  "count1",
  "track1",
  "track2",
  "track3",
  "track4",
  "track5",
  "prizes",
  "schedule",
  "questions",
  "finale",
]);

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

/** Where a stretch finishes, as a fraction of the scrollable height. */
export function beatEnd(id: string): number {
  let top = 0;
  for (const s of BUDGET) {
    top += s.svh;
    if (s.id === id) return top / maxScrollSvh();
  }
  throw new Error(`journey: no stretch named "${id}"`);
}

/** The height of a named stretch, in `svh`. The caller writes the unit. */
/**
 * The briefing panels are the one place the budget cannot fully dictate the
 * page: their height is content-driven, and at a short viewport the FAQ's five
 * rows exceed a single screen — measured at 114svh in a 480px window against an
 * allowance of 100. They are given headroom rather than a fixed height, so the
 * budget predicts the page down to roughly a 440px-tall window and content
 * growth takes over below that. Every other stretch is exact.
 */
export function heightOf(id: string): number {
  const s = BUDGET.find((x) => x.id === id);
  if (!s) throw new Error(`journey: no stretch named "${id}"`);
  return s.svh;
}

/** Where a world event happens, as a fraction of the scrollable height. */
export function worldFraction(event: WorldEvent): number {
  return (Z.TRACK_START - Z[event]) / (Z.TRACK_START - Z.TRACK_END);
}

/**
 * The hyperspace beat, anchored to the sections it belongs to.
 *
 * These were literal decimals, then briefly multipliers tuned to reproduce
 * those decimals — which reproduced nothing the moment the total changed. That
 * is the same silent drift this module exists to stop, so they are now stated
 * as the boundaries they actually mean: the streaks start once "3" is on
 * screen, reach full stretch as the tracks are introduced, hold while the last
 * card is up, and are gone by the time PRIZES has had the frame to itself.
 */
export function warpWindow() {
  return {
    /** "3" is up and the streaks begin to stretch. */
    in: beatEnd("count3"),
    /** Fully in hyperspace as the tracks are introduced. */
    full: beatEnd("tracksIntro"),
    /** Held until the last card has had its screen. */
    hold: beatEnd("track5"),
    /** Out again once PRIZES owns the frame. */
    out: beatEnd("prizes"),
  };
}
