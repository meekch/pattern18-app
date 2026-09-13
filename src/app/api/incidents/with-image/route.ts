import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'crypto';
import { requireAuth } from '@/lib/auth';
import { stripImageMetadata, isSanitizableImage } from '@/lib/strip-image-metadata';

export const runtime = 'nodejs';

const MAX_BYTES = 25 * 1024 * 1024;
const BUCKET = 'evidence-screenshots';

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Saves an incident from the Coach flow, with its screenshot.
 *
 * The incident id is generated here rather than by the database so the
 * storage path can contain it and the row can be inserted with
 * screenshot_path and image_hash already set -- the image link exists from
 * the row's first moment instead of being backfilled.
 *
 * An image failure never costs the user their incident: the text is saved
 * and the image error is reported alongside it.
 */
export async function POST(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();

    const title = (formData.get('title') as string) || null;
    const coparentMessage = (formData.get('coparentMessage') as string) || null;
    const category = (formData.get('category') as string) || null;
    const severity = (formData.get('severity') as string) || 'medium';
    const incidentDate = (formData.get('incidentDate') as string) || new Date().toISOString();

    let patterns: string[] = [];
    const patternsRaw = formData.get('patterns');
    if (typeof patternsRaw === 'string' && patternsRaw) {
      try {
        const parsed = JSON.parse(patternsRaw);
        if (Array.isArray(parsed)) patterns = parsed;
      } catch {
        patterns = [];
      }
    }

    const file = formData.get('file');
    const incidentId = randomUUID();

    let screenshotPath: string | null = null;
    let imageHash: string | null = null;
    let imageError: string | null = null;

    if (file && typeof file !== 'string') {
      if (!isSanitizableImage(file.type)) {
        imageError = 'That file type could not be saved as a screenshot.';
      } else if (file.size > MAX_BYTES) {
        imageError = 'That image was too large to save.';
      } else {
        try {
          const raw = Buffer.from(await file.arrayBuffer());
          const sanitized = await stripImageMetadata(raw);

          const path = `${userId}/${incidentId}-${Date.now()}.${sanitized.extension}`;

          const { error: uploadError } = await admin()
            .storage.from(BUCKET)
            .upload(path, sanitized.buffer, {
              contentType: sanitized.contentType,
              upsert: false,
            });

          if (uploadError) {
            console.error('Screenshot upload failed:', uploadError);
            imageError = 'The screenshot could not be uploaded.';
          } else {
            screenshotPath = path;
            // Hash the bytes actually stored, so this stays checkable
            // against the object in the bucket.
            imageHash = createHash('sha256').update(sanitized.buffer).digest('hex');
          }
        } catch (err) {
          console.error('Screenshot processing failed:', err);
          imageError = 'The screenshot could not be processed.';
        }
      }
    }

    const { data, error } = await admin()
      .from('incidents')
      .insert({
        id: incidentId,
        user_id: userId,
        title,
        coparent_message: coparentMessage,
        category,
        patterns,
        severity,
        incident_date: incidentDate,
        source: 'chat',
        screenshot_path: screenshotPath,
        image_hash: imageHash,
      })
      .select('id, screenshot_path, image_hash')
      .single();

    if (error) {
      console.error('Incident insert failed:', error);
      return NextResponse.json({ error: 'Failed to save incident' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      incident: data,
      imageSaved: screenshotPath !== null,
      imageError,
    });
  } catch (error) {
    console.error('Save incident with image error:', error);
    return NextResponse.json({ error: 'Failed to save incident' }, { status: 500 });
  }
}
