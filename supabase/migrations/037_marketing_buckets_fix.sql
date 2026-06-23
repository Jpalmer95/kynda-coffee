-- Fix marketing storage buckets: create marketing-videos bucket and
-- update RLS policies to use normalized role tiers (owner/manager/staff)
-- instead of raw 'admin'/'employee' strings.

-- ── marketing-images bucket (ensure it exists) ──────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-images',
  'marketing-images',
  true,
  10485760, -- 10MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ── marketing-videos bucket ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-videos',
  'marketing-videos',
  true,
  104857600, -- 100MB max
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- ── Drop old RLS policies (raw role strings) ────────────────────────────
DROP POLICY IF EXISTS "Admins can upload marketing images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can read marketing images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete marketing images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update marketing images" ON storage.objects;

-- ── New RLS policies: staff+ can manage marketing images ────────────────
CREATE POLICY "Staff can upload marketing images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'marketing-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin', 'manager', 'staff', 'employee', 'team', 'barista')
    )
  );

CREATE POLICY "Staff can read marketing images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'marketing-images'
  );

CREATE POLICY "Staff can delete marketing images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'marketing-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin', 'manager', 'staff', 'employee', 'team', 'barista')
    )
  );

CREATE POLICY "Staff can update marketing images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'marketing-images'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin', 'manager', 'staff', 'employee', 'team', 'barista')
    )
  );

-- ── RLS policies: marketing-videos ──────────────────────────────────────
CREATE POLICY "Staff can upload marketing videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'marketing-videos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin', 'manager', 'staff', 'employee', 'team', 'barista')
    )
  );

CREATE POLICY "Staff can read marketing videos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'marketing-videos'
  );

CREATE POLICY "Staff can delete marketing videos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'marketing-videos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin', 'manager', 'staff', 'employee', 'team', 'barista')
    )
  );

CREATE POLICY "Staff can update marketing videos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'marketing-videos'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('owner', 'admin', 'manager', 'staff', 'employee', 'team', 'barista')
    )
  );
