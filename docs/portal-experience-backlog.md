# Portal Experience — Awwwards Backlog

> Prioritized work-list for the polish loop. Read `portal-experience-brief.md` first.
> Each iteration: pick the top unchecked item → design (design-engineer) → build
> (construction) → QA (qa-reviewer) → code review + issues → integrate → small commit.
> Verify `bunx tsc --noEmit` + `bun run build` green before every commit. No slop.

## P0 — signature moments (make it feel Awwwards)
- [x] Portal entry: hot event-horizon core + brighter ring, bloom threshold tuned
      so only the ring/core bloom (crisp orange, no haze). TODO: ENTER hover pull-in.
- [x] Traversal: hyperspace speed-lines flash (peaks mid-warp) + bloom. TODO: settle polish, chromatic feel.
- [x] Section text reveals on scroll-in: clip-path title wipe + staggered eyebrow/lead/CTA (IntersectionObserver + CSS, Emil curves, reduced-motion + no-JS safe).
- [ ] Camera "arrives" and briefly frames each world node on scroll (dwell easing).
- [x] Hero reveal: cinematic entrance fires after traversal (clip-path wipe).

## P1 — the five worlds (bespoke, not generic icosahedrons)
- [ ] Multiplayer: a live network — nodes + animated connection lines, presence dots.
- [ ] Live Streaming: expanding concentric waves / broadcast pulse to a crowd.
- [ ] Real-Time Location: a wire globe / grid with moving location pings.
- [ ] AI Agents: an autonomous swarm reacting to a signal (boids-ish).
- [ ] Wild Signal: controlled chaos — glitch/instanced burst.

## P1 — content & conversion
- [ ] Tighten all copy to the brief voice; verify event facts vs `src/lib/`.
- [ ] Prizes beat (US$500 / US$300) with a reward visual.
- [ ] Format/briefing beat: 39h, teams 1–4, online, condensed schedule + judging + FAQ.
- [ ] Finale: big register moment + live kickoff countdown + footer.
- [ ] Section progress indicator that fits the cosmic theme.

## P2 — audio & feel
- [ ] Ambient soundscape + SFX (portal whoosh, per-world hum), muted by default,
      visible toggle, unlocked on first gesture (Web Audio; respects autoplay).

## P2 — performance & robustness
- [ ] drei `PerformanceMonitor` → adaptive DPR/quality; instance particles/nodes.
- [ ] Verified `lite` path on real mobile viewport; poster/static fallback w/o WebGL.
- [ ] No memory leaks (dispose geometries/materials on unmount).

## P2 — accessibility & SEO
- [ ] Focus-visible states on all CTAs; keyboard reachable; `prefers-reduced-motion`
      disables camera motion but keeps content legible.
- [ ] Semantic landmarks + headings order; content present in SSR HTML (done — verify).

## Ongoing — quality gates
- [ ] QA pass (qa-reviewer / Playwright): entry, scroll, each world, mobile, console
      clean, no jank. File issues per failure.
- [ ] Code review (design-engineer + reviewer): motion correctness (easing, no
      `scale(0)`, transform/opacity only), R3F disposal, no slop. File issues.
