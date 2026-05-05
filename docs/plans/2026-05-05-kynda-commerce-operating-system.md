# Kynda Coffee Commerce Operating System Build Plan

> **Purpose:** Persistent source-of-truth plan/status document for the Kynda Coffee next-gen website, ordering, ecommerce, AI merch, POS, admin, and agent-commerce platform. Use this to resume work without relying on chat context.
>
> **Current production temp URL:** https://kynda.167.99.125.127.sslip.io
>
> **Canonical domain:** kyndacoffee.com is transferring from Wix to Porkbun and may be unavailable for DNS/email/webhook changes for a few days.

## 1. North Star

Build Kynda Coffee’s own next-gen commerce operating system, not just a Wix replacement.

The platform should support:

- Beautiful public website and PWA.
- Pickup ordering.
- QR table ordering.
- Lobby / parking spot QR ordering.
- KDS / kitchen workflow.
- Shipped beans nationwide.
- Coffee club subscriptions.
- Kynda branded merch.
- AI-generated/custom user merch via dropshipping.
- Gift cards, rewards, referrals, reviews.
- Owner/admin cockpit with analytics, marketing, training, and automations.
- MenuMetrics integration for recipe costing, inventory, par levels, purchase recommendations, and eventual autonomous inventory ordering.
- Agent-friendly product/menu/policy APIs and feeds so AI agents can discover, compare, recommend, and eventually transact.

## 2. Architecture Principles

### 2.1 POS-Agnostic Core

Do not let Square become the canonical data model.

Square is the current provider adapter. Kynda should own the normalized commerce layer.

Recommended data flow:

```text
Square / future Toast / Clover / Shopify / custom POS
  -> provider adapter
  -> pos_raw_objects          # lossless provider cache/audit
  -> normalized pos_* tables  # provider-neutral catalog/menu data
  -> Kynda canonical views/APIs
  -> web, QR, KDS, admin, MenuMetrics, agent APIs
```

Benefits:

- Full autonomy if Kynda switches POS later.
- Ability to normalize multiple providers.
- Raw data remains available for reprocessing/debugging.
- Web, QR, KDS, MenuMetrics, and AI agent features do not need to know Square-specific object shapes.

### 2.2 Square as Current Source Adapter

Current Square production credentials are injected through Coolify runtime env. Host `.env.production` may be stale; inspect both.

Use Square for:

- Current menu/POS catalog.
- Categories.
- Variations.
- Modifiers/add-ons.
- Taxes.
- Orders/payment integration where useful for POS reconciliation.

Use Stripe for:

- Online ecommerce payments.
- Subscriptions.
- Shipped beans.
- AI/custom merch checkout.
- B2B/office coffee invoicing or recurring plans.

Use Supabase for:

- Unified app data model.
- Catalog normalization.
- Orders.
- Customers/profiles.
- Admin analytics.
- Designs.
- Subscriptions.
- Training.
- MenuMetrics integration.

## 3. Environment / Deployment Notes

### 3.1 Live Infrastructure

- Droplet/Coolify host: `kynda-droplet` SSH alias.
- Live source-ish host directory: `/var/www/kynda-coffee-new`.
- Git-backed repo on local workstation: `/home/jonathan/dev/kynda-coffee`.
- GitHub: `https://github.com/Jpalmer95/kynda-coffee`.
- Live container: `yzrvkel3jnw2lviu3cwaegnq-192513517135`.
- App is Coolify-managed, not PM2.
- Host `/var/www/kynda-coffee-new` is **not mounted** into the running container. Hot-copying has been used as a temporary deployment workaround.

### 3.2 Important Runtime Env Findings

Coolify runtime env had better/newer values than host `.env.production`.

Important runtime values observed:

- `SQUARE_ENVIRONMENT=production`
- Square production application/location/token worked against the Square API.
- `ADMIN_EMAIL=jpkorstad@gmail.com` existed, while code expected `ADMIN_EMAILS`; code now supports both.
- `NEXT_PUBLIC_APP_URL=https://kyndacoffee.com` exists in Coolify, but temp URL should be used until domain transfer completes.

