'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Incident {
  id: string;
  category: string;
  patterns: string[];
  severity: string;
  incident_date: string;
  coparent_message?: string;
  include_in_exhibit?: boolean;
  source?: string;
}

const patternLabels: Record<string, string> = {
  gaslighting: "Gaslighting",
  darvo: "DARVO",
  intimidation: "Intimidation",
  threats: "Threats",
  financial_abuse: "Financial Abuse",
  using_children_as_weapons: "Using Children as Weapons",
  blame_shifting: "Blame-Shifting",
  false_accusations: "False Accusations",
  emotional_blackmail: "Emotional Blackmail",
  stonewalling: "Stonewalling",
  monitoring_stalking: "Monitoring/Stalking",
  monitoring_control: "Monitoring/Control",
  isolation_tactics: "Isolation",
  minimizing_denying: "Minimizing",
  word_salad: "Word Salad",
  moving_goalposts: "Moving Goalposts",
  projection: "Projection",
  hoovering: "Hoovering",
  gatekeeping: "Gatekeeping",
  escalation_patterns: "Escalation",
  legal_intimidation: "Legal Threats",
};

const severityColors: Record<string, { bg: string; text: string }> = {
  critical: { bg: '#fef2f2', text: '#dc2626' },
  high: { bg: '#fff7ed', text: '#ea580c' },
  medium: { bg: '#fefce8', text: '#ca8a04' },
  low: { bg: '#f9fafb', text: '#6b7280' },
};

