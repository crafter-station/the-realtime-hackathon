"use client";

import gsap from "gsap";
import Lenis from "lenis";
import { useEffect, useRef, useState } from "react";
import { PortalCanvas } from "./portal-canvas";
import { scroll } from "./store";

const REGISTER_URL = "https://luma.com/realtime-hackathon";

type Section = {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  lead: string;
};

const SECTIONS: Section[] = [
  {
    id: "hero",
    eyebrow: "The Realtime Hackathon",
    title: (
      <>
        Enter the <em>realtime</em>
      </>
    ),
    lead: "Build a live, multiplayer, or agentic AI product with Portal — in one weekend. August 7–9, online. US$800 in cash prizes.",
  },
  {
    id: "premise",
    eyebrow: "The Brief",
    title: (
      <>
        Build AI that <em>happens now</em>
      </>
    ),
    lead: "Not request-response. Realtime. Portal gives you channels, presence, live streaming, location and AI agent execution — you bring the idea and ship it in 39 hours.",
  },
  {
    id: "world-multiplayer",
    eyebrow: "World 01 — Multiplayer",
    title: (
      <>
        Shared, <em>live</em> rooms
      </>
    ),
    lead: "Presence, channels and reactions out of the box. Build a space where people and agents act together in the same live room.",
  },
  {
    id: "world-streaming",
    eyebrow: "World 02 — Live Streaming",
    title: (
      <>
        Broadcast to a <em>crowd</em>
      </>
    ),
    lead: "Push state to thousands at once. Build a product where an audience shapes the experience as it streams.",
  },
  {
    id: "world-location",
    eyebrow: "World 03 — Real-Time Location",
    title: (
      <>
        Maps that are <em>alive</em>
      </>
    ),
    lead: "Track and share position in realtime. Build living maps, presence in space, and things that move on screen the instant they move for real.",
  },
  {
    id: "world-agents",
    eyebrow: "World 04 — AI Agents",
    title: (
      <>
        Agents that <em>act now</em>
      </>
    ),
    lead: "Run autonomous agents that react to live signals and change the experience as it unfolds — hosted on Portal.",
  },
  {
    id: "world-wild",
    eyebrow: "World 05 — Wild Signal",
    title: (
      <>
        Realtime, <em>uncategorized</em>
      </>
    ),
    lead: "No box. If it happens now and it surprises us, it belongs here.",
  },
  {
    id: "prizes",
    eyebrow: "Prizes",
    title: (
      <>
        <em>US$800</em> on the line
      </>
    ),
    lead: "First place US$500. Second place US$300. Judged on realtime + Portal, useful AI, execution, originality, UX and demo clarity.",
  },
  {
    id: "format",
    eyebrow: "The Format",
    title: (
      <>
        39 hours. <em>Friday to Sunday</em>
      </>
    ),
    lead: "Online, teams of 1–4. Connect Friday, build all weekend, ship Sunday. All times Lima / UTC-5.",
  },
  {
    id: "finale",
    eyebrow: "Aug 07–09 · Online",
    title: (
      <>
        Enter the <em>build</em>
      </>
    ),
    lead: "Registration is free. Bring an idea. Leave with a realtime product.",
  },
];

function detectQuality(): "high" | "lite" {
  if (typeof window === "undefined") return "high";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = window.innerWidth < 820;
  const lowMem =
    typeof (navigator as unknown as { deviceMemory?: number }).deviceMemory ===
      "number" &&
    (navigator as unknown as { deviceMemory: number }).deviceMemory <= 4;
  return coarse || small || lowMem ? "lite" : "high";
}

export function Experience() {
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(true);
  const progressFill = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);

  // Capability detection + smooth scroll wiring.
  useEffect(() => {
    scroll.quality = detectQuality();
    document.documentElement.classList.add("xp");
    setMounted(true);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = new Lenis({
      smoothWheel: !reduce,
      lerp: reduce ? 1 : 0.09,
    });
    lenisRef.current = lenis;
    lenis.stop(); // locked until the visitor enters the portal.

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      scroll.progress = lenis.progress || 0;
      scroll.velocity = lenis.velocity || 0;
      if (progressFill.current) {
        progressFill.current.style.height = `${scroll.progress * 100}%`;
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

  const enter = () => {
    if (entered || leaving) return;
    setLeaving(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const proxy = { v: 0 };
    gsap.to(proxy, {
      v: 1,
      duration: reduce ? 0.4 : 1.5,
      ease: "power3.inOut",
      onUpdate: () => {
        scroll.warp = proxy.v;
      },
      onComplete: () => {
        scroll.warp = 1;
        scroll.entered = true;
        setEntered(true);
        lenisRef.current?.start();
      },
    });
  };

  return (
    <>
      {mounted ? <PortalCanvas /> : <div className="xp-stage" aria-hidden />}

      <a className="xp-brand" href="#hero">
        RT//HACK
      </a>
      <a
        className="xp-cta"
        href={REGISTER_URL}
        target="_blank"
        rel="noopener noreferrer"
      >
        Register free
      </a>

      {!entered ? (
        <div className="xp-gate" data-leaving={leaving}>
          <div className="xp-gate__inner">
            <p className="xp-eyebrow">Portal // The Realtime Hackathon</p>
            <button type="button" className="xp-enter" onClick={enter}>
              <span className="xp-enter__pulse" aria-hidden />
              Enter the portal
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="xp-sound"
        aria-pressed={!muted}
        aria-label={muted ? "Enable sound" : "Mute sound"}
        onClick={() => setMuted((m) => !m)}
      >
        {muted ? "♪" : "◼"}
      </button>

      <div className="xp-progress" aria-hidden>
        <div ref={progressFill} className="xp-progress__fill" />
      </div>

      <main className="xp-overlay" data-entered={entered}>
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="xp-section">
            <p className="xp-eyebrow">{section.eyebrow}</p>
            <h1 className="xp-title">{section.title}</h1>
            <p className="xp-lead">{section.lead}</p>
            {(section.id === "hero" || section.id === "finale") && (
              <p style={{ marginTop: "2rem" }}>
                <a
                  className="xp-enter"
                  href={REGISTER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Register free
                </a>
              </p>
            )}
          </section>
        ))}
      </main>
    </>
  );
}
