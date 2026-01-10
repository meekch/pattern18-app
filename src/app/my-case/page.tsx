'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import FloatingCoach from '@/components/FloatingCoach';

const categoryLabels: Record<string, string> = {
  gaslighting: "Gaslighting",
  darvo: "DARVO",
  intimidation: "Intimidation",
  threats: "Threats",
  financial_abuse: "Financial Abuse",
  financial_coercion: "Financial Abuse",
  using_children_as_weapons: "Using Children as Weapons",
  blame_shifting: "Blame-Shifting",
  "blame-shifting": "Blame-Shifting",
  false_accusations: "False Accusations",
  emotional_blackmail: "Emotional Blackmail",
  stonewalling: "Stonewalling",
  monitoring: "Monitoring/Stalking",
  stalking: "Monitoring/Stalking",
  isolation: "Isolation Tactics",
  minimizing: "Minimizing/Denying",
  denying: "Minimizing/Denying",
  word_salad: "Word Salad",
  moving_goalposts: "Moving Goalposts",
  projection: "Projection",
  hoovering: "Hoovering",
  gatekeeping: "Gatekeeping",
  coercive_control: "Coercive Control",
  manipulation: "Manipulation",
  legal_threats: "Legal Threats",
  schedule_manipulation: "Schedule Manipulation",
  uncategorized: "Uncategorized",
};

interface PatternCount {
  pattern: string;
  count: number;
}

