-- ============================================================
-- Square Image Cache — durable image hosting
-- ============================================================
--
-- Square returns signed image URLs that expire within ~24 hours.
-- The application caches each image in this Supabase Storage
-- bucket keyed by Square image ID, so menu/shop images never rot.
--
-- The application code also calls `ensureImageBucket()` at runtime
-- to idempotently create the bucket if this migration was never
-- run manually — belt and suspenders.
-- ============================================================

-- Create the bucket if it doesn't already exist.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'square-images',
  'square-images',
  true,
  10485760, -- 10 MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow unauthenticated public READ only (menu images are public).
DROP POLICY IF EXISTS "square-images public read" ON storage.objects;
CREATE POLICY "square-images public read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'square-images');

-- Only the service role should write — enforce via INSERT with service_role
-- check. The application uses supabaseAdmin() which bypasses RLS anyway.
DROP POLICY IF EXISTS "square-images service write" ON storage.objects;
CREATE POLICY "square-images service write"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'square-images' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'square-images' AND auth.role() = 'service_role');
