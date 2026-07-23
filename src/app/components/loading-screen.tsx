"use client";

import { useEffect, useRef, useState } from "react";

const MIN_DURATION = 2900;
const MAX_DURATION = 5200;
const FADE_MS = 620;

// Boot-sequence pacing: each module lights up in turn, Pip-Boy style.
const STEP_MS = 340;

const TABS = ["BRIEF", "TRACKS", "STACK", "PRIZES", "LIVE"];
const ACTIVE_TAB = "STACK";
const SUBTABS = ["OVERVIEW", "REALTIME", "AGENTS"];
const ACTIVE_SUBTAB = "REALTIME";

// Event facts mirror the landing copy (Aug 7-9, online, 39h, teams 1-4, US$800).
const PARAMS: Array<[string, string]> = [
  ["EVENT", "AUG 07 - 09"],
  ["MODE", "ONLINE / 39H"],
  ["TEAMS", "1 - 4"],
  ["PRIZE", "US$800"],
];

// Portal capabilities + AI as a SPECIAL-style stat list.
const MODULES: Array<{ name: string; value: string; desc: string }> = [
  {
    name: "CHANNELS",
    value: "08",
    desc: "Realtime pub/sub channels that stream every state change to every connected client the instant it happens.",
  },
  {
    name: "PRESENCE",
    value: "06",
    desc: "Live presence so you always know who is online, typing, and acting in the room right now.",
  },
  {
    name: "BROADCAST",
    value: "07",
    desc: "Fan-out broadcast to push a single event to an entire room at once with no fan-out code of your own.",
  },
  {
    name: "HISTORY",
    value: "05",
    desc: "Replayable event history so late joiners instantly catch up on everything they missed.",
  },
  {
    name: "DIRECT SENDS",
    value: "04",
    desc: "Targeted direct sends to reach exactly one client without broadcasting to the whole channel.",
  },
  {
    name: "AI AGENTS",
    value: "09",
    desc: "Autonomous agents that act on live signals and reshape the experience as it unfolds.",
  },
];

const SUMMARY = {
  name: "STACK ONLINE",
  desc: "Realtime stack synced. Portal channels, presence, and AI agents are live — ready to build.",
};

export function LoadingScreen() {
  const [mounted, setMounted] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Dismiss lifecycle: minimum on-screen beat plus the window load event,
  // capped so a slow page never traps the visitor behind the overlay.
  useEffect(() => {
    if (!mounted) return;
    let leaveTimer = 0;
    let removeTimer = 0;

    const startLeaving = () => {
      setLeaving(true);
      removeTimer = window.setTimeout(() => setMounted(false), FADE_MS);
    };

    const loadedAt = performance.now();
    const scheduleLeave = () => {
      const elapsed = performance.now() - loadedAt;
      leaveTimer = window.setTimeout(
        startLeaving,
        Math.max(0, MIN_DURATION - elapsed),
      );
    };

    const capTimer = window.setTimeout(startLeaving, MAX_DURATION);

    if (document.readyState === "complete") {
      scheduleLeave();
    } else {
      window.addEventListener("load", scheduleLeave, { once: true });
    }

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
      window.clearTimeout(capTimer);
      window.removeEventListener("load", scheduleLeave);
    };
  }, [mounted]);

  // Lock body scroll while the overlay is up.
  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  // Step the highlight through the module list and fill the boot bar.
  useEffect(() => {
    if (!mounted) return;
    const root = rootRef.current;
    const bar = root?.querySelector<HTMLElement>("[data-boot-fill]");
    const pct = root?.querySelector<HTMLElement>("[data-boot-pct]");

    const total = MODULES.length * STEP_MS;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      setActive(MODULES.length);
      if (bar) bar.style.width = "100%";
      if (pct) pct.textContent = "100%";
      return;
    }

    let frame = 0;
    let start = 0;

    const tick = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(1, elapsed / total);
      const index = Math.min(MODULES.length, Math.floor(elapsed / STEP_MS));

      setActive(index);
      if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
      if (pct) pct.textContent = `${Math.round(progress * 100)}%`;

      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [mounted]);

  if (!mounted) return null;

  const done = active >= MODULES.length;
  const focus = done ? SUMMARY : MODULES[Math.min(active, MODULES.length - 1)];

  return (
    <output
      className={`splash${leaving ? " splash--leaving" : ""}`}
      aria-live="polite"
    >
      <div ref={rootRef} className="splash__panel">
        <span className="splash__corner splash__corner--tl" aria-hidden />
        <span className="splash__corner splash__corner--tr" aria-hidden />
        <span className="splash__corner splash__corner--bl" aria-hidden />
        <span className="splash__corner splash__corner--br" aria-hidden />

        <div className="splash__tabs" aria-hidden>
          <span className="splash__cog">✷</span>
          <nav className="splash__tabrow">
            {TABS.map((tab) => (
              <span
                className={`splash__tab${
                  tab === ACTIVE_TAB ? " is-active" : ""
                }`}
                key={tab}
              >
                {tab}
              </span>
            ))}
          </nav>
          <span className="splash__signal">▚</span>
        </div>

        <div className="splash__subtabs" aria-hidden>
          {SUBTABS.map((tab) => (
            <span
              className={`splash__subtab${
                tab === ACTIVE_SUBTAB ? " is-active" : ""
              }`}
              key={tab}
            >
              {tab}
            </span>
          ))}
          <span className="splash__mode">{"// BOOT SEQUENCE"}</span>
        </div>

        <div className="splash__body">
          <ul className="splash__stats">
            {MODULES.map((mod, i) => {
              const state =
                done || i < active ? "done" : i === active ? "active" : "idle";
              return (
                <li className={`splash__stat is-${state}`} key={mod.name}>
                  <span className="splash__stat-name">{mod.name}</span>
                  <span className="splash__stat-value">
                    {state === "idle" ? "--" : mod.value}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="splash__detail">
            <div className="splash__emblem" aria-hidden>
              <span className="splash__emblem-ring" />
              <span className="splash__emblem-core" />
            </div>
            <h3 className="splash__detail-title">{focus.name}</h3>
            <p className="splash__detail-desc">{focus.desc}</p>
          </div>
        </div>

        <div className="splash__status">
          <span className="splash__status-slot">{"PORTAL // ONLINE"}</span>
          <span className="splash__status-boot">
            <span className="splash__status-label">
              {done ? "SYSTEM READY" : "BOOT"}
            </span>
            <span className="splash__bar">
              <span className="splash__bar-fill" data-boot-fill />
            </span>
            <span className="splash__status-pct" data-boot-pct>
              0%
            </span>
          </span>
          <span className="splash__status-slot splash__status-slot--right">
            {PARAMS[0][1]}
          </span>
        </div>
      </div>
      <span className="sr-only">Loading The Realtime Hackathon</span>
    </output>
  );
}
