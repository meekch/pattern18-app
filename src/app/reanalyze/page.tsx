'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface Incident {
  id: string;
  title: string;
  category: string;
  patterns: string[];
  severity: string;
  incident_date: string;
  coparent_message?: string;
  messages_json?: any[];
}

interface AnalysisResult {
  isAbusive: boolean;
  confidence: string;
  severity: string;
  patterns: { name: string; evidence: string; explanation: string }[];
  primaryPattern: string | null;
  summary: string;
  flaggedPhrases: string[];
}

export default function ReanalyzePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<{
    processed: number;
    abusive: number;
    notAbusive: number;
    errors: number;
  } | null>(null);
  const [currentIncident, setCurrentIncident] = useState<string>('');

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

      const { data } = await supabase
        .from('incidents')
        .select('*')
        .eq('user_id', session.user.id)
        .order('incident_date', { ascending: true });

      setIncidents(data || []);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const analyzeAllIncidents = async () => {
    if (!user || incidents.length === 0) return;

    setAnalyzing(true);
    setProgress({ current: 0, total: incidents.length });
    setResults(null);

    let processed = 0;
    let abusive = 0;
    let notAbusive = 0;
    let errors = 0;

    for (const incident of incidents) {
      setCurrentIncident(incident.coparent_message?.slice(0, 50) || 'Processing...');
      
      try {
        // Get messages for analysis
        const hasMessages = incident.messages_json && incident.messages_json.length > 0;
        const messages = hasMessages
          ? incident.messages_json!.map((m: any) => ({
              text: m.text,
              sender: m.sender || 'coparent',
              timestamp: m.timestamp
            }))
          : incident.coparent_message 
            ? [{ text: incident.coparent_message, sender: 'coparent' as const }]
            : [];

        if (messages.length === 0) {
          errors++;
          setProgress(p => ({ ...p, current: p.current + 1 }));
          continue;
        }

        // Call AI analysis
        const response = await fetch('/api/analyze-patterns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages })
        });

        if (!response.ok) {
          throw new Error('Analysis failed');
        }

        const { analysis } = await response.json() as { analysis: AnalysisResult };

        // Update incident in database
        const newCategory = analysis.primaryPattern 
          ? analysis.primaryPattern.toLowerCase().replace(/[\/\s]+/g, '_')
          : analysis.isAbusive ? 'manipulation' : 'not_abuse';

        const newPatterns = analysis.patterns.map(p => p.name);

        await supabase
          .from('incidents')
          .update({
            severity: analysis.severity === 'none' ? 'low' : analysis.severity,
            patterns: newPatterns,
            category: newCategory,
            ai_summary: analysis.summary,
            include_in_exhibit: analysis.isAbusive && ['critical', 'high'].includes(analysis.severity)
          })
          .eq('id', incident.id)
          .eq('user_id', user.id);

        if (analysis.isAbusive) {
          abusive++;
        } else {
          notAbusive++;
        }
        processed++;

      } catch (err) {
        console.error(`Error analyzing incident ${incident.id}:`, err);
        errors++;
      }

      setProgress(p => ({ ...p, current: p.current + 1 }));
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 500));
    }

    setResults({ processed, abusive, notAbusive, errors });
    setAnalyzing(false);
    setCurrentIncident('');
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
      <header style={{
        background: 'linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%)',
        padding: '16px 24px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <button 
          onClick={() => router.push('/evidence')}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}
        >
          ←
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>AI Pattern Re-Analysis</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>Fix misidentified patterns with AI</p>
        </div>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
        {/* Explanation Card */}
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 24,
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: 40, marginBottom: 16, textAlign: 'center' }}>🧠</div>
          <h2 style={{ margin: '0 0 12px', textAlign: 'center', color: '#1f2937' }}>
            AI-Powered Pattern Detection
          </h2>
          <p style={{ color: '#6b7280', lineHeight: 1.6, marginBottom: 16 }}>
            This will re-analyze all your incidents using Claude AI instead of simple keyword matching. 
            The AI understands context - it won't flag "First cuts tonight?" about basketball tryouts as verbal abuse.
          </p>

          <div style={{
            background: '#f9fafb',
            borderRadius: 10,
            padding: 16,
            marginBottom: 16
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              WHAT IT DOES:
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#6b7280', fontSize: 14, lineHeight: 1.7 }}>
              <li>Analyzes each message exchange for real abuse patterns</li>
              <li>Understands context (sports, schedules, etc.)</li>
              <li>Assigns accurate severity levels</li>
              <li>Removes false positives</li>
              <li>Auto-selects high-severity incidents for exhibit</li>
            </ul>
          </div>

          <div style={{
            background: '#fefce8',
            border: '1px solid #fef08a',
            borderRadius: 10,
            padding: 14,
            marginBottom: 20
          }}>
            <div style={{ fontSize: 13, color: '#92400e' }}>
              <strong>⏱️ Estimated time:</strong> {Math.ceil(incidents.length * 2 / 60)} minutes for {incidents.length} incidents
            </div>
            <div style={{ fontSize: 13, color: '#92400e', marginTop: 4 }}>
              <strong>💰 Estimated cost:</strong> ~${(incidents.length * 0.02).toFixed(2)} API usage
            </div>
          </div>

          {!analyzing && !results && (
            <button
              onClick={analyzeAllIncidents}
              disabled={incidents.length === 0}
              style={{
                width: '100%',
                padding: 16,
                background: incidents.length === 0 ? '#9ca3af' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: incidents.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              🔬 Re-Analyze {incidents.length} Incidents
            </button>
          )}
        </div>

        {/* Progress */}
        {analyzing && (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            marginBottom: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px', color: '#1f2937' }}>Analyzing...</h3>
            
            <div style={{
              background: '#f3f4f6',
              borderRadius: 8,
              height: 24,
              overflow: 'hidden',
              marginBottom: 12
            }}>
              <div style={{
                background: 'linear-gradient(90deg, #059669, #34d399)',
                height: '100%',
                width: `${(progress.current / progress.total) * 100}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#6b7280' }}>
              <span>{progress.current} of {progress.total}</span>
              <span>{Math.round((progress.current / progress.total) * 100)}%</span>
            </div>

            {currentIncident && (
              <div style={{
                marginTop: 12,
                padding: 12,
                background: '#f9fafb',
                borderRadius: 8,
                fontSize: 13,
                color: '#6b7280'
              }}>
                📝 "{currentIncident}..."
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {results && (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            marginBottom: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: 40, marginBottom: 12, textAlign: 'center' }}>✅</div>
            <h3 style={{ margin: '0 0 20px', textAlign: 'center', color: '#059669' }}>
              Analysis Complete
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
              marginBottom: 20
            }}>
              <div style={{ background: '#fef2f2', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#dc2626' }}>{results.abusive}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Abuse Detected</div>
              </div>
              <div style={{ background: '#d1fae5', borderRadius: 10, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>{results.notAbusive}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Not Abuse</div>
              </div>
            </div>

            {results.errors > 0 && (
              <div style={{
                background: '#fefce8',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                fontSize: 13,
                color: '#92400e'
              }}>
                ⚠️ {results.errors} incidents could not be analyzed (empty or error)
              </div>
            )}

            <button
              onClick={() => router.push('/evidence')}
              style={{
                width: '100%',
                padding: 14,
                background: '#1a3a2f',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              View Updated Evidence →
            </button>
          </div>
        )}

        {/* Info */}
        <div style={{
          background: '#d1fae5',
          border: '1px solid #6ee7b7',
          borderRadius: 12,
          padding: 16
        }}>
          <div style={{ fontWeight: 600, color: '#065f46', marginBottom: 8 }}>
            🎯 Why AI Analysis?
          </div>
          <p style={{ margin: 0, color: '#047857', fontSize: 14, lineHeight: 1.5 }}>
            Keyword matching flagged "First cuts tonight?" as abuse because it saw "cuts." 
            AI understands this is about basketball tryouts, not self-harm or violence. 
            This accuracy is what makes Pattern 18 worth $89/month.
          </p>
        </div>
      </main>

      <BottomNav active="case" />
    </div>
  );
}