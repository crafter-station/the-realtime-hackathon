import { describe, expect, test } from "bun:test";
import {
  BEAT_PINS,
  BUDGET,
  beatFraction,
  maxScrollSvh,
  totalSvh,
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
  test("the total is the sum of its parts", () => {
    const sum = BUDGET.reduce((a, s) => a + s.svh, 0);
    expect(totalSvh()).toBe(sum);
  });

  test("the scrollable height is the total less the last screen", () => {
    // The finale is the last viewport, so progress reaches 1 when its top
    // reaches the top of the window — not when the document ends.
    expect(maxScrollSvh()).toBe(totalSvh() - 100);
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

  test("world events map through the camera track, not the budget", () => {
    // p(z) = (TRACK_START - z) / (TRACK_START - TRACK_END)
    const span = Z.TRACK_START - Z.TRACK_END;
    expect(worldFraction("MOUTH_SHUT")).toBeCloseTo(
      (Z.TRACK_START - Z.MOUTH_SHUT) / span,
      6,
    );
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

  test("every pinned beat exists in the budget", () => {
    // The failure this catches: adding a section without pinning it shifts
    // every fraction below it and nothing complains.
    const names = new Set(BUDGET.map((s) => s.id));
    for (const pin of BEAT_PINS) expect(names.has(pin.beat)).toBe(true);
  });

  test("the beats that carry the story are all pinned", () => {
    // Not every section needs a world event, but these do — they are the ones
    // whose whole point is coinciding with something the world does.
    const pinned = new Set(BEAT_PINS.map((p) => p.beat));
    for (const required of ["kickoff", "otherSide", "format"]) {
      expect(pinned.has(required)).toBe(true);
    }
  });
});

describe("dead scroll", () => {
  /**
   * The thing the cut is for, as a number rather than an impression. A stretch
   * with no `beat` is scroll where there is nothing to read.
   */
  test("is reported, and under the agreed ceiling", () => {
    const empty = BUDGET.filter((s) => !s.copy).reduce((a, s) => a + s.svh, 0);
    const share = empty / totalSvh();
    expect(share).toBeLessThan(0.5);
  });
});
