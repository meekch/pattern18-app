import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signWeeklyCheckin } from '@/lib/founding-tokens';
import { sendEmail } from '@/lib/email-send';
import { weeklyCheckin } from '@/lib/founding-emails';
import { appUrl } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Vercel Cron should hit this weekly (Sun 6pm MST = Mon 01:00 UTC).
// Auth via Bearer CRON_SECRET header.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // All applications currently in the program window
  const { data: apps, error } = await supabase
    .from('founding_member_applications')
    .select('id, first_name, email, approved_at, access_expires_at')
    .in('status', ['onboarded', 'active'])
    .not('approved_at', 'is', null);

  if (error) {
    console.error('Founding cron weekly fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }

  const now = Date.now();
  const sent: string[] = [];
  const skipped: Array<{ id: string; reason: string }> = [];

  for (const app of apps ?? []) {
    if (!app.approved_at) {
      skipped.push({ id: app.id, reason: 'no approved_at' });
      continue;
    }
    if (app.access_expires_at && new Date(app.access_expires_at).getTime() < now) {
      skipped.push({ id: app.id, reason: 'access expired' });
      continue;
    }
    const days = Math.floor((now - new Date(app.approved_at).getTime()) / (24 * 60 * 60 * 1000));
    const week = Math.max(1, Math.floor(days / 7) + 1);

    const token = signWeeklyCheckin(app.id, week);
    const checkinUrl = `${appUrl()}/founding/checkin/${token}`;
    const tpl = weeklyCheckin({ firstName: app.first_name, weekNumber: week, checkinUrl });
    const result = await sendEmail({ to: app.email, subject: tpl.subject, text: tpl.text, html: tpl.html });
    if (result.ok) sent.push(app.id);
    else skipped.push({ id: app.id, reason: result.error ?? 'send failed' });
  }

  return NextResponse.json({ ok: true, sent: sent.length, skipped: skipped.length, details: { sent, skipped } });
}
