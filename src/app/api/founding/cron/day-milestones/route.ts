import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email-send';
import {
  day30CallPrompt,
  day60CallPrompt,
  day90TestimonialAsk,
} from '@/lib/founding-emails';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Vercel Cron hits this daily as GET with Authorization: Bearer
// $CRON_SECRET auto-injected. Manual curl with the same header (POST
// or GET) also works.
//
// Sends:
//   - Day 28 since approved_at: day-30 call prompt + sets day_30_call_at
//   - Day 58 since approved_at: day-60 call prompt + sets day_60_call_at
//   - Day 88 since approved_at: day-90 testimonial ask + sets
//     day_90_testimonial_status = 'pending'
//
// Each milestone is gated by its corresponding column being NULL so we
// only send once per applicant per milestone, even if cron runs twice
// the same day or backfills.

async function runCron(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: apps, error } = await supabase
    .from('founding_member_applications')
    .select('id, first_name, email, approved_at, ref_token, day_30_call_at, day_60_call_at, day_90_testimonial_status')
    .in('status', ['onboarded', 'active'])
    .not('approved_at', 'is', null);

  if (error) {
    console.error('Founding cron milestone fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const sent: Array<{ id: string; milestone: '30' | '60' | '90' }> = [];

  for (const app of apps ?? []) {
    if (!app.approved_at) continue;
    const days = Math.floor((now - new Date(app.approved_at).getTime()) / dayMs);

    if (days >= 28 && !app.day_30_call_at) {
      const tpl = day30CallPrompt({ firstName: app.first_name, refToken: app.ref_token });
      const r = await sendEmail({ to: app.email, subject: tpl.subject, text: tpl.text, html: tpl.html });
      if (r.ok) {
        await supabase
          .from('founding_member_applications')
          .update({ day_30_call_at: new Date().toISOString() })
          .eq('id', app.id);
        sent.push({ id: app.id, milestone: '30' });
      }
    }

    if (days >= 58 && !app.day_60_call_at) {
      const tpl = day60CallPrompt(app.first_name);
      const r = await sendEmail({ to: app.email, subject: tpl.subject, text: tpl.text, html: tpl.html });
      if (r.ok) {
        await supabase
          .from('founding_member_applications')
          .update({ day_60_call_at: new Date().toISOString() })
          .eq('id', app.id);
        sent.push({ id: app.id, milestone: '60' });
      }
    }

    if (days >= 88 && !app.day_90_testimonial_status) {
      const tpl = day90TestimonialAsk({ firstName: app.first_name, refToken: app.ref_token });
      const r = await sendEmail({ to: app.email, subject: tpl.subject, text: tpl.text, html: tpl.html });
      if (r.ok) {
        await supabase
          .from('founding_member_applications')
          .update({ day_90_testimonial_status: 'pending' })
          .eq('id', app.id);
        sent.push({ id: app.id, milestone: '90' });
      }
    }
  }

  return NextResponse.json({ ok: true, sent: sent.length, details: sent });
}

export async function GET(req: NextRequest) { return runCron(req); }
export async function POST(req: NextRequest) { return runCron(req); }
