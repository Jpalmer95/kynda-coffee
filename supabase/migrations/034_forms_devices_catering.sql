-- 034: Fix public form storage + device authorization for KDS tablets.
--
-- WHY: contact_submissions (010) and careers tables (20260529) were never
-- applied to prod — every contact / job application / catering submission was
-- 500ing. catering_requests never had a migration at all. This migration is a
-- consolidated, idempotent re-statement that also fixes the careers RLS
-- policies (they referenced profiles.user_id, which doesn't exist — the
-- column is profiles.id) by using the non-recursive public.is_staff() helper
-- from 026.
--
-- Also adds device_authorizations: owner-approved sign-in for shared café
-- tablets (KDS) that can't receive the magic-link email.

-- ---------------------------------------------------------------------------
-- 1) Contact form submissions (re-statement of 010, idempotent)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view contact submissions" ON public.contact_submissions;
CREATE POLICY "Admins can view contact submissions" ON public.contact_submissions
    FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS "Anyone can insert contact submissions" ON public.contact_submissions;
CREATE POLICY "Anyone can insert contact submissions" ON public.contact_submissions
    FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_status
    ON public.contact_submissions(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2) Careers: job openings + applications (re-statement of 20260529 with
--    FIXED policies — original used profiles.user_id which doesn't exist)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_openings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  slug        text NOT NULL UNIQUE,
  department  text NOT NULL DEFAULT 'General',
  location    text NOT NULL DEFAULT 'Horseshoe Bay, TX',
  type        text NOT NULL DEFAULT 'Full-time' CHECK (type IN ('Full-time', 'Part-time', 'Seasonal', 'Contract')),
  description text NOT NULL,
  requirements text[] NOT NULL DEFAULT '{}',
  compensation text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_applications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_id   uuid REFERENCES public.job_openings(id) ON DELETE SET NULL,
  opening_title text NOT NULL,
  name         text NOT NULL,
  email        text NOT NULL,
  phone        text,
  cover_letter text,
  resume_url   text,
  status       text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'interview', 'hired', 'rejected')),
  admin_notes  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS openings_read_public ON public.job_openings;
CREATE POLICY openings_read_public ON public.job_openings FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS openings_admin ON public.job_openings;
CREATE POLICY openings_admin ON public.job_openings FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS applications_admin ON public.job_applications;
CREATE POLICY applications_admin ON public.job_applications FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Anonymous job seekers can submit applications.
DROP POLICY IF EXISTS applications_insert_public ON public.job_applications;
CREATE POLICY applications_insert_public ON public.job_applications FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_job_openings_active ON public.job_openings(is_active);
CREATE INDEX IF NOT EXISTS idx_job_applications_opening ON public.job_applications(opening_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON public.job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created ON public.job_applications(created_at DESC);

-- Seed the openings (same as 20260529)
INSERT INTO public.job_openings (title, slug, department, type, description, requirements, compensation) VALUES
(
  'Barista',
  'barista',
  'Café Operations',
  'Part-time',
  'We are looking for passionate baristas who love craft coffee and connecting with our community. You will prepare specialty drinks, maintain our workspace, and deliver the Kynda experience to every guest.',
  ARRAY['Experience with espresso machines preferred', 'Friendly and reliable', 'Available weekends and early mornings', 'Food handler certification a plus'],
  '$12–$15/hr + tips'
),
(
  'Shift Lead',
  'shift-lead',
  'Café Operations',
  'Full-time',
  'Lead a team of baristas during peak hours, manage inventory, train new hires, and ensure every shift runs smoothly. Ideal for someone who thrives under pressure and loves mentoring.',
  ARRAY['1+ year café or food service experience', 'Leadership or supervisory experience', 'Strong communication skills', 'Available full-time including weekends'],
  '$16–$19/hr + tips'
),
(
  'Social Media & Marketing Coordinator',
  'marketing-coordinator',
  'Marketing',
  'Part-time',
  'Help tell the Kynda story online. Create content for Instagram, TikTok, and our blog. Photograph new drinks and events. Collaborate on seasonal campaigns.',
  ARRAY['Experience with social media management', 'Photography and video skills', 'Strong writing voice', 'Familiarity with Canva or similar tools'],
  '$15–$20/hr'
)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3) Catering quote requests (table never existed — /api/catering 500'd)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.catering_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  event_date DATE,
  guest_count INTEGER,
  details TEXT NOT NULL DEFAULT '',
  -- Same triage vocabulary as contact_submissions so the admin inbox can
  -- manage both ('pending' kept for backward compat with older client code).
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'read', 'replied', 'archived', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.catering_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catering_admin_read ON public.catering_requests;
CREATE POLICY catering_admin_read ON public.catering_requests
  FOR SELECT USING (public.is_staff());

DROP POLICY IF EXISTS catering_insert_public ON public.catering_requests;
CREATE POLICY catering_insert_public ON public.catering_requests
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_catering_requests_status
  ON public.catering_requests(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4) Device authorizations — owner-approved sign-in for shared café tablets.
--    All reads/writes go through service-role API routes; RLS locks the
--    table to staff-read only (no public policies on purpose).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.device_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_name TEXT NOT NULL,
  requested_email TEXT NOT NULL,
  -- 6-digit approval code, texted/emailed to the owner. Knowing the code IS
  -- the approval credential, so it never leaves the server except via SMS.
  approval_code TEXT NOT NULL,
  -- random secret held by the requesting device (localStorage) to poll with
  device_secret TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'consumed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.device_authorizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS device_auth_staff_read ON public.device_authorizations;
CREATE POLICY device_auth_staff_read ON public.device_authorizations
  FOR SELECT USING (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_device_auth_status
  ON public.device_authorizations(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- 5) The shared café account runs the KDS: give it staff tier.
--    (It was 'customer', which is why the tablets were locked out even with
--    a valid session.)
-- ---------------------------------------------------------------------------
UPDATE public.profiles SET role = 'staff'
WHERE email = 'kyndacoffee@gmail.com' AND role = 'customer';
