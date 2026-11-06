-- ============================================================
-- 057_kaizen_command_and_control.sql
-- Decentralized Kaizen RSI (Recursive Self-Improvement) &
-- Kynda Command and Control Schema
--
-- Tables:
--   1. public.kaizen_proposals   (Any-tier ideation -> AI triage -> Dual-Owner gate -> SOP compile)
--   2. public.owner_whispers     (RLS-locked direct hotline to Jonathan & Briseida only)
--   3. public.equipment_tickets  (Enforces rule: equipment -> leadership/chat, never waste log)
--   4. public.espresso_dial_ins  (Morning extraction telemetry & calibration log)
--   5. public.agent_budgets      (5-Tier token quotas, micro-spend caps, Kaizen XP & bounties)
--   6. public.vendor_intakes     (Scoped vendor delivery ETAs, invoice price updates, event requests)
--
-- Storage Buckets:
--   employee-vault (private), company-docs (private),
--   menu-assets (public), security-clips (private)
--
-- Idempotent: safe to re-run.
-- ============================================================

BEGIN;

-- 1. Kaizen Proposals (Recursive Self-Improvement Ledger)
CREATE TABLE IF NOT EXISTS public.kaizen_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_name TEXT NOT NULL DEFAULT 'Team Member',
  submitter_role TEXT NOT NULL DEFAULT 'staff'
    CHECK (submitter_role IN ('customer', 'vendor', 'staff', 'manager', 'owner')),
  category TEXT NOT NULL DEFAULT 'process'
    CHECK (category IN (
      'process',
      'recipe',
      'inventory',
      'marketing',
      'customer_experience',
      'cost_saving',
      'layout',
      'orbital_rd'
    )),
  title TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  proposed_solution TEXT NOT NULL,
  ai_triage_summary TEXT,
  ai_impact_score INTEGER NOT NULL DEFAULT 50 CHECK (ai_impact_score >= 0 AND ai_impact_score <= 100),
  ai_estimated_monthly_value_cents INTEGER NOT NULL DEFAULT 0,
  ai_target_system TEXT NOT NULL DEFAULT 'general'
    CHECK (ai_target_system IN (
      'checklists',
      'recipes',
      'howto_guides',
      'ingredient_pars',
      'handbook_sections',
      'marketing',
      'general'
    )),
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN (
      'pending_review',
      'trial_14d',
      'approved',
      'compiled',
      'parked',
      'rejected'
    )),
  bounty_cents INTEGER NOT NULL DEFAULT 500 CHECK (bounty_cents >= 0),
  xp_awarded INTEGER NOT NULL DEFAULT 25 CHECK (xp_awarded >= 0),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  owner_notes TEXT,
  telemetry_check_due_at TIMESTAMPTZ,
  telemetry_outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kaizen_proposals_status ON public.kaizen_proposals (status, ai_impact_score DESC);
CREATE INDEX IF NOT EXISTS idx_kaizen_proposals_submitter ON public.kaizen_proposals (submitted_by);

