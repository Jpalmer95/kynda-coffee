-- ============================================================
-- Phase 4: Staff Portal Tables
-- Recipes, Checklists, Waste Tracking, Handbook
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

-- Opening/closing/shift checklists
CREATE TABLE IF NOT EXISTS public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist completion tracking
CREATE TABLE IF NOT EXISTS public.checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_type TEXT NOT NULL CHECK (checklist_type IN ('opening', 'closing', 'mid-shift')),
  completed_by UUID REFERENCES auth.users(id) NOT NULL,
  completed_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checklist_completions_user_date
  ON public.checklist_completions (completed_by, completed_at);

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

CREATE INDEX IF NOT EXISTS idx_waste_entries_date
  ON public.waste_entries (created_at);

CREATE INDEX IF NOT EXISTS idx_waste_entries_reason
  ON public.waste_entries (reason);

-- Employee handbook sections (editable by admin)
CREATE TABLE IF NOT EXISTS public.handbook_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handbook_order ON public.handbook_sections (order_index);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Recipes: staff can read, admin can write
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read recipes"
  ON public.recipes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Admin can manage recipes"
  ON public.recipes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Checklists: staff can read, admin can write
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read checklists"
  ON public.checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Admin can manage checklists"
  ON public.checklists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Checklist completions: staff can read own + admin reads all, staff can write own
ALTER TABLE public.checklist_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read own completions"
  ON public.checklist_completions FOR SELECT
  USING (
    completed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Staff can write own completions"
  ON public.checklist_completions FOR INSERT
  WITH CHECK (
    completed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Staff can update own completions"
  ON public.checklist_completions FOR UPDATE
  USING (completed_by = auth.uid())
  WITH CHECK (completed_by = auth.uid());

-- Waste entries: staff can read all + write own
ALTER TABLE public.waste_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read waste entries"
  ON public.waste_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Staff can log waste"
  ON public.waste_entries FOR INSERT
  WITH CHECK (
    reported_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'employee')
    )
  );

-- Handbook: staff can read, admin can write
ALTER TABLE public.handbook_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read handbook"
  ON public.handbook_sections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'employee')
    )
  );

CREATE POLICY "Admin can manage handbook"
  ON public.handbook_sections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
