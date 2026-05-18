-- ============================================================
-- Loyalty System Completion Migration
-- ============================================================

-- Make loyalty_transactions work for both profiles and customers
ALTER TABLE loyalty_transactions ALTER COLUMN profile_id DROP NOT NULL;

-- Add customer_id for e-commerce orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_transactions' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE loyalty_transactions ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add customer_email for easy lookups without joins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'loyalty_transactions' AND column_name = 'customer_email'
  ) THEN
    ALTER TABLE loyalty_transactions ADD COLUMN customer_email TEXT;
  END IF;
END $$;

-- Create index on customer_id
CREATE INDEX IF NOT EXISTS idx_loyalty_customer ON loyalty_transactions(customer_id);

-- Add loyalty fields to orders table for tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'loyalty_points_redeemed'
  ) THEN
    ALTER TABLE orders ADD COLUMN loyalty_points_redeemed INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'loyalty_points_earned'
  ) THEN
    ALTER TABLE orders ADD COLUMN loyalty_points_earned INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'loyalty_value_cents'
  ) THEN
    ALTER TABLE orders ADD COLUMN loyalty_value_cents INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;
