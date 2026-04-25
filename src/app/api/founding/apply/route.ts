import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkIpRateLimit } from '@/lib/rate-limit';
import { isFoundingMemberProgramLive } from '@/lib/feature-flags';
import { generateRefToken } from '@/lib/founding-tokens';
import { sendEmail } from '@/lib/email-send';
import { applicationConfirmation, applicationNotification } from '@/lib/founding-emails';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_JOURNEY_STAGES = [
  'pre_filing',
  'active_case',
  'post_judgment_active',
  'order_in_place',
  'high_conflict_no_court',
];

const VALID_COMMIT = ['yes', 'no', 'unsure'];

export async function POST(req: NextRequest) {
  try {
    const rl = checkIpRateLimit(req, 'founding-apply', 5);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!isFoundingMemberProgramLive()) {
      return NextResponse.json(
        { error: 'Founding Member program is not yet live. Check back Sunday April 26.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const {
      first_name,
      email,
      journey_stage,
      biggest_challenge,
      what_tried_before,
      tech_comfort,
      can_commit,
      additional_notes,
      ref_token,
    } = body ?? {};

    // Validation
    if (!first_name || typeof first_name !== 'string' || first_name.trim().length === 0) {
      return NextResponse.json({ error: 'First name is required' }, { status: 400 });
    }
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (!journey_stage || !VALID_JOURNEY_STAGES.includes(journey_stage)) {
      return NextResponse.json({ error: 'Invalid journey stage' }, { status: 400 });
    }
    if (!biggest_challenge || typeof biggest_challenge !== 'string' || biggest_challenge.trim().length === 0) {
      return NextResponse.json({ error: 'Biggest challenge is required' }, { status: 400 });
    }
    if (typeof tech_comfort !== 'number' || tech_comfort < 1 || tech_comfort > 5) {
      return NextResponse.json({ error: 'Tech comfort must be 1-5' }, { status: 400 });
    }
    if (!can_commit || !VALID_COMMIT.includes(can_commit)) {
      return NextResponse.json({ error: 'Invalid commitment value' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Resolve referrer if a token was supplied
    let referrer_application_id: string | null = null;
    if (ref_token && typeof ref_token === 'string') {
      const { data: refRow } = await supabase
        .from('founding_member_applications')
        .select('id')
        .eq('ref_token', ref_token)
        .single();
      if (refRow) referrer_application_id = refRow.id;
    }

    // Generate the new applicant's own ref_token (for them to share later if approved)
    const newRefToken = generateRefToken();

    const insertPayload = {
      first_name: first_name.trim(),
      email: email.toLowerCase().trim(),
      journey_stage,
      biggest_challenge: biggest_challenge.trim(),
      what_tried_before: typeof what_tried_before === 'string' ? what_tried_before.trim() : null,
      tech_comfort,
      can_commit,
      additional_notes: typeof additional_notes === 'string' ? additional_notes.trim() : null,
      ref_token: newRefToken,
      referrer_application_id,
      status: 'pending',
    };

    const { data: inserted, error: insertError } = await supabase
      .from('founding_member_applications')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      // Duplicate email
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'An application with this email already exists.' },
          { status: 409 }
        );
      }
      console.error('Founding apply insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save application' }, { status: 500 });
    }

    // Confirmation email to applicant
    const confirmation = applicationConfirmation(first_name.trim());
    await sendEmail({
      to: email,
      subject: confirmation.subject,
      text: confirmation.text,
    });

    // Notification to admin
    const notification = applicationNotification({
      firstName: first_name.trim(),
      email: email.toLowerCase().trim(),
      journeyStage: journey_stage,
      techComfort: tech_comfort,
      canCommit: can_commit,
      biggestChallenge: biggest_challenge.trim(),
    });
    await sendEmail({
      to: 'hello@pattern18.com',
      subject: notification.subject,
      text: notification.text,
    });

    return NextResponse.json({ success: true, id: inserted?.id });
  } catch (error) {
    console.error('Founding apply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
