# MASTER_PLAN — Kynda Coffee: Team Ops & Admin Portal (2026-08)

> **How to use this document:** This is the authoritative living plan for the
> Team Management + Admin Portal + Ingredients/Ordering workstream. Agents
> (Hermes, Codex, etc.) work phase-by-phase, top to bottom. Mark `[x]` on a
> task ONLY after its Success Criteria pass (build green, feature verified).
> Commit after every task with a conventional message. Never commit secrets.
> Record every meaningful decision under **Recorded Decisions** (append, never
> rewrite history). When a phase is fully checked, it is done — do not revisit
> unless the owner asks.

## Vision

Kynda Coffee's platform becomes the single operations hub for the business:
an admin portal where the owner runs the whole company (team, training,
hiring, recipes, ingredients, ordering), and a staff portal the team actually
wants to use every day — replacing GroupMe for chat and paper/Excel for
checklists and par counts, with AI handling hiring triage and long-term
ordering.

## Current State (honest snapshot — 2026-08-08)

- **Stack:** Next.js 16 (App Router) · React 19 · Tailwind (Modern Artisan
  palette per DESIGN.md) · Supabase (hosted) · Square POS · Stripe · Twilio ·
  Resend · MenuMetrics (menumetrics.org) agent bridge.
- **Deploy:** Coolify on droplet 167.99.125.127, live at
  https://kynda.167.99.125.127.sslip.io. Push to GitHub → Coolify redeploys.
- **Admin portal:** ~40 pages, all API routes on `requireTier()` from
  `lib/auth/team` (owner/manager/staff tiers). Baseline `next build` is GREEN.
- **What already works** (do NOT rebuild, polish only):
  - `/admin/team` — invite, role changes, search (owner-gated writes).
  - `/admin/chat` — channel-based chat (chat_channels/chat_messages),
    pin/delete, unread counts. **BUT no media upload UI/endpoint exists.**
  - `/staff/chat` — single-room text chat on `team_messages` (realtime).
    **Text only — no images/videos.**
  - `/admin/training` + `/training` — module CRUD, courses, progress.
  - `/staff/recipes` — recipes table + seed fallback. **No admin CRUD.**
  - `/staff/handbook` — handbook_sections. **No admin CRUD page.**
  - `/staff/onboarding` — onboarding_documents + onboarding_progress.
    **No admin management page.**
  - `/staff/checklists` — ChecklistClient w/ per-item check + completions API.
    **Items hardcoded in TWO places (page + client); `checklists` table
    unused; NO admin log view (per member / per date).**
  - `/staff/par-counts` + `par_counts` table — manual counts, under-par flag.
  - `/admin/inventory` + MenuMetricsPanel + `/api/admin/menumetrics` —
    recipe costs, stock, alerts, price watch.
  - `/admin/careers` — openings CRUD + applications w/ status.
    **No resume upload to storage, no AI ranking, no interview flow.**
- **Known gaps this plan closes:** admin log for checklist completions; media
  in team chat; admin CRUD for recipes/training-checklists/handbook/onboarding;
  How-To page (equipment cleaning, cold brew + corny keg); AI Hiring portal;
  Ingredients dashboard + par-count → order engine (HEB biweekly / Amazon
  monthly); remove Schedule from admin portal (Square owns scheduling).

## Recorded Decisions

| # | Date | Decision |
|---|------|----------|
| 1 | 2026-08-08 | Schedule stays on Square. Remove `/admin/schedule` nav + page. Staff schedule page left in place (shift visibility) but no new work on it. |
| 2 | 2026-08-08 | One chat system: unify on channels model (`chat_channels`/`chat_messages`). Staff chat is migrated off `team_messages` so there is exactly one GroupMe replacement with media. |
| 3 | 2026-08-08 | Checklist items move to DB (`checklists` table, one row per shift type). Completion records gain `completed_items` + we add an admin log page with filters (member / date / type). |
| 4 | 2026-08-08 | AI Hiring: extend `job_applications` (resume storage_path, availability, start_date, bio, ai_score, ai_rank, ai_summary) + new admin review page. AI via existing `lib/ai/client.ts` (OpenAI-compatible). |
| 5 | 2026-08-08 | Ingredients: MenuMetrics stays source of truth for costs. Kynda adds `ingredient_pars` (par target, vendor, cadence) + order-list engine. Order lists are generated suggestions, human approves before sending. |

---

## Phase 0 — Admin portal cleanup & quick wins

- [x] Remove `/admin/schedule` (nav entry in `admin/layout.tsx`, page file,
      sitemap entry, strategist/command-center references).
