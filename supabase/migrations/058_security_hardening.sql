-- ============================================================================
-- 058_security_hardening.sql
-- Comprehensive database security hardening (2026-11-23 audit)
--
-- Fixes:
--   1. CRITICAL: Block self-promotion to owner/admin & loyalty tampering via
--      profiles UPDATE RLS (BEFORE UPDATE trigger guarding privileged columns).
--   2. CRITICAL: Reject non-positive p_amount_cents in redeem_gift_card() so
--      negative amounts cannot mint unlimited gift card balance.
--   3. CRITICAL: Revoke direct SELECT on device_authorizations from non-service
--      roles (prevents manager-to-owner escalation via plaintext approval_code).
--   4. HIGH: Close reviews UPDATE moderation bypass (WITH CHECK enforces
--      is_approved = false AND is_verified_purchase = false).
--   5. HIGH: Replace overly broad `auth.role() = 'authenticated'` RLS policies
--      on internal team tables & storage buckets (040, 041, 042, 017, 050)
--      with `public.is_team_member()` / `public.is_staff()`.
--   6. MEDIUM: Split schedule_requests UPDATE policy so staff cannot self-approve.
--   7. MEDIUM: Harden SECURITY DEFINER RPCs (get_or_create_monthly_credits,
--      update_module_progress, check_course_completion) with auth.uid() checks
--      and explicit search_path + REVOKE FROM PUBLIC.
--   8. HIGH: Add stripe_webhook_events table for idempotent webhook processing.
-- ============================================================================

BEGIN;

-- ── 1. Prevent privilege escalation & loyalty tampering on public.profiles ──
CREATE OR REPLACE FUNCTION public.guard_profiles_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-role (server API routes) and SQL migrations may update any column.
  IF auth.role() = 'service_role' OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Forbidden: role cannot be modified directly' USING ERRCODE = '42501';
  END IF;

  IF NEW.loyalty_points IS DISTINCT FROM OLD.loyalty_points THEN
    RAISE EXCEPTION 'Forbidden: loyalty_points cannot be modified directly' USING ERRCODE = '42501';
  END IF;

  IF NEW.loyalty_tier IS DISTINCT FROM OLD.loyalty_tier THEN
    RAISE EXCEPTION 'Forbidden: loyalty_tier cannot be modified directly' USING ERRCODE = '42501';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Forbidden: email cannot be modified directly' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_profiles_privileged_columns ON public.profiles;
CREATE TRIGGER trg_guard_profiles_privileged_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profiles_privileged_columns();

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── 2. Reject non-positive amounts in public.redeem_gift_card ──
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
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RETURN QUERY SELECT false, 0, 'Amount must be a positive integer'::TEXT;
    RETURN;
  END IF;

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

-- ── 3. Lock down device_authorizations (service_role only) ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'device_authorizations' AND c.relkind = 'r'
  ) THEN
    DROP POLICY IF EXISTS device_auth_staff_read ON public.device_authorizations;
    REVOKE ALL ON public.device_authorizations FROM anon;
    REVOKE ALL ON public.device_authorizations FROM authenticated;
  END IF;
END $$;

-- ── 4. Close reviews UPDATE moderation bypass ──
DROP POLICY IF EXISTS "Users update own reviews" ON public.reviews;
CREATE POLICY "Users update own reviews" ON public.reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND is_approved = false
    AND is_verified_purchase = false
  );

