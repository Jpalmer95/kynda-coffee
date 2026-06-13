-- 035: Gift card payment integrity.
-- Cards are now created as 'pending_payment' and only become 'active' when the
-- Stripe checkout.session.completed webhook confirms payment. Previously cards
-- were born 'active' before payment (abandoned checkout = free money).
ALTER TABLE public.gift_cards DROP CONSTRAINT IF EXISTS gift_cards_status_check;
ALTER TABLE public.gift_cards ADD CONSTRAINT gift_cards_status_check
  CHECK (status = ANY (ARRAY['pending_payment'::text, 'active'::text, 'redeemed'::text, 'expired'::text, 'cancelled'::text]));
