import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      conversationId,
      coparentMessage,
      userContext,
      coachResponse,
      patterns,
      incidentType,
      severity,
      incidentDate,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

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
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const { data: incidents, error } = await supabase
      .from("incidents")
      .select("*")
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
