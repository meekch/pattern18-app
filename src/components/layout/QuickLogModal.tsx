"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface QuickLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  userId?: string;
}

export default function QuickLogModal({ isOpen, onClose, onSave, userId }: QuickLogModalProps) {
  const [message, setMessage] = useState("");
  const [context, setContext] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  if (!isOpen) return null;

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
        incident_date: new Date().toISOString(),
        source: "quick_log"
      });
      
      if (!error) {
        setMessage("");
        setContext("");
        setAnalysis(null);
        onSave();
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const handleClose = () => {
    setMessage("");
    setContext("");
    setAnalysis(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <span className="header-icon">🆘</span>
            <div>
              <h2>Log Incident</h2>
              <p>Capture what just happened</p>
            </div>
          </div>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Calming message */}
          <div className="calm-banner">
            <span></span>
            <p>Take a breath. You're documenting, not reacting. This is strategic.</p>
          </div>

          {/* Message input */}
          <div className="input-group">
            <label>What did they say or do?</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Paste their message or describe what happened..."
              rows={4}
            />
          </div>

          {/* Context input */}
          <div className="input-group">
            <label>Context (optional)</label>
            <textarea
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="What led to this? What's the background?"
              rows={2}
            />
          </div>

          {/* Analyze button */}
          {!analysis && (
            <button 
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={!message.trim() || analyzing}
            >
              {analyzing ? "Analyzing..." : "🔍 Detect Patterns"}
            </button>
          )}

          {/* Analysis results */}
          {analysis && (
            <div className="analysis-results">
              <h3>Patterns Detected</h3>
              <div className="patterns-list">
                {analysis.patterns?.map((p: string, i: number) => (
                  <span key={i} className="pattern-tag">{p}</span>
                ))}
                {(!analysis.patterns || analysis.patterns.length === 0) && (
                  <span className="no-patterns">No specific patterns detected</span>
                )}
              </div>
              
              {analysis.severity && (
                <div className={`severity severity-${analysis.severity}`}>
                  Severity: {analysis.severity.charAt(0).toUpperCase() + analysis.severity.slice(1)}
                </div>
              )}

              {analysis.coaching && (
                <div className="coaching">
                  <h4>💡 Coach Says:</h4>
                  <p>{analysis.coaching}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={handleClose}>Cancel</button>
          <button 
            className="save-btn"
            onClick={handleSave}
            disabled={!message.trim() || saving}
          >
            {saving ? "Saving..." : "Save to Evidence"}
          </button>
        </div>

        <style jsx>{`
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 20px;
          }

          .modal {
            background: white;
            border-radius: 16px;
            width: 100%;
            max-width: 540px;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            animation: slideUp 0.3s ease;
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .modal-header {
            padding: 20px 24px;
            background: #EAF5F3;
            color: #1F2937;
            border-top: 4px solid #2F9D94;
            border-bottom: 1px solid #C7E4E0;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .header-content {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .header-icon {
            font-size: 28px;
          }
          .modal-header h2 {
            margin: 0;
            font-size: 18px;
          }
          .modal-header p {
            margin: 4px 0 0;
            font-size: 13px;
            opacity: 0.8;
          }
          .close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 28px;
            cursor: pointer;
            opacity: 0.7;
            line-height: 1;
          }
          .close-btn:hover {
            opacity: 1;
          }

          .modal-body {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
          }

          .calm-banner {
            display: flex;
            gap: 10px;
            align-items: center;
            background: #f0f9f6;
            border-radius: 10px;
            padding: 12px 16px;
            margin-bottom: 20px;
          }
          .calm-banner span {
            font-size: 20px;
          }
          .calm-banner p {
            margin: 0;
            font-size: 13px;
            color: #1F2937;
          }

          .input-group {
            margin-bottom: 16px;
          }
          .input-group label {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: #333;
            margin-bottom: 6px;
          }
          .input-group textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #ddd;
            border-radius: 8px;
            font-size: 14px;
            resize: vertical;
            font-family: inherit;
          }
          .input-group textarea:focus {
            outline: none;
            border-color: #2dd4a8;
          }

          .analyze-btn {
            width: 100%;
            padding: 14px;
            background: #f0f9f6;
            border: 2px solid #2dd4a8;
            border-radius: 10px;
            color: #1F2937;
            font-weight: 600;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .analyze-btn:hover:not(:disabled) {
            background: #e0f5ef;
          }
          .analyze-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .analysis-results {
            background: #f8f8f8;
            border-radius: 10px;
            padding: 16px;
            margin-top: 16px;
          }
          .analysis-results h3 {
            margin: 0 0 12px;
            font-size: 14px;
            color: #333;
          }
          .patterns-list {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 12px;
          }
          .pattern-tag {
            background: #1F2937;
            color: white;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 12px;
          }
          .no-patterns {
            color: #666;
            font-size: 13px;
            font-style: italic;
          }

          .severity {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 12px;
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
            color: #1F2937;
          }

          .coaching {
            background: white;
            border-radius: 8px;
            padding: 12px;
            border-left: 3px solid #2dd4a8;
          }
          .coaching h4 {
            margin: 0 0 6px;
            font-size: 13px;
            color: #1F2937;
          }
          .coaching p {
            margin: 0;
            font-size: 13px;
            color: #555;
            line-height: 1.5;
          }

          .modal-footer {
            padding: 16px 24px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }
          .cancel-btn {
            padding: 12px 24px;
            background: none;
            border: 1px solid #ddd;
            border-radius: 8px;
            color: #666;
            cursor: pointer;
          }
          .save-btn {
            padding: 12px 24px;
            background: #2dd4a8;
            border: none;
            border-radius: 8px;
            color: #1F2937;
            font-weight: 600;
            cursor: pointer;
          }
          .save-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}