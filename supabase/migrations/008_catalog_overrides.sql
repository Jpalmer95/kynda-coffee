-- Catalog override layer for owner-curated public menu/shop/QR channels.
-- Square/POS remains the synced source; this table stores Kynda-owned presentation and channel decisions.

CREATE TABLE IF NOT EXISTS public.catalog_overrides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'square',
  provider_item_id TEXT NOT NULL,
  provider_variation_id TEXT,

  display_name TEXT,
  display_description TEXT,
  image_urls TEXT[],
  category_name TEXT,
  item_type TEXT CHECK (item_type IN ('menu', 'retail', 'merch', 'modifier', 'service', 'gift_card', 'unknown')),

  available_online BOOLEAN,
  available_pickup BOOLEAN,
  available_delivery BOOLEAN,
  available_shipping BOOLEAN,
  available_qr BOOLEAN,

  is_hidden BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN,
  sort_order INTEGER,
  menu_metrics_recipe_id TEXT,
  admin_notes TEXT,

  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(provider, provider_item_id, provider_variation_id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_overrides_provider_item
  ON public.catalog_overrides(provider, provider_item_id);
CREATE INDEX IF NOT EXISTS idx_catalog_overrides_hidden
  ON public.catalog_overrides(is_hidden);
CREATE INDEX IF NOT EXISTS idx_catalog_overrides_channels
  ON public.catalog_overrides(available_online, available_pickup, available_qr, available_shipping);

ALTER TABLE public.catalog_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "catalog_overrides_public_read" ON public.catalog_overrides;
CREATE POLICY "catalog_overrides_public_read"
  ON public.catalog_overrides FOR SELECT
  USING (true);

-- Writes are intentionally service-role only via /api/admin/catalog/* routes.
