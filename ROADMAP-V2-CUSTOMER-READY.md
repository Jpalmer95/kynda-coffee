# Kynda Coffee Platform — Roadmap V2: Customer-Ready & Owner-Operated

**Created:** 2026-05-30
**Supersedes:** `KYNDA-COFFEE-MASTER-ROADMAP.md` (Phases 1–7, archived as historical record)
**Owner:** Jonathan Korstad (Kynda Coffee, Horseshoe Bay, TX)
**Mission:** Finish the original vision — a beautiful, fully working, customer-ready specialty
coffee shop platform that is **POS-agnostic, data-owned, and AI-operated**, where customers
order food/drinks, buy shipped goods + merch, apply for work, and find our info; and the owner
runs the entire business (metrics, marketing, sales, inventory, costs, B2B, staff) from one portal.

> **Deployment status (2026-05-30):** Migrations **018–024 are APPLIED to production Supabase**
> (`svfuuvaaynmcofyrkwus`) via the `:6543` transaction pooler — verified: `catalog_overrides.channel_visibility`,
> `specials`, `onboarding_documents`+`onboarding_progress` (6 docs seeded), `social_posts` approval columns
> (source/approved_by/approved_at/rejection_reason/special_id), `b2b_leads`/`b2b_accounts`/`b2b_orders`,
> and the MenuMetrics cache tables (`menumetrics_recipe_costs`, `vendor_prices`, `menumetrics_stock`,
> `inventory_alerts`) — all present with RLS enabled. Re-runnable via `scripts/apply-migrations-018-023.sh`
> (idempotent). **Still pending deploy:** Coolify redeploy of the app build + env vars
> (`MENU_METRICS_URL`/`MENU_METRICS_TOKEN`, `FAL_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`) so the new
> UIs/endpoints go live against this schema.

---

## How to Read This Document

This roadmap is **reality-grounded**. The previous roadmap declared "Phases 1–7 complete," but a
code audit (2026-05-30) shows most features exist as **scaffolding that needs to be finished,
connected, and hardened** — not polished, customer-ready experiences. The recent git history is
almost entirely bug-fixes on the ordering/checkout core, which tells the real story: the spine works,
the limbs are stubs.

Each Epic below has:
- **State today** — what actually exists in the repo (honest assessment)
- **Target** — what "done" looks like
- **Work** — concrete, checkable tasks with file paths
- **Why it matters** — business value

