import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Use pdf-parse to extract text
    // @ts-expect-error - pdf-parse is a CommonJS module
    const pdfParse = (await import('pdf-parse')) as any;
    const parser = pdfParse.default || pdfParse;
    const data = await parser(buffer);

    return NextResponse.json({
      success: true,
      text: data.text,
      pages: data.numpages,
      info: data.info
    });

  } catch (error) {
    console.error('PDF extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract text from PDF. Please try a CSV export instead.' },
      { status: 500 }
    );
  }
}