// Founding Member email templates — TEXT-ONLY for now.
// Commit 5 wraps these in branded HTML.
//
// Every template returns { subject, text } so the same shape ships
// today via sendEmail() and gets HTML-decorated later without the
// callers changing.

import { appUrl, founderCalendlyUrl } from './feature-flags';

const SKOOL_URL = 'https://www.skool.com/comp-4007/about';

export interface RenderedEmail {
  subject: string;
  text: string;
}

// A) Application confirmation — sent immediately on form submit
export function applicationConfirmation(firstName: string): RenderedEmail {
  return {
    subject: 'We received your Pattern18 Founding Member application',
    text: `Hi ${firstName},

Thanks for applying to be a Founding Member of Pattern18.

I personally read every application. You'll hear back from me within 3 days, whether that's a yes, a "not right now," or a few clarifying questions.

In the meantime, if you'd like to get a feel for the community we're building, you're welcome to join our free space at ${SKOOL_URL} while you wait.

Talk soon,
Rae
Founder, Pattern18`,
  };
}

// Internal notification email to hello@pattern18.com
export function applicationNotification(args: {
  firstName: string;
  email: string;
  journeyStage: string;
  techComfort: number;
  canCommit: string;
  biggestChallenge: string;
}): RenderedEmail {
  return {
    subject: `New Founding Member application — ${args.firstName} (${args.email})`,
    text: `New Founding Member application received.

Name: ${args.firstName}
Email: ${args.email}
Journey: ${args.journeyStage}
Tech comfort: ${args.techComfort}/5
Commitment: ${args.canCommit}

Biggest challenge:
${args.biggestChallenge}

Review at ${appUrl()}/admin/founding`,
  };
}

// B) Welcome — sent when admin approves
export function welcomeApproved(args: { firstName: string; approvedAt: Date }): RenderedEmail {
  const day30 = new Date(args.approvedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const day30Pretty = day30.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return {
    subject: "You're in — welcome to Pattern18 Founding Members",
    text: `Hi ${args.firstName},

Welcome to the first cohort of Pattern18 Founding Members. This is a short email with everything you need to get started.

YOUR ACCESS
Your free 6-month Founding Member access is active. Log in at ${appUrl()}/login using the email you applied with. If you haven't set a password yet, use the "Forgot password?" link on the login page and we'll send you a reset.

YOUR PRIVATE FOUNDING MEMBER SPACE
You now have access to a private category inside our Pattern18 community. Join here: ${SKOOL_URL}. Once you join, I'll add you to the Founding Members category within 24 hours.

WHAT HAPPENS NEXT
- Week 1-4: Use Pattern18 for your real situation. Document what works, what doesn't, and what you wish it did.
- Day 30 (around ${day30Pretty}): We'll hop on a 30-minute call. I'll send a scheduling link closer to the date.
- Every Sunday: You'll get a 5-question check-in email. Takes 2 minutes.
- Day 60 and 90 will follow the same rhythm.

IF YOU GET STUCK
Reply to this email or tag me in the Founding Members space in Skool. I read everything.

Thank you for trusting Pattern18. Let's build something real.

— Rae`,
  };
}

// C) Weekly check-in
export function weeklyCheckin(args: { firstName: string; weekNumber: number; checkinUrl: string }): RenderedEmail {
  return {
    subject: `Pattern18 Founding Member — Week ${args.weekNumber} check-in (2 min)`,
    text: `Hi ${args.firstName},

Week ${args.weekNumber} check-in. Takes about 2 minutes.

${args.checkinUrl}

The link is unique to you and good for 7 days.

— Rae`,
  };
}

// D) Defer
export function deferredEmail(firstName: string): RenderedEmail {
  return {
    subject: 'About your Pattern18 Founding Member application',
    text: `Hi ${firstName},

Thanks so much for applying to be a Founding Member.

Based on what you shared, I think Pattern18 will serve you better once the general launch is polished and ready. Founding Member is an intensive cohort where we're still fixing bugs and shaping the UX, I'd rather give you a finished product than ask you to help build it.

I'll send you early access when general signups open later this year. No need to do anything on your end.

In the meantime, our free community is here if you'd like to join: ${SKOOL_URL}.

Take care,
Rae`,
  };
}

// E) Decline
export function declinedEmail(firstName: string): RenderedEmail {
  return {
    subject: 'About your Pattern18 Founding Member application',
    text: `Hi ${firstName},

Thank you for applying to be a Founding Member.

This particular cohort isn't the right fit, but that doesn't mean Pattern18 isn't for you. General access opens later this year, and you're welcome to join our free community at ${SKOOL_URL} anytime.

Wishing you well,
Rae`,
  };
}

// F) Day 30 founder call prompt
export function day30CallPrompt(firstName: string): RenderedEmail {
  return {
    subject: 'Pattern18 Day 30 — let\'s hop on a call',
    text: `Hi ${firstName},

You're 30 days into your Founding Member journey. Time for our first call.

It's 30 minutes. We'll talk about: what's working, what's frustrating, what you wish Pattern18 did, and where you are in your actual situation.

${founderCalendlyUrl()}

— Rae`,
  };
}

// G) Day 60 founder call prompt
export function day60CallPrompt(firstName: string): RenderedEmail {
  return {
    subject: 'Pattern18 Day 60 — second call check-in',
    text: `Hi ${firstName},

You're at the midpoint of your Founding Member journey. Time for our second call.

This one is 30 minutes. We'll cover what's changed since Day 30, what's still missing, and what the rest of your 6 months should focus on.

${founderCalendlyUrl()}

— Rae`,
  };
}

// H) Day 90 testimonial ask
export function day90TestimonialAsk(firstName: string): RenderedEmail {
  return {
    subject: 'Day 90 — three small asks',
    text: `Hi ${firstName},

You've been a Founding Member for 90 days. Your access continues for another 3 months, and nothing about that changes no matter how you answer this email.

Three asks, all optional:

1. A testimonial. Two or three sentences about what Pattern18 has done for you. You choose the level of attribution:
   - Named (full first and last name)
   - First name only
   - Fully anonymous
   Just reply to this email with your words and your choice.

2. A short video. If you're willing, a 15-minute conversation I could share in marketing. Face on camera, voice only, or blurred, your choice.

3. A referral. If you know one or two people who might benefit, would you send them my way? They'd get Founding Member pricing. You'd get another 3 months of access added to yours.

Zero pressure on any of these. Your access continues regardless.

— Rae`,
  };
}

// Referral approved bonus notification
export function referralApprovedBonus(firstName: string): RenderedEmail {
  return {
    subject: 'Your Pattern18 referral was approved — 3 extra months added',
    text: `Hi ${firstName},

Someone you referred just got accepted as a Pattern18 Founding Member. As promised, I've added 3 extra months to your access.

Thank you for sending them my way. The community grows because of people like you.

— Rae`,
  };
}
