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
 * Pure data and arithmetic — no React, no three — so `journey.test.ts` can hold
 * it to account.
 *
 * ONE PORTAL, ONE CROSSING
 *
 * This page used to run three travel metaphors at once: a well you fell into, a
 * rocket countdown into hyperspace, and a wormhole into "another dimension". It
 * promised the crossing three times and delivered it twice — the well at the top
 * and the vortex at 65% — so neither one was the crossing.
 *
 * There is now exactly one. The well *is* the portal: you fall through it in the
 * first 240svh, and everything after it is the other side. That is why there is
 * no second curl in here, no vortex, and no countdown to a jump — not because
 * they were badly made, but because a page that crosses twice has not crossed at
 * all.
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
   * Height in `svh`, and the only place it is stated.
   *
   * The overlay applies every one of these — gaps as an exact `height`, beats
   * as `minHeight` so content can grow. `globals.css` no longer declares any of
   * them, which is what stops the budget and the page drifting apart: cutting a
   * number here used to change nothing on screen because CSS was still sizing
   * the element.
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
 * Read it as the storyboard it is: the fall into the well, the crossing itself,
 * five tracks that each demonstrate what they sell, the prize, and then the
 * world settles and the practical questions get answered on still ground.
 */
export const BUDGET: readonly Stretch[] = [
  {
    id: "ride",
    svh: 150,
    note:
      "the approach and the fall. The well is the subject of the opening " +
      "frame and the one shape the page is named after, so it gets the whole " +
      "of this to itself. It ends where the plane has finished closing over " +
      "you — `MOUTH_SHUT`, which the `through` pin holds it to.",
  },
  {
    id: "through",
    svh: 90,
    note:
      "the crossing. Sealed at `MOUTH_SHUT`, open again at `FLARE_END`, and " +
      "the only stretch on the page where the world is closed around you. It " +
      "is deliberately the shortest thing that can read as a passage: a " +
      "portal you are inside of for a long time is a corridor, and a corridor " +
      "is what this page spent 800svh on before the cut.",
  },
  {
    id: "tracksIntro",
    copy: true,
    svh: 60,
    note: "FIVE TRACKS — arrives exactly as the walls let go",
  },
  /*
    85svh each, and the number is load-bearing in a new way.

    These used to be five cards read against a streak field. They are now five
    *places*: `trackBand` turns each of these stretches into a span of camera z,
    and `wire-tracks.tsx` gives each span its own behaviour on the surface. So a
    height here is also the length of a world, and cutting one both shortens the
    card's screen time and compresses the demonstration behind it.

    At this budget each band is about 66 units of z deep, which is a little over
    two fog lengths — enough that a behaviour establishes, holds and hands over
    without the next one already visible through it.
  */
  { id: "track1", copy: true, svh: 85, note: "MULTIPLAYER" },
  { id: "track2", copy: true, svh: 85, note: "LIVE STREAMING" },
  { id: "track3", copy: true, svh: 85, note: "REAL-TIME LOCATION" },
  { id: "track4", copy: true, svh: 85, note: "AI AGENTS" },
  { id: "track5", copy: true, svh: 85, note: "WILD SIGNAL" },
  { id: "prizes", copy: true, svh: 95, note: "PRIZES" },
  {
    id: "brief",
    svh: 30,
    note:
      "the world settles. Pinned to `SETTLE_START`, and it is the whole of " +
      "the second act's announcement: the ground stops rolling and the grid " +
      "stands down across exactly this gap, so the briefing opens on the " +
      "stillest frame of the page. There is no section that says 'you have " +
      "arrived' because the world says it instead.",
  },
  { id: "format", copy: true, svh: 120, note: "THE FORMAT" },
  { id: "schedule", copy: true, svh: 120, note: "SCHEDULE" },
  /*
    The tallest panel, and its height is an allowance rather than a measurement
    — see `heightOf`. Seven FAQ rows need about 810px, which 125svh stopped
    covering below a 650px window; 145 carries them to ~560.
  */
  { id: "questions", copy: true, svh: 145, note: "QUESTIONS" },
  { id: "arrive", svh: 45, note: "open ground before the finale" },
  { id: "finale", copy: true, svh: 100, note: "REGISTER — the second portal" },
];

