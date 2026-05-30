# MenuMetrics ↔ Kynda Platform Integration (Epic 7)

**Status:** Contract defined; client + cache scaffolded. REST paths marked `‹verify›`
must be confirmed against the running MenuMetrics instance before enabling live sync.

**Scope reminder (owner rule):** MenuMetrics is **admin-backend only**. None of this renders
on the customer Menu. It powers admin cost/margin/inventory intelligence and feeds the
Pricing Engine (Epic 2) for advisory margin checks.

---

## What MenuMetrics is

- Repo: https://github.com/Jpalmer95/MenuMetrics — Express + Drizzle + PostgreSQL, TypeScript.
- Live: https://menu.167.99.125.127.sslip.io/
- It already solves the hard part: ingredient cost down to the gram, pack sizes, **densities**,
  unit conversions, recipe yield, fully-loaded cost per serving, waste analytics, purchase orders,
  break-even, and an AI agent. Core math: `shared/cost-calculator.ts`, `shared/density-lookup.ts`.

Kynda Platform's job (this Epic) is to **automate USING it**: pull recipe costs + inventory on a
schedule, cache them so the admin shows live margins even if MenuMetrics is briefly down, raise
low-stock alerts, track vendor price trends, and surface growth/inventory recommendations.

---

## Auth + config

MenuMetrics uses local email/password auth (Replit OIDC was removed). For server-to-server we use
an API token (or a service session). Kynda env:

```
MENU_METRICS_URL=https://menu.167.99.125.127.sslip.io
MENU_METRICS_TOKEN=<service token / API key>     # Bearer auth
```

When `MENU_METRICS_URL` is unset, the client is a no-op and the platform falls back to cached
values (or shows "not connected"). Nothing breaks if MenuMetrics is offline.

---

## Integration contract (the data Kynda needs)

The Kynda client (`src/lib/menumetrics/client.ts`) expects these logical resources. Exact REST
paths are `‹verify›` against the running app's `server/` routes; the client centralizes them so
confirming/adjusting is a one-file change.

### 1. Recipe cost by ID  — `GET /api/recipes/:id` ‹verify›
Returns a recipe with its fully-loaded cost. Kynda maps to:
```ts
interface MenuMetricsRecipeCost {
  id: string;
  name: string;
  yield_servings: number;
  cost_per_serving_cents: number;   // fully loaded (ingredients + waste factor)
  ingredient_cost_cents: number;    // raw ingredient cost
  updated_at: string;
}
```

### 2. Recipe list (for linking) — `GET /api/recipes` ‹verify›
`[{ id, name, cost_per_serving_cents }]` — powers the catalog recipe-link picker.

### 3. Ingredient + vendor prices — `GET /api/ingredients` ‹verify›
```ts
interface MenuMetricsIngredient {
  id: string;
  name: string;
  vendor: string | null;
  pack_size: string | null;
  cost_cents: number;          // current cost for the pack
  unit: string;
  density_g_per_ml: number | null;
  updated_at: string;
}
```
Used for vendor price-trend tracking (Kynda's `vendor_prices` table snapshots these over time).

### 4. Inventory levels — `GET /api/inventory` ‹verify›
```ts
interface MenuMetricsStock {
  ingredient_id: string;
  name: string;
  on_hand: number;
  unit: string;
  reorder_threshold: number | null;
  updated_at: string;
}
```
Drives low-stock alerts + days-of-cover.

---

## How Kynda uses it

| Kynda feature | MenuMetrics resource | Mechanism |
|---|---|---|
| Live menu-item margin in `/admin/catalog` | recipe cost by ID (linked via `menu_metrics_recipe_id`) | nightly cache sync → `menumetrics_recipe_costs` |
| Pricing Engine advisory margin (Epic 2) | recipe cost | read cached cost as `costCents` |
| Low-stock alerts | inventory levels | nightly check vs threshold → admin alert + Hermes notify |
| Vendor "better-price" finder (monthly) | ingredient/vendor prices | snapshot to `vendor_prices`, diff trends, flag savings |
| Waste cost auto-fill (Epic 4 waste log) | ingredient cost | look up cost when logging waste |
| Trending-item recommendations | recipe cost + sales | agent joins MenuMetrics cost w/ Square sales |

---

## Sync + automation (all approval-aware)

- **Nightly cost cache** (Hermes cron → `/api/admin/menumetrics/sync` secured by `CRON_SECRET`):
  pulls linked recipe costs + inventory into Supabase cache tables. Read-only on MenuMetrics.
- **Monthly vendor better-price finder** (Hermes cron): snapshots vendor prices, computes trends,
  produces a savings report. **Switching vendors requires owner approval** — the cron only reports.
- **Low-stock watcher** (daily): compares cached stock vs thresholds; surfaces alerts in admin and
  (optionally) notifies the owner.

---

## Build order

1. ✅ Contract doc (this file) + typed client scaffold + cache migration (commit pending).
2. ‹next› Confirm REST paths against the running instance; flip the client from scaffold to live.
3. ‹next› Nightly cost-cache cron + `/admin/inventory` live-margin columns.
4. ‹next› `vendor_prices` trend tracking + monthly better-price finder (Hermes skill/cron).
5. ‹next› Wire Pricing Engine (Epic 2) to read cached recipe cost as the cost basis.