export default function EvidencePage() {
  const router = useRouter();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);

  useEffect(() => {
    loadEvidence();
  }, []);

  const loadEvidence = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/login');
      return;
    }

    const { data } = await supabase
      .from('incidents')
      .select('*')
      .eq('user_id', session.user.id)
      .neq('category', 'not_abuse')
      .order('incident_date', { ascending: false });

    setIncidents(data || []);
    setLoading(false);
  };

  const toggleExhibit = async (id: string, current: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from('incidents')
      .update({ include_in_exhibit: !current })
      .eq('id', id)
      .eq('user_id', session.user.id);

    setIncidents(prev => prev.map(inc =>
      inc.id === id ? { ...inc, include_in_exhibit: !current } : inc
    ));
  };

  const deleteIncident = async (id: string) => {
    if (!confirm('Delete this incident?')) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from('incidents')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    setIncidents(prev => prev.filter(inc => inc.id !== id));
    setExpandedId(null);
  };

  const exhibitCount = incidents.filter(i => i.include_in_exhibit).length;

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#fafafa'
      }}>
        <div style={{ fontSize: 48 }}>📁</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', paddingBottom: 100 }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              padding: 0
            }}
          >
            ←
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1a3a2f', margin: 0 }}>
            Evidence ({incidents.length})
          </h1>
        </div>
        <button
          onClick={() => setSelectMode(!selectMode)}
          style={{
            background: selectMode ? '#1a3a2f' : '#f3f4f6',
            color: selectMode ? 'white' : '#374151',
            border: 'none',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          {selectMode ? 'Done' : 'Select'}
        </button>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
        
        {/* Stats */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginBottom: 16
        }}>
          <div style={{
            flex: 1,
            background: 'white',
            padding: 16,
            borderRadius: 12,
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1a3a2f' }}>{incidents.length}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Documented</div>
          </div>
          <div style={{
            flex: 1,
            background: exhibitCount > 0 ? '#f0fdf4' : 'white',
            padding: 16,
            borderRadius: 12,
            textAlign: 'center',
            border: exhibitCount > 0 ? '2px solid #059669' : 'none'
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{exhibitCount}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>In Exhibit</div>
          </div>
        </div>

        {/* List */}
        {incidents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 48,
            background: 'white',
            borderRadius: 16
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ color: '#6b7280', marginBottom: 16 }}>No evidence documented yet</div>
            <button
              onClick={() => router.push('/')}
              style={{
                background: '#1a3a2f',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Start Documenting →
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {incidents.map((inc) => {
              const colors = severityColors[inc.severity] || severityColors.medium;
              const isExpanded = expandedId === inc.id;
              const preview = inc.coparent_message?.slice(0, 80) || '';
              
              return (
                <div
                  key={inc.id}
                  style={{
                    background: 'white',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: inc.include_in_exhibit ? '2px solid #059669' : '1px solid #e5e7eb'
                  }}
                >
                  {/* Main Row */}
                  <div
                    onClick={() => !selectMode && setExpandedId(isExpanded ? null : inc.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 14,
                      gap: 12,
                      cursor: 'pointer'
                    }}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExhibit(inc.id, !!inc.include_in_exhibit);
                      }}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: `2px solid ${inc.include_in_exhibit ? '#059669' : '#d1d5db'}`,
                        background: inc.include_in_exhibit ? '#059669' : 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {inc.include_in_exhibit && (
                        <span style={{ color: 'white', fontSize: 12 }}>✓</span>
                      )}
                    </button>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 10,
                          background: colors.bg,
                          color: colors.text,
                          textTransform: 'uppercase'
                        }}>
                          {inc.severity}
                        </span>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>
                          {new Date(inc.incident_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      <div style={{ 
                        fontSize: 14, 
                        fontWeight: 600, 
                        color: '#1a3a2f',
                        marginBottom: 2
                      }}>
                        {patternLabels[inc.category] || inc.category?.replace(/_/g, ' ') || 'Documented'}
                      </div>
                      {preview && (
                        <div style={{ 
                          fontSize: 13, 
                          color: '#6b7280',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          "{preview}{preview.length >= 80 ? '...' : ''}"
                        </div>
                      )}
                    </div>

                    {!selectMode && (
                      <span style={{ 
                        color: '#9ca3af',
                        transform: isExpanded ? 'rotate(90deg)' : 'none',
                        transition: 'transform 0.15s'
                      }}>
                        ›
                      </span>
                    )}
                  </div>

                  {/* Expanded */}
                  {isExpanded && !selectMode && (
                    <div style={{ 
                      padding: '0 14px 14px',
                      borderTop: '1px solid #f3f4f6'
                    }}>
                      {/* Patterns */}
                      {inc.patterns?.length > 0 && (
                        <div style={{ marginTop: 12, marginBottom: 12 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {inc.patterns.map((p, i) => (
                              <span key={i} style={{
                                padding: '4px 10px',
                                background: '#fef3c7',
                                borderRadius: 12,
                                fontSize: 12,
                                color: '#92400e'
                              }}>
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Full message */}
                      {inc.coparent_message && (
                        <div style={{
                          background: '#f9fafb',
                          padding: 12,
                          borderRadius: 8,
                          fontSize: 14,
                          color: '#374151',
                          lineHeight: 1.5,
                          marginBottom: 12
                        }}>
                          "{inc.coparent_message}"
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => toggleExhibit(inc.id, !!inc.include_in_exhibit)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            background: inc.include_in_exhibit ? '#f0fdf4' : '#f3f4f6',
                            border: inc.include_in_exhibit ? '1px solid #059669' : 'none',
                            borderRadius: 8,
                            fontSize: 13,
                            cursor: 'pointer',
                            color: inc.include_in_exhibit ? '#059669' : '#374151'
                          }}
                        >
                          {inc.include_in_exhibit ? '✓ In Exhibit' : 'Add to Exhibit'}
                        </button>
                        <button
                          onClick={() => deleteIncident(inc.id)}
                          style={{
                            padding: '10px 16px',
                            background: '#fef2f2',
                            border: 'none',
                            borderRadius: 8,
                            fontSize: 13,
                            cursor: 'pointer',
                            color: '#dc2626'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Generate Exhibit Button */}
      {exhibitCount > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          background: 'white',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => router.push('/generate-exhibit')}
            style={{
              width: '100%',
              maxWidth: 600,
              margin: '0 auto',
              display: 'block',
              padding: '16px',
              background: 'linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📄 Generate Court Exhibit ({exhibitCount} incidents)
          </button>
        </div>
      )}
    </div>
  );
}