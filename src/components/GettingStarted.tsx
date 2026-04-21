"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface ChecklistProps {
  userId: string;
  onDismiss: () => void;
}

export default function GettingStarted({ userId, onDismiss }: ChecklistProps) {
  const router = useRouter();
  const [steps, setSteps] = useState({
    caseSetup: false,
    courtDocs: false,
    messages: false,
    patterns: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkProgress();
  }, [userId]);

  const checkProgress = async () => {
    try {
      // Check case setup
      const { data: caseData } = await supabase
        .from("case_context")
        .select("user_role, coparent_name")
        .eq("user_id", userId)
        .single();
      
      const caseSetup = !!(caseData?.user_role && caseData?.coparent_name);

      // Check for uploaded court docs
      const { count: docsCount } = await supabase
        .from("court_documents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Check for incidents/messages
      const { count: incidentCount } = await supabase
        .from("incidents")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Check for pattern detection
      const { data: patterns } = await supabase
        .from("incidents")
        .select("patterns")
        .eq("user_id", userId)
        .not("patterns", "is", null)
        .limit(1);

      setSteps({
        caseSetup,
        courtDocs: (docsCount || 0) > 0,
        messages: (incidentCount || 0) > 0,
        patterns: (patterns?.length || 0) > 0 && patterns?.[0]?.patterns?.length > 0,
      });
    } catch (err) {
      console.error("Error checking progress:", err);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = Object.values(steps).filter(Boolean).length;
  const totalSteps = 4;

  if (loading) return null;

  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      padding: 24,
      marginBottom: 20,
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      border: "1px solid #e5e7eb"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: "#1F2937" }}>Getting Started</h2>
          <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>
            {completedCount === totalSteps ? "You're all set!" : `${completedCount} of ${totalSteps} complete`}
          </p>
        </div>
        <button
          onClick={onDismiss}
          style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: 20 }}
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, marginBottom: 20 }}>
        <div style={{
          height: "100%",
          width: `${(completedCount / totalSteps) * 100}%`,
          background: "linear-gradient(90deg, #2F9D94, #2F9D94)",
          borderRadius: 3,
          transition: "width 0.3s"
        }} />
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <StepItem
          number={1}
          title="Set up your case"
          description="Your role, co-parent name, court info"
          completed={steps.caseSetup}
          onClick={() => router.push("/case-setup")}
        />
        <StepItem
          number={2}
          title="Upload court documents"
          description="Extract case details automatically"
          completed={steps.courtDocs}
          onClick={() => router.push("/evidence/upload")}
          optional
        />
        <StepItem
          number={3}
          title="Import text messages"
          description="Bulk analyze for patterns"
          completed={steps.messages}
          onClick={() => router.push("/evidence/upload")}
        />
        <StepItem
          number={4}
          title="Review detected patterns"
          description="See what we found"
          completed={steps.patterns}
          onClick={() => router.push("/evidence")}
        />
      </div>

      {completedCount >= 2 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
          <button
            onClick={() => router.push("/court-docs")}
            style={{
              width: "100%",
              padding: "14px 20px",
              background: "#1F2937",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            Create Court Document
          </button>
        </div>
      )}
    </div>
  );
}

function StepItem({ number, title, description, completed, onClick, optional }: {
  number: number;
  title: string;
  description: string;
  completed: boolean;
  onClick: () => void;
  optional?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        background: completed ? "#EAF5F3" : "#f9fafb",
        border: completed ? "1px solid #C7E4E0" : "1px solid #e5e7eb",
        borderRadius: 12,
        cursor: "pointer",
        textAlign: "left",
        width: "100%"
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: completed ? "#2F9D94" : "white",
        border: completed ? "none" : "2px solid #d1d5db",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 600,
        color: completed ? "white" : "#9ca3af",
        flexShrink: 0
      }}>
        {completed ? "✓" : number}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, color: "#1F2937", fontSize: 15 }}>
          {title}
          {optional && <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 12, marginLeft: 6 }}>(optional)</span>}
        </div>
        <div style={{ color: "#6b7280", fontSize: 13 }}>{description}</div>
      </div>
      <div style={{ color: "#9ca3af", fontSize: 18 }}>›</div>
    </button>
  );
}