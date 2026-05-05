-- Payment state for QR/pickup/pay-at-counter and future Stripe/Square reconciliation.
-- Keep status as fulfillment/prep state; payment_status is money state.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded', 'partially_refunded', 'void')),
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'unknown'
    CHECK (payment_method IN ('unknown', 'pay_at_counter', 'cash', 'card', 'stripe', 'square', 'comp', 'gift_card')),
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Backfill existing known-paid online/Stripe orders without touching QR/pay-at-counter rows.
UPDATE public.orders
SET payment_status = 'paid',
    payment_method = 'stripe',
    paid_at = COALESCE(paid_at, created_at),
    payment_metadata = COALESCE(payment_metadata, '{}'::jsonb) || jsonb_build_object('backfilled_from_stripe_ids', true)
WHERE payment_status = 'unpaid'
  AND (stripe_payment_intent_id IS NOT NULL OR stripe_checkout_session_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders(payment_method);
CREATE INDEX IF NOT EXISTS idx_orders_payment_metadata_gin ON public.orders USING GIN (payment_metadata);
