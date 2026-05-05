-- QR / pickup order metadata support.
-- Keep canonical order rows in public.orders for compatibility with existing admin,
-- account, analytics, Stripe, and Square sync code. Add metadata columns instead
-- of creating a separate order silo.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_preference TEXT NOT NULL DEFAULT 'online' CHECK (payment_preference IN ('online', 'pay_at_counter', 'online_later')),
  ADD COLUMN IF NOT EXISTS order_channel TEXT NOT NULL DEFAULT 'web' CHECK (order_channel IN ('web', 'qr', 'pickup', 'table', 'lobby', 'parking', 'delivery', 'shipping')),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_orders_channel_created ON public.orders(order_channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_qr_active ON public.orders(created_at DESC)
  WHERE source = 'qr' AND status IN ('pending', 'confirmed', 'processing');
CREATE INDEX IF NOT EXISTS idx_orders_fulfillment_metadata_gin ON public.orders USING GIN (fulfillment_metadata);
