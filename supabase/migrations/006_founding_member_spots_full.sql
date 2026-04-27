-- Pattern18 Founding Member — add spots_full status (cohort-closed waitlist)
-- Paste into Supabase SQL Editor. Idempotent.
--
-- Once all 10 cohort spots are filled, applicants who arrive after that
-- get the "spots_full" treatment (waitlist email + Skool invite) instead
-- of a generic decline. This keeps the cohort closure visible without
-- making latecomers feel rejected.

ALTER TABLE founding_member_applications
  DROP CONSTRAINT IF EXISTS founding_member_applications_status_check;

ALTER TABLE founding_member_applications
  ADD CONSTRAINT founding_member_applications_status_check
  CHECK (status IN (
    'pending',
    'approved',
    'deferred',
    'declined',
    'spots_full',
    'onboarded',
    'active',
    'completed',
    'withdrew'
  ));

-- END
