"use client";

import Lenis from "lenis";
import { useEffect, useRef, useState } from "react";
import { heightOf } from "./journey";
import { CRAFTER_URL, PORTAL_URL, REGISTER_URL } from "./links";
import { PortalCanvas } from "./portal-canvas";
import { browserGraph, createSoundscape } from "./soundscape";
import { scroll } from "./store";

const KICKOFF = new Date("2026-08-07T19:00:00-05:00").getTime();

function detectQuality(): "high" | "lite" {
  if (typeof window === "undefined") return "high";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 820;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  const lowMem = typeof mem === "number" && mem <= 4;
  return coarse || small || lowMem ? "lite" : "high";
}

function clockParts(now: number): string {
  const remaining = Math.max(0, KICKOFF - now);
  const d = Math.floor(remaining / 86_400_000);
  const h = Math.floor((remaining % 86_400_000) / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1000);
  const p = (v: number) => String(v).padStart(2, "0");
  return `${p(d)}:${p(h)}:${p(m)}:${p(s)}`;
}

// Scroll fraction across which the hero copy rides along then fades away.
// It holds until the walls are well up: leaving earlier opens a stretch with
// nothing to read right after we have asked the visitor to keep scrolling.
const HERO_FADE_START = 0.02;
const HERO_FADE_END = 0.09;

// Where the HUD hands over to the finale's own Register. Late on purpose: a
// depth readout that vanishes at 097 never gets to say the one number the whole
// thing is counting toward, so it holds until 100 is on screen and then goes.
const HUD_FADE_START = 0.985;
const HUD_FADE_END = 0.999;

/**
 * The five tracks, revealed one card at a time while you fly through the
 * streak field. Sides alternate so the cards never stack over the vanishing
 * point, which is where the eye is already pinned.
 *
 * Names and framing come from `docs/portal-experience-brief.md` §3–7, where
 * each track is a Portal capability rather than a theme we liked the sound of.
 * The brief is explicit that these are not ours to invent ("no filler feature
 * lists that don't map to a real Portal capability"), so change them there
 * first. Adding or removing one changes the `JUMP_*` thresholds in `store.ts`
 * — see the note there.
 */
const TRACKS = [
  {
    name: "MULTIPLAYER",
    copy: "Shared live rooms: channels, presence, chat.",
    side: "left",
  },
  {
    name: "LIVE STREAMING",
    copy: "Broadcast state to a crowd in realtime.",
    side: "right",
  },
  {
    name: "REAL-TIME LOCATION",
    copy: "Living maps, presence in space.",
    side: "left",
  },
  {
    name: "AI AGENTS",
    copy: "Autonomous agents acting on live signals.",
    side: "right",
  },
  {
    name: "WILD SIGNAL",
    copy: "Open realtime experiments without a category.",
    side: "left",
  },
] as const;

/**
 * The briefing content.
 *
 * Every line here is sourced, because the brief forbids the alternative in as
 * many words: "Reuse real event data from `src/lib/` where it exists; **do not
 * fabricate** schedule". The schedule rows come from `emails/_lib/event-details.ts`,
 * which is what the mentors and judges were actually sent — the Saturday
 * mentoring window, the Sunday 10:00 review, the 16:00–18:00 deliberation and
 * the 19:00 showcase are all quoted from there rather than imagined.
 *
 * Note what is deliberately absent: the judging *rubric*. `event-details.ts`
 * says "the official rubric … will be sent directly to confirmed judges", so it
 * is not public and it is not ours to summarise. The page says who judges and
 * when, and stops.
 *
 * The 39 hours are not a slogan either: kickoff Friday 19:00 to submissions
 * closing Sunday 10:00 is exactly 39 hours, which is the same window the
 * JSON-LD in `layout.tsx` publishes.
 */
const FORMAT_FACTS = [
  ["Window", "Fri 19:00 → Sun 10:00, 39 hours"],
  ["Teams", "1 to 4 people — entering alone is fine"],
  ["Where", "Online, in Discord"],
  ["Cost", "Free"],
  ["Ship", "A working product built with Portal"],
] as const;

const SCHEDULE = [
  ["Fri 19:00", "Kickoff."],
  ["Sat 09:00–21:00", "Mentor office hours, in the Discord channels."],
  ["Sun 10:00", "Submissions close. Judges begin reviewing."],
  ["Sun 16:00–18:00", "Judges deliberate and pick the winners."],
  ["Sun 19:00", "Top-five showcase and winners announced, on Discord."],
] as const;

