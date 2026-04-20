-- Product source tracking
-- Add these columns to the products table

ALTER TABLE products ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'online'
  CHECK (source IN ('square', 'online', 'both'));

ALTER TABLE products ADD COLUMN IF NOT EXISTS square_item_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS square_variation_id TEXT;

ALTER TABLE products ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_synced_at TIMESTAMPTZ;

-- Index for sync lookups
CREATE INDEX IF NOT EXISTS idx_products_square_item ON products(square_item_id) WHERE square_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_source ON products(source);

-- Update existing products to mark their source
UPDATE products SET source = 'online' WHERE source IS NULL;

-- Inventory sync log
CREATE TABLE IF NOT EXISTS inventory_sync_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  old_count INTEGER,
  new_count INTEGER,
  source TEXT NOT NULL DEFAULT 'square',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order inventory adjustments (for online orders that affect Square stock)
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id),
  order_id UUID REFERENCES orders(id),
  quantity_change INTEGER NOT NULL, -- negative for decrements
  reason TEXT NOT NULL, -- 'online_sale', 'pos_sale', 'restock', 'correction'
  synced_to_square BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
