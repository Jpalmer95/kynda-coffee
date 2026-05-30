-- Epic 11: fix RLS infinite recursion + centralize the admin/staff check.
--
-- PROBLEM (pre-existing, surfaced by the 025 audit): the "Owners read all
-- profiles" policy ON public.profiles does `SELECT FROM profiles` inside itself
-- → Postgres raises "infinite recursion detected in policy for relation
-- profiles". Any policy that sub-queries profiles to check a role (including the
-- 025 admin-only policies) hits the same recursion.
--
-- FIX: a SECURITY DEFINER helper that reads profiles with RLS BYPASSED (it runs
-- as the function owner), so role checks never re-enter profiles' RLS. Then
-- repoint the profiles policy and all 025 admin-only policies at the helper.

-- 1) SECURITY DEFINER role-check helper. STABLE + owned by a superuser role so it
--    bypasses RLS on profiles. Returns true for admin/owner/manager.
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'owner', 'manager')
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff() FROM public;
GRANT EXECUTE ON FUNCTION public.is_staff() TO anon, authenticated, service_role;

-- 2) Fix the recursive profiles policy: use the helper instead of a self-subquery.
DROP POLICY IF EXISTS "Owners read all profiles" ON public.profiles;
CREATE POLICY "Owners read all profiles" ON public.profiles
  FOR SELECT USING (public.is_staff());

-- 3) Repoint every 025 admin-only policy at the non-recursive helper.
DO $$
DECLARE
  t text;
  sensitive_tables text[] := ARRAY[
    'gift_cards','loyalty_transactions','credit_transactions','referrals',
    'customer_events','customer_metrics','table_orders','fulfillment_schedule',
    'subscription_shipments','inventory_adjustments','inventory_pars','inventory_sync_log',
    'printful_pricing','recently_viewed','square_inventory_snapshots','square_sync_log',
    'pos_raw_objects','pos_sync_runs','dashboard_settings'
  ];
BEGIN
  FOREACH t IN ARRAY sensitive_tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname='public' AND c.relname=t AND c.relkind='r'
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS "Admin only access" ON public.%I;', t);
      EXECUTE format(
        'CREATE POLICY "Admin only access" ON public.%I FOR ALL
           USING (public.is_staff()) WITH CHECK (public.is_staff());', t
      );
    END IF;
  END LOOP;
END $$;
