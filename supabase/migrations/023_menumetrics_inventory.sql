-- Epic 7: MenuMetrics integration + autonomous inventory/costing (admin-backend only).
--
-- Cache tables so the platform shows live margins, low-stock alerts, and vendor
-- price trends even when MenuMetrics is briefly offline. MenuMetrics stays the
-- source of truth for recipe/ingredient costing (gram-level, densities, waste);
-- Kynda automates USING it. See docs/menumetrics-integration.md.

-- ---------------------------------------------------------------------------
-- Cached recipe costs (synced nightly from MenuMetrics, keyed by its recipe id,
-- which we already store on catalog_overrides.menu_metrics_recipe_id).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menumetrics_recipe_costs (
  recipe_id TEXT PRIMARY KEY,                 -- MenuMetrics recipe id
  name TEXT,
  yield_servings INTEGER,
  cost_per_serving_cents INTEGER NOT NULL DEFAULT 0,
  ingredient_cost_cents INTEGER NOT NULL DEFAULT 0,
  source_updated_at TIMESTAMPTZ,              -- MenuMetrics' updated_at
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Vendor price snapshots — append-only history for trend analysis + the monthly
-- "better-price" finder. One row per (ingredient, vendor, capture).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id TEXT NOT NULL,                -- MenuMetrics ingredient id
  ingredient_name TEXT,
  vendor TEXT,
  pack_size TEXT,
  unit TEXT,
  cost_cents INTEGER NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_prices_ingredient
  ON public.vendor_prices (ingredient_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_prices_vendor
  ON public.vendor_prices (vendor, captured_at DESC);

-- ---------------------------------------------------------------------------
-- Cached inventory levels + low-stock alert log.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menumetrics_stock (
  ingredient_id TEXT PRIMARY KEY,
  name TEXT,
  on_hand NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit TEXT,
  reorder_threshold NUMERIC(12,3),
  is_low BOOLEAN NOT NULL DEFAULT false,
  source_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menumetrics_stock_low ON public.menumetrics_stock (is_low);

CREATE TABLE IF NOT EXISTS public.inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id TEXT NOT NULL,
  ingredient_name TEXT,
  alert_type TEXT NOT NULL DEFAULT 'low_stock'
    CHECK (alert_type IN ('low_stock', 'out_of_stock', 'price_spike', 'better_price')),
  message TEXT,
  on_hand NUMERIC(12,3),
  threshold NUMERIC(12,3),
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_alerts_open
  ON public.inventory_alerts (acknowledged, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS: admin-only reads/writes (server cron uses service role and bypasses RLS).
-- ---------------------------------------------------------------------------
ALTER TABLE public.menumetrics_recipe_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menumetrics_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads recipe costs" ON public.menumetrics_recipe_costs;
CREATE POLICY "Admin reads recipe costs" ON public.menumetrics_recipe_costs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admin reads vendor prices" ON public.vendor_prices;
CREATE POLICY "Admin reads vendor prices" ON public.vendor_prices FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admin reads stock" ON public.menumetrics_stock;
CREATE POLICY "Admin reads stock" ON public.menumetrics_stock FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admin manages inventory alerts" ON public.inventory_alerts;
CREATE POLICY "Admin manages inventory alerts" ON public.inventory_alerts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
