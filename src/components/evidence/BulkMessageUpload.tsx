// At top of file, add import:
import { deduplicateIncidents, filterExistingIncidents } from '@/lib/utils/duplicate-detection';

// In handleSaveToEvidence, BEFORE the fetch call, add:
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
    // Format incidents first
    const incidentsToSave = state.incidentResult.incidents.map(incident => ({
      ...incident,
      incident_date: incident.startTime.toISOString(),
      coparent_message: incident.messages[0]?.text || '',
      messages_json: incident.messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp?.toISOString?.() || new Date().toISOString(),
      }))
    }));

    // DEDUPLICATE - remove duplicates within the array
    const deduplicated = deduplicateIncidents(incidentsToSave);
    
    // CHECK DATABASE - remove any that already exist
    const { newIncidents, duplicateCount } = await filterExistingIncidents(userId, deduplicated);
    
    if (newIncidents.length === 0) {
      setSaveError(`All ${duplicateCount} incidents already exist in your evidence.`);
      setSaving(false);
      return;
    }
    
    // Only save the new ones
    const response = await fetch('/api/incidents/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, incidents: newIncidents })
    });

    // ... rest of the save logic
    
    // Update success message to show duplicate info
    if (duplicateCount > 0) {
      // Could show: "Saved 30 incidents (skipped 24 duplicates)"
    }'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  parseCSV,
  detectFormat,
  type ParseResult,
} from '@/lib/parsers/message-parser';
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

type UploadStep = 'upload' | 'analyzing' | 'results';

interface UploadState {
  step: UploadStep;
  file: File | null;
  parseResult: ParseResult | null;
  analysisResult: BulkAnalysisResult | null;
  incidentResult: IncidentDetectionResult | null;
  error: string | null;
  isProcessing: boolean;
}

const EXPORT_GUIDES = [
  {
    app: 'OurFamilyWizard',
    icon: '👨‍👩‍👧',
    steps: 'Messages → Menu → Export → Download CSV'
  },
  {
    app: 'TalkingParents',
    icon: '💬',
    steps: 'Messages → Export → Select date range → CSV'
  },
  {
    app: 'AppClose',
    icon: '📱',
    steps: 'Settings → Export Data → Messages → CSV'
  },
  {
    app: 'WhatsApp',
    icon: '🟢',
    steps: 'Chat → Menu → More → Export chat → Without media'
  },
  {
    app: 'iMessage (iMazing)',
    icon: '🍎',
    steps: 'Use iMazing to export as CSV'
  }
];

