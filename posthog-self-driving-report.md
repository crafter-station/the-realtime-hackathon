# PostHog Self-driving Setup Report

**Project:** the-realtime-hackathon · PostHog project 253557  
**Date:** 2026-07-22  
**Inbox:** https://us.posthog.com/project/253557/inbox

## Summary

PostHog Self-driving has been configured for the Realtime Hackathon event site. Session Replay, Error Tracking, Support, health checks, and GitHub Issues signal sources are now enabled; the GitHub App is connected and a GitHub Issues warehouse source is syncing for `crafter-station/the-realtime-hackathon`. The scout troop is running four active scouts (general, web-analytics, surveys, and a custom registration-CTA scout). Findings will begin appearing in the inbox at https://us.posthog.com/project/253557/inbox within ~30 minutes.

---

## AI Data Processing

**Status:** Approved — the organization-level AI data processing consent was verified before this run started.

---

## GitHub

**Status:** Connected during this run  
**Integration:** `crafter-station` (GitHub App, integration id 189037)  
Self-driving can now research findings against the repository and open fix branches.

---

## Products Enabled

| Product | Status | Notes |
|---|---|---|
| Session Replay | Enabled | Enabled through the project settings API after the wizard run. |
| Error Tracking | Enabled | Browser exception autocapture enabled through the project settings API after the wizard run. |
| Support (Conversations) | Enabled | Enabled through the project settings API after the wizard run. Tickets arrive once an inbound channel (email / inbox / Slack) is connected. |

`products-enable` was not available in the wizard's MCP session, so these products were enabled afterward with the project-scoped PostHog CLI.

---

## Signal Sources

| source_product | source_type | Action | Notes |
|---|---|---|---|
| `signals_scout` | `cross_source_issue` | Skipped (default ON) | Scout gate is on by default; no config row needed. |
| `health_checks` | `health_issue` | **Enabled** (id `019f8aab-d4a5-727a-b557-dff8547c7756`) | Always on — instrumentation health issues are actionable. |
| `error_tracking` | `issue_created` | **Enabled** (id `019f8aab-d9b8-7423-a1c7-ef7c9d7394e4`) | Armed; activates once error tracking is on and captures its first exception. |
| `error_tracking` | `issue_reopened` | **Enabled** (id `019f8aab-dd1b-7ab6-99b2-8468337cd4b5`) | — |
| `error_tracking` | `issue_spiking` | **Enabled** (id `019f8aab-e0c1-7c2c-ae42-d627bb8421dd`) | — |
| `session_replay` | `session_analysis_cluster` | **Enabled** (id `019f8aab-e36a-7e39-845a-0b56df8fd09d`) | Server default sample rate 10%; activates once session replay product is on. |
| `conversations` | `ticket` | **Enabled** (id `019f8aab-e6a8-7310-9f19-c7733547c743`) | Dormant until Conversations product is on and an inbound channel is connected. |
| `github` | `issue` | **Enabled** (id `019f8ab1-6015-7770-8c47-8cd236269701`) | Wired to the GitHub Issues warehouse source created this run. |

---

## Connected Tools

| Tool | Status | Notes |
|---|---|---|
| GitHub Issues | **Connected by this setup** | Source id `019f8ab1-48a5-0000-a62b-9afbade317cb`. Syncing `issues` table (incremental on `updated_at`) for `crafter-station/the-realtime-hackathon`. Additional tables can be enabled in the PostHog UI. First sync started automatically. |

---

## Scout Troop

### Active (4)

| Scout | Type | Reason enabled |
|---|---|---|
| `signals-scout-general` | Canonical | Always on — cross-product correlations and surfaces no specialist covers. |
| `signals-scout-web-analytics` | Canonical | Primary surface: Next.js event site with active sessions; watches per-channel traffic, attribution, and landing-page health. |
| `signals-scout-surveys` | Canonical | 1 active survey ("Open feedback") confirmed; watches for score regressions, response drops, abandonment, and open-text themes. |
| `signals-scout-registration-cta` | Custom | Project-specific gap — see Custom Scouts below. |

### Disabled (24)

