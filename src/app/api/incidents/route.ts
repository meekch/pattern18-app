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
      .select("id, patterns, severity, category, coparent_message, incident_date, incident_type, source, created_at, include_in_exhibit, title, messages_json")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching incidents:", error);
      return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 });
    }

    const patternCounts: Record<string, number> = {};
    for (const incident of incidents || []) {
      for (const pattern of incident.patterns || []) {
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      }
    }

    return NextResponse.json({
      incidents,
      patternSummary: patternCounts,
      total: incidents?.length || 0,
    });
  } catch (error) {
    console.error("Get incidents error:", error);
    return NextResponse.json({ error: "Failed to fetch incidents" }, { status: 500 });
  }
}
