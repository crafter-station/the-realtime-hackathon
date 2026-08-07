"use client";

import Lenis from "lenis";
import { useEffect, useRef, useState } from "react";
import { Gate } from "./gate";
import { heightOf, reducedSvh } from "./journey";
import {
  CRAFTER_URL,
  PORTAL_DOCS_URL,
  PORTAL_URL,
  REGISTER_URL,
} from "./links";
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

function remainingParts(now: number) {
  const remaining = Math.max(0, KICKOFF - now);
  return {
    d: Math.floor(remaining / 86_400_000),
    h: Math.floor((remaining % 86_400_000) / 3_600_000),
    m: Math.floor((remaining % 3_600_000) / 60_000),
    s: Math.floor((remaining % 60_000) / 1000),
  };
}

/** `DD:HH:MM:SS`, tabular, for the HUD. */
function clockParts(now: number): string {
  const { d, h, m, s } = remainingParts(now);
  const p = (v: number) => String(v).padStart(2, "0");
  return `${p(d)}:${p(h)}:${p(m)}:${p(s)}`;
}

/**
 * The same countdown, in words.
 *
 * Four zero-padded pairs separated by colons is a legible clock and an opaque
 * string: read aloud it is "twelve, oh four, thirty-three, oh seven", which
 * names neither the units nor what is being counted toward. The full-width
 * countdown this replaces carried a `DAYS : HOURS : MINUTES : SECONDS` legend
 * underneath it and there is no room for one in a corner HUD.
 *
 * So the digits are decorative and this is the real text. Seconds are left out
 * deliberately — it is not a live region, so nothing is announced
 * spontaneously, and a sentence that changes sixty times a minute is a sentence
 * that is different by the time it has finished being read.
 */
function spokenRemaining(now: number): string {
  const { d, h, m } = remainingParts(now);
  if (d + h + m === 0) return "Kickoff is now.";
  const unit = (v: number, name: string) =>
    v === 1 ? `1 ${name}` : `${v} ${name}s`;
  const parts = [
    ...(d > 0 ? [unit(d, "day")] : []),
    ...(h > 0 ? [unit(h, "hour")] : []),
    ...(m > 0 ? [unit(m, "minute")] : []),
  ];
  const list =
    parts.length > 1
      ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
      : parts[0];
  return `${list} until kickoff, Friday 7 August at 19:00 Lima time.`;
}

// Scroll fraction across which the hero copy rides along then fades away.
// It holds until the walls are well up: leaving earlier opens a stretch with
// nothing to read right after we have asked the visitor to keep scrolling.
const HERO_FADE_START = 0.02;
const HERO_FADE_END = 0.09;

// Where the HUD's small Register hands over to the finale's own. Late on
// purpose — the two must never be on screen together, and the finale's is the
// one that should win, so this waits until it is genuinely arriving.
const HUD_FADE_START = 0.985;
const HUD_FADE_END = 0.999;

/**
 * The five tracks, one card at a time. Sides alternate so the cards never stack
 * over the vanishing point, which is where the eye is already pinned.
 *
 * Names and framing come from `docs/portal-experience-brief.md` §3–7, where
 * each track is a Portal capability rather than a theme we liked the sound of.
 * The brief is explicit that these are not ours to invent ("no filler feature
 * lists that don't map to a real Portal capability"), so change them there
 * first.
 *
 * Each card now has a world behind it that demonstrates what it claims —
 * `wire-tracks.ts` holds the five behaviours and `trackBand` in `journey.ts`
 * derives each one's span of camera z from these very stretches. So adding a
 * sixth track means a sixth entry here, a sixth `track6` in `BUDGET`, and a
 * sixth behaviour there; the geometry follows on its own.
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
  /*
    The question the page asked people to answer for themselves.

    Five questions and not one of them was about the thing you have to build
    with. The page says "a working product built with Portal" in the format
    panel, names Portal in the hero, and published no route to its
    documentation — so the one practical unknown a developer has before Friday
    ("what is this, and do I need to set anything up") had no answer here. The
    link is the answer; the sentence is so the link has a reason to be clicked.
  */
  [
    "Do I need a Portal account?",
    "Yes, and it is free to start. Set it up before Friday so kickoff is spent building — the docs are the fastest way in.",
  ],
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
  /*
    Not a link, on purpose. AGENTS.md forbids committing Discord invites, and the
    schedule names Discord three times — mentor office hours, submissions, the
    showcase — so a visitor could reasonably read "online, in Discord" and go
    looking for a way in that this repository is not allowed to publish. Saying
    where it comes from costs a line and closes the loop.
  */
  [
    "How do I get into the Discord?",
    "The invite comes with your registration. Everything — mentors, submissions, the showcase — happens in there.",
  ],
] as const;