/**
 * How long the crossing's opening takes, in world units.
 *
 * Re-pinning the ride moves the *end* of this; the run is what gives the
 * stretch its character and is meant to survive. Held as a span rather than
 * re-typed alongside the end, because that is the pair a re-pin is most likely
 * to update by half.
 *
 * 40 units against a 70-unit crossing leaves 30 units — about 39svh — where the
 * section is sealed all the way round. That sealed window is the crossing, and
 * it is the only place on the page where there is no sky.
 */
const FLARE_RUN = 40;

/**
 * Where the world does things, in camera z.
 *
 * The camera runs `TRACK_START` → `TRACK_END` linearly with scroll progress, so
 * every one of these has a scroll fraction — which is what makes them
 * comparable to the budget above.
 *
 * The arithmetic, so the next cut does not have to rediscover it:
 *
 *     Z = TRACK_START - beatFraction(beat) * (TRACK_START - TRACK_END)
 *
 * That is `zAt` below, and every literal in here was solved with it.
 *
 * `TRACK_END` is what absorbed the cut. The budget fell from 2,219svh to 1,280
 * scrollable, and the well's geometry did not shrink with it: the camera still
 * has to cover the 116 units from the rim at 146 down to `MOUTH_SHUT` at 30
 * before the crossing can happen at all. Holding the old 0.52 units-per-svh
 * would have spent 222svh of a 1,280svh page reaching a beat that is supposed
 * to land at 150. So the track lengthened to 990 units instead — the ride is the
 * same duration in scroll and moves faster through it, which is also the right
 * reading of a page that no longer has a corridor to loiter in.
 */
export const Z = {
  TRACK_START: 146,
  TRACK_END: -844,

  WORLD_Z_START: 150,
  WORLD_Z_END: -1000,

  /** Plane dead flat: the field the well sits in. */
  MOUTH_OPEN: 140,
  /**
   * Closed all the way round — you are inside the portal.
   *
   * Held clear of the well's near rim at z 38, which is the one constraint the
   * budget cannot express: the plane cannot finish closing while it still has a
   * funnel sunk into it. `wellCoverage` in `wire-surface.ts` guards the other
   * half of the same fact and `journey.test.ts` guards this one.
   */
  MOUTH_SHUT: 30,
  /** The crossing starts peeling open. */
  FLARE_START: -40 + FLARE_RUN,
  /** Out the other side: open country, and the tracks arrive on it. */
  FLARE_END: -40,

  /**
   * The world stops travelling.
   *
   * Pinned to the `brief` gap. Past here the ground is flat, the grid dims and
   * the signal layer is off — this is the second act, and it is announced by
   * the world going quiet rather than by a section saying so.
   */
  SETTLE_START: -488,
  /**
   * 20 units, and the length is a containment rather than a taste.
   *
   * `brief` is 30svh, which is 23.2 units of z at this track's speed, and the
   * whole point of pinning the settle to that gap is that the world finishes
   * standing down *before* the briefing starts rather than during it. A 32-unit
   * ramp — the first number tried — was still 18% of the way through settling
   * when THE FORMAT opened, so the first practical panel on the page was read
   * over ground that was visibly still rolling. Caught by the test, not by eye.
   */
  SETTLE_END: -508,

  /**
   * The second portal, a short way past the end of the ride.
   *
   * `wire-light.tsx` states the rule this serves: orange is emitted, not
   * painted, and it exists at exactly two places. Those used to be the well's
   * throat and the vortex. The vortex is gone, so the second one is here — you
   * enter through orange light and you leave through orange light, and the
   * thing you leave through is the register button.
   *
   * 34 units past `TRACK_END` rather than on it, so it is still ahead of you
   * when the ride stops. A portal you have already reached is a wall.
   */
  FINALE_PORTAL: -878,
} as const;

export type WorldEvent = keyof typeof Z;

