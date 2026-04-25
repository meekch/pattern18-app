import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { isAdminEmail } from '@/lib/feature-flags';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function requireAdmin(req: NextRequest) {
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
  if (!user?.email || !isAdminEmail(user.email)) return null;
  return user.email;
}

export async function GET(req: NextRequest) {
  const adminEmail = await requireAdmin(req);
  if (!adminEmail) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const week = searchParams.get('week');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
    .from('founding_member_checkins')
    .select(`
      id, application_id, week_number, opens_this_week, uses_this_week,
      most_helpful, broken_or_confusing, wishes_it_did, submitted_at,
      founding_member_applications!inner(first_name, email)
    `)
    .order('submitted_at', { ascending: false });

  if (week) query = query.eq('week_number', parseInt(week, 10));

  const { data, error } = await query;
  if (error) {
    console.error('Founding admin checkins error:', error);
    return NextResponse.json({ error: 'Failed to load check-ins' }, { status: 500 });
  }

  // Aggregate stats: opens distribution + uses frequency
  const opensCounts: Record<string, number> = { '0': 0, '1-3': 0, '4-7': 0, '8+': 0 };
  const usesCounts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.opens_this_week && row.opens_this_week in opensCounts) {
      opensCounts[row.opens_this_week]++;
    }
    for (const u of row.uses_this_week ?? []) {
      usesCounts[u] = (usesCounts[u] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    checkins: data ?? [],
    stats: {
      total: data?.length ?? 0,
      opens_distribution: opensCounts,
      uses_frequency: Object.entries(usesCounts).sort((a, b) => b[1] - a[1]),
    },
  });
}