Epics are ordered by leverage. Work top-to-bottom. **Commit + push + update this doc after every
Epic**, then compress context before starting the next (per owner's workflow preference).

---

## Audited Current State (2026-05-30)

**Repo:** `/home/jonathan/dev/kynda-coffee` · **Prod:** kyndacoffee.com · **Stack:** Next.js 16,
self-hosted Supabase + Coolify (DO droplet), Square POS, Stripe, Printful, FAL, Resend, Twilio,
PostHog, Sentry. DNS on Porkbun.

**Pages that exist (78):** Full customer surface (menu, shop, order, cart, account, rewards,
subscriptions, gift-cards, blog, gallery, careers, location, faq, about, contact, catering, studio,
kiosk, qr-menu/order, track-order), staff portal (checklists, handbook, recipes, waste-log,
training), and admin (orders, products, catalog, customers, inventory, kds, analytics, marketing
chat/images/social, b2b, affiliates, gift-cards, promo-codes, qr-tables, schedule, settings,
subscriptions, designs, square, image-sync).

**Architecture strengths already in place:**
- **POS-agnostic catalog layer** (`src/lib/pos/catalog.ts`) — channel system (`menu`/`shop`/`qr`/
  `pickup`/`delivery`/`shipping`/`all`), `item_type` taxonomy (`menu`/`retail`/`merch`/`gift_card`),
  per-channel availability flags, **catalog overrides** table, and a `menu_metrics_recipe_id` field
  already wired into the catalog row. This is the backbone for everything.
- **POS adapter pattern** (`src/lib/pos/`) — Square adapter live, Toast stub present.
- **Marketing engine scaffold** — Claude tool-use agent (`src/lib/marketing/`), image processor
  (sharp), social publisher (X/FB/IG clients + cron-ready `publish-due` endpoint).
- **Design Studio** — Konva canvas, Printful catalog/estimate/create/confirm routes, moderation
  route, saved_designs table + RLS.
- **17 migrations** including training_platform, staff_portal_tables, referral/affiliate, design
  persistence, pos-agnostic catalog, catalog overrides.

**The honest gaps (what this roadmap fixes):**
1. **Menu vs Shop overlap** — `menu` channel currently includes `merch` items
   (`catalog.ts:225`), so merch leaks onto the menu. Classification leans on Square data quality.
   No clean owner control over "this is food/drink" vs "this is a shippable good."
2. **KDS is a 190-line single view** — no multi-station/filtered displays, no real-time push,
   limited tagging/stats.
3. **Staff portal pages are shells** (87–217 lines each) — no robust barista/baker course, no
   quizzes/logging depth, no onboarding document hub (I-9/W-4/handbook).
4. **Marketing is manual** — agent + publisher exist but no autonomous cron loop, no newsletter
   automation, no monthly-specials pipeline, no content drop → auto-process → schedule flow.
5. **B2B is a 155-line page** — no scouting automation, no pipeline/CRM, no outreach workflow.
6. **Design Studio not proven end-to-end** — needs adaptive profit-aware pricing + real catalog
   sourcing + recommendation engine.
7. **MenuMetrics is referenced (a recipe-ID field) but not integrated** — no live cost/inventory
   sync, no automated recipe import, no vendor price-trend tracking, no low-stock alerts.

---

## Cross-Cutting Principle: The Hermes Agent Operating Layer

A recurring owner goal is **"agentify" the business** — let agents run marketing, inventory, B2B
scouting, and pricing on Kynda's behalf. We will NOT rebuild an agent runtime inside Next.js.
Instead, the **lightweight, reuse-existing-tools** approach:

```
┌────────────────────────────────────────────────────────────┐
│  Kynda Platform (Next.js on Coolify)                         │
│  - Owns data (Supabase), serves customers + admin UI         │
│  - Exposes a stable Agent API bridge (already scaffolded:    │
│    /api/admin/agent + /api/marketing/agent)                  │
│  - Exposes cron-safe endpoints secured by CRON_SECRET        │
└───────────────▲──────────────────────────┬──────────────────┘
                │ reads metrics/inventory   │ posts results/drafts
                │                           ▼
┌───────────────┴──────────────────────────────────────────────┐
│  Hermes Agent (cron jobs + skills)                            │
│  - kynda-coffee-agent skill (exists) = control surface        │
│  - New cron jobs: marketing loop, B2B scout, monthly price    │
│    finder, low-stock watcher, newsletter drafter              │
│  - Calls platform Agent API; drafts land in admin for approval│
└───────────────────────────────────────────────────────────────┘
```

**Rule:** Every autonomous action that spends money, posts publicly, or contacts a business
**requires owner approval** in the admin portal before it fires. Agents draft; owner ships.

---

# EPIC 1 — Menu vs Shop Separation (Catalog Truth)

**State today:** `menu` channel includes `merch`; classification depends on Square `item_type`
guessed from category/name text (`categoryForPosItem`, `catalog.ts:416`). Overlap is structural.

**Owner clarification (2026-05-30):** The **Menu page is strictly for ordering food & drinks** —
it is a customer ordering surface, nothing else. **MenuMetrics is admin/backend only** (cost,
recipe, and inventory brain); it never renders on the customer Menu page. Customers see prices and
items; the cost/margin intelligence lives entirely in the admin portal.

**Target:** A crisp, owner-controlled split:
- **Menu** = food & drinks for ordering (in-store/pickup/curbside/to-go/delivery/QR): drinks,
  pastries, food, in-house made-to-order items. Customer ordering surface only.
- **Shop** = shipped/retail goods: bagged coffee, merch, Chemex/filters, loose-leaf bulk tea,
  candles/apothecary, custom AI merch. Has shipping logic + adaptive pricing.
- **Both (intentional)** = a *small* allowlist (e.g., bagged retail coffee available both as
  grab-and-go on menu AND shipped in shop) — explicit, never accidental.

**Work:**
- [x] Add a first-class `channel_visibility` concept to catalog overrides
  (`auto` | `menu` | `shop` | `both` | `hidden`), migration `018_catalog_channel_visibility.sql`.
- [x] Change `shouldIncludeItemForChannel` (`catalog.ts`): `menu`/`qr`/`pickup` channels **exclude**
  `merch`; explicit `channel_visibility` overrides the heuristic and forces an item onto the correct
  side. (`shipping` still serves merch; `shop` unchanged.) Unit-tested (62/62 pass).
- [x] Admin **Catalog Classifier** control (`/admin/catalog`): per-item "Show on (Menu vs Shop)"
  selector wired to the overrides API (with enum validation).
- [x] Bulk triage filter + "needs classification" view for new Square imports: `/admin/catalog`
  now has an effective-routing badge per item (Menu/Shop/Both/Hidden/Unclassified) and a routing
  filter dropdown; "Unclassified ⚠" surfaces items needing an explicit decision (commit 0d96561).
- [x] Default classifier heuristic on import: `categoryForPosItem` routes synced items into the new
  categories by name/category text, so new Square items land sensibly under `auto` visibility.
- [x] Seed new Shop-only sourced categories: Brew Gear (Chemex, filters, kettles, grinders),
  Bulk Tea (loose-leaf), Apothecary (candles/balms), Custom Designs (Design Studio). Added to the
  ProductCategory type, shop nav, dynamic category pages, and admin product create/edit.
- [ ] Verify on real synced catalog: load `/menu` → zero merch; load `/shop` → zero made-to-order
  drinks; "both" items appear in both with correct fulfillment options. *(Requires deploy of
  migration 018 + Coolify redeploy — see deploy task below.)*

> **Progress (2026-05-30, commits 38edf97 + 0d96561):** Epic 1 code-complete. Separation engine,
> owner control (Show on Menu/Shop selector), classification triage UI, import-time auto-sort, and
> the new Shop categories are all shipped and tested (62/62, tsc clean). Only remaining: deploy
> migration 018 to Supabase + redeploy, then verify against the live synced catalog.

**Why it matters:** This is the #1 customer-facing confusion and blocks adaptive pricing + sourcing.
Everything downstream (KDS routing, shipping logic, B2B) depends on knowing what a thing *is*.

---

# EPIC 2 — Adaptive, Profit-Guaranteed Pricing Engine

**State today:** Design Studio has `PRODUCT_MARKUP` tiers + a shipping buffer + a >$1 margin check.
Nothing platform-wide; Shop goods have no automated cost-aware pricing.

**Target:** A single pricing service that **guarantees profit on every sellable item** after cost
of goods, Printful/POD cost, shipping, payment fees, and a configurable target margin — applied to
Shop goods, custom merch, and (read-only advisory) menu items via MenuMetrics costs.

**Work:**
- [x] `src/lib/pricing/engine.ts` — pure function: `calculatePrice({costCents, shippingCents,
  paymentFeePct, paymentFeeFixedCents, targetMarginPct, minProfitCents, rounding})` →
  profit-guaranteed retail with a cost-plus floor so we never sell at a loss. Charm rounding
  (charm_99/charm_49_99/nearest_5/nearest_25) always rounds up. 19 unit tests incl. a property
  sweep asserting profitability never breaks (commit 3ffcf44).
- [x] Per-category pricing profiles (design-studio, merch-*, brew-gear, bulk-tea, apothecary,
  coffee-beans, wholesale) with `getPricingProfile()` + `priceForCategory()` convenience.
- [x] Wire Design Studio pricing to the engine: `/api/printful/estimate` now prices via
  `calculatePrice` using the cheapest live Printful shipping rate (else profile buffer), covers
  Stripe fees, enforces the floor, and returns a transparent `pricing` breakdown.
- [ ] Source cost basis from MenuMetrics (menu items, Epic 7) and vendor cost (Shop goods, Epic 7).
- [ ] Admin **Pricing Rules** page (`/admin/settings` → Pricing): per-category target margin,
  rounding, shipping-buffer strategy (persist overrides of the default profiles).
- [ ] Wire Shop product creation/`mapPosCatalogItemToProduct` to call the engine for retail.
- [ ] Nightly cron (Hermes): re-price Shop goods on vendor/POD cost change; "margin at risk" digest
  for owner approval before publishing.

> **Progress (2026-05-30, commit 3ffcf44):** Engine shipped + Design Studio integrated. The
> money-safety rail exists and is proven by a property test (profit never < min across a cost×margin
> sweep). Remaining: admin Pricing Rules UI, Shop-goods + MenuMetrics cost wiring, and the nightly
> re-price cron (the cost sources land in Epic 7).

**Why it matters:** Owner explicitly wants "smart adaptive pricing to always ensure profit on all
items including shipping." This is the money-safety rail.

---

# EPIC 3 — Smart KDS (Kitchen Display System)

**State today:** Single 190-line `/admin/kds` view.

**Target:** Multi-device, multi-station KDS runnable on any tablet/display. One "all orders" board
plus filterable boards (curbside-only, delivery-only, station: bar/kitchen). Real-time, touch-first,
with timing stats and clear pickup tagging.

**Work:**
- [ ] Promote KDS to its own route group `/(kds)` with a minimal full-screen layout (no admin chrome),
  protected by staff/admin auth, so it runs on a dedicated tablet logged in once.
- [ ] Real-time order feed via Supabase Realtime (subscribe to `orders` inserts/updates) — replace
  polling. New order = audible chime + card animation. *(Currently 10s polling.)*
- [x] Order card: large order #, customer name, **fulfillment tag** (Pickup/Curbside/Dine-In/
  Delivery), **curbside vehicle description** callout, item list w/ modifiers, elapsed timer
  (color-escalates green→amber→pulsing-red), order notes.
