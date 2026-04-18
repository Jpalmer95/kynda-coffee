-- ============================================================
-- Kynda Coffee — Database Schema
-- ============================================================
-- Run this in Supabase SQL editor or via supabase CLI migrations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---- Products ----
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN (
    'coffee-beans', 'merch-apparel', 'merch-mugs', 'merch-glassware',
    'merch-accessories', 'subscription', 'gift-card', 'catering'
  )),
  price_cents INTEGER NOT NULL,
  compare_at_price_cents INTEGER,
  images TEXT[] NOT NULL DEFAULT '{}',
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  -- Coffee-specific
  roast_level TEXT CHECK (roast_level IN ('light', 'medium', 'medium-dark', 'dark')),
  grind_options TEXT[] DEFAULT '{}',
  origin TEXT,
  tasting_notes TEXT[] DEFAULT '{}',
  -- Merch-specific
  sizes TEXT[] DEFAULT '{}',
  colors JSONB DEFAULT '[]',
  -- POD
  printful_variant_id TEXT,
  -- Meta
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  inventory_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Customers ----
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  stripe_customer_id TEXT UNIQUE,
  square_customer_id TEXT,
  email_opt_in BOOLEAN NOT NULL DEFAULT false,
  sms_opt_in BOOLEAN NOT NULL DEFAULT false,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  loyalty_tier TEXT NOT NULL DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'kynda-vip')),
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent_cents INTEGER NOT NULL DEFAULT 0,
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Orders ----
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
  )),
  source TEXT NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'pos', 'qr', 'delivery', 'subscription')),
  items JSONB NOT NULL DEFAULT '[]',
  subtotal_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  square_order_id TEXT,
  printful_order_id TEXT,
  shipping_address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Subscriptions ----
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'past_due', 'trialing')),
  grind TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  next_delivery_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ
);

-- ---- Designs (AI Merch) ----
CREATE TABLE designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'customer-created' CHECK (category IN (
    'kynda-core', 'trending', 'coffee-vibes', 'nature-texas', 'customer-created', 'seasonal'
  )),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'review', 'approved', 'published', 'archived')),
  prompt TEXT NOT NULL,
  style_preset TEXT,
  original_image_url TEXT NOT NULL,
  mockup_urls TEXT[] NOT NULL DEFAULT '{}',
  applicable_products TEXT[] NOT NULL DEFAULT '{}',
  printful_design_id TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Campaigns (Marketing) ----
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'sms', 'social')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  subject TEXT,
  content TEXT NOT NULL,
  audience_filter JSONB,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  stats JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Social Posts ----
CREATE TABLE social_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'tiktok')),
  content TEXT NOT NULL,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  engagement JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---- Indexes ----
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(is_active) WHERE is_active = true;
CREATE INDEX idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_designs_status ON designs(status);
CREATE INDEX idx_designs_public ON designs(is_public) WHERE is_public = true;

-- ---- Row Level Security (RLS) ----
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

-- Public can read active products and published designs
CREATE POLICY "Public read products" ON products FOR SELECT USING (is_active = true);
CREATE POLICY "Public read designs" ON designs FOR SELECT USING (is_public = true AND status = 'published');

-- Authenticated users can read their own data
CREATE POLICY "Users read own orders" ON orders FOR SELECT USING (email = auth.jwt() ->> 'email');
CREATE POLICY "Users read own subscriptions" ON subscriptions FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE email = auth.jwt() ->> 'email'));
CREATE POLICY "Users read own designs" ON designs FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE email = auth.jwt() ->> 'email'));
CREATE POLICY "Users insert designs" ON designs FOR INSERT WITH CHECK (customer_id IN (SELECT id FROM customers WHERE email = auth.jwt() ->> 'email'));

-- Service role bypasses RLS (used by API routes with SUPABASE_SERVICE_ROLE_KEY)

-- ---- Updated at trigger ----
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
