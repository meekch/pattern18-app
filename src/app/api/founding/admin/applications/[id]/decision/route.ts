import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { isAdminEmail } from '@/lib/feature-flags';
import { sendEmail } from '@/lib/email-send';
import {
  welcomeApproved,
  deferredEmail,
  declinedEmail,
  referralApprovedBonus,
} from '@/lib/founding-emails';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_DECISIONS = ['approved', 'deferred', 'declined'] as const;
type Decision = typeof VALID_DECISIONS[number];

async function requireAdmin(req: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) return null;
  return user.email;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminEmail = await requireAdmin(req);
  if (!adminEmail) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await context.params;
  const body = await req.json();
  const { status, admin_notes } = body ?? {};

  if (!VALID_DECISIONS.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: app, error: fetchErr } = await supabase
    .from('founding_member_applications')
    .select('id, first_name, email, status, referrer_application_id')
    .eq('id', id)
    .single();
  if (fetchErr || !app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

  const now = new Date();
  const update: Record<string, unknown> = {
    status: status as Decision,
    reviewed_at: now.toISOString(),
  };
  if (typeof admin_notes === 'string') update.admin_notes = admin_notes;

  if (status === 'approved') {
    update.approved_at = now.toISOString();
    update.access_expires_at = new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  const { error: updateErr } = await supabase
    .from('founding_member_applications')
    .update(update)
    .eq('id', id);
  if (updateErr) {
    console.error('Founding decision update error:', updateErr);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  // Decision email + referral bonus side-effects
  if (status === 'approved') {
    const welcome = welcomeApproved({ firstName: app.first_name, approvedAt: now });
    await sendEmail({ to: app.email, subject: welcome.subject, text: welcome.text, html: welcome.html });

    // Referral bonus: extend referrer's access_expires_at by 90 days, +1 to referrals_sent
    if (app.referrer_application_id) {
      const { data: ref } = await supabase
        .from('founding_member_applications')
        .select('id, first_name, email, access_expires_at, referrals_sent')
        .eq('id', app.referrer_application_id)
        .single();
      if (ref?.access_expires_at) {
        const newExpiry = new Date(new Date(ref.access_expires_at).getTime() + 90 * 24 * 60 * 60 * 1000);
        await supabase
          .from('founding_member_applications')
          .update({
            access_expires_at: newExpiry.toISOString(),
            referrals_sent: (ref.referrals_sent ?? 0) + 1,
          })
          .eq('id', ref.id);
        const bonus = referralApprovedBonus(ref.first_name);
        await sendEmail({ to: ref.email, subject: bonus.subject, text: bonus.text, html: bonus.html });
      }
    }
  } else if (status === 'deferred') {
    const e = deferredEmail(app.first_name);
    await sendEmail({ to: app.email, subject: e.subject, text: e.text, html: e.html });
  } else if (status === 'declined') {
    const e = declinedEmail(app.first_name);
    await sendEmail({ to: app.email, subject: e.subject, text: e.text, html: e.html });
  }

  return NextResponse.json({ success: true });
}
