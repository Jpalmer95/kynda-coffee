-- ============================================================
-- 053_waste_monthly_reports.sql
-- Persisted monthly waste cost reports so the owner can review
-- history in the admin dashboard (no email cron needed).
--
-- Each row is a SNAPSHOT of one calendar month's waste summary
-- (JSONB) at report time. The admin can generate a report for any
-- past month on demand, or it can be auto-snapshotted at month end.
-- Idempotent: safe to re-run.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.waste_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,          -- first day of the month
  period_end DATE NOT NULL,            -- last day of the month
  month_label TEXT NOT NULL,           -- e.g. '2026-08'
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {total_cents, total_entries, by_reason, top_items, daily, weekly}
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month_label)
);

CREATE INDEX IF NOT EXISTS idx_waste_reports_month
  ON public.waste_reports (period_start DESC);

ALTER TABLE public.waste_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='waste_reports' AND policyname='Manager reads waste reports') THEN
    CREATE POLICY "Manager reads waste reports"
      ON public.waste_reports FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','manager','owner'))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='waste_reports' AND policyname='Manager writes waste reports') THEN
    CREATE POLICY "Manager writes waste reports"
      ON public.waste_reports FOR ALL
      USING (
        EXISTS (SELECT 1 FROM public.profiles
                WHERE profiles.id = auth.uid() AND profiles.role IN ('admin','manager','owner'))
      );
  END IF;
END $$;
