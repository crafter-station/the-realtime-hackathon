import { describe, expect, test } from "bun:test";
import { beatEnd, beatFraction } from "./journey";
import { createSoundscape, intensityAt } from "./soundscape";

/**
 * The engine is tested through its state machine and its one pure function.
 * Nothing here asserts that sound was audible — that is not a thing a test can
 * know, and pretending otherwise would be the kind of assertion that passes
 * whatever the code does.
 *
 * The graph is faked at the seam the engine already has: it is handed a factory
 * and never reaches for `window`.
 */

function fakeGraph() {
  const calls: string[] = [];
  let gain = 0;
  return {
    calls,
    get gain() {
      return gain;
    },
    factory: () => {
      calls.push("built");
      return {
        setGain(v: number) {
          gain = v;
        },
        resume() {
          calls.push("resumed");
        },
        stop() {
          calls.push("stopped");
        },
      };
    },
  };
}

describe("intensity", () => {
  test("is silent before the ride starts", () => {
    expect(intensityAt(0)).toBe(0);
  });

  test("builds through the fall and into the crossing", () => {
    // Sampled at the beats themselves rather than at round numbers: a literal
    // 0.3 would quietly start sampling a different segment the first time the
    // budget moves, which it has done repeatedly.
    const fall = intensityAt(beatFraction("through") / 2);
    const sealed = intensityAt(beatFraction("through"));
    const crest = intensityAt(beatEnd("through"));
    expect(sealed).toBeGreaterThan(fall);
    expect(crest).toBeGreaterThan(sealed);
  });

  test("is loudest at the crossing, not at the end", () => {
    // The crossing is the page's one climax now that the vortex is gone. If the
    // drone kept climbing to the register it would fight the thing it scores.
    const crest = intensityAt(beatEnd("through"));
    expect(crest).toBeGreaterThan(intensityAt(1));
    expect(crest).toBeGreaterThan(intensityAt(beatFraction("prizes")));
  });

  test("holds under the tracks rather than draining away", () => {
    /**
     * The plateau, asserted because it is the part most likely to be
     * "simplified" into a single decay from the crossing to the end. The five
     * tracks are the page's argument and the loudest thing on screen; a drone
     * quietly ebbing underneath them reads as the page losing interest in its
     * own case.
     */
    const first = intensityAt(beatFraction("track1"));
    const last = intensityAt(beatFraction("track5"));
    expect(last).toBeCloseTo(first, 6);
    expect(first).toBeGreaterThan(intensityAt(beatFraction("format")));
  });

  test("stands down with the world, not before or after it", () => {
    // The ground stops rolling, the grid dims and the drone falls, all pinned
    // to the same gap. Three things standing down together is what makes the
    // second act legible as one.
    expect(intensityAt(beatFraction("brief"))).toBeGreaterThan(
      intensityAt(beatFraction("questions")),
    );
    expect(intensityAt(beatEnd("prizes"))).toBeCloseTo(
      intensityAt(beatFraction("track1")),
      6,
    );
  });

  test("the branch joins do not step", () => {
    /**
     * The sharp version of the continuity check, and the one that actually
     * catches the failure it is named for. A step in a sustained tone is audible
     * as a click, the curve is piecewise, and a click can only happen where two
     * pieces meet — so sample either side of each join rather than hoping a
     * coarse walk lands on one.
     */
    const joins = [
      beatFraction("through"),
      beatEnd("through"),
      beatEnd("tracksIntro"),
      beatFraction("brief"),
    ];
    for (const j of joins) {
      const step = Math.abs(intensityAt(j - 1e-6) - intensityAt(j + 1e-6));
      expect(step).toBeLessThan(1e-4);
    }
  });

  test("no segment ramps fast enough to read as a jump", () => {
    /**
     * The blunt companion to the test above: a bound on the whole curve, so a
     * new segment cannot be added with a slope nothing checks.
     *
     * 0.02 per 0.001 of progress rather than the 0.01 this used to carry. The
     * threshold was calibrated against a drone that took 55% of the page to
     * build; the crossing moved to 19% and the build now happens across 7% —
     * `(0.92 - 0.18) × 1.5 / 0.070` is a peak slope of 15.8, or 0.0158 a step.
     * That is a swell, and a swell is what the sealed section is supposed to
     * sound like.
     *
     * It is still a guard rather than a waiver: any genuine branch mismatch is
     * a step of order 0.1 — five times this — and the joins test above pins the
     * joins themselves to 1e-4.
     */
    let prev = intensityAt(0);
    for (let p = 0.001; p <= 1; p += 0.001) {
      const v = intensityAt(p);
      expect(Math.abs(v - prev)).toBeLessThan(0.02);
      prev = v;
    }
  });

  test("never leaves the range a gain node can take", () => {
    for (let p = 0; p <= 1; p += 0.01) {
      const v = intensityAt(p);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  test("depends on nothing but its argument", () => {
    // The old version of this asserted `intensityAt(0.42) === intensityAt(0.42)`,
    // which is true of any deterministic function including a stateful one that
    // happens to repeat. Interleaving unrelated calls is what would actually
    // catch a hidden accumulator.
    const a = intensityAt(0.42);
    intensityAt(0.1);
    intensityAt(0.9);
    intensityAt(0.42);
    intensityAt(0.3);
    expect(intensityAt(0.42)).toBe(a);
  });
});

describe("the soundscape", () => {
  test("starts silent and builds nothing", () => {
    const g = fakeGraph();
    const s = createSoundscape(g.factory);
    expect(s.state()).toBe("idle");
    expect(g.calls).toEqual([]);
  });

  test("builds the graph only on the first unmute", () => {
    // The point of waiting: an AudioContext created before a gesture is one the
    // browser refuses to start, and one built on load is work nobody asked for.
    const g = fakeGraph();
    const s = createSoundscape(g.factory);
    s.setDepth(0.5);
    expect(g.calls).toEqual([]);
    s.toggle();
    expect(g.calls).toEqual(["built"]);
    expect(s.state()).toBe("on");
  });

  test("does not rebuild on a second unmute", () => {
    const g = fakeGraph();
    const s = createSoundscape(g.factory);
    s.toggle();
    s.toggle();
    s.toggle();
    expect(g.calls.filter((c) => c === "built")).toHaveLength(1);
  });

  test("is reversible from the same control", () => {
    const g = fakeGraph();
    const s = createSoundscape(g.factory);
    s.toggle();
    expect(s.state()).toBe("on");
    s.toggle();
    expect(s.state()).toBe("off");
    s.toggle();
    expect(s.state()).toBe("on");
  });

  test("is silent while off, whatever the depth says", () => {
    const g = fakeGraph();
    const s = createSoundscape(g.factory);
    s.toggle();
    s.setDepth(0.7);
    expect(g.gain).toBeGreaterThan(0);
    s.toggle();
    s.setDepth(0.7);
    expect(g.gain).toBe(0);
  });

  test("follows depth while on", () => {
    const g = fakeGraph();
    const s = createSoundscape(g.factory);
    s.toggle();
    s.setDepth(0.1);
    const shallow = g.gain;
    s.setDepth(0.7);
    expect(g.gain).toBeGreaterThan(shallow);
  });

  test("starts unasked, so the room is there without anyone finding a button", () => {
    const g = fakeGraph();
    const s = createSoundscape(g.factory);
    s.start();
    expect(s.state()).toBe("on");
    expect(g.calls).toEqual(["built"]);
  });

  test("starting twice builds one graph", () => {
    // `start` is wired to four different gesture events, all of which fire on
    // an ordinary click, so it is called repeatedly by design.
    const g = fakeGraph();
    const s = createSoundscape(g.factory);
    s.start();
    s.start();
    s.start();
    expect(g.calls.filter((c) => c === "built")).toHaveLength(1);
  });

  test("never overrules someone who muted by hand", () => {
    // The case that would make this feature hostile: mute the drone, click
    // anything at all, and have it come back. `start` only acts from `idle`,
    // and a hand mute leaves `off`.
    const g = fakeGraph();
    const s = createSoundscape(g.factory);
    s.start();
    s.toggle();
    expect(s.state()).toBe("off");
    s.start();
    s.start();
    expect(s.state()).toBe("off");
    s.setDepth(0.6);
    expect(g.gain).toBe(0);
  });

  test("a gesture before anything was built is harmless", () => {
    const g = fakeGraph();
    const s = createSoundscape(g.factory);
    s.nudge();
    expect(g.calls).toEqual([]);
    expect(s.state()).toBe("idle");
  });

  test("nudging asks a live graph to resume", () => {
    // Scrolling is not a user-activation trigger, so a trackpad-only visitor
    // can leave the context suspended; this is the retry.
    const g = fakeGraph();
    const s = createSoundscape(g.factory);
    s.start();
    s.nudge();
    expect(g.calls).toContain("resumed");
  });

  test("releases the graph when disposed", () => {
    const g = fakeGraph();
    const s = createSoundscape(g.factory);
    s.toggle();
    s.dispose();
    expect(g.calls).toContain("stopped");
    expect(s.state()).toBe("idle");
  });

  test("disposing before it ever played is harmless", () => {
    const g = fakeGraph();
    const s = createSoundscape(g.factory);
    s.dispose();
    expect(g.calls).toEqual([]);
    expect(s.state()).toBe("idle");
  });
});
