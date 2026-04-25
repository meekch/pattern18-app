import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Trigger = '10_incidents' | 'first_court_doc' | 'day_30';

const DISMISS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const userId = await requireAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Active dismissals from the last 30 days
  const sinceIso = new Date(Date.now() - DISMISS_WINDOW_MS).toISOString();
  const { data: dismissedRows } = await supabase
    .from('milestone_prompt_dismissals')
    .select('trigger_event, dismissed_at')
    .eq('user_id', userId)
    .gte('dismissed_at', sinceIso);
  const dismissed = new Set((dismissedRows ?? []).map((d) => d.trigger_event));

  const eligible: Trigger[] = [];

  // 10_incidents
  if (!dismissed.has('10_incidents')) {
    const { count } = await supabase
      .from('incidents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if ((count ?? 0) >= 10) eligible.push('10_incidents');
  }

  // first_court_doc
  if (!dismissed.has('first_court_doc')) {
    const { count } = await supabase
      .from('court_documents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    if ((count ?? 0) >= 1) eligible.push('first_court_doc');
  }

  // day_30 — based on auth user created_at
  if (!dismissed.has('day_30')) {
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);
    if (user?.created_at) {
      const days = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (24 * 60 * 60 * 1000));
      if (days >= 30) eligible.push('day_30');
    }
  }

  return NextResponse.json({ active: eligible });
}
