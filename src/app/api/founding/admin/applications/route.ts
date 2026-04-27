import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { isAdminEmail } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function requireAdmin(req: NextRequest): Promise<{ ok: true; email: string } | { ok: false; status: number; error: string }> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return { ok: false, status: 401, error: 'Unauthorized' };
  if (!isAdminEmail(user.email)) return { ok: false, status: 403, error: 'Forbidden' };
  return { ok: true, email: user.email };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
    .from('founding_member_applications')
    .select('id, first_name, email, journey_stage, biggest_challenge, biggest_challenge_other, what_tried_before, tech_comfort, working_with_attorney, can_commit, additional_notes, status, admin_notes, ref_token, referrer_application_id, referrals_sent, access_expires_at, created_at, reviewed_at, approved_at, onboarded_at, day_30_call_at, day_60_call_at, day_90_testimonial_status')
    .order('created_at', { ascending: false });

  if (statusFilter) query = query.eq('status', statusFilter);

  const { data, error } = await query;
  if (error) {
    console.error('Founding admin list error:', error);
    return NextResponse.json({ error: 'Failed to load applications' }, { status: 500 });
  }

  // Aggregate stats
  const stats = {
    total: 0,
    pending: 0,
    approved: 0,
    deferred: 0,
    declined: 0,
    spots_full: 0,
    onboarded: 0,
    active: 0,
    completed: 0,
    withdrew: 0,
  };
  for (const row of data ?? []) {
    stats.total++;
    if (row.status in stats) (stats as Record<string, number>)[row.status]++;
  }

  return NextResponse.json({ applications: data ?? [], stats });
}
