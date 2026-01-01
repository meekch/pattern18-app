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
  const [exhibitIncidents, setExhibitIncidents] = useState<any[]>([]);
  const [allIncidents, setAllIncidents] = useState<any[]>([]);
  const [useAll, setUseAll] = useState(false);
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

      // Get all incidents
      const { data: incidents } = await supabase
        .from('incidents')
        .select('*')
        .eq('user_id', session.user.id)
        .order('incident_date', { ascending: true });

      if (incidents) {
        setAllIncidents(incidents);
        setExhibitIncidents(incidents.filter(i => i.include_in_exhibit));
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const incidentsToUse = useAll ? allIncidents : exhibitIncidents;
  const criticalCount = incidentsToUse.filter(i => i.severity === 'critical').length;
  const highCount = incidentsToUse.filter(i => i.severity === 'high').length;
  const patterns = [...new Set(incidentsToUse.flatMap(i => i.patterns || []))];

  const handleGenerate = async () => {
    if (!user || incidentsToUse.length === 0) return;
    
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-exhibit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          includeExhibitOnly: !useAll,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate exhibit');
      }

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

  // No incidents selected - prompt to go select
  if (exhibitIncidents.length === 0 && !useAll) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8faf9', paddingBottom: 100 }}>
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

        <main style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 32,
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <h2 style={{ margin: '0 0 8px', color: '#1f2937' }}>No Incidents Selected</h2>
            <p style={{ color: '#6b7280', marginBottom: 24, lineHeight: 1.5 }}>
              Go to Evidence and check the boxes next to incidents you want to include in your court exhibit.
            </p>
            <button
              onClick={() => router.push('/evidence')}
              style={{
                background: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '14px 28px',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 16
              }}
            >
              → Select Incidents
            </button>
            
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20, marginTop: 20 }}>
              <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 12 }}>
                Or include all {allIncidents.length} incidents:
              </p>
              <button
                onClick={() => setUseAll(true)}
                style={{
                  background: 'white',
                  color: '#6b7280',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Use All Incidents
              </button>
            </div>
          </div>
        </main>
        <BottomNav active="docs" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf9', paddingBottom: 100 }}>
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
        {/* Ready to Generate Card */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 24,
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '2px solid #059669'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <h2 style={{ margin: '0 0 4px', color: '#059669', fontSize: 22 }}>
              Ready to Generate
            </h2>
            <p style={{ color: '#6b7280', margin: 0 }}>
              {useAll ? 'All incidents' : 'Selected incidents'} will be included
            </p>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 20
          }}>
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>{incidentsToUse.length}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Incidents</div>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{criticalCount + highCount}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>High/Critical</div>
            </div>
            <div style={{ background: '#fefce8', borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#ca8a04' }}>{patterns.length}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Patterns</div>
            </div>
          </div>

          {/* Toggle */}
          {exhibitIncidents.length > 0 && (
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 20
            }}>
              <button
                onClick={() => setUseAll(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: !useAll ? '#059669' : '#f3f4f6',
                  color: !useAll ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Selected ({exhibitIncidents.length})
              </button>
              <button
                onClick={() => setUseAll(true)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: useAll ? '#059669' : '#f3f4f6',
                  color: useAll ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                All ({allIncidents.length})
              </button>
            </div>
          )}

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
            disabled={generating}
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
            {generating ? '⏳ Generating...' : '📥 Download Court Exhibit (.docx)'}
          </button>
        </div>

        {/* What's Included */}
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#6b7280' }}>DOCUMENT INCLUDES:</h3>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#374151', fontSize: 14, lineHeight: 1.8 }}>
            <li>Professional cover page</li>
            <li>Executive summary with statistics</li>
            <li>Pattern breakdown table</li>
            <li>Monthly timeline</li>
            <li>All incidents with exact quotes</li>
            <li>Appendix: Pattern definitions with academic sources</li>
          </ul>
        </div>

        {/* Edit Selection Link */}
        <button
          onClick={() => router.push('/evidence')}
          style={{
            width: '100%',
            marginTop: 16,
            padding: 14,
            background: 'transparent',
            color: '#6b7280',
            border: '1px dashed #d1d5db',
            borderRadius: 10,
            fontSize: 14,
            cursor: 'pointer'
          }}
        >
          ← Edit Selection in Evidence
        </button>
      </main>

      <BottomNav active="docs" />
    </div>
  );
}