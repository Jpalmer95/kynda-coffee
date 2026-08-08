-- 048_ingredient_pars.sql
-- Phase 6 (MASTER_PLAN): ingredient par targets + vendor ordering engine.
-- MenuMetrics stays source of truth for costs; Kynda manages pars + orders.

CREATE TABLE IF NOT EXISTS public.ingredient_pars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'general'
    CHECK (area IN ('general', 'bar', 'kitchen', 'retail', 'bakery', 'storage')),
  unit TEXT NOT NULL DEFAULT 'each',
  par_level NUMERIC(10, 2) NOT NULL CHECK (par_level >= 0),
  vendor TEXT NOT NULL DEFAULT 'HEB'
    CHECK (vendor IN ('HEB', 'Amazon', 'Other')),
  cadence TEXT NOT NULL DEFAULT 'biweekly'
    CHECK (cadence IN ('biweekly', 'monthly', 'weekly', 'as_needed')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ingredient_name)
);

CREATE INDEX IF NOT EXISTS idx_ingredient_pars_vendor
  ON public.ingredient_pars (vendor, cadence);

CREATE INDEX IF NOT EXISTS idx_ingredient_pars_active
  ON public.ingredient_pars (is_active);

ALTER TABLE public.ingredient_pars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manager reads ingredient pars" ON public.ingredient_pars;
CREATE POLICY "Manager reads ingredient pars" ON public.ingredient_pars FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager', 'owner')
  ));

DROP POLICY IF EXISTS "Manager writes ingredient pars" ON public.ingredient_pars;
CREATE POLICY "Manager writes ingredient pars" ON public.ingredient_pars FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager', 'owner')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager', 'owner')
  ));

-- Purchase orders (generated from par counts, human-approved)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor TEXT NOT NULL CHECK (vendor IN ('HEB', 'Amazon', 'Other')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved', 'ordered', 'received', 'cancelled')),
  items JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{name, qty, unit, par, on_hand}]
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
  ON public.purchase_orders (status, created_at DESC);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manager reads purchase orders" ON public.purchase_orders;
CREATE POLICY "Manager reads purchase orders" ON public.purchase_orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager', 'owner')
  ));

DROP POLICY IF EXISTS "Manager writes purchase orders" ON public.purchase_orders;
CREATE POLICY "Manager writes purchase orders" ON public.purchase_orders FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager', 'owner')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager', 'owner')
  ));
