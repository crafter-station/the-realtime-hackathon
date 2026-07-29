# Visual Style Reference — PORTAL

Reference document for the-realtime-hackathon. Derived from four source references (perspective grid corridor, OMA/AMO *Subverting The Borders*, *Secret Chiefs* grid room, *mechanist* wireframe glitch) read against the site's current state.

---

## 1. Core Aesthetic

### **Wireframe Transit**

> Swiss editorial typography printed onto the inside wall of a one-point perspective corridor — the page is not a surface you scroll, it's a passage you move through.

**Design philosophy:** every element earns its position by depth. Type, rules, and cards all sit *somewhere in the tunnel*, not *on top of a background*. Motion is always along the Z axis: content arrives from the vanishing point and passes the viewer.

**Hybrid of three lineages:**

| Influence | What it contributes |
|---|---|
| **Swiss / International Style** (OMA·AMO, Gwangjun Woo) | Hairline rules, strict grid, rotated marginalia, oversized date lockups, bilingual pairing |
| **Vector / wireframe CGI** (Tron, early Cinema4D, the grid-corridor plate) | One-point perspective, uniform white hairlines on void black, depth-as-opacity |
| **Phosphor terminal & glitch** (*mechanist* plate) | Pixel-square monospace, letterspaced micro-labels, horizontal slice displacement as a transition device |

**Central tension to preserve:** *rigid order vs. velocity*. The geometry is mathematically regular and calm; the only chaos permitted is momentary, scroll-velocity-driven, and immediately resolves back to the grid.

---

## 2. Color Palette

Six values, plus the emitted portal light — see `art-direction.md`. Nothing
else: no gradients as color, no secondary hues.

| Name | Hex | Role |
|---|---|---|
| **Void** | `#090909` | Page ground. Never pure `#000` — keeps hairlines from clipping and gives the throat somewhere darker to go. |
| **Throat** | `#000000` | Reserved exclusively for the vanishing point / deepest fog. The one place true black appears. |
| **Wire** | `#FFFFFF` | All geometry, all primary type. Applied at opacity tiers, never as a dimmer gray. |
| **Signal** | `#FF4D00` | The single accent. Live state, kickoff, CTA, "you are here" marker. Existing brand orange — keep it. |
| **Ash** | `#8F8F8F` | Secondary type, captions, disabled state. |
| **Rule** | `rgba(143,143,143,0.48)` | Hairline dividers in the 2D layer. |

**Accent discipline:** the references each commit to exactly one saturated accent against monochrome (red in *Secret Chiefs*, phosphor green in *mechanist*). `Signal` orange is that one. Do **not** add green or red — the temptation from the reference plates is a trap. If a "terminal" tone is ever needed, get it from letterspacing and pixel type, not from hue.

**Depth is opacity, not color.** Three tiers only:

```
--wire-near:  rgba(255,255,255,0.85)   /* the ring passing the camera */
--wire-mid:   rgba(255,255,255,0.35)   /* mid-corridor structure     */
--wire-far:   rgba(255,255,255,0.10)   /* dissolving into the throat */
```

---

## 3. Typography System

Three families already loaded. Each gets one job and never crosses over.

### Display / Numerals — `Geist Pixel Square` (`--font-geist-pixel`)

The countdown, all times, all dates, all counts.

- Scale: `clamp(2rem, 5vw, 5rem)` → push the hero countdown to `clamp(3rem, 11vw, 9rem)`
- Weight 700, leading `0.9`, tracking `-0.06em`
- **Tabular numerals mandatory** — `font-variant-numeric: tabular-nums slashed-zero`. A countdown whose digits shift width is broken.
- The slashed zero is a signature, not an accident. Keep it visible.

### Headline — `Space Grotesk` (`--font-space`)

Section titles, track names, the wordmark.

- Weight 700, leading `0.95`, tracking `-0.03em`
- Set **tight and stacked** — one or two words per line, ragged right, never centered. (Cf. `West / Kowloon / Cultural / District` and `Secret / Chiefs`.)
- Sentence case for prose headlines; the grotesk carries the weight, uppercase would flatten it.

