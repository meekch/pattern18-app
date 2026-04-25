-- Pattern18 Founding Member — application form changes
-- Paste into Supabase SQL Editor. Idempotent.
--
-- Drops the tech-comfort barrier and the "what have you tried" friction,
-- adds an optional attorney-status field that drives a Pattern18-for-Firms
-- referral pathway after day 30.

-- 1) Make tech_comfort optional (column kept for any existing rows / history).
ALTER TABLE founding_member_applications
  ALTER COLUMN tech_comfort DROP NOT NULL;

-- 2) what_tried_before was already nullable in 001 — no-op here, kept for
--    documentation that this column is now intentionally optional and
--    the form no longer asks for it.

-- 3) Add working_with_attorney column.
ALTER TABLE founding_member_applications
  ADD COLUMN IF NOT EXISTS working_with_attorney TEXT
  CHECK (
    working_with_attorney IS NULL OR working_with_attorney IN
    ('yes_currently', 'past_not_current', 'no', 'prefer_not_to_say')
  );

CREATE INDEX IF NOT EXISTS idx_fm_apps_attorney
  ON founding_member_applications(working_with_attorney)
  WHERE working_with_attorney IS NOT NULL;

-- END