export default function BulkMessageUpload() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [state, setState] = useState<UploadState>({
    step: 'upload',
    file: null,
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
          timestamp: (msg as any).timestamp?.toISOString?.() || (msg as any).date?.toISOString?.() || new Date().toISOString(),
          editedAt: (msg as any).editedAt?.toISOString?.() || null
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
    // Check file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      setState(prev => ({
        ...prev,
        error: 'Please upload a CSV file. Need help exporting? Click "How to export" below.',
        isProcessing: false
      }));
      return;
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null, file, step: 'analyzing' }));
    
    try {
      const content = await file.text();
      const parseResult = parseCSV(content);

      if (!parseResult.success) {
        throw new Error(parseResult.errors?.join(', ') || 'Could not parse CSV file');
      }

      if (!parseResult.messages || parseResult.messages.length === 0) {
        throw new Error('No messages found in file. Make sure the CSV has message content.');
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
        error: err instanceof Error ? err.message : 'Failed to analyze file',
        step: 'upload',
        isProcessing: false
      }));
    }
  };

  const handleReset = () => {
    setState({
      step: 'upload',
      file: null,
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
          borderRadius: 12,
          color: '#dc2626',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{state.error}</span>
          <button
            onClick={() => setState(prev => ({ ...prev, error: null }))}
            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
          >
            ×
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
            Upload a CSV export from your messaging app to analyze patterns automatically
          </p>

          <div
            onClick={() => document.getElementById('file-input')?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            style={{
              border: '2px dashed #10b981',
              borderRadius: 12,
              padding: 48,
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: '#f0fdf4'
            }}
          >
            <input
              id="file-input"
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              style={{ display: 'none' }}
              disabled={state.isProcessing}
            />
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <p style={{ fontWeight: 600, color: '#059669', marginBottom: 8, fontSize: 18 }}>
              Drop CSV file here or click to upload
            </p>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              CSV files only - exports from OFW, TalkingParents, AppClose, iMazing, etc.
            </p>
          </div>

          {/* How to Export Guide */}
          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => setShowGuide(!showGuide)}
              style={{
                background: 'none',
                border: 'none',
                color: '#059669',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {showGuide ? '▼' : '▶'} How to export from your app
            </button>

            {showGuide && (
              <div style={{
                marginTop: 16,
                background: '#f9fafb',
                borderRadius: 12,
                padding: 20,
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {EXPORT_GUIDES.map((guide) => (
                    <div
                      key={guide.app}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: 12,
                        background: 'white',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{guide.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: 2 }}>
                          {guide.app}
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                          {guide.steps}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div style={{
                  marginTop: 16,
                  padding: 12,
                  background: '#fefce8',
                  borderRadius: 8,
                  border: '1px solid #fef08a',
                  fontSize: 13,
                  color: '#92400e'
                }}>
                  💡 <strong>Tip:</strong> For individual screenshots, use the Coach instead. 
                  <button 
                    onClick={() => router.push('/coach')}
                    style={{ color: '#059669', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginLeft: 4 }}
                  >
                    Go to Coach →
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ 
            marginTop: 24, 
            display: 'flex', 
            gap: 24, 
            justifyContent: 'center', 
            fontSize: 14, 
            color: '#6b7280' 
          }}>
            <span>✓ Detects manipulation patterns</span>
            <span>✓ Groups into incidents</span>
            <span>✓ Saves to evidence</span>
          </div>
        </div>
      )}

      {/* Analyzing Step */}
      {state.step === 'analyzing' && (
        <div style={{ 
          textAlign: 'center', 
          padding: 64,
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
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
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
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
            {parseResult.metadata?.coparentName && `Communication with ${parseResult.metadata.coparentName}`}
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
          ← Upload Another
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
                Click any incident below to review before saving.
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
              {saving ? 'Saving...' : '✓ Save to Evidence'}
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
              {showIncidents ? 'Hide' : 'Show'}
            </button>
          </div>

          {showIncidents && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 600, overflowY: 'auto' }}>
              {incidents.incidents.map((incident) => (
                <IncidentCard 
                  key={incident.id} 
                  incident={incident} 
                  isExpanded={expandedIncident === incident.id}
                  onToggle={() => setExpandedIncident(expandedIncident === incident.id ? null : incident.id)}
                />
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

function IncidentCard({ incident, isExpanded, onToggle }: { incident: Incident; isExpanded: boolean; onToggle: () => void }) {
  // Debug: log incident structure
  console.log('Incident data:', JSON.stringify(incident, null, 2).slice(0, 500));
  
  // Early return if incident is invalid
  if (!incident) {
    return <div style={{ padding: 16, color: '#999' }}>Invalid incident data</div>;
  }
  
  // Defensive data access
  const categoryName = CATEGORY_DISPLAY_NAMES?.[incident.category] || incident.category || 'Uncategorized';
  
  // Handle date - could be Date object or string
  let dateStr = 'Unknown date';
  try {
    const dateObj = incident.startTime instanceof Date 
      ? incident.startTime 
      : new Date(incident.startTime);
    if (!isNaN(dateObj.getTime())) {
      dateStr = dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  } catch (e) {
    console.error('Date parse error:', e);
  }
  
  // Get first message preview
  const firstMsg = incident.messages?.[0];
  const preview = (firstMsg?.text || (firstMsg as any)?.content || '').slice(0, 120);
  
  // Get patterns - could be array of strings or objects
  const patterns = incident.uniquePatterns || [];
  const patternList = patterns.map(p => typeof p === 'string' ? p : (p as any)?.patternName || 'Unknown');

  const severityColors: Record<string, { bg: string; border: string }> = {
    critical: { bg: '#fef2f2', border: '#fecaca' },
    high: { bg: '#fff7ed', border: '#fed7aa' },
    medium: { bg: '#fefce8', border: '#fef08a' },
    low: { bg: '#f9fafb', border: '#e5e7eb' }
  };

  const colors = severityColors[incident.maxSeverity || 'low'] || severityColors.low;

  return (
    <div style={{
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      overflow: 'hidden'
    }}>
      {/* Header - always visible, clickable */}
      <div 
        onClick={onToggle}
        style={{
          padding: 16,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>{dateStr}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            <span style={{ color: '#9ca3af', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
              ▶
            </span>
          </div>
        </div>

        <h4 style={{ fontWeight: 600, color: '#1f2937', margin: 0 }}>{incident.title || `${categoryName} - ${dateStr}`}</h4>
        
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
          {incident.messageCount || incident.messages?.length || 0} messages • {incident.durationMinutes > 0 ? `${incident.durationMinutes} min • ` : ''}{categoryName}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {patternList.slice(0, 4).map((pattern, i) => (
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
          {patternList.length > 4 && (
            <span style={{ fontSize: 11, color: '#9ca3af' }}>+{patternList.length - 4} more</span>
          )}
        </div>

        {!isExpanded && preview && (
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

      {/* Expanded Content - messages with pattern details */}
      {isExpanded && (
        <div style={{
          borderTop: `1px solid ${colors.border}`,
          background: 'white',
          maxHeight: 400,
          overflowY: 'auto'
        }}>
          {/* Pattern Summary */}
          {patternList.length > 0 && (
            <div style={{ padding: 16, background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
                ⚠️ PATTERNS DETECTED IN THIS INCIDENT
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {patternList.map((pattern, i) => (
                  <span
                    key={i}
                    style={{
                      padding: '4px 12px',
                      background: '#fef3c7',
                      border: '1px solid #fcd34d',
                      borderRadius: 16,
                      fontSize: 12,
                      color: '#92400e'
                    }}
                  >
                    {pattern}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ padding: '8px 0' }}>
            {(incident.messages || []).map((msg: any, idx: number) => {
              const isCoparent = msg.sender === 'coparent';
              const msgPatterns = msg.patterns || [];
              const hasPatterns = msgPatterns.length > 0;
              const msgText = msg.text || msg.content || '[No text]';
              
              // Handle timestamp
              let timeStr = '';
              try {
                const ts = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
                if (!isNaN(ts.getTime())) {
                  timeStr = ts.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  });
                }
              } catch (e) {}
              
              return (
                <div 
                  key={idx}
                  style={{
                    padding: '12px 16px',
                    background: hasPatterns ? '#fef2f2' : (isCoparent ? '#fff' : '#f0fdf4'),
                    borderBottom: idx < (incident.messages?.length || 0) - 1 ? '1px solid #f3f4f6' : 'none'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: 4,
                    fontSize: 11,
                    color: '#9ca3af'
                  }}>
                    <span style={{ 
                      fontWeight: 600,
                      color: isCoparent ? '#dc2626' : '#059669'
                    }}>
                      {isCoparent ? '🔴 Co-parent' : '🟢 You'}
                      {msg.senderName && isCoparent && ` (${msg.senderName})`}
                    </span>
                    <span>{timeStr}</span>
                  </div>
                  
                  <div style={{ 
                    fontSize: 14, 
                    color: '#374151',
                    lineHeight: 1.5
                  }}>
                    {msgText}
                  </div>

                  {/* Show detected patterns for this specific message */}
                  {hasPatterns && (
                    <div style={{ 
                      marginTop: 8, 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 4 
                    }}>
                      {msgPatterns.map((p: any, i: number) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 10,
                            padding: '2px 8px',
                            background: p.severity === 'critical' ? '#dc2626' :
                                       p.severity === 'high' ? '#ea580c' : '#f59e0b',
                            color: 'white',
                            borderRadius: 8,
                            fontWeight: 600
                          }}
                        >
                          {p.patternName || p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}