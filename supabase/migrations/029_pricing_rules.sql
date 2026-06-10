-- 029: Pricing rules — persisted per-category overrides of the pricing engine
-- profiles (Epic 2 finisher, 2026-06-10). Owner edits at /admin/pricing.
-- The engine's DEFAULT_PRICING_PROFILES remain the fallback; rows here win.

CREATE TABLE IF NOT EXISTS public.pricing_rules (
  category TEXT PRIMARY KEY,
  target_margin_pct NUMERIC(5,4) NOT NULL CHECK (target_margin_pct >= 0 AND target_margin_pct <= 0.95),
  min_profit_cents INTEGER NOT NULL DEFAULT 0 CHECK (min_profit_cents >= 0),
  rounding TEXT NOT NULL DEFAULT 'charm_99'
    CHECK (rounding IN ('none','charm_99','charm_49_99','nearest_5','nearest_25')),
  shipping_buffer_cents INTEGER NOT NULL DEFAULT 0 CHECK (shipping_buffer_cents >= 0),
  notes TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

-- Money-safety config: owner/manager read, writes via service role (owner-gated API).
DROP POLICY IF EXISTS "Staff reads pricing rules" ON public.pricing_rules;
CREATE POLICY "Staff reads pricing rules" ON public.pricing_rules
  FOR SELECT USING (public.is_staff());
