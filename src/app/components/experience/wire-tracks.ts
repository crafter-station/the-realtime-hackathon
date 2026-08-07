/**
 * What each track looks like, as maths.
 *
 * Five behaviours over one point set. The page sells five Portal capabilities
 * and used to do it with five cards read against a single streak field — which
 * meant the world was the same behind all of them, and the only thing that
 * distinguished MULTIPLAYER from AI AGENTS was fifteen words of mono type.
 *
 * So the world does the distinguishing instead. Each track owns a span of camera
 * z (`trackBand` in `journey.ts`, derived from the card's own scroll budget) and
 * inside that span the surface behaves like the thing being sold: presence
 * arriving in rooms, a broadcast propagating, movement over a map, agents acting
 * on their own, and then no pattern at all.
 *
 * ONE ENERGY, FIVE VARIATIONS — NOT FIVE SCENES
 *
 * `docs/portal-experience-brief.md` is explicit that each world should be "a
 * variation of that energy, not a different theme", and this is the cheap way to
 * honour it: same point cloud, same white, same size, same material. What
 * changes is where the points are and when they are bright. Five distinct WebGL
 * scenes would cost five times the geometry and would read as five different
 * websites.
 *
 * WHITE, DELIBERATELY
 *
 * `wire-light.tsx` states the rule: orange is emitted, exists at exactly two
 * places, and everywhere else the world is white hairlines on black. A signal
 * layer that tinted itself per track would be the fastest way to turn that into
 * a colour scheme, so brightness is the only channel these five have.
 *
 * STATELESS BY CONSTRUCTION
 *
 * Every behaviour is a pure function of (point index, elapsed time). No
 * integration, no velocity carried between frames, nothing to reset when a tab
 * is backgrounded and `dt` arrives as 900ms. That is also what lets this be
 * tested: `wire-tracks.test.ts` can assert what a band looks like at t = 4s
 * without a canvas.
 */

import { trackBand, trackCount } from "./journey";
import { clamp01, smoothstep } from "./wire-surface";

/** Lateral half-extent of the signal layer, inside the grid's own 42.4. */
export const LANE = 34;

/** Deterministic, cheap, and good enough for scatter. Never `Math.random`. */
export function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * A point's fixed identity. Baked once; the behaviours read it every frame.
 *
 * `u` and `v` are its place in the band as a unit square — lateral and depth —
 * and `r` is an independent draw used wherever a behaviour needs a rank or a
 * seed that must not correlate with position. They were one value at first, and
 * the room-occupancy behaviour below filled its rooms strictly left to right
 * because of it.
 */
export type Mote = {
  band: number;
  u: number;
  v: number;
  r: number;
};

/** Where a mote is right now, in band-local coordinates, and how bright. */
export type Signal = {
  /** Lateral offset from the centreline, world units. */
  s: number;
  /** Depth into the band, 0 at its near edge, world units. */
  d: number;
  /** 0..1. */
  bright: number;
};

/**
 * The point set, spread evenly over the bands.
 *
 * A golden-ratio walk rather than `Math.random`, matching `wire-world.tsx`: even
 * at every scale, and identical on every load, so the field never clumps and
 * never differs between reloads.
 */
export function buildMotes(count: number): Mote[] {
  const bands = trackCount();
  const PHI = 0.618_033_988_75;
  const motes: Mote[] = [];
  for (let i = 0; i < count; i += 1) {
    motes.push({
      band: i % bands,
      u: (i * PHI) % 1,
      v: (Math.floor(i / bands) * PHI) % 1,
      r: hash(i * 1.37),
    });
  }
  return motes;
}

// ---------------------------------------------------------------------------
// [01] MULTIPLAYER — shared live rooms
// ---------------------------------------------------------------------------

const ROOMS = 6;

/**
 * Rooms that fill and empty.
 *
 * The capability is channels and presence, so the read has to be *people
 * arriving in a shared place* rather than lights blinking. Two things carry it:
 * the points are clustered rather than scattered, which is what makes a room a
 * room; and a room's occupancy rises and falls as a whole, with individual motes
 * crossing the threshold at their own rank — so a room fills in, holds, and
 * drains, instead of strobing in unison.
 *
 * `r` rather than `u` decides the rank. With `u` — which is also the mote's
 * lateral position — every room filled strictly left to right, which reads as a
 * wipe, and a wipe is the *next* track.
 */
function multiplayer(m: Mote, t: number, depth: number): Signal {
  const room = Math.floor(m.r * ROOMS);
  const cs = (hash(room * 3.7 + 0.5) - 0.5) * 2 * LANE * 0.78;
  const cd = depth * (0.16 + 0.68 * hash(room * 9.1 + 1.5));
  const occupancy = 0.32 + 0.5 * Math.sin(t * 0.5 + hash(room * 5.3) * 6.283);
  const present = smoothstep(occupancy + 0.06, occupancy - 0.06, m.u);
  const breath = 0.82 + 0.18 * Math.sin(t * 3.1 + m.r * 21.7);
  return {
    s: cs + (m.v - 0.5) * 10.5,
    d: cd + (m.u - 0.5) * 10.5,
    bright: 0.05 + 0.95 * present * breath,
  };
}

