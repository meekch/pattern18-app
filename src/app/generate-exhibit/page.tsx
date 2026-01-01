'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

export default function GenerateExhibitPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [includeExhibitOnly, setIncludeExhibitOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Get incident stats
      const { data: incidents } = await supabase
        .from('incidents')
        .select('id, severity, patterns, include_in_exhibit, incident_date')
        .eq('user_id', session.user.id);

      if (incidents) {
        const exhibitOnly = incidents.filter(i => i.include_in_exhibit);
        const critical = incidents.filter(i => i.severity === 'critical').length;
        const high = incidents.filter(i => i.severity === 'high').length;
        const patterns = new Set(incidents.flatMap(i => i.patterns || []));
        
        const dates = incidents.map(i => new Date(i.incident_date)).sort((a, b) => a.getTime() - b.getTime());
        
        setStats({
          total: incidents.length,
          exhibitCount: exhibitOnly.length,
          critical,
          high,
          patternCount: patterns.size,
          startDate: dates[0],
          endDate: dates[dates.length - 1],
        });
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!user) return;
    
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-exhibit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          includeExhibitOnly,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate exhibit');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pattern18_Exhibit_${new Date().toISOString().split('T')[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

    } catch (err: any) {
      console.error('Generate error:', err);
      setError(err.message || 'Failed to generate exhibit');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8faf9' }}>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf9', paddingBottom: 100 }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%)',
        padding: '16px 24px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <button 
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Generate Court Exhibit</h1>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
        {/* Preview Card */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 40 }}>📄</div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: '#1f2937' }}>Court-Ready Exhibit</h2>
              <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>Professional documentation package</p>
            </div>
          </div>

          {stats && (
            <div style={{
              background: '#f9fafb',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 12 }}>
                WHAT'S INCLUDED:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#1a3a2f' }}>{stats.total}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Total Incidents</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{stats.critical + stats.high}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>High/Critical</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6' }}>{stats.patternCount}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Unique Patterns</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{stats.exhibitCount}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>Marked for Exhibit</div>
                </div>
              </div>
              {stats.startDate && stats.endDate && (
                <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
                  📅 {stats.startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – {stats.endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
          )}

          {/* Document Contents */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
              DOCUMENT CONTAINS:
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#374151', fontSize: 14, lineHeight: 1.8 }}>
              <li>Executive Summary with key statistics</li>
              <li>Severity breakdown (Critical, High, Medium, Low)</li>
              <li>Pattern analysis with frequency counts</li>
              <li>Monthly timeline showing escalation</li>
              <li>All documented incidents with messages</li>
              <li>Appendix: Pattern definitions with academic sources</li>
            </ul>
          </div>

          {/* Options */}
          <div style={{
            background: '#fefce8',
            border: '1px solid #fef08a',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeExhibitOnly}
                onChange={(e) => setIncludeExhibitOnly(e.target.checked)}
                style={{ width: 20, height: 20, cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: 600, color: '#92400e' }}>
                  Only include incidents marked "In Exhibit"
                </div>
                <div style={{ fontSize: 13, color: '#a16207' }}>
                  {stats?.exhibitCount || 0} of {stats?.total || 0} incidents selected
                </div>
              </div>
            </label>
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              color: '#dc2626',
              fontSize: 14
            }}>
              {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !stats?.total}
            style={{
              width: '100%',
              padding: 16,
              background: generating ? '#9ca3af' : '#1a3a2f',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 600,
              cursor: generating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {generating ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                Generating Document...
              </>
            ) : (
              <>
                📥 Download Court Exhibit (.docx)
              </>
            )}
          </button>
        </div>

       {/* Info Card */}
       <div style={{
          background: '#d1fae5',
          border: '1px solid #6ee7b7',
          borderRadius: 12,
          padding: 16
        }}>
          <div style={{ fontWeight: 600, color: '#065f46', marginBottom: 8 }}>
            💡 Pro Tip
          </div>
          <p style={{ margin: '0 0 12px', color: '#047857', fontSize: 14, lineHeight: 1.5 }}>
            Select your strongest evidence first, then generate a focused exhibit.
          </p>
          <button
            onClick={() => router.push('/evidence')}
            style={{
              background: '#059669',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            → Select Incidents in Evidence
          </button>
        </div>
          <div style={{ fontWeight: 600, color: '#065f46', marginBottom: 8 }}>
            💡 Pro Tip
          </div>
          <p style={{ margin: 0, color: '#047857', fontSize: 14, lineHeight: 1.5 }}>
            Before generating, go to <strong>Evidence</strong> and check the boxes next to incidents you want to highlight. 
            Then select "Only include incidents marked 'In Exhibit'" above to create a focused document with your strongest evidence.
          </p>
        </div>
      </main>

      <BottomNav active="docs" />

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}