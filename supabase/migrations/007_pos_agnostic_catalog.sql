-- POS-Agnostic Catalog Foundation
-- Keeps Square as the current adapter while making Kynda's commerce/menu layer portable to future POS platforms.

-- Raw provider objects: lossless audit/cache layer for Square, future Toast/Clover/Shopify/etc.
CREATE TABLE IF NOT EXISTS public.pos_raw_objects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_object_id TEXT NOT NULL,
  object_type TEXT NOT NULL,
  version BIGINT,
  raw JSONB NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_object_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_raw_objects_provider_type
  ON public.pos_raw_objects(provider, object_type);
CREATE INDEX IF NOT EXISTS idx_pos_raw_objects_raw_gin
  ON public.pos_raw_objects USING gin(raw);

-- Normalized provider categories.
CREATE TABLE IF NOT EXISTS public.pos_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  ordinal INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_category_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_categories_provider_name
  ON public.pos_categories(provider, name);

-- Normalized provider items/products/menu items.
CREATE TABLE IF NOT EXISTS public.pos_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  provider_category_id TEXT,
  category_name TEXT,
  item_type TEXT NOT NULL DEFAULT 'menu' CHECK (item_type IN ('menu', 'retail', 'merch', 'modifier', 'service', 'gift_card', 'unknown')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  available_online BOOLEAN NOT NULL DEFAULT true,
  available_pickup BOOLEAN NOT NULL DEFAULT true,
  available_delivery BOOLEAN NOT NULL DEFAULT false,
  available_shipping BOOLEAN NOT NULL DEFAULT false,
  available_qr BOOLEAN NOT NULL DEFAULT true,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  modifier_list_ids TEXT[] NOT NULL DEFAULT '{}',
  tax_ids TEXT[] NOT NULL DEFAULT '{}',
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_item_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_items_provider_type ON public.pos_items(provider, item_type);
CREATE INDEX IF NOT EXISTS idx_pos_items_category ON public.pos_items(category_name);
CREATE INDEX IF NOT EXISTS idx_pos_items_channels ON public.pos_items(available_online, available_pickup, available_qr);
CREATE INDEX IF NOT EXISTS idx_pos_items_raw_gin ON public.pos_items USING gin(raw);

-- Normalized provider item variations/SKUs.
CREATE TABLE IF NOT EXISTS public.pos_item_variations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_item_id TEXT NOT NULL,
  provider_variation_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sku TEXT,
  ordinal INTEGER,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  pricing_type TEXT,
  track_inventory BOOLEAN NOT NULL DEFAULT false,
  sellable BOOLEAN NOT NULL DEFAULT true,
  stockable BOOLEAN NOT NULL DEFAULT false,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_variation_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_item_variations_item
  ON public.pos_item_variations(provider, provider_item_id);

-- Normalized provider modifier lists and options.
CREATE TABLE IF NOT EXISTS public.pos_modifier_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_modifier_list_id TEXT NOT NULL,
  name TEXT NOT NULL,
  selection_type TEXT,
  min_selected_modifiers INTEGER,
  max_selected_modifiers INTEGER,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_modifier_list_id)
);

CREATE TABLE IF NOT EXISTS public.pos_modifiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_modifier_id TEXT NOT NULL,
  provider_modifier_list_id TEXT NOT NULL,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  ordinal INTEGER,
  on_by_default BOOLEAN NOT NULL DEFAULT false,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_modifier_id)
);

CREATE INDEX IF NOT EXISTS idx_pos_modifiers_list
  ON public.pos_modifiers(provider, provider_modifier_list_id);

-- Taxes/service charges, normalized for future checkout/KDS calculations.
CREATE TABLE IF NOT EXISTS public.pos_taxes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_tax_id TEXT NOT NULL,
  name TEXT NOT NULL,
  percentage TEXT,
  calculation_phase TEXT,
  inclusion_type TEXT,
  applies_to_custom_amounts BOOLEAN,
  enabled BOOLEAN NOT NULL DEFAULT true,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_tax_id)
);

-- POS sync runs across providers.
CREATE TABLE IF NOT EXISTS public.pos_sync_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  sync_type TEXT NOT NULL DEFAULT 'catalog',
  raw_objects_synced INTEGER NOT NULL DEFAULT 0,
  items_synced INTEGER NOT NULL DEFAULT 0,
  variations_synced INTEGER NOT NULL DEFAULT 0,
  modifiers_synced INTEGER NOT NULL DEFAULT 0,
  taxes_synced INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pos_sync_runs_provider_started
  ON public.pos_sync_runs(provider, started_at DESC);

-- Keep compatibility with current Square-specific table while adding metadata for richer display.
CREATE UNIQUE INDEX IF NOT EXISTS idx_square_catalog_items_variation_unique
  ON public.square_catalog_items(square_variation_id)
  WHERE square_variation_id IS NOT NULL;

ALTER TABLE public.square_catalog_items
  ADD COLUMN IF NOT EXISTS provider_raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD COLUMN IF NOT EXISTS variation_name TEXT,
  ADD COLUMN IF NOT EXISTS modifier_list_ids TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tax_ids TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_shipping BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS available_qr BOOLEAN NOT NULL DEFAULT true;

-- Basic public read policies for normalized catalog. Writes happen through service-role API routes.
ALTER TABLE public.pos_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_item_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_modifier_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_taxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pos_categories_public_read" ON public.pos_categories;
CREATE POLICY "pos_categories_public_read" ON public.pos_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "pos_items_public_read" ON public.pos_items;
CREATE POLICY "pos_items_public_read" ON public.pos_items FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "pos_item_variations_public_read" ON public.pos_item_variations;
CREATE POLICY "pos_item_variations_public_read" ON public.pos_item_variations FOR SELECT USING (true);
DROP POLICY IF EXISTS "pos_modifier_lists_public_read" ON public.pos_modifier_lists;
CREATE POLICY "pos_modifier_lists_public_read" ON public.pos_modifier_lists FOR SELECT USING (true);
DROP POLICY IF EXISTS "pos_modifiers_public_read" ON public.pos_modifiers;
CREATE POLICY "pos_modifiers_public_read" ON public.pos_modifiers FOR SELECT USING (true);
DROP POLICY IF EXISTS "pos_taxes_public_read" ON public.pos_taxes;
CREATE POLICY "pos_taxes_public_read" ON public.pos_taxes FOR SELECT USING (enabled = true);
