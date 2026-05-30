-- Epic 1: Menu vs Shop separation — explicit, owner-controlled channel visibility.
--
-- Problem: the `menu` channel previously included `merch` items, so merchandise
-- leaked onto the customer Menu (food/drink ordering) page. Classification leaned
-- on Square item_type guessed from category/name text, which is unreliable.
--
-- Fix: add a first-class `channel_visibility` decision on the owner-curated
-- catalog_overrides layer. The customer Menu page is STRICTLY food & drink ordering;
-- the Shop is STRICTLY shipped/retail goods. Owners set the truth here; the catalog
-- engine respects it instead of text-guessing.
--
--   'auto'   (default) — fall back to item_type heuristic (back-compat behavior,
--                        but with merch excluded from menu — see catalog.ts)
--   'menu'   — show only on Menu (food/drink ordering surfaces), never in Shop
--   'shop'   — show only in Shop (shipped/retail goods), never on Menu
--   'both'   — intentional allowlist (e.g. bagged retail coffee: grab-and-go on
--              Menu AND shipped in Shop)
--   'hidden' — never shown on any public channel (same effect as is_hidden)

ALTER TABLE public.catalog_overrides
  ADD COLUMN IF NOT EXISTS channel_visibility TEXT
    CHECK (channel_visibility IN ('auto', 'menu', 'shop', 'both', 'hidden'));

-- Existing rows: leave NULL so they behave as 'auto' (no surprise reclassification).
-- New owner decisions populate this column explicitly.

CREATE INDEX IF NOT EXISTS idx_catalog_overrides_channel_visibility
  ON public.catalog_overrides(channel_visibility);

COMMENT ON COLUMN public.catalog_overrides.channel_visibility IS
  'Owner-controlled channel routing: auto|menu|shop|both|hidden. Drives Menu (food/drink ordering) vs Shop (shipped/retail goods) separation. NULL = auto.';
