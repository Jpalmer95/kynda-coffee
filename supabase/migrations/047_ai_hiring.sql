-- 047_ai_hiring.sql
-- Phase 5 (MASTER_PLAN): extend job_applications for AI hiring portal.
-- Adds resume storage, availability, start date, bio, AI scoring, interview fields.

ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS resume_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS availability TEXT,
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS ai_score INTEGER,
  ADD COLUMN IF NOT EXISTS ai_rank INTEGER,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_suggested_questions TEXT[],
  ADD COLUMN IF NOT EXISTS interview_status TEXT DEFAULT 'none'
    CHECK (interview_status IN ('none', 'scheduled', 'completed', 'skipped')),
  ADD COLUMN IF NOT EXISTS interview_notes TEXT;

-- Create resumes storage bucket (private — uploads via service role API)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', false)
ON CONFLICT (id) DO NOTHING;

-- Index for AI ranking queries
CREATE INDEX IF NOT EXISTS idx_job_applications_ai_score
  ON public.job_applications (ai_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_job_applications_status_created
  ON public.job_applications (status, created_at DESC);
