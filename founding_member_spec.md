# Pattern18 Founding Member Program — Build Spec

**Goal:** Launch a Founding Member program Sunday April 26, 2026. 10 slots (stated publicly), room to quietly accept 3-5 more. Free 6-month access in exchange for weekly feedback, 2 founder calls, and optional day-90 testimonial.

**Strategic purpose (for context, not UI):**
- Generate testimonials/proof (Hormozi lever 4)
- Build word-of-mouth engine (lever 7)
- Capture real product feedback for UX improvements
- Create referral loop via existing Founding Members (lever 7 again)
- Qualify an engaged email/user list (lever 11)

---

## What To Build

### 1. Landing page: `pattern18.com/founding`

**Design:** Matches the new Pattern18 brand system — warm off-white #FAFAF7, teal #2F9D94, Lora serif for headlines, clean minimal layout. Match the existing homepage's visual language.

**Structure top to bottom:**

- **Hero**
  - Eyebrow (small teal caps): `PATTERN18 FOUNDING MEMBERS`
  - Headline: `Help shape the tool you wish you'd had from day one.`
  - Sub: `10 Founding Member spots. 6 months free in exchange for feedback. No cost, no ownership, no strings.`
  - CTA button (solid teal): `Apply to become a Founding Member`
  - Scrolls to/jumps to the application form below

- **"Why I'm doing this" section**
  - Section title: `Why Founding Members?`
  - Body (2 short paragraphs):
    > *"Pattern18 works. But the version I built alone is not the version that will help 10 million parents navigating high-conflict custody. The people who know how to make it better are the ones using it in the middle of real chaos."*
    >
    > *"I'm opening 10 Founding Member spots to a cohort of real survivors. You'll use Pattern18 for your actual day-to-day situation. You'll tell me what works, what's broken, and what's missing. In exchange, you get free access, a locked Founding Member rate for life if you choose to continue after 6 months, and direct input on the roadmap."*
  - Signed: `— Rae, Founder`

- **"What you get" section**
  - Section title: `What Founding Members get`
  - 4 items as a clean grid or stacked cards:
    1. **Free access for 6 months** — Every feature, no cost, no credit card.
    2. **Private Founding Member community** — A dedicated space inside the Pattern18 community for Founding Members only. Weekly office hours, peer support, direct line to me.
    3. **Founding Member rate for life** — After 6 months, if Pattern18 is useful to you, keep your Founding Member pricing locked in. No obligation.
    4. **Your input shapes the product** — Weekly check-ins, two 30-minute calls, and direct feedback loops. What you say changes what gets built.

- **"What we ask in return" section**
  - Section title: `What we ask in return`
  - 4 items as a clean list:
    1. Use Pattern18 for your real situation, not just as a test
    2. A 15-minute weekly check-in (quick form, 5 questions)
    3. Two 30-minute founder calls at day 30 and day 60
    4. At day 90, share a testimonial if Pattern18 has helped — named, first-name-only, or fully anonymous, your choice. Not required.

- **"Who this is for / not for" section**
  - Two columns:
    - **For you if:** Currently navigating high-conflict custody. Comfortable with software. Ready to use Pattern18 for real, not hypothetically. Willing to give honest feedback — both what works and what doesn't.
    - **Not for you right now if:** You're in acute crisis or mid-emergency (you deserve a finished product, not a work-in-progress — the general launch comes later this year). You want only to observe, not actively use.

