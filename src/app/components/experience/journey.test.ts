import { describe, expect, test } from "bun:test";
import {
  BASE_FOV,
  BEAT_PINS,
  BUDGET,
  beatEnd,
  beatFraction,
  cardWindow,
  framingFov,
  heightOf,
  maxScrollSvh,
  reducedSvh,
  reducedTotalSvh,
  totalSvh,
  trackBand,
  trackCount,
  UNPINNED,
  worldFraction,
  Z,
  zAt,
} from "./journey";
import { settle, waveWindow, wrap } from "./wire-surface";

/**
 * The ride's shape lived in three files that had to agree and could not be
 * checked together: the scroll budget in `globals.css` as `svh`, the world's
 * geometry events in `wire-surface.ts` as `z`, and the hyperspace thresholds in
 * `store.ts` as fractions. A unit test cannot read a stylesheet, so nothing
 * verified that a beat still landed on the event it was choreographed against.
 *
 * Two of those three are gone — the heights moved in here and the hyperspace
 * beat was cut — which makes this file smaller and its remaining job sharper:
 * the budget and the world are one module now, and these are the assertions
 * that keep the next pacing change cheap.
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

  test("the cut stays cut", () => {
    /**
     * 2,219svh before the second crossing came out, 1,380 after. The ceiling is
     * a guard against the removed beats being reintroduced one at a time —
     * every one of them was individually defensible and together they were the
     * confusion this page was rebuilt to remove.
     */
    expect(totalSvh()).toBeLessThan(1600);
  });
});

