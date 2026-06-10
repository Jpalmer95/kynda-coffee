-- 032: KDS order lifecycle statuses
--
-- Root cause of the "Failed to update order" bug on the KDS (2026-06-10):
-- the application's order state machine moved to
--   pending -> confirmed -> processing -> ready -> complete/fulfilled
-- but orders_status_check was never widened past the original e-commerce
-- set, so the KDS "Mark Ready" bump violated the CHECK constraint and the
-- PATCH 500'd. This widens the constraint to the full app status union
-- (src/types OrderStatus).

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending', 'confirmed', 'processing', 'ready', 'complete', 'fulfilled',
    'shipped', 'delivered', 'cancelled', 'refunded'
  ));
