import { createClient } from '@supabase/supabase-js';

export type ManifestEntry = {
  incident_id: string;
  text_hash: string | null;
  image_hash: string | null;
};

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Records what went into a generated document.
 *
 * Hashes are re-read from the database here rather than taken from the
 * caller: a manifest built from client-supplied values would attest to
 * whatever the client claimed, which is the opposite of the point.
 *
 * Never throws. A failed manifest write must not fail the user's document.
 */
export async function recordDocumentGeneration(params: {
  userId: string;
  docType: string;
  incidentIds: string[];
}): Promise<{ recorded: boolean; count: number }> {
  const { userId, docType, incidentIds } = params;

  try {
    const supabase = admin();

    let manifest: ManifestEntry[] = [];

    if (incidentIds.length > 0) {
      // Deliberately NOT filtered on deleted_at: the manifest records what
      // actually went into the document. If a row is soft-deleted later, the
      // record of its inclusion must survive that.
      const { data, error } = await supabase
        .from('incidents')
        .select('id, text_hash, image_hash')
        .eq('user_id', userId)
        .in('id', incidentIds);

      if (error) {
        console.error('Manifest incident re-read failed:', error);
        return { recorded: false, count: 0 };
      }

      manifest = (data || []).map((row) => ({
        incident_id: row.id,
        text_hash: row.text_hash ?? null,
        image_hash: row.image_hash ?? null,
      }));
    }

    const { error: insertError } = await supabase
      .from('document_generations')
      .insert({
        user_id: userId,
        doc_type: docType,
        incident_manifest: manifest,
      });

    if (insertError) {
      console.error('Manifest insert failed:', insertError);
      return { recorded: false, count: manifest.length };
    }

    return { recorded: true, count: manifest.length };
  } catch (err) {
    console.error('Manifest recording error:', err);
    return { recorded: false, count: 0 };
  }
}
