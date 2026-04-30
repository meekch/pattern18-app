import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { checkIpRateLimit, checkRateLimit } from '@/lib/rate-limit';
import { sendEmail } from '@/lib/email-send';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Dedicated Feedback form endpoint (Menu → Send feedback).
// Distinct from /api/coach-feedback (chat manual-override path) so we can
// segment form vs chat sources in queries.

const VALID_CATEGORIES = ['bug', 'feature', 'general'] as const;
type Category = typeof VALID_CATEGORIES[number];

const CATEGORY_LABELS: Record<Category, string> = {
  bug: 'Bug',
  feature: 'Feature request',
  general: 'General feedback',
};

const CATEGORY_BADGE_COLOR: Record<Category, string> = {
  bug: '#dc2626',
  feature: '#2F9D94',
  general: '#1A5F5A',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function azTimestamp(d: Date): string {
  const az = new Date(d.getTime() - 7 * 60 * 60 * 1000);
  return az.toISOString().replace('T', ' ').replace('Z', '') + ' AZ (MST, UTC-7)';
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export async function POST(req: NextRequest) {
  try {
    // Auth-optional: most form opens come from logged-in /coach Menu,
    // but the form is a generic feedback channel and should accept
    // anonymous submissions too if reached from a public surface later.
    const cookieClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll() {},
        },
      }
    );
    let user = (await cookieClient.auth.getUser()).data.user;
    if (!user) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const tokenClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data } = await tokenClient.auth.getUser(authHeader.substring(7));
        user = data.user;
      }
    }

    if (user) {
      if (!checkRateLimit(user.id)) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    } else {
      const rl = checkIpRateLimit(req, 'feedback-form', 5);
      if (!rl.ok) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { category, message, email, route } = body ?? {};

    // Validation.
    if (!category || !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Pick a category' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return NextResponse.json({ error: 'Message must be at least a few characters' }, { status: 400 });
    }
    if (message.length > 8000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const cat = category as Category;
    const trimmedMessage = message.trim();
    const safeRoute = typeof route === 'string' && route.length <= 500 ? route : null;
    const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;

    const result = {
      ok: true,
      insertError: null as string | null,
      emailMode: 'dev' as 'dev' | 'live',
      emailError: null as string | null,
    };

    // 1) Insert into pattern18_feedback. Service role bypasses RLS.
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { error } = await supabase.from('pattern18_feedback').insert({
        user_id: user?.id ?? null,
        user_email: email.trim(),
        message_content: trimmedMessage,
        intent_classification: 'form_submission',
        route_when_sent: safeRoute,
        user_agent: userAgent,
      });
      if (error) {
        console.error('pattern18_feedback insert error:', error);
        result.insertError = error.message;
      }
    } catch (err) {
      console.error('pattern18_feedback insert threw:', err);
      result.insertError = err instanceof Error ? err.message : String(err);
    }

    // 2) Send email. Failures here don't block user-facing success if the
    //    DB row landed; conversely, if DB failed but email landed, still
    //    return success. Only fail if BOTH paths failed.
    const preview = trimmedMessage.slice(0, 60).replace(/\s+/g, ' ');
    const subject = `[Pattern18 form] ${CATEGORY_LABELS[cat]}: ${preview}${trimmedMessage.length > 60 ? '\u2026' : ''}`;
    const replyMailto = `<a href="mailto:${escHtml(email.trim())}?subject=Re:%20your%20Pattern18%20feedback" style="color:#1A5F5A;font-weight:600;">Reply to ${escHtml(email.trim())}</a>`;

    const text = `Pattern18 feedback form submission.

Category: ${CATEGORY_LABELS[cat]}
From: ${email.trim()}
User ID: ${user?.id ?? '(anonymous)'}
Route: ${safeRoute ?? '(unknown)'}
Time: ${azTimestamp(new Date())}
User agent: ${userAgent ?? '(unknown)'}

--- Message ---
${trimmedMessage}
--- End message ---

Reply: ${email.trim()}`;

    const html = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;font-family:'Inter',-apple-system,sans-serif;color:#1F2937;font-size:14px;line-height:1.55;">
  <tr><td style="padding:0 0 14px;">
    <span style="display:inline-block;background:${CATEGORY_BADGE_COLOR[cat]};color:#FAFAF7;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">${escHtml(CATEGORY_LABELS[cat])}</span>
  </td></tr>
  <tr><td style="padding:4px 0;"><strong>From:</strong> ${escHtml(email.trim())}</td></tr>
  <tr><td style="padding:4px 0;"><strong>User ID:</strong> ${escHtml(user?.id ?? '(anonymous)')}</td></tr>
  <tr><td style="padding:4px 0;"><strong>Route:</strong> ${escHtml(safeRoute ?? '(unknown)')}</td></tr>
  <tr><td style="padding:4px 0;"><strong>Time:</strong> ${escHtml(azTimestamp(new Date()))}</td></tr>
  <tr><td style="padding:4px 0;color:#6b7280;font-size:12px;"><strong>User agent:</strong> ${escHtml(userAgent ?? '(unknown)')}</td></tr>
</table>
<div style="margin:18px 0;padding:14px 16px;background:#EAF5F3;border-left:3px solid #2F9D94;border-radius:6px;white-space:pre-wrap;line-height:1.55;color:#1F2937;">${escHtml(trimmedMessage)}</div>
<p style="margin:14px 0 0;">${replyMailto}</p>`;

    try {
      const sent = await sendEmail({
        to: 'hello@pattern18.com',
        subject,
        text,
        html,
        replyTo: email.trim(),
      });
      result.emailMode = sent.mode;
      if (!sent.ok) {
        console.error('Feedback form email failed:', sent.error);
        result.emailError = sent.error ?? 'unknown';
      }
    } catch (err) {
      console.error('Feedback form email threw:', err);
      result.emailError = err instanceof Error ? err.message : String(err);
    }

    // Only treat as full failure if BOTH paths failed.
    if (result.insertError && result.emailError) {
      return NextResponse.json(
        { error: 'Could not save feedback. Please try again or email hello@pattern18.com directly.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      emailMode: result.emailMode,
      degraded: !!(result.insertError || result.emailError),
    });
  } catch (error) {
    console.error('feedback route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
