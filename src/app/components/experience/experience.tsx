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

export function Experience() {
  const [mounted, setMounted] = useState(false);
  const [clock, setClock] = useState("--:--:--:--");
  const progressFill = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroll.quality = detectQuality();
    document.documentElement.classList.add("xp");
    setMounted(true);

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const lenis = new Lenis({ smoothWheel: !reduce, lerp: reduce ? 1 : 0.09 });

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      scroll.progress = lenis.progress || 0;
      scroll.velocity = lenis.velocity || 0;
      if (progressFill.current) {
        progressFill.current.style.transform = `scaleX(${scroll.progress})`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
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

      <header className="xp-topbar">
        <a className="xp-wordmark" href="#top">
          {"RT//HACK"}
        </a>
        <nav className="xp-nav">
          <a
            className="xp-register xp-register--sm"
            href={REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Register free →
          </a>
        </nav>
      </header>

      <main className="xp-overlay" id="top">
        {/* 01 — HERO: title over the pale-black starfield. */}
        <section className="xp-hero">
          <div>
            <h1 className="xp-display">
              The realtime <em>hackathon</em>
            </h1>
          </div>
          <div className="xp-herorow">
            <p className="xp-body">
              Build a live, multiplayer or agentic AI product with{" "}
              <strong>Portal</strong> in one weekend. August 7–9, online, teams
              of 1–4. US$800 in prizes.{" "}
              <strong>Scroll to enter another dimension.</strong>
            </p>
          </div>
        </section>

        {/* 02 — TUNNEL: pure fly-through; speed follows your scroll. */}
        <div className="xp-gap--tunnel" aria-hidden />

        {/* 03 — PRIZES, big. */}
        <section className="xp-section xp-section--beat">
          <p className="xp-label">Prizes</p>
          <h2 className="xp-huge">US$800</h2>
          <p className="xp-beat-line">
            <strong>1st — US$500</strong> · <strong>2nd — US$300</strong> ·
            cash, no strings
          </p>
        </section>

        {/* 04 — GRID: the mathematical approach. */}
        <div className="xp-gap--grid" aria-hidden />

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

        {/* 06 — FINALE: the wire hand + giant register. */}
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
        </section>
      </main>

      <div className="xp-progress" aria-hidden>
        <div ref={progressFill} className="xp-progress__fill" />
      </div>
    </>
  );
}
