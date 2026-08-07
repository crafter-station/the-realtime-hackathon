import { describe, expect, test } from "bun:test";
import { trackBand, trackCount } from "./journey";
import { bandFocus, buildMotes, hash, LANE, signalOf } from "./wire-tracks";

/**
 * The five behaviours are the only genuinely new thing on this page, and they
 * are the hardest part of it to check by looking: each one is on screen for
 * about 85svh, they animate, and "does this read as presence rather than as
 * blinking" is not a question a still frame answers.
 *
 * So what is asserted here is not how they look. It is the three things that
 * would make them not work at all — motes leaving the ground they are drawn on,
 * a behaviour that does not actually move, and two behaviours that are secretly
 * the same — plus the safety properties the renderer assumes when it writes
 * straight into a `Float32Array` without checking.
 */

const MOTES = buildMotes(600);
const TIMES = [0, 0.37, 1.4, 4, 9.25, 30, 121.5];

/** Every mote in a band, paired with the index the behaviours are keyed on. */
function bandAt(band: number) {
  return MOTES.map((m, i) => ({ m, i })).filter(({ m }) => m.band === band);
}

describe("the point set", () => {
  test("spreads evenly over the bands", () => {
    const counts = new Array(trackCount()).fill(0);
    for (const m of MOTES) counts[m.band] += 1;
    for (const c of counts) expect(c).toBe(MOTES.length / trackCount());
  });

  test("every parameter is a unit interval", () => {
    for (const m of MOTES) {
      for (const v of [m.u, m.v, m.r]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  test("the scatter never clumps into a line", () => {
    /**
     * The golden-ratio walk exists so the field is even at every scale. The
     * failure it prevents is subtle and total: `(i * PHI) % 1` with the wrong
     * constant, or with `i` reused for both axes, produces motes on a handful of
     * diagonals rather than a field — and a handful of diagonals reads as a
     * rendering artefact, not as a world.
     *
     * Twelve buckets across each axis, and every one of them has to be
     * occupied.
     */
    for (const axis of ["u", "v"] as const) {
      const buckets = new Set<number>();
      for (const m of MOTES) buckets.add(Math.floor(m[axis] * 12));
      expect(buckets.size).toBe(12);
    }
  });

  test("hash is deterministic and stays in range", () => {
    for (let i = 0; i < 500; i += 1) {
      const h = hash(i * 0.731);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(1);
      expect(hash(i * 0.731)).toBe(h);
    }
  });
});

describe("every behaviour stays on the ground it is drawn on", () => {
  /**
   * The renderer writes `signalOf`'s output straight into a buffer and converts
   * `d` to world z against the band's near edge. A mote outside the band is a
   * mote demonstrating the wrong track; a non-finite one blanks the whole draw
   * call, because a single NaN in a position attribute takes the geometry's
   * bounding sphere with it.
   */
  test("nothing is ever non-finite", () => {
    for (const t of TIMES) {
      for (let i = 0; i < MOTES.length; i += 1) {
        const sig = signalOf(MOTES[i], i, t);
        expect(Number.isFinite(sig.s)).toBe(true);
        expect(Number.isFinite(sig.d)).toBe(true);
        expect(Number.isFinite(sig.bright)).toBe(true);
      }
    }
  });

  test("nothing leaves its band, or the width of the grid", () => {
    // `LANE * 1.2` rather than `LANE`: WILD SIGNAL jitters motes off the lane
    // by design, and the ceiling that matters is the grid's own half-width of
    // 42.4 — past that a mote is glowing over nothing.
    for (const t of TIMES) {
      for (let i = 0; i < MOTES.length; i += 1) {
        const m = MOTES[i];
        const band = trackBand(m.band + 1);
        const depth = band.from - band.to;
        const sig = signalOf(m, i, t);
        expect(Math.abs(sig.s)).toBeLessThanOrEqual(LANE * 1.2);
        expect(Math.abs(sig.s)).toBeLessThan(42.4);
        expect(sig.d).toBeGreaterThanOrEqual(0);
        expect(sig.d).toBeLessThanOrEqual(depth);
      }
    }
  });

  test("brightness is a fraction, so nothing blows out the additive blend", () => {
    for (const t of TIMES) {
      for (let i = 0; i < MOTES.length; i += 1) {
        const { bright } = signalOf(MOTES[i], i, t);
        expect(bright).toBeGreaterThanOrEqual(0);
        expect(bright).toBeLessThanOrEqual(1);
      }
    }
  });

  test("is a pure function of index and time", () => {
    /**
     * The property the whole module is built on: no integration, no state
     * carried between frames. It is what makes a backgrounded tab returning with
     * a 900ms delta harmless, and what makes scrubbing the scroll bar backwards
     * not corrupt anything.
     *
     * Interleaved calls, because `a === a` is true of a stateful function that
     * happens to repeat.
     */
    const probe = (i: number, t: number) =>
      JSON.stringify(signalOf(MOTES[i], i, t));
    const a = probe(17, 3.5);
    probe(2, 88);
    probe(17, 9);
    probe(400, 0);
    expect(probe(17, 3.5)).toBe(a);
  });
});

describe("every behaviour actually does something", () => {
  /**
   * A behaviour that never changes is a static scatter with a comment claiming
   * otherwise — which is the single most likely way one of these five silently
   * stops working, because it still renders and still looks like a field.
   */
  test("each band moves or changes brightness over time", () => {
    for (let b = 0; b < trackCount(); b += 1) {
      const members = bandAt(b);
      const at = (t: number) => members.map(({ m, i }) => signalOf(m, i, t));
      const before = at(0.5);
      const after = at(2.9);
      let changed = 0;
      for (let k = 0; k < before.length; k += 1) {
        const moved = Math.hypot(
          after[k].s - before[k].s,
          after[k].d - before[k].d,
        );
        if (moved > 0.05 || Math.abs(after[k].bright - before[k].bright) > 0.05)
          changed += 1;
      }
      // A third is a low bar on purpose: REAL-TIME LOCATION deliberately keeps
      // three motes in four static as the map itself.
      expect(changed / before.length).toBeGreaterThan(0.25);
    }
  });

  test("no two bands are secretly the same behaviour", () => {
    /**
     * The regression this guards is a copy-paste in the `BEHAVIOURS` table —
     * five entries, one of them repeated, and the page ships two tracks
     * demonstrating the same capability. It renders perfectly and the only way
     * to notice is to remember what the third one was supposed to look like.
     *
     * Compared on a shape signature rather than raw values, because the bands
     * have different motes: how far the field spreads, how bright it is on
     * average, and how much of it is lit at all.
     */
    const signature = (b: number) => {
      const members = bandAt(b);
      const sigs = members.map(({ m, i }) => signalOf(m, i, 6.5));
      const lit = sigs.filter((s) => s.bright > 0.5).length / sigs.length;
      const mean =
        sigs.reduce((a, s) => a + s.bright, 0) / Math.max(sigs.length, 1);
      const spread =
        sigs.reduce((a, s) => a + Math.abs(s.s), 0) / Math.max(sigs.length, 1);
      return { lit, mean, spread };
    };
    const sigs = [0, 1, 2, 3, 4].map(signature);
    for (let a = 0; a < sigs.length; a += 1) {
      for (let b = a + 1; b < sigs.length; b += 1) {
        const same =
          Math.abs(sigs[a].lit - sigs[b].lit) < 0.02 &&
          Math.abs(sigs[a].mean - sigs[b].mean) < 0.02 &&
          Math.abs(sigs[a].spread - sigs[b].spread) < 0.5;
        expect(same).toBe(false);
      }
    }
  });
});

describe("what each one claims to be", () => {
  const sample = (b: number, t: number) =>
    bandAt(b).map(({ m, i }) => signalOf(m, i, t));

  test("[01] MULTIPLAYER gathers motes into rooms rather than scattering them", () => {
    // The whole read is "a shared place". Clustered motes occupy far fewer
    // buckets across the lane than an even field would.
    const buckets = new Set<number>();
    for (const s of sample(0, 3)) buckets.add(Math.round(s.s / 6));
    expect(buckets.size).toBeLessThan(12);
  });

  test("[02] LIVE STREAMING lights a front that travels outward from one source", () => {
    /**
     * The claim is a broadcast, so what has to be true is that the *lit* motes
     * get further from the source as time passes. Sampled over a short window,
     * inside one wavefront's travel, so the periodic wrap does not mask it.
     */
    const meanLitDistance = (t: number) => {
      const band = trackBand(2);
      const depth = band.from - band.to;
      const lit = sample(1, t).filter((s) => s.bright > 0.55);
      if (lit.length === 0) return null;
      return (
        lit.reduce(
          (a, s) => a + Math.hypot(s.s, (s.d - depth * 0.5) * 0.82),
          0,
        ) / lit.length
      );
    };
    const a = meanLitDistance(0.05);
    const b = meanLitDistance(0.35);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(b as number).toBeGreaterThan(a as number);
  });

  test("[03] REAL-TIME LOCATION snaps its map to a lattice", () => {
    // The static three-quarters are the streets. If they stop being on a grid
    // the band reads as drift, and drift is not location.
    const still = sample(2, 4).filter((s) => s.bright < 0.5);
    expect(still.length).toBeGreaterThan(0);
    for (const s of still) {
      expect(Math.abs(s.s % 8.5)).toBeLessThan(1e-6);
    }
  });

  test("[04] AI AGENTS keeps most of the field dim and a few things bright", () => {
    // Autonomy has to read as a *few* actors over a field of signals. If most
    // of the band is bright there are no actors, just weather.
    const sigs = sample(3, 5.5);
    const bright = sigs.filter((s) => s.bright > 0.6).length / sigs.length;
    expect(bright).toBeGreaterThan(0.05);
    expect(bright).toBeLessThan(0.5);
  });

  test("[04] AI AGENTS trails follow where an agent has been", () => {
    // The trail is the same path sampled backwards in time, which is what makes
    // the module stateless. Concretely: a trail mote at time t sits where a
    // head mote was slightly earlier.
    const sigs = sample(3, 7);
    const brightest = sigs.reduce((a, s) => (s.bright > a.bright ? s : a));
    const earlier = sample(3, 7 - 0.085).reduce((a, s) =>
      s.bright > a.bright ? s : a,
    );
    expect(
      Math.hypot(brightest.s - earlier.s, brightest.d - earlier.d),
    ).toBeLessThan(12);
  });

  test("[05] WILD SIGNAL refuses to organise itself", () => {
    /**
     * The one band that must *not* have a structure, so the assertion is the
     * inverse of the others: its lit set has to change substantially between two
     * ticks of its own jump clock, where the four legible behaviours all evolve
     * continuously.
     */
    const litAt = (t: number) =>
      new Set(
        sample(4, t)
          .map((s, k) => (s.bright > 0.4 ? k : -1))
          .filter((k) => k >= 0),
      );
    const a = litAt(2.0);
    const b = litAt(2.0 + 1 / 1.9);
    const shared = [...a].filter((k) => b.has(k)).length;
    expect(a.size).toBeGreaterThan(0);
    expect(shared / a.size).toBeLessThan(0.75);
  });
});

describe("bandFocus", () => {
  test("is dark before the band is inside the fog", () => {
    const { from } = trackBand(1);
    expect(bandFocus(0, from + 200)).toBe(0);
  });

  test("is lit while the camera is in the band", () => {
    for (let b = 0; b < trackCount(); b += 1) {
      const { from, to } = trackBand(b + 1);
      expect(bandFocus(b, (from + to) / 2)).toBeCloseTo(1, 3);
    }
  });

  test("is dark again once the camera has left it behind", () => {
    for (let b = 0; b < trackCount(); b += 1) {
      expect(bandFocus(b, trackBand(b + 1).to - 60)).toBe(0);
    }
  });

  test("never leaves 0..1, anywhere on the track", () => {
    for (let z = 150; z >= -900; z -= 3) {
      for (let b = 0; b < trackCount(); b += 1) {
        const f = bandFocus(b, z);
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThanOrEqual(1);
      }
    }
  });

  test("at least one band is lit for the whole of the tracks", () => {
    /**
     * The gap this catches: bands tile in z, but `bandFocus` fades each one out
     * 40 units after the camera passes it and only fades the next one in at 72
     * units of approach. Those two windows have to overlap, or there is a stripe
     * of the page between two cards where the world underneath is simply off.
     */
    const first = trackBand(1).from;
    const last = trackBand(trackCount()).to;
    for (let z = first; z >= last; z -= 2) {
      let best = 0;
      for (let b = 0; b < trackCount(); b += 1) {
        best = Math.max(best, bandFocus(b, z));
      }
      expect(best).toBeGreaterThan(0.5);
    }
  });
});
