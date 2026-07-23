# The Realtime Hackathon — "Portal" Experience Brief

> Single source of truth for the scroll-driven WebGL redesign. Every agent (design,
> build, QA, review) reads this first. If a change contradicts this brief, the brief
> wins unless the human updates it. **No AI slop, no generic filler, no lorem.**

## North star

**One job: maximize hackathon registrations** (`https://luma.com/realtime-hackathon`).
Portal's user growth happens downstream — a registrant builds _with Portal_ during the
event and stays a user. Every scene, animation, and word serves that single CTA.

## Concept

The product is literally called **Portal**. You **enter through a portal** into the
hackathon's realtime universe. Scroll = a cinematic journey through Portal's
superpowers, each reframed as "this is what you can build," ending at "now build it →
register."

## Experience spine (all cinematic 3D)

0. **ENTER** — a pulsing orange energy portal (torus/vortex) + `ENTER THE PORTAL`
   button. Click → camera flies _through_ the portal (whoosh + warp). Doubles as the
   asset loader. This replaces the old boot splash.
1. **HERO** — title reveal in space. Angle: **"Enter the realtime."** Keeps the
   realtime + AI + build core. Key facts (AUG 07–09 · ONLINE · TEAMS 1–4 · US$800).
   Big register moment.
2. **PREMISE** — "Build AI that happens now." Why realtime + AI, why Portal.
3–7. **THE WORLDS (tracks reframed)** — each a full WebGL scene = a Portal capability
   as a buildable world, with one concrete build idea:
   - **MULTIPLAYER** (channels / presence / chat) — shared live rooms.
   - **LIVE STREAMING** — broadcast state to a crowd in realtime.
   - **REAL-TIME LOCATION** — living maps, presence in space.
   - **AI AGENTS** — autonomous agents acting on live signals.
   - **WILD SIGNAL** — open/uncategorized realtime experiments.
8. **PRIZES** — US$500 / US$300 as a reward beat.
9. **FORMAT + BRIEFING** — 39h, teams 1–4, online, condensed schedule, judging, FAQ.
10. **FINALE** — "Enter the build. Register free." + footer (Portal, Crafter Station).

## Visual language

- **Palette (original landing):** base black `#090909`, signal orange `#ff4d00`
  (glow/bloom), white `#ffffff` text, gray `#8f8f8f`. Monochrome-warm, cosmic.
- **Material direction:** _liquid light / holographic portal_ — energy vortex with
  volumetric bloom, refractive glass shards, particle streams, warp distortion on
  traversal. Each world = a variation of that energy, not a different theme.
- **Type:** existing `Geist Pixel` for display; keep it tight, confident, dev-cool.
- **Motion:** Emil Kowalski principles — strong custom easing (no weak default
  curves), animate transform/opacity only, springs for decorative/pointer motion,
  never `scale(0)`, short stagger (30–80ms), asymmetric enter/exit, respect
  `prefers-reduced-motion`. Cinematic ≠ chaotic: motion follows consistent patterns.

## Tech

- Next.js 16 App Router (client experience), **R3F** (`@react-three/fiber`) +
  **drei** + **@react-three/postprocessing** (bloom/DOF) + **Lenis** (smooth scroll)
  + **GSAP ScrollTrigger** (choreograph camera & scenes to scroll).
- **Progressive enhancement:** desktop = full 3D. Detect mobile/low-end → `lite`
  quality (fewer particles, simpler shaders, fewer postprocessing passes, or
  poster/video fallbacks). No-WebGL / reduced-motion → graceful static fallback.
  **Registration must never break on a phone.**

## Interaction & chrome

- **CTA:** minimal persistent `Register` (corner) + big moments at hero & finale.
- **Audio:** ambient soundscape + SFX (portal whoosh, per-world hum), **muted by
  default**, visible sound toggle, unlocked on first gesture (respects autoplay).
- Progress/section indicator that fits the cosmic theme (not a terminal chrome).

## Event facts (do not invent — keep consistent everywhere)

- Dates: **August 7–9, 2026** (kickoff Fri 19:00 Lima/UTC-5, 39-hour window).
- Format: **online**, teams of **1–4**.
- Prizes: **US$800** total — 1st **US$500**, 2nd **US$300**.
- Register: `https://luma.com/realtime-hackathon`.
- Organizers: **Portal** (`useportal.co`) + **Crafter Station**.
- Portal = dev SDK: realtime messaging (channels, presence, read receipts,
  reactions), AI agent execution, in-app notifications, live streaming, real-time
  location, push notifications.

## Quality bar (Awwwards)

- First load to interactive portal < ~2.5s on desktop; 60fps scroll on modern
  hardware; no layout shift; no jank on world transitions.
- Every animation has a purpose (Emil framework). Cohesive motion system, shared
  easing tokens, shared timing scale. Distinctive — not a template.
- Accessible: keyboard reachable CTAs, focus states, reduced-motion path, semantic
  content behind the canvas for SEO/crawlers.

## Anti-slop rules

- No generic stock copy, no "Lorem", no filler feature lists that don't map to a real
  Portal capability. Every word earns its place and points at registering.
- Reuse real event data from `src/lib/` where it exists; do not fabricate schedule
  items, prizes, or dates.
