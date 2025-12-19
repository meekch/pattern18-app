"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Incident {
  id: string;
  title?: string;
  coparent_message: string | null;
  patterns: string[];
  severity: string;
  incident_date: string;
  created_at: string;
  source?: string;
  message_count?: number;
  evidence_strength?: string;
  category?: string;
}

interface CaseInfo {
  user_role: string;
  user_legal_name: string;
  coparent_legal_name: string;
  case_number: string;
}

// Group patterns into categories
const PATTERN_CATEGORIES: Record<string, string[]> = {
  "Control & Coercion": ["Control", "Gatekeeping", "Financial Abuse", "Isolation", "Monitoring"],
  "Manipulation": ["Gaslighting", "DARVO", "Blame Shifting", "Projection", "Moving Goalposts", "Triangulation"],
  "Verbal & Emotional": ["Threats", "Intimidation", "Name-calling", "Insults", "Silent Treatment"],
  "Legal & Systemic": ["Litigation Abuse", "False Allegations", "Parental Alienation", "Weaponizing"],
};

export default function EvidenceDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [patternSummary, setPatternSummary] = useState<Record<string, number>>({});
  const [totalIncidents, setTotalIncidents] = useState(0);
  
  // Selection state
  const [selectedIncidents, setSelectedIncidents] = useState<Set<string>>(new Set());
  const [selectedPatterns, setSelectedPatterns] = useState<Set<string>>(new Set());
  
  // UI state
  const [showDocMenu, setShowDocMenu] = useState(false);
  const [mode, setMode] = useState<'view' | 'select'>('view');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      await Promise.all([
        loadEvidence(session.user.id),
        loadCaseInfo(session.user.id)
      ]);
    };
    checkAuth();
  }, [router]);

  // Show toast if redirected from upload
  useEffect(() => {
    const saved = searchParams.get('saved');
    if (saved) {
      setToast(`✓ ${saved} incidents saved to your evidence`);
      setTimeout(() => setToast(null), 4000);
    }
  }, [searchParams]);

  const loadCaseInfo = async (userId: string) => {
    const { data } = await supabase
      .from("user_cases")
      .select("user_role, user_legal_name, coparent_legal_name, case_number")
      .eq("user_id", userId)
      .single();
    
    if (data) {
      setCaseInfo(data);
    }
  };

  const loadEvidence = async (userId: string) => {
    try {
      const response = await fetch(`/api/incidents?userId=${userId}`);
      const data = await response.json();

      if (data.incidents) {
        setIncidents(data.incidents);
        setPatternSummary(data.patternSummary || {});
        setTotalIncidents(data.total || 0);
      }
    } catch (error) {
      console.error("Error loading evidence:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Calculate stats
  const criticalCount = incidents.filter(i => i.severity === 'critical').length;
  const highCount = incidents.filter(i => i.severity === 'high').length;
  const dateRange = incidents.length > 0 
    ? {
        start: new Date(Math.min(...incidents.map(i => new Date(i.incident_date || i.created_at).getTime()))),
        end: new Date(Math.max(...incidents.map(i => new Date(i.incident_date || i.created_at).getTime())))
      }
    : null;
  const monthsSpan = dateRange 
    ? Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  // Group patterns by category
  const groupedPatterns: Record<string, { pattern: string; count: number }[]> = {};
  Object.entries(PATTERN_CATEGORIES).forEach(([category, patterns]) => {
    const matches = patterns
      .filter(p => patternSummary[p])
      .map(p => ({ pattern: p, count: patternSummary[p] }))
      .sort((a, b) => b.count - a.count);
    if (matches.length > 0) {
      groupedPatterns[category] = matches;
    }
  });

  // Selection handlers
  const toggleIncident = (id: string) => {
    setSelectedIncidents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllIncidents = () => {
    if (selectedIncidents.size === incidents.length) {
      setSelectedIncidents(new Set());
    } else {
      setSelectedIncidents(new Set(incidents.map(i => i.id)));
    }
  };

  const handleGenerateDocument = (type: string) => {
    setShowDocMenu(false);
    
    if (type === 'respond') {
      router.push('/court-docs/respond');
    } else if (type === 'motion') {
      router.push('/court-docs/motion');
    } else if (type === 'exhibit') {
      // Generate exhibit with selected incidents
      const ids = Array.from(selectedIncidents).join(',');
      router.push(`/court-docs/exhibit?incidents=${ids}`);
    } else if (type === 'summary') {
      router.push('/court-docs/summary');
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading your evidence...</p>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0d1f18 0%, #1a3a2f 100%);
            color: white;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.2);
            border-top-color: #2dd4a8;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 16px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="evidence-page">
      {/* Toast */}
      {toast && (
        <div className="toast">{toast}</div>
      )}

      <header className="header">
        <button onClick={() => router.push("/coach")} className="back-btn">
          ← Coach
        </button>
        <h1>📊 Evidence Dashboard</h1>
        <div className="header-actions">
          <button className="import-btn" onClick={() => router.push("/evidence/upload")}>
            📤 Import
          </button>
          <div className="doc-menu-container">
            <button 
              className="generate-btn" 
              onClick={() => setShowDocMenu(!showDocMenu)}
            >
              Generate Document ▼
            </button>
            {showDocMenu && (
              <div className="doc-menu">
                <button onClick={() => handleGenerateDocument('respond')}>
                  📩 Respond to Their Filing
                </button>
                <button onClick={() => handleGenerateDocument('motion')}>
                  📋 Create Motion/Petition
                </button>
                <button onClick={() => handleGenerateDocument('exhibit')}>
                  📎 Exhibit Package
                </button>
                <button onClick={() => handleGenerateDocument('summary')}>
                  📊 Pattern Summary Report
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Case setup prompt */}
      {!caseInfo && (
        <div className="setup-banner">
          <span>⚠️ Set up your case info for accurate document generation</span>
          <button onClick={() => router.push("/case-setup")}>
            Set Up Case →
          </button>
        </div>
      )}

      <main className="main">
        {/* Quick Stats Row */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{totalIncidents}</div>
            <div className="stat-label">Incidents</div>
          </div>
          <div className="stat-card critical">
            <div className="stat-value">{criticalCount}</div>
            <div className="stat-label">Critical</div>
          </div>
          <div className="stat-card high">
            <div className="stat-value">{highCount}</div>
            <div className="stat-label">High</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{monthsSpan}mo</div>
            <div className="stat-label">Span</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Object.keys(patternSummary).length}</div>
            <div className="stat-label">Patterns</div>
          </div>
        </div>

        {/* Pattern Categories */}
        {Object.keys(groupedPatterns).length > 0 && (
          <div className="patterns-section">
            <h2>Pattern Analysis</h2>
            <div className="pattern-categories">
              {Object.entries(groupedPatterns).map(([category, patterns]) => (
                <div key={category} className="pattern-category">
                  <div className="category-header">
                    <span className="category-name">{category}</span>
                    <span className="category-count">
                      {patterns.reduce((sum, p) => sum + p.count, 0)}
                    </span>
                  </div>
                  <div className="category-patterns">
                    {patterns.map(({ pattern, count }) => (
                      <div key={pattern} className="pattern-item">
                        <span className="pattern-name">{pattern}</span>
                        <span className="pattern-count">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incidents */}
        <div className="incidents-section">
          <div className="incidents-header">
            <h2>Documented Incidents</h2>
            <div className="incidents-actions">
              {mode === 'select' && (
                <>
                  <button 
                    className="select-all-btn"
                    onClick={toggleAllIncidents}
                  >
                    {selectedIncidents.size === incidents.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="selection-count">
                    {selectedIncidents.size} selected
                  </span>
                </>
              )}
              <button 
                className="mode-btn"
                onClick={() => {
                  setMode(mode === 'view' ? 'select' : 'view');
                  if (mode === 'select') setSelectedIncidents(new Set());
                }}
              >
                {mode === 'view' ? '☑ Select Evidence' : '✕ Cancel'}
              </button>
              <button 
                className="add-more-btn"
                onClick={() => router.push("/evidence/upload")}
              >
                + Import
              </button>
            </div>
          </div>

          {incidents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h3>No incidents yet</h3>
              <p>Import messages from iMazing or save incidents from chat.</p>
              <div className="empty-actions">
                <button 
                  className="primary-btn"
                  onClick={() => router.push("/evidence/upload")}
                >
                  📤 Import Messages
                </button>
                <button 
                  className="secondary-btn"
                  onClick={() => router.push("/coach")}
                >
                  Go to Coach
                </button>
              </div>
            </div>
          ) : (
            <div className="incidents-list">
              {incidents.map((incident) => (
                <div 
                  key={incident.id} 
                  className={`incident-card ${selectedIncidents.has(incident.id) ? 'selected' : ''} ${mode === 'select' ? 'selectable' : ''}`}
                  onClick={mode === 'select' ? () => toggleIncident(incident.id) : undefined}
                >
                  {mode === 'select' && (
                    <div className="incident-checkbox">
                      {selectedIncidents.has(incident.id) ? '☑' : '☐'}
                    </div>
                  )}
                  <div className="incident-content">
                    <div className="incident-top">
                      <span className="incident-date">
                        {formatDate(incident.incident_date || incident.created_at)}
                      </span>
                      {incident.severity === 'critical' && (
                        <span className="severity-badge critical">Critical</span>
                      )}
                      {incident.severity === 'high' && (
                        <span className="severity-badge high">High</span>
                      )}
                      {incident.source === 'bulk_import' && (
                        <span className="source-badge">Imported</span>
                      )}
                      {incident.evidence_strength === 'strong' && (
                        <span className="strength-badge">Strong</span>
                      )}
                    </div>
                    {incident.title && (
                      <div className="incident-title">{incident.title}</div>
                    )}
                    <div className="incident-patterns">
                      {incident.patterns?.slice(0, 5).map((p, i) => (
                        <span key={i} className="pattern-tag">{p}</span>
                      ))}
                      {incident.patterns?.length > 5 && (
                        <span className="pattern-more">+{incident.patterns.length - 5}</span>
                      )}
                    </div>
                    {incident.message_count && incident.message_count > 1 && (
                      <div className="message-count">{incident.message_count} messages</div>
                    )}
                    {incident.coparent_message && (
                      <div className="incident-preview">
                        "{incident.coparent_message.slice(0, 100)}{incident.coparent_message.length > 100 ? '...' : ''}"
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selection Action Bar */}
        {mode === 'select' && selectedIncidents.size > 0 && (
          <div className="action-bar">
            <div className="action-bar-content">
              <span>{selectedIncidents.size} incident{selectedIncidents.size > 1 ? 's' : ''} selected</span>
              <div className="action-buttons">
                <button onClick={() => handleGenerateDocument('exhibit')}>
                  📎 Create Exhibit
                </button>
                <button onClick={() => handleGenerateDocument('motion')}>
                  📋 Add to Motion
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .evidence-page {
          min-height: 100vh;
          background: #f8faf9;
          padding-bottom: 80px;
        }

        .toast {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #1a3a2f;
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          z-index: 100;
          animation: slideDown 0.3s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .header {
          background: linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%);
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: white;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .back-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.8);
          font-size: 14px;
          cursor: pointer;
        }
        .header h1 {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }
        .header-actions {
          display: flex;
          gap: 10px;
        }
        .import-btn {
          background: rgba(255,255,255,0.1);
          color: white;
          border: 1px solid rgba(255,255,255,0.2);
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        }
        .doc-menu-container {
          position: relative;
        }
        .generate-btn {
          background: #2dd4a8;
          color: #1a3a2f;
          border: none;
          padding: 8px 14px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
        }
        .doc-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
          overflow: hidden;
          min-width: 220px;
        }
        .doc-menu button {
          display: block;
          width: 100%;
          padding: 12px 16px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
          color: #333;
        }
        .doc-menu button:hover {
          background: #f5f5f5;
        }

        .setup-banner {
          background: #fff3cd;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 14px;
          color: #856404;
        }
        .setup-banner button {
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        }

        .main {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
        }

        .stats-row {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .stat-value {
          font-size: 28px;
          font-weight: 700;
          color: #1a3a2f;
        }
        .stat-card.critical .stat-value { color: #dc3545; }
        .stat-card.high .stat-value { color: #fd7e14; }
        .stat-label {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        .patterns-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .patterns-section h2 {
          font-size: 16px;
          margin: 0 0 16px;
          color: #1a3a2f;
        }
        .pattern-categories {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .pattern-category {
          background: #f8faf9;
          border-radius: 8px;
          padding: 12px;
        }
        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .category-name {
          font-weight: 600;
          font-size: 13px;
          color: #1a3a2f;
        }
        .category-count {
          background: #1a3a2f;
          color: white;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
        }
        .category-patterns {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .pattern-item {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #555;
        }
        .pattern-count {
          color: #999;
        }

        .incidents-section {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .incidents-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .incidents-header h2 {
          font-size: 16px;
          margin: 0;
          color: #1a3a2f;
        }
        .incidents-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .select-all-btn,
        .mode-btn,
        .add-more-btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
        }
        .select-all-btn {
          background: none;
          border: 1px solid #ddd;
          color: #666;
        }
        .mode-btn {
          background: #f0f9f6;
          border: 1px solid #2dd4a8;
          color: #1a3a2f;
        }
        .add-more-btn {
          background: none;
          border: 1px solid #2dd4a8;
          color: #1a3a2f;
        }
        .selection-count {
          font-size: 12px;
          color: #666;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .empty-state h3 {
          margin: 0 0 8px;
          color: #333;
        }
        .empty-state p {
          color: #666;
          margin: 0 0 24px;
        }
        .empty-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .primary-btn,
        .secondary-btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .primary-btn {
          background: #1a3a2f;
          color: white;
          border: none;
        }
        .secondary-btn {
          background: white;
          color: #1a3a2f;
          border: 2px solid #1a3a2f;
        }

        .incidents-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .incident-card {
          display: flex;
          gap: 12px;
          padding: 16px;
          border: 1px solid #eee;
          border-radius: 10px;
          transition: all 0.2s;
        }
        .incident-card.selectable {
          cursor: pointer;
        }
        .incident-card.selectable:hover {
          border-color: #2dd4a8;
          background: #f9fffd;
        }
        .incident-card.selected {
          border-color: #2dd4a8;
          background: #e8f9f4;
        }
        .incident-checkbox {
          font-size: 20px;
          color: #2dd4a8;
          width: 24px;
          flex-shrink: 0;
        }
        .incident-content {
          flex: 1;
          min-width: 0;
        }
        .incident-top {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .incident-date {
          font-size: 12px;
          color: #999;
        }
        .severity-badge {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 600;
        }
        .severity-badge.critical {
          background: #fee;
          color: #c00;
        }
        .severity-badge.high {
          background: #fff3e0;
          color: #e65100;
        }
        .source-badge {
          font-size: 10px;
          background: #e8f9f4;
          color: #1a9a7a;
          padding: 2px 8px;
          border-radius: 10px;
        }
        .strength-badge {
          font-size: 10px;
          background: #d4edda;
          color: #155724;
          padding: 2px 8px;
          border-radius: 10px;
        }
        .incident-title {
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 6px;
        }
        .incident-patterns {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 6px;
        }
        .pattern-tag {
          background: #1a3a2f;
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
        }
        .pattern-more {
          font-size: 10px;
          color: #999;
        }
        .message-count {
          font-size: 11px;
          color: #666;
          margin-bottom: 4px;
        }
        .incident-preview {
          font-size: 12px;
          color: #666;
          font-style: italic;
          line-height: 1.4;
        }

        .action-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #1a3a2f;
          padding: 16px 24px;
          box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
        }
        .action-bar-content {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: white;
        }
        .action-buttons {
          display: flex;
          gap: 10px;
        }
        .action-buttons button {
          background: #2dd4a8;
          color: #1a3a2f;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }

        @media (max-width: 640px) {
          .stats-row {
            grid-template-columns: repeat(3, 1fr);
          }
          .stat-card:nth-child(4),
          .stat-card:nth-child(5) {
            grid-column: span 1;
          }
          .header-actions {
            gap: 6px;
          }
          .generate-btn,
          .import-btn {
            padding: 6px 10px;
            font-size: 12px;
          }
          .pattern-categories {
            grid-template-columns: 1fr;
          }
          .empty-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}