Host `.env.production` was stale and contained sandbox/local values. Treat Coolify runtime env as the live source of truth.

### 3.3 Supabase DDL Access

Supabase service role key is not enough for SQL DDL migrations. A direct Postgres URL is needed.

A root-only pooler env file was created on the droplet:

```text
/root/kynda-supabase-db.env
```

Permissions: `600`.

Use:

```bash
ssh kynda-droplet
set -a; . /root/kynda-supabase-db.env; set +a
psql "$SUPABASE_DB_URL?sslmode=require" -c 'select now();'
```

## 4. Recently Completed Work

### 4.1 Supabase Migration / Square Production Sync Baseline

Applied important migrations:

- `002_product_source_tracking.sql`
- `006_square_inventory_sync.sql`
- `006_growth_engine_tables.sql`

Verified tables:

- `products`
- `profiles`
- `newsletter_subscribers`
- `gift_cards`
- `loyalty_transactions`
- `coffee_subscriptions`
- `table_orders`
- `qr_orders`
- `square_catalog_items`
- `square_inventory_snapshots`
- `square_sync_log`

Square production API test succeeded:

- Location: `B3EM39DWRT1CX`
- Name: `Kynda Coffee`
- Status: `ACTIVE`

Initial sync succeeded with 85 item rows, but all were effectively General/retail due to insufficient category/object handling.

### 4.2 Build and Admin Fixes

Fixed:

- `src/lib/auth/admin.ts`: supports both `ADMIN_EMAILS` and `ADMIN_EMAIL`.
- `src/middleware.ts`: supports both `ADMIN_EMAILS` and `ADMIN_EMAIL`.
- `src/components/cart/CartDrawer.tsx`: missing closing JSX/function tags repaired; cart drawer starts closed.
- `src/lib/email/resend.ts`: added `sendRetentionEmail` export used by retention trigger route.

### 4.3 POS-Agnostic Catalog Foundation

Added migration:

```text
supabase/migrations/007_pos_agnostic_catalog.sql
```

Created provider-neutral tables:

- `pos_raw_objects`
- `pos_categories`
- `pos_items`
- `pos_item_variations`
- `pos_modifier_lists`
- `pos_modifiers`
- `pos_taxes`
- `pos_sync_runs`

Extended `square_catalog_items` with:

- `provider_raw`
- `category_id`
- `variation_name`
- `modifier_list_ids`
- `tax_ids`
- `available_shipping`
- `available_qr`

### 4.4 Square Adapter / Transform Layer

Added:

- `src/lib/square/catalog-transform.ts`
- `src/lib/square/catalog-transform.test.ts`
- `src/lib/square/catalog.ts`
- `src/app/api/square/sync-catalog/route.ts`

The transform layer:

- Builds category lookup from Square `CATEGORY` objects.
- Builds image lookup from Square `IMAGE` objects.
- Resolves category IDs to names.
- Normalizes all item variations, not just the first variation.
- Preserves modifier list IDs and tax IDs.
- Serializes BigInt values safely for JSONB.
- Classifies items into portable types:
  - `menu`
  - `retail`
  - `merch`
  - `modifier`
  - `service`
  - `gift_card`
  - `unknown`

Test command:

```bash
npx tsx --test src/lib/square/catalog-transform.test.ts
```

Last result: 5 passed, 0 failed.

### 4.5 Enhanced Square Sync Results

After deploying and triggering:

