"use client";

import { useEffect, useState } from "react";

// Each menu item maps to one or more section ids that make up that screen.
const SCREENS: Array<{ key: string; label: string; sections: string[] }> = [
  { key: "brief", label: "BRIEF", sections: ["top"] },
  { key: "tracks", label: "TRACKS", sections: ["tracks", "tracks-2"] },
  { key: "portal", label: "PORTAL", sections: ["portal"] },
  { key: "schedule", label: "SCHEDULE", sections: ["schedule"] },
  { key: "prizes", label: "PRIZES", sections: ["prizes"] },
  { key: "judging", label: "JUDGING", sections: ["judging"] },
  { key: "faq", label: "FAQ", sections: ["faq"] },
  { key: "apply", label: "APPLY", sections: ["apply"] },
  { key: "countdown", label: "COUNTDOWN", sections: ["countdown"] },
];

const KICKOFF = new Date("2026-08-07T19:00:00-05:00").getTime();

function countdownLabel(now: number): string {
  const remaining = KICKOFF - now;
  if (remaining <= 0) return "SESSION LIVE";
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  return `T-${String(days).padStart(2, "0")}D ${String(hours).padStart(
    2,
    "0",
  )}:${String(minutes).padStart(2, "0")} // KICKOFF`;
}

export function TerminalChrome() {
  const [active, setActive] = useState(SCREENS[0].key);
  const [clock, setClock] = useState("T---D --:-- // KICKOFF");

  // Show only the active screen's sections; hide the rest.
  useEffect(() => {
    const screen = SCREENS.find((s) => s.key === active) ?? SCREENS[0];
    const activeSet = new Set(screen.sections);
    for (const s of SCREENS) {
      for (const id of s.sections) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle("screen-active", activeSet.has(id));
      }
    }
    // Reset the pane scroll when switching screens.
    const pane = document.getElementById("main-content");
    if (pane) pane.scrollTop = 0;
  }, [active]);

  // Live countdown clock in the status bar.
  useEffect(() => {
    const update = () => setClock(countdownLabel(Date.now()));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <>
      <aside className="terminal-side">
        <span className="terminal-side__brand">
          <span className="terminal-side__cog" aria-hidden>
            ✷
          </span>
          {"RT//HACK"}
        </span>
        <nav className="terminal-menu" aria-label="Sections">
          {SCREENS.map((screen, i) => (
            <button
              type="button"
              key={screen.key}
              className={`terminal-menu__item${
                screen.key === active ? " is-active" : ""
              }`}
              aria-current={screen.key === active ? "page" : undefined}
              onClick={() => setActive(screen.key)}
            >
              <span className="terminal-menu__num" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              {screen.label}
            </button>
          ))}
        </nav>
        <div className="terminal-side__foot" aria-hidden>
          {"PORTAL // ONLINE"}
          <br />
          AUG 07-09 · ONLINE
        </div>
      </aside>

      <footer className="terminal-statusbar" aria-hidden>
        <span className="terminal-statusbar__slot">{"PORTAL // ONLINE"}</span>
        <span className="terminal-statusbar__clock">
          <span className="terminal-statusbar__dot" />
          {clock}
        </span>
        <span className="terminal-statusbar__slot terminal-statusbar__slot--right">
          {"US$800 // PRIZES"}
        </span>
      </footer>

      <div className="terminal-frame" aria-hidden>
        <span className="terminal-frame__corner terminal-frame__corner--tl" />
        <span className="terminal-frame__corner terminal-frame__corner--tr" />
        <span className="terminal-frame__corner terminal-frame__corner--bl" />
        <span className="terminal-frame__corner terminal-frame__corner--br" />
      </div>

      <div className="terminal-scanlines" aria-hidden />
    </>
  );
}
