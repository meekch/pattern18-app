"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/layout/AppLayout";

export default function LogIncidentPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUserId(session.user.id);
    };
    load();
  }, [router]);

  const handleAnalyze = async () => {
    if (!message.trim()) return;
    
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context })
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      console.error(e);
      // Fallback analysis
      setAnalysis({
        patterns: ["Communication Issue"],
        severity: "medium",
        coaching: "Document this interaction for your records."
      });
    }
    setAnalyzing(false);
  };

  const handleSave = async () => {
    if (!userId || !message.trim()) return;
    
    setSaving(true);
    try {
      const { error } = await supabase.from("incidents").insert({
        user_id: userId,
        coparent_message: message,
        user_context: context,
        patterns: analysis?.patterns || [],
        severity: analysis?.severity || "medium",
        incident_date: incidentDate,
        source: "manual_log"
      });
      
      if (!error) {
        setSaved(true);
        setTimeout(() => {
          router.push("/evidence");
        }, 1500);
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleReset = () => {
    setMessage("");
    setContext("");
    setAnalysis(null);
    setSaved(false);
    setIncidentDate(new Date().toISOString().split('T')[0]);
  };

  if (saved) {
    return (
      <AppLayout>
        <div className="success-screen">
          <div className="success-icon">✓</div>
          <h2>Incident Logged</h2>
          <p>Your evidence has been saved securely.</p>
          <div className="success-actions">
            <button onClick={handleReset} className="log-another-btn">Log Another</button>
            <button onClick={() => router.push("/evidence")} className="view-btn">View Evidence</button>
          </div>
        </div>
        <style jsx>{`
          .success-screen {
            text-align: center;
            padding: 80px 20px;
          }
          .success-icon {
            width: 80px;
            height: 80px;
            background: #2dd4a8;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            margin: 0 auto 24px;
          }
          .success-screen h2 {
            margin: 0 0 8px;
            color: #1a3a2f;
          }
          .success-screen p {
            color: #666;
            margin: 0 0 32px;
          }
          .success-actions {
            display: flex;
            gap: 16px;
            justify-content: center;
          }
          .log-another-btn {
            padding: 14px 28px;
            background: white;
            border: 2px solid #1a3a2f;
            border-radius: 10px;
            color: #1a3a2f;
            font-weight: 600;
            cursor: pointer;
          }
          .view-btn {
            padding: 14px 28px;
            background: #1a3a2f;
            border: none;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            cursor: pointer;
          }
        `}</style>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="log-page">
        <div className="log-header">
          <h1>🆘 Log Incident</h1>
          <p>Document what happened. Stay calm. This is strategic.</p>
        </div>

        {/* Calming reminder */}
        <div className="calm-card">
          <span className="calm-icon">💚</span>
          <div className="calm-text">
            <strong>Remember:</strong> You're documenting, not reacting. 
            Take a breath. Every piece of evidence strengthens your case.
          </div>
        </div>

        <div className="log-form">
          {/* Date */}
          <div className="form-group">
            <label>When did this happen?</label>
            <input
              type="date"
              value={incidentDate}
              onChange={e => setIncidentDate(e.target.value)}
              className="date-input"
            />
          </div>

          {/* Message */}
          <div className="form-group">
            <label>What did they say or do?</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Paste their message, or describe what happened in detail..."
              rows={6}
            />
            <span className="helper-text">Be specific. Include exact words if you have them.</span>
          </div>

          {/* Context */}
          <div className="form-group">
            <label>Context (optional but helpful)</label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="What led to this? What were you discussing? Any background info..."
              rows={3}
            />
          </div>

          {/* Analyze button */}
          {!analysis && (
            <button 
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={!message.trim() || analyzing}
            >
              {analyzing ? (
                <>Analyzing...</>
              ) : (
                <>🔍 Detect Patterns & Get Coaching</>
              )}
            </button>
          )}

          {/* Analysis Results */}
          {analysis && (
            <div className="analysis-section">
              <h3>Analysis Results</h3>
              
              <div className="analysis-grid">
                {/* Patterns */}
                <div className="analysis-card">
                  <h4>Patterns Detected</h4>
                  <div className="patterns-list">
                    {analysis.patterns?.length > 0 ? (
                      analysis.patterns.map((p: string, i: number) => (
                        <span key={i} className="pattern-tag">{p}</span>
                      ))
                    ) : (
                      <span className="no-patterns">No specific patterns detected</span>
                    )}
                  </div>
                </div>

                {/* Severity */}
                <div className="analysis-card">
                  <h4>Severity Assessment</h4>
                  <div className={`severity-badge severity-${analysis.severity || 'medium'}`}>
                    {(analysis.severity || 'medium').charAt(0).toUpperCase() + (analysis.severity || 'medium').slice(1)}
                  </div>
                </div>
              </div>

              {/* Coaching */}
              {analysis.coaching && (
                <div className="coaching-card">
                  <h4>💡 Strategic Guidance</h4>
                  <p>{analysis.coaching}</p>
                </div>
              )}

              {/* Re-analyze button */}
              <button 
                className="reanalyze-btn"
                onClick={() => { setAnalysis(null); handleAnalyze(); }}
              >
                🔄 Re-analyze
              </button>
            </div>
          )}

          {/* Save button */}
          <div className="form-actions">
            <button 
              className="cancel-btn"
              onClick={() => router.push("/dashboard")}
            >
              Cancel
            </button>
            <button 
              className="save-btn"
              onClick={handleSave}
              disabled={!message.trim() || saving}
            >
              {saving ? "Saving..." : "💾 Save to Evidence"}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .log-page {
          max-width: 700px;
          margin: 0 auto;
        }

        .log-header {
          margin-bottom: 24px;
        }
        .log-header h1 {
          margin: 0 0 8px;
          font-size: 28px;
          color: #1a3a2f;
        }
        .log-header p {
          margin: 0;
          color: #666;
        }

        .calm-card {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          background: linear-gradient(135deg, #f0f9f6 0%, #e8f5e9 100%);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .calm-icon {
          font-size: 32px;
        }
        .calm-text {
          font-size: 14px;
          color: #1a3a2f;
          line-height: 1.5;
        }

        .log-form {
          background: white;
          border-radius: 16px;
          padding: 32px;
        }

        .form-group {
          margin-bottom: 24px;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
        }
        .form-group textarea,
        .form-group input {
          width: 100%;
          padding: 14px;
          border: 1px solid #ddd;
          border-radius: 10px;
          font-size: 15px;
          font-family: inherit;
          transition: border-color 0.2s;
        }
        .form-group textarea:focus,
        .form-group input:focus {
          outline: none;
          border-color: #2dd4a8;
        }
        .date-input {
          max-width: 200px;
        }
        .helper-text {
          display: block;
          font-size: 12px;
          color: #999;
          margin-top: 6px;
        }

        .analyze-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          border: none;
          border-radius: 10px;
          color: white;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          margin-bottom: 24px;
        }
        .analyze-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .analysis-section {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .analysis-section h3 {
          margin: 0 0 16px;
          font-size: 16px;
          color: #333;
        }
        .analysis-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        @media (max-width: 500px) {
          .analysis-grid {
            grid-template-columns: 1fr;
          }
        }
        .analysis-card {
          background: white;
          border-radius: 10px;
          padding: 16px;
        }
        .analysis-card h4 {
          margin: 0 0 12px;
          font-size: 13px;
          color: #666;
          font-weight: 500;
        }
        .patterns-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .pattern-tag {
          background: #1a3a2f;
          color: white;
          padding: 4px 12px;
          border-radius: 15px;
          font-size: 12px;
        }
        .no-patterns {
          font-size: 13px;
          color: #999;
          font-style: italic;
        }
        .severity-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
        }
        .severity-critical {
          background: #fee2e2;
          color: #dc2626;
        }
        .severity-high {
          background: #fff7ed;
          color: #ea580c;
        }
        .severity-medium {
          background: #fef9c3;
          color: #ca8a04;
        }
        .severity-low {
          background: #f0f9f6;
          color: #1a3a2f;
        }

        .coaching-card {
          background: white;
          border-left: 4px solid #2dd4a8;
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .coaching-card h4 {
          margin: 0 0 8px;
          font-size: 14px;
          color: #1a3a2f;
        }
        .coaching-card p {
          margin: 0;
          font-size: 14px;
          color: #555;
          line-height: 1.6;
        }

        .reanalyze-btn {
          background: none;
          border: none;
          color: #666;
          font-size: 13px;
          cursor: pointer;
          padding: 0;
        }
        .reanalyze-btn:hover {
          color: #333;
        }

        .form-actions {
          display: flex;
          gap: 16px;
          justify-content: flex-end;
          padding-top: 16px;
          border-top: 1px solid #eee;
        }
        .cancel-btn {
          padding: 14px 28px;
          background: none;
          border: 1px solid #ddd;
          border-radius: 10px;
          color: #666;
          cursor: pointer;
        }
        .save-btn {
          padding: 14px 32px;
          background: #2dd4a8;
          border: none;
          border-radius: 10px;
          color: #1a3a2f;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
        }
        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </AppLayout>
  );
}