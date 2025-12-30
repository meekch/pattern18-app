"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Incident {
  id: string;
  title: string;
  category: string;
  patterns: string[];
  severity: string;
  incident_date: string;
  message_count?: number;
  evidence_strength?: string;
  coparent_message?: string;
  messages_json?: any[];
}

type DocType = "declaration" | "timeline" | "pattern_summary" | "exhibit_list";

const DOC_TYPES = [
  {
    id: "declaration" as DocType,
    name: "Declaration",
    icon: "📝",
    desc: "Sworn statement with numbered facts for court filing"
  },
  {
    id: "timeline" as DocType,
    name: "Timeline",
    icon: "📅",
    desc: "Chronological list of incidents with dates"
  },
  {
    id: "pattern_summary" as DocType,
    name: "Pattern Summary",
    icon: "📊",
    desc: "Analysis showing repeated behavior patterns"
  },
  {
    id: "exhibit_list" as DocType,
    name: "Exhibit List",
    icon: "📋",
    desc: "Organized index of evidence for court submission"
  }
];

export default function CourtDocsPage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [docType, setDocType] = useState<DocType>("declaration");
  const [caseContext, setCaseContext] = useState({
    caseNumber: "",
    courtName: "",
    petitionerName: "",
    respondentName: "",
    filingPurpose: "",
    userRole: "petitioner" as "petitioner" | "respondent"
  });
  const [step, setStep] = useState<"select" | "configure" | "generate" | "review">("select");

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .eq("user_id", session.user.id)
        .order("incident_date", { ascending: false });

      if (error) throw error;
      setIncidents(data || []);
      
      // Auto-select incidents marked for exhibit
      const exhibitIds = (data || [])
        .filter(inc => inc.include_in_exhibit)
        .map(inc => inc.id);
      setSelectedIds(new Set(exhibitIds));
    } catch (err) {
      console.error("Failed to load incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(incidents.map(i => i.id)));
  };

  const selectNone = () => {
    setSelectedIds(new Set());
  };

  const selectBySeverity = (severity: string[]) => {
    const ids = incidents
      .filter(i => severity.includes(i.severity))
      .map(i => i.id);
    setSelectedIds(new Set(ids));
  };

  const generateDocument = async () => {
    setGenerating(true);
    setStep("generate");
    
    try {
      const selectedIncidents = incidents.filter(i => selectedIds.has(i.id));
      
      const response = await fetch("/api/generate-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docType,
          incidents: selectedIncidents,
          caseContext
        })
      });

      if (!response.ok) throw new Error("Failed to generate document");
      
      const data = await response.json();
      setGeneratedDoc(data.document);
      setStep("review");
    } catch (err) {
      console.error("Generation failed:", err);
      alert("Failed to generate document. Please try again.");
      setStep("configure");
    } finally {
      setGenerating(false);
    }
  };

  const downloadAsText = () => {
    if (!generatedDoc) return;
    const blob = new Blob([generatedDoc], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docType}-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    if (!generatedDoc) return;
    await navigator.clipboard.writeText(generatedDoc);
    alert("Copied to clipboard!");
  };

  const selectedCount = selectedIds.size;
  const criticalSelected = incidents.filter(i => selectedIds.has(i.id) && i.severity === "critical").length;
  const highSelected = incidents.filter(i => selectedIds.has(i.id) && i.severity === "high").length;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8faf9" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>📄</div>
          <p style={{ color: "#6b7280" }}>Loading your evidence...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf9" }}>
      {/* Header */}
      <header style={{
        background: "linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%)",
        padding: "16px 24px",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button 
            onClick={() => router.push("/evidence")}
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 18 }}
          >
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Create Court Document</h1>
        </div>
        <div style={{ fontSize: 14, opacity: 0.8 }}>
          {selectedCount} incidents selected
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        {/* Progress Steps */}
        <div style={{ display: "flex", marginBottom: 32, gap: 8 }}>
          {["select", "configure", "generate", "review"].map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: ["select", "configure", "generate", "review"].indexOf(step) >= i ? "#059669" : "#e5e7eb"
              }}
            />
          ))}
        </div>

        {/* Step 1: Select Incidents */}
        {step === "select" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Select Evidence</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>Choose which incidents to include in your document</p>

            {/* Quick Select */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              <button onClick={selectAll} style={pillStyle}>Select All</button>
              <button onClick={selectNone} style={pillStyle}>Clear</button>
              <button onClick={() => selectBySeverity(["critical", "high"])} style={{ ...pillStyle, background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" }}>
                Critical + High Only
              </button>
              <button onClick={() => selectBySeverity(["critical"])} style={{ ...pillStyle, background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" }}>
                Critical Only
              </button>
            </div>

            {/* Selection Stats */}
            <div style={{
              background: "white",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              display: "flex",
              gap: 24,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}>
              <div><strong>{selectedCount}</strong> <span style={{ color: "#6b7280" }}>selected</span></div>
              <div><strong style={{ color: "#dc2626" }}>{criticalSelected}</strong> <span style={{ color: "#6b7280" }}>critical</span></div>
              <div><strong style={{ color: "#ea580c" }}>{highSelected}</strong> <span style={{ color: "#6b7280" }}>high severity</span></div>
            </div>

            {/* Incidents List */}
            <div style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
              {incidents.map((inc, idx) => (
                <div
                  key={inc.id}
                  onClick={() => toggleSelect(inc.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "14px 20px",
                    gap: 16,
                    cursor: "pointer",
                    borderBottom: idx < incidents.length - 1 ? "1px solid #f3f4f6" : "none",
                    background: selectedIds.has(inc.id) ? "#f0fdf4" : "white"
                  }}
                >
                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: `2px solid ${selectedIds.has(inc.id) ? "#059669" : "#d1d5db"}`,
                    background: selectedIds.has(inc.id) ? "#059669" : "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {selectedIds.has(inc.id) && <span style={{ color: "white", fontSize: 14 }}>✓</span>}
                  </div>
                  
                  <div style={{ width: 70, fontSize: 13, color: "#6b7280" }}>
                    {new Date(inc.incident_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                  
                  <span style={{
                    padding: "3px 10px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    background: inc.severity === "critical" ? "#fef2f2" : inc.severity === "high" ? "#fff7ed" : "#f9fafb",
                    color: inc.severity === "critical" ? "#dc2626" : inc.severity === "high" ? "#ea580c" : "#6b7280"
                  }}>
                    {inc.severity}
                  </span>
                  
                  <div style={{ flex: 1, fontSize: 14 }}>
                    {inc.coparent_message?.slice(0, 60) || inc.title}
                    {(inc.coparent_message?.length || 0) > 60 && "..."}
                  </div>
                  
                  {inc.patterns?.length > 0 && (
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>{inc.patterns.length} patterns</span>
                  )}
                </div>
              ))}
            </div>

            {/* Next Button */}
            <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setStep("configure")}
                disabled={selectedCount === 0}
                style={{
                  background: selectedCount === 0 ? "#9ca3af" : "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "14px 32px",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: selectedCount === 0 ? "not-allowed" : "pointer"
                }}
              >
                Continue with {selectedCount} incidents →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configure Document */}
        {step === "configure" && (
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Configure Document</h2>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>Choose document type and add case details</p>

            {/* Document Type Selection */}
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 12 }}>Document Type</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {DOC_TYPES.map(dt => (
                  <div
                    key={dt.id}
                    onClick={() => setDocType(dt.id)}
                    style={{
                      padding: 20,
                      borderRadius: 12,
                      border: `2px solid ${docType === dt.id ? "#059669" : "#e5e7eb"}`,
                      background: docType === dt.id ? "#f0fdf4" : "white",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{dt.icon}</div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{dt.name}</div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>{dt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Case Details */}
            <div style={{ background: "white", borderRadius: 12, padding: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <h3 style={{ fontWeight: 600, marginBottom: 20 }}>Case Details (Optional)</h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Your Role</label>
                  <select
                    value={caseContext.userRole}
                    onChange={(e) => setCaseContext(prev => ({ ...prev, userRole: e.target.value as any }))}
                    style={inputStyle}
                  >
                    <option value="petitioner">Petitioner</option>
                    <option value="respondent">Respondent</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Case Number</label>
                  <input
                    type="text"
                    placeholder="e.g., FC2024-001234"
                    value={caseContext.caseNumber}
                    onChange={(e) => setCaseContext(prev => ({ ...prev, caseNumber: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Your Name</label>
                  <input
                    type="text"
                    placeholder="Your full legal name"
                    value={caseContext.petitionerName}
                    onChange={(e) => setCaseContext(prev => ({ ...prev, petitionerName: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Other Party's Name</label>
                  <input
                    type="text"
                    placeholder="Other parent's name"
                    value={caseContext.respondentName}
                    onChange={(e) => setCaseContext(prev => ({ ...prev, respondentName: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Court Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Maricopa County Superior Court"
                    value={caseContext.courtName}
                    onChange={(e) => setCaseContext(prev => ({ ...prev, courtName: e.target.value }))}
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Purpose of This Document</label>
                  <textarea
                    placeholder="e.g., Response to motion to modify parenting time, showing pattern of communication issues"
                    value={caseContext.filingPurpose}
                    onChange={(e) => setCaseContext(prev => ({ ...prev, filingPurpose: e.target.value }))}
                    style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
                  />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => setStep("select")}
                style={{ ...pillStyle, padding: "12px 24px" }}
              >
                ← Back
              </button>
              <button
                onClick={generateDocument}
                style={{
                  background: "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "14px 32px",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Generate {DOC_TYPES.find(d => d.id === docType)?.name} →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Generating */}
        {step === "generate" && (
          <div style={{ textAlign: "center", padding: 64 }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "#d1fae5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              animation: "pulse 2s infinite"
            }}>
              <span style={{ fontSize: 40 }}>📝</span>
            </div>
            <h2 style={{ fontSize: 24, marginBottom: 8 }}>Generating Your Document...</h2>
            <p style={{ color: "#6b7280" }}>Creating court-ready language from {selectedCount} incidents</p>
          </div>
        )}

        {/* Step 4: Review */}
        {step === "review" && generatedDoc && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>Your Document is Ready</h2>
                <p style={{ color: "#6b7280" }}>{DOC_TYPES.find(d => d.id === docType)?.name} • {selectedCount} incidents</p>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={copyToClipboard} style={pillStyle}>
                  📋 Copy
                </button>
                <button onClick={downloadAsText} style={{ ...pillStyle, background: "#059669", color: "white", borderColor: "#059669" }}>
                  ⬇ Download
                </button>
              </div>
            </div>

            {/* Document Preview */}
            <div style={{
              background: "white",
              borderRadius: 12,
              padding: 32,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              fontFamily: "Georgia, serif",
              fontSize: 14,
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
              maxHeight: 600,
              overflow: "auto"
            }}>
              {generatedDoc}
            </div>

            {/* Actions */}
            <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => {
                  setGeneratedDoc(null);
                  setStep("configure");
                }}
                style={{ ...pillStyle, padding: "12px 24px" }}
              >
                ← Edit Settings
              </button>
              <button
                onClick={() => router.push("/evidence")}
                style={{
                  background: "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  padding: "14px 32px",
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Done ✓
              </button>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}

const pillStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 20,
  border: "1px solid #e5e7eb",
  background: "white",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  fontSize: 14
};