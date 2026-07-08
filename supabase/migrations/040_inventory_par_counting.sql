-- 040_inventory_par_counting.sql
-- Monthly inventory count system: generate count sheets, team counts items,
-- variance report, cost of goods. Also includes waste log for tracking
-- broken/expired/damaged/returned goods with cost attribution.
-- Designed to integrate with MenuMetrics ingredient costing future-phase.

CREATE TABLE IF NOT EXISTS public.inventory_counts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  counted_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  total_variance_cents INTEGER NOT NULL DEFAULT 0,
  total_expected_cents INTEGER NOT NULL DEFAULT 0,
  total_counted_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inventory_counts_date ON public.inventory_counts(count_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_status ON public.inventory_counts(status);

CREATE TABLE IF NOT EXISTS public.inventory_count_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  count_id UUID NOT NULL REFERENCES public.inventory_counts(id) ON DELETE CASCADE,
  pos_item_id TEXT,                     -- references pos_items.provider_item_id (nullable for ad-hoc items)
  pos_variation_id TEXT,                -- references pos_item_variations.provider_variation_id
  product_id UUID,                      -- references products.id (for online/non-POS items)
  name TEXT NOT NULL,                   -- snapshot of item name at count time
  variation_name TEXT,                  -- snapshot of variation name
  sku TEXT,
  category TEXT,                        -- 'Cafe' | 'Merch' | custom
  unit TEXT,                            -- 'each' | 'lb' | 'oz' | 'gal' | etc.
  system_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,   -- what POS/system says
  counted_stock NUMERIC(12, 2),         -- what team counted (null = not yet counted)
  unit_cost_cents INTEGER NOT NULL DEFAULT 0,       -- cost per unit in cents
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(count_id, pos_variation_id),
  UNIQUE(count_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_count_items_count ON public.inventory_count_items(count_id);

-- Waste log: track broken, expired, damaged, returned goods with cost.
-- Will integrate with MenuMetrics recipe/ingredient costing future-phase.
CREATE TABLE IF NOT EXISTS public.waste_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  logged_by UUID NOT NULL REFERENCES auth.users(id),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  waste_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pos_item_id TEXT,                     -- references pos_items.provider_item_id (nullable)
  pos_variation_id TEXT,                -- references pos_item_variations.provider_variation_id
  product_id UUID,                      -- references products.id (for online/non-POS items)
  ingredient_id TEXT,                   -- future: MenuMetrics ingredient ID
  name TEXT NOT NULL,                   -- item name (snapshot)
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'each',
  unit_cost_cents INTEGER NOT NULL DEFAULT 0,
  total_cost_cents INTEGER NOT NULL DEFAULT 0,     -- computed: quantity * unit_cost_cents
  reason TEXT NOT NULL CHECK (reason IN ('broken', 'expired', 'damaged', 'returned', 'spoilage', 'overpour', 'theft', 'sample', 'other')),
  notes TEXT,
  shift TEXT,                           -- 'opening' | 'midday' | 'closing' | 'all_day'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waste_log_date ON public.waste_log(waste_date DESC);
CREATE INDEX IF NOT EXISTS idx_waste_log_reason ON public.waste_log(reason);
CREATE INDEX IF NOT EXISTS idx_waste_log_item ON public.waste_log(pos_item_id);

-- RLS: manager+ can manage counts; staff can view and create waste entries.
ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_log ENABLE ROW LEVEL SECURITY;

-- During initial rollout, allow access via service role (admin API uses supabaseAdmin).
-- Frontend uses the admin API routes which enforce tier checks server-side.
CREATE POLICY "inventory_counts_service_role_all" ON public.inventory_counts
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "inventory_count_items_service_role_all" ON public.inventory_count_items
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "waste_log_service_role_all" ON public.waste_log
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Staff can read counts and waste log (for transparency).
CREATE POLICY "inventory_counts_staff_read" ON public.inventory_counts
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "inventory_count_items_staff_read" ON public.inventory_count_items
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "waste_log_staff_read" ON public.waste_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- Staff can insert waste log entries (baristas log waste during shifts).
CREATE POLICY "waste_log_staff_insert" ON public.waste_log
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Staff can update their own waste entries (within 24h).
CREATE POLICY "waste_log_staff_update_own" ON public.waste_log
  FOR UPDATE USING (auth.uid() = logged_by AND logged_at > NOW() - INTERVAL '24 hours');