-- ── 5. Tighten internal staff tables (040, 041, 042) from `authenticated` → `is_team_member()` ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_counts') THEN
    DROP POLICY IF EXISTS "inventory_counts_staff_read" ON public.inventory_counts;
    CREATE POLICY "inventory_counts_staff_read" ON public.inventory_counts
      FOR SELECT USING (public.is_team_member());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'inventory_count_items') THEN
    DROP POLICY IF EXISTS "inventory_count_items_staff_read" ON public.inventory_count_items;
    CREATE POLICY "inventory_count_items_staff_read" ON public.inventory_count_items
      FOR SELECT USING (public.is_team_member());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'waste_log') THEN
    DROP POLICY IF EXISTS "waste_log_staff_read" ON public.waste_log;
    CREATE POLICY "waste_log_staff_read" ON public.waste_log
      FOR SELECT USING (public.is_team_member());

    DROP POLICY IF EXISTS "waste_log_staff_insert" ON public.waste_log;
    CREATE POLICY "waste_log_staff_insert" ON public.waste_log
      FOR INSERT WITH CHECK (public.is_team_member() AND auth.uid() = logged_by);

    DROP POLICY IF EXISTS "waste_log_staff_update_own" ON public.waste_log;
    CREATE POLICY "waste_log_staff_update_own" ON public.waste_log
      FOR UPDATE
      USING (public.is_team_member() AND auth.uid() = logged_by AND logged_at > NOW() - INTERVAL '24 hours')
      WITH CHECK (public.is_team_member() AND auth.uid() = logged_by);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_channels') THEN
    DROP POLICY IF EXISTS "chat_channels_staff_read" ON public.chat_channels;
    CREATE POLICY "chat_channels_staff_read" ON public.chat_channels
      FOR SELECT USING (public.is_team_member());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_channel_members') THEN
    DROP POLICY IF EXISTS "chat_members_staff_read" ON public.chat_channel_members;
    CREATE POLICY "chat_members_staff_read" ON public.chat_channel_members
      FOR SELECT USING (public.is_team_member());
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages') THEN
    DROP POLICY IF EXISTS "chat_messages_staff_read" ON public.chat_messages;
    CREATE POLICY "chat_messages_staff_read" ON public.chat_messages
      FOR SELECT USING (public.is_team_member());

    DROP POLICY IF EXISTS "chat_messages_staff_insert" ON public.chat_messages;
    CREATE POLICY "chat_messages_staff_insert" ON public.chat_messages
      FOR INSERT WITH CHECK (public.is_team_member() AND auth.uid() = user_id);
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'team_uploads') THEN
    DROP POLICY IF EXISTS "team_uploads_staff_read" ON public.team_uploads;
    CREATE POLICY "team_uploads_staff_read" ON public.team_uploads
      FOR SELECT USING (public.is_team_member());

    DROP POLICY IF EXISTS "team_uploads_staff_insert" ON public.team_uploads;
    CREATE POLICY "team_uploads_staff_insert" ON public.team_uploads
      FOR INSERT WITH CHECK (public.is_team_member() AND auth.uid() = uploaded_by AND status = 'pending');

    DROP POLICY IF EXISTS "team_uploads_staff_update_own" ON public.team_uploads;
    CREATE POLICY "team_uploads_staff_update_own" ON public.team_uploads
      FOR UPDATE
      USING (public.is_team_member() AND auth.uid() = uploaded_by AND status = 'pending')
      WITH CHECK (public.is_team_member() AND auth.uid() = uploaded_by AND status = 'pending');
  END IF;
END $$;

-- ── 5b. Tighten Storage bucket RLS policies (mockups + onboarding) ──
DROP POLICY IF EXISTS "Admins can upload mockups" ON storage.objects;
CREATE POLICY "Admins can upload mockups"
  ON storage.objects FOR INSERT
  TO authenticated, service_role
  WITH CHECK (bucket_id = 'mockups' AND (auth.role() = 'service_role' OR public.is_staff()));

DROP POLICY IF EXISTS "Admins can update mockups" ON storage.objects;
CREATE POLICY "Admins can update mockups"
  ON storage.objects FOR UPDATE
  TO authenticated, service_role
  USING (bucket_id = 'mockups' AND (auth.role() = 'service_role' OR public.is_staff()));

DROP POLICY IF EXISTS "Admins can delete mockups" ON storage.objects;
CREATE POLICY "Admins can delete mockups"
  ON storage.objects FOR DELETE
  TO authenticated, service_role
  USING (bucket_id = 'mockups' AND (auth.role() = 'service_role' OR public.is_staff()));

DROP POLICY IF EXISTS "onboarding read auth" ON storage.objects;
CREATE POLICY "onboarding read auth"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'onboarding' AND public.is_team_member());

DROP POLICY IF EXISTS "onboarding write admin" ON storage.objects;
CREATE POLICY "onboarding write admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'onboarding' AND public.is_staff());

