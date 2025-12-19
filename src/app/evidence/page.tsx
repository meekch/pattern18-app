"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Incident {
  id: string;
  coparent_message: string | null;
  coach_response: string | null;
  patterns: string[];
  incident_type: string;
  severity: string;
  incident_date: string;
  created_at: string;
}

export default function EvidenceDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [patternSummary, setPatternSummary] = useState<Record<string, number>>({});
  const [totalIncidents, setTotalIncidents] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      loadEvidence(session.user.id);
    };
    checkAuth();
  }, [router]);

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

  const getMaxCount = () => {
    const counts = Object.values(patternSummary);
    return counts.length > 0 ? Math.max(...counts) : 1;
  };

  const sortedPatterns = Object.entries(patternSummary)
    .sort(([, a], [, b]) => b - a);

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
      <header className="header">
        <button onClick={() => router.push("/coach")} className="back-btn">
          ← Back to Coach
        </button>
        <h1>📊 Evidence Dashboard</h1>
        <button className="export-btn" onClick={() => alert("PDF export coming soon!")}>
          Export PDF
        </button>
      </header>

      <main className="main">
        {/* Summary Card */}
        <div className="summary-card">
          <div className="summary-number">{totalIncidents}</div>
          <div className="summary-label">Incidents Documented</div>
          <p className="summary-subtext">
            {totalIncidents === 0 
              ? "Start saving incidents from your chat to build your evidence."
              : "Every documented incident strengthens your case."}
          </p>
        </div>

        {/* Pattern Breakdown */}
        {sortedPatterns.length > 0 && (
          <div className="patterns-card">
            <h2>Pattern Breakdown</h2>
            <p className="card-subtitle">Manipulation tactics identified in your documented incidents</p>
            <div className="pattern-bars">
              {sortedPatterns.map(([pattern, count]) => (
                <div key={pattern} className="pattern-row">
                  <div className="pattern-name">{pattern}</div>
                  <div className="pattern-bar-container">
                    <div 
                      className="pattern-bar" 
                      style={{ width: `${(count / getMaxCount()) * 100}%` }}
                    />
                  </div>
                  <div className="pattern-count">{count}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Incidents */}
        <div className="incidents-card">
          <h2>Recent Incidents</h2>
          {incidents.length === 0 ? (
            <div className="empty-state">
              <p>No incidents saved yet.</p>
              <p>When you get help with a message in chat, click "Save to Evidence" to document it here.</p>
              <button onClick={() => router.push("/coach")} className="cta-btn">
                Go to Coach
              </button>
            </div>
          ) : (
            <div className="incidents-list">
              {incidents.map((incident) => (
                <div key={incident.id} className="incident-item">
                  <div className="incident-date">{formatDate(incident.created_at)}</div>
                  <div className="incident-patterns">
                    {incident.patterns?.map((p, i) => (
                      <span key={i} className="incident-tag">{p}</span>
                    ))}
                  </div>
                  {incident.coparent_message && (
                    <div className="incident-message">
                      "{incident.coparent_message.slice(0, 150)}..."
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .evidence-page {
          min-height: 100vh;
          height: 100vh;
          overflow-y: auto;
          background: #f8faf9;
        }
        .header {
          background: linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%);
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: white;
        }
        .back-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.8);
          font-size: 14px;
          cursor: pointer;
        }
        .back-btn:hover { color: white; }
        .header h1 {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }
        .export-btn {
          background: #2dd4a8;
          color: #1a3a2f;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .export-btn:hover { transform: translateY(-2px); }

        .main {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
        }

        .summary-card {
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          color: white;
          margin-bottom: 24px;
        }
        .summary-number {
          font-size: 72px;
          font-weight: 700;
          color: #2dd4a8;
          line-height: 1;
        }
        .summary-label {
          font-size: 20px;
          margin-top: 8px;
          opacity: 0.9;
        }
        .summary-subtext {
          margin-top: 16px;
          font-size: 14px;
          opacity: 0.7;
        }

        .patterns-card, .incidents-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }
        .patterns-card h2, .incidents-card h2 {
          font-size: 18px;
          color: #1a3a2f;
          margin: 0 0 4px;
        }
        .card-subtitle {
          font-size: 14px;
          color: #666;
          margin: 0 0 20px;
        }

        .pattern-bars {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pattern-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pattern-name {
          width: 140px;
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }
        .pattern-bar-container {
          flex: 1;
          height: 24px;
          background: #f0f0f0;
          border-radius: 12px;
          overflow: hidden;
        }
        .pattern-bar {
          height: 100%;
          background: linear-gradient(90deg, #2dd4a8 0%, #1a9a7a 100%);
          border-radius: 12px;
          transition: width 0.5s ease;
        }
        .pattern-count {
          width: 40px;
          text-align: right;
          font-weight: 600;
          color: #1a3a2f;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #666;
        }
        .empty-state p {
          margin: 8px 0;
        }
        .cta-btn {
          margin-top: 20px;
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        .cta-btn:hover { transform: translateY(-2px); }

        .incidents-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .incident-item {
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 16px;
        }
        .incident-date {
          font-size: 12px;
          color: #999;
          margin-bottom: 8px;
        }
        .incident-patterns {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
        }
        .incident-tag {
          background: #1a3a2f;
          color: white;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }
        .incident-message {
          font-size: 13px;
          color: #555;
          font-style: italic;
          line-height: 1.5;
        }

        @media (max-width: 640px) {
          .header h1 { font-size: 16px; }
          .main { padding: 16px; }
          .summary-card { padding: 30px 20px; }
          .summary-number { font-size: 56px; }
          .pattern-name { width: 100px; font-size: 12px; }
        }
      `}</style>
    </div>
  );
}

