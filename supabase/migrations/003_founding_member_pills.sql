-- Pattern18 Founding Member — challenge pills + optional elaborate
-- Paste into Supabase SQL Editor.
--
-- One-time type conversion: biggest_challenge moves from a single TEXT
-- response to a TEXT[] array of stable pill keys. Existing rows (if any)
-- are wrapped into a single-element array so no data is lost.
--
-- Adds biggest_challenge_other for the optional 1-2-sentence elaborate
-- field that replaces the form's previous "Anything else you want me to
-- know?" textarea (additional_notes).

-- 1) Convert biggest_challenge TEXT → TEXT[].
--    Skips quietly if already TEXT[] from a prior run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'founding_member_applications'
      AND column_name = 'biggest_challenge'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE founding_member_applications
      ALTER COLUMN biggest_challenge TYPE TEXT[] USING ARRAY[biggest_challenge];
  END IF;
END
$$;

-- 2) Add biggest_challenge_other (optional elaborate field).
ALTER TABLE founding_member_applications
  ADD COLUMN IF NOT EXISTS biggest_challenge_other TEXT;

-- additional_notes column kept on the schema for any historical rows;
-- the form no longer collects it. Safe to drop in a future migration
-- once historical data is exported.

-- END
