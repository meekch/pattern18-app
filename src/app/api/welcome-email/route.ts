import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Welcome email error:', error);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
