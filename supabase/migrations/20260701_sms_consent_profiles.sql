-- ============================================================
-- SMS consent tracking for A2P 10DLC compliance
-- ============================================================

-- Add sms_opt_in column to profiles (source of truth for logged-in users)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN NOT NULL DEFAULT false;

-- Add sms_opt_in_at to track when consent was given (compliance audit trail)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sms_opt_in_at TIMESTAMPTZ;

-- Add sms_opt_out_at to track when consent was revoked (via STOP or settings)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sms_opt_out_at TIMESTAMPTZ;

-- Add a phone column to profiles if it doesn't exist (some migrations added it, some didn't)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- RLS: users can read their own sms consent status (already covered by
-- "Users read own profile" policy from migration 005, but ensure it exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Users read own profile'
  ) THEN
    CREATE POLICY "Users read own profile" ON profiles
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

-- Service role (supabaseAdmin) bypasses RLS for writes from API routes.
