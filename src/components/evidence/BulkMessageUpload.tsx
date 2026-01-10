'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { parseCSV, type ParseResult } from '@/lib/parsers/message-parser';

type UploadStep = 'upload' | 'analyzing' | 'results';

interface PatternResult {
  name: string;
  count: number;
  severity: string;
  description: string;
  courtRelevance: string;
  examples: Array<{
    date: string;
    quote: string;
    analysis: string;
  }>;
}

interface IncidentResult {
  title: string;
  date: string;
  patterns: string[];
  severity: string;
  messages: Array<{
    timestamp: string;
    sender: string;
    text: string;
  }>;
  quotableText: string;
  courtNotes: string;
}

interface AnalysisResult {
  summary: {
    totalMessagesAnalyzed: number;
    messagesWithPatterns: number;
    dateRange: string;
    topPatterns: string[];
    overallSeverity: string;
  };
  patterns: PatternResult[];
  incidents: IncidentResult[];
  courtStrategy: {
    strongestEvidence: string[];
    exhibitRecommendations: Array<{
      exhibitNumber: string;
      title: string;
      purpose: string;
      dateRange: string;
    }>;
    oneLineSummary: string;
  };
}

interface UploadState {
  step: UploadStep;
  file: File | null;
  parseResult: ParseResult | null;
  analysis: AnalysisResult | null;
  error: string | null;
  isProcessing: boolean;
  progress: string;
}

const EXPORT_GUIDES = [
  { app: 'iMessage (iMazing)', icon: '🍎', steps: 'Use iMazing app → Export messages as CSV' },
  { app: 'OurFamilyWizard', icon: '👨‍👩‍👧', steps: 'Messages → Menu → Export → Download CSV' },
  { app: 'TalkingParents', icon: '💬', steps: 'Messages → Export → Select date range → CSV' },
  { app: 'AppClose', icon: '📱', steps: 'Settings → Export Data → Messages → CSV' },
  { app: 'WhatsApp', icon: '🟢', steps: 'Chat → Menu → More → Export chat → Without media' }
];

