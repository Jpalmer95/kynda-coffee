-- ============================================================
-- 050_onboarding_storage_bucket.sql
-- Creates the 'onboarding' Storage bucket for onboarding documents
-- (handbook, i-9, w-4, training packet PDFs) that admins upload and
-- link from onboarding_documents.storage_path.
-- Idempotent: safe to re-run.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'onboarding'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('onboarding', 'onboarding', false);
  END IF;
END $$;

-- Allow authenticated staff to read onboarding files, admins to write.
-- (Mirrors the RLS posture of the team-chat / resumes buckets.)
DO $$
BEGIN
  -- Read for any authenticated user
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='onboarding read auth'
  ) THEN
    CREATE POLICY "onboarding read auth"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'onboarding' AND auth.role() = 'authenticated');
  END IF;

  -- Write for admins (service role already bypasses)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='onboarding write admin'
  ) THEN
    CREATE POLICY "onboarding write admin"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'onboarding'
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
      );
  END IF;
END $$;