- **The Application Form** (on this same page, scroll target of the hero CTA)
  - Section title: `Apply to become a Founding Member`
  - Form fields (in this order):
    1. **First name** (required, text, short)
    2. **Email** (required, email validation)
    3. **Where are you in your family court journey?** (required, single select)
       - Pre-filing
       - Active case
       - Post-judgment, active co-parenting
       - Custody order in place, navigating ongoing issues
       - Just navigating high-conflict co-parenting (no active court case)
    4. **What's the single biggest communication or documentation challenge you're dealing with right now?** (required, text area, short answer ~2-3 sentences)
    5. **What have you tried before?** (optional, text area, short answer — apps, journals, spreadsheets, lawyer guidance, etc. and what worked/didn't)
    6. **How comfortable are you with using software?** (required, 1-5 scale)
       - 1 = I struggle with most apps
       - 5 = Very comfortable, I figure things out quickly
    7. **Can you commit to weekly 15-min check-ins and two 30-minute calls over 6 months?** (required, yes/no/unsure)
    8. **Anything else you want me to know?** (optional, text area)
  - Submit button (solid teal): `Submit application`
  - Below button (small text): `I personally review every application. Expect to hear back within 3 days.`

- **Small footer** matching existing Pattern18 footer. No `pro@pattern18.com` — use `hello@pattern18.com` only.

**Mobile:** Responsive. All sections stack cleanly on 375px, 390px, 414px widths. Headline font scales down. Form fields full width on mobile.

---

### 2. Database schema (Supabase)

Create table `founding_member_applications`:

```sql
CREATE TABLE founding_member_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  journey_stage TEXT NOT NULL,
  biggest_challenge TEXT NOT NULL,
  what_tried_before TEXT,
  tech_comfort INTEGER NOT NULL CHECK (tech_comfort BETWEEN 1 AND 5),
  can_commit TEXT NOT NULL CHECK (can_commit IN ('yes', 'no', 'unsure')),
  additional_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'deferred', 'declined', 'onboarded', 'active', 'completed', 'withdrew')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  onboarded_at TIMESTAMPTZ,
  day_30_call_at TIMESTAMPTZ,
  day_60_call_at TIMESTAMPTZ,
  day_90_testimonial_status TEXT CHECK (day_90_testimonial_status IN ('pending', 'provided_named', 'provided_first_name', 'provided_anonymous', 'declined', 'no_response'))
);

CREATE INDEX idx_fm_apps_status ON founding_member_applications(status);
CREATE INDEX idx_fm_apps_email ON founding_member_applications(email);
```

Create table `founding_member_checkins`:

```sql
CREATE TABLE founding_member_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES founding_member_applications(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  opens_this_week TEXT CHECK (opens_this_week IN ('0', '1-3', '4-7', '8+')),
  uses_this_week TEXT[], -- array of what they used it for
  most_helpful TEXT,
  broken_or_confusing TEXT,
  wishes_it_did TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fm_checkins_application ON founding_member_checkins(application_id);
```

RLS policies:
- `founding_member_applications`: admin-only read/write. Public INSERT (for form submissions).
- `founding_member_checkins`: admin-only read/write. Users can INSERT their own check-ins via signed email link (token-based, no login required).

---

### 3. API routes

**POST `/api/founding/apply`** — public endpoint
- Accepts form submission
- Validates fields (email format, required fields, tech_comfort 1-5, can_commit enum)
- Rate-limits by IP (same as existing public routes)
- Inserts into `founding_member_applications` with status='pending'
- Sends confirmation email to applicant via Resend: "We received your Pattern18 Founding Member application"
- Sends notification email to `hello@pattern18.com` with application summary
- Returns 200 + thank-you message

**POST `/api/founding/checkin/[token]`** — public endpoint with token auth
- Token embedded in weekly email link (signed JWT with application_id + week_number)
- Accepts check-in form submission
- Validates token (not expired, matches application)
- Inserts into `founding_member_checkins`
- Returns 200 + thank-you

**GET `/api/founding/admin/applications`** — admin-only
- Returns all applications with filtering by status
- Gated to `hello@pattern18.com` and `christymeek@yahoo.com` only (match existing `/admin/metrics` auth pattern)

**POST `/api/founding/admin/applications/[id]/decision`** — admin-only
- Body: `{ status: 'approved' | 'deferred' | 'declined', admin_notes?: string }`
- Updates application status
- If `approved`:
  - Triggers welcome email (template below)
  - Sets `approved_at` timestamp
  - Schedules day-30 and day-60 check-in emails (via cron or Supabase scheduled function)
  - Schedules day-90 testimonial email
- If `deferred`:
  - Sends "not a fit right now but stay tuned" email
- If `declined`:
  - Sends polite decline email

---

### 4. Admin dashboard at `/admin/founding`

Gated to the two admin emails. Simple UI:

- **Stats header:** Total applications / Pending / Approved / Active / Completed
- **Application list:** Table with columns:
  - First name
  - Email
  - Journey stage
  - Tech comfort (1-5)
  - Created date
  - Status (badge)
  - Actions: [View] [Approve] [Defer] [Decline]
- **Detail view (modal or separate route):** Shows all application fields + admin notes field + status history + (once onboarded) their check-in responses listed by week
- **Check-ins overview:** separate tab showing all check-ins across all Founding Members, filterable by week number, with summary stats (avg open frequency, most common "most helpful" themes)

Visual style: match the rest of the admin panel (existing `/admin/metrics` page as reference).

---

### 5. Email templates via Resend

All emails from `hello@pattern18.com`, Pattern18 brand styled (teal accents, Lora serif headline, warm off-white background).

**A) Application confirmation (sent immediately on form submit)**
- Subject: `We received your Pattern18 Founding Member application`
- Body:
  > Hi [first_name],
  >
  > Thanks for applying to be a Founding Member of Pattern18.
  >
  > I personally read every application. You'll hear back from me within 3 days — whether that's a yes, a "not right now," or a few clarifying questions.
  >
  > In the meantime, if you'd like to get a feel for the community we're building, you're welcome to join our free space at [skool link] while you wait.
  >
  > Talk soon,
  > Rae
  > Founder, Pattern18

