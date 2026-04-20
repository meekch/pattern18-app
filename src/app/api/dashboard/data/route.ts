import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function scoreLead(lead: Record<string, unknown>): number {
  let score = 5;
  const timeline = (lead.timeline as string || '').toLowerCase();
  if (timeline.includes('1') && timeline.includes('2') && timeline.includes('week')) score += 3;
  else if (timeline.includes('month')) score += 1.5;
  else if (timeline.includes('exploring') || timeline.includes('option')) score -= 1;

  if (lead.phone) score += 1;
  if (lead.prior_experience === 'Yes') score += 0.5;

  const treatment = (lead.treatment_interest as string || '').toLowerCase();
  if (treatment && !treatment.includes('guidance') && !treatment.includes('not sure')) score += 0.5;

  return Math.max(1, Math.min(10, score));
}

function revenueEstimate(treatment: string): number {
  const t = (treatment || '').toLowerCase();
  if (t.includes('botox') || t.includes('injectable')) return 500;
  if (t.includes('filler')) return 800;
  if (t.includes('laser')) return 1200;
  if (t.includes('body') || t.includes('contour')) return 2250;
  return 500;
}

function isAfterHours(dateStr: string): boolean {
  const d = new Date(dateStr);
  const hour = d.getUTCHours();
  // After hours = before 9am or after 6pm UTC (approximate)
  return hour < 9 || hour >= 18;
}

function isThisWeek(dateStr: string): boolean {
  const now = new Date();
  const d = new Date(dateStr);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

function isLastWeek(dateStr: string): boolean {
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  const d = new Date(dateStr);
  return d >= startOfLastWeek && d < startOfThisWeek;
}

export async function POST(req: NextRequest) {
  try {
    const dashboardKey = req.headers.get('x-dashboard-key');
    if (!dashboardKey || dashboardKey !== process.env.DASHBOARD_ACCESS_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.DEMO_SUPABASE_URL!,
      process.env.DEMO_SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: leads, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Dashboard data fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }

    const allLeads = leads || [];

    // Score each lead
    const scoredLeads = allLeads.map(lead => ({
      ...lead,
      quality_score: scoreLead(lead),
      revenue: revenueEstimate(lead.treatment_interest),
      after_hours: isAfterHours(lead.created_at),
    }));

    // KPIs
    const thisWeekLeads = scoredLeads.filter(l => isThisWeek(l.created_at));
    const lastWeekLeads = scoredLeads.filter(l => isLastWeek(l.created_at));

    const avgScore = scoredLeads.length > 0
      ? scoredLeads.reduce((sum, l) => sum + l.quality_score, 0) / scoredLeads.length
      : 0;
    const avgScoreThisWeek = thisWeekLeads.length > 0
      ? thisWeekLeads.reduce((sum, l) => sum + l.quality_score, 0) / thisWeekLeads.length
      : 0;
    const avgScoreLastWeek = lastWeekLeads.length > 0
      ? lastWeekLeads.reduce((sum, l) => sum + l.quality_score, 0) / lastWeekLeads.length
      : 0;

    const totalRevenue = scoredLeads.reduce((sum, l) => sum + l.revenue, 0);
    const revenueThisWeek = thisWeekLeads.reduce((sum, l) => sum + l.revenue, 0);
    const revenueLastWeek = lastWeekLeads.reduce((sum, l) => sum + l.revenue, 0);

    const afterHoursTotal = scoredLeads.filter(l => l.after_hours).length;
    const afterHoursThisWeek = thisWeekLeads.filter(l => l.after_hours).length;
    const afterHoursLastWeek = lastWeekLeads.filter(l => l.after_hours).length;

    const kpis = {
      total_leads: scoredLeads.length,
      total_leads_this_week: thisWeekLeads.length,
      total_leads_last_week: lastWeekLeads.length,
      avg_quality: Math.round(avgScore * 10) / 10,
      avg_quality_this_week: Math.round(avgScoreThisWeek * 10) / 10,
      avg_quality_last_week: Math.round(avgScoreLastWeek * 10) / 10,
      after_hours: afterHoursTotal,
      after_hours_this_week: afterHoursThisWeek,
      after_hours_last_week: afterHoursLastWeek,
      revenue_potential: totalRevenue,
      revenue_this_week: revenueThisWeek,
      revenue_last_week: revenueLastWeek,
    };

    // Quality distribution
    const high = scoredLeads.filter(l => l.quality_score >= 7.5).length;
    const medium = scoredLeads.filter(l => l.quality_score >= 5 && l.quality_score < 7.5).length;
    const low = scoredLeads.filter(l => l.quality_score < 5).length;
    const quality = { high, medium, low, total: scoredLeads.length };

    // Source breakdown
    const sourceMap: Record<string, number> = {};
    scoredLeads.forEach(l => {
      const src = l.utm_source || l.source || 'direct';
      sourceMap[src] = (sourceMap[src] || 0) + 1;
    });
    const sources = Object.entries(sourceMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Treatment breakdown with revenue
    const treatmentMap: Record<string, { count: number; revenue: number }> = {};
    scoredLeads.forEach(l => {
      const t = l.treatment_interest || 'Unknown';
      if (!treatmentMap[t]) treatmentMap[t] = { count: 0, revenue: 0 };
      treatmentMap[t].count++;
      treatmentMap[t].revenue += l.revenue;
    });
    const treatments = Object.entries(treatmentMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);

    // Recent leads (last 20)
    const recent_leads = scoredLeads.slice(0, 20).map(l => ({
      name: formatName(l.name),
      treatment: l.treatment_interest,
      timeline: l.timeline,
      quality_score: l.quality_score,
      quality_label: l.quality_score >= 7.5 ? 'High' : l.quality_score >= 5 ? 'Medium' : 'Low',
      source: l.utm_source || l.source || 'direct',
      after_hours: l.after_hours,
      created_at: l.created_at,
    }));

    return NextResponse.json({ kpis, quality, sources, treatments, recent_leads });
  } catch (error) {
    console.error('Dashboard data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatName(name: string): string {
  if (!name) return 'Unknown';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
