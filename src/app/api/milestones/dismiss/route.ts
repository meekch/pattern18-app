import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_TRIGGERS = ['10_incidents', 'first_court_doc', 'day_30'];

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { trigger_event } = await req.json();
  if (!VALID_TRIGGERS.includes(trigger_event)) {
    return NextResponse.json({ error: 'Invalid trigger' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Upsert: refreshes dismissed_at if a row already exists.
  const { error } = await supabase
    .from('milestone_prompt_dismissals')
    .upsert(
      { user_id: userId, trigger_event, dismissed_at: new Date().toISOString() },
      { onConflict: 'user_id,trigger_event' }
    );

  if (error) {
    console.error('Milestone dismiss error:', error);
    return NextResponse.json({ error: 'Failed to record dismissal' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