/**
 * The camera's base vertical field, widened on viewports too narrow to frame
 * the well.
 *
 * Three's `fov` is the *vertical* angle, so a portrait phone does not get a
 * shorter version of the same picture — it gets a slot. At 390×844 the aspect is
 * 0.46, which turns 55° vertical into **27° horizontal**, and the opening frame
 * collapses: the camera stands 46 units from a well of radius 62, so through a
 * 27° window you are inside the funnel's own footprint, looking at bare rings
 * with the lit throat outside the frame entirely. The single best image on the
 * page was the one no phone ever saw.
 *
 * DIAGNOSED, NOT GUESSED
 *
 * The `lite` tier was the obvious suspect and it is innocent. At 819px wide the
 * well renders in full, glow and all — and 819 is *below* the 820px threshold in
 * `detectQuality`, so it was already on the `lite` path. 390px wide at aspect
 * 0.93 renders correctly too. Width and quality both ruled out; aspect left.
 *
 * Matching the desktop horizontal field outright would take 122° vertical, which
 * is a fisheye and would bow the straight lines the whole style is made of. So
 * this widens toward it and stops. `MAX_FOV` buys back 41° horizontal — half
 * again what the phone had — enough to hold the rim and the throat together.
 *
 * `WIDE_ENOUGH` is 0.95 rather than 1 because the 819×844 frame at aspect 0.97
 * is known-good at 55°: the correction should reach real portrait phones and
 * leave every viewport that already works alone.
 */
export const BASE_FOV = 55;
const WIDE_ENOUGH = 0.95;
const MAX_FOV = 78;

/**
 * `base` is a parameter so the gate can use the same correction.
 *
 * It was hardcoded to `BASE_FOV` while there was one camera on the site. The
 * gate added a second, framing the hand at 45°, and a hardcoded 45 on a portrait
 * phone is 22° across — the identical failure this function was written for,
 * reintroduced two files away from the essay explaining it. Defaulted, so every
 * existing call and every existing test means what it did before.
 */
export function framingFov(aspect: number, base = BASE_FOV): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return base;
  if (aspect >= WIDE_ENOUGH) return base;
  return Math.min(MAX_FOV, base * (WIDE_ENOUGH / aspect));
}

/**
 * Which beat is choreographed against which moment in the world.
 *
 * This table is the specification of correctness for any pacing change: cut a
 * gap, and these are what must still hold. Tolerances are per-pin because the
 * beats differ in what "landing on" means.
 *
 * There are three now rather than six, and that is the point rather than a
 * regression. Five of the old six pinned copy to a transition — the corridor
 * closing, the tube wrapping, the vortex arriving, the tube opening — and those
 * transitions were the confusion. What is left pins the only three moments the
 * page still claims: you go in, you come out, and the world stops.
 */
export const BEAT_PINS: readonly {
  beat: string;
  event: WorldEvent;
  tolerance: number;
  why: string;
}[] = [
  {
    beat: "through",
    event: "MOUTH_SHUT",
    tolerance: 0.03,
    why: "the walls meet overhead exactly as the crossing stretch begins",
  },
  {
    beat: "tracksIntro",
    event: "FLARE_END",
    tolerance: 0.03,
    why: "you are through, and the tracks are the first thing on the far side",
  },
  {
    beat: "brief",
    event: "SETTLE_START",
    tolerance: 0.02,
    why: "the world goes still as the practical questions begin",
  },
];

/**
 * Copy-bearing stretches deliberately not tied to a world event.
 *
 * A waiver rather than an omission. The five tracks are unpinned because they
 * are not choreographed *against* the world any more — `trackBand` derives their
 * z spans from these very stretches, so pinning them would be pinning them to
 * themselves. The rest sit on settled ground where there is nothing left to land
 * on. Naming them here is what lets the pinning test treat every *other*
 * unpinned section as a mistake.
 */
export const UNPINNED = new Set([
  "track1",
  "track2",
  "track3",
  "track4",
  "track5",
  "prizes",
  "format",
  "schedule",
  "questions",
  "finale",
]);

export function totalSvh(): number {
  return BUDGET.reduce((a, s) => a + s.svh, 0);
}

/**
 * The same total under the reduced-motion collapse.
 *
 * Only the reserved height — the copy and `.xp-section`'s padding still size the
 * document below it, which is why this is ~100 and the page is a few thousand
 * pixels. Exists so a test can state "the collapse left exactly the hero's
 * screen and nothing else" without re-walking `BUDGET` at the call site.
 */