| Scout | Reason |
|---|---|
| `signals-scout-error-tracking` | Covered by native `error_tracking` source (step 4). |
| `signals-scout-session-replay` | Covered by native `session_replay` source (step 4). |
| `signals-scout-ai-observability` | No LLM usage in this project. Enable if AI features are added. |
| `signals-scout-anomaly-detection` | No dashboard/insight baseline yet. Enable once insights are created. |
| `signals-scout-apm` | No distributed tracing configured. |
| `signals-scout-conversations` | No active support tickets; Conversations needs an inbound channel first. |
| `signals-scout-csp-violations` | No CSP reporting configured. |
| `signals-scout-customer-analytics` | No group/accounts analytics in this project. |
| `signals-scout-data-pipelines` | No CDP destinations or batch exports configured. |
| `signals-scout-data-warehouse` | GitHub Issues source present but not a primary Self-driving focus; enable if sync failures need monitoring. |
| `signals-scout-experiments` | No active A/B experiments. |
| `signals-scout-feature-flags` | No feature flags in use. |
| `signals-scout-health-checks` | Kept small — general covers cross-product health. |
| `signals-scout-inbox-validation` | No resolved fixes to validate on a fresh setup. Enable after the first fixes ship. |
| `signals-scout-ingestion-warnings` | Kept small — general covers this. |
| `signals-scout-insight-alerts` | No configured insight alerts yet. |
| `signals-scout-logs` | PostHog logs product not in use. |
| `signals-scout-mcp-tool-calls` | Not relevant for this event website. |
| `signals-scout-observability-gaps` | Kept small — general covers cross-product gaps. |
| `signals-scout-product-analytics` | No saved funnels or retention flows yet. Enable once flows are created. |
| `signals-scout-replay-vision` | No Replay Vision scanners configured. |
| `signals-scout-revenue-analytics` | No payment SDK. Registrations go to external Luma platform. |
| `signals-scout-skills-store` | Not relevant for this project. |
| `signals-scout-web-vitals` | Kept within the 2-specialist cap; enable if Three.js LCP/INP/CLS regressions become a concern. |

---

## Custom Scouts

### Created: `signals-scout-registration-cta`

**What it watches:** The click-through rate on the "Register free" CTA (external Luma registration link, href contains `lu.ma` or `luma.com`) relative to daily session volume. Captured via posthog-js autocapture as `$autocapture` element click events.

**Discriminator:** Sessions staying stable while CTA clicks drop — a ratio collapse, not a correlated traffic fall. Raw click counts are normalized against session volume before any conclusion is drawn.

**Why no built-in scout covers it:** `signals-scout-web-analytics` watches session volume, attribution, and bounce/404 health, but not whether a specific external CTA is being clicked at a proportional rate. The registration button is the sole conversion action on this single-page event site.

**Speak-up conditions:** CTA click-through drops >30% vs 7-day rolling average while sessions stay within ±20% of norm; or two consecutive days with zero clicks but >5 sessions/day.

**Noise escape hatch:** If this scout becomes noisy, set `emit: false` on its config in PostHog to switch it to dry-run (it keeps running and saving memory, but stops filing inbox reports).

### Surfaces considered and ruled out

| Surface | Filter that killed it |
|---|---|
| Countdown expiry / event timing | Not watchable — no PostHog events for countdown state. |
| Three.js web vitals | Has a dedicated built-in scout (`signals-scout-web-vitals`); enable that instead of duplicating it. |
| 404s / broken partner links | Already covered by `signals-scout-web-analytics` (landing-page health). |
| Session depth / scroll engagement | Already covered by native `session_replay` source (session analysis clusters). |

---

## Follow-ups

- [ ] **Connect a Conversations inbound channel** — email, inbox, or Slack must be connected before support tickets reach the inbox. Configure at https://us.posthog.com/project/253557/settings.
- [ ] **Enable web vitals scout if Three.js performance matters** — `signals-scout-web-vitals` was disabled to stay within the 2-specialist troop cap. Enable it from the PostHog inbox settings if LCP/INP/CLS regressions on the Three.js-heavy page become a concern.
- [ ] **Enable scouts for surfaces you add later** — if you add feature flags, A/B experiments, or LLM features, re-enable the matching specialist scout (`signals-scout-feature-flags`, `signals-scout-experiments`, `signals-scout-ai-observability`) from the PostHog inbox settings.
- [ ] **Post-event scout cleanup (Aug 9+)** — after the hackathon closes, the `signals-scout-registration-cta` scout will correctly go quiet (no more registration traffic). You may disable it or leave it — it closes out cheaply when no CTA traffic is found.

---

## What Happens Next

The scout coordinator picks up the fresh configs within **~30 minutes**. After the first run cycle, findings cluster into reports in your inbox. Immediately-actionable reports (broken CTA, traffic regression, survey response drop) can automatically start coding tasks against your GitHub repository.

Check your inbox: https://us.posthog.com/project/253557/inbox
