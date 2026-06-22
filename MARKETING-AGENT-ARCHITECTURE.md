# Kynda Coffee Marketing Agent Architecture

**Created:** June 2026
**Goal:** AI-native agentic marketing system for a solo-founded coffee shop — maximize reach and growth while minimizing owner time. The system captures raw media, auto-generates platform-specific content, validates against platform algorithms, routes through an approval gate, and publishes on a schedule. Hermes Agent crons drive strategy research and trend detection.

---

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        RAW MEDIA INGESTION                           │
│  /admin/marketing/media-drop  ← Team drops photos + videos here      │
│  Uploads → Supabase Storage (marketing-raw/) → organized by date     │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    CONTENT GENERATION LAYER                          │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ Content Drop    │  │ Marketing Loop   │  │ Media → Shorts     │  │
│  │ (image → posts) │  │ (specials →      │  │ (video → Reels/    │  │
│  │                 │  │  campaigns)      │  │  Shorts/TikTok)    │  │
│  └────────┬────────┘  └────────┬─────────┘  └────────┬───────────┘  │
│           │                    │                     │               │
│           ▼                    ▼                     ▼               │
│  OpenAI Vision captions + brand voice + platform-specific rules     │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    VALIDATION LAYER                                  │
│  X Algorithm Validator — checks post against open-source algo rules  │
│  Platform validators — character limits, hashtag limits, image specs  │
│  Brand voice checker — ensures warmth/authenticity, flags corporate  │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    APPROVAL GATE (owner = you)                       │
│  /admin/marketing/approvals                                          │
│  Every agent-generated post lands as pending_approval.              │
│  You approve → scheduled/published. You reject → gone.              │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    PUBLISHING LAYER                                  │
│  X (Twitter v2) │ Facebook Pages │ Instagram Graph │ Bluesky │ TikTok│
│  publish-due cron runs every 15min, publishes scheduled posts       │
└──────────────────────────────────────────────────────────────────────┘

         ↕ INTELLIGENCE LAYER (Hermes Agent Crons) ↕

┌──────────────────────────────────────────────────────────────────────┐
│  1. Trending Research (3x/week) — scans coffee/food industry for     │
│     trending posts, hashtags, content ideas → delivers to you        │
│  2. Weekly Marketing Loop (Mon 8am) — picks specials → drafts posts  │
│  3. Growth Insights (daily) — revenue/customer signals → recs        │
│  4. Newsletter Send-Due (daily 1pm) — flushes approved newsletters   │
│  5. Strategy Agent (weekly) — reviews performance, recommends next   │
└──────────────────────────────────────────────────────────────────────┘
```

## Existing Infrastructure (Already Built)

| Component | Location | Status |
|-----------|----------|--------|
| Marketing AI Chat | `/admin/marketing/chat` + `src/lib/marketing/claude.ts` | Working |
| Image Library | `/admin/marketing/images` + upload/process/alt-text APIs | Working |
| Content Drop | `/admin/marketing/content-drop` + `src/lib/marketing/content-drop.ts` | Working |
| Approval Queue | `/admin/marketing/approvals` + `src/lib/marketing/social/publisher.ts` | Working |
| Social Scheduler | `/admin/marketing/social` + platform clients (X, FB, IG) | Working |
| Marketing Loop | `src/lib/marketing/loop.ts` + `/api/marketing/loop/run` cron | Working |
| Growth Insights | `src/lib/marketing/insights.ts` + `/admin/insights` | Working |
| Newsletter System | `src/lib/marketing/newsletter*.ts` + `/admin/newsletters` | Working |
| Agent API Bridge | `/api/admin/agent` (X-Agent-Key auth) | Working |

## New Components (This Build)

### 1. X Algorithm Validator (`src/lib/marketing/validators/x-algorithm.ts`)
Pure, testable logic that scores X/Twitter posts against the open-source algorithm signals:
- **Positive signals:** replies/engagement, dwell time (longer posts), media attachments, threads, consistent posting cadence, replies to big accounts
- **Negative signals:** external links (algorithm throttles), reply-guying, blocked/muted by many, repetitive content, posting too fast
- **Brand safety:** checks for spammy patterns, excessive hashtags, all-caps, excessive emoji
- Returns: score (0-100), list of issues, list of strengths, suggested improvements

### 2. Trending Research Cron (Hermes)
- **Schedule:** 3x/week (Mon/Wed/Fri 9am)
- **What it does:** Searches X and web for trending coffee/food/beverage content, hashtags, and post formats. Summarizes top trends + actionable content ideas for Kynda.
- **Delivery:** Delivered to owner via Hermes (Telegram/CLI)

### 3. Raw Media Ingestion Hub (`/admin/marketing/media-drop`)
- Drag-and-drop upload for photos AND videos
- Auto-organizes by date + type (photo/video)
- Triggers processing pipeline: photos → resize variants + alt-text; videos → queued for shorts processing
- Shows recent uploads in a gallery grid

### 4. Unified Marketing Dashboard (`/admin/marketing/dashboard`)
- **Command center** tying everything together
- Pipeline overview: raw media → drafts → pending → scheduled → published
- Growth insights summary (from insights engine)
- Trending research feed (latest from Hermes cron)
- Platform connection status
- Quick actions: drop content, run marketing loop, view approvals

### 5. Bluesky Publishing Client (`src/lib/marketing/social/bluesky.ts`)
- AT Protocol API client (no API key cost — free and open)
- Same PlatformClient interface as existing X/FB/IG clients
- Configured via `BLUESKY_IDENTIFIER` + `BLUESKY_APP_PASSWORD` env vars

### 6. Video/Shorts Pipeline Stub (`src/lib/marketing/video/`)
- Processing plan for raw video → platform-specific shorts (9:16 vertical, 60s max)
- FFmpeg-based extraction (trim, crop, caption overlay, watermark)
- Generates: TikTok, Instagram Reels, YouTube Shorts variants from one source video
- Phase 1: stub + queue structure. Phase 2: actual ffmpeg processing (needs server-side binary)

## Hermes Agent Integration

The Hermes Agent (running on the same VPS) drives the intelligence layer:

```
hermes cron jobs (already running):
├── Kynda Daily Sync (2am) — catalog/mockup sync
├── Kynda Weekly Marketing Loop (Mon 8am) — triggers /api/marketing/loop/run
├── Kynda Newsletter Send-Due (1pm daily) — flushes approved newsletters
├── Kynda MenuMetrics Nightly Sync (2:30am) — syncs menu metrics
├── Kynda Submissions Watchdog (9am/4pm) — alerts on untriaged submissions

