"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";

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
  gaslighting: "Gaslighting",
  darvo: "DARVO",
  intimidation: "Intimidation",
  threats: "Threats",
  financial_abuse: "Financial Abuse",
  financial_manipulation: "Financial Manipulation",
  using_children_as_weapons: "Using Children as Weapons",
  blame_shifting: "Blame-Shifting",
  false_accusations: "False Accusations",
  emotional_blackmail: "Emotional Blackmail",
  stonewalling: "Stonewalling",
  monitoring_stalking: "Monitoring/Stalking",
  isolation_tactics: "Isolation Tactics",
  minimizing_denying: "Minimizing/Denying",
  word_salad: "Word Salad",
  moving_goalposts: "Moving Goalposts",
  projection: "Projection",
  hoovering: "Hoovering",
  gatekeeping: "Gatekeeping",
  verbal_abuse: "Verbal Abuse",
  legal_threats: "Legal Threats",
  schedule_manipulation: "Schedule Manipulation",
  none_detected: "Uncategorized",
  not_abuse: "Not Abuse (Dismissed)",
};

const AVAILABLE_PATTERNS = [
  "Gaslighting", "DARVO", "Intimidation", "Threats", "Financial Manipulation",
  "Using Children as Weapons", "Blame-Shifting", "False Accusations", 
  "Emotional Blackmail", "Stonewalling", "Monitoring/Stalking", "Isolation Tactics",
  "Minimizing/Denying", "Word Salad", "Moving Goalposts", "Projection",
  "Hoovering", "Gatekeeping", "Verbal Abuse", "Legal/Court Threats",
  "Name-Calling/Verbal Abuse", "Triangulating Child", "Schedule Manipulation"
];

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
  high: { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
  medium: { bg: "#fefce8", text: "#ca8a04", border: "#fef08a" },
  low: { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" },
};

function EvidenceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "high+" | "exhibit">("all");
  const [patternFilter, setPatternFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Edit modal state
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [editSeverity, setEditSeverity] = useState("");
  const [editPatterns, setEditPatterns] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const allPatterns = [...new Set(incidents.flatMap(i => i.patterns || []))].sort();
  const allCategories = [...new Set(incidents.map(i => i.category).filter(Boolean))].sort();

  useEffect(() => {
    const pattern = searchParams.get('pattern');
    if (pattern) {
      setPatternFilter(pattern);
    }
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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("incidents")
        .update({ include_in_exhibit: !currentValue })
        .eq("id", id)
        .eq("user_id", session.user.id);
      
      if (error) {
        console.error("Failed to update exhibit status:", error);
        return;
      }
      
      setIncidents(prev => prev.map(inc => 
        inc.id === id ? { ...inc, include_in_exhibit: !currentValue } : inc
      ));
    } catch (err) {
      console.error("Toggle exhibit error:", err);
    }
  };

  const openEditModal = (incident: Incident) => {
    setEditingIncident(incident);
    setEditSeverity(incident.severity);
    setEditPatterns(incident.patterns || []);
  };

  const saveEdit = async () => {
    if (!editingIncident) return;
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const category = editPatterns.length > 0 
        ? editPatterns[0].toLowerCase().replace(/[\/\s]+/g, '_')
        : 'none_detected';

      const { error } = await supabase
        .from("incidents")
        .update({ 
          severity: editSeverity,
          patterns: editPatterns,
          category: category
        })
        .eq("id", editingIncident.id)
        .eq("user_id", session.user.id);

      if (error) throw error;

      setIncidents(prev => prev.map(inc => 
        inc.id === editingIncident.id 
          ? { ...inc, severity: editSeverity, patterns: editPatterns, category }
          : inc
      ));
      setEditingIncident(null);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const dismissAsNotAbuse = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("incidents")
        .update({ 
          severity: 'low',
          patterns: [],
          category: 'not_abuse',
          include_in_exhibit: false
        })
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (error) throw error;

      setIncidents(prev => prev.map(inc => 
        inc.id === id 
          ? { ...inc, severity: 'low', patterns: [], category: 'not_abuse', include_in_exhibit: false }
          : inc
      ));
      setExpandedId(null);
    } catch (err) {
      console.error("Dismiss error:", err);
    }
  };

  const deleteIncident = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("incidents")
        .delete()
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (error) throw error;

      setIncidents(prev => prev.filter(inc => inc.id !== id));
      setDeleteConfirm(null);
      setExpandedId(null);
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const togglePattern = (pattern: string) => {
    setEditPatterns(prev => 
      prev.includes(pattern) 
        ? prev.filter(p => p !== pattern)
        : [...prev, pattern]
    );
  };

  // Filter incidents
  const filteredIncidents = incidents.filter(inc => {
    if (severityFilter === "critical" && inc.severity !== "critical") return false;
    if (severityFilter === "high+" && !["critical", "high"].includes(inc.severity)) return false;
    if (severityFilter === "exhibit" && !inc.include_in_exhibit) return false;
    
    if (patternFilter !== "all") {
      const hasPattern = inc.patterns?.some(p => 
        p.toLowerCase().includes(patternFilter.toLowerCase())
      ) || inc.category?.toLowerCase().includes(patternFilter.toLowerCase());
      if (!hasPattern) return false;
    }
    
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

  const patternCounts: Record<string, number> = {};
  incidents.forEach(inc => {
    (inc.patterns || []).forEach(p => {
      patternCounts[p] = (patternCounts[p] || 0) + 1;
    });
  });

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8faf9" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}></div>
          <p style={{ color: "#6b7280" }}>Loading your evidence...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8faf9", paddingBottom: 100 }}>
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
            onClick={() => router.push("/my-case")}
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 18 }}
          >
            Back
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>My Evidence</h1>
        </div>
        <button
          onClick={() => router.push("/docs")}
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
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
        {/* Stats Bar */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}>
          <div style={{ background: "white", borderRadius: 12, padding: 16, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1f2937" }}>{totalCount}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Total</div>
          </div>
          <div style={{ background: "white", borderRadius: 12, padding: 16, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#dc2626" }}>{criticalCount}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Critical</div>
          </div>
          <div style={{ background: "white", borderRadius: 12, padding: 16, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#ea580c" }}>{highPlusCount}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>High+</div>
          </div>
          <div style={{ background: "white", borderRadius: 12, padding: 16, textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#059669" }}>{exhibitCount}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>In Exhibit</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { key: "all", label: "All" },
                { key: "high+", label: "High+" },
                { key: "critical", label: "Critical" },
                { key: "exhibit", label: " Exhibit" },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setSeverityFilter(f.key as any)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 20,
                    border: "1px solid",
                    borderColor: severityFilter === f.key ? "#059669" : "#e5e7eb",
                    background: severityFilter === f.key ? "#d1fae5" : "white",
                    color: severityFilter === f.key ? "#065f46" : "#6b7280",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <select
              value={patternFilter}
              onChange={(e) => setPatternFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: patternFilter !== "all" ? "#fef3c7" : "white",
                fontSize: 13,
                color: "#374151",
                cursor: "pointer",
                minWidth: 180
              }}
            >
              <option value="all">All Patterns</option>
              {allPatterns.map(pattern => (
                <option key={pattern} value={pattern}>
                  {pattern} ({patternCounts[pattern] || 0})
                </option>
              ))}
            </select>
            
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                fontSize: 13,
                flex: 1,
                minWidth: 150
              }}
            />

            {(severityFilter !== "all" || patternFilter !== "all" || searchQuery) && (
              <button
                onClick={() => {
                  setSeverityFilter("all");
                  setPatternFilter("all");
                  setSearchQuery("");
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "#fee2e2",
                  color: "#dc2626",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500
                }}
              >
                Clear
              </button>
            )}
          </div>

          {filteredIncidents.length !== incidents.length && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
              Showing {filteredIncidents.length} of {incidents.length} incidents
            </div>
          )}
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
            <div style={{ fontSize: 48, marginBottom: 16 }}></div>
            <p>No incidents match your filter</p>
          </div>
        ) : (
          Object.entries(groupedIncidents).map(([monthYear, monthIncidents]) => (
            <div key={monthYear} style={{ marginBottom: 32 }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>
                   {monthYear}
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
                          gap: 12,
                          transition: "background 0.15s",
                          background: isExpanded ? "#f9fafb" : incident.category === 'not_abuse' ? "#f3f4f6" : "white",
                          opacity: incident.category === 'not_abuse' ? 0.6 : 1
                        }}
                      >
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
                            <span style={{ color: "white", fontSize: 12 }}>+ </span>
                          )}
                        </div>

                        <div style={{ width: 50, flexShrink: 0, fontSize: 13, color: "#6b7280" }}>
                          {new Date(incident.incident_date).toLocaleDateString("en-US", { 
                            month: "short", 
                            day: "numeric" 
                          })}
                        </div>

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

                        <div style={{
                          flexShrink: 0,
                          fontSize: 13,
                          fontWeight: 600,
                          color: incident.category === 'not_abuse' ? "#9ca3af" : "#374151",
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {categoryLabels[incident.category] || incident.category || "-"}
                        </div>

                        <div style={{
                          flex: 1,
                          fontSize: 13,
                          color: "#6b7280",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {preview ? `"${preview}${preview.length >= 100 ? '...' : ''}"` : "-"}
                        </div>

                        <span style={{
                          color: "#9ca3af",
                          transform: isExpanded ? "rotate(90deg)" : "none",
                          transition: "transform 0.15s"
                        }}>
                          >
                        </span>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div style={{
                          padding: "16px 20px 20px 56px",
                          background: "#f9fafb"
                        }}>
                          {/* Action Buttons */}
                          <div style={{
                            display: "flex",
                            gap: 8,
                            marginBottom: 16,
                            flexWrap: "wrap"
                          }}>
                            <button
                              onClick={() => openEditModal(incident)}
                              style={{
                                padding: "8px 16px",
                                background: "#3b82f6",
                                color: "white",
                                border: "none",
                                borderRadius: 8,
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer"
                              }}
                            >
                               Edit Severity/Patterns
                            </button>
                            <button
                              onClick={() => dismissAsNotAbuse(incident.id)}
                              style={{
                                padding: "8px 16px",
                                background: "#f3f4f6",
                                color: "#6b7280",
                                border: "1px solid #e5e7eb",
                                borderRadius: 8,
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer"
                              }}
                            >
                              X Not Abuse (Dismiss)
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(incident.id)}
                              style={{
                                padding: "8px 16px",
                                background: "#fef2f2",
                                color: "#dc2626",
                                border: "1px solid #fecaca",
                                borderRadius: 8,
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer"
                              }}
                            >
                               Delete
                            </button>
                          </div>

                          {/* Delete Confirmation */}
                          {deleteConfirm === incident.id && (
                            <div style={{
                              background: "#fef2f2",
                              border: "1px solid #fecaca",
                              borderRadius: 8,
                              padding: 16,
                              marginBottom: 16
                            }}>
                              <p style={{ margin: "0 0 12px", color: "#dc2626", fontWeight: 500 }}>
                                Delete this incident permanently?
                              </p>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  onClick={() => deleteIncident(incident.id)}
                                  style={{
                                    padding: "8px 16px",
                                    background: "#dc2626",
                                    color: "white",
                                    border: "none",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    fontWeight: 500
                                  }}
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  style={{
                                    padding: "8px 16px",
                                    background: "white",
                                    color: "#6b7280",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 6,
                                    cursor: "pointer"
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

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

                          {/* All Messages */}
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>
                               MESSAGES ({incident.messages_json?.length || 1})
                            </div>
                            <div style={{
                              background: "white",
                              borderRadius: 8,
                              border: "1px solid #e5e7eb",
                              maxHeight: 400,
                              overflowY: "auto"
                            }}>
                              {incident.messages_json && incident.messages_json.length > 0 ? (
                                incident.messages_json.map((msg: any, idx: number) => (
                                  <div 
                                    key={idx}
                                    style={{
                                      padding: 12,
                                      borderBottom: idx < incident.messages_json!.length - 1 ? "1px solid #f3f4f6" : "none",
                                      background: msg.sender === 'coparent' ? "#fff" : "#f0fdf4"
                                    }}
                                  >
                                    <div style={{ 
                                      display: "flex", 
                                      justifyContent: "space-between",
                                      marginBottom: 4,
                                      fontSize: 11,
                                      color: "#9ca3af"
                                    }}>
                                      <span style={{ 
                                        fontWeight: 600,
                                        color: msg.sender === 'coparent' ? "#dc2626" : "#059669"
                                      }}>
                                        {msg.sender === 'coparent' ? 'Co-parent' : 'You'}
                                      </span>
                                      <span>
                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: 'numeric',
                                          minute: '2-digit'
                                        }) : ''}
                                      </span>
                                    </div>
                                    <div style={{ 
                                      fontSize: 14, 
                                      color: "#374151",
                                      lineHeight: 1.5
                                    }}>
                                      {msg.text}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div style={{ padding: 16, fontSize: 14, color: "#374151", lineHeight: 1.6 }}>
                                  {incident.coparent_message || "No message content"}
                                </div>
                              )}
                            </div>
                          </div>
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

      {/* Floating Action Bar */}
      {exhibitCount > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 100,
          left: 20,
          right: 20,
          background: 'linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%)',
          borderRadius: 16,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          zIndex: 1000
        }}>
          <div style={{ color: 'white', fontSize: 15 }}>
            +  <span style={{ fontWeight: 700 }}>{exhibitCount}</span> incidents selected
          </div>
          <button
            onClick={() => router.push('/generate-exhibit')}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '12px 24px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 15,
              whiteSpace: 'nowrap'
            }}
          >
            Generate Exhibit
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editingIncident && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          padding: 20
        }}>
          <div style={{
            background: "white",
            borderRadius: 16,
            width: "100%",
            maxWidth: 500,
            maxHeight: "90vh",
            overflow: "auto"
          }}>
            <div style={{
              padding: 20,
              borderBottom: "1px solid #e5e7eb"
            }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>Edit Incident</h2>
              <p style={{ margin: "8px 0 0", fontSize: 13, color: "#6b7280" }}>
                {new Date(editingIncident.incident_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div style={{ padding: 20 }}>
              {/* Severity */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                  Severity
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["critical", "high", "medium", "low"].map(sev => (
                    <button
                      key={sev}
                      onClick={() => setEditSeverity(sev)}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 8,
                        border: editSeverity === sev ? "2px solid #1a3a2f" : "1px solid #e5e7eb",
                        background: severityColors[sev].bg,
                        color: severityColors[sev].text,
                        fontWeight: 600,
                        cursor: "pointer",
                        textTransform: "capitalize"
                      }}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Patterns */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                  Patterns (click to toggle)
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {AVAILABLE_PATTERNS.map(pattern => (
                    <button
                      key={pattern}
                      onClick={() => togglePattern(pattern)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 16,
                        border: editPatterns.includes(pattern) ? "2px solid #f59e0b" : "1px solid #e5e7eb",
                        background: editPatterns.includes(pattern) ? "#fef3c7" : "white",
                        color: editPatterns.includes(pattern) ? "#92400e" : "#6b7280",
                        fontSize: 12,
                        cursor: "pointer"
                      }}
                    >
                      {pattern}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div style={{
                background: "#f9fafb",
                borderRadius: 8,
                padding: 12,
                marginBottom: 20
              }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Preview:</div>
                <div style={{ fontSize: 13, color: "#374151" }}>
                  <strong>{editSeverity.toUpperCase()}</strong> | {editPatterns.join(", ") || "No patterns"}
                </div>
              </div>
            </div>

            <div style={{
              padding: 20,
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              gap: 12
            }}>
              <button
                onClick={() => setEditingIncident(null)}
                style={{
                  flex: 1,
                  padding: 12,
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                style={{
                  flex: 1,
                  padding: 12,
                  background: saving ? "#9ca3af" : "#1a3a2f",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontWeight: 600
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="case" />
    </div>
  );
}

export default function EvidencePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8faf9" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}></div>
          <p style={{ color: "#6b7280" }}>Loading...</p>
        </div>
      </div>
    }>
      <EvidenceContent />
    </Suspense>
  );
}