**B) Welcome email (sent when admin approves)**
- Subject: `You're in — welcome to Pattern18 Founding Members`
- Body:
  > Hi [first_name],
  >
  > Welcome to the first cohort of Pattern18 Founding Members. This is a short email with everything you need to get started.
  >
  > **Your access**
  > Your free 6-month Founding Member access is active. Log in at pattern18.com and use the email you applied with. If you haven't set a password yet, use the "Forgot password?" link and we'll send you a reset.
  >
  > **Your private Founding Member space**
  > You now have access to a private category inside our Pattern18 community. Join here: [skool link]. Once you join, I'll add you to the Founding Members category within 24 hours.
  >
  > **What happens next**
  > - Week 1-4: Use Pattern18 for your real situation. Document what works, what doesn't, and what you wish it did.
  > - Day 30 (around [date + 30 days]): We'll hop on a 30-minute call. I'll send a scheduling link closer to the date.
  > - Every Sunday: You'll get a 5-question check-in email. Takes 2 minutes.
  > - Day 60 and 90 will follow the same rhythm.
  >
  > **If you get stuck**
  > Reply to this email or tag me in the Founding Members space in Skool. I read everything.
  >
  > Thank you for trusting Pattern18. Let's build something real.
  >
  > — Rae

**C) Weekly check-in email (automated every Sunday 6pm MST while application is active)**
- Subject: `Pattern18 Founding Member — Week [N] check-in (2 min)`
- Body:
  > Hi [first_name],
  >
  > Week [N] check-in. Takes about 2 minutes.
  >
  > [CTA button linking to signed token URL: `Start check-in`]
  >
  > The link is unique to you and good for 7 days.
  >
  > — Rae

**D) Defer email** (sent when admin marks deferred)
- Subject: `About your Pattern18 Founding Member application`
- Body:
  > Hi [first_name],
  >
  > Thanks so much for applying to be a Founding Member.
  >
  > Based on what you shared, I think Pattern18 will serve you better once the general launch is polished and ready. Founding Member is an intensive cohort where we're still fixing bugs and shaping the UX — I'd rather give you a finished product than ask you to help build it.
  >
  > I'll send you early access when general signups open later this year. No need to do anything on your end.
  >
  > In the meantime, our free community is here if you'd like to join: [skool link].
  >
  > Take care,
  > Rae

**E) Decline email** (sent when admin marks declined)
- Subject: `About your Pattern18 Founding Member application`
- Body:
  > Hi [first_name],
  >
  > Thank you for applying to be a Founding Member.
  >
  > This particular cohort isn't the right fit, but that doesn't mean Pattern18 isn't for you. General access opens later this year, and you're welcome to join our free community at [skool link] anytime.
  >
  > Wishing you well,
  > Rae

**F) Day 30 founder call prompt** (sent automatically 28 days after `approved_at`)
- Subject: `Pattern18 Day 30 — let's hop on a call`
- Body:
  > Hi [first_name],
  >
  > You're 30 days into your Founding Member journey. Time for our first call.
  >
  > It's 30 minutes. We'll talk about: what's working, what's frustrating, what you wish Pattern18 did, and where you are in your actual situation.
  >
  > [Scheduling link — Calendly or equivalent]
  >
  > — Rae

**G) Day 60 founder call prompt** (sent automatically 58 days after `approved_at`)
- Similar to Day 30, adjusted for midway context.

**H) Day 90 testimonial ask** (sent automatically 88 days after `approved_at`)
- Subject: `Day 90 — three small asks`
- Body:
  > Hi [first_name],
  >
  > You've been a Founding Member for 90 days. Your access continues for another 3 months, and nothing about that changes no matter how you answer this email.
  >
  > Three asks, all optional:
  >
  > **1. A testimonial.** Two or three sentences about what Pattern18 has done for you. You choose the level of attribution:
  > - Named (full first and last name)
  > - First name only
  > - Fully anonymous
  > Just reply to this email with your words and your choice.
  >
  > **2. A short video.** If you're willing, a 15-minute conversation I could share in marketing. Face on camera, voice only, or blurred — your choice.
  >
  > **3. A referral.** If you know one or two people who might benefit, would you send them my way? They'd get Founding Member pricing. You'd get another 3 months of access added to yours.
  >
  > Zero pressure on any of these. Your access continues regardless.
  >
  > — Rae