NEW hermes cron jobs:
├── Kynda Trending Research (Mon/Wed/Fri 9am) — web search + X scan for trends
└── Kynda Growth Strategy (Sun 5pm) — reviews week's performance, recommends next week's plan
```

## API Endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/marketing/loop/run` | CRON_SECRET / X-Agent-Key | Weekly marketing loop |
| `POST /api/marketing/social/publish-due` | CRON_SECRET / X-Agent-Key | Publish scheduled posts |
| `POST /api/marketing/content-drop` | Admin session | Create drafts from image |
| `POST /api/marketing/media/upload` | Admin session | Upload raw media |
| `GET /api/marketing/media/list` | Admin session | List raw media |
| `POST /api/marketing/validate/x` | Admin session | Validate X post |
| `GET /api/admin/agent` | X-Agent-Key | Agent bridge (status, insights, schedule) |

## Security Model

- **Approval gate is sacred:** No agent-generated content ever posts without owner approval. Enforced at the data layer (`publisher.ts` — agent source forces `pending_approval`).
- **API security:** Cron endpoints secured by `CRON_SECRET` or `X-Agent-Key`. Admin UI routes use Supabase session auth.
- **No PII in agent bridge:** Customer data is never exposed to the agent.

## Recommended Posting Cadence

Based on platform algorithm best practices for small business coffee shops:

| Platform | Frequency | Best Times (CST) | Content Type |
|----------|-----------|------------------|--------------|
| X/Twitter | 2-3x/day | 7am, 12pm, 5pm | Quick thoughts, replies, behind-the-scenes |
| Instagram | 1x/day | 11am, 7pm | High-quality photos, Reels, stories |
| Facebook | 3-4x/week | 9am, 1pm, 7pm | Community posts, events, longer content |
| TikTok | 1x/day | 6am, 10am, 10pm | Vertical video, trends, behind-the-scenes |
| Bluesky | 1-2x/day | 9am, 2pm | Similar to X but more conversational |
| YouTube Shorts | 3-4x/week | 12pm, 6pm | Vertical video, 60s or less |
