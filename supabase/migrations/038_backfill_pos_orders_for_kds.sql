-- 038: Backfill legacy POS orders so they appear on the KDS board.
--
-- syncRecentOrders originally wrote source='pos' with no order_channel
-- and payment_status defaulting to 'unpaid'. The KDS channelFilter only
-- accepted source IN ('square-pos', ...) so all 300 historical POS
-- orders were invisible. This migration:
--   a) Updates source 'pos' → 'square-pos' (matches what the webhook writes)
--   b) Sets order_channel = 'pos' where it was NULL
--   c) Sets payment_status = 'paid' + payment_method = 'square' for POS
--      orders (they are settled inside Square; the prepaid-only gate was
--      hiding them as "unpaid").
--   d) Maps COMPLETED Square orders from terminal 'delivered' → 'complete'
--      so they show in the Recently Completed rail.
--
-- Idempotent: each UPDATE is guarded by a WHERE clause.

UPDATE public.orders
  SET source = 'square-pos'
  WHERE source = 'pos';

UPDATE public.orders
  SET order_channel = 'pos'
  WHERE source = 'square-pos' AND order_channel IS NULL;

UPDATE public.orders
  SET payment_status = 'paid',
      payment_method = COALESCE(payment_method, 'square'),
      paid_at = COALESCE(paid_at, updated_at)
  WHERE source = 'square-pos' AND payment_status != 'paid';

-- Move terminal 'delivered' (old COMPLETED mapping) back to 'complete'
-- so the KDS Recently Completed rail can show them.
UPDATE public.orders
  SET status = 'complete'
  WHERE source = 'square-pos' AND status = 'delivered';
