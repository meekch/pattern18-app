import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'PDF extraction not yet implemented' },
    { status: 501 }
  );
}