```bash
curl -X POST https://kynda.167.99.125.127.sslip.io/api/square/sync-catalog \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Final successful result:

```json
{
  "success": true,
  "synced": 115,
  "failed": 0,
  "total": 115,
  "rawObjects": 494,
  "categories": 26,
  "modifiers": 96,
  "taxes": 1,
  "errors": []
}
```

Verified normalized counts:

- `pos_raw_objects`: 494
- `pos_categories`: 26
- `pos_items`: 85
- `pos_item_variations`: 115
- `pos_modifier_lists`: 8
- `pos_modifiers`: 96
- `pos_taxes`: 1

`pos_items` type classification:

- `menu`: 50
- `retail`: 17
- `merch`: 11
- `modifier`: 7

Notable categories:

- Food
- Coffee Drinks
- Merchandise
- Additions
- Fridge Items
- Teas
- Catering
- Smoothies
- Ice Cream
- Refreshers
- Specialty Organic Coffee Beans
- Seasonal Pastry
- Uncategorized

### 4.6 GitHub Commit

Local commit created and pushed after PAT was restored:

```text
82e0e18 feat: add POS-agnostic Square catalog sync
```

Pushed to:

```text
https://github.com/Jpalmer95/kynda-coffee
```

## 5. Current Known Caveats

1. Hot-copy deployment is not durable.
   - The running container has been patched by copying `src` and `.next` into `/app`.
   - A future Coolify redeploy could overwrite this unless Coolify deploys from GitHub commit `82e0e18` or later.

2. App start command still uses `next start -p 3000` with `output: "standalone"`.
   - Logs warn this is wrong for Next 16 standalone.
   - Durable fix: use `node .next/standalone/server.js`, or remove standalone output.

3. Public shop still reads the old `products` table and shows seeded/demo products.
   - Square/POS data is now synced into normalized tables but not yet used by menu/shop/QR UI.

4. Classification is heuristic.
   - Needs admin override UI for item type, channel visibility, featured/hidden, display names, descriptions, images, and MenuMetrics recipe links.

5. Domain transfer blocks final canonical settings.
   - Keep using temp URL until Porkbun transfer completes.
   - Later update sitemap, robots, Stripe webhooks, Resend sender/domain, Coolify FQDN/certs.

## 6. Recommended Build Sequence From Here

### Phase A — Make Real Menu/QR Use POS Catalog

Goal: Replace fake/seeded menu experience with real Square/POS data.

Tasks:

1. Add read API for normalized catalog.
   - Create `src/app/api/pos/catalog/route.ts`.
   - Query `pos_items` + `pos_item_variations` + modifiers by channel.
   - Parameters: `channel=menu|qr|pickup|delivery|shipping|shop`, `category`, `includeModifiers=true`.

2. Add reusable client/server data helpers.
   - `src/lib/pos/catalog.ts` for query/format helpers.

3. Update menu page.
   - Use real `pos_items` where `available_pickup` or `available_qr` is true.
   - Group by category.
   - Show item variations and prices.

4. Update QR order page.
   - Use `available_qr` items.
   - Display modifiers/options.
   - Cart should store provider item/variation IDs.

5. Update KDS/table order creation.
   - Ensure QR/table order payload includes provider IDs, selected modifiers, quantities, notes, table/parking/lobby metadata.

Verification:

```bash
curl https://kynda.167.99.125.127.sslip.io/api/pos/catalog?channel=qr
curl https://kynda.167.99.125.127.sslip.io/menu
curl https://kynda.167.99.125.127.sslip.io/qr-order
```

### Phase B — Admin Catalog Override Layer

Goal: Human-owner control over normalized POS data.

Add table:

- `catalog_overrides`

Fields:

- provider
- provider_item_id
- provider_variation_id nullable
- display_name
- display_description
- image_url
- item_type_override
- available_online
- available_pickup
- available_delivery
- available_shipping
- available_qr
- is_featured
- is_hidden
- menu_metrics_recipe_id
- sort_order

Admin pages:

- `/admin/catalog`
- `/admin/square` can link to catalog overrides.

### Phase C — Visible Shop / Ecommerce Catalog

Goal: Keep shop clean and commerce-focused rather than dumping all cafe items.

Use:

- `products` for online-native products/subscriptions/custom merch.
- `pos_items` for Square retail/merch/beans available shipping/pickup.
- future `catalog_overrides` to curate what appears.

### Phase D — Ordering and Checkout

Goal: Real end-to-end ordering.

- Pickup checkout.
- QR order checkout/pay-at-counter/pay-online.
- KDS status workflow.
- Optional Square Orders API injection for POS reconciliation.
- Stripe for ecommerce/subscriptions/merch.

### Phase E — AI Merch / Dropship Engine

Goal: Turn Design Studio from prototype into revenue engine.

- Save generated designs to `designs`.
- Add Printful/Printify/Gelato provider abstraction.
- Product mockup generation.
- Admin moderation.
- Checkout success creates fulfillment order.
- Public gallery / curated drops.

### Phase F — MenuMetrics Integration

Goal: Owner intelligence and inventory autonomy.

- Link `pos_items`/`products` to MenuMetrics recipes.
- Pull sales data into costing/margin analytics.
- Track COGS, price drift, pars, theoretical vs actual usage.
- Suggest purchase orders and price updates.

### Phase G — Agent-Friendly Commerce

Goal: Be discoverable/actionable by AI agents.

Add:

- `/llms.txt`
- `/agents/catalog.json`
- `/agents/menu.json`
- `/agents/policies.json`
- `/feeds/products.json`
- Product JSON-LD.
- LocalBusiness/Cafe schema.
- Machine-readable policy pages.
- Track AI crawler/user-agent traffic.

## 7. Useful Commands

### Test Square transform

```bash
cd /home/jonathan/dev/kynda-coffee
npx tsx --test src/lib/square/catalog-transform.test.ts
```

### Build on droplet

```bash
ssh kynda-droplet
cd /var/www/kynda-coffee-new
npm run build
```

### Apply Supabase migration

```bash
ssh kynda-droplet
cd /var/www/kynda-coffee-new
set -a; . /root/kynda-supabase-db.env; set +a
psql "$SUPABASE_DB_URL?sslmode=require" -v ON_ERROR_STOP=1 -f supabase/migrations/<file>.sql
```

### Hot-copy build into current Coolify container

Use only as temporary workaround until Coolify deploys from GitHub.

```bash
ssh kynda-droplet
cd /var/www/kynda-coffee-new
npm run build
docker commit yzrvkel3jnw2lviu3cwaegnq-192513517135 kynda-coffee-before-hotcopy-$(date +%Y%m%d%H%M%S)
docker cp src/. yzrvkel3jnw2lviu3cwaegnq-192513517135:/app/src/
docker cp .next/. yzrvkel3jnw2lviu3cwaegnq-192513517135:/app/.next/
docker cp package.json yzrvkel3jnw2lviu3cwaegnq-192513517135:/app/package.json
docker restart yzrvkel3jnw2lviu3cwaegnq-192513517135
```

### Trigger Square sync

```bash
curl -sS -X POST \
  -H 'Content-Type: application/json' \
  -d '{}' \
  https://kynda.167.99.125.127.sslip.io/api/square/sync-catalog