describe("fractions", () => {
  test("the first stretch starts at zero and the finale ends at one", () => {
    expect(beatFraction("ride")).toBe(0);
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
    // Every event, not a chosen few. Re-pinning an earlier cut moved `FLARE_END`
    // and `FLARE_START` went the wrong way with it — past its own end, so the
    // section would have finished opening before it started. No pin references
    // `FLARE_START`, so nothing noticed until this list was complete.
    const order = [
      "MOUTH_OPEN",
      "MOUTH_SHUT",
      "FLARE_START",
      "FLARE_END",
      "SETTLE_START",
      "SETTLE_END",
    ] as const;
    let prev = 0;
    for (const e of order) {
      const f = worldFraction(e);
      expect(f).toBeGreaterThan(prev);
      expect(f).toBeLessThan(1);
      prev = f;
    }
  });

  test("the second portal is still ahead of you when the ride stops", () => {
    /**
     * Deliberately outside the loop above, because it is the one event that is
     * *not* inside the track — and that is the point. Travel is toward -z, so a
     * portal at a z greater than `TRACK_END` is somewhere you have already been,
     * which is a wall rather than a way out. It also has to stay inside the
     * world the grid is built for, or it glows over nothing.
     */
    expect(Z.FINALE_PORTAL).toBeLessThan(Z.TRACK_END);
    expect(Z.FINALE_PORTAL).toBeGreaterThan(Z.WORLD_Z_END);
    expect(worldFraction("FINALE_PORTAL")).toBeGreaterThan(1);
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
    // The containment that matters, and the one that was originally backwards:
    // asserting every *pin* has a stretch catches nothing, because adding an
    // unpinned section is exactly the case where no pin exists to check. Adding
    // copy to the ride shifts every fraction below it, so a new section must
    // either say which world event it belongs to or say out loud that it
    // belongs to none.
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

describe("one crossing", () => {
  /**
   * The invariant the whole redesign is about, stated as a test so it cannot
   * quietly stop being true.
   *
   * The page used to close the world around you twice — the corridor at the top
   * and the tube into the vortex at 65% — and promise "another dimension" three
   * times in copy. A page that crosses twice has not crossed at all, so there is
   * now exactly one closed region along the camera's whole track.
   */
  test("the world closes around you exactly once", () => {
    let regions = 0;
    let inside = false;
    for (let i = 0; i <= 4000; i += 1) {
      const closed = wrap(zAt(i / 4000)) > 0.5;
      if (closed && !inside) regions += 1;
      inside = closed;
    }
    expect(regions).toBe(1);
  });

  test("the crossing is sealed for the whole of its sealed window", () => {
    /**
     * `MOUTH_SHUT` is pinned, so the section is always verified to *close* on
     * time. Nothing checks that it stays closed: `FLARE_START` is derived from
     * `FLARE_END` and a run length, and no pin names it. The previous cut got
     * this wrong in exactly that way — the run was long enough that the walls
     * were already gone while copy written for a sealed room was on screen.
     *
     * Stated as the property rather than the numbers: every point between the
     * mouth shutting and the flare starting is fully wrapped. Walked rather than
     * sampled at the ends, because a dip in the middle is the shape a
     * mis-derived run produces.
     */
    for (let i = 0; i <= 24; i += 1) {
      const z = Z.MOUTH_SHUT + ((Z.FLARE_START - Z.MOUTH_SHUT) * i) / 24;
      expect(wrap(z)).toBeGreaterThan(0.999);
    }
  });

  test("the crossing owns the stretch that is named for it", () => {
    // `through` begins sealed and ends open — that span *is* the crossing, and
    // it is the only stretch on the page where the sky is gone.
    expect(wrap(zAt(beatFraction("through")))).toBeGreaterThan(0.99);
    expect(wrap(zAt(beatEnd("through")))).toBeLessThan(0.01);
  });

  test("nothing after the crossing is enclosed", () => {
    // The far side is open country all the way to the register. If this fails
    // something has grown a second curl back.
    for (let i = 0; i <= 200; i += 1) {
      const f = beatFraction("tracksIntro");
      const z = zAt(f + ((1 - f) * i) / 200);
      expect(wrap(z)).toBeLessThan(0.01);
    }
  });

  test("the opening keeps enough room to close clear of the well", () => {
    // Found by hitting it: cut `ride` too far and `MOUTH_SHUT` has to move up
    // into the well to stay pinned, so the plane would finish closing in the
    // middle of the funnel. The floor is that it shuts beyond the near rim.
    const wellNearRim = 100 - 62; // WELL_Z - WELL_RADIUS, in `wire-surface`
    expect(Z.MOUTH_SHUT).toBeLessThan(wellNearRim);
  });
});

describe("the track bands", () => {
  /**
   * Each card's demonstration is WebGL and each card is DOM, and the only thing
   * they can both be sure of is scroll position. `trackBand` derives the world
   * from the budget so the two cannot drift; these assert that the world it
   * derives is somewhere a demonstration can actually be seen.
   */
  test("there are five, in z order, and they tile without gaps", () => {
    expect(trackCount()).toBe(5);
    for (let i = 1; i <= 5; i += 1) {
      const band = trackBand(i);
      expect(band.from).toBeGreaterThan(band.to);
      if (i > 1) expect(band.from).toBeCloseTo(trackBand(i - 1).to, 6);
    }
  });

  test("every band sits on open ground", () => {
    // A behaviour drawn on a surface that is curled around the camera is a
    // behaviour nobody can read. All five are past `FLARE_END` by construction;
    // this is the construction being checked.
    for (let i = 1; i <= 5; i += 1) {
      const { from, to } = trackBand(i);
      for (let k = 0; k <= 8; k += 1) {
        expect(wrap(from + ((to - from) * k) / 8)).toBeLessThan(0.01);
      }
    }
  });

  test("every band is over before the world settles", () => {
    // The signal layer is switched off by `settle`, so a band that ran past it
    // would be a track whose demonstration is faded out underneath it.
    for (let i = 1; i <= 5; i += 1) {
      expect(settle(trackBand(i).to)).toBe(0);
    }
  });

  test("each band is deep enough for a behaviour to establish", () => {
    // Fog reaches 105 units. A band shorter than about half that arrives and
    // leaves inside one fog length, which reads as a flicker rather than a
    // world.
    for (let i = 1; i <= 5; i += 1) {
      const { from, to } = trackBand(i);
      expect(from - to).toBeGreaterThan(50);
    }
  });

  test("the card window covers exactly the five bands", () => {
    const cards = cardWindow();
    expect(zAt(cards.from)).toBeCloseTo(trackBand(1).from, 6);
    expect(zAt(cards.to)).toBeCloseTo(trackBand(5).to, 6);
  });
});

describe("the world settling", () => {
  test("the ground only rolls where the walls are off it", () => {
    // `waveWindow`'s own contract, asserted where the z events it depends on
    // are defined. Undulations inside a wrapped section read as a dented pipe.
    expect(waveWindow(Z.FLARE_END)).toBe(0);
    // And it does something in between, so the guard cannot be satisfied by a
    // window that is simply always zero.
    expect(waveWindow((Z.FLARE_END + Z.SETTLE_START) / 2)).toBeGreaterThan(0.9);
  });

  test("the ground is flat for the whole briefing", () => {
    /**
     * The second act is announced by the world going quiet rather than by a
     * section saying so, which only works if the world is actually quiet for all
     * of it — including the register at the very end.
     */
    for (const id of ["format", "schedule", "questions", "finale"]) {
      expect(waveWindow(zAt(beatFraction(id)))).toBe(0);
      expect(settle(zAt(beatFraction(id)))).toBe(1);
    }
  });

  test("nothing has settled while the tracks are still being read", () => {
    expect(settle(zAt(cardWindow().to))).toBe(0);
    expect(settle(zAt(beatFraction("prizes")))).toBe(0);
  });
});

describe("less motion", () => {
  /**
   * The camera already parks at `POSTER_Z` under `scroll.reduce`, so the world
   * stops travelling. The distance did not: thousands of pixels of scrolling,
   * past a still frame, for about two thousand characters of text.
   */
  test("every stretch but the hero's collapses, so the ride becomes the document", () => {
    for (const s of BUDGET) {
      if (s.id === "ride") continue;
      expect(reducedSvh(s.id)).toBe(0);
    }
  });

  test("the hero keeps exactly one screen to stand in", () => {
    /**
     * The one exception, and it is load-bearing rather than a leftover.
     *
     * `.xp-heroLayer` is `position: fixed`, so no amount of collapsed content
     * can push it down — it comes off screen by fading on scroll progress, over
     * 0.02 → 0.09. With `ride` at zero the document began at scroll 0 underneath
     * it and the first screen of a reduced-motion visit was the hero and the
     * first beat drawn over one another.
     *
     * One viewport, not two: enough for the hero to have a screen of its own,
     * and nothing spare, because empty scroll is the thing this whole function
     * exists to remove.
     */
    expect(reducedSvh("ride")).toBe(100);
  });

  test("the collapse covers the whole budget, including anything added later", () => {
    // The failure this guards is a new section quietly keeping its full height
    // because someone extended the budget and not the collapse. The floor is
    // the hero's single screen, so a second stretch keeping its height trips it.
    expect(reducedTotalSvh()).toBe(100);
  });

  test("it holds the same contract as heightOf about names", () => {
    expect(() => reducedSvh("nope")).toThrow();
    expect(() => heightOf("nope")).toThrow();
  });
});

describe("framing", () => {
  /**
   * The horizontal field is what frames the well, and `fov` is the vertical one —
   * so on a portrait phone the two diverge badly enough to lose the subject of
   * the opening frame entirely. These assert the property, not the constants.
   */
  const hFov = (aspect: number) =>
    2 *
    Math.atan(Math.tan(((framingFov(aspect) / 2) * Math.PI) / 180) * aspect);

  test("wide viewports are left exactly as they were", () => {
    for (const aspect of [16 / 9, 1.6, 1.2, 1, 0.95]) {
      expect(framingFov(aspect)).toBe(BASE_FOV);
    }
  });

  test("a portrait phone wins back a usable horizontal field", () => {
    // 390x844 — the viewport the defect was found on. Bare 55° gives it 27°
    // across, which put the well's lit throat outside the frame.
    const phone = 390 / 844;
    const before =
      2 * Math.atan(Math.tan(((BASE_FOV / 2) * Math.PI) / 180) * phone);
    expect((before * 180) / Math.PI).toBeLessThan(28);
    expect((hFov(phone) * 180) / Math.PI).toBeGreaterThan(38);
  });

  test("never widens past the fisheye ceiling, however narrow it gets", () => {
    for (const aspect of [0.5, 0.3, 0.1, 0.01]) {
      expect(framingFov(aspect)).toBeLessThanOrEqual(78);
    }
  });

  test("widening is monotonic — narrower never gets a smaller field", () => {
    let prev = 0;
    for (const aspect of [2, 1.5, 1, 0.9, 0.8, 0.7, 0.6, 0.5]) {
      const fov = framingFov(aspect);
      expect(fov).toBeGreaterThanOrEqual(prev);
      prev = fov;
    }
  });

  test("degenerate viewports fall back rather than returning nonsense", () => {
    // A zero-height container during layout is a real thing, and Infinity or
    // NaN reaching `camera.fov` blanks the canvas rather than misframing it.
    for (const aspect of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(Number.isFinite(framingFov(aspect))).toBe(true);
    }
    expect(framingFov(0)).toBe(BASE_FOV);
  });
});

describe("travel", () => {
  /**
   * The conversion-relevant question, as a number rather than an impression:
   * how much of this page is scrolling past nothing.
   *
   * It measures gap share of the budget, not the windowed "positions with
   * nothing on screen" figure — those are different quantities and only this one
   * is computable here.
   */
  test("gaps stay under a quarter of the ride", () => {
    const empty = BUDGET.filter((s) => !s.copy).reduce((a, s) => a + s.svh, 0);
    expect(empty / totalSvh()).toBeLessThan(0.25);
  });

  test("there is no empty travel between the intro and the last card", () => {
    /**
     * The bracket used to be padded at both ends by a punch into hyperspace and
     * a drop back out of it — about 8% of it after the last cut, and 20% before
     * that. Both are gone, and this asserts the stronger property they were
     * being trimmed toward: the run from the intro to the fifth card is
     * uninterrupted copy, because the world is now doing its work *underneath*
     * the cards rather than in gaps between them.
     */
    const from = BUDGET.findIndex((s) => s.id === "tracksIntro");
    const to = BUDGET.findIndex((s) => s.id === "track5");
    for (const s of BUDGET.slice(from, to + 1)) expect(s.copy).toBe(true);
  });

  test("the five track cards own most of their bracket", () => {
    const ids = ["tracksIntro", "track1", "track2", "track3", "track4"];
    const bracket =
      ids.reduce((a, id) => a + heightOf(id), 0) + heightOf("track5");
    const cards = [1, 2, 3, 4, 5].reduce(
      (a, i) => a + heightOf(`track${i}`),
      0,
    );
    expect(cards / bracket).toBeGreaterThan(0.75);
  });

  test("each track slot holds at least as long as the intro beat", () => {
    // So budget moved into the cards cannot quietly migrate back into a long
    // "Five tracks" title screen that scanners skip.
    const intro = heightOf("tracksIntro");
    for (let i = 1; i <= 5; i += 1) {
      expect(heightOf(`track${i}`)).toBeGreaterThanOrEqual(intro);
    }
  });
});
