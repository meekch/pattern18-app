import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // PDF parsing temporarily disabled - use CSV exports instead
  return NextResponse.json({ 
    error: 'PDF parsing coming soon. Please export as CSV from iMazing for now.',
    text: '',
    pages: 0
  }, { status: 400 });
}
