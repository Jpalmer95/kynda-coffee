-- 039_security_rls_gap_fix.sql
-- Epic 11 Phase 2: Close remaining RLS gaps found by external security audit.
--
-- AUDIT FINDING:
--   An external security scan flagged 12 tables created without
--   ENABLE ROW LEVEL SECURITY. Migrations 025 + 026 retroactively
--   added RLS to most of them, but two tables were missed:
--     - affiliate_payouts  (financial payout ledger)
--     - referral_codes     (maps codes to customer IDs)
--
--   Both contain sensitive financial/customer-linkage data and were
--   reachable by the anon role (public publishable key) without any
--   RLS wall.
--
--   Additionally, this migration re-verifies every table flagged in
--   the security report to ensure RLS is enabled in production, even
--   if an earlier migration was only partially applied.
--
-- VERIFIED SAFE: all application access to these tables goes through
--   server routes using the service-role client (supabaseAdmin),
--   which bypasses RLS. So enabling RLS with an admin-only policy
--   locks out anon/authenticated without breaking app functionality.

-- ── 1. Tables entirely missing from the 025/026 hardening pass ──────

-- affiliate_payouts: payout ledger for affiliates (amounts, methods, status)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'affiliate_payouts' AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admin only access" ON public.affiliate_payouts;
    CREATE POLICY "Admin only access" ON public.affiliate_payouts FOR ALL
      USING (public.is_staff()) WITH CHECK (public.is_staff());
  END IF;
END $$;

-- referral_codes: maps referral codes to customer IDs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'referral_codes' AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Admin only access" ON public.referral_codes;
    CREATE POLICY "Admin only access" ON public.referral_codes FOR ALL
      USING (public.is_staff()) WITH CHECK (public.is_staff());
  END IF;
END $$;

-- ── 2. Re-verify all tables flagged in the security report ──────────
-- This is a belt-and-suspenders check: if any of these tables somehow
-- don't have RLS enabled (partial migration, manual DDL, etc.), enable
-- it now and apply the admin-only policy.
DO $$
DECLARE
  t text;
  flagged_tables text[] := ARRAY[
    'gift_cards',
    'loyalty_transactions',
    'credit_transactions',
    'referrals',
    'inventory_sync_log',
    'inventory_adjustments',
    'pos_raw_objects',
    'pos_sync_runs',
    'printful_pricing',
    'recently_viewed'
  ];
BEGIN
  FOREACH t IN ARRAY flagged_tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      -- Ensure RLS is enabled
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

      -- Ensure the admin-only policy exists (drop + recreate is idempotent)
      EXECUTE format('DROP POLICY IF EXISTS "Admin only access" ON public.%I;', t);
      EXECUTE format(
        'CREATE POLICY "Admin only access" ON public.%I FOR ALL
           USING (public.is_staff()) WITH CHECK (public.is_staff());',
        t
      );
    END IF;
  END LOOP;
END $$;

-- ── 3. Atomic gift card redemption function ───────────────────────────
-- Race-condition-safe redemption: a single UPDATE with WHERE guard ensures
-- concurrent requests can't double-spend the same card. Returns a JSON
-- object with success/remaining_balance_cents so the API route doesn't
-- need a second SELECT.
CREATE OR REPLACE FUNCTION public.redeem_gift_card(
  p_code TEXT,
  p_amount_cents INTEGER
) RETURNS TABLE(success BOOLEAN, remaining_balance_cents INTEGER, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card RECORD;
  v_new_balance INTEGER;
BEGIN
  -- Lock the row for the duration of this transaction so concurrent
  -- redemption requests block until we commit (preventing double-spend).
  SELECT id, balance_cents, status INTO v_card
  FROM public.gift_cards
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'Invalid gift card code'::TEXT;
    RETURN;
  END IF;

  IF v_card.status != 'active' THEN
    RETURN QUERY SELECT false, 0, 'Gift card is not active'::TEXT;
    RETURN;
  END IF;

  IF v_card.balance_cents < p_amount_cents THEN
    RETURN QUERY SELECT false, v_card.balance_cents, 'Insufficient balance'::TEXT;
    RETURN;
  END IF;

  v_new_balance := v_card.balance_cents - p_amount_cents;

  UPDATE public.gift_cards
  SET balance_cents = v_new_balance,
      status = CASE WHEN v_new_balance <= 0 THEN 'redeemed' ELSE 'active' END,
      redeemed_at = CASE WHEN v_new_balance <= 0 THEN now() ELSE redeemed_at END
  WHERE id = v_card.id;

  RETURN QUERY SELECT true, v_new_balance, NULL::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_gift_card(TEXT, INTEGER) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_gift_card(TEXT, INTEGER) TO service_role;

-- ── 4. Revoke direct table grants from anon/authenticated ───────────
-- Defense-in-depth: even with RLS enabled, the anon and authenticated
-- roles still hold explicit table grants (SELECT/INSERT/UPDATE/DELETE)
-- from the initial schema. Revoking them ensures the anon key can't
-- even attempt a query — the request is rejected at the permission
-- level before RLS is evaluated. The service_role bypasses RLS entirely.
DO $$
DECLARE
  t text;
  sensitive_tables text[] := ARRAY[
    'gift_cards',
    'loyalty_transactions',
    'credit_transactions',
    'referrals',
    'affiliate_payouts',
    'referral_codes',
    'inventory_sync_log',
    'inventory_adjustments',
    'pos_raw_objects',
    'pos_sync_runs',
    'printful_pricing',
    'recently_viewed'
  ];
BEGIN
  FOREACH t IN ARRAY sensitive_tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon;', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM authenticated;', t);
    END IF;
  END LOOP;
END $$;
