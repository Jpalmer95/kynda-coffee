-- ============================================================
-- 055_drop_par_counts_area_check.sql
-- par_counts.area had a CHECK limiting to a handful of legacy areas
-- (general/bar/kitchen/retail/bakery/storage). The master ordering list
-- now uses rich categories (food/packaging/bread/dairy/...), so this
-- constraint silently rejected on-hand count inserts for those items,
-- causing on-hand values to never save. Drop it.
-- ============================================================
ALTER TABLE public.par_counts DROP CONSTRAINT IF EXISTS par_counts_area_check;