export default function MyCasePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [caseContext, setCaseContext] = useState<any>(null);
  
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [exhibitCount, setExhibitCount] = useState(0);
  const [patternCounts, setPatternCounts] = useState<PatternCount[]>([]);
  const [allIncidents, setAllIncidents] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Load case context
      const { data: caseData } = await supabase
        .from('case_context')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (caseData) setCaseContext(caseData);

      // Load evidence for stats
      const { data: evidence } = await supabase
        .from('incidents')
        .select('*')
        .eq('user_id', session.user.id);

      if (evidence && evidence.length > 0) {
        setTotalIncidents(evidence.length);
        setAllIncidents(evidence);
        setCriticalCount(evidence.filter((e: any) => 
          e.severity === 'critical' || e.severity === 'high'
        ).length);
        setExhibitCount(evidence.filter((e: any) => e.include_in_exhibit).length);

        // Pattern counts
        const patterns: Record<string, number> = {};
        evidence.forEach((e: any) => {
          const category = e.category || 'uncategorized';
          patterns[category] = (patterns[category] || 0) + 1;
        });

        const patternList: PatternCount[] = Object.entries(patterns)
          .map(([pattern, count]) => ({ pattern, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setPatternCounts(patternList);
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const exportCaseFile = async () => {
    setExporting(true);
    try {
      const headers = ['Date', 'Severity', 'Category', 'Patterns', 'Message', 'In Exhibit'];
      const rows = allIncidents.map(inc => {
        const date = new Date(inc.incident_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
        const message = inc.coparent_message || 
          (inc.messages_json?.map((m: any) => m.text).join(' | ')) || 
          '';
        const escapeCSV = (str: string) => `"${String(str || '').replace(/"/g, '""')}"`;
        
        return [
          escapeCSV(date),
          escapeCSV(inc.severity || 'medium'),
          escapeCSV(categoryLabels[inc.category] || inc.category || ''),
          escapeCSV((inc.patterns || []).join(', ')),
          escapeCSV(message),
          inc.include_in_exhibit ? 'Yes' : 'No'
        ].join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pattern18-evidence-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const daysUntilCourt = caseContext?.next_court_date
    ? Math.ceil((new Date(caseContext.next_court_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const courtDateFormatted = caseContext?.next_court_date
    ? new Date(caseContext.next_court_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        background: '#f5f7f6' 
      }}>
        <div style={{ fontSize: 48, animation: 'pulse 1.5s infinite' }}>📊</div>
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #e8f5e9 0%, #f5f7f6 100%)',
      paddingBottom: 100 
    }}>
      {/* Header */}
      <header style={{
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#1a3a2f',
        color: 'white'
      }}>
        <h1 style={{ fontSize: 24, margin: 0 }}>My Case</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Compact court countdown - white pill */}
          {daysUntilCourt && daysUntilCourt > 0 && (
            <button
              onClick={() => router.push('/court-prep')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'white',
                color: '#1a3a2f',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <span>📅</span>
              <span>{courtDateFormatted}</span>
              <span style={{ 
                background: '#f59e0b', 
                color: '#78350f',
                padding: '2px 6px',
                borderRadius: 10,
                fontSize: 11,
                fontWeight: 700,
              }}>
                {daysUntilCourt}d
              </span>
            </button>
          )}
          <button 
            onClick={() => router.push('/case-setup')} 
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 20,
              cursor: 'pointer',
            }}
          >
            ⚙️
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>

        {/* Quick Actions */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <div style={{ 
            fontSize: 12, 
            fontWeight: 600, 
            color: '#6b7280', 
            letterSpacing: 1, 
            marginBottom: 16 
          }}>
            WHAT DO YOU NEED?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button 
              onClick={() => router.push('/coach')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: 16,
                background: '#f0fdf4',
                border: '2px solid #1a3a2f',
                borderRadius: 12,
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: 28 }}>📸</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2f' }}>Analyze Message</span>
            </button>
            <button 
              onClick={() => router.push('/docs')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: 16,
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: 12,
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: 28 }}>📄</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2f' }}>Create Document</span>
            </button>
            <button 
              onClick={exportCaseFile}
              disabled={exporting || totalIncidents === 0}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: 16,
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: 12,
                cursor: totalIncidents === 0 ? 'not-allowed' : 'pointer',
                opacity: totalIncidents === 0 ? 0.5 : 1
              }}
            >
              <span style={{ fontSize: 28 }}>{exporting ? '⏳' : '💾'}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2f' }}>
                {exporting ? 'Exporting...' : 'Export Case'}
              </span>
            </button>
            <button 
              onClick={() => router.push('/court-prep')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: 16,
                background: daysUntilCourt && daysUntilCourt > 0 && daysUntilCourt <= 14 
                  ? '#fef3c7' 
                  : 'white',
                border: daysUntilCourt && daysUntilCourt > 0 && daysUntilCourt <= 14
                  ? '2px solid #f59e0b'
                  : '2px solid #e5e7eb',
                borderRadius: 12,
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: 28 }}>⚖️</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2f' }}>Court Prep</span>
            </button>
          </div>
        </div>

        {/* Evidence Summary */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 16 
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', letterSpacing: 1 }}>
              MY EVIDENCE
            </div>
            <button 
              onClick={() => router.push('/evidence')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: 14,
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              View All →
            </button>
          </div>

          {totalIncidents === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#6b7280' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
              <p style={{ margin: '0 0 16px' }}>No evidence documented yet</p>
              <button 
                onClick={() => router.push('/coach')}
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
            <>
              {/* Stats Row */}
              <div style={{ 
                display: 'flex', 
                gap: 12, 
                marginBottom: 20 
              }}>
                <div style={{ 
                  flex: 1, 
                  background: '#f9fafb', 
                  padding: 12, 
                  borderRadius: 10, 
                  textAlign: 'center' 
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#1a3a2f' }}>{totalIncidents}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>Total</div>
                </div>
                <div style={{ 
                  flex: 1, 
                  background: '#fef2f2', 
                  padding: 12, 
                  borderRadius: 10, 
                  textAlign: 'center' 
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{criticalCount}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>High/Critical</div>
                </div>
                <div style={{ 
                  flex: 1, 
                  background: '#f0fdf4', 
                  padding: 12, 
                  borderRadius: 10, 
                  textAlign: 'center' 
                }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{exhibitCount}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>In Exhibit</div>
                </div>
              </div>

              {/* Pattern Bars */}
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 10 }}>
                TOP PATTERNS
              </div>
              {patternCounts.map((p, i) => (
                <div 
                  key={p.pattern}
                  onClick={() => router.push(`/evidence?pattern=${encodeURIComponent(p.pattern)}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    marginBottom: 8,
                    background: '#f9fafb',
                    borderRadius: 8,
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f9fafb'}
                >
                  <div style={{ 
                    width: 24, 
                    height: 24, 
                    background: '#1a3a2f', 
                    color: 'white', 
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#1a3a2f', fontSize: 14 }}>
                      {categoryLabels[p.pattern] || p.pattern}
                    </div>
                    <div style={{
                      height: 4,
                      background: '#e5e7eb',
                      borderRadius: 2,
                      marginTop: 4,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        background: '#1a3a2f',
                        borderRadius: 2,
                        width: `${(p.count / patternCounts[0]?.count) * 100}%`
                      }} />
                    </div>
                  </div>
                  <div style={{ 
                    fontSize: 18, 
                    fontWeight: 700, 
                    color: '#1a3a2f',
                    minWidth: 30,
                    textAlign: 'right'
                  }}>
                    {p.count}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Exhibit Status */}
        {exhibitCount > 0 && (
          <div 
            onClick={() => router.push('/generate-exhibit')}
            style={{
              background: 'linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%)',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              cursor: 'pointer',
              color: 'white'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <div>
                <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>
                  Ready for court
                </div>
                <div style={{ fontSize: 24, fontWeight: 700 }}>
                  {exhibitCount} incidents marked for exhibit
                </div>
              </div>
              <div style={{
                background: '#059669',
                padding: '10px 20px',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 14
              }}>
                Generate →
              </div>
            </div>
          </div>
        )}

        {/* Case Info */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          {caseContext?.case_number || caseContext?.court ? (
            <>
              <div style={{ 
                fontSize: 12, 
                fontWeight: 600, 
                color: '#6b7280', 
                letterSpacing: 1,
                marginBottom: 8 
              }}>
                CASE INFO
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start' 
              }}>
                <div>
                  {caseContext.case_number && (
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#1a3a2f' }}>
                      {caseContext.case_number}
                    </div>
                  )}
                  <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                    {[caseContext.county, caseContext.state].filter(Boolean).join(' • ')}
                  </div>
                </div>
                <button
                  onClick={() => router.push('/case-setup')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  Edit
                </button>
              </div>
            </>
          ) : (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <div style={{ color: '#6b7280', fontSize: 14 }}>
                Add case details for court documents
              </div>
              <button
                onClick={() => router.push('/case-setup')}
                style={{
                  background: '#1a3a2f',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                Set Up
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Floating Coach */}
      <FloatingCoach 
        courtDate={caseContext?.next_court_date}
        evidenceCount={totalIncidents}
      />

      <BottomNav active="case" />
    </div>
  );
}