"use client";

import Lenis from "lenis";
import { useEffect, useRef, useState } from "react";
import { PortalCanvas } from "./portal-canvas";
import { scroll } from "./store";

const REGISTER_URL = "https://luma.com/realtime-hackathon";
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

// Where the HUD hands over to the finale's own Register. The finale section is
// one viewport tall at the very bottom, so it starts entering the frame around
// 0.965 — the readout has to be gone by the time the giant CTA is readable.
const HUD_FADE_START = 0.945;
const HUD_FADE_END = 0.975;

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

export function Experience() {
  const [mounted, setMounted] = useState(false);
  const [clock, setClock] = useState("--:--:--:--");
  const progressFill = useRef<HTMLDivElement>(null);
  const heroLayer = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const depthValue = useRef<HTMLSpanElement>(null);

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
        <div className="xp-gap--ride" aria-hidden />

        {/* 02.5 — The jump: count down, punch into hyperspace, meet the
            tracks in the streaks. */}
        <section className="xp-section xp-section--beat">
          <p className="xp-label">Hold on</p>
          <p className="xp-beat-line xp-beat-line--wide">
            You are about to enter <strong>another dimension</strong>.
          </p>
        </section>
        {[3, 2, 1].map((n) => (
          <section className="xp-section xp-count" key={n}>
            <p className="xp-count__n">{n}</p>
          </section>
        ))}
        <div className="xp-gap--jump" aria-hidden />

        <section className="xp-section xp-section--beat xp-tracksIntro">
          <p className="xp-label">Five tracks</p>
          <p className="xp-beat-line">
            Pick one, or ignore them all. <strong>Ship something live.</strong>
          </p>
        </section>
        {TRACKS.map((track, i) => (
          <section
            className={`xp-section xp-trackSlot xp-trackSlot--${track.side}`}
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
        <div className="xp-gap--jumpOut" aria-hidden />

        {/* 03 — The curve closes: PRIZES appear. */}
        <section className="xp-section xp-section--beat">
          <p className="xp-label">Prizes</p>
          <h2 className="xp-huge">US$800</h2>
          <p className="xp-beat-line">
            <strong>1st — US$500</strong> · <strong>2nd — US$300</strong> ·
            cash, no strings
          </p>
        </section>

        {/* 04 — Through the tunnel. */}
        <div className="xp-gap--tunnel" aria-hidden />

        {/* 05 — COUNTDOWN, live. */}
        <section className="xp-section xp-section--beat">
          <p className="xp-label">Kickoff</p>
          <p className="xp-clock">
            {clock}
            <small>
              DAYS : HOURS : MINUTES : SECONDS — FRI AUG 07, 19:00 LIMA
            </small>
          </p>
        </section>

        {/* 05.5 — Into the wormhole: the grid folds into the vortex. */}
        <div className="xp-gap--wormhole" aria-hidden />
        <section className="xp-section xp-section--beat">
          <p className="xp-label">Another dimension</p>
          <h2 className="xp-huge xp-huge--outline">Warp</h2>
          <p className="xp-beat-line">
            The grid folds into a wormhole. <strong>Keep falling.</strong>
          </p>
        </section>

        {/* 05.75 — THE OTHER SIDE. The beat the page was missing: the tube
            opens, the vortex is behind you, and the ground comes back. A
            portal you fall into and never come out of is not a portal. */}
        <div className="xp-gap--emerge" aria-hidden />
        <section className="xp-section xp-section--beat">
          <p className="xp-label">The other side</p>
          <h2 className="xp-huge">You&rsquo;re through</h2>
          <p className="xp-beat-line">
            Open country, and a weekend to build in it.{" "}
            <strong>This is where it starts.</strong>
          </p>
        </section>

        {/* 06 — FINALE: the wire hand + giant register, standing in the open. */}
        <div className="xp-gap--arrive" aria-hidden />
        <section className="xp-section xp-finale">
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
            <a
              href="https://useportal.co"
              target="_blank"
              rel="noopener noreferrer"
            >
              Portal
            </a>{" "}
            and{" "}
            <a
              href="https://crafterstation.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Crafter Station
            </a>
          </p>
        </section>
      </main>

      {/*
        Depth readout + a Register that is always there.

        Two problems, one element. The page had exactly two focusable things,
        both "Register free": one visible for the first tenth of the scroll and
        the next at the very end — so for most of a thirty-screen ride there was
        no way to act and no way to tab to anything. And the reference asks for
        "a live % of scroll depth in a fixed corner, framing the page as literal
        transit through the portal", which is the same corner and the same idea:
        tell people how deep they are, and let them out whenever they want.
      */}
      <div className="xp-hud" ref={hud}>
        <p className="xp-hud__read">
          <span ref={depthValue} className="xp-hud__depth">
            000
          </span>
          <span className="xp-hud__unit">% depth</span>
        </p>
        <a
          className="xp-hud__cta"
          href={REGISTER_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Register free →
        </a>
      </div>

      <div className="xp-progress" aria-hidden>
        <div ref={progressFill} className="xp-progress__fill" />
      </div>
    </>
  );
}
