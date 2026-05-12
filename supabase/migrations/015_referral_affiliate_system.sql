-- ============================================================
-- Kynda Coffee — Referral / Affiliate System (Phase 2)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Referral codes table (anyone can generate one)
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL, -- e.g. KYND-JON-7X9P
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Track every referral event
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES customers(id),
  referee_email TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded', 'expired')),
  first_order_id UUID REFERENCES orders(id),
  order_value_cents INTEGER DEFAULT 0,
  reward_issued BOOLEAN DEFAULT false,
  reward_amount_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Payout ledger for affiliates
CREATE TABLE IF NOT EXISTS affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  referral_id UUID REFERENCES referrals(id),
  amount_cents INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'store_credit' CHECK (method IN ('store_credit', 'stripe_payout', 'manual')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add referral fields to customers for quick lookup
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_code TEXT,
  ADD COLUMN IF NOT EXISTS total_referral_earnings_cents INTEGER NOT NULL DEFAULT 0;

-- Seed some realistic indexes
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes (code);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals (referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals (status);