```

### Inspect normalized catalog counts

```bash
ssh kynda-droplet
set -a; . /root/kynda-supabase-db.env; set +a
DB="$SUPABASE_DB_URL?sslmode=require"
psql "$DB" -c "select item_type, count(*) from pos_items group by item_type order by count desc;"
psql "$DB" -c "select category_name, item_type, count(*) from pos_items group by category_name,item_type order by count desc, category_name;"
```

## 8. Efficiency Recommendations

1. Keep this document current after each major build step.
2. Prefer small commits per phase.
3. Use tests around transform/business logic before UI work.
4. Use GitHub as durable source of truth; avoid relying on hot-copy deployments.
5. Add a `/docs/ops/DEPLOYMENT.md` next to document Coolify-specific durable deployment once fixed.
6. Add admin override tables before overfitting heuristics.
7. Use provider-neutral names in app-facing code; keep Square-specific logic inside `src/lib/square/*` and `/api/square/*` only.

## 2026-05-05 update — POS catalog now powers public menu and QR catalog

- Added `src/lib/pos/catalog.ts` and `src/app/api/pos/catalog/route.ts`.
- `/menu` now server-renders from normalized `pos_items` / `pos_item_variations`.
- Added `/qr-order` and `/qr-menu` backed by normalized POS items/modifiers. Cart/payment submission is intentionally marked as the next wiring step.
- `/api/products` now appends POS shop-compatible merch/retail items unless `includePos=false`; `source=pos` returns only normalized POS products mapped into existing product-card shape.
- Tests: `npx tsx --test src/lib/square/catalog-transform.test.ts src/lib/pos/catalog.test.ts` passes 9/9.
- Build passes locally and on droplet.
- Commit pushed: `3b31229 feat: serve menu and QR ordering from POS catalog`.
- Deployed by tactical hot-copy into Coolify container after backup image `sha256:314266a0e529b34f22384e9e1052ea77be105a5c1ba0febb1cf31ddad33fc912`.
- Verified live 200s: `/api/pos/catalog`, `/api/products?source=pos`, `/menu`, `/qr-order`, `/qr-menu`, `/shop`.

Next recommended step: implement the interactive QR/pickup cart and order submission flow using `providerItemId`, `providerVariationId`, selected modifiers, quantity, notes, and table/lobby/parking metadata. Then connect payment/KDS/Square order reconciliation.

## 2026-05-05 update — Admin POS catalog override layer

- Added migration `supabase/migrations/008_catalog_overrides.sql`.
- Added `catalog_overrides` table for Kynda-owned display/channel curation over synced POS items.
- Added public catalog merge logic so overrides affect `/api/pos/catalog`, `/menu`, `/qr-order`, `/qr-menu`, and POS-backed `/api/products`.
- Added admin APIs: `/api/admin/catalog` and `/api/admin/catalog/overrides`.
- Added admin UI: `/admin/catalog`, linked in admin sidebar as POS Catalog.
- Admin UI supports search, channel/type filters, hide/show, featured, display name, description, category, item type, image URL, sort order, MenuMetrics recipe ID, admin notes, and per-channel overrides.
- Tests now cover override application before channel filtering.
- Tests pass 11/11. Build passed locally and on droplet.
- Supabase migration applied successfully; `catalog_overrides` currently has 0 rows.
- Commit pushed: `a245e5a feat: add admin POS catalog overrides`.
- Deployed by tactical hot-copy after backup image `sha256:d50f6b3cd3733bba8dbed7c431c3f64efde397deb920d4ddde57ff00ae653ee0`.
- Verified live: `/api/pos/catalog` returns 200, `/menu` returns 200, `/admin/catalog` correctly redirects unauthenticated users to account login.

Next recommended step: use `/admin/catalog` while logged in as an admin to curate/clean the live POS catalog. First high-impact cleanup should hide Additions/modifier-only items from menu/shop/QR, hide Uncategorized noise, and mark true shippable merch/beans. After curation, proceed with interactive QR/pickup cart and order submission.

## 2026-05-05 update — account login redirect-loop fix

- Root cause: middleware protected all `/account*` routes, including `/account` itself. Unauthenticated users were redirected from `/account` to `/account?redirectTo=/account`, causing `ERR_TOO_MANY_REDIRECTS`.
- Fixed middleware so `/account`, `/account/forgot-password`, and `/account/reset-password` are public, while private account subroutes remain protected.
- Fixed magic-link auth redirect to use `/auth/callback?next=...` so Supabase can exchange the code before sending admins/customers to the requested page.
- Commit pushed: `aae204d fix: allow account login page without redirect loop`.
- Deployed by tactical hot-copy after backup image `sha256:e6807f847942bd20903f48e5da4599f45c895224c465d8c6b8ed7080fe48fa55`.
- Verified live: `/account` returns 200 with no redirects, `/account?redirectTo=/admin/catalog` returns 200 with no redirects, `/admin/catalog` redirects once to account login with redirect target.
- Current runtime admin email: `jpkorstad@gmail.com`.

## 2026-05-05 update — first-pass catalog cleanup and cart drawer fix

- Root-caused cart drawer bug: closed drawer still had inline transform behavior fighting Tailwind/viewport positioning, leaving a visible right-side strip/panel and close button confusion.
- Fixed `src/components/cart/CartDrawer.tsx` so closed state explicitly transforms to `translateX(calc(100% + 16px))`; verified live drawer is fully offscreen and opens/closes correctly.
- Added migration `supabase/migrations/009_catalog_overrides_unique_item_key.sql` for a null-safe override uniqueness index.
- Hardened `/api/admin/catalog/overrides` to update/insert item-level overrides without relying on nullable `provider_variation_id` conflict handling.
- Created 44 first-pass `catalog_overrides` rows directly in Supabase: 18 hidden add-on/modifier/internal items, Uncategorized items recategorized/hidden, important drink descriptions/sort orders added, and beans/merch marked online/pickup/QR/shipping/featured where appropriate.
- Fixed `getPosCatalog()` to apply API limits after override filtering so hidden early alphabetical items do not starve shop/featured results.
- Verified `/api/pos/catalog?channel=menu` has no CBD Oil / Extra Espresso Shot / cream cheese / Whipped Cream / Refill leaks and now starts with Kynda beans + top drinks.
- Verified `/api/products?source=pos` returns beans/merch instead of additions; homepage featured products show Kynda Coffee 12 oz Bag, Kynda Coffee 2.5 oz Bag, Kynda Coffee Mug, and Kynda Glass Cup.
- Tests pass 11/11 and builds passed locally + droplet.
- Commits pushed: `0114168`, `9e05f00`, `832d879`, `86957d3`.
- Latest hot-copy backup image before final deploy: `sha256:130ea810f7153e385c1040de31653c23efa5ccd23993d0d0d8528a076717be93`.

Next recommended phase remains interactive QR/pickup cart and order submission, using the curated POS catalog as source.

## 2026-05-05 update — interactive QR/pickup order phase

- Built the first interactive QR ordering slice. `/qr-order` now renders a client-side order builder from the curated POS catalog with variation selection, modifier selection, quantity, item notes, customer name/phone/email, table/lobby/parking/pickup context, order notes, and pay-at-counter preference.
- Added TDD-backed order domain helpers in `src/lib/orders/qr-order.ts` with tests in `src/lib/orders/qr-order.test.ts`. Coverage includes validation, table/parking label requirements, variation/modifier pricing, modifier max rules, hidden/unavailable item rejection, and order draft metadata.
- Added public submission API `POST /api/orders/submit`; it reloads the QR POS catalog server-side, validates/prices the request against authoritative catalog data, and inserts into `orders`.
- Added migration `010_qr_order_metadata.sql` to extend `orders` with `fulfillment_metadata`, `payment_preference`, `order_channel`, and `submitted_at`, keeping existing admin/account/analytics compatibility.
- During live smoke testing, the existing `trg_update_metrics_on_order` trigger failed guest QR orders with `customer_id NULL`. Added/applied `011_order_metrics_guest_guard.sql` so guest/walk-up QR orders skip customer metrics until a customer/profile is attached.
- Verified tests: 16/16 passing across QR order, POS catalog, and Square catalog transform suites.
- Verified local and droplet builds pass, route `/api/orders/submit` appears in Next build output, and `/qr-order` renders the interactive builder on live.
- Verified API smoke insert succeeded for a live Latte QR order, then deleted the smoke-test row.
- Hot-copied host build into Coolify container. Backup image before QR deploy: `sha256:3f41cce8aef8985e42369966028375ee9c89511127f769dd814e9d5f5ee3c39b`.
- Commits pushed: `cfa3fc8` and `8c8b1ac`.

Next recommended phase: build an admin/KDS queue over `orders` where `source=qr` and `status in (pending, confirmed, processing)`, with status transitions Pending -> Confirmed/In Progress -> Ready -> Completed, plus optional staff notifications. Then add Stripe/Square payment/reconciliation.

## 2026-05-05 update — admin KDS queue phase

- Added the first admin Kitchen Display / QR Queue at `/admin/kds`. It is protected by the existing admin middleware and linked in the admin sidebar/mobile nav as `KDS`.
- Added `src/lib/orders/kds.ts` with TDD coverage in `src/lib/orders/kds.test.ts` for active queue filtering, oldest-first sorting, and safe staff transitions.
- Active KDS orders are canonical `orders` rows where `source=qr` or `order_channel in (qr,pickup,table,lobby,parking)` and `status in (pending, confirmed, processing)`.
- Staff workflow transitions: pending -> confirmed/processing/cancelled, confirmed -> processing/cancelled, processing -> delivered/cancelled. Existing `delivered` status is used as the completed/handoff state to avoid expanding the order status enum prematurely.
- Added admin API `GET/PATCH /api/admin/kds` for active queue fetch and status updates. PATCH records `kds_last_status`, `kds_last_status_at`, and `kds_last_status_by` in `fulfillment_metadata`.
- KDS UI shows table/lobby/parking context, customer name/phone, age, payment preference, line items, variations, modifiers, item notes, order notes, totals, and action buttons. It auto-refreshes every 15 seconds.
- Verified tests: 20/20 passing across KDS, QR order, POS catalog, and Square transform suites.
- Verified local and droplet builds pass; Next build output includes `/admin/kds` and `/api/admin/kds`.
- Deployed via tactical hot-copy into Coolify container. Backup image before KDS deploy: `sha256:ac512b6a0e7b9831a420a75d678dc4ca0ccd2740a3c681d1d4787d1e1fb8b647`.
- Smoke tested a live QR table order insert, verified it appears/queryable as active KDS-compatible data, updated status to confirmed, then deleted the smoke-test row. Unauthenticated `/admin/kds` redirects to `/account`; unauthenticated `/api/admin/kds` returns 401.
- Commit pushed: `998d86f`.

Next recommended phases: (1) Stripe/Square payment and reconciliation for QR/pickup orders, including paid/unpaid state; (2) notification layer for new KDS orders (sound/toast/push/SMS); (3) MenuMetrics recipe/inventory decrement hooks when QR orders are completed.

## 2026-05-05 update — payment state foundation for QR/pay-at-counter

- Added payment state columns to canonical `orders` via `supabase/migrations/012_order_payment_state.sql`: `payment_status`, `payment_method`, `paid_at`, and `payment_metadata`. Fulfillment `status` now remains prep/lifecycle state while `payment_status` tracks money state.
- Backfill in migration marks existing Stripe-linked orders as paid/stripe when Stripe IDs are present.
- Added TDD-backed payment helper module `src/lib/orders/payment.ts` with tests in `src/lib/orders/payment.test.ts`. It normalizes payment status, builds UI badges, validates safe transitions, and builds audited payment updates.
- QR order drafts and `POST /api/orders/submit` now initialize QR/pay-at-counter orders as `payment_status=unpaid`, `payment_method=pay_at_counter`, `paid_at=null`, with payment metadata preserving the initial preference.
- Added admin API `PATCH /api/admin/orders/[id]/payment` to mark payment state with audit events. It requires admin auth and rejects invalid transitions.
- KDS API now returns payment fields, and `/admin/kds` shows payment badges plus quick `Paid Cash` / `Paid Card` buttons for unpaid orders.
- Tests now pass 25/25 across payment, KDS, QR order, POS catalog, and Square transform suites.
- Local and droplet builds pass; Next build output includes `/api/admin/orders/[id]/payment`.
- Applied migration 012 on Supabase.
- Deployed via tactical hot-copy into Coolify container. Backup image before payment-state deploy: `sha256:e6f79302f49ed173f09c55f95bc7bc291a1b1520d52a80083e8e0d7c3288beab`.
- Live smoke test: created a QR pay-at-counter order, verified it initializes unpaid/pay_at_counter, marked it paid/cash directly in DB to verify columns/audit shape, deleted smoke row, and confirmed unauthenticated payment API returns 401.
- Commit pushed: `21e6270`.

Next recommended phases: add true Stripe online payment for QR/pickup (PaymentIntent/Checkout linked to existing order), Square order/reconciliation path, and KDS audible/new-order notifications.
