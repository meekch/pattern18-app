import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  console.log('RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
  try {
    const userId = await requireAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

    // Check if welcome email already sent for this user
    const { data: profile } = await supabase
      .from('profiles')
      .select('welcome_email_sent')
      .eq('id', userId)
      .single();

    if (profile?.welcome_email_sent) {
      console.log('Welcome email already sent for user:', userId);
      return NextResponse.json({ success: true, skipped: true });
    }

    // Mark as sent BEFORE sending (prevents race condition with concurrent requests)
    await supabase
      .from('profiles')
      .upsert({ id: userId, welcome_email_sent: true }, { onConflict: 'id' });

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Pattern 18 <hello@pattern18.com>',
      to: email,
      subject: 'Your first 60 seconds in Pattern 18',
      text: `You just took the hardest step — you signed up.

Here's how to use Pattern 18 in 60 seconds:

1. Open the app: https://pattern18.com/coach
2. Paste the last message from your co-parent
3. Hit send

Pattern 18 will name the manipulation tactic, give you a response to copy/paste, and save it as evidence automatically.

That's it. You just started building your case.

You have 7 days free. Every message you analyze makes your evidence stronger.

- Pattern 18`
    });

    console.log('Welcome email sent to:', email);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Welcome email error:', error);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
