-- ============================================================
-- 052_master_par_and_waste_costs.sql
-- Phase: Master Par List + cost-aware Waste Log
--
-- 1. Add unit_cost_cents to ingredient_pars so the master par list
--    holds real per-unit pricing (used to compute waste cost).
-- 2. Add vendor/brand fields so owners can edit brand/type per item.
-- 3. Consolidate waste onto waste_entries (staff page + admin use the
--    same table), adding ingredient_id + unit_cost_cents.
-- 4. Seed HEB prices where we have them (best-known, editable later).
-- Idempotent: safe to re-run.
-- ============================================================

-- 1. Master Par List pricing + brand
ALTER TABLE public.ingredient_pars ADD COLUMN IF NOT EXISTS unit_cost_cents INTEGER DEFAULT 0;
ALTER TABLE public.ingredient_pars ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.ingredient_pars ADD COLUMN IF NOT EXISTS area TEXT DEFAULT 'general';
ALTER TABLE public.ingredient_pars ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Waste entries: add cost-per-unit + ingredient link (for reports)
ALTER TABLE public.waste_entries ADD COLUMN IF NOT EXISTS ingredient_id TEXT;
ALTER TABLE public.waste_entries ADD COLUMN IF NOT EXISTS unit_cost_cents INTEGER DEFAULT 0;

-- 3. Seed best-known HEB unit costs (per package, editable in admin).
--    These are estimates to make waste reports meaningful from day one.
UPDATE public.ingredient_pars SET unit_cost_cents = 448  WHERE ingredient_name LIKE 'H-E-B Bakery Scratch Sourdough%';
UPDATE public.ingredient_pars SET unit_cost_cents = 397  WHERE ingredient_name LIKE 'Thomas%Bagels%';
UPDATE public.ingredient_pars SET unit_cost_cents = 678  WHERE ingredient_name LIKE 'Waterloo%';
UPDATE public.ingredient_pars SET unit_cost_cents = 448  WHERE ingredient_name LIKE 'Higher Harvest%Oat Milk%';
UPDATE public.ingredient_pars SET unit_cost_cents = 448  WHERE ingredient_name LIKE 'Higher Harvest%Coconut Milk%';
UPDATE public.ingredient_pars SET unit_cost_cents = 259  WHERE ingredient_name LIKE 'Hill Country Fare Whole Milk%';
UPDATE public.ingredient_pars SET unit_cost_cents = 259  WHERE ingredient_name LIKE 'Hill Country Fare Fat Free Milk%';
UPDATE public.ingredient_pars SET unit_cost_cents = 487  WHERE ingredient_name LIKE 'H-E-B Heavy Whipping Cream%';
UPDATE public.ingredient_pars SET unit_cost_cents = 394  WHERE ingredient_name LIKE 'H-E-B Regular Cream Cheese%';
UPDATE public.ingredient_pars SET unit_cost_cents = 634  WHERE ingredient_name LIKE 'H-E-B Fresh Spinach%';
UPDATE public.ingredient_pars SET unit_cost_cents = 186  WHERE ingredient_name LIKE 'Fresh Roma Tomato%';
UPDATE public.ingredient_pars SET unit_cost_cents = 199  WHERE ingredient_name LIKE 'Fresh Bunch of Bananas%';
UPDATE public.ingredient_pars SET unit_cost_cents = 499  WHERE ingredient_name LIKE 'H-E-B Fresh Lemons%';
UPDATE public.ingredient_pars SET unit_cost_cents = 568  WHERE ingredient_name LIKE 'H-E-B Organics%Cocoa%';
UPDATE public.ingredient_pars SET unit_cost_cents = 448  WHERE ingredient_name LIKE 'Libby%Pumpkin%';
UPDATE public.ingredient_pars SET unit_cost_cents = 348  WHERE ingredient_name LIKE 'H-E-B Marinara Pasta Sauce%';
UPDATE public.ingredient_pars SET unit_cost_cents = 544  WHERE ingredient_name LIKE 'H-E-B Basil Pesto%';
UPDATE public.ingredient_pars SET unit_cost_cents = 349  WHERE ingredient_name LIKE 'H-E-B Brown Sugar%';
UPDATE public.ingredient_pars SET unit_cost_cents = 398  WHERE ingredient_name LIKE 'Hill Country Fare Strawberry Jam%';
UPDATE public.ingredient_pars SET unit_cost_cents = 899  WHERE ingredient_name LIKE 'H-E-B Texas Heritage%Sausage%';
UPDATE public.ingredient_pars SET unit_cost_cents = 899  WHERE ingredient_name LIKE 'H-E-B Oven-Roasted Turkey%';
UPDATE public.ingredient_pars SET unit_cost_cents = 699  WHERE ingredient_name LIKE 'H-E-B Frozen Blueberries%';
UPDATE public.ingredient_pars SET unit_cost_cents = 578  WHERE ingredient_name LIKE 'H-E-B Creamy Creations%';
UPDATE public.ingredient_pars SET unit_cost_cents = 423  WHERE ingredient_name LIKE 'Hill Country Fare Mild Cheddar Shredded%';
UPDATE public.ingredient_pars SET unit_cost_cents = 423  WHERE ingredient_name LIKE 'Hill Country Fare Mild Cheddar Sliced%';
UPDATE public.ingredient_pars SET unit_cost_cents = 487  WHERE ingredient_name LIKE 'Hill Country Fare%Mozzarella%';
UPDATE public.ingredient_pars SET unit_cost_cents = 412  WHERE ingredient_name LIKE 'H-E-B More Fruit Peach%';
UPDATE public.ingredient_pars SET unit_cost_cents = 358  WHERE ingredient_name LIKE 'H-E-B Whipped Dairy Topping%';

-- 4. Index for waste cost reports
CREATE INDEX IF NOT EXISTS idx_waste_entries_cost_date
  ON public.waste_entries (created_at, reason);
