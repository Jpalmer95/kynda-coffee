-- 046_howto_guides.sql
-- Phase 3 (MASTER_PLAN): How-To guides for equipment cleaning, cold brew, etc.

CREATE TABLE IF NOT EXISTS public.howto_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'equipment'
    CHECK (category IN ('equipment', 'cold-brew', 'cleaning', 'maintenance', 'safety', 'opening', 'closing', 'other')),
  description TEXT,
  content TEXT NOT NULL DEFAULT '',  -- Markdown content with steps
  image_url TEXT,
  video_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_howto_guides_category
  ON public.howto_guides (category, sort_order);

CREATE INDEX IF NOT EXISTS idx_howto_guides_active
  ON public.howto_guides (is_active);

ALTER TABLE public.howto_guides ENABLE ROW LEVEL SECURITY;

-- Staff+ can read active guides
DROP POLICY IF EXISTS "Staff reads howto guides" ON public.howto_guides;
CREATE POLICY "Staff reads howto guides" ON public.howto_guides FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager', 'owner', 'employee', 'staff')
    )
  );

-- Managers+ can manage guides
DROP POLICY IF EXISTS "Managers manage howto guides" ON public.howto_guides;
CREATE POLICY "Managers manage howto guides" ON public.howto_guides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'manager', 'owner')
    )
  );

-- Seed initial guides
INSERT INTO public.howto_guides (title, category, description, content, sort_order) VALUES
  ('Espresso Machine Cleaning', 'equipment', 'Daily and weekly cleaning for the espresso machine',
   '# Espresso Machine Cleaning\n\n## Daily (End of Shift)\n1. **Backflush** each group head with a blank basket and espresso machine cleaner (Cafiza)\n2. Run 2-3 backflush cycles with cleaner, then 2-3 with water only\n3. **Group head brush** — scrub inside each group head with the group brush\n4. **Steam wand** — wipe down, purge steam, soak wand tip in warm water if milk buildup\n5. **Portafilter** — remove baskets, wash with warm soapy water, dry thoroughly\n6. **Drip tray** — empty and rinse\n\n## Weekly\n1. Soak portafilter baskets and shower screens in Cafiza solution (15 min)\n2. Descale if water hardness requires (check manual)\n3. Check gaskets — replace if worn or leaking\n\n> Always follow the manufacturer manual for your specific machine model.',
   1),
  ('Grinder Cleaning', 'equipment', 'Daily grinder maintenance',
   '# Grinder Cleaning\n\n## Daily (End of Shift)\n1. **Purge** — run grinder empty for 2-3 seconds to clear grounds\n2. **Vacuum** — use the shop vac to remove grounds from the chute and burrs\n3. **Brush** — use the grinder brush to clear the burr chamber\n4. **Doser** (if applicable) — sweep out all remaining grounds\n5. Wipe down the exterior with a damp cloth\n\n## Weekly\n1. Remove upper burr and vacuum thoroughly\n2. Inspect burrs for wear — replace if chipped or dull (every 6-12 months)\n3. Calibrate grind size after reassembly\n\n> Never use water inside the grinder. Dry cleaning only!',
   2),
  ('Cold Brew + Corny Keg Loading', 'cold-brew', 'How to brew cold brew concentrate and load into a corny keg for serving',
   '# Cold Brew + Corny Keg Loading\n\n## What You Need\n- 1 lb coarse-ground coffee (Kynda house blend)\n- 1 gallon cold filtered water\n- Large container or Toddy system\n- Corny keg (5 gallon, ball lock)\n- CO2 tank + regulator\n- Nylon straining bag or Toddy filter\n\n## Step 1: Brew the Concentrate\n1. Add 1 lb coarse-ground coffee to the brewing container\n2. Slowly pour 1 gallon cold filtered water over the grounds, ensuring all are saturated\n3. Stir gently to break up any dry clumps\n4. Cover and let steep at room temperature for **18-24 hours**\n\n## Step 2: Strain\n1. Line a colander with the nylon straining bag over a large pot or bucket\n2. Pour the brew through the strainer\n3. Let drip for 15-20 minutes — do not press or squeeze (causes bitterness)\n4. Transfer concentrate to a clean container\n\n## Step 3: Sanitize the Corny Keg\n1. Mix 1 oz Star San in 1 gallon warm water\n2. Fill the keg, pressurize to 10 PSI, and shake vigorously for 2 minutes\n3. Run sanitizer through the liquid out post and faucet\n4. Empty and rinse with cold water twice\n\n## Step 4: Load the Keg\n1. Pour the cold brew concentrate into the sanitized keg\n2. Top up with filtered water to ~4.5 gallons (dilution to taste)\n3. Seal the lid and pressurize with CO2 to **30 PSI**\n4. Shake the keg for 2-3 minutes to carbonate\n5. Reduce to **10-12 PSI** serving pressure\n6. Let chill in the fridge for at least 4 hours before serving\n\n## Step 5: Serve\n- Connect to the kegerator line\n- Pour and enjoy! Cold brew on tap should be consumed within **7-10 days**\n\n> **CO2 Safety**: Never exceed 40 PSI. Always use a regulator. Check connections for leaks with soapy water.',
   3),
  ('Drip Coffee Brewer Maintenance', 'equipment', 'Daily cleaning for the drip coffee brewers',
   '# Drip Coffee Brewer Maintenance\n\n## Daily\n1. **Discard** used grounds and filter\n2. **Rinse** the brew basket and carafe with hot water\n3. **Wipe** the warming plate and exterior\n4. **Descale** weekly: run 1 part white vinegar to 2 parts water through a brew cycle, then 2 plain water cycles to rinse\n\n## Weekly\n1. Remove and wash the spray head (mineral buildup reduces flow)\n2. Check the warming plate thermostat (should hold at ~175°F)\n3. Inspect power cord for wear',
   4),
  ('Pastry Case Cleaning', 'cleaning', 'How to clean the pastry display case',
   '# Pastry Case Cleaning\n\n## Daily (End of Shift)\n1. Remove all pastries to a clean tray\n2. Remove shelf liners and wash with warm soapy water\n3. Wipe down the interior glass with food-safe glass cleaner\n4. Dry with a microfiber cloth (no streaks)\n5. Replace shelf liners and restock pastries (FIFO — check dates)\n\n## Weekly\n1. Remove all shelves and wash in the three-compartment sink\n2. Clean the case exterior — top, sides, and display glass\n3. Check the refrigeration temp (should be 33-40°F)\n4. Sanitize all surfaces with Star San or food-safe sanitizer',
   5),
  ('KDS and Kitchen Equipment', 'equipment', 'How to maintain the KDS tablet and kitchen area',
   '# KDS and Kitchen Equipment\n\n## KDS Tablet\n1. **Wipe screen** with a microfiber cloth (never spray directly)\n2. **Check charge** — dock at end of shift if battery is below 30%\n3. **Restart** the KDS app if it becomes unresponsive\n4. Report any network connectivity issues to your manager\n\n## Kitchen Area\n1. **Wipe down** all prep surfaces with sanitizer between tasks\n2. **Sweep and mop** the kitchen floor at end of shift\n3. **Check fridge temps** — log on the temp sheet, report if outside 33-40°F\n4. **Rotate stock** — always FIFO (First In, First Out)\n5. **Label and date** all prepped items with prep date',
   6)
ON CONFLICT DO NOTHING;
