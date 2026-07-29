import { describe, expect, test } from "bun:test";
import {
  BEAT_PINS,
  BUDGET,
  beatFraction,
  heightOf,
  maxScrollSvh,
  reducedSvh,
  totalSvh,
  UNPINNED,
  warpWindow,
  worldFraction,
  Z,
} from "./journey";

/**
 * The ride's shape lived in three files that had to agree and could not be
 * checked together: the scroll budget in `globals.css` as `svh`, the world's
 * geometry events in `wire-surface.ts` as `z`, and the hyperspace thresholds in
 * `store.ts` as fractions. A unit test cannot read a stylesheet, so nothing
 * verified that a beat still landed on the event it was choreographed against.
 *
 * Four pacing changes on this branch each re-derived those fractions by hand.
 * One shipped a beat firing 78 units of z early — caught by a screenshot.
 *
 * These are the assertions that make the next pacing change cheap.
 */

describe("the budget", () => {
  test("the finale is exactly one screen, so progress can reach 1", () => {
    // Not a restatement of `maxScrollSvh`: this is the assumption that formula
    // rests on. If the finale ever stops being one viewport tall, progress
    // stops reaching 1 and every fraction below is wrong by that difference.
    const finale = BUDGET[BUDGET.length - 1];
    expect(finale.id).toBe("finale");
    expect(finale.svh).toBe(100);
    expect(maxScrollSvh()).toBe(totalSvh() - finale.svh);
  });

  test("every stretch has a positive height", () => {
    for (const s of BUDGET) expect(s.svh).toBeGreaterThan(0);
  });

  test("stretch ids are unique", () => {
    const ids = BUDGET.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("fractions", () => {
  test("the first stretch starts at zero and the finale ends at one", () => {
    expect(beatFraction("finale")).toBeCloseTo(1, 3);
  });

  test("beats run in the order the budget declares them", () => {
    const beats = BUDGET.filter((s) => s.copy).map((s) => s.id);
    let prev = -1;
    for (const b of beats) {
      const f = beatFraction(b);
      expect(f).toBeGreaterThan(prev);
      prev = f;
    }
  });

  test("world events run in z order and stay inside the ride", () => {
    // The property that matters: the camera meets them in the order the world
    // declares them, and none falls outside the track it is measured against.
    //
    // Every event, not a chosen few. Re-pinning the cut moved `FLARE_END` and I
    // moved `FLARE_START` the wrong way with it — past its own end, so the
    // corridor would have finished opening before it started. No pin references
    // `FLARE_START`, so nothing here noticed until the list was complete.
    const order = [
      "MOUTH_OPEN",
      "MOUTH_SHUT",
      "FLARE_START",
      "FLARE_END",
      "CONE_START",
      "CONE_WRAPPED",
      "WORM_Z_IN",
      "WORM_Z_FULL",
      "EXIT_START",
      "EXIT_OPEN",
      "WORM_Z_END",
    ] as const;
    let prev = 0;
    for (const e of order) {
      const f = worldFraction(e);
      expect(f).toBeGreaterThan(prev);
      expect(f).toBeLessThan(1);
      prev = f;
    }
  });

  test("the camera starts before the world and ends inside it", () => {
    expect(worldFraction("MOUTH_SHUT")).toBeGreaterThan(0);
    expect(Z.TRACK_END).toBeGreaterThan(Z.WORLD_Z_END);
  });
});

describe("pinning", () => {
  /**
   * The centre of this file. Each beat is choreographed against a moment in the
   * world, and the two are computed from completely different things — one from
   * `svh` in the overlay, one from `z` along the camera track. Nothing but this
   * keeps them together.
   */
  test("every beat lands on the world event it was written for", () => {
    for (const pin of BEAT_PINS) {
      const beat = beatFraction(pin.beat);
      const world = worldFraction(pin.event);
      const drift = Math.abs(beat - world);
      if (drift > pin.tolerance) {
        throw new Error(
          `${pin.beat} is at ${beat.toFixed(3)} but ${pin.event} is at ` +
            `${world.toFixed(3)} — drift ${drift.toFixed(3)} exceeds ` +
            `${pin.tolerance}. Re-derive the budget or move the world.`,
        );
      }
      expect(drift).toBeLessThanOrEqual(pin.tolerance);
    }
  });

  test("every pin names a stretch that exists", () => {
    const names = new Set(BUDGET.map((s) => s.id));
    for (const pin of BEAT_PINS) expect(names.has(pin.beat)).toBe(true);
  });

  test("every stretch that carries copy is either pinned or waived", () => {
    // The containment that matters, and the one I had backwards: asserting
    // every *pin* has a stretch catches nothing, because adding an unpinned
    // section is exactly the case where no pin exists to check. Adding copy to
    // the ride shifts every fraction below it, so a new section must either say
    // which world event it belongs to or say out loud that it belongs to none.
    const pinned = new Set(BEAT_PINS.map((p) => p.beat));
    const unpinned = BUDGET.filter(
      (s) => s.copy && !pinned.has(s.id) && !UNPINNED.has(s.id),
    ).map((s) => s.id);
    expect(unpinned).toEqual([]);
  });

  test("the waiver list only names stretches that exist", () => {
    // So a rename cannot quietly turn a waiver into a hole.
    const names = new Set(BUDGET.map((s) => s.id));
    for (const id of UNPINNED) expect(names.has(id)).toBe(true);
  });
});

describe("less motion", () => {
  /**
   * The camera already parks at `POSTER_Z` under `scroll.reduce`, so the world
   * stops travelling. The distance did not: 21,400px of scrolling, past a still
   * frame, for about two thousand characters of text.
   */
  test("every stretch collapses, so the ride becomes the document", () => {
    for (const s of BUDGET) expect(reducedSvh(s.id)).toBe(0);
  });

  test("the collapse covers the whole budget, including anything added later", () => {
    // The failure this guards is a new section quietly keeping its full height
    // because someone extended the budget and not the collapse.
    const total = BUDGET.reduce((a, s) => a + reducedSvh(s.id), 0);
    expect(total).toBe(0);
    expect(totalSvh()).toBeGreaterThan(2000);
  });

  test("it holds the same contract as heightOf about names", () => {
    expect(() => reducedSvh("nope")).toThrow();
    expect(() => heightOf("nope")).toThrow();
  });
});

describe("the warp window", () => {
  /**
   * The one derivation whose failure this module's own header calls "silent",
   * and the one that had no assertions at all — so when the total changed, all
   * four thresholds moved and nothing said a word.
   */
  test("runs in order and stays inside the ride", () => {
    const w = warpWindow();
    expect(w.in).toBeGreaterThan(0);
    expect(w.full).toBeGreaterThan(w.in);
    expect(w.hold).toBeGreaterThan(w.full);
    expect(w.out).toBeGreaterThan(w.hold);
    expect(w.out).toBeLessThan(1);
  });

  test("brackets the beats it is choreographed against", () => {
    const w = warpWindow();
    // The streaks are up across the countdown and the cards, and gone by the
    // time PRIZES has the frame — that is what the four numbers mean.
    expect(w.in).toBeLessThanOrEqual(beatFraction("tracksIntro"));
    expect(w.full).toBeLessThanOrEqual(beatFraction("track1"));
    expect(w.hold).toBeGreaterThanOrEqual(beatFraction("track5"));
    expect(w.out).toBeGreaterThanOrEqual(beatFraction("prizes"));
  });
});

describe("travel", () => {
  /**
   * The thing the cut was for, as a number rather than an impression.
   *
   * The first version of this allowed 0.5, which passed at 42% before the cut
   * and would have passed a doubling of every gap — a ceiling nothing could
   * reach is not a guard. It sits just above where the cut landed, so growing
   * the travel has to be a deliberate edit to this line.
   *
   * Note it measures gap share of the budget, not the windowed "positions with
   * nothing on screen" figure the page reports — those are different quantities
   * and only this one is computable here.
   */
  test("gaps stay under a third and a bit of the ride", () => {
    const empty = BUDGET.filter((s) => !s.copy).reduce((a, s) => a + s.svh, 0);
    expect(empty / totalSvh()).toBeLessThan(0.36);
  });

  test("the opening keeps enough room to close the corridor clear of the well", () => {
    // Found by hitting it: cut `ride` to 190svh and `MOUTH_SHUT` has to move to
    // z 61 to stay pinned — inside the well, so the corridor would finish
    // closing in the middle of the funnel. The floor is that the corridor shuts
    // beyond the well's near rim.
    const wellNearRim = 100 - 62; // WELL_Z - WELL_RADIUS, in `wire-surface`
    expect(Z.MOUTH_SHUT).toBeLessThan(wellNearRim);
  });
});
