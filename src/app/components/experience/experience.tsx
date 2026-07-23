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

// Scroll fraction across which the fly-into-the-H zoom happens.
const ZOOM_END = 0.15;
// How far we zoom: the H's hollow counter must exceed the viewport.
const ZOOM_MAX = 46;

export function Experience() {
  const [mounted, setMounted] = useState(false);
  const [clock, setClock] = useState("--:--:--:--");
  const progressFill = useRef<HTMLDivElement>(null);
  const heroLayer = useRef<HTMLDivElement>(null);
  const heroTitle = useRef<HTMLHeadingElement>(null);
  const heroSub = useRef<HTMLDivElement>(null);
  const hGlyph = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    scroll.quality = detectQuality();
    document.documentElement.classList.add("xp");
    setMounted(true);

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const lenis = new Lenis({ smoothWheel: !reduce, lerp: reduce ? 1 : 0.09 });

    // Measure the H glyph so the zoom scales/rotates around its hollow center
    // and drifts it to the middle of the viewport.
    const anchor = { ox: 0, oy: 0, tx: 0, ty: 0 };
    const measure = () => {
      const title = heroTitle.current;
      const h = hGlyph.current;
      if (!title || !h) return;
      const prev = title.style.transform;
      title.style.transform = "none";
      const tr = title.getBoundingClientRect();
      const hr = h.getBoundingClientRect();
      title.style.transform = prev;
      const hx = hr.left + hr.width / 2;
      const hy = hr.top + hr.height / 2;
      anchor.ox = hx - tr.left;
      anchor.oy = hy - tr.top;
      anchor.tx = window.innerWidth / 2 - hx;
      anchor.ty = window.innerHeight / 2 - hy;
      title.style.transformOrigin = `${anchor.ox}px ${anchor.oy}px`;
    };
    measure();
    window.addEventListener("resize", measure);

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      scroll.progress = lenis.progress || 0;
      scroll.velocity = lenis.velocity || 0;
      if (progressFill.current) {
        progressFill.current.style.transform = `scaleX(${scroll.progress})`;
      }

      // Fly INTO the H: grow + bank + drift its hollow center to mid-viewport.
      const layer = heroLayer.current;
      const title = heroTitle.current;
      const sub = heroSub.current;
      if (layer && title && sub) {
        const t = Math.min(1, Math.max(0, scroll.progress / ZOOM_END));
        if (reduce) {
          layer.style.opacity = String(1 - t);
          layer.style.visibility = t >= 1 ? "hidden" : "visible";
        } else {
          const accel = t * t * (3 - 2 * t); // smoothstep
          const s = Math.exp(Math.log(ZOOM_MAX) * accel ** 1.25);
          const drift = Math.min(1, accel * 1.6);
          const bank = Math.sin(accel * Math.PI) * -12;
          title.style.transform = `translate3d(${anchor.tx * drift}px, ${
            anchor.ty * drift
          }px, 0) rotate(${bank}deg) scale(${s})`;
          sub.style.opacity = String(Math.max(0, 1 - t * 4));
          layer.style.opacity = t > 0.92 ? String(1 - (t - 0.92) / 0.08) : "1";
          layer.style.visibility = t >= 1 ? "hidden" : "visible";
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
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

      {/* 01 — HERO layer (fixed): scroll flies you INTO the hollow H. */}
      <div ref={heroLayer} className="xp-heroLayer">
        <h1 ref={heroTitle} className="xp-display">
          The realtime{" "}
          <em>
            <span ref={hGlyph}>h</span>ackathon
          </em>
        </h1>
        <div ref={heroSub} className="xp-heroSub">
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
        {/* Scroll room for the fly-into-the-H zoom. */}
        <div className="xp-gap--intro" aria-hidden />

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