### Body & UI — `Geist Sans` (`--font-geist-sans`)

- 1rem / leading 1.5 / tracking 0
- Max measure `62ch`. Long paragraphs break the corridor illusion — prefer short blocks pinned to grid columns.

### Micro-label — pixel mono, the workhorse of the style

The `KICKOFF` label in the current screenshot is already correct; it just needs to be used far more widely.

```
font: 700 0.6875rem/1.25 var(--font-geist-pixel);
letter-spacing: 0.24em;
text-transform: uppercase;
color: var(--ash);
```

Use for: section indices (`01 / TRACKS`), axis annotations, timestamps, coordinate readouts, card eyebrows.

### Hierarchy

```
DISPLAY    pixel mono   72–144px   countdown, dates
HEADLINE   grotesk      32–72px    section & track titles
VALUE      pixel mono   24–40px    prizes, counts, times
BODY       sans         16px       prose
LABEL      pixel mono   11px/0.24em  everything structural
```

### Novel treatments (this is where the style lives)

1. **Rotated marginalia** — `writing-mode: vertical-rl` micro-labels running up the left and right viewport edges, hugging the corridor walls. Venue, date, edition number. Directly from the OMA poster's rotated address block.
2. **Bilingual pairing (ES / EN)** — the reference posters pair Latin with CJK at ~0.6× scale. Lima's equivalent is Spanish set as the primary line with English beneath in `Ash` at 62%. This is free cultural specificity and it solves the bilingual-audience problem at the same time.
3. **Knockout overlay boxes** — a solid `Void` rectangle behind each headline line, sized to the text, so the type reads cleanly where it crosses grid lines. Cf. the *Secret Chiefs* wordmark.
4. **Oversized date lockup** — the event date set in pixel mono at display scale, anchored bottom-left of a section, spanning 6+ columns. `2026.08.07 —` as a graphic object, not an annotation.
5. **Corner registration marks** — 12px L-brackets at viewport corners in `--wire-far`. Print-crop-mark energy; costs nothing, reads instantly as considered.
6. **Slice displacement on transition** — 3–5 horizontal bands of a section offset ±8px on the X axis for ~120ms when it enters. The *mechanist* plate's whole identity, applied sparingly.

---

## 4. Key Design Elements

### 4.1 The corridor — geometry rules

The current background reads as a tangled web because the wormhole geometry twists (`TWIST = 0.05`), spins on Z (`rotation.z += dt * 0.06`), and carries 20 spokes plus 6 arms. Twisted rings viewed off-axis produce overlapping ellipses and moiré — the exact opposite of the reference plates, where **every line resolves to one point.**

The rules the references obey:

- **One vanishing point, locked to viewport center.** Every rail converges there. No off-axis camera, no roll.
- **Rectangular cross-section, not circular.** The reference corridors are rooms — floor, ceiling, two walls. `WireTunnel` already has this; it should be the primary structure, and the wormhole reserved for a single deliberate moment (the transition between acts), not the ambient state.
- **Regular spacing, uniform hairlines.** Equal Z steps. Same 1px weight everywhere; depth is carried by opacity only.
- **Line budget.** Roughly 16 cross-section rings × 12 rails. Past that it stops reading as architecture and starts reading as noise.
- **Ceiling and floor share the wall grid density** — the corridor is one continuous ruled surface wrapping the viewer.
- **No rotation on the corridor's own axis.** Movement is translation down `-Z` only. Rotation is what destroys the one-point read.

### 4.2 Floating planes as content

The OMA poster's gray rectangles — plates suspended in the perspective room at varying depths — are the model for cards.

- Cards are `rgba(143,143,143,0.12)` fills with a `--wire-mid` hairline border
- Slight perspective tilt (`rotateY(±2deg)`) so left-side cards angle toward the wall they're near
- They enter from the vanishing point and scale up as they approach — never fade up in place
- Radius `0`. This style has no rounded corners.

