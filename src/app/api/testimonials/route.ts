import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_TRIGGERS = ['10_incidents', 'first_court_doc', 'day_30'];
const VALID_ATTRIBUTION = ['named', 'first_name', 'anonymous'];

export async function POST(req: NextRequest) {
  const userId = await requireAuth(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { trigger_event, content, attribution, display_name } = body ?? {};

  if (!VALID_TRIGGERS.includes(trigger_event)) {
    return NextResponse.json({ error: 'Invalid trigger' }, { status: 400 });
  }
  if (!VALID_ATTRIBUTION.includes(attribution)) {
    return NextResponse.json({ error: 'Invalid attribution' }, { status: 400 });
  }
  if (typeof content !== 'string' || content.trim().length < 10) {
    return NextResponse.json({ error: 'Testimonial too short' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase.from('testimonials').insert({
    user_id: userId,
    trigger_event,
    content: content.trim(),
    attribution,
    display_name: typeof display_name === 'string' ? display_name.trim() || null : null,
    status: 'pending',
  });

  if (error) {
    console.error('Testimonial insert error:', error);
    return NextResponse.json({ error: 'Failed to save testimonial' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