export default function BulkMessageUpload() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null);
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>({
    step: 'upload',
    file: null,
    parseResult: null,
    analysis: null,
    error: null,
    isProcessing: false,
    progress: ''
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

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
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setState(prev => ({ ...prev, error: 'Please upload a CSV file.' }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      error: null, 
      file, 
      step: 'analyzing',
      progress: 'Parsing CSV...'
    }));

    try {
      // Step 1: Parse CSV
      const content = await file.text();
      const parseResult = parseCSV(content);

      if (!parseResult.success || !parseResult.messages?.length) {
        throw new Error(parseResult.errors?.join(', ') || 'No messages found in file');
      }

      setState(prev => ({ ...prev, progress: `Found ${parseResult.messages.length} messages. Analyzing patterns with AI...` }));

      // Step 2: Send to AI for analysis
      const response = await fetch('/api/analyze-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: parseResult.messages,
          coparentName: parseResult.metadata?.coparentName
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Analysis failed');
      }

      const result = await response.json();

      if (!result.success || !result.analysis) {
        throw new Error('No analysis returned');
      }

      setState(prev => ({
        ...prev,
        step: 'results',
        parseResult,
        analysis: result.analysis,
        isProcessing: false,
        progress: ''
      }));

    } catch (err) {
      console.error('Processing error:', err);
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to analyze file',
        step: 'upload',
        isProcessing: false,
        progress: ''
      }));
    }
  };

  const handleSaveToEvidence = async () => {
    if (!userId || !state.analysis?.incidents.length) {
      setSaveError('No incidents to save');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      // Convert AI incidents to database format
      // Only include columns that exist in the incidents table
      const incidentsToSave = state.analysis.incidents.map((incident, idx) => ({
        user_id: userId,
        title: incident.title,
        category: incident.patterns[0]?.toLowerCase().replace(/[\s\/]+/g, '_') || 'manipulation',
        patterns: incident.patterns,
        severity: incident.severity,
        incident_date: incident.date || new Date().toISOString(),
        coparent_message: incident.quotableText + (incident.courtNotes ? `\n\n[Court Notes: ${incident.courtNotes}]` : ''),
        messages_json: incident.messages
      }));

      const { error } = await supabase.from('incidents').insert(incidentsToSave);
      
      if (error) throw error;

      // Mark import timestamp
      localStorage.setItem('pattern18_last_import', new Date().toISOString());
      
      setSaved(true);
    } catch (err) {
      console.error('Save error:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setState({
      step: 'upload',
      file: null,
      parseResult: null,
      analysis: null,
      error: null,
      isProcessing: false,
      progress: ''
    });
    setSaved(false);
    setSaveError(null);
  };

  const severityColors: Record<string, { bg: string; border: string; text: string }> = {
    critical: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
    high: { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c' },
    medium: { bg: '#fefce8', border: '#fef08a', text: '#ca8a04' },
    low: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      {/* Error Banner */}
      {state.error && (
        <div style={{
          marginBottom: 24,
          padding: 16,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 12,
          color: '#dc2626',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <span>{state.error}</span>
          <button onClick={() => setState(prev => ({ ...prev, error: null }))} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* UPLOAD STEP */}
      {state.step === 'upload' && (
        <div style={{ background: 'white', borderRadius: 16, padding: 32, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: 24, fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>
            Import Message History
          </h2>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            Upload a CSV export. AI will analyze for coercive control patterns and prepare court-ready evidence.
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
              background: '#f0fdf4'
            }}
          >
            <input id="file-input" type="file" accept=".csv" onChange={handleFileInput} style={{ display: 'none' }} />
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <p style={{ fontWeight: 600, color: '#059669', marginBottom: 8, fontSize: 18 }}>
              Drop CSV file here or click to upload
            </p>
            <p style={{ fontSize: 14, color: '#6b7280' }}>
              Works with iMazing, OFW, TalkingParents, AppClose, WhatsApp
            </p>
          </div>

          <div style={{ marginTop: 24 }}>
            <button onClick={() => setShowGuide(!showGuide)}
                    style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
              {showGuide ? '▼' : '▶'} How to export from your app
            </button>
            {showGuide && (
              <div style={{ marginTop: 16, background: '#f9fafb', borderRadius: 12, padding: 20 }}>
                {EXPORT_GUIDES.map((g) => (
                  <div key={g.app} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'white', borderRadius: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>{g.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{g.app}</div>
                      <div style={{ fontSize: 13, color: '#6b7280' }}>{g.steps}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 24, display: 'flex', gap: 24, justifyContent: 'center', fontSize: 14, color: '#6b7280' }}>
            <span>✓ AI pattern detection</span>
            <span>✓ Court-ready exhibits</span>
            <span>✓ Quotable evidence</span>
          </div>
        </div>
      )}

      {/* ANALYZING STEP */}
      {state.step === 'analyzing' && (
        <div style={{ textAlign: 'center', padding: 64, background: 'white', borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#d1fae5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', animation: 'pulse 2s infinite'
          }}>
            <span style={{ fontSize: 32 }}>🔍</span>
          </div>
          <h2 style={{ fontSize: 20, color: '#374151', marginBottom: 8 }}>Analyzing Messages...</h2>
          <p style={{ color: '#6b7280' }}>{state.progress || 'This may take a minute for large files'}</p>
        </div>
      )}

      {/* RESULTS STEP */}
      {state.step === 'results' && state.analysis && (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>Analysis Complete</h2>
              <p style={{ color: '#6b7280' }}>
                {state.parseResult?.metadata?.coparentName && `Communication with ${state.parseResult.metadata.coparentName}`}
                {state.analysis.summary.dateRange && ` • ${state.analysis.summary.dateRange}`}
              </p>
            </div>
            <button onClick={handleReset} style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
              ← Upload Another
            </button>
          </div>

          {/* Save Status */}
          {saveError && (
            <div style={{ marginBottom: 24, padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626' }}>
              {saveError}
            </div>
          )}
          {saved && (
            <div style={{ marginBottom: 24, padding: 20, background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 12, color: '#065f46' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>✓ {state.analysis.incidents.length} incidents saved!</div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>View, filter, and build your case.</div>
                </div>
                <button onClick={() => router.push('/evidence')}
                        style={{ background: '#059669', color: 'white', border: 'none', borderRadius: 10, padding: '12px 24px', fontWeight: 600, cursor: 'pointer' }}>
                  View Evidence →
                </button>
              </div>
            </div>
          )}

          {/* Save CTA */}
          {state.analysis.incidents.length > 0 && !saved && (
            <div style={{ marginBottom: 32, padding: 24, background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)', borderRadius: 16, border: '2px solid #34d399' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 600, color: '#065f46', marginBottom: 4 }}>
                    {state.analysis.incidents.length} incidents ready to save
                  </h3>
                  <p style={{ color: '#047857', fontSize: 14 }}>Review the patterns and incidents below, then save to your evidence.</p>
                </div>
                <button onClick={handleSaveToEvidence} disabled={saving}
                        style={{ background: saving ? '#9ca3af' : '#059669', color: 'white', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 16, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : '✓ Save to Evidence'}
                </button>
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            <StatCard label="Messages Analyzed" value={state.analysis.summary.totalMessagesAnalyzed} />
            <StatCard label="With Patterns" value={state.analysis.summary.messagesWithPatterns} color="#8b5cf6" />
            <StatCard label="Incidents Found" value={state.analysis.incidents.length} color="#3b82f6" />
            <StatCard label="Overall Severity" value={state.analysis.summary.overallSeverity.toUpperCase()} 
                      color={severityColors[state.analysis.summary.overallSeverity]?.text} isText />
          </div>

          {/* Court Strategy Summary */}
          {state.analysis.courtStrategy && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 16, padding: 24, marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#92400e', marginBottom: 12 }}>⚖️ Court Strategy</h3>
              <p style={{ fontSize: 15, color: '#78350f', lineHeight: 1.6, marginBottom: 16 }}>
                {state.analysis.courtStrategy.oneLineSummary}
              </p>
              {state.analysis.courtStrategy.exhibitRecommendations?.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 8 }}>RECOMMENDED EXHIBITS:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {state.analysis.courtStrategy.exhibitRecommendations.map((ex, i) => (
                      <div key={i} style={{ background: 'white', padding: 12, borderRadius: 8, border: '1px solid #fef08a' }}>
                        <div style={{ fontWeight: 600, color: '#1f2937' }}>Exhibit {ex.exhibitNumber}: {ex.title}</div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>{ex.purpose}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Patterns Detected */}
          {state.analysis.patterns.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>
                Patterns Detected ({state.analysis.patterns.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {state.analysis.patterns.map((pattern) => {
                  const colors = severityColors[pattern.severity] || severityColors.medium;
                  const isExpanded = expandedPattern === pattern.name;
                  return (
                    <div key={pattern.name} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
                      <div onClick={() => setExpandedPattern(isExpanded ? null : pattern.name)}
                           style={{ padding: 16, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: 4 }}>
                            {pattern.name} <span style={{ color: colors.text }}>({pattern.count})</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#6b7280' }}>{pattern.description}</div>
                        </div>
                        <span style={{ color: '#9ca3af', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
                      </div>
                      {isExpanded && (
                        <div style={{ borderTop: `1px solid ${colors.border}`, padding: 16, background: 'white' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#059669', marginBottom: 12 }}>
                            ⚖️ Why this matters: {pattern.courtRelevance}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>EXAMPLES:</div>
                          {pattern.examples.slice(0, 3).map((ex, i) => (
                            <div key={i} style={{ background: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 8, borderLeft: `3px solid ${colors.border}` }}>
                              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>{ex.date}</div>
                              <div style={{ fontSize: 14, color: '#1f2937', fontStyle: 'italic', marginBottom: 8 }}>"{ex.quote}"</div>
                              <div style={{ fontSize: 12, color: '#6b7280' }}>{ex.analysis}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Incidents */}
          {state.analysis.incidents.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: '#1f2937', marginBottom: 16 }}>
                Documented Incidents ({state.analysis.incidents.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {state.analysis.incidents.map((incident, idx) => {
                  const colors = severityColors[incident.severity] || severityColors.medium;
                  const isExpanded = expandedIncident === incident.title;
                  return (
                    <div key={idx} style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
                      <div onClick={() => setExpandedIncident(isExpanded ? null : incident.title)}
                           style={{ padding: 16, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>{incident.date}</span>
                            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, background: colors.border, color: colors.text, marginLeft: 8, fontWeight: 600 }}>
                              {incident.severity.toUpperCase()}
                            </span>
                          </div>
                          <span style={{ color: '#9ca3af', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>▶</span>
                        </div>
                        <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: 8 }}>{incident.title}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                          {incident.patterns.map((p, i) => (
                            <span key={i} style={{ fontSize: 11, padding: '2px 8px', background: 'rgba(0,0,0,0.05)', borderRadius: 10, color: '#4b5563' }}>{p}</span>
                          ))}
                        </div>
                        {incident.quotableText && (
                          <div style={{ fontSize: 13, color: '#6b7280', fontStyle: 'italic', borderLeft: '2px solid #d1d5db', paddingLeft: 12 }}>
                            "{incident.quotableText.slice(0, 150)}{incident.quotableText.length > 150 ? '...' : ''}"
                          </div>
                        )}
                      </div>
                      {isExpanded && (
                        <div style={{ borderTop: `1px solid ${colors.border}`, background: 'white' }}>
                          {incident.courtNotes && (
                            <div style={{ padding: 16, background: '#f0fdf4', borderBottom: '1px solid #e5e7eb' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#059669', marginBottom: 4 }}>⚖️ COURT NOTES</div>
                              <div style={{ fontSize: 13, color: '#065f46' }}>{incident.courtNotes}</div>
                            </div>
                          )}
                          <div style={{ padding: '8px 0' }}>
                            {incident.messages.map((msg, i) => (
                              <div key={i} style={{ padding: '12px 16px', background: msg.sender === 'coparent' ? '#fff' : '#f0fdf4', borderBottom: i < incident.messages.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
                                  <span style={{ fontWeight: 600, color: msg.sender === 'coparent' ? '#dc2626' : '#059669' }}>
                                    {msg.sender === 'coparent' ? '🔴 Co-parent' : '🟢 You'}
                                  </span>
                                  <span style={{ marginLeft: 8 }}>{msg.timestamp}</span>
                                </div>
                                <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>{msg.text}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No patterns found */}
          {state.analysis.patterns.length === 0 && state.analysis.incidents.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, background: '#f0fdf4', borderRadius: 16, border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h3 style={{ fontSize: 18, color: '#065f46', marginBottom: 8 }}>No concerning patterns detected</h3>
              <p style={{ color: '#047857' }}>The messages appear to be normal co-parenting communication.</p>
            </div>
          )}
        </div>
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

function StatCard({ label, value, color, isText }: { label: string; value: number | string; color?: string; isText?: boolean }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, textAlign: 'center' }}>
      <div style={{ fontSize: isText ? 18 : 32, fontWeight: 700, color: color || '#1f2937' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{label}</div>
    </div>
  );
}