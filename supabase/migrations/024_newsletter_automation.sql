-- Epic 5: Newsletter automation (Roadmap V2).
--
-- (a) Give each subscriber a stable unsubscribe_token so emails can include a
--     one-click unsubscribe link (CAN-SPAM compliance) without exposing the row id.
-- (b) A `newsletters` table for owner-curated / agent-drafted campaigns that go
--     through the SAME approval discipline as social posts: nothing sends without
--     an explicit approved state, and we record who/when. The send step is driven
--     by a cron that only touches `approved` rows, flips to `sending`, then `sent`.

-- ── (a) Subscriber unsubscribe tokens ────────────────────────────────────────
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();

-- Backfill any existing NULLs (defensive — DEFAULT covers new rows).
UPDATE public.newsletter_subscribers
  SET unsubscribe_token = gen_random_uuid()
  WHERE unsubscribe_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_newsletter_subscribers_unsub_token
  ON public.newsletter_subscribers (unsubscribe_token);

-- ── (b) Newsletter campaigns ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.newsletters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  preheader TEXT,                       -- inbox preview text
  body_html TEXT NOT NULL,              -- rendered HTML (built from specials or written)
  -- lifecycle: draft -> pending_approval -> approved -> sending -> sent | failed | canceled
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_approval','approved','sending','sent','failed','canceled')),
  source TEXT NOT NULL DEFAULT 'manual'  -- manual | agent | special
    CHECK (source IN ('manual','agent','special')),
  -- audience segment: all subscribed, or a named segment (future-proofing)
  segment TEXT NOT NULL DEFAULT 'all',
  special_id UUID REFERENCES public.specials(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,             -- when approved, the cron sends at/after this
  -- approval audit
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  -- send results
  sent_at TIMESTAMPTZ,
  recipients_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletters_status_sched
  ON public.newsletters (status, scheduled_at);

ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

-- Admins manage newsletters (service role bypasses RLS; this guards any
-- anon/auth client access).
DROP POLICY IF EXISTS "Admins manage newsletters" ON public.newsletters;
CREATE POLICY "Admins manage newsletters"
  ON public.newsletters FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','owner','manager'))
  );
