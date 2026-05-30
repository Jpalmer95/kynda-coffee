-- Phase 7.1: Careers — job openings + applications
-- Stores posted positions and applicant submissions

-- Job openings (admin-managed)
CREATE TABLE IF NOT EXISTS job_openings (
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

-- Job applications
CREATE TABLE IF NOT EXISTS job_applications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opening_id   uuid REFERENCES job_openings(id) ON DELETE SET NULL,
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

-- RLS: openings are public-read but admin-only write
ALTER TABLE job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can read active openings
DROP POLICY IF EXISTS openings_read_public ON job_openings;
CREATE POLICY openings_read_public ON job_openings FOR SELECT USING (is_active = true);

-- Only authenticated admins can manage openings
DROP POLICY IF EXISTS openings_admin ON job_openings;
CREATE POLICY openings_admin ON job_openings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'employee')
  ));

-- Only authenticated admins can read applications
DROP POLICY IF EXISTS applications_admin ON job_applications;
CREATE POLICY applications_admin ON job_applications FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin', 'employee')
  ));

-- Allow public inserts for applications (anonymous job seekers)
DROP POLICY IF EXISTS applications_insert_public ON job_applications;
CREATE POLICY applications_insert_public ON job_applications FOR INSERT WITH CHECK (true);

-- Seed some openings
INSERT INTO job_openings (title, slug, department, type, description, requirements, compensation) VALUES
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_openings_active ON job_openings(is_active);
CREATE INDEX IF NOT EXISTS idx_job_applications_opening ON job_applications(opening_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created ON job_applications(created_at DESC);
