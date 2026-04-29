-- Pattern18 — feedback table alignment to migration 005 spec
-- Paste into Supabase SQL Editor. Idempotent.
--
-- The prod feedback table exists but is missing columns the /api/feedback
-- route writes (pathname, user_agent, email, status). This migration adds
-- whatever's missing without touching existing data, and re-asserts the
-- canonical RLS policies. Safe to run even if all columns are already
-- present.

CREATE TABLE IF NOT EXISTS feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE feedback ADD COLUMN IF NOT EXISTS pathname    TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_agent  TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS email       TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS status      TEXT NOT NULL DEFAULT 'new';

-- Drop and recreate the type CHECK so the four valid values are enforced
-- regardless of what the original constraint allowed.
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_type_check;
ALTER TABLE feedback ADD CONSTRAINT feedback_type_check
  CHECK (type IN ('general', 'feature', 'bug', 'idea'));

ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_status_check;
ALTER TABLE feedback ADD CONSTRAINT feedback_status_check
  CHECK (status IN ('new', 'reviewed', 'actioned', 'archived'));

CREATE INDEX IF NOT EXISTS idx_feedback_status      ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_user        ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at  ON feedback(created_at DESC);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_insert_own_feedback" ON feedback;
CREATE POLICY "auth_insert_own_feedback"
  ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_select_feedback" ON feedback;
CREATE POLICY "admin_select_feedback"
  ON feedback
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'hello@opalitesystems.com',
      'christymeek@yahoo.com'
    )
  );

-- Anonymous (logged-out) inserts now go through the API route running as
-- service role, so no anon RLS policy is needed. The API enforces type and
-- message validation + per-IP rate limiting.

-- END
