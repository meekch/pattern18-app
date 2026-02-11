import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const user_id = await requireAuth(request);
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      images,              // Array of base64 image strings
      patterns,            // Array of pattern tags
      coaching_summary,    // The AI's analysis
      user_messages,       // What the user said during coaching
      user_response,       // What they decided to send (or "no_response")
      incident_date,       // When the message was received
      co_parent_name,      // From case setup
      user_notes,          // Optional notes
      auto_saved = true,   // Was this auto-saved?
      needs_review = true  // Should user review this?
    } = body;

    // Upload images to Supabase Storage
    const imageUrls: string[] = [];
    
    for (let i = 0; i < images.length; i++) {
      const base64Data = images[i].replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileName = `${user_id}/${Date.now()}-${i}.png`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('evidence-screenshots')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('evidence-screenshots')
        .getPublicUrl(fileName);
      
      if (urlData?.publicUrl) {
        imageUrls.push(urlData.publicUrl);
      }
    }

    // Save evidence record to database
    const { data, error } = await supabase
      .from('evidence_timeline')
      .insert({
        user_id,
        screenshot_urls: imageUrls,
        patterns_detected: patterns,
        coaching_summary,
        user_response_chosen: user_response,
        incident_date: incident_date || new Date().toISOString(),
        co_parent_name,
        user_notes,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: "Failed to save evidence" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      evidence_id: data.id,
      message: "Saved to your evidence timeline"
    });

  } catch (error) {
    console.error('Save evidence error:', error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

// Get user's evidence timeline
export async function GET(request: NextRequest) {
  const user_id = await requireAuth(request);
  if (!user_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get('pattern'); // Optional filter

    let query = supabase
      .from('evidence_timeline')
      .select('*')
      .eq('user_id', user_id)
      .order('incident_date', { ascending: false });

    // Filter by pattern if specified
    if (pattern) {
      query = query.contains('patterns_detected', [pattern]);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch evidence" }, { status: 500 });
    }

    return NextResponse.json({ evidence: data });

  } catch (error) {
    console.error('Get evidence error:', error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}