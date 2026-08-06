# Kynda Coffee — Hermes Agent Cron Marketing Pipeline (Plan)

**Created:** 2026-08-06 · **Owner:** Jonathan Korstad
**Status:** Plan + fixes shipped this session; rollout steps below.
**Companion docs:** `MARKETING-AGENT-ARCHITECTURE.md` (system diagram) · `kynda-marketing-agent` skill (ops runbook) · `src/lib/marketing/*` (code)

---

## 1. The One Rule

**Agents draft. Humans ship.**

Every autonomous marketing action that spends money, posts publicly, or emails
customers lands in the **approval queue** (`/admin/marketing/approvals`) as a
draft. The owner (or a delegated manager) approves → it gets scheduled/published.
This is enforced at the data layer (`publisher.ts` forces `pending_approval` for
agent-sourced posts) so no cron or prompt can bypass it.

---

## 2. Current State (what exists today)

| Piece | Status | Notes |
|---|---|---|
| Marketing Loop cron (Mon 8am) | ⚠️ was broken, **fixed** | `kynda-marketing-loop.sh` used `$CRON_SECRET`; local env has `KYNDA_CRON_SECRET`. Now falls back correctly. |
| Publish-Due cron (every 15 min) | ⚠️ was broken, **fixed** | Same auth bug; publishes `scheduled` posts via publisher. Silent when nothing due. |
| Submissions watchdog (9am/4pm) | ⚠️ was broken, **fixed** | Previously SSH+psql to droplet (broke on DB password rotation). Now calls new `GET /api/admin/inbox/counts` (CRON_SECRET auth) — no credentials needed. |
| Content Drop (`/admin/marketing/content-drop`) | ✅ live | Image → moderated → platform drafts → approval queue. |
| Approval Queue (`/admin/marketing/approvals`) | ✅ live | Approve / reject / edit drafts. |
| Social Scheduler + publisher | ✅ live | X (OAuth 1.0a), FB, IG, Bluesky, TikTok (stub). |
| Newsletter automation | ✅ live | `newsletters` table, Resend, RFC-8058 unsub; send-due cron 1pm daily. |
| X Algorithm Validator | ✅ live | Scores drafts 0–100 before they ship. |
| Growth Insights (`/admin/insights`) | ✅ live | Ranked recommendations from real sales/ops data. |
| Trending Research cron (Mon/Wed/Fri) | ⚠️ transient error | LLM job; last failure was a search-backend hiccup, retried cleanly. |
| Platform creds on prod | ⚠️ partial | **Only Bluesky actually publishes.** X/FB/IG/TikTok generate drafts but fail at publish until API credentials are added in Coolify. |

---

## 3. Recommended Architecture (the "best way")

For a solo, self-funded, no-budget operator, the winning pattern is:

```
┌─────────────────────────────────────────────────────────────┐
│  Hermes Agent (orchestrator + creative brain)                │
│  • cron jobs run the weekly/daily beats                       │
│  • LLM jobs do research + copywriting (trends, calendars)     │
│  • script jobs (no_agent) do auth-bound API calls             │
└───────────────┬──────────────────────────┬───────────────────┘
                │ drafts / seeds           │ research / briefs
                ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Kynda Platform (source of truth + execution)                │
│  • /api/marketing/loop/run        → campaign drafts          │
│  • /api/marketing/social/*        → posts, schedule, publish │
│  • /api/newsletter/*              → newsletter send-due      │
│  • /api/admin/inbox/counts        → watchdog counts          │
│  • /admin/marketing/approvals     → THE human gate           │
└───────────────▲──────────────────────────┬───────────────────┘
                │ owner approves            │ publish-due fires
                ▼                           ▼
        /admin/marketing/approvals   social_posts → platforms
```

**Why this beats the alternatives:**
- **In-app "AI scheduler"** (a cron inside Next.js calling the LLM): couples the
  creative brain to the app's uptime, costs API calls on your VPS, and rebuilds
  orchestration that Hermes already does for free.
- **Pure manual** (no cron): dies in week two — posting is the first thing a busy
  owner drops.
- **Hermes crons + Kynda APIs (chosen):** zero new infra, agents stay visible in
  one place (cron list), drafts land in the same approval UI, and each beat is a
  small prompt/script you can edit without redeploying the site.

**Auth pattern (the pitfall that broke 3 jobs):** Hermes cron scripts must use
`KYNDA_CRON_SECRET` (local env) or fall back to reading `~/.hermes/.env` — never
bare `$CRON_SECRET`. LLM-driven jobs call the agent bridge
(`/api/admin/agent`, `X-Agent-Key` **or** `Authorization: Bearer <CRON_SECRET>`).

---

## 4. Proposed Job Roster (target state)