- [x] Fix staff chat `load()` — add catch/error state (was silently stuck).
- [x] Fix staff schedule + par-counts load() error states.
- [x] Add Cancel button for pending staff schedule requests (API already
      supports `status: "cancelled"`).
- [x] Admin inventory: inline threshold editing + PATCH handler.
- [x] Promo-codes: error toast branches on delete/toggle.
- [x] Image-sync: requireTier-protected admin endpoint (browser was 401).
- [x] Training page: fix `.limit(1)` course bug (unified on training_modules
      with completion tracking via new /api/training).
- [x] `npm run build` green + commit.

## Phase 1 — Shift Checklists: DB-driven + Admin Log

- [x] Migration 043+044: seed `checklists` rows (opening/closing/mid-shift),
      enrich `checklist_completions` (add `checklist_type`, repoint FK).
- [x] Checklist API: GET /api/staff/checklists (DB items, fallback seed),
      POST complete (existing, extended), GET /api/admin/checklists/log
      (filters: team member, date range, type).
- [x] Staff UI: load items from DB; completion banner shows name + date +
      checklist name; per-item check persists.
- [x] Admin log page `/admin/checklists`: table of completions — filter by
      member (their completion history) or by date (who completed what), with
      per-item detail expand.
- [x] Admin CRUD for checklist items (`/api/admin/checklists` POST/PATCH/
      DELETE) + UI to edit items per shift type.
- [x] Build green + commit.

## Phase 2 — Team Chat: image/video/text (GroupMe replacement)

- [x] Migration 045: add `media_type` + `video_url` to `chat_messages`
      (image_url exists); ensure realtime publication includes chat_messages.
- [x] Upload API: POST /api/chat/upload (staff+; image/video; Supabase Storage
      bucket `team-chat`; size/type caps; returns public URL).
- [x] Admin chat UI: attach button (image/video), preview, send w/ media,
      render video player; keep pin/delete.
- [x] Staff chat: media upload + render media.
- [x] Realtime: subscribe to chat_messages insert (or keep 5s poll for staff).
- [x] Build green + commit.

## Phase 3 — How-To page (equipment, cold brew + corny keg)

- [x] Migration 046: `howto_guides` (title, category, content JSONB steps,
      media urls, order, active).
- [x] Admin CRUD page `/admin/how-to` (manager+).
- [x] Staff page `/staff/how-to`: categorized cards, expandable steps,
      images/video; search.
- [x] Seed content: espresso machine cleaning, grinder cleaning, cold brew
      brew + corny keg load, drip brewer, pastry case, KDS/kitchen equipment.
- [x] Build green + commit.

## Phase 4 — Recipes: admin CRUD + staff polish

- [x] Admin page `/admin/recipes` (CRUD via /api/admin/recipes — table exists).
- [x] Staff recipes: search + category filter + image support.
- [x] Build green + commit.

## Phase 5 — Team AI Hiring portal

- [x] Migration 047: extend `job_applications` — resume_storage_path,
      availability, start_date, bio, ai_score, ai_rank, ai_summary,
      interview_status, interview_notes.
- [x] AI triage: POST /api/admin/careers/ai-review — score vs role requirements
      (lib/ai/client.ts), emit rank + summary + suggested questions.
- [x] Admin review portal `/admin/careers` upgrade: ranked list, AI summary,
      status workflow (new -> reviewed -> interview -> hired/rejected),
      interview prep (availability/start date/bio + suggested questions).
- [x] Build green + commit.

## Phase 6 — Ingredients dashboard + ordering engine (MenuMetrics link)

- [x] Migration 048: `ingredient_pars` (ingredient_name, par_level,
      vendor HEB|Amazon|Other, cadence biweekly|monthly, active) +
      `purchase_orders` (draft/approved/ordered/received workflow).
- [x] Admin page `/admin/ingredients`: par targets + on-hand from latest
      par_count or MenuMetrics stock; computed "order qty = par - on hand".
- [x] Order engine: POST /api/admin/orders/suggest -> grouped order lists
      (HEB biweekly / Amazon monthly); store draft in purchase_orders;
      admin approves/marks ordered/received.
- [x] Build green + commit.

## Phase 7 — Onboarding admin + Handbook admin + final polish

- [x] Admin onboarding page: manage onboarding_documents (upload, link,
      required flag) + view per-hire progress.
- [x] Admin handbook page: CRUD handbook_sections.
- [x] Training: unified on training_modules (fixed in Phase 0).
- [x] Final `npm run build` green.
- [x] Commit + push + Coolify redeploy triggered.

## Phase 8 — Drive Export → Platform Content Pipeline (2026-08-11)

