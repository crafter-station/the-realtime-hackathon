# Art Direction — "Another Dimension" (B&W wireframe, scroll-as-velocity)

> Full pivot per client. Strict BLACK & WHITE only. References: concentric
> rectangular wireframe tunnels, an infinite wire grid to a vanishing point, and
> a wireframe hand (retro CG). Scroll does not "go down" — it flies you THROUGH
> a dimensional tunnel; scrolling faster = traveling faster.

## Non-negotiables

- **Palette:** background pale/opaque black `#0e0e10`; lines + type white `#ffffff`
  (with opacity tiers). One exception, and only one: **the portals are made of
  Portal orange light.** It is emitted, never painted — the throat of the opening
  well and the vortex at the end, and nowhere else. No orange surfaces, no orange
  lines, no orange type. A grid tinted with the accent is a colour scheme; a
  white grid around a glowing throat is not.
- **Type:** hero title stays (Anomaly Nexus): "THE REALTIME" solid white,
  "HACKATHON" white **outline** (hollow) for B&W hierarchy. Body = Geist Sans.
  Mono pixel font for micro-labels.
- **Kill:** Mars, astronaut, the orange ring, and orange as an *accent* — a
  border, a rule, a highlight. The portal light is not an accent; it is the
  subject.
- **Register CTA:** white pill, black text. One in the top bar + the giant one at
  the finale.

## The journey (one continuous scroll, ~700vh)

1. **HERO** — pale-black starfield, big title + one-line brief
   (Aug 7–9 · online · teams 1–4 · US$800). The tunnel mouth faintly ahead.
2. **TUNNEL** — fly through a rectangular wireframe tunnel (concentric rects +
   corner rails to the vanishing point). **Velocity-reactive:** scroll speed adds
   camera speed + FOV kick + line brightness — the "changing dimension" rush.
3. **PRIZES (BIG)** — void beat: `US$800` gigantic, `1ST — US$500 · 2ND — US$300`.
4. **WIRE GRID** — infinite mathematical grid plane receding to the horizon
   (parametric, programmatic); camera skims it; progress reads as approach.
5. **COUNTDOWN** — giant live clock `DD:HH:MM:SS` to kickoff (Fri Aug 7, 19:00
   Lima / UTC-5), ticking.
6. **FINALE** — a **wireframe hand** (built from lines) draws itself out of
   nothing and **follows the cursor**, beside a giant REGISTER button.

## Craft rules

- Lines: `LineSegments`/`LineLoop`, white, opacity tiers (0.15 far / 0.5 mid /
  0.9 near). No bloom necessary; contrast does the work.
- Motion: Lenis + camera dolly on one continuous z-track; damp everything;
  velocity coupling clamped so it never nauseates. Reduced-motion: no FOV kicks,
  gentle fades.
- Every beat's DOM copy floats over the canvas (no solid section backgrounds).
- SEO: all copy in SSR HTML.
