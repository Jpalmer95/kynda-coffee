-- ============================================================
-- 054_amazon_asin.sql
-- Add ASIN + source to ingredient_pars so Amazon items are keyed to their
-- exact listing (for cart automation) and flagged as exact vs manual.
-- ============================================================
ALTER TABLE public.ingredient_pars ADD COLUMN IF NOT EXISTS asin TEXT;
ALTER TABLE public.ingredient_pars ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
  CHECK (source IN ('manual','heb-live','amazon-live'));

CREATE INDEX IF NOT EXISTS idx_ingredient_pars_asin
  ON public.ingredient_pars (asin);
