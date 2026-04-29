-- Pattern18 — unified-coach feedback table
-- Paste into Supabase SQL Editor. Idempotent.
--
-- Captures three intent types from the unified /coach chat:
--   - feedback         : auto-detected by server-side regex
--   - manual_override  : user clicked "Send to Christy" on their own message
--   - knowledge        : optional capture of educational questions for content gap analysis
-- Inserts go through service-role API routes only; no client-side writes.

CREATE TABLE IF NOT EXISTS pattern18_feedback (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               TEXT,
  user_email            TEXT,
  message_content       TEXT NOT NULL,
  intent_classification TEXT NOT NULL CHECK (intent_classification IN
    ('feedback', 'manual_override', 'knowledge', 'analysis')),
  route_when_sent       TEXT,
  user_agent            TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pattern18_feedback_intent     ON pattern18_feedback(intent_classification);
CREATE INDEX IF NOT EXISTS idx_pattern18_feedback_user       ON pattern18_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_pattern18_feedback_created_at ON pattern18_feedback(created_at DESC);

ALTER TABLE pattern18_feedback ENABLE ROW LEVEL SECURITY;

-- No anon or authenticated INSERT policy. The /api/coach-feedback route
-- runs as service role and is the only sanctioned write path.

-- Admin emails can SELECT all rows for review.
DROP POLICY IF EXISTS "admin_select_pattern18_feedback" ON pattern18_feedback;
CREATE POLICY "admin_select_pattern18_feedback"
  ON pattern18_feedback
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') IN (
      'hello@pattern18.com',
      'hello@opalitesystems.com',
      'christymeek@yahoo.com',
      'christy.silvey@gmail.com'
    )
  );

-- END