Connects the Kynda Google-Drive export (reorganized under
`/mnt/flex/Kynda 2026 Drive Download 8.10.2026/KYNDA COFFEE 2026/`) to the
live staff/admin portal by seeding the private DB from the curated `_PLATFORM/`
folder. This is the "make the site the source of truth" phase.

- [x] Migration 049: create missing `recipes`, `waste_entries`, `handbook_sections`
      tables (the original staff-portal migration was only partially applied).
- [x] Seed 91 canonical recipes (drinks + food + seasonal) from
      `_PLATFORM/recipes` into `recipes`. Removed the filler `SEED_RECIPES`
      fallback from `/staff/recipes` — the DB is now the single source.
      Script: `scripts/seed_recipes_from_platform.py`.
- [x] Seed 8 real handbook sections from `_PLATFORM/handbook` into
      `handbook_sections` (real Kynda policy, not generic placeholders).
      Script: `scripts/seed_handbook_from_platform.py`.
- [x] Upgrade `checklists` with real Shift Duties 2025 items (13 opening /
      10 mid-shift / 17 closing). Script: `scripts/seed_checklists_from_platform.py`.
- [x] Automated onboarding: adding a staff/manager/lead via POST `/api/admin/team`
      now sends a staff-onboarding email (handbook/training/recipes/checklists)
      and seeds `onboarding_progress` rows tracked in `/admin/team-ops`.
      Template: `src/lib/email/templates/staff-onboarding.tsx`.
- [x] `npm run build` green, committed, pushed, Coolify redeploy triggered.

### Phase 8 remaining (future)
- [x] Upload onboarding handbook/i-9/w-4 PDFs to the `onboarding` Storage bucket
      → **DONE 2026-08-12** (migration 050 created bucket + policies;
      `/api/admin/onboarding/upload` + file-upload UI in `/admin/team-ops`).
- [ ] Auto-link a new hire's completed onboarding docs into their
      `Current Employee Folders` record.
- [x] Digitize waste log + par sheets → reorder suggestions (MenuMetrics link).
      → **DONE 2026-08-12** — `/api/admin/orders/suggest` now factors last-7-days
      waste into reorder qty (`order = par − on_hand + waste`), exposes `waste_7d`.

## Phase 9 — Growth, checklist depth, onboarding polish (2026-08-12)

Deferred from the 2026-08-11 "next phase" list — built to robust spec here so a
fresh session can execute without re-discovery. Split into 3 self-contained items.

### 9.1 Monthly Marketing / Growth Review cron (Hermes, human-approved)
**Goal:** owner gets a monthly email/SMS digest of growth + a ranked list of
recommended actions; nothing publishes automatically.
- Existing pieces already done: marketing loop (`kynda-marketing-loop.sh`),
  publish-due (`kynda-publish-due.sh`), submissions watchdog, approval queue
  (`/admin/marketing/approvals`), growth insights (`/admin/insights`),
  `GET /api/admin/agent?action=insights` + `marketing_summary`.
- **Build:** a monthly (1st of month, ~8am) Hermes cron that calls the agent
  bridge `insights` + `marketing_summary` + `price_watch`, composes a
  "Kynda Growth Report" (revenue, top sellers, peaks, growth vs last period,
  new customers, low-stock + vendor price alerts), and sends it to the owner
  via email (Resend) + Telegram (deliver target). Human reviews; the report is
  a recommendation, not an action.
- **Deliver:** `telegram` + email to owner. Never auto-posts.
- Files to touch: add cron job (Hermes `cronjob`), reuse `src/lib/email/templates`
  pattern for the report HTML. Reference `kynda-marketing-agent` skill.

### 9.2 Interactive time-stamped shift checklists
**Current:** `/staff/checklists` has per-item checkboxes; completion persists as
`checklist_completions` (whole-checklist `completed_at` + `completed_items`
array). `/admin/checklists` has a filtered log.
**Gap:** no per-item timestamp, and staff can't see "who did what & when" inline.
- **Build (low risk):** store per-item timestamps. Add `completed_item_ts
  JSONB` (or upgrade `completed_items` to `[{text, checked_at}]`) to
  `checklist_completions`; the `complete` API records `checked_at: ISO` per item.
  Staff card shows "✓ {item} — {time}" for items checked in the last completion.
  Admin log row expands to show each item's checked time.
- Migration `051`: `ALTER TABLE checklist_completions ADD COLUMN IF NOT EXISTS
  completed_item_ts JSONB DEFAULT '[]'::jsonb;`
