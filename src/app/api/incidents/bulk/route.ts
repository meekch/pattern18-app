import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "@/lib/auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/incidents/bulk
 * Save multiple incidents from bulk message import
 */
export async function POST(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { incidents, importId } = body;

    if (!incidents || !Array.isArray(incidents) || incidents.length === 0) {
      return NextResponse.json({ error: "No incidents to save" }, { status: 400 });
    }

    // Generate import ID if not provided (groups this batch together)
    const batchImportId = importId || `import-${Date.now()}`;

    // Map incidents to database schema
    const incidentRows = incidents.map((incident: any) => ({
      user_id: userId,
      title: incident.title || "Untitled Incident",
      category: incident.category || "uncategorized",
      patterns: incident.uniquePatterns || incident.patterns || [],
      severity: incident.maxSeverity || incident.severity || "medium",
      incident_date: incident.startTime || new Date().toISOString(),
      start_time: incident.startTime || null,
      end_time: incident.endTime || null,
      duration_minutes: incident.durationMinutes || null,
      message_count: incident.messageCount || incident.messages?.length || 1,
      evidence_strength: incident.evidenceStrength || "moderate",
      messages_json: incident.messages || null,
      source: "bulk_import",
      import_id: batchImportId,
      is_court_ready: incident.evidenceStrength === "strong",
      incident_type: incident.category || "communication",
      notes: null,
      coparent_message: incident.messages?.[0]?.text || null,
    }));

    // Insert all incidents
    const { data, error } = await supabase
      .from("incidents")
      .insert(incidentRows)
      .select();

    if (error) {
      console.error("Error saving bulk incidents:", error);
      return NextResponse.json(
        { error: "Failed to save incidents" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      saved: data?.length || 0,
      importId: batchImportId,
      incidents: data,
    });
  } catch (error) {
    console.error("Bulk save error:", error);
    return NextResponse.json(
      { error: "Failed to save incidents" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/incidents/bulk?importId=xxx
 * Get all incidents from a specific import batch
 */
export async function GET(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const importId = searchParams.get("importId");

    let query = supabase
      .from("incidents")
      .select("id, title, category, patterns, severity, incident_date, message_count, evidence_strength, source, import_id, is_court_ready, created_at")
      .eq("user_id", userId)
      .eq("source", "bulk_import")
      .order("incident_date", { ascending: false });

    if (importId) {
      query = query.eq("import_id", importId);
    }

    const { data: incidents, error } = await query;

    if (error) {
      console.error("Error fetching bulk incidents:", error);
      return NextResponse.json(
        { error: "Failed to fetch incidents" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      incidents,
      total: incidents?.length || 0,
    });
  } catch (error) {
    console.error("Get bulk incidents error:", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/incidents/bulk?importId=xxx
 * Delete all incidents from a specific import batch
 */
export async function DELETE(request: NextRequest) {
  const userId = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const importId = searchParams.get("importId");

    if (!importId) {
      return NextResponse.json(
        { error: "Import ID required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("incidents")
      .delete()
      .eq("user_id", userId)
      .eq("import_id", importId);

    if (error) {
      console.error("Error deleting bulk incidents:", error);
      return NextResponse.json(
        { error: "Failed to delete incidents" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete bulk incidents error:", error);
    return NextResponse.json(
      { error: "Failed to delete incidents" },
      { status: 500 }
    );
  }
}