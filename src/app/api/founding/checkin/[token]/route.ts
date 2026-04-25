import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@/lib/founding-tokens';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_OPENS = ['0', '1-3', '4-7', '8+'];

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const verified = verifyToken(token);
    if (!verified.ok) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 });
    }
    const { application_id, week_number } = verified.payload;

    const body = await req.json();
    const {
      opens_this_week,
      uses_this_week,
      most_helpful,
      broken_or_confusing,
      wishes_it_did,
    } = body ?? {};

    if (opens_this_week && !VALID_OPENS.includes(opens_this_week)) {
      return NextResponse.json({ error: 'Invalid opens value' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Confirm application exists
    const { data: app, error: appErr } = await supabase
      .from('founding_member_applications')
      .select('id, status')
      .eq('id', application_id)
      .single();
    if (appErr || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const { error: insertErr } = await supabase
      .from('founding_member_checkins')
      .insert({
        application_id,
        week_number,
        opens_this_week: opens_this_week || null,
        uses_this_week: Array.isArray(uses_this_week) ? uses_this_week : null,
        most_helpful: typeof most_helpful === 'string' ? most_helpful.trim() : null,
        broken_or_confusing: typeof broken_or_confusing === 'string' ? broken_or_confusing.trim() : null,
        wishes_it_did: typeof wishes_it_did === 'string' ? wishes_it_did.trim() : null,
      });

    if (insertErr) {
      console.error('Founding checkin insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to record check-in' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Founding checkin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  // GET is used by the check-in page to validate the token before showing the form.
  const { token } = await context.params;
  const verified = verifyToken(token);
  if (!verified.ok) {
    return NextResponse.json({ ok: false, reason: verified.reason }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    week_number: verified.payload.week_number,
    application_id: verified.payload.application_id,
  });
}
