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
  // Coercive Control Patterns
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
  
  // Legacy mappings
  revisionist_history: "Gaslighting",
  triangulating_child: "Using Children as Weapons",
  "name_calling/verbal_abuse": "Verbal Abuse",
  "legal/court_threats": "Legal Threats",
  information_gatekeeping: "Gatekeeping",
  "surveillance/monitoring": "Monitoring/Stalking",
  "minimizing/mocking": "Minimizing/Denying",
  victim_positioning: "DARVO",
  "deadline/urgency_pressure": "Intimidation",
  weaponizing_flexibility: "Blame-Shifting",
  threats_of_exposure: "Intimidation",
  dismissing_without_engaging: "Stonewalling",
};

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

  // Get unique patterns from all incidents
  const allPatterns = [...new Set(incidents.flatMap(i => i.patterns || []))].sort();
  
  // Get unique categories
  const allCategories = [...new Set(incidents.map(i => i.category).filter(Boolean))].sort();

  useEffect(() => {
    // Check URL params for initial filter
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
    // Severity filter
    if (severityFilter === "critical" && inc.severity !== "critical") return false;
    if (severityFilter === "high+" && !["critical", "high"].includes(inc.severity)) return false;
    if (severityFilter === "exhibit" && !inc.include_in_exhibit) return false;
    
    // Pattern filter
    if (patternFilter !== "all") {
      const hasPattern = inc.patterns?.some(p => 
        p.toLowerCase().includes(patternFilter.toLowerCase())
      ) || inc.category?.toLowerCase().includes(patternFilter.toLowerCase());
      if (!hasPattern) return false;
    }
    
    // Search filter
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

  // Pattern stats for dropdown
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
          <div style={{ fontSize: 32, marginBottom: 16 }}>📂</div>
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
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>My Evidence</h1>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => router.push("/docs?tab=generate")}
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
            {/* Severity Filter */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { key: "all", label: "All" },
                { key: "high+", label: "High+" },
                { key: "critical", label: "Critical" },
                { key: "exhibit", label: "📋 Exhibit" },
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

            {/* Pattern Dropdown */}
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
            
            {/* Search */}
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

            {/* Clear filters */}
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

          {/* Active filter indicator */}
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
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <p>No incidents match your filter</p>
            <button
              onClick={() => {
                setSeverityFilter("all");
                setPatternFilter("all");
                setSearchQuery("");
              }}
              style={{
                marginTop: 16,
                padding: "10px 20px",
                background: "#1a3a2f",
                color: "white",
                border: "none",
                borderRadius: 8,
                cursor: "pointer"
              }}
            >
              Clear Filters
            </button>
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
                          gap: 12,
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

                        {/* Category/Pattern */}
                        <div style={{
                          flexShrink: 0,
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#374151",
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {categoryLabels[incident.category] || incident.category || "—"}
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
                            fontSize: 11,
                            color: "#9ca3af",
                            flexShrink: 0,
                            background: "#f3f4f6",
                            padding: "2px 8px",
                            borderRadius: 10
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
                                ⚠️ ABUSE PATTERNS DETECTED
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {incident.patterns.map((pattern, i) => (
                                  <span
                                    key={i}
                                    onClick={() => setPatternFilter(pattern)}
                                    style={{
                                      padding: "4px 12px",
                                      background: "#fef3c7",
                                      border: "1px solid #fcd34d",
                                      borderRadius: 16,
                                      fontSize: 12,
                                      color: "#92400e",
                                      cursor: "pointer"
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
                              📨 MESSAGES ({incident.messages_json?.length || 1})
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
                                        {msg.sender === 'coparent' ? '🔴 Co-parent' : '🟢 You'}
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

      {/* Floating Action Bar - shows when incidents are selected for exhibit */}
      {exhibitCount > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1a3a2f',
          borderRadius: 16,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 90
        }}>
          <div style={{ color: 'white', fontSize: 14 }}>
            <span style={{ fontWeight: 700 }}>{exhibitCount}</span> selected for exhibit
          </div>
          <button
            onClick={() => router.push('/generate-exhibit')}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '10px 20px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14,
              whiteSpace: 'nowrap'
            }}
          >
            Generate Exhibit →
          </button>
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
          <div style={{ fontSize: 32, marginBottom: 16 }}>📂</div>
          <p style={{ color: "#6b7280" }}>Loading...</p>
        </div>
      </div>
    }>
      <EvidenceContent />
    </Suspense>
  );
}