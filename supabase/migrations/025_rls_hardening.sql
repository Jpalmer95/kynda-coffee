-- Epic 11: RLS hardening — close anon/authenticated exposure on sensitive tables.
--
-- AUDIT FINDING (verified against production via pg_policies + role grants):
-- the following tables had RLS DISABLED while the `anon` role (the public
-- publishable key shipped to every browser) held full SELECT/INSERT/UPDATE/DELETE.
-- That exposed gift-card codes/balances, loyalty/credit/referral financial
-- records, customer PII/behavior, order/fulfillment data, and internal
-- inventory + Printful COGS/margin data to anyone with the public key.
--
-- VERIFIED SAFE: every application access to these tables goes through server
-- routes using the service-role client (supabaseAdmin), which BYPASSES RLS.
-- So enabling RLS with an admin-only policy locks out anon/authenticated without
-- breaking any app functionality.
--
-- Pattern per table: enable RLS + one admin-only ALL policy. Service role still
-- bypasses RLS, so server routes keep working; anon/authenticated get nothing.

DO $$
DECLARE
  t text;
  sensitive_tables text[] := ARRAY[
    'gift_cards',
    'loyalty_transactions',
    'credit_transactions',
    'referrals',
    'customer_events',
    'customer_metrics',
    'table_orders',
    'fulfillment_schedule',
    'subscription_shipments',
    'inventory_adjustments',
    'inventory_pars',
    'inventory_sync_log',
    'printful_pricing',
    'recently_viewed',
    'square_inventory_snapshots',
    'square_sync_log',
    'pos_raw_objects',
    'pos_sync_runs',
    'dashboard_settings'
  ];
BEGIN
  FOREACH t IN ARRAY sensitive_tables LOOP
    -- Only act on tables that actually exist (defensive across environments).
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS "Admin only access" ON public.%I;', t);
      EXECUTE format(
        'CREATE POLICY "Admin only access" ON public.%I FOR ALL
           USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN (''admin'',''owner'',''manager'')))
           WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN (''admin'',''owner'',''manager'')));',
        t
      );
    END IF;
  END LOOP;
END $$;

-- Note on `recently_viewed`: it's currently server-written. If a future
-- client-side "recently viewed" feature needs per-user reads, add a narrower
-- policy keyed on auth.uid() = user_id rather than loosening this one.
