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
  source?: string;
  include_in_exhibit?: boolean;
}

interface GroupedIncidents {
  [monthYear: string]: Incident[];
}

const categoryLabels: Record<string, string> = {
  child_activities: "Child Activities",
  financial_dispute: "Financial Dispute",
  regular_schedule: "Schedule",
  exchange_conflict: "Exchange Conflict",
  legal_threats: "Legal Threats",
  medical_decisions: "Medical Decisions",
  communication: "Communication",
  boundary_violation: "Boundary Violation",
  parenting_decisions: "Parenting Decisions",
  uncategorized: "General",
};

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  high: { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  medium: { bg: "#fefce8", text: "#ca8a04", border: "#fef08a" },
  low: { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" },
};

export default function EvidencePage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "critical" | "high+" | "exhibit">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadEvidence();
  }, []);

  const loadEvidence = async () => {
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
    } catch (err) {
      console.error("Failed to load evidence:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExhibit = async (id: string, currentValue: boolean) => {
    await supabase
      .from("incidents")
      .update({ include_in_exhibit: !currentValue })
      .eq("id", id);
    
    setIncidents(prev => prev.map(inc => 
      inc.id === id ? { ...inc, include_in_exhibit: !currentValue } : inc
    ));
  };

  // Filter incidents
  const filteredIncidents = incidents.filter(inc => {
    if (filter === "critical" && inc.severity !== "critical") return false;
    if (filter === "high+" && !["critical", "high"].includes(inc.severity)) return false;
    if (filter === "exhibit" && !inc.include_in_exhibit) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        inc.title?.toLowerCase().includes(query) ||
        inc.coparent_message?.toLowerCase().includes(query) ||
        inc.patterns?.some(p => p.toLowerCase().includes(query)) ||
        inc.category?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    return true;
  });

  // Group by month
  const groupedIncidents: GroupedIncidents = filteredIncidents.reduce((acc, inc) => {
    const date = new Date(inc.incident_date);
    const monthYear = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(inc);
    return acc;
  }, {} as GroupedIncidents);

  // Stats
  const totalCount = incidents.length;
  const criticalCount = incidents.filter(i => i.severity === "critical").length;
  const highPlusCount = incidents.filter(i => ["critical", "high"].includes(i.severity)).length;
  const exhibitCount = incidents.filter(i => i.include_in_exhibit).length;

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8faf9" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>📂</div>
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
            onClick={() => router.push("/coach")}
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 18 }}
          >
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>My Evidence</h1>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => router.push("/court-docs")}
            style={{
              background: "#059669",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "10px 20px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Create Document
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        {/* Stats Bar */}
        <div style={{
          display: "flex",
          gap: 24,
          marginBottom: 24,
          padding: 20,
          background: "white",
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1f2937" }}>{totalCount}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Total</div>
          </div>
          <div style={{ width: 1, background: "#e5e7eb" }} />
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#dc2626" }}>{criticalCount}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Critical</div>
          </div>
          <div style={{ width: 1, background: "#e5e7eb" }} />
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#ea580c" }}>{highPlusCount}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>High & Critical</div>
          </div>
          <div style={{ width: 1, background: "#e5e7eb" }} />
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#059669" }}>{exhibitCount}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>In Exhibit</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          gap: 16
        }}>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { key: "all", label: "All" },
              { key: "high+", label: "High & Critical" },
              { key: "critical", label: "Critical" },
              { key: "exhibit", label: "📋 In Exhibit" },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as any)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 20,
                  border: "1px solid",
                  borderColor: filter === f.key ? "#059669" : "#e5e7eb",
                  background: filter === f.key ? "#d1fae5" : "white",
                  color: filter === f.key ? "#065f46" : "#6b7280",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 500
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          
          <input
            type="text"
            placeholder="Search patterns, messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              width: 250,
              fontSize: 14
            }}
          />
        </div>

        {/* Grouped List */}
        {Object.keys(groupedIncidents).length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: 64,
            background: "white",
            borderRadius: 12,
            color: "#6b7280"
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <p>No incidents match your filter</p>
          </div>
        ) : (
          Object.entries(groupedIncidents).map(([monthYear, monthIncidents]) => (
            <div key={monthYear} style={{ marginBottom: 32 }}>
              {/* Month Header */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>
                  📅 {monthYear}
                </span>
                <span style={{
                  fontSize: 12,
                  color: "#9ca3af",
                  background: "#f3f4f6",
                  padding: "2px 8px",
                  borderRadius: 10
                }}>
                  {monthIncidents.length} incidents
                </span>
              </div>

              {/* Incidents List */}
              <div style={{
                background: "white",
                borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                overflow: "hidden"
              }}>
                {monthIncidents.map((incident, idx) => {
                  const isExpanded = expandedId === incident.id;
                  const colors = severityColors[incident.severity] || severityColors.low;
                  const preview = incident.coparent_message?.slice(0, 100) || 
                                  incident.messages_json?.[0]?.text?.slice(0, 100) || "";
                  
                  return (
                    <div
                      key={incident.id}
                      style={{
                        borderBottom: idx < monthIncidents.length - 1 ? "1px solid #f3f4f6" : "none"
                      }}
                    >
                      {/* Main Row */}
                      <div
                        onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "16px 20px",
                          cursor: "pointer",
                          gap: 16,
                          transition: "background 0.15s",
                          background: isExpanded ? "#f9fafb" : "white"
                        }}
                      >
                        {/* Exhibit checkbox */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExhibit(incident.id, !!incident.include_in_exhibit);
                          }}
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            border: `2px solid ${incident.include_in_exhibit ? "#059669" : "#d1d5db"}`,
                            background: incident.include_in_exhibit ? "#059669" : "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0
                          }}
                        >
                          {incident.include_in_exhibit && (
                            <span style={{ color: "white", fontSize: 12 }}>✓</span>
                          )}
                        </div>

                        {/* Date */}
                        <div style={{ width: 50, flexShrink: 0, fontSize: 13, color: "#6b7280" }}>
                          {new Date(incident.incident_date).toLocaleDateString("en-US", { 
                            month: "short", 
                            day: "numeric" 
                          })}
                        </div>

                        {/* Severity Badge */}
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          background: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.border}`,
                          flexShrink: 0
                        }}>
                          {incident.severity}
                        </span>

                        {/* Category */}
                        <div style={{
                          width: 140,
                          flexShrink: 0,
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#374151"
                        }}>
                          {categoryLabels[incident.category] || incident.category}
                        </div>

                        {/* Preview */}
                        <div style={{
                          flex: 1,
                          fontSize: 13,
                          color: "#6b7280",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {preview ? `"${preview}${preview.length >= 100 ? '...' : ''}"` : "—"}
                        </div>

                        {/* Patterns count */}
                        {incident.patterns?.length > 0 && (
                          <span style={{
                            fontSize: 12,
                            color: "#9ca3af",
                            flexShrink: 0
                          }}>
                            {incident.patterns.length} pattern{incident.patterns.length > 1 ? "s" : ""}
                          </span>
                        )}

                        {/* Expand arrow */}
                        <span style={{
                          color: "#9ca3af",
                          transform: isExpanded ? "rotate(90deg)" : "none",
                          transition: "transform 0.15s"
                        }}>
                          ›
                        </span>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div style={{
                          padding: "0 20px 20px 56px",
                          background: "#f9fafb"
                        }}>
                          {/* Patterns */}
                          {incident.patterns?.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>
                                PATTERNS DETECTED
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {incident.patterns.map((pattern, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      padding: "4px 12px",
                                      background: "#fef3c7",
                                      border: "1px solid #fcd34d",
                                      borderRadius: 16,
                                      fontSize: 12,
                                      color: "#92400e"
                                    }}
                                  >
                                    {pattern}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Full message */}
                          {(incident.coparent_message || incident.messages_json?.[0]?.text) && (
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>
                                MESSAGE
                              </div>
                              <div style={{
                                padding: 16,
                                background: "white",
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                                fontSize: 14,
                                color: "#374151",
                                lineHeight: 1.6
                              }}>
                                {incident.coparent_message || incident.messages_json?.[0]?.text}
                              </div>
                            </div>
                          )}

                          {/* Message count */}
                          {incident.message_count && incident.message_count > 1 && (
                            <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
                              📨 {incident.message_count} messages in this incident
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Bottom Nav */}
      <nav style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "white",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-around",
        padding: "12px 0",
        zIndex: 100
      }}>
        {[
          { icon: "🏠", label: "Home", path: "/dashboard" },
          { icon: "💬", label: "Coach", path: "/coach" },
          { icon: "📁", label: "Evidence", path: "/evidence", active: true },
          { icon: "🌿", label: "Heal", path: "/healing" },
        ].map(item => (
          <button
            key={item.path}
            onClick={() => router.push(item.path)}
            style={{
              background: "none",
              border: "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
              color: item.active ? "#059669" : "#6b7280"
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontSize: 11, fontWeight: item.active ? 600 : 400 }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}