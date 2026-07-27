# Brand Assets

This folder is the complete creative handoff for The Realtime Hackathon. Share
the whole folder with designers and content creators so linked assets and source
files stay together.

## Folder Guide

| Folder | Contents |
| --- | --- |
| `brand/` | Reusable logos, font files, and campaign artwork |
| `web/` | Open Graph artwork, event-listing artwork, and website icons |
| `email/` | Artwork made specifically for confirmation emails |
| `social/static/` | Ready-to-post still images grouped by campaign |
| `social/video/` | Ready-to-post rendered videos grouped by platform |
| `sources/` | Editable inputs such as transparent judge portraits |

`manifest.json` is the machine-readable asset index with dimensions. PNG files
are the default handoff format. WebP files are optimized web alternatives. SVG
files are the preferred scalable logo sources.

## Naming

Social filenames follow this order:

```text
subject-platform-placement-or-ratio.ext
```

Examples:

```text
event/instagram-feed-4x5.png
judges/arturo-barrantes-linkedin-4x5.png
video/instagram/schedule-4x5.mp4
```

## Regenerating Assets

Install the pinned brand font first, then generate the shared campaign set:

```bash
bun run font:setup
bun run brand:generate
```

After changing a portrait in `sources/portraits/judges/`, regenerate judge
announcements with:

```bash
bun run brand:generate:judges
```

Render social videos with:

```bash
bun run video:render
bun run video:render:poster
```
