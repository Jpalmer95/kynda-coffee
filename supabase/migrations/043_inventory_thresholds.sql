-- 043_inventory_thresholds.sql
-- Persistent per-item inventory thresholds (admin overrides the heuristic).
-- Keyed by source + provider variation id (Square) or product id (Online).

CREATE TABLE IF NOT EXISTS public.inventory_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL CHECK (source IN ('square', 'online')),
  provider_variation_id TEXT NOT NULL,
  item_name TEXT,
  threshold NUMERIC(10,2) NOT NULL CHECK (threshold >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, provider_variation_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_thresholds_source
  ON public.inventory_thresholds (source, provider_variation_id);

ALTER TABLE public.inventory_thresholds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manager reads inventory thresholds" ON public.inventory_thresholds;
CREATE POLICY "Manager reads inventory thresholds" ON public.inventory_thresholds FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));

DROP POLICY IF EXISTS "Manager writes inventory thresholds" ON public.inventory_thresholds;
CREATE POLICY "Manager writes inventory thresholds" ON public.inventory_thresholds FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager')
  ));
