-- Storage bucket for marketing images (Phase 5.2)
-- Stores original uploads + processed platform variants

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketing-images',
  'marketing-images',
  true,
  10485760, -- 10MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: admins can manage all; staff can read all
CREATE POLICY "Admins can upload marketing images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'marketing-images'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Staff can read marketing images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'marketing-images'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'employee'))
  );

CREATE POLICY "Admins can delete marketing images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'marketing-images'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can update marketing images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'marketing-images'
    AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );
