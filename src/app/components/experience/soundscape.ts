import { beatFraction } from "./journey";

/**
 * The sound of the descent.
 *
 * The brief asks for an "ambient soundscape + SFX… muted by default" and there
 * was none. This is the ambient half: a drone that deepens as you fall and eases
 * when you come out the other side.
 *
 * It is synthesised rather than loaded. Sourcing the audio is out of scope on
 * the ticket, and a drone that has to track scroll depth continuously wants to
 * be generated anyway — a file would either loop audibly or weigh more than the
 * rest of the page.
 *
 * NOTHING HAPPENS UNTIL ASKED
 *
 * No context, no nodes, no work of any kind until the first unmute. That is not
 * only politeness: a browser will refuse to start an `AudioContext` that was
 * created outside a user gesture, so building it eagerly would produce a
 * suspended context that silently never plays. Waiting for the gesture sidesteps
 * the policy instead of fighting it.
 *
 * The state machine and the depth curve live here, free of `window`, so they can
 * be tested for what they promise. The graph arrives through a factory, which is
 * the seam the tests fake.
 */

/** What the engine is doing. `idle` means it has never been asked for. */
export type SoundState = "idle" | "on" | "off";

/** The bit that actually makes noise, kept behind a seam the tests can replace. */
export type Graph = {
  setGain(value: number): void;
  stop(): void;
  /** Optional: only the real graph has a context that can be suspended. */
  resume?(): void;
};

export type GraphFactory = () => Graph;

/**
 * How loud the drone is at a given depth.
 *
 * Anchored to the ride rather than to round numbers: silent on the opening
 * frame, climbing as the corridor closes, heaviest through the vortex, and
 * easing once you are through — the arrival is meant to feel like coming up for
 * air, and a drone still climbing into the register would be scoring against
 * the thing it is there to support.
 *
 * The unit is 0..1 of *this curve's* range, not of output loudness: the peak is
 * 0.9 and `browserGraph` scales again by `HEADROOM` on the way to the gain node.
 * Two scalings, both deliberate — this one shapes the ride, that one decides how
 * loud the loudest point is allowed to be.
 */
export function intensityAt(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  const start = beatFraction("holdOn");
  const peak = beatFraction("anotherDimension");
  const out = beatFraction("format");

  if (p < start) {
    // Fading up out of nothing across the fall into the well.
    return 0.18 * (p / start);
  }
  if (p < peak) {
    const t = (p - start) / (peak - start);
    return 0.18 + 0.72 * t * t * (3 - 2 * t);
  }
  if (p < out) {
    return 0.9;
  }
  const t = (p - out) / (1 - out);
  return 0.9 - 0.55 * t * t * (3 - 2 * t);
}

/**
 * The engine.
 *
 * A closure rather than a class because there is one of these and it has three
 * states; the ceremony would outweigh the subject.
 */
export function createSoundscape(build: GraphFactory) {
  let state: SoundState = "idle";
  let graph: Graph | null = null;
  let depth = 0;

  const apply = () => {
    if (!graph) return;
    graph.setGain(state === "on" ? intensityAt(depth) : 0);
  };

  return {
    state: () => state,

    /** Called from the scroll loop; does nothing at all until asked for. */
    setDepth(progress: number) {
      depth = progress;
      apply();
    },

    /**
     * Start unasked, on the first gesture that permits it.
     *
     * The room is meant to be there. Waiting for someone to find a 2.3rem
     * button before the page has any atmosphere gets it heard by almost nobody.
     *
     * It cannot run any earlier than a gesture, though — an `AudioContext`
     * built outside one is born suspended and never plays, so this is as close
     * to "always" as a browser allows. Calling it repeatedly is free: it only
     * does anything from `idle`, so once someone has muted by hand the state is
     * `off` and no later gesture can undo their answer.
     */
    start() {
      if (state !== "idle") return;
      graph = build();
      state = "on";
      apply();
    },

    /**
     * Ask a suspended context to resume.
     *
     * Separate from `start` because of the case that actually bites here: this
     * page is driven by scrolling, and `wheel` and `scroll` are not user
     * activation triggers. Somebody who only ever trackpad-scrolls can reach
     * the bottom having produced no gesture that unlocks audio, so the context
     * exists and stays suspended until a real one arrives. Cheap and idempotent
     * — safe to call on every event.
     */
    nudge() {
      graph?.resume?.();
    },

    /**
     * The one control. The first call is what builds the graph, which is why
     * it must be reached from a real gesture and not from an effect.
     */
    toggle() {
      if (state === "idle") {
        graph = build();
        state = "on";
      } else {
        state = state === "on" ? "off" : "on";
      }
      apply();
    },

    dispose() {
      graph?.stop();
      graph = null;
      state = "idle";
    },
  };
}

/**
 * The real graph: two detuned oscillators under a low-pass, which is about the
 * least machinery that still reads as a room rather than as a test tone.
 *
 * Separated from `createSoundscape` so the engine never mentions `window` and
 * the tests never mention Web Audio.
 */
/**
 * How loud the loudest point of the ride is allowed to be, against a gain of 1.
 * Ambient means ambient: this is a bed, not a soundtrack.
 */
const HEADROOM = 0.34;

export function browserGraph(): Graph {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new Ctx();
  const gain = ctx.createGain();
  gain.gain.value = 0;

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 320;
  filter.Q.value = 0.7;

  const voices = [55, 55.4, 82.5].map((hz) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = hz;
    o.connect(filter);
    o.start();
    return o;
  });

  filter.connect(gain);
  gain.connect(ctx.destination);

  // Built at the first gesture that reaches us, which is usually enough. When
  // it is not — the context can still come up suspended — `resume` is how it
  // gets asked again on the next one.
  if (ctx.state === "suspended") void ctx.resume();

  return {
    setGain(value) {
      // Ramped, never stepped: a gain jump on a sustained tone is a click.
      gain.gain.setTargetAtTime(value * HEADROOM, ctx.currentTime, 0.25);
    },
    resume() {
      if (ctx.state === "suspended") void ctx.resume();
    },
    stop() {
      for (const o of voices) o.stop();
      void ctx.close();
    },
  };
}