-- ── 6. Prevent staff from self-approving schedule_requests ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schedule_requests') THEN
    DROP POLICY IF EXISTS "Managers review requests" ON public.schedule_requests;
    CREATE POLICY "Managers review requests" ON public.schedule_requests
      FOR UPDATE
      USING (public.is_staff())
      WITH CHECK (public.is_staff());

    DROP POLICY IF EXISTS "Staff cancel own pending requests" ON public.schedule_requests;
    CREATE POLICY "Staff cancel own pending requests" ON public.schedule_requests
      FOR UPDATE
      USING (public.is_team_member() AND user_id = auth.uid() AND status = 'pending')
      WITH CHECK (public.is_team_member() AND user_id = auth.uid() AND status = 'cancelled');
  END IF;
END $$;

-- ── 7. Harden SECURITY DEFINER RPCs with auth.uid() checks & search_path ──
CREATE OR REPLACE FUNCTION public.get_or_create_monthly_credits(p_user_id uuid)
RETURNS public.user_monthly_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ym text := to_char(now(), 'YYYY-MM');
  rec public.user_monthly_credits;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_monthly_credits (user_id, year_month, free_credits_remaining)
  VALUES (p_user_id, ym, 10)
  ON CONFLICT (user_id, year_month) DO NOTHING;

  SELECT * INTO rec
  FROM public.user_monthly_credits
  WHERE user_id = p_user_id AND year_month = ym;

  RETURN rec;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_monthly_credits(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_monthly_credits(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.update_module_progress(p_user_id UUID, p_module_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  total_lessons INT;
  completed_lessons INT;
  total_quizzes INT;
  passed_quizzes INT;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COUNT(*) INTO total_lessons FROM lessons WHERE module_id = p_module_id;
  SELECT COUNT(*) INTO completed_lessons FROM lesson_progress
  WHERE user_id = p_user_id AND lesson_id IN (SELECT id FROM lessons WHERE module_id = p_module_id) AND completed = true;

  SELECT COUNT(*) INTO total_quizzes FROM quizzes WHERE module_id = p_module_id;
  SELECT COUNT(DISTINCT quiz_id) INTO passed_quizzes FROM quiz_attempts
  WHERE user_id = p_user_id AND is_correct = true AND quiz_id IN (SELECT id FROM quizzes WHERE module_id = p_module_id);

  INSERT INTO module_progress (user_id, module_id, lessons_completed, total_lessons, quizzes_passed, total_quizzes, is_complete, completed_at, updated_at)
  VALUES (
    p_user_id, p_module_id,
    completed_lessons, total_lessons,
    passed_quizzes, total_quizzes,
    (completed_lessons >= total_lessons AND (total_quizzes = 0 OR passed_quizzes >= total_quizzes)),
    CASE WHEN (completed_lessons >= total_lessons AND (total_quizzes = 0 OR passed_quizzes >= total_quizzes)) THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (user_id, module_id) DO UPDATE SET
    lessons_completed = EXCLUDED.lessons_completed,
    total_lessons = EXCLUDED.total_lessons,
    quizzes_passed = EXCLUDED.quizzes_passed,
    total_quizzes = EXCLUDED.total_quizzes,
    is_complete = EXCLUDED.is_complete,
    completed_at = EXCLUDED.completed_at,
    updated_at = now();
END;
$func$;

REVOKE ALL ON FUNCTION public.update_module_progress(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_module_progress(UUID, UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.check_course_completion(p_user_id UUID, p_course_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  total_required INT;
  completed_required INT;
  already_complete BOOLEAN;
BEGIN
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT EXISTS(SELECT 1 FROM course_completions WHERE user_id = p_user_id AND course_id = p_course_id) INTO already_complete;
  IF already_complete THEN RETURN true; END IF;

  SELECT COUNT(*) INTO total_required FROM modules WHERE course_id = p_course_id AND is_required = true;
  SELECT COUNT(*) INTO completed_required FROM module_progress mp
  JOIN modules m ON m.id = mp.module_id
  WHERE mp.user_id = p_user_id AND m.course_id = p_course_id AND m.is_required = true AND mp.is_complete = true;

  IF total_required > 0 AND completed_required >= total_required THEN
    INSERT INTO course_completions (user_id, course_id) VALUES (p_user_id, p_course_id)
    ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;

  RETURN false;
END;
$func$;

REVOKE ALL ON FUNCTION public.check_course_completion(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_course_completion(UUID, UUID) TO authenticated, service_role;

-- ── 8. Stripe webhook event idempotency ledger ──
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stripe_webhook_events FROM anon;
REVOKE ALL ON public.stripe_webhook_events FROM authenticated;

COMMIT;