- Files: `src/app/api/staff/checklists/complete/route.ts`,
  `src/components/staff/ChecklistClient.tsx`,
  `src/app/admin/checklists/page.tsx`.

### 9.3 Onboarding → Current Employee Folder auto-link
When a hire completes all `onboarding_progress` tasks (status `complete`),
auto-create/refresh a row in a `current_employee_folders`-style table (or a
`hire_documents` table) so the Drive's per-employee folder pattern is mirrored
in the DB and the owner can pull signed docs.
- **Build:** a cron or an `onboarding_progress` UPDATE trigger that, when all
  tasks for a `hire_email` are complete, inserts a folder record with links to
  their signed docs (storage_paths). Keep it a draft for owner confirmation.

## Phase 10 — Master Par List + Cost-aware Waste Log (2026-08-12)

- [x] `ingredient_pars` seeded from the canonical HEB list (55 exact HEB website
      names) with real per-unit prices (28 priced). `/admin/ingredients` is the
      editable Master Par List (par, brand, vendor, cadence, cost).
- [x] Migration 052: `unit_cost_cents`/`brand`/`area` on ingredient_pars;
      `ingredient_id` + `unit_cost_cents` on waste_entries. Dropped restrictive
      area CHECK.
- [x] Staff waste-log sources HEB exact names + real costs from ingredient_pars
      (falls back to POS products). POST resolves ingredient vs product and
      computes real cost = qty × unit cost.
- [x] New `/admin/waste` cost report page + `/api/admin/waste/report`:
      weekly/monthly totals, by reason, top wasted items, and trend.
- [x] Build green, committed, pushed (4ad728c).

### Phase 10 remaining (future)
- [ ] Fill remaining ingredient_pars prices (28/55 priced) so all waste costs are real.
- [x] Weekly/monthly waste report → **replaced with saved monthly reports in the
      admin dashboard** (`/admin/waste` → Monthly Reports tab). No email cron.
      Migration 053 + `/api/admin/waste/reports` (GET/POST) + snapshot cards.
- [ ] Theft/expiration anomaly detection once >8 weeks of waste data exists.
- [ ] Amazon canonical list + Amazon order agent (mirror the HEB flow).

## Phase 11 — Amazon Ordering Mirror + Fixed Staff Count Sheet (2026-08-12)

- [x] Extracted EXACT item titles + ASINs from live Amazon "Kynda Food List"
      (29 items) + "Kynda Packaging + Supplies List" (34 items) via CDP
      (amazon_fetch_list.mjs).
- [x] amazon_canonical_list.tsv: 63 exact Amazon items (exact name | par | Amazon | cat | asin).
- [x] merge_amazon_list.py merges exact Amazon names with par-sheet pars (fuzzy).
- [x] Migration 054: asin + source columns on ingredient_pars.
- [x] Seeded 61 Amazon pars with exact names + ASINs (source='amazon-live').
- [x] `/staff/par-counts` rebuilt as a FIXED count sheet: vendor tabs
      (HEB/Amazon/All), items + pars read-only & locked, staff only enter
      on-hand counts. `/api/staff/par-counts?sheet=<vendor>`.
- [x] Build green, committed, pushed (d9ddaf8).

### Phase 11b — Single Master Ordering List (2026-08-12)
- [x] `kynda_canonical_list.tsv`: ONE 108-item master list (54 HEB + 54 Amazon),
      unified format `name|par|vendor|category|cadence|asin`.
- [x] `build_master_list.py` merges HEB + Amazon lists, dedups, and flags
      non-inventory items into `amazon_order_review.txt` (7 electronics excluded;
      36 Amazon items still need owner-set par values).
- [x] seed_pars + order_calculator now default to the master list.
- [x] Re-seeded DB: 108 pars (54 HEB + 54 Amazon with ASINs), cadence set.
- [x] Committed, pushed (84f2870).

### Phase 11 remaining (future)
- [ ] Amazon cart agent (mirror heb_list_agent.mjs) — search by ASIN for exact match.
- [ ] Reconcile par-sheet items not found in the live Amazon lists (some manual
      entries map to products not currently on either list).
- [ ] Optionally combine the two Amazon lists into one in Amazon, or keep both.

## Future Roadmap (do NOT execute)

- Customer-facing design studio re-enable (Epic 8 amendment).
- Loyalty/subscription engine deep work (existing roadmap docs).
- Gift-card / Stripe URL fixes if they regress.
- Printful mockup sync repair (ongoing 400s — Design Studio no longer
  depends on it).

---
*Owner: Jonathan Korstad · Status: ACTIVE · Updated: 2026-08-08 · This
document is authoritative for this workstream.*
