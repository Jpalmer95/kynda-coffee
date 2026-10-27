-- 056_tighten_reviews_insert_policy.sql
--
-- SECURITY FIX (2026-10-27 audit)
--
-- 005_reviews_loyalty_enhancements.sql created:
--   CREATE POLICY "Anyone can create a review" ON reviews FOR INSERT WITH CHECK (TRUE);
--
-- Combined with `is_approved BOOLEAN NOT NULL DEFAULT false`, that let ANY
-- anonymous client holding the public publishable key insert a review with
-- `is_approved = true`, bypassing moderation entirely. A verified probe
-- (empty INSERT reaching the table's NOT NULL constraint instead of being
-- blocked by RLS) confirmed the permissive policy is live in production.
--
-- Replace it with policies that still allow storefront submissions but force
-- every new review into the moderation queue.

BEGIN;

DROP POLICY IF EXISTS "Anyone can create a review" ON public.reviews;
DROP POLICY IF EXISTS "Users create reviews" ON public.reviews;

-- Authenticated customers: may submit, may never self-approve or self-verify.
CREATE POLICY "Authenticated users create unapproved reviews"
  ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_approved = false
    AND is_verified_purchase = false
  );

-- Guest visitors (guest checkout): may submit, may never self-approve.
CREATE POLICY "Anonymous visitors create unapproved reviews"
  ON public.reviews
  FOR INSERT
  TO anon
  WITH CHECK (
    is_approved = false
    AND is_verified_purchase = false
  );

-- Staff/owner moderation still goes through the service role, which bypasses RLS.

COMMIT;
