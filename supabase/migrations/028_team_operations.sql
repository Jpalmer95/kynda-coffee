-- 028: Team operations — real scheduling, schedule requests, team chat, par counts
-- (2026-06-10, owner ask: staff scheduling + requests, shared team chat,
--  inventory par counting fields for staff, leadership day-to-day ops)

-- ── Shifts (real schedule; replaces the hardcoded /admin/schedule mock) ──
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  station TEXT NOT NULL DEFAULT 'barista'
    CHECK (station IN ('barista','bar','kitchen','register','baker','lead','event','other')),
  notes TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shifts_time_order CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS idx_shifts_user ON public.shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_starts ON public.shifts(starts_at);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team reads published shifts" ON public.shifts;
CREATE POLICY "Team reads published shifts" ON public.shifts
  FOR SELECT USING (public.is_team_member() AND (published OR public.is_staff()));
DROP POLICY IF EXISTS "Managers manage shifts" ON public.shifts;
CREATE POLICY "Managers manage shifts" ON public.shifts
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ── Schedule requests (time off / swap / availability changes) ──
CREATE TABLE IF NOT EXISTS public.schedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'time_off' CHECK (kind IN ('time_off','swap','availability')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied','cancelled')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT schedule_requests_time_order CHECK (ends_at >= starts_at)
);
CREATE INDEX IF NOT EXISTS idx_schedule_requests_user ON public.schedule_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_requests_status ON public.schedule_requests(status);

ALTER TABLE public.schedule_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own or manager reads requests" ON public.schedule_requests;
CREATE POLICY "Own or manager reads requests" ON public.schedule_requests
  FOR SELECT USING (user_id = auth.uid() OR public.is_staff());
DROP POLICY IF EXISTS "Team creates own requests" ON public.schedule_requests;
CREATE POLICY "Team creates own requests" ON public.schedule_requests
  FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_team_member());
DROP POLICY IF EXISTS "Managers review requests" ON public.schedule_requests;
CREATE POLICY "Managers review requests" ON public.schedule_requests
  FOR UPDATE USING (public.is_staff() OR user_id = auth.uid());

-- ── Team chat (shared channel; realtime) ──
CREATE TABLE IF NOT EXISTS public.team_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_team_messages_created ON public.team_messages(created_at DESC);

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team reads chat" ON public.team_messages;
CREATE POLICY "Team reads chat" ON public.team_messages
  FOR SELECT USING (public.is_team_member());
DROP POLICY IF EXISTS "Team writes own chat" ON public.team_messages;
CREATE POLICY "Team writes own chat" ON public.team_messages
  FOR INSERT WITH CHECK (user_id = auth.uid() AND public.is_team_member());

-- ── Par counts (staff submit on-hand counts vs par; feeds inventory brain) ──
CREATE TABLE IF NOT EXISTS public.par_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'general'
    CHECK (area IN ('general','bar','kitchen','retail','bakery','storage')),
  unit TEXT NOT NULL DEFAULT 'each',
  par_level NUMERIC(10,2),
  counted_qty NUMERIC(10,2) NOT NULL,
  counted_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  counted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_par_counts_item ON public.par_counts(item_name);
CREATE INDEX IF NOT EXISTS idx_par_counts_at ON public.par_counts(counted_at DESC);

ALTER TABLE public.par_counts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team reads par counts" ON public.par_counts;
CREATE POLICY "Team reads par counts" ON public.par_counts
  FOR SELECT USING (public.is_team_member());
DROP POLICY IF EXISTS "Team submits par counts" ON public.par_counts;
CREATE POLICY "Team submits par counts" ON public.par_counts
  FOR INSERT WITH CHECK (counted_by = auth.uid() AND public.is_team_member());

-- ── Realtime for team chat ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'team_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'realtime publication add skipped: %', SQLERRM;
END $$;
