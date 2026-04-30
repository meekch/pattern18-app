-- Pattern18 — extend pattern18_feedback.intent_classification CHECK
-- Paste into Supabase SQL Editor. Idempotent.
--
-- Adds 'form_submission' as a valid intent_classification value so the
-- new dedicated Feedback form (reachable from Menu → Send feedback) can
-- store its rows alongside chat-detected feedback. Distinguishing the
-- two at write time lets us segment dashboards later (form vs chat).

ALTER TABLE pattern18_feedback
  DROP CONSTRAINT IF EXISTS pattern18_feedback_intent_classification_check;

ALTER TABLE pattern18_feedback
  ADD CONSTRAINT pattern18_feedback_intent_classification_check
  CHECK (intent_classification IN (
    'feedback',
    'manual_override',
    'knowledge',
    'analysis',
    'form_submission'
  ));

-- END
