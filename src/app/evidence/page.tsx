"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import MilestonePrompt from "@/components/MilestonePrompt";

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
  source_type?: 'coparent' | 'child' | 'third_party' | 'user';
  source_name?: string;
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

const patternExplanations: Record<string, string> = {
  "Gaslighting": "Making you question your own reality or memory",
  "DARVO": "Deny, Attack, Reverse Victim and Offender",
  "Intimidation": "Using fear, aggression, or threats of harm",
  "Threats": "Explicit or implied threats to control behavior",
  "Financial Manipulation": "Using money or resources as a tool of control",
  "Financial Abuse": "Using money or resources as a tool of control",
  "Using Children as Weapons": "Weaponizing children to manipulate or punish",
  "Blame-Shifting": "Avoiding accountability by redirecting blame to you",
  "False Accusations": "Making untrue claims to damage credibility",
  "Emotional Blackmail": "Using guilt, fear, or obligation to control",
  "Stonewalling": "Refusing to communicate or engage constructively",
  "Monitoring/Stalking": "Tracking, surveilling, or monitoring activities",
  "Isolation Tactics": "Cutting off from support networks or resources",
  "Minimizing/Denying": "Downplaying abuse or denying it happened",
  "Word Salad": "Confusing, circular, or contradictory communication",
  "Moving Goalposts": "Constantly changing expectations or requirements",
  "Projection": "Accusing you of behaviors they themselves exhibit",
  "Hoovering": "Attempts to pull you back after setting boundaries",
  "Gatekeeping": "Controlling access to children, information, or resources",
  "Verbal Abuse": "Name-calling, insults, or degrading language",
  "Legal/Court Threats": "Using the legal system as a weapon of control",
  "Name-Calling/Verbal Abuse": "Insults or degrading language to demean",
  "Triangulating Child": "Using children as messengers or informants",
  "Schedule Manipulation": "Deliberately disrupting custody schedules",
  "Escalation": "Increasing intensity of controlling behaviors over time",
};

