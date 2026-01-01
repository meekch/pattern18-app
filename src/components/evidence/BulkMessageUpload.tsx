'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  parseCSV,
  parsePDF,
  detectFormat,
  getCourtCoaching,
  type FileFormat,
  type ParseResult,
  type CourtCoachingMessage
} from '@/lib/parsers/imazing-parser';
import {
  analyzeBulk,
  type BulkAnalysisResult,
} from '@/lib/parsers/pattern-detection';
import {
  detectIncidents,
  type Incident,
  type IncidentDetectionResult,
  CATEGORY_DISPLAY_NAMES
} from '@/lib/parsers/incident-detection';
import {
  generateExhibitHTML,
  type ExhibitOptions
} from '@/lib/parsers/exhibit-generator';

type UploadStep = 'upload' | 'coaching' | 'analyzing' | 'results';

interface UploadState {
  step: UploadStep;
  file: File | null;
  format: FileFormat;
  coaching: CourtCoachingMessage[];
  parseResult: ParseResult | null;
  analysisResult: BulkAnalysisResult | null;
  incidentResult: IncidentDetectionResult | null;
  error: string | null;
  isProcessing: boolean;
}

export default function BulkMessageUpload() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [state, setState] = useState<UploadState>({
    step: 'upload',
    file: null,
    format: 'unknown',
    coaching: [],
    parseResult: null,
    analysisResult: null,
    incidentResult: null,
    error: null,
    isProcessing: false
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  const handleSaveToEvidence = async () => {
    if (!userId) {
      setSaveError('Please log in to save evidence');
      return;
    }
    if (!state.incidentResult?.incidents.length) {
      setSaveError('No incidents to save');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const incidentsToSave = state.incidentResult.incidents.map(incident => ({
        ...incident,
        startTime: incident.startTime.toISOString(),
        endTime: incident.endTime.toISOString(),
        messages: incident.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString(),
          editedAt: msg.editedAt?.toISOString() || null
        }))
      }));

      const response = await fetch('/api/incidents/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, incidents: incidentsToSave })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save incidents');
      setSaved(true);
    } catch (err) {
      console.error('Save error:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save incidents');
    } finally {
      setSaving(false);
    }
  };

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) await processFile(file);
  }, []);

  const processFile = async (file: File) => {
    setState(prev => ({ ...prev, isProcessing: true, error: null, file }));
    try {
      const format = detectFormat(file.name);
      if (format === 'pdf' || format === 'csv') {
        await parseAndAnalyze(file, format);
      } else {
        setState(prev => ({
          ...prev,
          error: 'Please upload a CSV or PDF file.',
          isProcessing: false
        }));
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Unknown error',
        isProcessing: false
      }));
    }
  };

  const parseAndAnalyze = async (file: File, format: FileFormat) => {
    setState(prev => ({ ...prev, step: 'analyzing', isProcessing: true }));
    try {
      let content: string;
      if (format === 'pdf') {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/pdf/extract', {
          method: 'POST',
          body: formData
        });
        if (!response.ok) throw new Error('PDF parsing coming soon. Please use CSV export.');
        const data = await response.json();
        content = data.text;
      } else {
        content = await file.text();
      }

      let parseResult: ParseResult;
      if (format === 'csv') {
        parseResult = parseCSV(content);
      } else {
        parseResult = parsePDF(content);
      }

      if (!parseResult.success) {
        throw new Error(parseResult.errors.join(', '));
      }

      const analysisResult = analyzeBulk(parseResult.messages);
      const incidentResult = detectIncidents(analysisResult.messages);

      setState(prev => ({
        ...prev,
        step: 'results',
        parseResult,
        analysisResult,
        incidentResult,
        isProcessing: false
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to analyze',
        step: 'upload',
        isProcessing: false
      }));
    }
  };

  const handleReset = () => {
    setState({
      step: 'upload',
      file: null,
      format: 'unknown',
      coaching: [],
      parseResult: null,
      analysisResult: null,
      incidentResult: null,
      error: null,
      isProcessing: false
    });
    setSaved(false);
    setSaveError(null);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      {state.error && (
        <div style={{
          marginBottom: 24,
          padding: 16,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          color: '#dc2626'
        }}>
          {state.error}
          <button
            onClick={() => setState(prev => ({ ...prev, error: null }))}
            style={{ marginLeft: 16, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Step */}
      {state.step === 'upload' && (
        <div style={{
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          padding: 32
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>
            Import Message History
          </h2>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            Upload your exported messages to detect manipulation patterns automatically
          </p>

          <div
            onClick={() => document.getElementById('file-input')?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            style={{
              border: '2px dashed #d1d5db',
              borderRadius: 12,
              padding: 48,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: state.isProcessing ? '#f3f4f6' : 'white'
            }}
          >
            <input
              id="file-input"
              type="file"
              accept=".csv,.pdf"
              onChange={handleFileInput}
              style={{ display: 'none' }}
              disabled={state.isProcessing}
            />
            <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
            <p style={{ fontWeight: 500, color: '#374151', marginBottom: 8 }}>
              {state.isProcessing ? 'Processing...' : 'Click to upload or drag & drop'}
            </p>
            <p style={{ fontSize: 14, color: '#9ca3af' }}>
              CSV or PDF message export
            </p>
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 24, justifyContent: 'center', fontSize: 14, color: '#6b7280' }}>
            <span>✓ Detects manipulation patterns</span>
            <span>✓ Groups into incidents</span>
            <span>✓ Court-ready export</span>
          </div>
        </div>
      )}

      {/* Analyzing Step */}
      {state.step === 'analyzing' && (
        <div style={{ textAlign: 'center', padding: 64 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#d1fae5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            animation: 'pulse 2s infinite'
          }}>
            <span style={{ fontSize: 32 }}>🔍</span>
          </div>
          <h2 style={{ fontSize: 20, color: '#374151', marginBottom: 8 }}>Analyzing Messages...</h2>
          <p style={{ color: '#6b7280' }}>Detecting patterns and grouping incidents</p>
        </div>
      )}

      {/* Results Step */}
      {state.step === 'results' && state.analysisResult && (
        <ResultsView
          analysis={state.analysisResult}
          incidents={state.incidentResult}
          parseResult={state.parseResult!}
          onReset={handleReset}
          onSave={handleSaveToEvidence}
          saving={saving}
          saved={saved}
          saveError={saveError}
        />
      )}

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function ResultsView({
  analysis,
  incidents,
  parseResult,
  onReset,
  onSave,
  saving,
  saved,
  saveError
}: {
  analysis: BulkAnalysisResult;
  incidents: IncidentDetectionResult | null;
  parseResult: ParseResult;
  onReset: () => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  saveError: string | null;
}) {
  const [showIncidents, setShowIncidents] = useState(true);
  const s = analysis.summary;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>
            Analysis Complete
          </h2>
          <p style={{ color: '#6b7280' }}>
            {parseResult.metadata.coparentName && `Communication with ${parseResult.metadata.coparentName}`}
            {s.dateRange && ` • ${s.dateRange.start.toLocaleDateString()} - ${s.dateRange.end.toLocaleDateString()}`}
          </p>
        </div>
        <button
          onClick={onReset}
          style={{
            background: 'none',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            padding: '8px 16px',
            cursor: 'pointer',
            color: '#6b7280'
          }}
        >
          ← Analyze New File
        </button>
      </div>

      {/* Save Error */}
      {saveError && (
        <div style={{
          marginBottom: 24,
          padding: 16,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          color: '#dc2626'
        }}>
          {saveError}
        </div>
      )}

      {/* Save Success */}
      {saved && (
        <div style={{
          marginBottom: 24,
          padding: 20,
          background: '#d1fae5',
          border: '1px solid #6ee7b7',
          borderRadius: 12,
          color: '#065f46'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                ✓ {incidents?.incidents.length || 0} incidents saved!
              </div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>
                View, filter by pattern, and build your case.
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/evidence'}
              style={{
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '12px 24px',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              View Evidence →
            </button>
          </div>
        </div>
      )}

      {/* Save CTA */}
      {incidents && incidents.incidents.length > 0 && !saved && (
        <div style={{
          marginBottom: 32,
          padding: 24,
          background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
          borderRadius: 16,
          border: '2px solid #34d399'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: '#065f46', marginBottom: 4 }}>
                {incidents.incidents.length} incidents ready to save
              </h3>
              <p style={{ color: '#047857', fontSize: 14 }}>
                Save to your Evidence Dashboard to access anytime and generate court exhibits.
              </p>
            </div>
            <button
              onClick={onSave}
              disabled={saving}
              style={{
                background: saving ? '#9ca3af' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                padding: '14px 28px',
                fontSize: 16,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Saving...' : '✓ Save to Evidence Dashboard'}
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 16,
        marginBottom: 32
      }}>
        <StatCard label="Total Messages" value={s.totalMessages} />
        <StatCard label="Incidents" value={incidents?.summary.totalIncidents || 0} color="#3b82f6" />
        <StatCard label="Patterns Found" value={s.totalPatternMatches} color="#8b5cf6" />
        <StatCard label="Critical" value={s.criticalCount} color={s.criticalCount > 0 ? '#dc2626' : undefined} />
        <StatCard label="High Severity" value={s.highSeverityCount} color={s.highSeverityCount > 0 ? '#f97316' : undefined} />
      </div>

      {/* Top Patterns */}
      {analysis.topPatterns.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>
            Most Common Patterns
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {analysis.topPatterns.map(({ pattern, count }) => (
              <span
                key={pattern.id}
                style={{
                  padding: '8px 16px',
                  background: pattern.severity === 'critical' ? '#fef2f2' :
                             pattern.severity === 'high' ? '#fff7ed' :
                             pattern.severity === 'medium' ? '#fefce8' : '#f0fdf4',
                  border: `1px solid ${
                    pattern.severity === 'critical' ? '#fecaca' :
                    pattern.severity === 'high' ? '#fed7aa' :
                    pattern.severity === 'medium' ? '#fef08a' : '#bbf7d0'
                  }`,
                  borderRadius: 20,
                  fontSize: 14,
                  color: pattern.severity === 'critical' ? '#dc2626' :
                         pattern.severity === 'high' ? '#ea580c' :
                         pattern.severity === 'medium' ? '#ca8a04' : '#16a34a'
                }}
              >
                {pattern.name} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Incidents */}
      {incidents && incidents.incidents.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937' }}>
              Detected Incidents ({incidents.incidents.length})
            </h3>
            <button
              onClick={() => setShowIncidents(!showIncidents)}
              style={{
                background: 'none',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              {showIncidents ? 'Hide' : 'Show'} Incidents
            </button>
          </div>

          {showIncidents && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 500, overflowY: 'auto' }}>
              {incidents.incidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 20,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 32, fontWeight: 700, color: color || '#1f2937' }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function IncidentCard({ incident }: { incident: Incident }) {
  const categoryName = CATEGORY_DISPLAY_NAMES[incident.category] || incident.category;
  const dateStr = incident.startTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  const preview = incident.messages[0]?.text?.slice(0, 120) || '';

  const severityColors: Record<string, { bg: string; border: string }> = {
    critical: { bg: '#fef2f2', border: '#fecaca' },
    high: { bg: '#fff7ed', border: '#fed7aa' },
    medium: { bg: '#fefce8', border: '#fef08a' },
    low: { bg: '#f9fafb', border: '#e5e7eb' }
  };

  const colors = severityColors[incident.maxSeverity] || severityColors.low;

  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: 16
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: '#6b7280' }}>{dateStr}</span>
        <span style={{
          fontSize: 12,
          padding: '2px 8px',
          borderRadius: 12,
          background: incident.evidenceStrength === 'strong' ? '#d1fae5' :
                     incident.evidenceStrength === 'moderate' ? '#fef3c7' : '#f3f4f6',
          color: incident.evidenceStrength === 'strong' ? '#065f46' :
                incident.evidenceStrength === 'moderate' ? '#92400e' : '#6b7280'
        }}>
          {incident.evidenceStrength === 'strong' ? '🟢 Strong' :
           incident.evidenceStrength === 'moderate' ? '🟡 Moderate' : '⚪ Weak'}
        </span>
      </div>

      <h4 style={{ fontWeight: 600, color: '#1f2937', marginBottom: 4 }}>{incident.title}</h4>
      
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
        {incident.messageCount} messages • {incident.durationMinutes > 0 ? `${incident.durationMinutes} min • ` : ''}{categoryName}
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
        {incident.uniquePatterns.slice(0, 4).map((pattern, i) => (
          <span
            key={i}
            style={{
              fontSize: 11,
              padding: '2px 8px',
              background: 'rgba(0,0,0,0.05)',
              borderRadius: 10,
              color: '#4b5563'
            }}
          >
            {pattern}
          </span>
        ))}
        {incident.uniquePatterns.length > 4 && (
          <span style={{ fontSize: 11, color: '#9ca3af' }}>+{incident.uniquePatterns.length - 4} more</span>
        )}
      </div>

      {preview && (
        <p style={{
          fontSize: 13,
          color: '#6b7280',
          fontStyle: 'italic',
          borderLeft: '2px solid #d1d5db',
          paddingLeft: 12,
          margin: 0
        }}>
          "{preview}{preview.length >= 120 ? '...' : ''}"
        </p>
      )}
    </div>
  );
}