### 4.3 Graphic vocabulary

- **Hairline rules** (1px, `--rule`) separating every content block, full-bleed to the gutter
- **Index numbers** — `01`, `02`, `03` in pixel mono at label scale, prefixed to every section title
- **Coordinate annotations** — `12°02'S 77°01'W` (Lima) as an ambient marginal detail
- **Arrow glyphs** `→ ↓ ↗` in pixel mono for links, never chevron icons
- **Progress readout** — a live `%` of scroll depth in a fixed corner, framing the page as literal transit through the portal

### 4.4 Layout & grid

- Shell `86rem`, gutter `clamp(1.25rem, 4vw, 3rem)` — already correct
- **12 columns.** Content asymmetric: text blocks occupy columns 1–5 or 8–12, leaving the center column band open so the vanishing point is never occluded. This is the single most important layout rule — the void at center is the subject.
- Vertical rhythm on a 6px baseline (matches the existing `--mesh-size`)
- Full-bleed sections separated by hairlines, no card-in-container nesting

### 4.5 Motion

| Property | Value |
|---|---|
| Camera | constant drift down `-Z`, scroll adds velocity |
| Easing | `cubic-bezier(0.16, 1, 0.3, 1)` for entrances |
| Duration | 200ms UI, 600ms section entrances, 1200ms act transitions |
| Velocity response | scroll speed drives wire opacity `0.35 → 0.85` and streak length — never geometry twist |
| Reduced motion | corridor freezes at a static one-point plate; content cross-fades. The still frame must be a good poster on its own. |

---

## 5. Visual Concept

**The conceptual bridge:** the product is called *portal*, and a portal is only legible if there is something on the other side of it. The design makes the entire page that passage — the vanishing point is the destination, the corridor walls are where information lives, and scrolling is travel rather than reading.

**How the elements relate:**

- The **corridor** supplies structure. It is a literal three-dimensional realization of the Swiss grid — the same rules the type obeys, extruded down the Z axis. Grid and geometry are the same system seen two ways.
- **Type** is signage on that architecture. Micro-labels behave like wayfinding stencilled on a wall; display numerals are the departure board. This is why the pixel mono has to stay pixel — it reads as *installed* rather than *set*.
- **Signal orange** is the only thing that is alive. Against six achromatic values it functions as a beacon, so it must be rationed to state that genuinely changes: live, next, now.
- **Glitch** is punctuation, not texture. It marks thresholds — the moment of passing through — and disappears immediately.

**What makes it distinctive:** most event sites put a 3D background *behind* a conventional layout. Here the layout is derived from the geometry — the empty center column exists because the vanishing point is there, cards tilt because they are in the room, marginalia is rotated because it is on the wall. The two layers are one idea.

**Ideal use cases:** event countdowns and kickoffs, track/schedule listings, live status surfaces, prize reveals, poster and OG art, email headers (as static one-point plates), ticket and badge artwork.

**Where it fails:** dense documentation, long-form prose, data tables, anything requiring sustained reading. Route that content to a flat inverted-paper variant — `Void` type on `#FFFFFF`, same type system, corridor absent.

---

## Applying this to what exists today

Concrete deltas from the current build:

1. **Background** — replace the ambient twisted wormhole with the axis-aligned rectangular corridor (`WireTunnel`); drop `TWIST` and the Z-rotation; cut the line budget to ~16 rings × 12 rails. Reserve the wormhole for one act transition.
2. **Countdown** — scale up to `clamp(3rem, 11vw, 9rem)`, add `tabular-nums slashed-zero`, put a knockout box behind it.
3. **Micro-labels** — apply the `0.24em` pixel-mono label to every section eyebrow, not just `KICKOFF`.
4. **Layout** — pull content off center into columns 1–5 / 8–12; keep the vanishing point clear.
5. **Marginalia** — add rotated vertical edge labels (date, venue, coordinates) and corner registration marks.
6. **Bilingual** — introduce the ES primary / EN secondary pairing on hero and section headings.