export function Experience() {
  const [mounted, setMounted] = useState(false);
  /*
    The gate is up until it is pressed, and it starts closed for everyone who
    has JavaScript.

    Deliberately not remembered across visits. A gate that only some visitors
    see is a page with two first frames, and the one it is easiest to stop
    testing is the one most people get. It costs a click; the click is the beat.
  */
  const [started, setStarted] = useState(false);
  // Held so the gate can stop and start it. The mount effect owns its life.
  const smoothScroll = useRef<Lenis | null>(null);
  const [clock, setClock] = useState("--:--:--:--");
  const [spoken, setSpoken] = useState("Counting down to kickoff.");
  const progressFill = useRef<HTMLDivElement>(null);
  const heroLayer = useRef<HTMLElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const [sound, setSound] = useState<"idle" | "on" | "off">("idle");
  /*
    `scroll.reduce` is read by the renderers inside the frame loop, which never
    re-renders React. The section heights are rendered markup, so they need the
    same fact as state — resolved in the same place, from the same query, so the
    two cannot disagree.
  */
  const [reduce, setReduce] = useState(false);
  // The part of the HUD that is allowed to leave at the finale. The row itself
  // stays, because the sound control lives in it and the drone outlasts the
  // ride.
  const fading = useRef<HTMLDivElement>(null);
  // Built once and kept for the life of the page, lazily so the factory runs
  // once rather than on every render — the previous `useRef(createSoundscape(…))`
  // built one each time and threw all but the first away, which the comment
  // beside it claimed it did not.
  const soundscape = useRef<ReturnType<typeof createSoundscape> | null>(null);
  /** How tall a stretch is for this visitor. The ride, or the document. */
  const span = (id: string) => (reduce ? reducedSvh(id) : heightOf(id));

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
    setReduce(reduce);
    const lenis = new Lenis({ smoothWheel: !reduce, lerp: reduce ? 1 : 0.09 });
    smoothScroll.current = lenis;
    /*
      Locked behind the gate, two ways, because they stop different things.

      `lenis.stop()` holds the smooth-scroll loop, which is what drives the
      camera. The class adds `overflow: hidden`, which is what stops a trackpad
      or a keyboard `End` from moving the document underneath the overlay — a
      thing you cannot see scrolling behind a thing you can is the sort of
      detail that makes a gate feel broken rather than deliberate.
    */
    lenis.stop();
    document.documentElement.classList.add("xp-locked");

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

      // The drone follows depth. It is silent — and does no work — until the
      // visitor has asked for it, so this runs unconditionally.
      soundscape.current?.setDepth(scroll.progress);

      // The HUD's Register is bracketed by the two big CTAs and never overlaps
      // either: it waits for the hero's own to leave, and stands down again as
      // the finale's arrives. Its whole job is to offer a way out *during* the
      // ride — at the end the giant one is right there, and two Registers on
      // screen at once is just the page competing with itself. The clock is
      // outside this wrapper and never leaves.
      if (fading.current) {
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
        fading.current.style.opacity = String(o);
        // Not merely transparent: an invisible link is still clickable and
        // still in the tab order. The finale's own CTA takes over both jobs.
        fading.current.style.visibility = o < 0.02 ? "hidden" : "visible";
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

    /*
      The room turns itself on.

      It used to wait for someone to find a 2.3rem button, which meant almost
      nobody heard it. It cannot start any earlier than a gesture — a context
      built outside one is born suspended and never plays — so the first gesture
      of any kind is the earliest "always" a browser permits.

      Listening to more than the obvious events on purpose: this page is driven
      by scrolling, and `wheel` and `scroll` are not user-activation triggers.
      Somebody who only trackpad-scrolls can reach the bottom having never
      unlocked audio, so every plausible gesture gets a try, and `nudge` asks a
      still-suspended context again. Both calls are no-ops once it is running,
      and `start` only acts from `idle` — so a visitor who mutes by hand is not
      overruled by their next click.
    */
    const WAKERS = ["pointerdown", "keydown", "touchend", "click"] as const;
    const wake = () => {
      // The ref rather than `engineOf`, so this mount-once effect does not take
      // a dependency on a closure that is rebuilt every render.
      soundscape.current ??= createSoundscape(browserGraph);
      const engine = soundscape.current;
      engine.start();
      engine.nudge();
      setSound(engine.state());
    };
    for (const type of WAKERS) {
      window.addEventListener(type, wake, { passive: true });
    }

    return () => {
      cancelAnimationFrame(raf);
      soundscape.current?.dispose();
      lenis.destroy();
      smoothScroll.current = null;
      document.documentElement.classList.remove("xp-locked");
      window.removeEventListener("pointermove", onPointer);
      for (const type of WAKERS) window.removeEventListener(type, wake);
      document.documentElement.classList.remove("xp");
    };
  }, []);

  /*
    Pressing Start hands the page back.

    Its own effect rather than work done in the click handler, because the lock
    is set up in the mount effect and this is the other half of that pair — the
    two belong next to each other in the reader's head even though React puts
    them in different callbacks. It also means a `started` set any other way
    (a test, a future skip) unlocks correctly.

    The scroll is pinned to the top on the way through. Browsers restore scroll
    position on reload, so a refresh halfway down the ride would otherwise put
    the gate over a page already at 40% and drop you there when it lifted.
  */
  useEffect(() => {
    if (!started) return;
    document.documentElement.classList.remove("xp-locked");
    window.scrollTo(0, 0);
    smoothScroll.current?.scrollTo(0, { immediate: true });
    smoothScroll.current?.start();
  }, [started]);

  // Live countdown to kickoff. One re-render a second, and it is cheap because
  // the only thing that reads these two is the HUD row.
  useEffect(() => {
    const update = () => {
      const now = Date.now();
      setClock(clockParts(now));
      setSpoken(spokenRemaining(now));
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <>
      {mounted ? <PortalCanvas /> : <div className="xp-stage" aria-hidden />}

      {/*
        The gate, over everything, until it is pressed.

        Behind `mounted` for the same reason the canvas is: it draws WebGL and
        it locks scrolling, and neither belongs in server-rendered output where
        a visitor without JavaScript would get the lock and never the control
        that lifts it. No JS means no gate and the landing straight away, which
        is the right fallback rather than a degraded one.
      */}
      {mounted && !started ? <Gate onStart={() => setStarted(true)} /> : null}

      {/*
        The way out, for anyone who cannot or does not want to travel ~20,000px
        to reach it.

        The ride is the point of this page, so nothing here shortens it — but a
        keyboard or screen-reader user arriving at the top had no route to the
        one action the page exists for except the whole journey. First focusable
        thing on the page, invisible until focused.
      */}
      <a className="xp-skip" href="#register" inert={!started}>
        Skip the ride, go to register
      </a>

      {/* 01 — HERO layer (fixed over the grid horizon). A banner landmark: it
          holds the page title and the first call to action, and `<main>` was
          the only landmark on the page before it. */}
      <header ref={heroLayer} className="xp-heroLayer" inert={!started}>
        {/*
          Who is behind this, in the frame where people decide whether to care.

          The credit existed only in the colophon at 100% depth — so a page whose
          entire proposition is "build with Portal" never showed a Portal mark
          until after the ride was over, and Crafter Station never at all above
          the fold. Set as a wordmark line rather than an image: there is no logo
          asset in `public/brand-assets/` cleared for use at this size, and the
          type *is* the brand here — `visual-reference.md` gives Space Grotesk the
          wordmark.
        */}
        <p className="xp-heroBrand">
          <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer">
            Portal
          </a>
          <span aria-hidden>×</span>
          <a href={CRAFTER_URL} target="_blank" rel="noopener noreferrer">
            Crafter Station
          </a>
        </p>
        <h1 className="xp-display">The realtime hackathon</h1>
        <div className="xp-heroSub">
          {/*
            SPLIT, BECAUSE ONE SENTENCE WAS DOING FIVE JOBS

            It read: what you build, who with, how long, the date, the format,
            the prize, and an instruction to scroll — in three lines, with two
            `<strong>`s carrying unrelated weight. "Portal" was emphasis-as-brand
            and "Scroll to enter another dimension" was emphasis-as-instruction,
            so the one visual signal on the block meant two different things and
            neither stood out.

            Now: a proposition and the instruction, with the facts lifted out into
            a metadata line where a date can actually be found. The date used to be
            the fourth clause of a sentence, which on an event page is the one fact
            that should never need reading for.

            "Portal" loses its bold — the wordmark line above it now says who this
            is, so the emphasis was repeating a fact that is already the loudest
            thing in the block. That leaves one `<strong>` meaning one thing.

            The scroll sentence stays in the copy and is not decoration: `.xp-cue`
            below is `aria-hidden` precisely because this line is what tells a
            screen reader that scrolling drives the page. Dropping it would have
            left that promise unkept and the cue speaking to nobody.
          */}
          <p className="xp-body">
            Build a live, multiplayer or agentic AI product with Portal in one
            weekend. <strong>Scroll to enter another dimension.</strong>
          </p>
          <p className="xp-heroMeta">
            <span>Aug 7–9, 2026</span>
            <span>Online</span>
            <span>Teams of 1–4</span>
            <span>US$800 in prizes</span>
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

        {/*
          The one thing the page never said in its own language.

          Everything here is driven by scrolling and the only signal to scroll
          was a sentence inside the body copy. There was CSS for a cue and no
          markup — it was planned and never built, and the orphaned rules were
          swept out with the rest of the previous design.

          Decorative on purpose: the sentence above already tells a screen reader
          what to do, and a second voice saying "scroll" is noise. It rides the
          hero, so it leaves exactly when the hero does.
        */}
        <div className="xp-cue" aria-hidden>
          <span className="xp-cue__label">Scroll</span>
          <span className="xp-cue__rail" />
        </div>
      </header>

      <main className="xp-overlay" id="top" inert={!started}>
        {/* 02 — The approach and the fall into the well. */}
        <div
          className="xp-gap--ride"
          style={{ height: `${span("ride")}svh` }}
          aria-hidden
        />

        {/* 02.5 — The crossing. Sealed at MOUTH_SHUT, open again at FLARE_END,
            and the only stretch on the page with no sky. No copy in it on
            purpose: the hero already said "scroll to enter another dimension",
            and a caption over the one moment the page is built around would be
            the page explaining its own joke. */}
        <div
          className="xp-gap--through"
          style={{ height: `${span("through")}svh` }}
          aria-hidden
        />

        <section
          className="xp-section xp-section--beat xp-tracksIntro"
          style={{ minHeight: `${span("tracksIntro")}svh` }}
        >
          <h2 className="xp-label">Five tracks</h2>
          <p className="xp-beat-line">
            Pick one, or ignore them all. <strong>Ship something live.</strong>
          </p>
        </section>
        {TRACKS.map((track, i) => (
          <section
            className={`xp-section xp-trackSlot xp-trackSlot--${track.side}`}
            style={{ minHeight: `${span(`track${i + 1}`)}svh` }}
            key={track.name}
          >
            <article className="xp-trackCard">
              <h3 className="xp-trackCard__head">
                <span>{track.name}</span>
                <span className="xp-trackCard__n">
                  [{String(i + 1).padStart(2, "0")}]
                </span>
              </h3>
              <p className="xp-trackCard__copy">{track.copy}</p>
            </article>
          </section>
        ))}

        {/* 03 — PRIZES, on the open ground past the last band. */}
        <section
          className="xp-section xp-section--beat"
          style={{ minHeight: `${span("prizes")}svh` }}
        >
          <h2 className="xp-label">Prizes</h2>
          <p className="xp-huge">US$800</p>
          <p className="xp-beat-line">
            <strong>1st — US$500</strong> · <strong>2nd — US$300</strong> ·
            cash, no strings
          </p>
        </section>

        {/* 04 — THE BRIEFING. Brief spine 9: a hackathon page with no
            schedule, no format and no answer to "do I need a team" is missing
            the things somebody actually needs before they register.

            This gap is the whole announcement of the second act. Across it the
            ground stops rolling, the grid drops to 45% and the signal layer
            switches off — all three pinned to `SETTLE_START`. There used to be
            a section here saying "You're through / this is where it starts",
            and it was a caption on a world that had not stopped moving. The
            world saying it is worth more than the page saying it, and it costs
            60svh less. */}
        <div
          className="xp-gap--brief"
          style={{ height: `${span("brief")}svh` }}
          aria-hidden
        />
        <section
          className="xp-section xp-section--panel"
          style={{ minHeight: `${span("format")}svh` }}
        >
          <h2 className="xp-label">The format</h2>
          <p className="xp-panel__head">39 hours, start to submission</p>
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
          style={{ minHeight: `${span("schedule")}svh` }}
        >
          <h2 className="xp-label">Schedule</h2>
          <p className="xp-panel__head">All times Lima, UTC&minus;5</p>
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
          style={{ minHeight: `${span("questions")}svh` }}
        >
          <h2 className="xp-label">Questions</h2>
          <p className="xp-panel__head">Before you register</p>
          <dl className="xp-faq">
            {FAQ.map(([q, a]) => (
              <div className="xp-faq__row" key={q}>
                <dt>{q}</dt>
                <dd>{a}</dd>
              </div>
            ))}
          </dl>
          {/*
            The one outbound link on the page that is not the register button or a
            credit. It sits under the questions rather than inside an answer
            because it is the next step for somebody who has read them and
            decided, and because a link buried in a `<dd>` is a link nobody sees.
          */}
          <p className="xp-panel__out">
            <a
              className="xp-outLink"
              href={PORTAL_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the Portal docs →
            </a>
          </p>
        </section>

        {/* 06 — FINALE: the wire hand + giant register, standing in the open. */}
        <div
          className="xp-gap--arrive"
          style={{ height: `${span("arrive")}svh` }}
          aria-hidden
        />
        <section
          id="register"
          className="xp-section xp-finale"
          style={{ minHeight: `${span("finale")}svh` }}
        >
          {/* The plate says the name of the thing, not the name of the button.
              `Register` was the headline and the CTA directly under it — the
              same word twice, where the last full-width line of the page is the
              one place the event should be named outright. */}
          <h2 className="xp-huge xp-huge--outline">The realtime hackathon</h2>
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
        The countdown + a Register that is always there.

        The page had exactly two focusable things, both "Register free": one
        visible for the first tenth of the scroll and the next at the very end —
        so for most of the ride there was no way to act and no way to tab to
        anything. This is the way out, offered continuously.

        The corner used to hold a live `% depth` instead of the clock. The
        reference asked for it — "a live % of scroll depth in a fixed corner,
        framing the page as literal transit through the portal" — and it was
        right while the page *was* a descent. It is not one any more: the
        crossing finishes at 19% and everything after it is open ground, so the
        number was measuring a journey the page had stopped making. The scroll
        bar along the bottom carries the same information without claiming
        anything about depth.
      */}
      <div className="xp-hud" ref={hud} inert={!started}>
        {/*
          Outside the fading wrapper on purpose.

          Every other thing in this corner is chrome that should get out of the
          way at the finale. The countdown is the opposite: it is the argument
          for pressing the button it sits next to, so the one moment it must not
          disappear is the moment somebody is deciding.
        */}
        <p className="xp-hud__clock">
          <span className="xp-hud__ticks" aria-hidden>
            {clock}
          </span>
          <span className="xp-hud__unit" aria-hidden>
            to kickoff
          </span>
          {/*
            The digits are decorative and this is the real text — see
            `spokenRemaining`. Not a live region: it must not interrupt, it is
            here so the countdown exists for somebody reading the page rather
            than looking at it.
          */}
          <span className="xp-hud__spoken">{spoken}</span>
        </p>
        {/*
          Everything that is allowed to leave, and nothing else.

          The sound control used to sit outside the HUD entirely, fixed to a
          `right` offset guessed at the width of this row — which it was never
          going to match. It overlapped the readout by 53px.

          Fading this wrapper rather than the row means the button can stay a
          flex item and have its position computed. The finale clears the small
          Register; the clock and the control over a drone that is still audible
          there do not go with it.
        */}
        <div className="xp-hud__fading" ref={fading}>
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
          // `aria-pressed` already carries the state. Flipping the name as
          // well made it announce "turn ambient sound off, pressed" — the state
          // said twice, once as a verb. The name is the thing; the pressed
          // state is the state.
          //
          // No `aria-label` any more either. The control now says "Sound" in
          // actual text, and an `aria-label` beside a visible label replaces it
          // rather than adding to it — which is how a button ends up announcing
          // something other than what it reads.
          aria-pressed={sound === "on"}
          onClick={() => {
            const engine = engineOf();
            engine.toggle();
            setSound(engine.state());
          }}
        >
          {/*
            It used to be three squares and nothing else.

            `◼──` is a level meter to whoever built it and an unlabelled grey box
            to everybody else: no icon convention, no word, no way to know it
            controls audio without pressing it — on a page that starts a drone at
            the first gesture, so the one control a visitor might actually go
            looking for was the one thing on screen with no name on it.

            The word carries it and the meter keeps the state visible at a glance.
          */}
          <span className="xp-hud__soundLabel">Sound</span>
          <span className="xp-hud__meter" aria-hidden>
            {sound === "on" ? "◼◼◼" : "◼──"}
          </span>
        </button>
      </div>

      <div className="xp-progress" aria-hidden>
        <div ref={progressFill} className="xp-progress__fill" />
      </div>
    </>
  );
}