export function reducedTotalSvh(): number {
  return BUDGET.reduce((a, s) => a + reducedSvh(s.id), 0);
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

/**
 * The height of a named stretch, in `svh`. The caller writes the unit.
 *
 * The briefing panels are the one place the budget cannot fully dictate the
 * page: their height is content-driven, and at a short viewport the FAQ's rows
 * exceed a single screen. They are given headroom rather than a fixed height, so
 * the budget predicts the page down to roughly a 440px-tall window and content
 * growth takes over below that. Every other stretch is exact.
 */
export function heightOf(id: string): number {
  const s = BUDGET.find((x) => x.id === id);
  if (!s) throw new Error(`journey: no stretch named "${id}"`);
  return s.svh;
}

/**
 * The same ride for someone who asked for less motion.
 *
 * The camera already holds station under `scroll.reduce` — `Rig` parks it at
 * `POSTER_Z` and the world stops travelling. What did not change was the
 * *distance*: thousands of pixels of scrolling, now past a still frame, to reach
 * about two thousand characters of text. Honouring the request for the
 * transitions and ignoring it for the journey is honouring the smaller half.
 *
 * Everything collapses to zero, which is not the same as everything vanishing.
 * The gaps are pure travel and have nothing to say, so they go entirely. The
 * beats keep every word and simply stop reserving a viewport each — `min-height`
 * of zero lets each one size to its own content, and `.xp-section`'s padding
 * still separates them. The ride becomes the document it always had underneath.
 *
 * EVERYTHING EXCEPT `ride`, AND THAT EXCEPTION IS A BUG FIX
 *
 * Collapsing *all* of it, `ride` included, started the document at scroll 0 —
 * underneath a hero that is `position: fixed` and covers the whole viewport.
 * `.xp-heroLayer` is not in the flow and never was, so it cannot be pushed down
 * by content; it fades on scroll progress instead, over 0.02 → 0.09. The result
 * was that the first screen of a reduced-motion visit showed the hero and the
 * first beat stacked on top of each other.
 *
 * So `ride` keeps one viewport. It is the only stretch whose height is doing a
 * second job: out in the full ride it is travel, and here it is the room the
 * fixed hero stands in.
 */
export function reducedSvh(id: string): number {
  const s = BUDGET.find((x) => x.id === id);
  if (!s) throw new Error(`journey: no stretch named "${id}"`);
  return s.id === "ride" ? 100 : 0;
}

/** Camera z at a given scroll fraction. The one conversion between the units. */
export function zAt(fraction: number): number {
  return Z.TRACK_START - fraction * (Z.TRACK_START - Z.TRACK_END);
}

/** Where a world event happens, as a fraction of the scrollable height. */
export function worldFraction(event: WorldEvent): number {
  return (Z.TRACK_START - Z[event]) / (Z.TRACK_START - Z.TRACK_END);
}

/**
 * The span of camera z a track occupies, derived from its own stretch.
 *
 * This is the load-bearing join between the overlay and the signal layer. A
 * track card is DOM and its demonstration is WebGL, and the only thing they can
 * both be sure of is scroll position — so rather than tuning a second set of z
 * literals to line up with the cards, the world reads the cards' own budget.
 * Move a track's `svh` and its band moves with it, by construction.
 *
 * `i` is 1-based, matching the `track1`..`track5` ids and the `[01]`..`[05]`
 * numerals on the cards.
 */
/*
  Memoised because the signal layer asks for this once per mote per frame.

  `beatFraction` and `beatEnd` each walk `BUDGET`, so 2,600 motes at 60fps was
  ~78,000 array steps a frame to re-derive fifteen numbers that cannot change:
  `BUDGET` is a module constant. Measured at ~0.8ms/frame before the cache, which
  is 5% of the budget spent on arithmetic with a constant answer.
*/
const bandCache = new Map<number, { from: number; to: number }>();

export function trackBand(i: number): { from: number; to: number } {
  const hit = bandCache.get(i);
  if (hit) return hit;
  const band = {
    from: zAt(beatFraction(`track${i}`)),
    to: zAt(beatEnd(`track${i}`)),
  };
  bandCache.set(i, band);
  return band;
}

/** How many tracks the world has to draw. Derived, so adding one is one edit. */
export function trackCount(): number {
  return BUDGET.filter((s) => /^track\d+$/.test(s.id)).length;
}

/**
 * The stretch across which the five cards hold the screen.
 *
 * Exists so the world knows when the tracks are the subject. The tracks are the
 * page's most important content and were once its least legible — 520 streaks at
 * full brightness behind 15px of letterspaced mono. The streaks are gone, and
 * what replaced them answers to this window instead: the signal layer is *only*
 * alive here, and it is drawn on the surface rather than between the reader and
 * the words.
 */
export function cardWindow() {
  return { from: beatFraction("track1"), to: beatEnd("track5") };
}
