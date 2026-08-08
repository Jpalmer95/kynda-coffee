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

## Future Roadmap (do NOT execute)

- Customer-facing design studio re-enable (Epic 8 amendment).
- Loyalty/subscription engine deep work (existing roadmap docs).
- Gift-card / Stripe URL fixes if they regress.
- Printful mockup sync repair (ongoing 400s — Design Studio no longer
  depends on it).

---
*Owner: Jonathan Korstad · Status: ACTIVE · Updated: 2026-08-08 · This
document is authoritative for this workstream.*
