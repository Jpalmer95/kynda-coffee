-- Epic 6: B2B / Wholesale Pipeline.
--
-- The current /admin/b2b page is hardcoded mock data. This establishes the real
-- CRM data model: leads (pipeline), accounts (active wholesale customers), and
-- recurring/bulk orders. The agentic scout (Hermes cron, follow-up) inserts
-- 'new' leads here for owner approval before any outreach happens.

-- ---------------------------------------------------------------------------
-- Leads: the top of the funnel. Inbound (wholesale inquiry form) + outbound
-- (agent scout). Nothing is contacted without the owner moving it to 'approved'.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b2b_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  location TEXT,
  lead_type TEXT NOT NULL DEFAULT 'other'
    CHECK (lead_type IN ('grocery', 'cafe', 'office', 'restaurant', 'event', 'hotel', 'other')),
  source TEXT NOT NULL DEFAULT 'inbound'
    CHECK (source IN ('inbound', 'scout', 'referral', 'manual')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'approved', 'contacted', 'negotiating', 'won', 'lost', 'rejected')),
  fit_score INTEGER,                 -- 0-100 agent/heuristic score
  est_monthly_value_cents INTEGER,   -- estimated recurring value
  notes TEXT,
  -- outreach tracking
  outreach_drafted_at TIMESTAMPTZ,
  outreach_sent_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  -- when won, link to the account it became
  account_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_leads_status ON public.b2b_leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_b2b_leads_source ON public.b2b_leads (source);

-- ---------------------------------------------------------------------------
-- Accounts: active wholesale customers with terms + recurring schedule.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b2b_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold')),
  -- wholesale discount off retail, percent (drives the pricing engine wholesale profile)
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 30.0,
  -- recurring cadence
  order_cadence TEXT CHECK (order_cadence IN ('weekly', 'biweekly', 'monthly', 'adhoc')),
  next_order_date DATE,
  payment_terms TEXT DEFAULT 'net30',
  est_monthly_value_cents INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_accounts_active ON public.b2b_accounts (is_active, tier);

-- ---------------------------------------------------------------------------
-- Orders: bulk / recurring wholesale orders against an account.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.b2b_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.b2b_accounts(id) ON DELETE CASCADE NOT NULL,
  order_number TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ name, qty, unit, unit_price_cents }]
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'confirmed', 'fulfilled', 'invoiced', 'paid', 'cancelled')),
  fulfillment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_orders_account ON public.b2b_orders (account_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS: admin manages everything. The wholesale inquiry form inserts leads via
-- the service role (server route), so no public INSERT policy is needed.
-- ---------------------------------------------------------------------------
ALTER TABLE public.b2b_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages b2b leads" ON public.b2b_leads;
CREATE POLICY "Admin manages b2b leads" ON public.b2b_leads FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admin manages b2b accounts" ON public.b2b_accounts;
CREATE POLICY "Admin manages b2b accounts" ON public.b2b_accounts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admin manages b2b orders" ON public.b2b_orders;
CREATE POLICY "Admin manages b2b orders" ON public.b2b_orders FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
