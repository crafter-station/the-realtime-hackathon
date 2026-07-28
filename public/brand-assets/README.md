# The Realtime Hackathon Brand Assets

This folder is the complete creative handoff for The Realtime Hackathon. Share
the whole folder with designers and content creators so the publishing assets,
source files, and usage notes stay together.

## About The Event

The Realtime Hackathon is an online build weekend presented by Portal and
Crafter Station, taking place August 7-9, 2026. Developers build live,
multiplayer, and agentic products with Portal across four challenge tracks,
then compete for US$800 in cash prizes. The campaign idea is **Build AI that
happens now.**

Event website: [hack.useportal.co](https://hack.useportal.co)

## Find An Asset

| I need... | Go to... |
| --- | --- |
| Event wordmark | `brand/logos/realtime-hackathon-wordmark-*` |
| Portal logo | `brand/logos/portal-*` |
| Crafter Station logo | `brand/logos/crafter-station-*` |
| Instagram or LinkedIn event post | `social/static/event/` |
| Judge announcement post | `social/static/judges/` |
| Mentor announcement post | `social/static/mentors/` |
| Instagram video | `social/video/instagram/` |
| Open Graph or link-preview image | `web/open-graph/` |
| Luma event image | `web/listings/` |
| Favicon or app icon | `web/icons/` |
| Email artwork | `email/` |
| Editable judge portrait | `sources/portraits/judges/` |
| Editable mentor portrait | `sources/portraits/mentors/` |
| Canonical logo geometry | `sources/logos/` |
| Dimensions for every asset | `manifest.json` |

## Folder Guide

### `brand/`

Reusable identity files shared across channels.

```text
brand/
├── artwork/    # Particle-torus artwork used in campaign compositions
├── fonts/      # Packaged Geist Pixel web font
└── logos/      # Ready-to-use logo and event-wordmark variants
```

Everything in `brand/logos/` is a publishing asset. Each mark is available in
SVG, PNG, and WebP with a transparent background.

### `web/`

Assets used by the website and event platforms.

```text
web/
├── icons/         # Favicons, touch icon, and Portal app icons
├── listings/      # Square Luma event artwork
└── open-graph/    # 1200x630 link-preview artwork
```

Use `web/open-graph/event.png` when a platform requests an Open Graph or social
sharing image. Use `web/listings/luma-event-square.png` for square event
listings.

### `social/`

Ready-to-publish campaign content.

```text
social/
├── static/
│   ├── event/     # General event posts for Instagram, LinkedIn, and X
│   ├── judges/    # Individual judge announcement posts
│   └── mentors/   # Individual mentor announcement posts
└── video/
    └── instagram/ # Rendered event-poster and schedule videos
```

The platform, placement, or aspect ratio is included in each filename. These
files can be uploaded directly unless copy or event details need to change.

### `email/`

Small, optimized images used by the confirmation-email templates. These are
runtime assets rather than general-purpose logo exports.

```text
email/
├── crafter-station-64.png
└── signal.png
```

### `sources/`

Inputs used to regenerate publishing assets.

```text
sources/
├── logos/                  # Canonical Portal and Crafter Station vectors
└── portraits/
    ├── judges/             # Transparent, pixel-treated judge portraits
    └── mentors/            # Transparent, pixel-treated mentor portraits
```

Do not publish files from `sources/logos/` directly. Some masters intentionally
retain source-specific colors or backgrounds. Use the explicit files in
`brand/logos/` instead.

## Logo Variants

The event wordmark, Portal mark, and Crafter Station mark each have `dark` and
`light` variants:

| Suffix | Use | Mark color |
| --- | --- | --- |
| `-dark` | Dark-mode or dark-color backgrounds | White, with orange retained in the event wordmark |
| `-light` | Light-mode or light-color backgrounds | Signal Black, with orange retained in the event wordmark |

For example:

```text
brand/logos/realtime-hackathon-wordmark-dark.svg
brand/logos/realtime-hackathon-wordmark-light.png
brand/logos/portal-dark.webp
brand/logos/crafter-station-light.svg
```

Use SVG whenever the destination supports it. The event-wordmark SVGs contain
vectorized Geist Pixel glyph paths, so they do not require the font to be
installed.

## Colors

| Name | Hex | Typical use |
| --- | --- | --- |
| Signal Black | `#090909` | Primary background and light-mode logo foreground |
| Realtime Orange | `#ff4d00` | Primary accent, highlights, and `REALTIME` |
| Particle Silver | `#b8b8b8` | Particle artwork and supporting information |
| Interface Gray | `#8f8f8f` | Secondary marks and subdued interface details |
| White | `#ffffff` | Primary text and marks on dark backgrounds |

The dominant campaign treatment is Signal Black with White typography,
Realtime Orange emphasis, and silver particle artwork. Preserve strong
contrast and avoid recoloring the orange `REALTIME` line unless a new campaign
treatment has been approved.

## Typography

### Campaign Artwork

**Geist Pixel Square** is the primary campaign typeface. It is used for the
event wordmark, generated social artwork, Open Graph images, listing artwork,
email graphics, and video typography. The generator uses the pinned v1.7.2 font
file and converts important display text to vector paths to prevent font
substitution.

The packaged Latin web font is:

```text
brand/fonts/geist-pixel-latin.woff2
```

Install the pinned source font before regenerating artwork with
`bun run font:setup`.

### Website Supporting Type

The website also uses **Geist Sans** for readable body and interface copy and
**Space Grotesk** for selected editorial headings. These supporting fonts are
loaded by the website and are not included as downloadable brand files here.
Use Geist Pixel Square when creating campaign graphics that need to match the
provided assets.

## File Formats

| Format | Use |
| --- | --- |
| SVG | Preferred for logos and wordmarks; scalable vector output |
| PNG | Default high-quality handoff and platform-upload format |
| WebP | Smaller web-ready alternative; logo exports preserve transparency |
| MP4 | Rendered social video deliverables |
| WOFF2 | Packaged web-font format |

`manifest.json` is the machine-readable index of every asset and its dimensions.

## Naming

Social filenames generally follow this order:

```text
subject-platform-placement-or-ratio.ext
```

Examples:

```text
event/instagram-feed-4x5.png
judges/arturo-barrantes-linkedin-4x5.webp
video/instagram/schedule-4x5.mp4
```

Keep names lowercase and hyphenated. Include the platform and aspect ratio when
the output is channel-specific.

## Regenerating Assets

Install the pinned brand font, then regenerate the shared campaign, web, logo,
and email assets:

```bash
bun run font:setup
bun run brand:generate
```

After changing a portrait in `sources/portraits/judges/` or
`sources/portraits/mentors/`, regenerate role announcements separately:

```bash
bun run brand:generate:judges
bun run brand:generate:mentors
```

Render the Instagram videos with:

```bash
bun run video:render
bun run video:render:poster
```

Asset generation overwrites tracked outputs. Regenerate only when intentionally
updating the complete asset set, and review generated images before publishing.
