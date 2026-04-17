import { NextRequest, NextResponse } from 'next/server';
import { checkIpRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const rl = checkIpRateLimit(req, 'demo-verify', 20);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { key } = await req.json();

    if (!key || key !== process.env.DEMO_ACCESS_KEY) {
      return NextResponse.json({ error: 'Invalid access key' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
