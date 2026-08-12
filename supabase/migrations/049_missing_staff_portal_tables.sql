-- ============================================================
-- 049_missing_staff_portal_tables.sql
-- Creates the staff-portal tables that were missing from the
-- live production DB (the 20260529 migration was only partially
-- applied: checklists/onboarding existed, but recipes,
-- waste_entries, and handbook_sections did not).
-- Idempotent: safe to re-run.
-- ============================================================

-- Recipes
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('espresso', 'cold-brew', 'tea', 'smoothie', 'food', 'pastry', 'seasonal')),
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  prep_time_minutes INTEGER DEFAULT 5,
  servings INTEGER DEFAULT 1,
  notes TEXT,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS recipes_name_key ON public.recipes (name);

-- Waste tracking
CREATE TABLE IF NOT EXISTS public.waste_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'each',
  reason TEXT NOT NULL CHECK (reason IN ('expired', 'spilled', 'customer-complaint', 'damaged', 'over-prepared', 'other')),
  cost_cents INTEGER NOT NULL DEFAULT 0,
  reported_by UUID REFERENCES auth.users(id) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_waste_entries_date ON public.waste_entries (created_at);
CREATE INDEX IF NOT EXISTS idx_waste_entries_reason ON public.waste_entries (reason);

-- Employee handbook sections
CREATE TABLE IF NOT EXISTS public.handbook_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_handbook_order ON public.handbook_sections (order_index);

-- ============================================================
-- Row Level Security (mirrors the original migration)
-- ============================================================
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handbook_sections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='recipes' AND policyname='Staff can read recipes') THEN
    CREATE POLICY "Staff can read recipes" ON public.recipes FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','employee')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='recipes' AND policyname='Admin can manage recipes') THEN
    CREATE POLICY "Admin can manage recipes" ON public.recipes FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='waste_entries' AND policyname='Staff can read waste') THEN
    CREATE POLICY "Staff can read waste" ON public.waste_entries FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','employee')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='waste_entries' AND policyname='Staff can insert waste') THEN
    CREATE POLICY "Staff can insert waste" ON public.waste_entries FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','employee')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='waste_entries' AND policyname='Admin can manage waste') THEN
    CREATE POLICY "Admin can manage waste" ON public.waste_entries FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='handbook_sections' AND policyname='Staff can read handbook') THEN
    CREATE POLICY "Staff can read handbook" ON public.handbook_sections FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','employee')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='handbook_sections' AND policyname='Admin can manage handbook') THEN
    CREATE POLICY "Admin can manage handbook" ON public.handbook_sections FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
  END IF;
END $$;
