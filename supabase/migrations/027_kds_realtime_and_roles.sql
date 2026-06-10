-- 027: KDS realtime + barista access (2026-06-10)
--
-- WHY: Baristas (role staff/employee/team) could not see incoming online
-- orders — the KDS API was gated on the ADMIN_EMAILS allowlist and the only
-- orders SELECT policy is "Users read own orders" (email match). This
-- migration gives every team member read access to orders (so the KDS works
-- for the whole team over Supabase Realtime, which respects RLS) and adds the
-- orders table to the realtime publication.
--
-- Tiers (canonical): owner > manager > staff > customer.
-- public.is_staff()        = manager+ (admin/owner/manager)   — unchanged (026)
-- public.is_team_member()  = staff+   (any team role)         — NEW

-- 1) Widen the profiles.role CHECK so canonical 'staff' and legacy values all fit.
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('customer','staff','employee','team','barista','lead','team_lead','manager','owner','admin'));
EXCEPTION WHEN others THEN
  RAISE NOTICE 'profiles_role_check rewrite skipped: %', SQLERRM;
END $$;

-- 2) Team-member check (any staff tier). SECURITY DEFINER bypasses profiles RLS
--    (same pattern as is_staff(), migration 026) so it never recurses.
CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin','owner','manager','staff','employee','team','barista','lead','team_lead')
  );
$$;

REVOKE ALL ON FUNCTION public.is_team_member() FROM public;
GRANT EXECUTE ON FUNCTION public.is_team_member() TO anon, authenticated, service_role;

-- 3) Team members can read orders (KDS feed + realtime delivery).
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team reads orders" ON public.orders;
CREATE POLICY "Team reads orders" ON public.orders
  FOR SELECT USING (public.is_team_member());

-- 4) Realtime: publish orders changes (INSERT/UPDATE) for the KDS live feed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'realtime publication add skipped: %', SQLERRM;
END $$;

-- 5) Realtime needs full row images for UPDATE events with RLS.
ALTER TABLE public.orders REPLICA IDENTITY FULL;