const FAQ = [
  ["Do I need a team?", "No. Teams are one to four people, and one is a team."],
  ["What does it cost?", "Nothing. Registration is free."],
  [
    "Do I have to pick a track?",
    "Pick one, or ignore them all — Wild Signal exists for the things that fit nowhere.",
  ],
  [
    "How is it judged?",
    "Judges review every submission from Sunday 10:00 against the official criteria, then deliberate in the afternoon. Winners are announced at 19:00.",
  ],
  [
    "What are the prizes?",
    "US$800 in cash: US$500 for first, US$300 for second.",
  ],
] as const;

export function Experience() {
  const [mounted, setMounted] = useState(false);
  const [clock, setClock] = useState("--:--:--:--");
  const progressFill = useRef<HTMLDivElement>(null);
  const heroLayer = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const depthValue = useRef<HTMLSpanElement>(null);
  const [sound, setSound] = useState<"idle" | "on" | "off">("idle");
  // Built once and kept for the life of the page. The engine itself creates
  // nothing until `toggle` is first called from the button, so holding it here
  // costs an object and no audio machinery.
  // Lazily, so the factory runs once rather than on every render — the previous
  // `useRef(createSoundscape(...))` built one each time and threw all but the
  // first away, which the comment beside it claimed it did not.
  const soundscape = useRef<ReturnType<typeof createSoundscape> | null>(null);
  const engineOf = () => {
    soundscape.current ??= createSoundscape(browserGraph);
    return soundscape.current;
  };

  useEffect(() => {
    scroll.quality = detectQuality();
    document.documentElement.classList.add("xp");
    setMounted(true);

    // Resolved once, here, before the canvas mounts — every renderer reads
    // `scroll.reduce` rather than asking the platform itself.
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    scroll.reduce = reduce;
    const lenis = new Lenis({ smoothWheel: !reduce, lerp: reduce ? 1 : 0.09 });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      scroll.progress = lenis.progress || 0;
      scroll.velocity = lenis.velocity || 0;
      if (progressFill.current) {
        progressFill.current.style.transform = `scaleX(${scroll.progress})`;
      }

      // Hero copy: hold, then drift up + fade as the ride begins.
      const layer = heroLayer.current;
      if (layer) {
        const t = Math.min(
          1,
          Math.max(
            0,
            (scroll.progress - HERO_FADE_START) /
              (HERO_FADE_END - HERO_FADE_START),
          ),
        );
        layer.style.opacity = String(1 - t);
        layer.style.transform = reduce
          ? "none"
          : `translate3d(0, ${t * -6}vh, 0)`;
        layer.style.visibility = t >= 1 ? "hidden" : "visible";
      }

      // Depth readout. Written straight to the DOM rather than through state:
      // this runs every frame, and a re-render per frame would cost more than
      // everything else on the page put together.
      const depth = depthValue.current;
      if (depth) {
        const pct = String(Math.round(scroll.progress * 100)).padStart(3, "0");
        if (depth.textContent !== pct) depth.textContent = pct;
      }
      // The drone follows depth. It is silent — and does no work — until the
      // visitor has asked for it, so this runs unconditionally.
      soundscape.current?.setDepth(scroll.progress);

      // The HUD is bracketed by the two big CTAs and never overlaps either: it
      // waits for the hero's own Register to leave, and stands down again as
      // the finale's arrives. Its whole job is to offer a way out *during* the
      // ride — at the end the giant one is right there, and two Registers on
      // screen at once is just the page competing with itself.
      if (hud.current) {
        const inA = Math.min(
          1,
          Math.max(0, (scroll.progress - HERO_FADE_END) * 14),
        );
        const outA =
          1 -
          Math.min(
            1,
            Math.max(
              0,
              (scroll.progress - HUD_FADE_START) /
                (HUD_FADE_END - HUD_FADE_START),
            ),
          );
        const o = inA * outA;
        hud.current.style.opacity = String(o);
        // Not merely transparent: an invisible link is still clickable and
        // still in the tab order. The finale's own CTA takes over both jobs.
        hud.current.style.visibility = o < 0.02 ? "hidden" : "visible";
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onPointer = (e: PointerEvent) => {
      scroll.pointerMoved = true;
      scroll.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      scroll.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      soundscape.current?.dispose();
      lenis.destroy();
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.classList.remove("xp");
    };
  }, []);

  // Live countdown to kickoff.
  useEffect(() => {
    const update = () => setClock(clockParts(Date.now()));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <>
      {mounted ? <PortalCanvas /> : <div className="xp-stage" aria-hidden />}

      {/* 01 — HERO layer (fixed over the grid horizon). */}
      <div ref={heroLayer} className="xp-heroLayer">
        <h1 className="xp-display">The realtime hackathon</h1>
        <div className="xp-heroSub">
          <p className="xp-body">
            Build a live, multiplayer or agentic AI product with{" "}
            <strong>Portal</strong> in one weekend. August 7–9, online, teams of
            1–4. US$800 in prizes.{" "}
            <strong>Scroll to enter another dimension.</strong>
          </p>
          <a
            className="xp-register"
            href={REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Register free →
          </a>
        </div>
      </div>

      <main className="xp-overlay" id="top">
        {/* 02 — Ride the grid, into the curves. Long. */}
        <div
          className="xp-gap--ride"
          style={{ height: `${heightOf("ride")}svh` }}
          aria-hidden
        />

        {/* 02.5 — The jump: count down, punch into hyperspace, meet the
            tracks in the streaks. */}
        <section
          className="xp-section xp-section--beat"
          style={{ minHeight: `${heightOf("holdOn")}svh` }}
        >
          <p className="xp-label">Hold on</p>
          <p className="xp-beat-line xp-beat-line--wide">
            You are about to enter <strong>another dimension</strong>.
          </p>
        </section>
        {[3, 2, 1].map((n) => (
          <section
            className="xp-section xp-count"
            style={{ minHeight: `${heightOf(`count${n}`)}svh` }}
            key={n}
          >
            <p className="xp-count__n">{n}</p>
          </section>
        ))}
        <div
          className="xp-gap--jump"
          style={{ height: `${heightOf("jump")}svh` }}
          aria-hidden
        />

        <section
          className="xp-section xp-section--beat xp-tracksIntro"
          style={{ minHeight: `${heightOf("tracksIntro")}svh` }}
        >
          <p className="xp-label">Five tracks</p>
          <p className="xp-beat-line">
            Pick one, or ignore them all. <strong>Ship something live.</strong>
          </p>
        </section>
        {TRACKS.map((track, i) => (
          <section
            className={`xp-section xp-trackSlot xp-trackSlot--${track.side}`}
            style={{ minHeight: `${heightOf(`track${i + 1}`)}svh` }}
            key={track.name}
          >
            <article className="xp-trackCard">
              <p className="xp-trackCard__head">
                <span>{track.name}</span>
                <span className="xp-trackCard__n">
                  [{String(i + 1).padStart(2, "0")}]
                </span>
              </p>
              <p className="xp-trackCard__copy">{track.copy}</p>
            </article>
          </section>
        ))}
        <div
          className="xp-gap--jumpOut"
          style={{ height: `${heightOf("jumpOut")}svh` }}
          aria-hidden
        />

        {/* 03 — The curve closes: PRIZES appear. */}
        <section
          className="xp-section xp-section--beat"
          style={{ minHeight: `${heightOf("prizes")}svh` }}
        >
          <p className="xp-label">Prizes</p>
          <h2 className="xp-huge">US$800</h2>
          <p className="xp-beat-line">
            <strong>1st — US$500</strong> · <strong>2nd — US$300</strong> ·
            cash, no strings
          </p>
        </section>

        {/* 04 — Through the tunnel. */}
        <div
          className="xp-gap--tunnel"
          style={{ height: `${heightOf("tunnel")}svh` }}
          aria-hidden
        />

        {/* 05 — COUNTDOWN, live. */}
        <section
          className="xp-section xp-section--beat"
          style={{ minHeight: `${heightOf("kickoff")}svh` }}
        >
          <p className="xp-label">Kickoff</p>
          <p className="xp-clock">
            {clock}
            <small>
              DAYS : HOURS : MINUTES : SECONDS — FRI AUG 07, 19:00 LIMA
            </small>
          </p>
        </section>

        {/* 05.5 — Into the wormhole: the grid folds into the vortex. */}
        <div
          className="xp-gap--wormhole"
          style={{ height: `${heightOf("wormhole")}svh` }}
          aria-hidden
        />
        <section
          className="xp-section xp-section--beat"
          style={{ minHeight: `${heightOf("anotherDimension")}svh` }}
        >
          <p className="xp-label">Another dimension</p>
          <h2 className="xp-huge xp-huge--outline">Warp</h2>
          <p className="xp-beat-line">
            The grid folds into a wormhole. <strong>Keep falling.</strong>
          </p>
        </section>

        {/* 05.75 — THE OTHER SIDE. The beat the page was missing: the tube
            opens, the vortex is behind you, and the ground comes back. A
            portal you fall into and never come out of is not a portal. */}
        <div
          className="xp-gap--emerge"
          style={{ height: `${heightOf("emerge")}svh` }}
          aria-hidden
        />
        <section
          className="xp-section xp-section--beat"
          style={{ minHeight: `${heightOf("otherSide")}svh` }}
        >
          <p className="xp-label">The other side</p>
          <h2 className="xp-huge">You&rsquo;re through</h2>
          <p className="xp-beat-line">
            Open country, and a weekend to build in it.{" "}
            <strong>This is where it starts.</strong>
          </p>
        </section>

        {/* 05.9 — THE BRIEFING. Brief spine 9, and the largest gap the page
            had: a hackathon page with no schedule, no format and no answer to
            "do I need a team" is missing the things somebody actually needs
            before they register. It sits here, on the open ground after the
            ride, because this is where the spectacle stops and the practical
            questions start — and because the stretch was empty scroll anyway. */}
        <div
          className="xp-gap--brief"
          style={{ height: `${heightOf("brief")}svh` }}
          aria-hidden
        />
        <section
          className="xp-section xp-section--panel"
          style={{ minHeight: `${heightOf("format")}svh` }}
        >
          <p className="xp-label">The format</p>
          <h2 className="xp-panel__head">39 hours, start to submission</h2>
          <dl className="xp-facts">
            {FORMAT_FACTS.map(([term, value]) => (
              <div className="xp-facts__row" key={term}>
                <dt>{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="xp-section xp-section--panel"
          style={{ minHeight: `${heightOf("schedule")}svh` }}
        >
          <p className="xp-label">Schedule</p>
          <h2 className="xp-panel__head">All times Lima, UTC&minus;5</h2>
          <ol className="xp-schedule">
            {SCHEDULE.map(([when, what]) => (
              <li className="xp-schedule__row" key={when}>
                <span className="xp-schedule__when">{when}</span>
                <span className="xp-schedule__what">{what}</span>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="xp-section xp-section--panel"
          style={{ minHeight: `${heightOf("questions")}svh` }}
        >
          <p className="xp-label">Questions</p>
          <h2 className="xp-panel__head">Before you register</h2>
          <dl className="xp-faq">
            {FAQ.map(([q, a]) => (
              <div className="xp-faq__row" key={q}>
                <dt>{q}</dt>
                <dd>{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* 06 — FINALE: the wire hand + giant register, standing in the open. */}
        <div
          className="xp-gap--arrive"
          style={{ height: `${heightOf("arrive")}svh` }}
          aria-hidden
        />
        <section
          className="xp-section xp-finale"
          style={{ minHeight: `${heightOf("finale")}svh` }}
        >
          <h2 className="xp-huge xp-huge--outline">Register</h2>
          <p className="xp-beat-line">
            Aug 07–09 · online · teams of 1–4 · free
          </p>
          <a
            className="xp-register xp-register--giant"
            href={REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Register free →
          </a>
          {/* Brief §spine 10 asks the finale to carry the organiser credit. It
              went missing with `partner-links.tsx` and nothing replaced it. */}
          <p className="xp-colophon">
            Built by{" "}
            <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer">
              Portal
            </a>{" "}
            and{" "}
            <a href={CRAFTER_URL} target="_blank" rel="noopener noreferrer">
              Crafter Station
            </a>
          </p>
        </section>
      </main>

      {/*
        Depth readout, a Register that is always there, and the sound control.

        Two problems, one element. The page had exactly two focusable things,
        both "Register free": one visible for the first tenth of the scroll and
        the next at the very end — so for most of the ride there was no way to
        act and no way to tab to anything. And the reference asks for "a live %
        of scroll depth in a fixed corner, framing the page as literal transit
        through the portal", which is the same corner and the same idea.

        The sound control sits in this row and does *not* fade with it. The row
        stands down at the finale so it stops competing with the giant Register,
        but the drone is still audible there and a control that disappears while
        the thing it controls is running is not reversible. So the fade is
        applied to the readout and the CTA rather than to the row — which also
        means the button's position is a flex item rather than a guessed offset.
        The guess is what put it on top of the readout.
      */}
      <div className="xp-hud">
        <div ref={hud} className="xp-hud__fading">
          <p className="xp-hud__read">
            <span ref={depthValue} className="xp-hud__depth">
              000
            </span>
            <span className="xp-hud__unit">% depth</span>
          </p>
          <a
            className="xp-register xp-register--sm"
            href={REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Register free →
          </a>
        </div>
        <button
          type="button"
          className="xp-hud__sound"
          // `aria-pressed` already carries the state. Flipping the name as well
          // made it announce "turn ambient sound off, pressed" — the state said
          // twice, once as a verb. The name is the thing; pressed is the state.
          aria-pressed={sound === "on"}
          aria-label="Ambient sound"
          onClick={() => {
            const engine = engineOf();
            engine.toggle();
            setSound(engine.state());
          }}
        >
          <span aria-hidden>{sound === "on" ? "◼◼◼" : "◼──"}</span>
        </button>
      </div>

      <div className="xp-progress" aria-hidden>
        <div ref={progressFill} className="xp-progress__fill" />
      </div>
    </>
  );
}
