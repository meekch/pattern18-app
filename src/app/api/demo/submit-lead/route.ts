import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { checkIpRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.DEMO_SUPABASE_URL!,
  process.env.DEMO_SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const rl = checkIpRateLimit(req, 'submit-lead', 5);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { treatment_interest, prior_experience, timeline, name, phone, email, utm_source, utm_medium, utm_campaign, referrer } = body;

    if (!name || !phone || !email || !treatment_interest) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    // Save lead to Supabase
    const { error: dbError } = await supabase
      .from('leads')
      .insert({
        source: utm_source || 'demo',
        treatment_interest,
        prior_experience,
        timeline,
        name,
        phone,
        email,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        referrer: referrer || null,
      });

    if (dbError) {
      console.error('Lead save error:', dbError);
      return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
    }

    // Send confirmation email via Resend
    try {
      const resend = new Resend(process.env.DEMO_RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject: 'Your Consultation Request Has Been Received',
        text: `Hi ${name},

Thank you for your interest in ${treatment_interest}.

A member of our team will contact you shortly to confirm your personalized consultation.

Warm regards,
Luméa Medical Aesthetics`,
      });
    } catch (emailErr) {
      console.error('Confirmation email error:', emailErr);
      // Don't fail the request if email fails — lead is already saved
    }

    console.log('Lead captured:', { name, email, treatment_interest, timeline });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Submit lead error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