const SOURCE_TYPES = [
  { value: 'coparent', label: 'Co-parent message', description: 'Message FROM your co-parent' },
  { value: 'child', label: 'Child statement', description: 'Statement from child about co-parent behavior' },
  { value: 'third_party', label: 'Third party', description: 'Witness, teacher, therapist, etc.' },
  { value: 'user', label: 'Your message', description: 'Your own message (for context)' },
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
  const [editSourceType, setEditSourceType] = useState<string>("coparent");
  const [editSourceName, setEditSourceName] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copySuccess, setCopySuccess] = useState(false);

  const allPatterns = [...new Set(incidents.flatMap(i => i.patterns || []))].sort();

  useEffect(() => {
    const pattern = searchParams.get('pattern');
    if (pattern) setPatternFilter(pattern);
    const severity = searchParams.get('severity');
    if (severity === 'high') setSeverityFilter('high+');
    else if (severity === 'critical') setSeverityFilter('critical');
    const exhibit = searchParams.get('exhibit');
    if (exhibit === 'true') setSeverityFilter('exhibit');
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
    setEditSourceType(incident.source_type || 'coparent');
    setEditSourceName(incident.source_name || '');
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
          category: category,
          source_type: editSourceType,
          source_name: editSourceName || null
        })
        .eq("id", editingIncident.id)
        .eq("user_id", session.user.id);

      if (error) throw error;

      setIncidents(prev => prev.map(inc => 
        inc.id === editingIncident.id 
          ? { ...inc, severity: editSeverity, patterns: editPatterns, category, source_type: editSourceType as any, source_name: editSourceName }
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

  const sortedPatterns = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1]);

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const allVisible = filteredIncidents.map(i => i.id);
    const allSelected = allVisible.length > 0 && allVisible.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisible));
    }
  };

  const addSelectedToExhibit = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from("incidents")
        .update({ include_in_exhibit: true })
        .in("id", ids)
        .eq("user_id", session.user.id);

      if (error) throw error;

      setIncidents(prev => prev.map(inc =>
        selectedIds.has(inc.id) ? { ...inc, include_in_exhibit: true } : inc
      ));
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Batch exhibit update error:", err);
    }
  };

  const copySelectedToClipboard = async () => {
    const selected = incidents.filter(i => selectedIds.has(i.id));
    const text = selected.map(inc => {
      const date = new Date(inc.incident_date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });
      const patterns = inc.patterns?.join(', ') || 'None';
      const messages = inc.messages_json?.map((m: any) =>
        `[${m.sender === 'coparent' ? 'Co-parent' : 'You'}] ${m.text}`
      ).join('\n') || inc.coparent_message || '';
      return `Date: ${date}\nSeverity: ${inc.severity}\nPatterns: ${patterns}\n${messages}\n`;
    }).join('\n---\n\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      console.error("Clipboard copy failed");
    }
  };

  // Get source type label for display
  const getSourceTypeLabel = (sourceType?: string) => {
    const found = SOURCE_TYPES.find(s => s.value === sourceType);
    return found ? found.label : 'Co-parent';
  };

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
    <div style={{ minHeight: "100vh", background: "#f8faf9", paddingBottom: 180 }}>
      {/* Header */}
      <header style={{
        background: "var(--warm-white)",
        borderTop: "4px solid var(--teal)",
        borderBottom: "1px solid var(--teal-border)",
        padding: "16px 24px",
        color: "var(--charcoal)",
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
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 18, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ←
          </button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>My Evidence</h1>
        </div>
        <button
          onClick={() => router.push("/docs")}
          style={{
            background: "#2F9D94",
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
        <MilestonePrompt />
       {/* Stats Bar - CLICKABLE */}
       <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}>
          <div 
            onClick={() => setSeverityFilter("all")}
            style={{ 
              background: severityFilter === "all" ? "#EAF5F3" : "white", 
              borderRadius: 12, 
              padding: 16, 
              textAlign: "center", 
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              cursor: "pointer",
              border: severityFilter === "all" ? "2px solid #2F9D94" : "2px solid transparent",
              transition: "all 0.2s"
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: "#1f2937" }}>{totalCount}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Total</div>
          </div>
          <div 
            onClick={() => setSeverityFilter("critical")}
            style={{ 
              background: severityFilter === "critical" ? "#fef2f2" : "white", 
              borderRadius: 12, 
              padding: 16, 
              textAlign: "center", 
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              cursor: "pointer",
              border: severityFilter === "critical" ? "2px solid #dc2626" : "2px solid transparent",
              transition: "all 0.2s"
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: "#dc2626" }}>{criticalCount}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Critical</div>
          </div>
          <div 
            onClick={() => setSeverityFilter("high+")}
            style={{ 
              background: severityFilter === "high+" ? "#fff7ed" : "white", 
              borderRadius: 12, 
              padding: 16, 
              textAlign: "center", 
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              cursor: "pointer",
              border: severityFilter === "high+" ? "2px solid #ea580c" : "2px solid transparent",
              transition: "all 0.2s"
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: "#ea580c" }}>{highPlusCount}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>High+</div>
          </div>
          <div 
            onClick={() => setSeverityFilter("exhibit")}
            style={{ 
              background: severityFilter === "exhibit" ? "#EAF5F3" : "white", 
              borderRadius: 12, 
              padding: 16, 
              textAlign: "center", 
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              cursor: "pointer",
              border: severityFilter === "exhibit" ? "2px solid #2F9D94" : "2px solid transparent",
              transition: "all 0.2s"
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: "#2F9D94" }}>{exhibitCount}</div>
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
                { key: "exhibit", label: "📋 Exhibit" },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setSeverityFilter(f.key as any)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 20,
                    border: "1px solid",
                    borderColor: severityFilter === f.key ? "#2F9D94" : "#e5e7eb",
                    background: severityFilter === f.key ? "#EAF5F3" : "white",
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

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: '#3b82f6', fontWeight: 500, marginLeft: 'auto' }}>
              <input
                type="checkbox"
                checked={selectedIds.size > 0 && filteredIncidents.length > 0 && filteredIncidents.every(i => selectedIds.has(i.id))}
                onChange={selectAllVisible}
                style={{ accentColor: '#3b82f6', width: 16, height: 16 }}
              />
              Select All
            </label>
          </div>

          <div style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
            Showing {filteredIncidents.length} of {incidents.length} incidents
          </div>
        </div>

        {/* Pattern Chips */}
        {sortedPatterns.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {sortedPatterns.map(([pattern, count]) => (
              <button
                key={pattern}
                onClick={() => setPatternFilter(patternFilter === pattern ? 'all' : pattern)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  border: '1px solid',
                  borderColor: patternFilter === pattern ? '#f59e0b' : '#e5e7eb',
                  background: patternFilter === pattern ? '#fef3c7' : 'white',
                  color: patternFilter === pattern ? '#92400e' : '#6b7280',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {pattern}
                <span style={{
                  background: patternFilter === pattern ? '#fcd34d' : '#f3f4f6',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 700
                }}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Grouped List */}
        {Object.keys(groupedIncidents).length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: 64,
            background: "white",
            borderRadius: 12,
            color: "#6b7280"
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔭</div>
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
                            toggleSelected(incident.id);
                          }}
                          style={{
                            width: 44,
                            height: 44,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                            margin: "-12px -6px -12px -12px"
                          }}
                        >
                          <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            border: `2px solid ${selectedIds.has(incident.id) ? "#3b82f6" : "#d1d5db"}`,
                            background: selectedIds.has(incident.id) ? "#3b82f6" : "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                            {selectedIds.has(incident.id) && (
                              <span style={{ color: "white", fontSize: 12 }}>✓</span>
                            )}
                          </div>
                        </div>

                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExhibit(incident.id, !!incident.include_in_exhibit);
                          }}
                          style={{
                            width: 44,
                            height: 44,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            flexShrink: 0,
                            margin: "-12px -6px -12px -6px"
                          }}
                        >
                          <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            border: `2px solid ${incident.include_in_exhibit ? "#2F9D94" : "#d1d5db"}`,
                            background: incident.include_in_exhibit ? "#2F9D94" : "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}>
                            {incident.include_in_exhibit && (
                              <span style={{ color: "white", fontSize: 12 }}>✓</span>
                            )}
                          </div>
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

                        {/* Source type indicator */}
                        {incident.source_type && incident.source_type !== 'coparent' && (
                          <span style={{
                            padding: "4px 8px",
                            borderRadius: 8,
                            fontSize: 10,
                            fontWeight: 600,
                            background: "#e0e7ff",
                            color: "#3730a3",
                            flexShrink: 0
                          }}>
                            {getSourceTypeLabel(incident.source_type)}
                          </span>
                        )}

                        <div style={{
                          flexShrink: 0,
                          fontSize: 13,
                          fontWeight: 600,
                          color: incident.category === 'not_abuse' ? "#9ca3af" : "#374151",
                          maxWidth: 140,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {categoryLabels[incident.category] || incident.category || "—"}
                        </div>

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
                              ✏️ Edit
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
                              ❌ Not Abuse
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
                              🗑️ Delete
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

                          {/* Source Info */}
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>
                              📌 SOURCE
                            </div>
                            <div style={{ fontSize: 14, color: "#374151" }}>
                              {incident.source_name || getSourceTypeLabel(incident.source_type)}
                            </div>
                          </div>

                          {/* Patterns */}
                          {incident.patterns?.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8 }}>
                                ⚠️ PATTERNS DETECTED
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
                              📨 MESSAGES ({incident.messages_json?.length || 1})
                            </div>
                            <div style={{
                              background: "#f9fafb",
                              borderRadius: 8,
                              maxHeight: 400,
                              overflowY: "auto",
                              padding: 12
                            }}>
                              {incident.messages_json && incident.messages_json.length > 0 ? (
                                (() => {
                                  const firstCoparentIdx = incident.messages_json.findIndex((m: any) => m.sender === 'coparent');
                                  return incident.messages_json.map((msg: any, idx: number) => {
                                    const isCoparent = msg.sender === 'coparent';
                                    return (
                                      <div key={idx}>
                                        <div style={{
                                          display: "flex",
                                          justifyContent: isCoparent ? "flex-start" : "flex-end",
                                          marginBottom: 12
                                        }}>
                                          <div style={{
                                            maxWidth: "85%",
                                            background: isCoparent ? "#fef2f2" : "#EAF5F3",
                                            borderLeft: `4px solid ${isCoparent ? "#dc2626" : "#2F9D94"}`,
                                            borderRadius: 8,
                                            padding: 12
                                          }}>
                                            <div style={{
                                              display: "flex",
                                              justifyContent: "space-between",
                                              marginBottom: 4,
                                              fontSize: 11,
                                              color: "#9ca3af"
                                            }}>
                                              <span style={{
                                                fontWeight: 600,
                                                color: isCoparent ? "#dc2626" : "#2F9D94"
                                              }}>
                                                {isCoparent ? 'Co-parent' : 'You'}
                                              </span>
                                              <span style={{ marginLeft: 12 }}>
                                                {msg.timestamp ? new Date(msg.timestamp).toLocaleString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  hour: 'numeric',
                                                  minute: '2-digit'
                                                }) : ''}
                                              </span>
                                            </div>
                                            <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
                                              {msg.text}
                                            </div>
                                          </div>
                                        </div>
                                        {idx === firstCoparentIdx && incident.patterns?.length > 0 && (
                                          <div style={{ marginBottom: 12, paddingLeft: 4 }}>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                              {incident.patterns.map((pattern: string, pi: number) => (
                                                <div key={pi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                  <span style={{
                                                    padding: "4px 10px",
                                                    background: "#fef3c7",
                                                    border: "1px solid #fcd34d",
                                                    borderRadius: 12,
                                                    fontSize: 11,
                                                    color: "#92400e",
                                                    fontWeight: 600
                                                  }}>
                                                    {pattern}
                                                  </span>
                                                  {patternExplanations[pattern] && (
                                                    <span style={{ fontSize: 10, color: "#9ca3af", paddingLeft: 4 }}>
                                                      {patternExplanations[pattern]}
                                                    </span>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  });
                                })()
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

      {/* Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: exhibitCount > 0 ? 170 : 100,
          left: 20,
          right: 20,
          background: '#3b82f6',
          borderRadius: 16,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 1000
        }}>
          <div style={{ color: 'white', fontSize: 15 }}>
            <span style={{ fontWeight: 700 }}>{selectedIds.size}</span> selected
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={addSelectedToExhibit}
              style={{
                background: 'white',
                color: '#3b82f6',
                border: 'none',
                borderRadius: 10,
                padding: '10px 16px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 13
              }}
            >
              Add to Exhibit
            </button>
            <button
              onClick={copySelectedToClipboard}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 10,
                padding: '10px 16px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 13
              }}
            >
              {copySuccess ? 'Copied!' : 'Copy Text'}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: 18,
                padding: '4px 8px'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      {exhibitCount > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 100,
          left: 20,
          right: 20,
          background: 'var(--teal)',
          borderRadius: 16,
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 8px 24px rgba(31, 41, 55, 0.2)',
          zIndex: 1000
        }}>
          <div style={{ color: 'var(--warm-white)', fontSize: 15 }}>
            ✓ <span style={{ fontWeight: 700 }}>{exhibitCount}</span> incidents selected
          </div>
          <button
            onClick={() => router.push('/generate-exhibit')}
            style={{
              background: '#2F9D94',
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
            Generate Exhibit →
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
              {/* Source Type */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                  Source Type
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {SOURCE_TYPES.map(st => (
                    <button
                      key={st.value}
                      onClick={() => setEditSourceType(st.value)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: editSourceType === st.value ? "2px solid #1F2937" : "1px solid #e5e7eb",
                        background: editSourceType === st.value ? "#EAF5F3" : "white",
                        cursor: "pointer",
                        textAlign: "left"
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>{st.label}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{st.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Source Name */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                  Custom Source Label (optional)
                </label>
                <input
                  type="text"
                  value={editSourceName}
                  onChange={(e) => setEditSourceName(e.target.value)}
                  placeholder="e.g., Child's text to Father, Teacher email"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    fontSize: 14,
                    boxSizing: "border-box"
                  }}
                />
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#9ca3af" }}>
                  This label will appear in court documents
                </p>
              </div>

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
                        border: editSeverity === sev ? "2px solid #1F2937" : "1px solid #e5e7eb",
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
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Preview in exhibit:</div>
                <div style={{ fontSize: 13, color: "#374151" }}>
                  <strong>Source:</strong> {editSourceName || SOURCE_TYPES.find(s => s.value === editSourceType)?.label}
                </div>
                <div style={{ fontSize: 13, color: "#374151" }}>
                  <strong>Severity:</strong> {editSeverity.toUpperCase()}
                </div>
                <div style={{ fontSize: 13, color: "#374151" }}>
                  <strong>Patterns:</strong> {editPatterns.join(", ") || "None"}
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
                  background: saving ? "#9ca3af" : "#1F2937",
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
          <div style={{ fontSize: 32, marginBottom: 16 }}>📂</div>
          <p style={{ color: "#6b7280" }}>Loading...</p>
        </div>
      </div>
    }>
      <EvidenceContent />
    </Suspense>
  );
}