-- 2. Owner Whispers (Direct-to-Owners Confidential Channel — Jonathan & Briseida ONLY)
CREATE TABLE IF NOT EXISTS public.owner_whispers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_name TEXT NOT NULL DEFAULT 'Anonymous Team Member',
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  topic TEXT NOT NULL DEFAULT 'other'
    CHECK (topic IN ('culture', 'safety', 'scheduling', 'management', 'idea', 'other')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unread'
    CHECK (status IN ('unread', 'read', 'resolved')),
  owner_response TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_owner_whispers_status ON public.owner_whispers (status, created_at DESC);

-- 3. Equipment Tickets (Standing Rule: Equipment -> Leadership & Team Chat, NEVER Waste Log)
CREATE TABLE IF NOT EXISTS public.equipment_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name TEXT NOT NULL DEFAULT 'Team Member',
  equipment_name TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'espresso_bar'
    CHECK (area IN (
      'espresso_bar',
      'cold_brew_keg',
      'grinder',
      'refrigeration',
      'dish_plumbing',
      'pos_kds',
      'hvac_lighting',
      'other'
    )),
  severity TEXT NOT NULL DEFAULT 'degraded'
    CHECK (severity IN ('low', 'degraded', 'urgent_down')),
  description TEXT NOT NULL,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_tickets_status ON public.equipment_tickets (status, created_at DESC);

-- 4. Espresso Dial-Ins (Morning Calibration & Extraction Telemetry)
CREATE TABLE IF NOT EXISTS public.espresso_dial_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  barista_name TEXT NOT NULL DEFAULT 'Barista',
  bean_name TEXT NOT NULL DEFAULT 'House Espresso',
  dose_grams NUMERIC(5, 2) NOT NULL CHECK (dose_grams > 0),
  yield_grams NUMERIC(5, 2) NOT NULL CHECK (yield_grams > 0),
  time_seconds INTEGER NOT NULL CHECK (time_seconds > 0),
  grind_setting TEXT,
  water_temp_f NUMERIC(5, 1) DEFAULT 200.0,
  pressure_bar NUMERIC(4, 1) DEFAULT 9.0,
  taste_notes TEXT,
  is_in_spec BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_espresso_dial_ins_created ON public.espresso_dial_ins (created_at DESC);

-- 5. Agent Budgets & Barista Kaizen Skill Tree
CREATE TABLE IF NOT EXISTS public.agent_budgets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_tier TEXT NOT NULL DEFAULT 'staff'
    CHECK (role_tier IN ('customer', 'staff', 'manager', 'owner')),
  daily_token_limit INTEGER NOT NULL DEFAULT 25000,
  tokens_used_today INTEGER NOT NULL DEFAULT 0,
  monthly_compute_cents_limit INTEGER NOT NULL DEFAULT 300,
  compute_cents_used_month INTEGER NOT NULL DEFAULT 0,
  monthly_micro_spend_cents_limit INTEGER NOT NULL DEFAULT 0,
  micro_spend_cents_used_month INTEGER NOT NULL DEFAULT 0,
  auto_approve_po_under_cents INTEGER NOT NULL DEFAULT 0,
  kaizen_xp INTEGER NOT NULL DEFAULT 0,
  skill_rank TEXT NOT NULL DEFAULT 'Apprentice'
    CHECK (skill_rank IN (
      'Apprentice',
      'Barista',
      'Dial-In Specialist',
      'Shift Maestro',
      'Kaizen Architect'
    )),
  bounty_balance_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Vendor Intakes (Scoped Vendor Agent & Delivery/Event Pipeline)
CREATE TABLE IF NOT EXISTS public.vendor_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name TEXT NOT NULL,
  vendor_type TEXT NOT NULL DEFAULT 'other'
    CHECK (vendor_type IN (
      'roaster',
      'grocery_dairy',
      'packaging',
      'bakery',
      'event_musician',
      'maintenance',
      'other'
    )),
  intake_type TEXT NOT NULL DEFAULT 'delivery_eta'
    CHECK (intake_type IN (
      'delivery_eta',
      'invoice_price_update',
      'event_proposal',
      'stock_alert'
    )),
  contact_email TEXT,
  summary TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'acknowledged', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_intakes_status ON public.vendor_intakes (status, created_at DESC);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.kaizen_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_whispers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.espresso_dial_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_intakes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Kaizen proposals: all team members can read & insert; owners manage all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kaizen_proposals' AND policyname='Team can read kaizen proposals') THEN
    CREATE POLICY "Team can read kaizen proposals" ON public.kaizen_proposals FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin','manager','lead','team_lead','staff','employee','team','barista')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kaizen_proposals' AND policyname='Team can insert kaizen proposals') THEN
    CREATE POLICY "Team can insert kaizen proposals" ON public.kaizen_proposals FOR INSERT
      WITH CHECK (
        status = 'pending_review'
        AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin','manager','lead','team_lead','staff','employee','team','barista'))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='kaizen_proposals' AND policyname='Owners manage kaizen proposals') THEN
    CREATE POLICY "Owners manage kaizen proposals" ON public.kaizen_proposals FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin')));
  END IF;

  -- Owner whispers: staff can insert; ONLY owners (Jonathan & Briseida) can read or update!
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='owner_whispers' AND policyname='Team can submit owner whispers') THEN
    CREATE POLICY "Team can submit owner whispers" ON public.owner_whispers FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin','manager','lead','team_lead','staff','employee','team','barista')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='owner_whispers' AND policyname='Only owners can read whispers') THEN
    CREATE POLICY "Only owners can read whispers" ON public.owner_whispers FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='owner_whispers' AND policyname='Only owners can update whispers') THEN
    CREATE POLICY "Only owners can update whispers" ON public.owner_whispers FOR UPDATE
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin')));
  END IF;

  -- Equipment tickets: team can read & insert; manager/owner can update
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='equipment_tickets' AND policyname='Team can read equipment tickets') THEN
    CREATE POLICY "Team can read equipment tickets" ON public.equipment_tickets FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin','manager','lead','team_lead','staff','employee','team','barista')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='equipment_tickets' AND policyname='Team can insert equipment tickets') THEN
    CREATE POLICY "Team can insert equipment tickets" ON public.equipment_tickets FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin','manager','lead','team_lead','staff','employee','team','barista')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='equipment_tickets' AND policyname='Leadership manages equipment tickets') THEN
    CREATE POLICY "Leadership manages equipment tickets" ON public.equipment_tickets FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin','manager','lead','team_lead')));
  END IF;

  -- Espresso dial-ins: team can read & insert
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='espresso_dial_ins' AND policyname='Team can read dial ins') THEN
    CREATE POLICY "Team can read dial ins" ON public.espresso_dial_ins FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin','manager','lead','team_lead','staff','employee','team','barista')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='espresso_dial_ins' AND policyname='Team can insert dial ins') THEN
    CREATE POLICY "Team can insert dial ins" ON public.espresso_dial_ins FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin','manager','lead','team_lead','staff','employee','team','barista')));
  END IF;

  -- Agent budgets: user can read own row; owners manage all
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agent_budgets' AND policyname='Users read own budget') THEN
    CREATE POLICY "Users read own budget" ON public.agent_budgets FOR SELECT
      USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin','manager','lead','team_lead')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agent_budgets' AND policyname='Owners manage budgets') THEN
    CREATE POLICY "Owners manage budgets" ON public.agent_budgets FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin')));
  END IF;

  -- Vendor intakes: leadership can read/manage
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='vendor_intakes' AND policyname='Leadership manages vendor intakes') THEN
    CREATE POLICY "Leadership manages vendor intakes" ON public.vendor_intakes FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('owner','admin','manager','lead','team_lead')));
  END IF;
END $$;

-- ============================================================
-- Distinct Storage Buckets (No storage.objects policies per Supabase version rules)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('employee-vault', 'employee-vault', false),
  ('company-docs', 'company-docs', false),
  ('menu-assets', 'menu-assets', true),
  ('security-clips', 'security-clips', false)
ON CONFLICT (id) DO NOTHING;

COMMIT;
