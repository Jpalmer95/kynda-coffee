-- Epic 5: Monthly Specials — single source of truth.
--
-- One `specials` record drives BOTH (a) the Specials section at the top of the
-- Menu ordering page and (b) marketing campaigns (social drafts + newsletter).
-- This replaces the menu's heuristic "guess the specials" approach with explicit,
-- owner-curated specials that have a date window, so the menu and marketing stay
-- in sync from one place.

CREATE TABLE IF NOT EXISTS public.specials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  -- optional link to a real catalog item so "Add to cart" works from the special
  provider_item_id TEXT,
  provider_variation_id TEXT,
  image_url TEXT,
  -- promo / pricing display (actual transaction price still comes from catalog)
  price_cents INTEGER,
  compare_at_cents INTEGER,         -- show a strike-through "was" price
  badge TEXT,                       -- e.g. "New", "Limited", "Seasonal", "Deal"
  cta_label TEXT DEFAULT 'Order now',
  -- scheduling window. NULL start = active immediately; NULL end = no expiry.
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- marketing linkage: did we generate a campaign for this special yet?
  marketing_generated BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_specials_active_window
  ON public.specials (is_active, starts_at, ends_at, sort_order);

ALTER TABLE public.specials ENABLE ROW LEVEL SECURITY;

-- Public can read currently-active specials (the menu page is public).
DROP POLICY IF EXISTS "Anyone can read active specials" ON public.specials;
CREATE POLICY "Anyone can read active specials"
  ON public.specials FOR SELECT
  USING (is_active = true);

-- Admins manage specials.
DROP POLICY IF EXISTS "Admins manage specials" ON public.specials;
CREATE POLICY "Admins manage specials"
  ON public.specials FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