| Job | Schedule | Type | What it does | Auth |
|---|---|---|---|---|
| Daily Catalog Sync | 2am | script | Square catalog + mockups sync | — |
| MenuMetrics Nightly Sync | 2:30am | script | Recipe costs, vendor prices, stock → cache | KYNDA_CRON_SECRET |
| **Content Calendar Builder** ⭐ new | Mon 6am | LLM + script | Pulls live specials + media library + trend brief → proposes a 7-day, 5-platform calendar as draft posts (source=`agent`) → approval queue. Replaces/augments the weekly loop. | script: KYNDA_CRON_SECRET |
| Weekly Marketing Loop | Mon 8am | script | Campaign drafts from live specials (teaser/deal/feature angles) | KYNDA_CRON_SECRET (fixed) |
| Trending Research | Mon/Wed/Fri 9am | LLM (web) | Coffee/food trend scan → trend brief saved for calendar builder | — |
| Publish-Due | every 15 min | script | Publish `scheduled` posts (silent when idle) | KYNDA_CRON_SECRET (fixed) |
| Newsletter Send-Due | 1pm daily | script | Flush approved newsletters | KYNDA_CRON_SECRET |
| Submissions Watchdog | 9am + 4pm | script | Alert only when inbox/careers/catering has untriaged items | KYNDA_CRON_SECRET (fixed) |
| Weekly Growth Strategy | Sun 5pm | LLM (web+terminal) | 7-day performance review → next week's plan, revenue snapshot | agent bridge |
| Vendor Price Watch | 1st of month 9am | LLM | Vendor price-trend report from MenuMetrics cache | agent bridge |
| **Specials-to-Newsletter** ⭐ new | monthly (1st, 9am) | LLM + script | Draft monthly "This Month at Kynda" newsletter from the specials SSOT | script + KYNDA_CRON_SECRET |
| **Platform Analytics Digest** ⭐ new | Mon 10am | LLM (web) | Pull platform insights where API creds exist → "what worked" brief | — |

The three ⭐ jobs are the actual "overhaul": a weekly calendar (not just specials),
a monthly newsletter, and a performance feedback loop. Everything else already runs.

---

## 5. The Content Workflow (one page for the team)

```
Drop assets (photo/video)      → /admin/marketing/media-drop  (ffmpeg shorts auto-made)
Generate drafts               → Content Drop / Content Calendar Builder / Marketing Loop
Score drafts                  → X Validator (0–100) — optional pre-check
APPROVE (human gate)          → /admin/marketing/approvals  ← owner or team lead
Schedule                      → /admin/marketing/social (or auto from calendar)
Publish                       → publish-due cron every 15 min
Measure                       → /admin/insights + platform digests → feeds next calendar
```

**Team access:** staff/managers can use media-drop, content-drop, and the approval
queue via their normal tier (`requireTier("staff"/"manager")`) — the owner doesn't
have to be the bottleneck. Only publishing credentials stay in Coolify env.

---

## 6. Platform Readiness (what blocks what)

| Platform | Drafts | Publish | Needed to go live |
|---|---|---|---|
| Bluesky | ✅ | ✅ live | — (already working) |
| X / Twitter | ✅ | ❌ | 4 OAuth 1.0a env vars from developer.x.com |
| Facebook Pages | ✅ | ❌ | `FACEBOOK_PAGE_ID` + `FACEBOOK_ACCESS_TOKEN` |
| Instagram | ✅ | ❌ | `INSTAGRAM_BUSINESS_ACCOUNT_ID` + FB token |
| TikTok | ✅ | ❌ | `TIKTOK_ACCESS_TOKEN` (client is a stub) |

Recommendation: go live with **Bluesky + X** first (both cheap/free to register),
then FB/IG when the cadence is proven, TikTok last.

---

## 7. Rollout (next steps, ≤ 1 day each)

1. **Deploy this session's fixes** (cron scripts + inbox-counts endpoint) — done in
   code; push + Coolify redeploy, then confirm the 4 previously-failing crons go
   green on their next tick.
2. **Add the Content Calendar Builder** cron (new prompt + thin script wrapping
   `/api/marketing/loop/run` with a 7-day planner prompt, or a new
   `/api/marketing/calendar` endpoint if the loop's scope is too narrow).
3. **Register X API credentials** in Coolify → X goes live; update the marketing
   dashboard platform cards.
4. **Specials-to-Newsletter** cron: drafts a monthly newsletter from
   `marketingSeedForSpecial` output; owner approves in `/admin/newsletters`.
5. **Monthly review ritual:** the Sunday Growth Strategy brief already exists —
   make it the place where the owner decides next month's calendar themes.

---

## 8. Guardrails (kept)

- No agent post ever publishes without `approved` status (data-layer enforced).
- `marketing_generated` specials are deduped so the loop doesn't re-draft the same
  special every week.
- Watchdog scripts stay silent when there's nothing to report (no noise).
- All secrets live in Coolify env or `~/.hermes/.env` — never in repo or prompts.
