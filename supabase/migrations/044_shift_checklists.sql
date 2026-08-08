-- 044_shift_checklists.sql
-- Phase 1 (MASTER_PLAN): make shift checklists real.
--
-- The live `checklists` table (migration 003 era) has title/type/items but is
-- EMPTY and its type CHECK lacks 'mid-shift'. `checklist_completions` still
-- carries a broken FK to the long-renamed `user_profiles` and the app writes
-- `checklist_type`, which doesn't exist → completions silently fail.
--
-- This migration:
--   1. Extends checklists.type to allow 'mid-shift'
--   2. Seeds opening / closing / mid-shift checklist rows
--   3. Adds checklist_type to checklist_completions (filter convenience,
--      matches the app's write path) and repoints completed_by FK → auth.users

-- ── 1. Extend type CHECK to include mid-shift ──
DO $$
BEGIN
  ALTER TABLE public.checklists DROP CONSTRAINT IF EXISTS checklists_type_check;
  ALTER TABLE public.checklists
    ADD CONSTRAINT checklists_type_check
    CHECK (type IN ('opening', 'closing', 'mid-shift', 'daily', 'weekly', 'monthly', 'maintenance'));
EXCEPTION WHEN others THEN
  RAISE NOTICE 'checklists type constraint update skipped: %', SQLERRM;
END $$;

-- ── 2. Seed the three shift checklists (only if none exist yet) ──
DO $$
DECLARE
  opening_items JSONB := '[
    {"text":"Turn on espresso machine — let warm up 20 min","order":1,"is_critical":true},
    {"text":"Grind espresso beans — dial in shots","order":2,"is_critical":true},
    {"text":"Brew drip coffee (regular + decaf)","order":3,"is_critical":false},
    {"text":"Prepare pastry display case","order":4,"is_critical":false},
    {"text":"Stock cups, lids, napkins, stirrers","order":5,"is_critical":false},
    {"text":"Fill condiment bar (sugar, cream, cinnamon)","order":6,"is_critical":false},
    {"text":"Wipe down all counter surfaces","order":7,"is_critical":false},
    {"text":"Check refrigerated items — discard expired","order":8,"is_critical":true},
    {"text":"Set up POS — log in, check cash drawer","order":9,"is_critical":true},
    {"text":"Turn on background music","order":10,"is_critical":false}
  ]'::jsonb;
  closing_items JSONB := '[
    {"text":"Run cleaning cycle on espresso machine","order":1,"is_critical":true},
    {"text":"Empty and sanitize grinder","order":2,"is_critical":true},
    {"text":"Wash all equipment and utensils","order":3,"is_critical":false},
    {"text":"Wipe down espresso machine group heads","order":4,"is_critical":true},
    {"text":"Empty drip trays and rinse","order":5,"is_critical":false},
    {"text":"Restock cups, lids, and supplies for tomorrow","order":6,"is_critical":false},
    {"text":"Clean pastry display case","order":7,"is_critical":false},
    {"text":"Wipe down all tables and chairs","order":8,"is_critical":false},
    {"text":"Sweep and mop floors","order":9,"is_critical":false},
    {"text":"Empty trash and replace liners","order":10,"is_critical":false},
    {"text":"Count cash drawer — record on close sheet","order":11,"is_critical":true},
    {"text":"Turn off equipment, lights, and music","order":12,"is_critical":false},
    {"text":"Lock all doors — set alarm","order":13,"is_critical":true}
  ]'::jsonb;
  mid_items JSONB := '[
    {"text":"Restock supplies as needed","order":1,"is_critical":false},
    {"text":"Wipe down tables and condiment bar","order":2,"is_critical":false},
    {"text":"Check fridge temps","order":3,"is_critical":true},
    {"text":"Refill coffee as needed","order":4,"is_critical":false},
    {"text":"Quick sweep of visible floor areas","order":5,"is_critical":false}
  ]'::jsonb;
  existing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO existing_count FROM public.checklists;
  IF existing_count = 0 THEN
    INSERT INTO public.checklists (title, description, type, items) VALUES
      ('Opening Shift Checklist', 'Tasks to complete before the doors open.', 'opening', opening_items),
      ('Mid-Shift Checklist', 'Keep the floor and bar in shape through the rush.', 'mid-shift', mid_items),
      ('Closing Shift Checklist', 'Tasks to complete before locking up.', 'closing', closing_items);
    RAISE NOTICE 'Seeded 3 shift checklists';
  END IF;
END $$;

-- ── 3. Fix checklist_completions ──
-- Add checklist_type (the app's write path) so filtering by shift type is
-- simple; backfill from the checklists table where possible.
ALTER TABLE public.checklist_completions
  ADD COLUMN IF NOT EXISTS checklist_type TEXT;

UPDATE public.checklist_completions cc
SET checklist_type = c.type
FROM public.checklists c
WHERE cc.checklist_id = c.id
  AND cc.checklist_type IS NULL;

-- Repoint the completed_by FK: it referenced user_profiles (renamed to
-- profiles long ago). Drop the stale constraint, add a clean one to auth.users.
DO $$
BEGIN
  ALTER TABLE public.checklist_completions DROP CONSTRAINT IF EXISTS checklist_completions_completed_by_fkey;
  ALTER TABLE public.checklist_completions
    ADD CONSTRAINT checklist_completions_completed_by_fkey
    FOREIGN KEY (completed_by) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'completed_by FK repoint skipped: %', SQLERRM;
END $$;

-- Keep the app's user+date lookup fast.
CREATE INDEX IF NOT EXISTS idx_checklist_completions_type_date
  ON public.checklist_completions (checklist_type, completed_at DESC);

-- ── 4. RLS ──
-- Staff read own completions; managers/owners read all. (Table may already
-- have policies from 20260529 — drop + recreate to match tier model.)
DROP POLICY IF EXISTS "Staff can read own completions" ON public.checklist_completions;
CREATE POLICY "Staff can read own completions" ON public.checklist_completions FOR SELECT
  USING (
    completed_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

DROP POLICY IF EXISTS "Staff can write own completions" ON public.checklist_completions;
CREATE POLICY "Staff can write own completions" ON public.checklist_completions FOR INSERT
  WITH CHECK (
    completed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager', 'owner', 'employee', 'staff')
    )
  );