// ---------------------------------------------------------------------------
// [02] LIVE STREAMING — broadcast state to a crowd
// ---------------------------------------------------------------------------

const WAVE_PERIOD = 44; // world units between wavefronts
const WAVE_SPEED = 27; // world units per second

/**
 * One source, rings going out.
 *
 * Broadcast is the only one of the five with a *direction of causation*, so the
 * geometry has to show a single origin and everything else reacting to it. The
 * source sits mid-band on the centreline and stays lit; the crowd is an even
 * field that only brightens as a front passes through it.
 *
 * The depth term is scaled by 0.82 rather than left round, because a circular
 * wavefront on a surface seen at a raking angle foreshortens into something that
 * reads as an ellipse pointing away from you. Squashing it in z puts it back.
 */
function streaming(m: Mote, t: number, depth: number): Signal {
  const s = (m.u - 0.5) * 2 * LANE;
  const d = m.v * depth;
  const srcD = depth * 0.5;
  const dist = Math.hypot(s, (d - srcD) * 0.82);
  const phase = dist - t * WAVE_SPEED;
  const off = ((phase % WAVE_PERIOD) + WAVE_PERIOD) % WAVE_PERIOD;
  const front = Math.exp(-(off * off) / 46);
  // The source itself never goes dark — a broadcast with no broadcaster in
  // frame is just weather.
  const atSource = 1 - smoothstep(2, 9, dist);
  return { s, d, bright: clamp01(0.06 + 0.9 * front + atSource) };
}

// ---------------------------------------------------------------------------
// [03] REAL-TIME LOCATION — living maps, presence in space
// ---------------------------------------------------------------------------

const STREET = 8.5;

/**
 * A map with things moving on it.
 *
 * The static part is what makes this legible as *location* rather than as drift:
 * motes snap to a coarse lattice, so the band reads as streets before anything
 * has moved. Then one mote in four leaves the lattice and travels along it, half
 * of them down a lane and half across, at their own speeds.
 *
 * Snapping in both axes and keeping the movers *on* the snapped lines is the
 * whole effect. Movers on free paths over a lattice read as insects over a grid;
 * movers constrained to the lattice read as traffic.
 */
function location(m: Mote, t: number, depth: number): Signal {
  const laneS = Math.round(((m.u - 0.5) * 2 * LANE) / STREET) * STREET;
  // Floored rather than rounded, so the outermost lane cannot sit past the
  // band's far edge. Rounding put it up to half a street beyond, which sends
  // traffic from this band drifting into the one in front of it — invisible
  // most of the time and exactly the sort of thing that becomes a bug when a
  // band is shortened.
  const laneD = Math.min(Math.floor((m.v * depth) / STREET) * STREET, depth);
  const moving = m.r > 0.74;
  if (!moving) return { s: laneS, d: laneD, bright: 0.15 };
  const speed = 5.5 + 6 * hash(m.r * 17.3);
  const travel = t * speed + m.r * 320;
  if (hash(m.r * 41.9) < 0.5) {
    return { s: laneS, d: ((travel % depth) + depth) % depth, bright: 0.95 };
  }
  const span = 2 * LANE;
  return {
    s: (((travel % span) + span) % span) - LANE,
    d: laneD,
    bright: 0.95,
  };
}

// ---------------------------------------------------------------------------
// [04] AI AGENTS — autonomous agents acting on live signals
// ---------------------------------------------------------------------------

const AGENTS = 9;
const TRAIL = 16;
const TRAIL_STEP = 0.085; // seconds between trail samples

/**
 * A few things moving under their own steam, over a field of signals.
 *
 * Autonomy has to be visible as *decision*, which means the paths cannot be
 * straight and cannot be periodic in an obvious way. Two sines at incommensurate
 * frequencies per axis give a wander that never quite repeats and never looks
 * random either — it looks like something choosing.
 *
 * The trail is the same path sampled backwards in time, which is why this can
 * stay stateless: a mote's position is `path(agent, t - k·step)` and its
 * brightness falls with `k`. No history buffer, nothing to seed, and scrubbing
 * the scroll bar backwards does not corrupt anything.
 *
 * The motes that are not part of an agent are the live signals being acted on —
 * dim, still, and occasionally consumed as an agent passes over them. That
 * relationship is the actual claim of the track, so it is the one interaction
 * worth paying for.
 */
