-- Migration: Create contact_submissions table for General Contact & Job Applications
CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'general',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Turn on row level security
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all
CREATE POLICY "Admins can view contact submissions" ON public.contact_submissions
    FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- Allow anon to only insert (submission via API route bypasses this with service_role)
CREATE POLICY "Anyone can insert contact submissions" ON public.contact_submissions
    FOR INSERT WITH CHECK (true);
