"use client";

import Lenis from "lenis";
import { useEffect, useRef, useState } from "react";
import { PortalCanvas } from "./portal-canvas";
import { scroll } from "./store";

const REGISTER_URL = "https://luma.com/realtime-hackathon";

function detectQuality(): "high" | "lite" {
  if (typeof window === "undefined") return "high";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 820;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  const lowMem = typeof mem === "number" && mem <= 4;
  return coarse || small || lowMem ? "lite" : "high";
}

const EDITORIAL: Array<{
  label: string;
  title: React.ReactNode;
  body: React.ReactNode;
}> = [
  {
    label: "The Brief",
    title: (
      <>
        Build AI that <em>happens now</em>
      </>
    ),
    body: "Not request–response. Realtime. Portal gives you channels, presence, live streaming, location and AI-agent execution — you bring the idea and ship it in one weekend.",
  },
  {
    label: "What you can build",
    title: (
      <>
        Five ways to go <em>live</em>
      </>
    ),
    body: "Shared multiplayer rooms · live streaming to a crowd · real-time location · autonomous AI agents · or a wild realtime experiment of your own.",
  },
  {
    label: "Prizes",
    title: (
      <>
        <em>US$800</em> on the line
      </>
    ),
    body: "First place US$500. Second place US$300. Judged on realtime + Portal, useful AI, execution, originality, UX and demo clarity.",
  },
  {
    label: "The Format",
    title: (
      <>
        39 hours, <em>Friday to Sunday</em>
      </>
    ),
    body: "Online, teams of 1–4. Connect Friday, build all weekend, ship Sunday. August 7–9, 2026 · all times Lima / UTC-5.",
  },
];

export function Experience() {
  const [mounted, setMounted] = useState(false);
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

  return (
    <>
      {mounted ? <PortalCanvas /> : <div className="xp-stage" aria-hidden />}

      <header className="xp-topbar">
        <a className="xp-wordmark" href="#top">
          RT//HACK
        </a>
        <nav className="xp-nav">
          <a
            className="xp-pill xp-pill--solid"
            href={REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Register <span className="xp-pill__dot" />
          </a>
          <a className="xp-pill xp-pill--ghost" href="#brief">
            Explore
          </a>
        </nav>
      </header>

      <main className="xp-overlay" id="top">
        {/* Hero — huge type framing the portal. */}
        <section className="xp-hero">
          <div>
            <p className="xp-label">Portal // The Realtime Hackathon</p>
            <h1 className="xp-display">
              The realtime <em>hackathon</em>
            </h1>
          </div>
          <div className="xp-herorow">
            <p className="xp-body">
              Build a live, multiplayer or agentic AI product with{" "}
              <strong>Portal</strong> in one weekend. August 7–9, online. US$800
              in prizes. <strong>Scroll to step through the portal.</strong>
            </p>
            <div className="xp-actions">
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
        </section>

        {/* Traversal — the camera flies through the portal across this gap. */}
        <div className="xp-gap" aria-hidden />

        {/* Editorial content on the other side (solid paper, covers the canvas). */}
        <div className="xp-editorial" id="brief">
          {EDITORIAL.map((s, i) => (
            <section key={s.label} className="xp-section">
              <p className="xp-label">{`0${i + 1} — ${s.label}`}</p>
              <h2>{s.title}</h2>
              <p className="xp-body">{s.body}</p>
            </section>
          ))}

          <section className="xp-section xp-finale">
            <p className="xp-label">Aug 07–09 · Online · Teams 1–4</p>
            <h2>
              Enter the <em>build</em>
            </h2>
            <p className="xp-body">
              Registration is free. Bring an idea, leave with a realtime
              product.
            </p>
            <div className="xp-actions">
              <a
                className="xp-register"
                href={REGISTER_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Register free →
              </a>
            </div>
          </section>
        </div>
      </main>

      <div className="xp-cue" aria-hidden>
        <span>RT//HACK</span>
        <span className="xp-cue__center">Scroll to explore ↓</span>
        <span>Aug 07–09</span>
      </div>

      <div className="xp-progress" aria-hidden>
        <div ref={progressFill} className="xp-progress__fill" />
      </div>
    </>
  );
}