function agentPath(a: number, tt: number, depth: number): [number, number] {
  const f1 = 0.128 + 0.052 * hash(a * 1.7);
  const f2 = 0.079 + 0.041 * hash(a * 4.2 + 2);
  const s =
    Math.sin(tt * f1 * 6.283 + a * 2.1) * LANE * 0.66 +
    Math.sin(tt * f2 * 10.7 + a * 5.5) * LANE * 0.22;
  const dNorm =
    0.5 +
    0.4 * Math.sin(tt * f2 * 6.283 + a * 3.3) +
    0.07 * Math.sin(tt * f1 * 14.4 + a * 1.2);
  return [s, clamp01(dNorm) * depth];
}

function agents(m: Mote, t: number, depth: number, index: number): Signal {
  const slot = index % (AGENTS * TRAIL);
  const isAgent = m.r > 0.62;
  if (isAgent) {
    const a = slot % AGENTS;
    const k = Math.floor(slot / AGENTS) % TRAIL;
    const [s, d] = agentPath(a, t - k * TRAIL_STEP, depth);
    return { s, d, bright: (1 - k / TRAIL) ** 1.7 };
  }
  // A live signal, waiting to be acted on. It brightens when an agent is on it.
  const s = (m.u - 0.5) * 2 * LANE;
  const d = m.v * depth;
  let near = 0;
  for (let a = 0; a < AGENTS; a += 1) {
    const [ax, ad] = agentPath(a, t, depth);
    const reach = 1 - smoothstep(3, 13, Math.hypot(s - ax, d - ad));
    if (reach > near) near = reach;
  }
  return { s, d, bright: 0.1 + 0.85 * near };
}

// ---------------------------------------------------------------------------
// [05] WILD SIGNAL — open experiments without a category
// ---------------------------------------------------------------------------

const JUMP_RATE = 1.9; // position re-rolls per second

/**
 * No pattern, and that is the content.
 *
 * The other four are legible systems; this one is the track for things that fit
 * nowhere, so it has to be the one place the surface refuses to organise itself.
 * Motes jump to new positions on a shared clock and light up incoherently — no
 * cluster, no front, no lattice, no path.
 *
 * The jump is quantised rather than continuous on purpose. Smooth noise reads as
 * a substance (fog, water, a field); discontinuous noise reads as *signal*, and
 * signal is the word on the card.
 */
function wild(m: Mote, t: number, depth: number, index: number): Signal {
  const tick = Math.floor(t * JUMP_RATE);
  const jx = hash(index * 1.7 + tick * 13.7);
  const jz = hash(index * 3.1 + tick * 31.1);
  const lit = hash(index * 0.77 + tick * 7.3);
  const flick = 0.55 + 0.45 * Math.sin(t * 19 + index);
  return {
    s: ((m.u - 0.5) * 2 * LANE + (jx - 0.5) * 13) * 0.98,
    d: clamp01(m.v + (jz - 0.5) * 0.16) * depth,
    bright: lit > 0.7 ? 0.35 + 0.65 * flick : 0.04,
  };
}

// ---------------------------------------------------------------------------

/**
 * One shape for all five, so the table below can be indexed.
 *
 * Three of them ignore `index` — a function of fewer parameters is assignable to
 * this, which is the whole reason the type is declared rather than inferred. An
 * inferred union of a 3-arity and a 4-arity signature cannot be called with four
 * arguments at all.
 */
type Behaviour = (m: Mote, t: number, depth: number, index: number) => Signal;

const BEHAVIOURS: readonly Behaviour[] = [
  multiplayer,
  streaming,
  location,
  agents,
  wild,
];

/**
 * The whole layer, one mote at a time.
 *
 * Returns band-local coordinates; the renderer converts `d` to world z against
 * the band's own near edge and pipes `s` through `surfacePoint`, so the signal
 * sits on the surface rather than floating over it. That last part matters more
 * than it sounds: the tracks are the page's most important copy, and a layer
 * drawn *between* the reader and the words is exactly the mistake the streak
 * field was making.
 */
export function signalOf(m: Mote, index: number, t: number): Signal {
  const band = trackBand(m.band + 1);
  const depth = band.from - band.to;
  const behaviour = BEHAVIOURS[m.band % BEHAVIOURS.length];
  return behaviour(m, t, depth, index);
}

/**
 * How alive a band is, given where the camera is standing.
 *
 * Fades in as the band comes inside the fog's far plane at 105 units, holds
 * while it is the subject, and is out 40 units after the camera has left it.
 * Without the tail the band behind you keeps animating at full strength in the
 * corner of the frame while the next card is being read.
 */
export function bandFocus(band: number, camZ: number): number {
  const { from, to } = trackBand(band + 1);
  return (
    smoothstep(from + 132, from + 72, camZ) *
    (1 - smoothstep(to, to - 40, camZ))
  );
}
