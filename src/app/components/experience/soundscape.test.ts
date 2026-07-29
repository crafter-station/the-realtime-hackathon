import { describe, expect, test } from "bun:test";
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

  test("rises through the descent", () => {
    expect(intensityAt(0.3)).toBeGreaterThan(intensityAt(0.1));
    expect(intensityAt(0.6)).toBeGreaterThan(intensityAt(0.3));
  });

  test("is loudest in the vortex, not at the end", () => {
    // The arrival is meant to feel like coming up for air. If the drone kept
    // climbing to the register it would fight the thing it is scoring.
    const vortex = intensityAt(0.7);
    expect(vortex).toBeGreaterThan(intensityAt(0.95));
    expect(vortex).toBeGreaterThanOrEqual(intensityAt(0.5));
  });

  test("never leaves the range a gain node can take", () => {
    for (let p = 0; p <= 1; p += 0.01) {
      const v = intensityAt(p);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  test("is a pure function of depth", () => {
    expect(intensityAt(0.42)).toBe(intensityAt(0.42));
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
