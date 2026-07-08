-- 042_team_media_upload.sql
-- Team media upload: any team member uploads photos/videos → curation queue
-- → approved items flow into marketing image library.
-- Reuses existing marketing-images and marketing-videos storage buckets.

CREATE TABLE IF NOT EXISTS public.team_uploads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,           -- e.g., 'marketing-images/team/2026-07-06/uuid.jpg'
  public_url TEXT NOT NULL,             -- full public URL
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  file_name TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',    -- 'product', 'event', 'shop', 'food', 'drink', 'team'
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_uploads_status ON public.team_uploads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_uploads_uploader ON public.team_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_team_uploads_tags ON public.team_uploads USING GIN(tags);

ALTER TABLE public.team_uploads ENABLE ROW LEVEL SECURITY;

-- Service role full access (admin API uses supabaseAdmin)
CREATE POLICY "team_uploads_service_all" ON public.team_uploads
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Staff can read all uploads, insert their own
CREATE POLICY "team_uploads_staff_read" ON public.team_uploads
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "team_uploads_staff_insert" ON public.team_uploads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = uploaded_by);

-- Staff can update their own pending uploads
CREATE POLICY "team_uploads_staff_update_own" ON public.team_uploads
  FOR UPDATE USING (auth.uid() = uploaded_by AND status = 'pending');
