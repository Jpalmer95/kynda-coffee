# Kynda Coffee Platform — Roadmap V2: Customer-Ready & Owner-Operated

**Created:** 2026-05-30
**Supersedes:** `KYNDA-COFFEE-MASTER-ROADMAP.md` (Phases 1–7, archived as historical record)
**Owner:** Jonathan Korstad (Kynda Coffee, Horseshoe Bay, TX)
**Mission:** Finish the original vision — a beautiful, fully working, customer-ready specialty
coffee shop platform that is **POS-agnostic, data-owned, and AI-operated**, where customers
order food/drinks, buy shipped goods + merch, apply for work, and find our info; and the owner
runs the entire business (metrics, marketing, sales, inventory, costs, B2B, staff) from one portal.

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
- [ ] Add a first-class `channel_visibility` concept to catalog overrides
  (`menu` | `shop` | `both` | `hidden`), migration extends `catalog_overrides`.
- [ ] Change `shouldIncludeItemForChannel` (`catalog.ts:220`): `menu` channel **excludes** `merch`
  and any item flagged `shop`-only; `shop` channel **excludes** pure `menu` food/drink unless
  `available_shipping`. Drive from the explicit override, not text-guessing.
- [ ] Admin **Catalog Classifier** UI (`/admin/catalog`): per-item toggle Menu/Shop/Both/Hidden,
  bulk actions, "needs classification" filter for new Square imports. One screen, owner sets truth.
- [ ] Default classifier heuristic on import (so new items aren't invisible): `menu`/`retail food`
  → Menu; `merch`/`gift_card`/shippable goods → Shop; flag ambiguous for review.
- [ ] Seed new Shop-only sourced categories (placeholders + sourcing hooks): Brew Gear (Chemex,
  filters, kettles), Bulk Tea (loose-leaf), Apothecary (candles), Design-Studio Merch.
- [ ] Verify: load `/menu` → zero merch; load `/shop` → zero made-to-order drinks; "both" items
  appear in both with correct fulfillment options.

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
- [ ] `src/lib/pricing/engine.ts` — pure function: `price(costBasis, {targetMarginPct, shipping,
  paymentFeePct, podCost, rounding}) → retailPrice` with floor enforcement (never sell below cost +
  min margin). Unit-tested.
- [ ] Source cost basis from: MenuMetrics (menu items, Epic 7), Printful catalog cost (merch),
  vendor cost (Shop goods, Epic 7 vendor table).
- [ ] Admin **Pricing Rules** page (`/admin/settings` → Pricing): target margin per category,
  rounding (e.g. .49/.99 endings), shipping buffer strategy.
- [ ] Wire Design Studio + Shop product creation to call the engine (replace ad-hoc markup).
- [ ] Nightly cron (Hermes): re-price Shop goods whose vendor/POD cost changed; surface a "prices
  updated / margin at risk" digest in admin for approval before publishing.

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
  polling. New order = audible chime + card animation.
- [ ] Order card: large order #, customer name, **fulfillment tag** (Pickup/Curbside/To-Go/
  Delivery/QR-table), **curbside vehicle description**, item list w/ modifiers, elapsed timer
  (color-escalates: green→amber→red), prep notes.
- [ ] Board filters via URL (`?board=curbside`, `?station=bar`) so each tablet bookmarks its view.
  Owner-managed board presets in settings.
- [ ] Bump bar: New → In Progress → Ready → Completed; "Ready" triggers customer SMS/push (Twilio
  already a dep). Search + filter (name, #, type).
- [ ] Stats strip: avg prep time today, orders in queue, on-time %, longest-waiting.
- [ ] Verify on a real tablet form factor (browser_vision QA at tablet viewport).

**Why it matters:** This is the operational heartbeat once digital ordering scales. Owner wants
"any device," filterable boards, and easy management.

---

# EPIC 4 — Team Portal: Barista & Baker Academy + Operations

**State today:** Shell pages for checklists/handbook/recipes/waste-log/training (87–217 lines).
`training_platform` migration exists.

**Target:** A genuine staff operating system: a robust **Specialty Coffee Barista + Baker course**
with modules, quizzes, and tracked completion; living handbook with acknowledgment; recipes (linked
to MenuMetrics costs); opening/closing/mid-shift checklists with logged completions; waste log with
loss analytics; and a **New-Employee Onboarding Hub** (blank I-9, W-4, handbook, training packet,
checklist — one place to expedite onboarding).

**Work:**
- [ ] **Academy**: expand `training_modules` content into a real curriculum — Coffee Fundamentals
  (origin, roast, extraction theory), Espresso (dialing in, milk steaming/latte art), Brew Methods
  (pour-over, batch, cold brew), Baking basics, Food safety/allergens, Customer service, POS/ordering
  flow. Each module: rich content + optional video + multiple-choice quiz + pass threshold.
- [ ] Quiz engine with scoring, retries, and `training_progress` tracking; staff dashboard shows
  % complete, badges/certificates on module completion.
- [ ] Handbook: section nav + search + "Acknowledge & date" (stored), "last updated" stamps.
- [ ] Recipes: ingredient/step views, scaling, **cost-per-recipe pulled from MenuMetrics** (Epic 7),
  prep timers.
- [ ] Checklists: opening/closing/mid-shift; per-item check + notes + photo (e.g., temp logs);
  `checklist_completions` logged with who/when; admin sees compliance history.
- [ ] **Waste Log**: product picker (from catalog), qty+unit, reason, auto cost (from MenuMetrics/
  vendor cost), photo; analytics page (waste by reason/product, trend over time, $ lost/month,
  feeds inventory reconciliation in Epic 7).
- [ ] **Onboarding Hub** (`/staff/onboarding`, admin-managed): document library with blank
  fillable/printable **I-9, W-4**, handbook PDF, training packet, checklist; per-new-hire onboarding
  tracker (docs received? training assigned? quizzes passed?). Store templates in Supabase Storage
  `onboarding/` bucket; gate downloads to staff/admin.
- [ ] Staff auth hardening: `is_staff` flag, invite flow, `/staff/*` middleware (audit current).

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
- [ ] **Approval queue** UI: pending drafts → edit → approve → schedule/publish. Nothing posts
  publicly without approval.
- [ ] **Hermes cron — Marketing Loop** (`kynda-coffee-agent` skill + new cron): weekly, the agent
  proposes a content calendar from upcoming specials/events, drafts posts, drops them in the approval
  queue, and notifies owner. Uses the platform Agent API; no auto-publish.
- [ ] **Newsletter automation**: Resend integration (dep present) — `newsletters` table, segment
  by loyalty/subscription, monthly + event-triggered (new specials, seasonal). Agent drafts copy;
  owner approves; cron sends. Double opt-in + unsubscribe (already have `/api/newsletter/subscribe`).
- [ ] **Monthly Specials pipeline**: a `specials` record drives BOTH (a) the **Specials section at
  the top of the Menu ordering page** (highlight + quick-add) and (b) a marketing campaign (social
  drafts + newsletter). Single source of truth → menu + marketing stay in sync.
- [ ] **Growth Insights dashboard** (`/admin/marketing/analytics` + `/admin/analytics`): pull
  platform insights (IG/FB/X), surface AI recommendations ("post Tue 2pm," "video outperforms,"
  "loyalty churn rising"), tie to sales lift where measurable.
- [ ] **Content library / asset drop**: Supabase Storage `marketing-assets/` bucket browsable in
  admin; agents pull from it for scheduled posts.

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
- [ ] **B2B CRM data model**: `b2b_leads` (name, type=grocery/cafe/office/event, contact,
  location, source, status: new→approved→contacted→negotiating→won/lost, notes, est_value),
  `b2b_accounts` (active wholesale customers, terms, recurring order schedule), `b2b_orders`
  (bulk/recurring orders, linked to fulfillment).
- [ ] **Admin B2B portal** (`/admin/b2b`): Kanban pipeline (lead stages), account list, recurring
  order scheduler, wholesale price sheet (uses Pricing Engine, Epic 2, wholesale margin tier).
- [ ] **Wholesale catalog + landing**: public `/wholesale` page (apply to become a wholesale partner),
  inquiry form → `b2b_leads`. Showcases bulk pricing, fulfillment, brand story.
- [ ] **Hermes cron — B2B Scout** (skill + cron): on a schedule, search for local grocers, offices,
  cafes, and event venues within range (web search + maps skill); score fit; insert as `new` leads;
  **notify owner for approval**. Approved leads → agent drafts a tailored outreach email (Resend)
  with a Kynda capabilities one-pager + price sheet link; owner approves send. Track replies.
- [ ] Guardrail: scouting writes leads + drafts only; **no outreach sends without owner approval**.

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
- [ ] **Integration contract**: define the MenuMetrics API surface we need (recipe cost by ID,
  ingredient list w/ qty+unit+cost, current vendor prices, stock levels). Document in
  `docs/menumetrics-integration.md`. Add `MENU_METRICS_URL` + token to env.
- [ ] `src/lib/menumetrics/client.ts` — typed client; nightly sync of recipe costs → cache in
  Supabase so the platform shows live cost/margin per menu item even if MenuMetrics is briefly down.
- [ ] **Recipe import flow**: from `/admin/catalog`, link a Square item to a MenuMetrics recipe;
  pull its cost → feed Pricing Engine (advisory margin warning if menu price < cost + target).
- [ ] **Live inventory metrics** on `/admin/inventory`: current stock, days-of-cover, value on hand;
  reconcile with waste log (Epic 4) and sales (Square orders).
- [ ] **Low-stock alerts**: cron checks stock vs reorder thresholds → admin alert + (optional) Hermes
  notification to owner. Trending items get reorder suggestions.
- [ ] **Vendor price-trend tracking**: `vendor_prices` table (item, vendor, price, captured_at);
  monthly **Hermes cron "Better-Price Finder"** checks valid vendors, records trends, flags cheaper
  sources, and surfaces a savings report for owner approval before switching.
- [ ] **Trending menu recommendations**: from sales data, recommend new/retire items with
  recipe+ingredients+cost+projected margin mapped out (agent-generated, owner-approved).

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
  webhook tracking → customer email). Document and smoke-test.
