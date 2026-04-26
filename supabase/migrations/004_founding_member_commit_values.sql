-- Pattern18 Founding Member — relax can_commit CHECK constraint
-- Paste into Supabase SQL Editor. Idempotent.
--
-- The application form softened the "Can you commit to weekly feedback?"
-- question into "Will you share feedback as you use Pattern18?" with new
-- button values (yes / sometimes / not_sure). The CHECK constraint must
-- accept those alongside the legacy values so any pre-launch test rows
-- and the new prod rows both validate.

ALTER TABLE founding_member_applications
  DROP CONSTRAINT IF EXISTS founding_member_applications_can_commit_check;

ALTER TABLE founding_member_applications
  ADD CONSTRAINT founding_member_applications_can_commit_check
  CHECK (can_commit IN ('yes', 'sometimes', 'not_sure', 'no', 'unsure'));

-- END
