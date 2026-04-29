import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { checkRateLimit } from '@/lib/rate-limit';
import { routeFeedback, FeedbackIntent } from '@/lib/feedback-routing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_INTENTS = new Set<FeedbackIntent>([
  'feedback',
  'manual_override',
  'knowledge',
  'analysis',
]);

export async function POST(req: NextRequest) {
  try {
    // Cookie-first auth, Bearer fallback. Auth is required: this endpoint
    // is called from the in-app /coach surface.
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkRateLimit(user.id)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const { message, intent, pathname } = body ?? {};

    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (message.length > 8000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }
    const intentValue: FeedbackIntent = VALID_INTENTS.has(intent as FeedbackIntent)
      ? (intent as FeedbackIntent)
      : 'manual_override';

    const result = await routeFeedback({
      userId: user.id,
      userEmail: user.email ?? null,
      message: message.trim(),
      intent: intentValue,
      pathname: typeof pathname === 'string' && pathname.length <= 500 ? pathname : null,
      userAgent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.insertError || 'Failed to route feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, emailMode: result.emailMode });
  } catch (error) {
    console.error('coach-feedback route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
