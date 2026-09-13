import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { stripImageMetadata, isSanitizableImage } from '@/lib/strip-image-metadata';

export const runtime = 'nodejs';

const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Strips EXIF/GPS from an image for client-side upload flows. sharp is a
 * native module and cannot run in the browser, so the browser sends the file
 * here and uploads the sanitized bytes it gets back.
 */
export async function POST(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!isSanitizableImage(file.type)) {
      return NextResponse.json({ error: 'Not a sanitizable image type' }, { status: 415 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    }

    const input = Buffer.from(await file.arrayBuffer());
    const sanitized = await stripImageMetadata(input);

    return new NextResponse(new Uint8Array(sanitized.buffer), {
      status: 200,
      headers: {
        'Content-Type': sanitized.contentType,
        'X-Sanitized-Extension': sanitized.extension,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Image sanitize error:', error);
    return NextResponse.json({ error: 'Failed to sanitize image' }, { status: 500 });
  }
}