- [ ] Replace ad-hoc markup with **Pricing Engine** (Epic 2): live retail = Printful variant cost +
  shipping estimate + payment fee + target margin; never below floor.
- [ ] **Recommendation engine**: preset packs (Kynda brand, seasonal, local Horseshoe Bay/Hill
  Country, trending, genre). Generate-on-demand via FAL with brand-aware prompts; moderation-gated.
- [ ] Canvas polish: layered stickers (logo/preset/upload/generated) with drag/resize/rotate,
  front/back, true product-image underlay (real mockups in Storage), undo/redo, snapping.
- [ ] **Catalog expansion + smart sourcing**: broaden Printful product set; auto-pull cost/variants;
  a sourcing hook so trending non-merch Shop goods (Chemex, filters, candles) can be added with
  adaptive pricing (Epic 1 + 2).
- [ ] My Designs (save/load, exists) + share + reorder.

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
- [ ] **Specials at top of Menu** (driven by Epic 5 `specials`): highlighted, quick-add.
- [ ] **Contact Us** completeness: hours, map (location page exists), phone/email, contact form
  (`/api/contact` exists) → admin inbox; "minimal phone-ordering friction" → push QR/site ordering.
- [ ] Fulfillment selector polish (pickup/curbside/to-go/delivery/QR) — confirm vehicle desc flows
  to KDS (Epic 3) + confirmation email/SMS.
- [ ] Shop checkout trust: shipping rates, clear taxes/fees, order tracking (`/track-order` exists).
- [ ] Loyalty/rewards + subscriptions UX review; referral/affiliate surfaces (tables exist).
- [ ] Accessibility + performance pass (WCAG 2.2 AA already targeted): keyboard nav, ARIA, contrast,
  Lighthouse ≥ 90, Core Web Vitals.
- [ ] SEO + social cards for all public pages; sitemap; structured data (LocalBusiness, Menu).

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