- [x] Board filters via URL (`?board=parking` for curbside, `?board=table` dine-in, etc.) so each
  tablet bookmarks its view. Board tabs with live per-board counts (commit 1ca0ea4).
- [x] Search + filter (name, #, vehicle, item). Board logic extracted to a tested pure module
  (`src/lib/orders/kds-board.ts`, 18 unit tests).
- [x] Stats strip: in-queue, avg prep time, longest-waiting, fresh/aging/late counts.
- [ ] Bump bar refinement: "Ready" triggers customer SMS/push (Twilio dep present) — wire to the
  existing notification path.
- [ ] Verify on a real tablet form factor (browser_vision QA at tablet viewport).

> **Progress (2026-05-30, commit 1ca0ea4):** Smart KDS core shipped — multi-board filtering
> (All/Pickup/Curbside/Dine-In/Delivery), fulfillment tags, curbside vehicle callout, search, stats,
> and escalating timers, all backed by tested pure logic and runnable on any tablet via `?board=`.
> Remaining: dedicated full-screen `/(kds)` route group, Supabase Realtime push (replace polling) +
> chime, and the Ready→SMS/push trigger.

**Why it matters:** This is the operational heartbeat once digital ordering scales. Owner wants
"any device," filterable boards, and easy management.

---

# EPIC 4 — Team Portal: Barista & Baker Academy + Operations

**State today (audited 2026-05-30):** Better than the original audit suggested. The
`004_training_platform.sql` schema is genuinely robust — courses → modules → lessons → quizzes →
lesson/module/course progress with completion functions. **A full Specialty Coffee curriculum is
already seeded** (`src/scripts/modules-*.ts` — seed-to-cup, espresso, brew methods, etc.).
`20260529_staff_portal_tables.sql` provides recipes, checklists + completions, waste_entries, and
handbook tables with RLS. Pages exist for checklists/handbook/recipes/waste-log/training.

**Target:** A genuine staff operating system: a robust **Specialty Coffee Barista + Baker course**
with modules, quizzes, and tracked completion; living handbook with acknowledgment; recipes (linked
to MenuMetrics costs); opening/closing/mid-shift checklists with logged completions; waste log with
loss analytics; and a **New-Employee Onboarding Hub** (blank I-9, W-4, handbook, training packet,
checklist — one place to expedite onboarding).

**Work:**
- [x] **Academy** curriculum + quiz engine + progress tracking — already built (robust seed-to-cup
  course content in `src/scripts/modules-*.ts` on the courses/modules/lessons/quizzes schema with
  `update_module_progress` / `check_course_completion` functions). *Polish remaining below.*
- [x] **Onboarding Hub** (`/staff/onboarding`) — migration 019 (`onboarding_documents` library +
  `onboarding_progress` per-hire tracker, RLS); page groups docs (Government Forms / Handbook /
  Training / Checklists) with required badges + a personal checklist when a manager assigns tasks.
  I-9 + W-4 link to official USCIS/IRS always-current sources; internal docs in the `onboarding`
  Storage bucket. Quick-link added to staff dashboard (commit a95b2a5).
- [ ] Baking + Food-safety/allergens academy modules (extend the existing curriculum scripts).
- [ ] Admin onboarding management UI (assign tasks per hire, upload handbook/packet PDFs to the
  `onboarding` bucket) — table + RLS ready; needs the admin screen.
- [ ] Handbook: add "Acknowledge & date" (stored) + "last updated" stamps to the existing page.
- [ ] Recipes: ingredient/step views, scaling, **cost-per-recipe pulled from MenuMetrics** (Epic 7),
  prep timers.
- [ ] Checklists: per-item notes + photo (temp logs); admin compliance-history view.
- [ ] **Waste Log**: auto cost (from MenuMetrics/vendor cost), photo; analytics page (waste by
  reason/product, trend, $ lost/month) feeding inventory reconciliation in Epic 7.
- [ ] Staff auth hardening: `is_staff`/role flag, invite flow, `/staff/*` middleware (audit current).

> **Progress (2026-05-30, commit a95b2a5):** Onboarding Hub shipped (the one fully-missing piece);
> Academy + quiz/progress infrastructure confirmed already in place. Remaining Epic 4 work is polish
> + admin management UIs + the MenuMetrics-cost wiring (lands with Epic 7).

**Why it matters:** Owner wants real training (not a stub), faster onboarding, and loss tracking.
Good baristas + low waste = margin and customer experience.

---

# EPIC 5 — AI Marketing & Growth Engine (Autonomous-with-Approval)

**State today:** Manual chat agent, image processor, social publisher + cron-ready `publish-due`.
No autonomous loop, no newsletter automation, no monthly-specials pipeline, no content drop pipeline.

**Target:** A self-driving marketing system the owner supervises: chat with marketing agents, drop
in feature images/video → auto-processed → drafts created for each platform → owner approves →
scheduled/posted. Automated newsletters and monthly-specials campaigns. Growth insights dashboard.

**Work:**
- [ ] **Content Drop pipeline**: `/admin/marketing/drop` — upload images/video; on upload, auto:
  generate per-platform crops (exists), alt-text/captions (Claude Vision exists), hashtag sets,
  and create **draft** `social_posts` for IG/FB/X/TikTok. Owner reviews in one queue.
- [x] **Approval gate** (data layer): `social_posts` gained `pending_approval`/`approved`/`rejected`
  states + `source` (manual|agent|content_drop|special|newsletter) + audit columns (migration 021).
  `createSocialPost` forces agent-sourced posts to `pending_approval` (can't auto-schedule);
  `approvePost`/`rejectPost` helpers; `publishDuePosts` only publishes `scheduled` — so nothing
  agent-generated posts without owner sign-off (commit 33d7800). *Approval queue UI still to build.*
- [ ] **Approval queue** UI: pending drafts → edit → approve → schedule/publish.
- [ ] **Hermes cron — Marketing Loop** (`kynda-coffee-agent` skill + new cron): weekly, the agent
  proposes a content calendar from upcoming specials/events, drafts posts (source=`agent` → lands in
  the approval queue), and notifies owner. Uses the platform Agent API; no auto-publish.
- [ ] **Newsletter automation**: Resend integration (dep present) — `newsletters` table, segment
  by loyalty/subscription, monthly + event-triggered (new specials, seasonal). Agent drafts copy;
  owner approves; cron sends. Double opt-in + unsubscribe (already have `/api/newsletter/subscribe`).
- [x] **Monthly Specials pipeline**: `specials` table (migration 020) is the single source of truth.
  `src/lib/marketing/specials.ts` (12 tests) provides date-window logic + `marketingSeedForSpecial`.
  The **Specials section now renders at the top of the Menu ordering page** (`CuratedSpecials`,
  owner-curated, falls back to the heuristic carousel when empty). The same record seeds marketing
  campaigns (commit 33d7800). The **admin Specials manager is now live** at `/admin/specials`
  (CRUD page + `/api/admin/specials`, commit 295a228) — owner curates the SSOT from the dashboard.
  *Auto-campaign generation from a special still to build.*
- [ ] **Growth Insights dashboard** (`/admin/marketing/analytics` + `/admin/analytics`): pull
  platform insights (IG/FB/X), surface AI recommendations ("post Tue 2pm," "video outperforms,"
  "loyalty churn rising"), tie to sales lift where measurable.
- [ ] **Content library / asset drop**: Supabase Storage `marketing-assets/` bucket browsable in
  admin; agents pull from it for scheduled posts.

> **Progress (2026-05-30, commit 33d7800):** Two load-bearing pieces shipped — the Monthly Specials
> single-source-of-truth (now live at the top of the Menu) and the marketing approval gate (agents
> draft, owner approves, enforced at the data layer). The **admin Specials manager** (`/admin/specials`,
> commit 295a228) is now live so the owner curates the SSOT directly. The **approval-queue UI**
> (`/admin/marketing/approvals`, commit ea71f29) is live too — agent drafts surface there for
> approve/reject. The **content-drop pipeline** is live too — `/admin/marketing/content-drop`
> + `/api/marketing/content-drop` (commit f27f503): drop a feature image, get moderated,
> platform-specific drafts (`src/lib/marketing/content-drop.ts`, OpenAI captions w/ brand
> fallback) landed in the approval queue. The **autonomous Marketing Loop** is live too —
> `src/lib/marketing/loop.ts` (weekly planner, 11 tests) + `/api/marketing/loop/run`
> (CRON_SECRET or X-Agent-Key) (commits e9a05bb, 3d9246e), wired to a Hermes weekly cron
> (Mon 8am, job d3627c96b629) that drafts campaigns for live/upcoming specials into the
> approval queue. The **Newsletter automation** is live too — migration 024 (newsletters table +
> subscriber unsubscribe tokens), `src/lib/marketing/newsletter.ts` (branded HTML from specials, 11
> tests) + `newsletter-sender.ts` (Resend, RFC-8058 one-click unsubscribe), `/admin/newsletters`
> (generate→approve→schedule/send) and `/api/newsletter/send-due` cron (commit 6dc3f21). The
> **Growth Insights dashboard** is live too — `src/lib/marketing/insights.ts` (13 tests) +
> `/api/admin/insights` + `/admin/insights` (commit d6fd89e): ranked, actionable recommendations
> from sales/marketing/ops signals. **Epic 5 is COMPLETE.**

**Why it matters:** This is the owner's headline ask — agents that drive growth and post on Kynda's
behalf, with the owner dropping in assets and chatting with marketing agents. Approval-gated keeps
brand safety.

---

# EPIC 6 — B2B / Wholesale Pipeline (Agentic Scouting → Approval → Outreach)

**State today:** 155-line `/admin/b2b` page, no automation, no CRM, no outreach.

**Target:** A wholesale growth machine: get Kynda into grocery stores, sign bulk/recurring business
accounts, and supply other coffee shops. An agentic cron scouts opportunities; on a find, it
**requests owner approval**, then proceeds to a guided outreach showcasing what Kynda offers.

**Work:**
- [x] **B2B CRM data model** (migration 022): `b2b_leads` (company, type, contact, location, source,
  status state machine new→approved→contacted→negotiating→won/lost/rejected, fit_score, est_value,
  outreach-tracking cols), `b2b_accounts` (tier, discount_pct, cadence, terms), `b2b_orders`
  (bulk/recurring). Admin RLS. (commit 6e76593)
- [x] **Wholesale catalog + landing**: public `/wholesale` page (benefits pitch + partner inquiry
  form) → `/api/wholesale/inquire` (rate-limited, scores the lead, inserts source=inbound/status=new).
- [x] **Lead scoring** (`src/lib/b2b/leads.ts`, 11 tests): deterministic 0–100 fit score (type,
  recurring value, local Hill Country boost, contactability, inbound signal), `isScoutWorthy`
  threshold, and a `canTransition` pipeline state machine.
- [ ] **Admin B2B portal** (`/admin/b2b`): replace the hardcoded mock with a Kanban pipeline over
  `b2b_leads` (PIPELINE_STAGES ready), account list, recurring order scheduler, wholesale price sheet
  (uses Pricing Engine `wholesale` profile from Epic 2).
- [ ] **Hermes cron — B2B Scout** (skill + cron): search local grocers/offices/cafes/venues (web +
  maps), score via `scoreLead`, insert `isScoutWorthy` finds as `new` leads, notify owner. Approved
  leads → agent drafts outreach email (Resend) w/ capabilities one-pager + price sheet; owner
  approves send. Track replies.
- [x] Guardrail (data layer): scout inserts leads at `status=new`; the state machine forbids
  jumping to `contacted`/`won` without passing `approved` — **no outreach without owner approval**.

> **Progress (2026-05-30, commit 6e76593):** CRM foundation shipped — real lead/account/order tables,
> tested scoring + pipeline state machine, public wholesale landing + scored inquiry API. Remaining:
> admin Kanban portal (replace mock), and the Hermes scout cron + outreach drafting (both build on
> the `b2b_leads` table this delivers).

**Why it matters:** Wholesale is the highest-leverage revenue expansion for a small shop. Owner
described exactly this scout→approve→showcase workflow.

---

# EPIC 7 — MenuMetrics Integration & Autonomous Inventory/Costing

**State today:** Only a `menu_metrics_recipe_id` field on catalog rows + a recipe-ID input in
`/admin/catalog`. MenuMetrics runs separately (github.com/Jpalmer95/MenuMetrics,
menu.167.99.125.127.sslip.io). Admin inventory page is 195 lines.

**Target:** Real-time, mostly-autonomous inventory + costing — **all in the admin backend**.
MenuMetrics is the cost/recipe brain (admin-only; never customer-facing). Kynda Platform consumes it for live margins, low-stock alerts, trending-item recommendations, and a
monthly **vendor "better-price" finder**. Ingredient/recipe cost down to the gram with waste factors
and densities (already solved inside MenuMetrics — we automate *using* it).

**Work:**
- [x] **Integration contract**: `docs/menumetrics-integration.md` defines the resources Kynda needs
  (recipe cost by ID, ingredient/vendor prices, stock levels), auth/config (`MENU_METRICS_URL` +
  `MENU_METRICS_TOKEN`), sync cadence, and build order. REST paths marked ‹verify› against the
  running instance, centralized in the client for a one-file flip (commit 33bd4c5).
- [x] `src/lib/menumetrics/client.ts` — typed, configurable client; no-ops gracefully when unset
  (falls back to cache). Cache tables in migration 023 (recipe costs, vendor prices, stock, alerts).
- [x] `/api/admin/menumetrics/sync` — cron-safe (CRON_SECRET) nightly sync: pulls linked recipe costs
  + vendor prices + inventory into the cache; raises dedup'd low-stock alerts. Read-only on MenuMetrics.
- [x] **Autonomous inventory brain** (`src/lib/menumetrics/inventory.ts`, 13 tests): stockStatus,
  detectLowStock, daysOfCover, priceTrend, and the monthly `findBetterPrices` (cheapest valid vendor,
  savings-sorted, advisory only).
- [x] **Cost-source bridge** (`cost-source.ts`): cached recipe/ingredient cost → Pricing Engine
  (Epic 2 advisory margin) + waste-log auto-fill (Epic 4).
- [ ] Confirm ‹verify› REST paths against the running MenuMetrics instance; flip client to live.
- [ ] **Recipe link UI** in `/admin/catalog` already stores `menu_metrics_recipe_id`; add the
  live-margin display column once sync runs.
- [ ] **Live inventory metrics** on `/admin/inventory`: surface cached stock, days-of-cover, value
  on hand, and open `inventory_alerts`; reconcile with waste log + Square sales.
- [ ] **Hermes crons**: nightly cost/stock sync + low-stock notify; monthly Better-Price Finder
  report (owner approves any vendor switch).
- [ ] **Trending menu recommendations**: agent joins cached recipe cost w/ Square sales → new/retire
  suggestions w/ margin mapped out (owner-approved).

> **Progress (2026-05-30, commit 33bd4c5):** Integration foundation shipped — contract doc, cache
> schema, typed client, the tested autonomous-inventory brain (low-stock / price-trend / better-price
> finder), the cost-source bridge to the Pricing Engine, and the cron-safe sync endpoint. Remaining:
> verify live REST paths, the admin inventory/margin UI surfaces, and the Hermes sync/finder crons.

**Why it matters:** Owner already built the hard part (gram-level costing). The win is **automating
its use** — live margins, alerts, vendor optimization, and growth recommendations feeding the rest
of the platform.

---

# EPIC 8 — AI Design Studio: Production-Grade Custom Merch

**State today:** Konva canvas, Printful catalog/estimate/create/confirm routes, moderation route,
saved_designs. Not proven end-to-end; pricing ad-hoc; no recommendation engine; no proven sourcing.

**Target:** A delightful in-house design studio: AI generation + user uploads + Kynda logo/presets
as movable layered "stickers" on a smart preview canvas over the real product; recommended designs
(Kynda-branded, locally/globally trending, genres: funny/cool/sporty, or anything the user prompts);
a fully customizable dropship catalog with **profit-guaranteed adaptive pricing** (Printful cost +
shipping + margin, via Epic 2); order → dropship → tracked.

**Work:**
- [ ] Prove the **full order path** end-to-end on real Printful (draft → Stripe pay → confirm →
  webhook tracking → customer email). Document and smoke-test. *(Routes exist; needs live proof.)*
- [x] Replace ad-hoc markup with **Pricing Engine** (Epic 2): `/api/printful/estimate` prices via
  `calculatePrice` — live retail = Printful cost + shipping + payment fee + target margin, never
  below floor (shipped in Epic 2, commit 3ffcf44).
- [x] **Recommendation engine** (`src/lib/designs/recommendations.ts`, 14 tests): preset packs
  (Kynda brand, local Hill Country, trending, funny/cool/sporty + minimal/nature/vintage/typography),
  brand-aware `buildGenerationPrompt`, seasonal `recommendThemes` (commit bb28e7a).
- [x] **Real AI generation**: `/api/designs/generate` rewired from a picsum stub to FAL flux/dev with
  a moderated, brand-aware, print-ready prompt; graceful placeholder only when FAL_KEY unset.
- [ ] Canvas polish: undo/redo, snapping, true product-image underlay (real mockups in Storage).
  *(Layered stickers + drag/resize/rotate + front/back already in DesignCanvas.)*
- [ ] **Catalog expansion + smart sourcing**: broaden Printful product set; auto-pull cost/variants;
  sourcing hook for trending non-merch Shop goods (Chemex, filters, candles) w/ adaptive pricing.
- [ ] Surface the recommendation packs + one-tap seed prompts in the studio UI (`presets` tab).
- [ ] My Designs (save/load, exists) + share + reorder.

> **Progress (2026-05-30, commit bb28e7a):** Generation is now real (FAL + moderation + brand-aware
> prompts) and the recommendation engine (brand/local/trending/genre packs) is built + tested. Pricing
> already runs through the profit-guaranteed engine. Remaining: surface recs in the studio UI, prove
> the live Printful order path, canvas undo/redo + real mockup underlay, and catalog/sourcing expansion.

**Why it matters:** A signature differentiator and a high-margin revenue stream with zero inventory
risk (dropship). Owner wants it "fully working and beautiful."

---

# EPIC 9 — Customer Experience Polish (Ordering, Discovery, Trust)

**State today:** Core ordering works (recent fixes), but discovery/specials/contact-info surfaces
need finishing for a customer-ready bar.

**Target:** A site any visitor finds beautiful and effortless: clear menu with specials up top,
frictionless multi-mode ordering, trustworthy shop checkout, complete contact/info pages, and
delightful account/loyalty.

**Work:**
- [x] **Specials at top of Menu** (driven by Epic 5 `specials`): highlighted, quick-add. *(CuratedSpecials live; Epic 5.)*
- [x] **Contact Us** completeness: hours, map (location page exists), phone/email, contact form
  (`/api/contact`) → **owner email notification + admin inbox** at `/admin/inbox` (commit e3278f7).
  "minimal phone-ordering friction" → push QR/site ordering.
- [~] Fulfillment selector polish (pickup/curbside/to-go/delivery/QR) — vehicle/mode desc flows to
  KDS (Epic 3); **pickup/café confirmation email now sent** on `/api/orders/submit` (commit d372f39).
  Remaining: SMS confirmation (Twilio).
- [ ] Shop checkout trust: shipping rates, clear taxes/fees, order tracking (`/track-order` exists).
- [x] Loyalty/rewards + subscriptions UX review; referral/affiliate surfaces (tables exist).
  *(Review done, commit 20a231e: fixed /account/rewards tier thresholds to match the loyalty
  API, fixed /refer wrong-domain share link → window.location.origin + copy-to-clipboard;
  verified redemption-rate copy + referral 10%/self-referral/expiry are coherent.)*
- [~] Accessibility + performance pass (WCAG 2.2 AA already targeted): keyboard nav, ARIA, contrast,
  Lighthouse ≥ 90, Core Web Vitals. *(A11y review done, commit b2385cb: verified skip link,
  lang, focusable main landmark, ARIA live-region, labeled forms + icon controls, reduced-motion,
  focus-visible — all already present; added 8 static regression guards. Remaining: live
  Lighthouse/axe run + Core Web Vitals — needs the deployed build.)*
- [x] **SEO structured data**: `LocalBusiness` + `Organization` schemas (were defined-but-unused) now
  render on `/location` and `/menu`; new `Menu` schema (schema.org/Menu) on `/menu` for the Google
  menu rich result; fixed a JsonLd `id` collision so multiple schemas coexist (commit ee008e2).
  Sitemap/robots/openGraph/twitter cards already present.

> **Progress (2026-05-30, commit ee008e2):** Highest-SEO-value gap closed — LocalBusiness/Org/Menu
> structured data now actually emitted (Google rich results + local map presence). Remaining Epic 9
> work: specials-at-top already live (Epic 5), contact-form→inbox, loyalty/referral UX review, and
> the a11y/Lighthouse pass.

**Why it matters:** "Something beautiful for anyone who visits." Conversion + trust + repeat visits.

---

# EPIC 10 — Platform-Agnostic & Data-Ownership Hardening

**State today:** POS adapter pattern exists (Square live, Toast stub); payments via Stripe + Square.
Data in self-hosted Supabase. Good foundation; needs to be made real and switchable.

**Target:** Owner can switch POS or payment processor without re-platforming, and owns/export all
business data at any time.

**Work:**
- [ ] Finish **POS abstraction**: ensure all order/catalog/inventory paths go through
  `getPOSAdapter()`; complete a second adapter (Toast or Clover) at least to read-catalog parity to
  prove portability. Admin "POS Provider" selector.
- [ ] **Payment abstraction**: `src/lib/payments/` factory (Stripe + Square adapters) behind one
  `createCheckoutSession()` / `handleWebhook()`.
- [ ] **Data export & ownership**: admin one-click export (orders, customers, products, inventory,
  designs) — CSV/JSON (export routes partly exist); scheduled Supabase backups off the droplet.
- [ ] **Migration playbook** doc: how to point the platform at a new POS/payment/host.

**Why it matters:** Core owner requirement — never locked in, always owns the data.

---

# EPIC 11 — Reliability, Security, Observability

**Target:** Production-grade trust for real customer traffic and money.

**Work:**
- [ ] Rate limiting on all POST routes; CSRF; input sanitization; CSP + HSTS headers.
- [ ] **RLS audit** — test every table with each role (anon, customer, staff, admin); the
  `/account` public + private-subroute rule (from memory) must be verified.
- [ ] Cron-secret review on all autonomous endpoints (publish-due, scout, price-finder, low-stock).
- [ ] Sentry (present) coverage + alerting; PostHog funnels for order conversion.
- [ ] Uptime monitoring; Supabase query/perf monitoring; backup verification (restore test).
- [ ] Test depth: extend Vitest (pricing engine, channel classifier, adapters) + Playwright E2E for
  the money paths (menu order, shop checkout, merch dropship).

**Why it matters:** Real revenue + real customer data demand this before scaling marketing/B2B.

---

# Suggested Sequencing (Leverage Order)

| # | Epic | Why first/this order | Rough size |
|---|------|----------------------|-----------|
| 1 | Menu vs Shop Separation | Unblocks pricing, sourcing, KDS routing | S–M |
| 2 | Adaptive Pricing Engine | Money-safety rail for Shop + Studio + B2B | M |
| 3 | Smart KDS | Operational core as digital orders grow | M |
| 4 | Team Portal / Academy | Onboarding + waste + training; daily ops | M–L |
| 5 | AI Marketing Engine | Owner headline ask; growth flywheel | L |
| 7 | MenuMetrics + Inventory | Feeds pricing, waste, recommendations | M–L |
| 6 | B2B Scout Pipeline | Highest-leverage revenue expansion | M–L |
| 8 | Design Studio production | Signature high-margin differentiator | M–L |
| 9 | Customer Polish | Customer-ready bar across the surface | M |
| 10 | Platform/Payment Agnostic | Lock-in insurance, data ownership | M |
| 11 | Reliability/Security | Gate before scaling traffic + money | M |

(Epic 7 is placed before 6/8 because pricing + B2B + recommendations all consume its cost data.)

---

# Working Agreement (per owner preferences)

1. **One Epic at a time**, top of the leverage list. Break each into ≤1-day tasks.
2. **Direct edits + autonomous commit & push** to GitHub after each meaningful change, then trigger
   Coolify redeploy.
3. **Update this roadmap** (check boxes, note discoveries) at the end of each Epic, then
   **compress/clear context** before the next Epic to avoid drift.
4. **Reuse existing tools/skills/agents** (Hermes cron + `kynda-coffee-agent` skill + MenuMetrics)
   over building from scratch.
5. **Approval gates** on every autonomous money/public/outreach action.
6. Modern charcoal/grey + rust-accent design language throughout.

---

# Appendix — Key Files & Anchors (for future sessions)

- Catalog/channel brain: `src/lib/pos/catalog.ts` (channel filter `:220`, classifier `:416`),
  `src/lib/pos/types.ts`, overrides API `src/app/api/admin/catalog/overrides/route.ts`.
- POS/payment adapters: `src/lib/pos/`, (new) `src/lib/payments/`.
- Marketing: `src/lib/marketing/{claude,image,social,tools}`, `/api/marketing/*`, agent bridge
  `/api/admin/agent` + `/api/marketing/agent`.
- Design Studio: `src/app/studio/`, `src/lib/printful/`, `/api/printful/*`, `/api/designs/*`.
- Staff/training: `src/app/staff/*`, migration `004_training_platform.sql`,
  `20260529_staff_portal_tables.sql`.
- KDS: `src/app/admin/kds/` → migrating to `/(kds)`.
- MenuMetrics link: `menu_metrics_recipe_id` on catalog rows; (new) `src/lib/menumetrics/`.
- Hermes control surface: `kynda-coffee-agent` skill; new crons land here.

> Previous roadmap retained at `KYNDA-COFFEE-MASTER-ROADMAP.md` as the historical Phase 1–7 record.
> This V2 is the active plan to reach a fully working, customer-ready, owner-operated platform.
