-- Ensure item-level catalog overrides are unique even when provider_variation_id is NULL.
-- PostgreSQL UNIQUE(provider, provider_item_id, provider_variation_id) allows multiple NULL variation rows.

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_overrides_item_variation_key
  ON public.catalog_overrides(provider, provider_item_id, COALESCE(provider_variation_id, ''));
