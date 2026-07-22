<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Toolchain

- Use Bun; `bun.lock` is the lockfile. Install with `bun install`.
- The site is Next.js 16.2.11 App Router. `bun dev` serves it on port 3000; `bun run email:dev` serves the separate React Email previews on port 3001.
- There is no typecheck script. Run `bunx tsc --noEmit` explicitly.
- Full verification is `bun run lint`, `bunx tsc --noEmit`, `bun test`, then `bun run build`.
- Focus checks with `bunx biome check <path>`, `bun test <test-file>`, or `bun test -t '<name regex>'`.

## Structure

- The website entrypoints are `src/app/page.tsx` and `src/app/layout.tsx`; `@/*` resolves to `src/*`. Page-specific interactive/Three.js code is under `src/app/components/`, while reusable shadcn/Base UI primitives are under `src/components/ui/`.
- `emails/mentor-invitation.tsx` and `emails/judge-invitation.tsx` are preview entrypoints, not Next.js routes. Shared role schedules and operational copy live in `emails/_lib/event-details.ts`.
- `prepareConfirmationEmail()` in `emails/_lib/prepare-confirmation-email.tsx` is the send boundary: it renders HTML, plain text, and exactly one personalized PDF attachment.
- Event dates, duration, URLs, and prize copy are duplicated across the page, metadata/JSON-LD, countdown, email data, and generated brand art. Search all occurrences before changing event facts.

## Generated Outputs

- `bun run email:export` deletes and recreates ignored `.email-output/`. Export email HTML before `bun run letter:generate -- --role <mentor|judge> --name '<name>'`, or the export will remove generated letters.
- Email templates intentionally load deployed PNGs from `https://the-realtime-hackathon.vercel.app/brand-assets/`; `emails/email-assets.test.tsx` enforces that contract.
- `bun run brand:generate` requires `fc-match` to resolve the locally installed font as `Geist Pixel Regular`. It overwrites tracked assets in `public/brand-assets/`, `src/app/`, `public/og.png`, and `emails/static/`; run it only when regenerating the complete asset set.

## Email Operations

- Follow `docs/email-confirmations.md` before export, PDF generation, or delivery. Resend is documented as an example but is not installed or configured.
- Never commit recipient lists, private signature images, Discord/Google Meet links, or API keys. Generate and send one personalized attachment per recipient; do not batch them.
