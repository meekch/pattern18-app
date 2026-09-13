import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const {
      conversationId,
      coparentMessage,
      userContext,
      coachResponse,
      patterns,
      incidentType,
      severity,
      incidentDate,
    } = body;

    const { data, error } = await supabase
      .from("incidents")
      .insert({
        user_id: userId,
        conversation_id: conversationId || null,
        coparent_message: coparentMessage || null,
        user_context: userContext || null,
        coach_response: coachResponse || null,
        patterns: patterns || [],
        incident_type: incidentType || "message",
        severity: severity || "medium",
        incident_date: incidentDate || new Date().toISOString(),
        source: "chat",
      })
      .select()
      .single();

    if (error) {
      console.error("Error saving incident:", error);
      return NextResponse.json({ error: "Failed to save incident" }, { status: 500 });
    }

    return NextResponse.json({ success: true, incident: data });
  } catch (error) {
    console.error("Save incident error:", error);
    return NextResponse.json({ error: "Failed to save incident" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {

    const { data: incidents, error } = await supabase
      .from("incidents")
      .select("id, patterns, severity, category, coparent_message, incident_date, incident_type, source, created_at, include_in_exhibit, title, messages_json, screenshot_path, image_hash")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching incidents:", error);
      return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 });
    }

    // Screenshots are stored as bucket paths, never as URLs: the bucket is
    // private, so a stored URL would be dead on arrival, and a stored signed
    // URL would expire. Sign at read time instead, per request.
    const paths = (incidents || [])
      .map((i) => i.screenshot_path)
      .filter((p): p is string => !!p);

    const signedByPath = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signed, error: signError } = await supabase.storage
        .from("evidence-screenshots")
        .createSignedUrls(paths, 3600);

      if (signError) {
        console.error("Failed to sign screenshot urls:", signError);
      } else {
        for (const entry of signed || []) {
          if (entry.path && entry.signedUrl) signedByPath.set(entry.path, entry.signedUrl);
        }
      }
    }

    const withScreenshots = (incidents || []).map((i) => ({
      ...i,
      screenshot_signed_url: i.screenshot_path
        ? signedByPath.get(i.screenshot_path) ?? null
        : null,
    }));

    const patternCounts: Record<string, number> = {};
    for (const incident of withScreenshots) {
      for (const pattern of incident.patterns || []) {
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      }
    }

    return NextResponse.json({
      incidents: withScreenshots,
      patternSummary: patternCounts,
      total: withScreenshots.length,
    });
  } catch (error) {
    console.error("Get incidents error:", error);
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 });
  }
}
