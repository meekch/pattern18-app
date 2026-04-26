-- Pattern18 — in-app feedback table
-- Paste into Supabase SQL Editor. Idempotent.

CREATE TABLE IF NOT EXISTS feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('general', 'feature', 'bug', 'idea')),
  message     TEXT NOT NULL,
  pathname    TEXT,
  user_agent  TEXT,
  email       TEXT,
  status      TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'reviewed', 'actioned', 'archived')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_status      ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_user        ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at  ON feedback(created_at DESC);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Authenticated users can INSERT their own row.
DROP POLICY IF EXISTS "auth_insert_own_feedback" ON feedback;
CREATE POLICY "auth_insert_own_feedback"
  ON feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin emails can SELECT all rows.
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

-- Service-role bypasses RLS automatically; the API route uses it for inserts
-- so it can also persist user_agent / email captured on the server side.

-- END
