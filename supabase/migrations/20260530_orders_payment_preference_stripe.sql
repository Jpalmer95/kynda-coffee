-- Allow the canonical `stripe` value on orders.payment_preference.
-- Migration 010 originally constrained this column to
-- ('online', 'pay_at_counter', 'online_later') before the app standardized
-- on 'stripe' for online card/wallet payment. Submitting an online menu/QR
-- order with payment_preference='stripe' was failing the old CHECK constraint
-- with a 500 ("orders_payment_preference_check"). Widen the constraint to
-- accept 'stripe' (keeping the legacy values for backward compatibility).
--
-- NOTE: The /api/orders/submit route also maps 'stripe' -> 'online' defensively
-- so the app keeps working even on databases where this migration hasn't run.
-- Once this migration is applied everywhere, that mapping can be relaxed to
-- write 'stripe' directly.

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_preference_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_preference_check
  CHECK (payment_preference IN ('online', 'stripe', 'pay_at_counter', 'online_later'));
