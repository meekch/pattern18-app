// Founding Member email templates — text + branded HTML.
// Email-safe HTML: inline styles, table layouts, fallback fonts (Georgia /
// system-ui), no web fonts (most clients block them).

import { appUrl, founderCalendlyUrl } from './feature-flags';

const SKOOL_URL = 'https://www.skool.com/comp-4007/about';

// Brand tokens (literal hex — must match globals.css in spirit but stay
// inlined because email clients don't honour CSS vars).
const TEAL = '#2F9D94';
const DEEP_TEAL = '#1A5F5A';
const WARM_WHITE = '#FAFAF7';
const CHARCOAL = '#1F2937';
const TEAL_TINT = '#EAF5F3';
const TEAL_BORDER = '#C7E4E0';

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const SANS = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

interface WrapArgs {
  preheader?: string;
  eyebrow?: string;
  headline?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  signed?: boolean; // append "— Rae" stylised signature
}

function wrapEmailHtml(args: WrapArgs): string {
  const eyebrow = args.eyebrow
    ? `<div style="color:${TEAL};font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:14px;">${args.eyebrow}</div>`
    : '';
  const headline = args.headline
    ? `<h1 style="margin:0 0 18px;font-family:${SERIF};font-weight:800;font-size:28px;line-height:1.15;color:${CHARCOAL};letter-spacing:-0.01em;">${args.headline}</h1>`
    : '';
  const cta = args.ctaLabel && args.ctaUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 8px;"><tr><td style="background:${TEAL};border-radius:10px;"><a href="${args.ctaUrl}" style="display:inline-block;padding:14px 26px;color:${WARM_WHITE};font-family:${SANS};font-weight:700;font-size:15px;text-decoration:none;">${args.ctaLabel}</a></td></tr></table>`
    : '';
  const sig = args.signed
    ? `<p style="margin:24px 0 0;font-family:${SERIF};font-style:italic;color:${TEAL};font-size:18px;">— Rae</p>`
    : '';
  const preheader = args.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${WARM_WHITE};opacity:0;">${args.preheader}</div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>Pattern18</title>
</head>
<body style="margin:0;padding:0;background:${WARM_WHITE};font-family:${SANS};color:${CHARCOAL};">
${preheader}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${WARM_WHITE};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:${WARM_WHITE};border:1px solid ${TEAL_BORDER};border-radius:16px;border-top:4px solid ${TEAL};">
        <tr>
          <td style="padding:32px 32px 16px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="background:${TEAL};color:${WARM_WHITE};width:44px;height:44px;border-radius:10px;text-align:center;font-family:${SERIF};font-weight:800;font-size:18px;vertical-align:middle;">18</td>
                <td style="padding-left:12px;font-family:${SERIF};font-weight:700;font-size:18px;color:${CHARCOAL};">Pattern18</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 32px;">
            ${eyebrow}
            ${headline}
            <div style="font-family:${SANS};font-size:15px;line-height:1.65;color:${CHARCOAL};">
              ${args.bodyHtml}
            </div>
            ${cta}
            ${sig}
          </td>
        </tr>
      </table>
      <p style="margin:18px 0 0;font-family:${SANS};font-size:12px;color:${CHARCOAL};opacity:0.55;">
        Pattern18 · pattern18.com · hello@pattern18.com
      </p>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// Tiny escaping helper for user-provided strings inside HTML.
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Convert plain-text paragraphs (separated by blank lines) into <p> tags.
function paragraphsToHtml(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => `<p style="margin:0 0 14px;">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// =============================================================
// A) Application confirmation
// =============================================================
export function applicationConfirmation(firstName: string): RenderedEmail {
  const text = `Hi ${firstName},

Thanks for applying to be a Founding Member of Pattern18.

I personally read every application. You'll hear back from me within 3 days, whether that's a yes, a "not right now," or a few clarifying questions.

In the meantime, if you'd like to get a feel for the community we're building, you're welcome to join our free space at ${SKOOL_URL} while you wait.

Talk soon,
Rae
Founder, Pattern18`;

  const bodyHtml = `
<p style="margin:0 0 14px;">Hi ${esc(firstName)},</p>
<p style="margin:0 0 14px;">Thanks for applying to be a Founding Member of Pattern18.</p>
<p style="margin:0 0 14px;">I personally read every application. You'll hear back from me within 3 days, whether that's a yes, a "not right now," or a few clarifying questions.</p>
<p style="margin:0 0 14px;">In the meantime, if you'd like to get a feel for the community we're building, you're welcome to <a href="${SKOOL_URL}" style="color:${DEEP_TEAL};font-weight:600;">join our free space</a> while you wait.</p>
<p style="margin:0 0 14px;">Talk soon,<br>Rae<br><span style="color:${CHARCOAL};opacity:0.6;">Founder, Pattern18</span></p>`;

  return {
    subject: 'We received your Pattern18 Founding Member application',
    text,
    html: wrapEmailHtml({
      preheader: "I'll personally read your application. Hearing back within 3 days.",
      eyebrow: 'Founding Member application',
      headline: 'Application received.',
      bodyHtml,
    }),
  };
}

// =============================================================
// Internal admin notification
// =============================================================
export function applicationNotification(args: {
  firstName: string;
  email: string;
  journeyStage: string;
  techComfort: number;
  canCommit: string;
  biggestChallenge: string;
}): RenderedEmail {
  const text = `New Founding Member application received.

Name: ${args.firstName}
Email: ${args.email}
Journey: ${args.journeyStage}
Tech comfort: ${args.techComfort}/5
Commitment: ${args.canCommit}

Biggest challenge:
${args.biggestChallenge}

Review at ${appUrl()}/admin/founding`;

  const bodyHtml = `
<p style="margin:0 0 14px;">New Founding Member application received.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px;font-size:14px;">
  <tr><td style="padding:4px 12px 4px 0;color:${CHARCOAL};opacity:0.6;">Name</td><td style="padding:4px 0;"><strong>${esc(args.firstName)}</strong></td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:${CHARCOAL};opacity:0.6;">Email</td><td style="padding:4px 0;">${esc(args.email)}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:${CHARCOAL};opacity:0.6;">Journey</td><td style="padding:4px 0;">${esc(args.journeyStage)}</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:${CHARCOAL};opacity:0.6;">Tech comfort</td><td style="padding:4px 0;">${args.techComfort}/5</td></tr>
  <tr><td style="padding:4px 12px 4px 0;color:${CHARCOAL};opacity:0.6;">Can commit</td><td style="padding:4px 0;">${esc(args.canCommit)}</td></tr>
</table>
<p style="margin:0 0 6px;font-weight:600;">Biggest challenge:</p>
<p style="margin:0 0 14px;background:${TEAL_TINT};border-radius:8px;padding:12px;">${esc(args.biggestChallenge).replace(/\n/g, '<br>')}</p>`;

  return {
    subject: `New Founding Member application — ${args.firstName} (${args.email})`,
    text,
    html: wrapEmailHtml({
      eyebrow: 'Pattern18 admin',
      headline: 'New application',
      bodyHtml,
      ctaLabel: 'Review in admin dashboard',
      ctaUrl: `${appUrl()}/admin/founding`,
    }),
  };
}

// =============================================================
// B) Welcome (approved)
// =============================================================
export function welcomeApproved(args: {
  firstName: string;
  approvedAt: Date;
  refToken?: string | null;
}): RenderedEmail {
  // approvedAt no longer needed for body copy after the call requirement was
  // dropped, but kept on the args interface for future scheduled-content use.
  void args.approvedAt;
  const refUrl = args.refToken ? `${appUrl()}/founding?ref=${args.refToken}` : null;

  const text = `Hi ${args.firstName},

Welcome to the first cohort of Pattern18 Founding Members. This is a short email with everything you need to get started.

YOUR ACCESS
Your free 6-month Founding Member access is active. Log in at ${appUrl()}/login using the email you applied with. If you haven't set a password yet, use the "Forgot password?" link on the login page and we'll send you a reset.

YOUR PRIVATE FOUNDING MEMBER SPACE
You now have access to a private category inside our Pattern18 community. Join here: ${SKOOL_URL}. Once you join, I'll add you to the Founding Members category within 24 hours.

WHAT HAPPENS NEXT
- Use Pattern18 for your real situation. Document what works, what doesn't, and what you wish it did.
- Every Sunday: a 5-question check-in email. Takes 2 minutes.
- Day 30 and Day 60: short async check-ins from me — no call required.
- Day 90: I'll ask if you'd be willing to share a testimonial or refer someone. Optional.

OFFICE HOURS
If you ever want to talk live, my office hours calendar is here: ${founderCalendlyUrl()}. Optional, never required.

${refUrl ? `YOUR REFERRAL LINK
You can invite up to 2 people who'd be a fit. If they apply and get accepted, I'll add 3 extra months to your access automatically.

Your unique link: ${refUrl}

` : ''}IF YOU GET STUCK
Reply to this email or tag me in the Founding Members space in Skool. I read everything.

Thank you for trusting Pattern18. Let's build something real.

— Rae`;

  const refSection = refUrl
    ? `
<h2 style="margin:24px 0 8px;font-family:${SERIF};font-weight:700;font-size:18px;color:${CHARCOAL};">Your referral link</h2>
<p style="margin:0 0 8px;">You can invite up to 2 people who'd be a fit. If they apply and get accepted, I'll add 3 extra months to your access automatically.</p>
<p style="margin:0 0 14px;background:${TEAL_TINT};border:1px solid ${TEAL_BORDER};border-radius:8px;padding:10px 12px;font-family:'SF Mono', Menlo, Consolas, monospace;font-size:13px;word-break:break-all;"><a href="${refUrl}" style="color:${DEEP_TEAL};">${refUrl}</a></p>`
    : '';

  const bodyHtml = `
<p style="margin:0 0 14px;">Hi ${esc(args.firstName)},</p>
<p style="margin:0 0 14px;">Welcome to the first cohort of Pattern18 Founding Members. This is a short email with everything you need to get started.</p>

<h2 style="margin:24px 0 8px;font-family:${SERIF};font-weight:700;font-size:18px;color:${CHARCOAL};">Your access</h2>
<p style="margin:0 0 14px;">Your free 6-month Founding Member access is active. <a href="${appUrl()}/login" style="color:${DEEP_TEAL};font-weight:600;">Log in here</a> using the email you applied with. If you haven't set a password yet, use the "Forgot password?" link on the login page and we'll send you a reset.</p>

<h2 style="margin:24px 0 8px;font-family:${SERIF};font-weight:700;font-size:18px;color:${CHARCOAL};">Your private Founding Member space</h2>
<p style="margin:0 0 14px;">You now have access to a private category inside our Pattern18 community. <a href="${SKOOL_URL}" style="color:${DEEP_TEAL};font-weight:600;">Join the community</a>. Once you join, I'll add you to the Founding Members category within 24 hours.</p>

<h2 style="margin:24px 0 8px;font-family:${SERIF};font-weight:700;font-size:18px;color:${CHARCOAL};">What happens next</h2>
<ul style="margin:0 0 14px;padding-left:20px;">
  <li style="margin-bottom:6px;">Use Pattern18 for your real situation. Document what works, what doesn't, and what you wish it did.</li>
  <li style="margin-bottom:6px;"><strong>Every Sunday:</strong> a 5-question check-in email. Takes 2 minutes.</li>
  <li style="margin-bottom:6px;"><strong>Day 30 and Day 60:</strong> short async check-ins from me, no call required.</li>
  <li style="margin-bottom:6px;"><strong>Day 90:</strong> I'll ask if you'd be willing to share a testimonial or refer someone. Optional.</li>
</ul>

<h2 style="margin:24px 0 8px;font-family:${SERIF};font-weight:700;font-size:18px;color:${CHARCOAL};">Office hours</h2>
<p style="margin:0 0 14px;">If you ever want to talk live, <a href="${founderCalendlyUrl()}" style="color:${DEEP_TEAL};font-weight:600;">my office hours calendar is here</a>. Optional, never required.</p>
${refSection}
<h2 style="margin:24px 0 8px;font-family:${SERIF};font-weight:700;font-size:18px;color:${CHARCOAL};">If you get stuck</h2>
<p style="margin:0 0 14px;">Reply to this email or tag me in the Founding Members space in Skool. I read everything.</p>

<p style="margin:0 0 14px;">Thank you for trusting Pattern18. Let's build something real.</p>`;

  return {
    subject: "You're in — welcome to Pattern18 Founding Members",
    text,
    html: wrapEmailHtml({
      preheader: 'Your free 6-month access is active.',
      eyebrow: 'Founding Member · Welcome',
      headline: "You're in.",
      bodyHtml,
      ctaLabel: 'Log in to Pattern18',
      ctaUrl: `${appUrl()}/login`,
      signed: true,
    }),
  };
}

// =============================================================
// C) Weekly check-in
// =============================================================
export function weeklyCheckin(args: { firstName: string; weekNumber: number; checkinUrl: string }): RenderedEmail {
  const text = `Hi ${args.firstName},

Week ${args.weekNumber} check-in. Takes about 2 minutes.

${args.checkinUrl}

The link is unique to you and good for 7 days.

— Rae`;

  const bodyHtml = `
<p style="margin:0 0 14px;">Hi ${esc(args.firstName)},</p>
<p style="margin:0 0 14px;">Week ${args.weekNumber} check-in. Takes about 2 minutes.</p>
<p style="margin:0 0 14px;color:${CHARCOAL};opacity:0.6;font-size:13px;">The link is unique to you and good for 7 days.</p>`;

  return {
    subject: `Pattern18 Founding Member — Week ${args.weekNumber} check-in (2 min)`,
    text,
    html: wrapEmailHtml({
      preheader: 'Five questions, two minutes.',
      eyebrow: `Week ${args.weekNumber} · Founding Member`,
      headline: 'Quick check-in.',
      bodyHtml,
      ctaLabel: 'Start check-in',
      ctaUrl: args.checkinUrl,
      signed: true,
    }),
  };
}

// =============================================================
// D) Defer
// =============================================================
export function deferredEmail(firstName: string): RenderedEmail {
  const text = `Hi ${firstName},

Thanks so much for applying to be a Founding Member.

Based on what you shared, I think Pattern18 will serve you better once the general launch is polished and ready. Founding Member is an intensive cohort where we're still fixing bugs and shaping the UX, I'd rather give you a finished product than ask you to help build it.

I'll send you early access when general signups open later this year. No need to do anything on your end.

In the meantime, our free community is here if you'd like to join: ${SKOOL_URL}.

Take care,
Rae`;

  const bodyHtml = `
<p style="margin:0 0 14px;">Hi ${esc(firstName)},</p>
<p style="margin:0 0 14px;">Thanks so much for applying to be a Founding Member.</p>
<p style="margin:0 0 14px;">Based on what you shared, I think Pattern18 will serve you better once the general launch is polished and ready. Founding Member is an intensive cohort where we're still fixing bugs and shaping the UX, I'd rather give you a finished product than ask you to help build it.</p>
<p style="margin:0 0 14px;">I'll send you early access when general signups open later this year. No need to do anything on your end.</p>
<p style="margin:0 0 14px;">In the meantime, <a href="${SKOOL_URL}" style="color:${DEEP_TEAL};font-weight:600;">our free community is here</a> if you'd like to join.</p>
<p style="margin:0 0 14px;">Take care,<br>Rae</p>`;

  return {
    subject: 'About your Pattern18 Founding Member application',
    text,
    html: wrapEmailHtml({
      eyebrow: 'Founding Member',
      headline: 'A note on your application.',
      bodyHtml,
    }),
  };
}

// =============================================================
// E) Decline
// =============================================================
export function declinedEmail(firstName: string): RenderedEmail {
  const text = `Hi ${firstName},

Thank you for applying to be a Founding Member.

This particular cohort isn't the right fit, but that doesn't mean Pattern18 isn't for you. General access opens later this year, and you're welcome to join our free community at ${SKOOL_URL} anytime.

Wishing you well,
Rae`;

  const bodyHtml = `
<p style="margin:0 0 14px;">Hi ${esc(firstName)},</p>
<p style="margin:0 0 14px;">Thank you for applying to be a Founding Member.</p>
<p style="margin:0 0 14px;">This particular cohort isn't the right fit, but that doesn't mean Pattern18 isn't for you. General access opens later this year, and <a href="${SKOOL_URL}" style="color:${DEEP_TEAL};font-weight:600;">you're welcome to join our free community</a> anytime.</p>
<p style="margin:0 0 14px;">Wishing you well,<br>Rae</p>`;

  return {
    subject: 'About your Pattern18 Founding Member application',
    text,
    html: wrapEmailHtml({
      eyebrow: 'Founding Member',
      headline: 'A note on your application.',
      bodyHtml,
    }),
  };
}

// =============================================================
// F) Day 30 — async check-in (calls are now optional)
// =============================================================
export function day30CheckIn(args: { firstName: string; checkinUrl: string }): RenderedEmail {
  const calendly = founderCalendlyUrl();

  const text = `Hi ${args.firstName},

You're 30 days in. Thank you for being part of this first cohort, your feedback is shaping every release.

A few quick things, all optional:

- If you haven't filled out a weekly check-in lately, here's the current one: ${args.checkinUrl}
- If you ever want to talk live, my office hours calendar is here: ${calendly}
- Is there anything specific you wish Pattern18 did better? Just hit reply.

— Rae`;

  const bodyHtml = `
<p style="margin:0 0 14px;">Hi ${esc(args.firstName)},</p>
<p style="margin:0 0 14px;">You're 30 days in. Thank you for being part of this first cohort, your feedback is shaping every release.</p>
<p style="margin:0 0 8px;font-weight:600;">A few quick things, all optional:</p>
<ul style="margin:0 0 14px;padding-left:20px;">
  <li style="margin-bottom:8px;">If you haven't filled out a weekly check-in lately, <a href="${args.checkinUrl}" style="color:${DEEP_TEAL};font-weight:600;">here's the current one</a>.</li>
  <li style="margin-bottom:8px;">If you ever want to talk live, <a href="${calendly}" style="color:${DEEP_TEAL};font-weight:600;">my office hours calendar is here</a>.</li>
  <li style="margin-bottom:8px;">Is there anything specific you wish Pattern18 did better? Just hit reply.</li>
</ul>`;

  return {
    subject: 'Pattern18 Day 30 — quick check-in',
    text,
    html: wrapEmailHtml({
      preheader: 'Async check-in, all optional.',
      eyebrow: 'Day 30 · Founding Member',
      headline: 'Quick check-in.',
      bodyHtml,
      signed: true,
    }),
  };
}

// =============================================================
// G) Day 60 — async check-in (calls are now optional)
// =============================================================
export function day60CheckIn(args: { firstName: string; checkinUrl: string }): RenderedEmail {
  const calendly = founderCalendlyUrl();

  const text = `Hi ${args.firstName},

You're at the midpoint. The product is better than it was 60 days ago because of you.

A few quick things, all optional:

- This week's check-in (if you haven't done it yet): ${args.checkinUrl}
- Office hours calendar if you'd like to talk: ${calendly}
- What's the one thing Pattern18 still doesn't do well? Reply with whatever comes to mind.

— Rae`;

  const bodyHtml = `
<p style="margin:0 0 14px;">Hi ${esc(args.firstName)},</p>
<p style="margin:0 0 14px;">You're at the midpoint. The product is better than it was 60 days ago because of you.</p>
<p style="margin:0 0 8px;font-weight:600;">A few quick things, all optional:</p>
<ul style="margin:0 0 14px;padding-left:20px;">
  <li style="margin-bottom:8px;"><a href="${args.checkinUrl}" style="color:${DEEP_TEAL};font-weight:600;">This week's check-in</a> if you haven't done it yet.</li>
  <li style="margin-bottom:8px;"><a href="${calendly}" style="color:${DEEP_TEAL};font-weight:600;">Office hours calendar</a> if you'd like to talk.</li>
  <li style="margin-bottom:8px;">What's the one thing Pattern18 still doesn't do well? Reply with whatever comes to mind.</li>
</ul>`;

  return {
    subject: 'Pattern18 Day 60 — halfway check-in',
    text,
    html: wrapEmailHtml({
      preheader: 'Halfway. All optional, no call required.',
      eyebrow: 'Day 60 · Founding Member',
      headline: 'Halfway check-in.',
      bodyHtml,
      signed: true,
    }),
  };
}

// =============================================================
// H) Day 90 testimonial ask
// =============================================================
export function day90TestimonialAsk(args: { firstName: string; refToken?: string | null }): RenderedEmail {
  const firstName = args.firstName;
  const refUrl = args.refToken ? `${appUrl()}/founding?ref=${args.refToken}` : null;
  const text = `Hi ${firstName},

You've been a Founding Member for 90 days. Your access continues for another 3 months, and nothing about that changes no matter how you answer this email.

Three asks, all optional:

1. A testimonial. Two or three sentences about what Pattern18 has done for you. You choose the level of attribution:
   - Named (full first and last name)
   - First name only
   - Fully anonymous
   Just reply to this email with your words and your choice.

2. A short video. If you're willing, a 15-minute conversation I could share in marketing. Face on camera, voice only, or blurred, your choice.

3. A referral. If you know one or two people who might benefit, would you send them my way? They'd get Founding Member pricing. You'd get another 3 months of access added to yours.

${refUrl ? `Your unique referral link: ${refUrl}

` : ''}Zero pressure on any of these. Your access continues regardless.

— Rae`;

  const refLine = refUrl
    ? `\n  <p style="margin:8px 0 0;">Your unique link: <a href="${refUrl}" style="color:${DEEP_TEAL};word-break:break-all;">${refUrl}</a></p>`
    : '';

  const bodyHtml = `
<p style="margin:0 0 14px;">Hi ${esc(firstName)},</p>
<p style="margin:0 0 14px;">You've been a Founding Member for 90 days. Your access continues for another 3 months, and nothing about that changes no matter how you answer this email.</p>
<p style="margin:18px 0 12px;font-weight:600;">Three asks, all optional:</p>
<div style="background:${TEAL_TINT};border-radius:10px;padding:16px;margin-bottom:14px;">
  <p style="margin:0 0 6px;font-weight:700;color:${DEEP_TEAL};">1. A testimonial.</p>
  <p style="margin:0 0 6px;">Two or three sentences about what Pattern18 has done for you. You choose the level of attribution:</p>
  <ul style="margin:0;padding-left:20px;">
    <li>Named (full first and last name)</li>
    <li>First name only</li>
    <li>Fully anonymous</li>
  </ul>
  <p style="margin:6px 0 0;">Just reply to this email with your words and your choice.</p>
</div>
<div style="background:${TEAL_TINT};border-radius:10px;padding:16px;margin-bottom:14px;">
  <p style="margin:0 0 6px;font-weight:700;color:${DEEP_TEAL};">2. A short video.</p>
  <p style="margin:0;">If you're willing, a 15-minute conversation I could share in marketing. Face on camera, voice only, or blurred, your choice.</p>
</div>
<div style="background:${TEAL_TINT};border-radius:10px;padding:16px;margin-bottom:14px;">
  <p style="margin:0 0 6px;font-weight:700;color:${DEEP_TEAL};">3. A referral.</p>
  <p style="margin:0;">If you know one or two people who might benefit, would you send them my way? They'd get Founding Member pricing. You'd get another 3 months of access added to yours.</p>${refLine}
</div>
<p style="margin:0 0 14px;">Zero pressure on any of these. Your access continues regardless.</p>`;

  return {
    subject: 'Day 90 — three small asks',
    text,
    html: wrapEmailHtml({
      preheader: 'All optional. Your access continues regardless.',
      eyebrow: 'Day 90 · Founding Member',
      headline: 'Three small asks.',
      bodyHtml,
      signed: true,
    }),
  };
}

// =============================================================
// Referral approved bonus
// =============================================================
export function referralApprovedBonus(firstName: string): RenderedEmail {
  const text = `Hi ${firstName},

Someone you referred just got accepted as a Pattern18 Founding Member. As promised, I've added 3 extra months to your access.

Thank you for sending them my way. The community grows because of people like you.

— Rae`;

  const bodyHtml = `
<p style="margin:0 0 14px;">Hi ${esc(firstName)},</p>
<p style="margin:0 0 14px;">Someone you referred just got accepted as a Pattern18 Founding Member. As promised, I've added <strong>3 extra months</strong> to your access.</p>
<p style="margin:0 0 14px;">Thank you for sending them my way. The community grows because of people like you.</p>`;

  return {
    subject: 'Your Pattern18 referral was approved — 3 extra months added',
    text,
    html: wrapEmailHtml({
      preheader: 'Your referral was approved. 3 extra months added.',
      eyebrow: 'Founding Member · Referral',
      headline: 'Your referral was accepted.',
      bodyHtml,
      ctaLabel: 'Open Pattern18',
      ctaUrl: appUrl(),
      signed: true,
    }),
  };
}

// Reserved for the (commit-6) testimonial milestone prompts. Kept here so
// the same wrapEmailHtml/SERIF/SANS infrastructure is shared.
export const _internal_paragraphsToHtml = paragraphsToHtml;
