-- 030: Smart Accounting foundation (2026-06-10)
-- Owner ask: clean bank integrations, automated transaction categorization,
-- P&L, balance-sheet basics — AI-assisted where SAFE (AI suggests categories;
-- nothing auto-posts to books without review).
--
-- Design:
--  * bank_accounts        — connected/manual accounts (Plaid-ready: plaid_* cols
--                           nullable so CSV-import works today, Plaid later)
--  * bank_transactions    — the ledger feed. Source = plaid|csv|square|stripe|manual.
--                           Categorization fields carry state: suggested (rule/AI)
--                           vs confirmed (human). dedupe via source+external_id.
--  * accounting_categories— chart of accounts (P&L line mapping), seeded for a
--                           coffee shop. kind drives the P&L rollup.
--  * categorization_rules — deterministic matcher rules (substring/merchant),
--                           applied before AI; owner-editable, auditable.
-- All owner-only via RLS (service-role writes through owner-gated APIs).

-- ── Chart of accounts ──
CREATE TABLE IF NOT EXISTS public.accounting_categories (
  id TEXT PRIMARY KEY,                -- slug, e.g. 'cogs-coffee'
  label TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('revenue','cogs','opex','payroll','tax','transfer','other')),
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO public.accounting_categories (id, label, kind, sort_order) VALUES
  ('rev-cafe',        'Café Sales (Square)',        'revenue', 10),
  ('rev-online',      'Online Orders (Stripe)',     'revenue', 11),
  ('rev-wholesale',   'Wholesale / B2B',            'revenue', 12),
  ('rev-merch',       'Merch & Design Studio',      'revenue', 13),
  ('rev-other',       'Other Income',               'revenue', 19),
  ('cogs-coffee',     'Coffee Beans / Roasting',    'cogs',    20),
  ('cogs-dairy',      'Dairy & Alternatives',       'cogs',    21),
  ('cogs-food',       'Food & Bakery Ingredients',  'cogs',    22),
  ('cogs-packaging',  'Cups, Lids & Packaging',     'cogs',    23),
  ('cogs-pod',        'Printful / Dropship Cost',   'cogs',    24),
  ('opex-rent',       'Rent & Utilities',           'opex',    30),
  ('opex-software',   'Software & Subscriptions',   'opex',    31),
  ('opex-marketing',  'Marketing & Ads',            'opex',    32),
  ('opex-equipment',  'Equipment & Maintenance',    'opex',    33),
  ('opex-fees',       'Payment Processing Fees',    'opex',    34),
  ('opex-insurance',  'Insurance & Licenses',       'opex',    35),
  ('opex-supplies',   'Shop Supplies',              'opex',    36),
  ('opex-other',      'Other Operating Expense',    'opex',    39),
  ('payroll-wages',   'Wages & Contractors',        'payroll', 40),
  ('payroll-taxes',   'Payroll Taxes & Benefits',   'payroll', 41),
  ('tax-sales',       'Sales Tax Remitted',         'tax',     50),
  ('transfer',        'Transfers (non-P&L)',        'transfer',60),
  ('uncategorized',   'Uncategorized',              'other',   99)
ON CONFLICT (id) DO NOTHING;

-- ── Bank accounts ──
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  institution TEXT,
  kind TEXT NOT NULL DEFAULT 'checking'
    CHECK (kind IN ('checking','savings','credit_card','payment_processor','cash','other')),
  last4 TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','csv','plaid','square','stripe')),
  plaid_item_id TEXT,
  plaid_account_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Transactions ──
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  posted_at DATE NOT NULL,
  amount_cents BIGINT NOT NULL,            -- positive = inflow, negative = outflow
  description TEXT NOT NULL,
  merchant TEXT,
  source TEXT NOT NULL DEFAULT 'csv' CHECK (source IN ('plaid','csv','square','stripe','manual')),
  external_id TEXT,                        -- provider txn id for dedupe
  category_id TEXT REFERENCES public.accounting_categories(id),
  category_state TEXT NOT NULL DEFAULT 'uncategorized'
    CHECK (category_state IN ('uncategorized','suggested','confirmed')),
  suggested_by TEXT CHECK (suggested_by IN ('rule','ai',NULL)),
  suggestion_confidence NUMERIC(4,3),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_txn_dedupe
  ON public.bank_transactions (source, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bank_txn_posted ON public.bank_transactions (posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_txn_state ON public.bank_transactions (category_state);

-- ── Deterministic categorization rules (run before AI) ──
CREATE TABLE IF NOT EXISTS public.categorization_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matcher TEXT NOT NULL,                   -- case-insensitive substring on description/merchant
  category_id TEXT NOT NULL REFERENCES public.accounting_categories(id),
  priority INTEGER NOT NULL DEFAULT 100,   -- lower wins
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed obvious rules for known counterparties
INSERT INTO public.categorization_rules (matcher, category_id, priority) VALUES
  ('square',   'rev-cafe',      10),
  ('stripe',   'rev-online',    10),
  ('printful', 'cogs-pod',      10),
  ('twilio',   'opex-software', 20),
  ('vercel',   'opex-software', 20),
  ('digitalocean', 'opex-software', 20),
  ('resend',   'opex-software', 20),
  ('transfer', 'transfer',      30)
ON CONFLICT DO NOTHING;

-- ── RLS: owner-only financial data ──
ALTER TABLE public.accounting_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorization_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff reads categories" ON public.accounting_categories;
CREATE POLICY "Staff reads categories" ON public.accounting_categories
  FOR SELECT USING (public.is_staff());

-- Accounts/transactions/rules: no anon/staff policies at all — service-role only
-- (owner-gated API routes). Deny-by-default once RLS is enabled.
