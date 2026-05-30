-- Epic 4: New-Employee Onboarding Hub.
--
-- One place that holds the blank forms and materials a new hire needs (I-9, W-4,
-- employee handbook, training packet, checklists), plus a per-new-hire onboarding
-- tracker so the owner/manager can see who has what done. Files live in the
-- 'onboarding' Supabase Storage bucket; this table stores the catalog + metadata.

-- ---------------------------------------------------------------------------
-- Document library (admin-managed): the canonical set of onboarding materials.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  -- logical grouping for the UI
  category TEXT NOT NULL DEFAULT 'forms'
    CHECK (category IN ('forms', 'handbook', 'training', 'checklist', 'policy', 'other')),
  -- where the file lives. Either a Storage path in the 'onboarding' bucket OR an
  -- external URL (e.g. official IRS/USCIS source for always-current blank forms).
  storage_path TEXT,
  external_url TEXT,
  file_type TEXT,                  -- 'pdf' | 'docx' | 'link' etc. (display hint)
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- at least one source must be present
  CHECK (storage_path IS NOT NULL OR external_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_documents_active
  ON public.onboarding_documents (is_active, category, sort_order);

-- ---------------------------------------------------------------------------
-- Per-new-hire onboarding tracker: one row per (hire, task), so the manager can
-- expedite + audit onboarding. Tasks can be free-form or reference a document.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- the new hire (nullable until they have an auth account; email always present)
  hire_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hire_email TEXT NOT NULL,
  hire_name TEXT,
  task_key TEXT NOT NULL,          -- e.g. 'i9', 'w4', 'handbook_ack', 'training_complete'
  task_label TEXT NOT NULL,
  document_id UUID REFERENCES public.onboarding_documents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'complete', 'na')),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hire_email, task_key)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_hire
  ON public.onboarding_progress (hire_email, status);

-- ---------------------------------------------------------------------------
-- RLS: documents readable by staff/admin, writable by admin. Progress readable
-- by the hire (own) + admin, writable by admin (managers run onboarding).
-- ---------------------------------------------------------------------------
ALTER TABLE public.onboarding_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read onboarding documents" ON public.onboarding_documents;
CREATE POLICY "Staff can read onboarding documents"
  ON public.onboarding_documents FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'employee')
    )
  );

DROP POLICY IF EXISTS "Admin manages onboarding documents" ON public.onboarding_documents;
CREATE POLICY "Admin manages onboarding documents"
  ON public.onboarding_documents FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Hire or admin reads onboarding progress" ON public.onboarding_progress;
CREATE POLICY "Hire or admin reads onboarding progress"
  ON public.onboarding_progress FOR SELECT
  USING (
    hire_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

DROP POLICY IF EXISTS "Admin manages onboarding progress" ON public.onboarding_progress;
CREATE POLICY "Admin manages onboarding progress"
  ON public.onboarding_progress FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Writes from the platform use the service role and bypass RLS, but these
-- policies keep direct client access safe.

-- ---------------------------------------------------------------------------
-- Seed the standard onboarding document set. Federal forms link to the official
-- always-current sources so we never ship a stale blank form. Internal docs
-- (handbook, training packet, checklist) point at Storage paths the admin fills.
-- ---------------------------------------------------------------------------
INSERT INTO public.onboarding_documents (title, description, category, external_url, storage_path, file_type, is_required, sort_order)
VALUES
  ('Form I-9 (Employment Eligibility Verification)',
   'Official USCIS Form I-9. Every new hire must complete Section 1 by their first day.',
   'forms', 'https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf', NULL, 'pdf', true, 1),
  ('Form W-4 (Employee''s Withholding Certificate)',
   'Official IRS Form W-4 for federal tax withholding.',
   'forms', 'https://www.irs.gov/pub/irs-pdf/fw4.pdf', NULL, 'pdf', true, 2),
  ('Texas New Hire Reporting',
   'Texas new-hire reporting information (employer-submitted).',
   'forms', 'https://portal.cs.oag.state.tx.us/wps/portal/employer', NULL, 'link', false, 3),
  ('Kynda Coffee Employee Handbook',
   'Policies, procedures, culture, and expectations. Acknowledge after reading.',
   'handbook', NULL, 'onboarding/handbook.pdf', 'pdf', true, 4),
  ('Specialty Coffee Training Packet',
   'Printable companion to the online Barista & Baker Academy.',
   'training', NULL, 'onboarding/training-packet.pdf', 'pdf', true, 5),
  ('New Hire Onboarding Checklist',
   'Step-by-step checklist for a new employee''s first two weeks.',
   'checklist', NULL, 'onboarding/onboarding-checklist.pdf', 'pdf', true, 6)
ON CONFLICT DO NOTHING;