---

### 6. Milestone in-app prompts (Hormozi: proof-harvest at wins, not at dates)

In the Pattern18 app itself (post-login), add gentle prompts triggered by user milestones:

- **When a user documents their 10th incident:** show a dismissible card at top of /evidence or /my-case:
  > *"You've documented 10 incidents. If Pattern18 has made this easier than spreadsheets or scattered notes, a short testimonial would help other parents find it. No pressure — click here when you're ready."*
  > [Share testimonial →] [Not now]

- **When a user generates their first court doc:** show a card:
  > *"You just built a court-ready document using your documented patterns. If it saved you time or money, would you share that? Other parents will find Pattern18 because of you."*
  > [Share testimonial →] [Not now]

- **When a user logs in on their 30th day:** show a card:
  > *"30 days with Pattern18. How's it going? Your words could help another parent find this tool."*
  > [Share testimonial →] [Not now]

Dismissed cards don't re-appear for 30 days. Testimonials submitted go into a new `testimonials` table for admin review before any are published.

---

### 7. Referral mechanic (Day 30+)

Add to the Day 30 call prompt email and also in the app:

A Founding Member can invite up to 2 people via a unique referral link (`pattern18.com/founding?ref=[token]`). If their referral applies AND is accepted, the referring member gets 3 extra months of access added automatically.

Implementation:
- Generate unique ref tokens per Founding Member
- `founding_member_applications` gets new columns: `referrer_application_id UUID NULLABLE` and `referrals_sent INT DEFAULT 0`
- When `?ref=[token]` lands on the Founding page, capture it in a cookie/session and attach to the application on submit
- When an application is approved with a referrer_application_id, add 3 months to the referrer's access and email them: "Your referral was approved, you get 3 extra months"

---

### 8. Skool community — private Founding Members category

**This is a MANUAL setup step Christy does in the Skool UI, not code.** Include these instructions in the spec output so she can do it herself:

1. Go to skool.com/comp-4007 → Settings → Categories
2. Create a new category called "Founding Members" 
3. Set visibility to "Private" — only members with the "Founding Member" tag can see it
4. Create a Member Tag called "Founding Member"
5. When approving a Founding Member in the admin dashboard, manually tag them in Skool with "Founding Member" so they see the private category

Christy handles the Skool tagging manually per Founding Member. Not automated for V1.

---

## Workflow

1. Read this entire spec before writing code
2. Build in this order:
   - Database schema + migrations
   - API routes (apply, checkin, admin decision)
   - Landing page at /founding
   - Admin dashboard at /admin/founding
   - Email templates + Resend integration
   - Milestone in-app prompts
   - Referral mechanic
3. Test each piece: form submission works end-to-end, emails send, admin can approve/defer/decline, token-signed check-in links work
4. Run `npx next build`, confirm exit 0
5. Commit in logical chunks (at least: schema, api, landing page, admin, emails, in-app prompts, referrals)
6. Push to main

**Do NOT:**
- Expose admin routes to non-admin users
- Send automated emails during testing — use a DEV_MODE flag that logs instead of sends until Christy toggles it live
- Make the Founding page accessible until Christy says "go live" — use a `FOUNDING_MEMBER_PROGRAM_LIVE=false` env flag that shows a "coming soon" placeholder until flipped

**DO:**
- Match existing brand system (warm off-white, teal, Lora serif)
- Make all email links work on mobile
- Include a way for Christy to manually mark applications "onboarded" after she does Skool tagging
- Report back all commit hashes + a testing checklist for Christy to verify before going live

---

## Decisions Christy has already locked in

- Name: **Founding Member** (always paired with "no cost, no ownership, no strings" in copy)
- Cap: 10 slots publicly, room for up to 15 accepted quietly
- Launch: Sunday April 26, 2026 — all infrastructure must be live and tested by Saturday evening
- Community: use existing Skool (skool.com/comp-4007), private category for Founding Members, not a new community
- Founder signature: "Rae" (pen name), never Christy's real name on any public-facing email or page
- Commitment structure: 6 months free, weekly check-ins, 2 founder calls, optional day-90 testimonial, referral mechanic, in-app milestone prompts
- Admin emails for access gate: `hello@pattern18.com` and `christymeek@yahoo.com`

---

END OF SPEC
