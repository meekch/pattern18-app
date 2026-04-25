-- Pattern18 Founding Member Program — Schema
-- Paste into Supabase SQL Editor. Idempotent — safe to re-run.

-- ============================================================
-- 1. founding_member_applications
-- ============================================================
CREATE TABLE IF NOT EXISTS founding_member_applications (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name                  TEXT NOT NULL,
  email                       TEXT NOT NULL UNIQUE,
  journey_stage               TEXT NOT NULL,
  biggest_challenge           TEXT NOT NULL,
  what_tried_before           TEXT,
  tech_comfort                INTEGER NOT NULL CHECK (tech_comfort BETWEEN 1 AND 5),
  can_commit                  TEXT NOT NULL CHECK (can_commit IN ('yes', 'no', 'unsure')),
  additional_notes            TEXT,
  status                      TEXT NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'deferred', 'declined',
                                                  'onboarded', 'active', 'completed', 'withdrew')),
  admin_notes                 TEXT,

  -- Referral mechanic
  ref_token                   TEXT UNIQUE,
  referrer_application_id     UUID REFERENCES founding_member_applications(id) ON DELETE SET NULL,
  referrals_sent              INTEGER NOT NULL DEFAULT 0,

  -- Access window (referral bonus extends this)
  access_expires_at           TIMESTAMPTZ,

  -- Timestamps
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at                 TIMESTAMPTZ,
  approved_at                 TIMESTAMPTZ,
  onboarded_at                TIMESTAMPTZ,
  day_30_call_at              TIMESTAMPTZ,
  day_60_call_at              TIMESTAMPTZ,
  day_90_testimonial_status   TEXT
                                CHECK (day_90_testimonial_status IN
                                       ('pending', 'provided_named', 'provided_first_name',
                                        'provided_anonymous', 'declined', 'no_response'))
);

CREATE INDEX IF NOT EXISTS idx_fm_apps_status    ON founding_member_applications(status);
CREATE INDEX IF NOT EXISTS idx_fm_apps_email     ON founding_member_applications(email);
CREATE INDEX IF NOT EXISTS idx_fm_apps_ref_token ON founding_member_applications(ref_token);

ALTER TABLE founding_member_applications ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically. The policies below cover anon/authenticated.
-- Public anonymous can INSERT (form submission) but not read.
DROP POLICY IF EXISTS "anon_insert_apps" ON founding_member_applications;
CREATE POLICY "anon_insert_apps"
  ON founding_member_applications
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policies for anon or authenticated.
-- Admin reads/writes go through service-role API routes only.


-- ============================================================
-- 2. founding_member_checkins
-- ============================================================
CREATE TABLE IF NOT EXISTS founding_member_checkins (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id      UUID NOT NULL REFERENCES founding_member_applications(id) ON DELETE CASCADE,
  week_number         INTEGER NOT NULL,
  opens_this_week     TEXT CHECK (opens_this_week IN ('0', '1-3', '4-7', '8+')),
  uses_this_week      TEXT[],
  most_helpful        TEXT,
  broken_or_confusing TEXT,
  wishes_it_did       TEXT,
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fm_checkins_application ON founding_member_checkins(application_id);
CREATE INDEX IF NOT EXISTS idx_fm_checkins_week        ON founding_member_checkins(week_number);

ALTER TABLE founding_member_checkins ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies. INSERTs come from the token-auth API
-- route running as service role; SELECT/UPDATE happen via admin routes.


-- ============================================================
-- 3. testimonials
-- ============================================================
CREATE TABLE IF NOT EXISTS testimonials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_event   TEXT NOT NULL CHECK (trigger_event IN ('10_incidents', 'first_court_doc', 'day_30')),
  content         TEXT NOT NULL,
  attribution     TEXT NOT NULL CHECK (attribution IN ('named', 'first_name', 'anonymous')),
  display_name    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_testimonials_status  ON testimonials(status);
CREATE INDEX IF NOT EXISTS idx_testimonials_user    ON testimonials(user_id);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
-- INSERTs go through an authenticated server route running as service role.


-- ============================================================
-- 4. milestone_prompt_dismissals
-- ============================================================
CREATE TABLE IF NOT EXISTS milestone_prompt_dismissals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_event   TEXT NOT NULL CHECK (trigger_event IN ('10_incidents', 'first_court_doc', 'day_30')),
  dismissed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, trigger_event)
);

CREATE INDEX IF NOT EXISTS idx_milestone_dismissals_user ON milestone_prompt_dismissals(user_id);

ALTER TABLE milestone_prompt_dismissals ENABLE ROW LEVEL SECURITY;
-- Server routes write/read via service role.


-- END
