-- 031: Cross-platform order flow (Square upstream push + unified KDS)
--
-- Fixes two LATENT prod bugs found 2026-06-10:
--   a) orders_source_check did not allow 'square-pos' (the value the Square
--      webhook writes) so POS order ingestion was silently failing.
--   b) No unique index on square_order_id, so the webhook's
--      upsert(onConflict: square_order_id) could not work.
-- And adds:
--   c) 'pos' + 'agent' order_channel values (Square POS orders ride the shared
--      KDS board; agents get a first-class channel).
--   d) 'agent' as an allowed order source for agent-placed orders.

-- order source CHECK: extend with 'square-pos' and 'agent'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_source_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_source_check
  CHECK (source IN ('website', 'pos', 'qr', 'delivery', 'subscription', 'square-pos', 'agent'));

-- order_channel CHECK: extend with 'pos' and 'agent'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_channel_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_channel_check
  CHECK (order_channel IN ('web', 'qr', 'pickup', 'table', 'lobby', 'parking', 'delivery', 'shipping', 'pos', 'agent'));

-- Unique index for webhook upserts + echo-loop guard (NULLs excluded)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_square_order_id_unique
  ON public.orders (square_order_id)
  WHERE square_order_id IS NOT NULL;
