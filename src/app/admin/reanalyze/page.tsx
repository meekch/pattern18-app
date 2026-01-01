'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Result {
  id: string;
  success?: boolean;
  skipped?: boolean;
  error?: string;
  pattern?: string;
  allPatterns?: string[];
  severity?: string;
}

export default function ReanalyzePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState({ successful: 0, skipped: 0, errors: 0 });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    init();
  }, [router]);

  const runAnalysis = async () => {
    if (!user) return;
    
    setRunning(true);
    setProgress(0);
    setProcessed(0);
    setResults([]);
    setDone(false);
    setStats({ successful: 0, skipped: 0, errors: 0 });

    let offset = 0;
    let isDone = false;
    let totalSuccessful = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    while (!isDone) {
      try {
        const response = await fetch('/api/reanalyze-patterns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            batchSize: 10,
            offset,
          }),
        });

        if (!response.ok) {
          throw new Error('Analysis failed');
        }

        const data = await response.json();
        
        isDone = data.done;
        offset = data.nextOffset;
        setProgress(data.progress);
        setProcessed(prev => prev + data.processed);
        setTotal(data.total);
        setResults(prev => [...prev, ...data.results]);
        
        totalSuccessful += data.successful;
        totalSkipped += data.skipped;
        totalErrors += data.errors;
        setStats({ successful: totalSuccessful, skipped: totalSkipped, errors: totalErrors });

        // Small delay between batches
        if (!isDone) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error('Batch error:', error);
        isDone = true;
      }
    }

    setDone(true);
    setRunning(false);
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7f6', padding: 24 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <button 
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }}
        >
          ← Back
        </button>

        <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 16px', color: '#1a3a2f' }}>Re-Analyze Patterns</h1>
          
          <div style={{ 
            background: '#fef3c7', 
            border: '1px solid #fcd34d', 
            borderRadius: 8, 
            padding: 16,
            marginBottom: 24 
          }}>
            <strong>⚠️ What this does:</strong>
            <p style={{ margin: '8px 0 0' }}>
              This will re-analyze all your incidents and categorize them by actual coercive control patterns 
              (Gaslighting, DARVO, Intimidation, etc.) instead of topics (Medical, Schedule, etc.).
            </p>
            <p style={{ margin: '8px 0 0' }}>
              This uses AI to analyze each message and may take a few minutes for {total || '~200'} incidents.
            </p>
          </div>

          {!running && !done && (
            <button
              onClick={runAnalysis}
              style={{
                width: '100%',
                padding: 16,
                background: '#1a3a2f',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              🔄 Start Re-Analysis
            </button>
          )}

          {running && (
            <div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: 8,
                fontSize: 14,
                color: '#6b7280'
              }}>
                <span>Processing...</span>
                <span>{progress}%</span>
              </div>
              <div style={{ 
                height: 8, 
                background: '#e5e7eb', 
                borderRadius: 4, 
                overflow: 'hidden' 
              }}>
                <div 
                  style={{ 
                    height: '100%', 
                    background: '#1a3a2f', 
                    width: `${progress}%`,
                    transition: 'width 0.3s'
                  }} 
                />
              </div>
              <div style={{ marginTop: 12, fontSize: 14, color: '#6b7280' }}>
                {processed} of {total} incidents processed
              </div>
            </div>
          )}

          {done && (
            <div style={{ 
              background: '#d1fae5', 
              border: '1px solid #6ee7b7', 
              borderRadius: 8, 
              padding: 16,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <strong>Re-analysis complete!</strong>
              <p style={{ margin: '8px 0 0' }}>
                {stats.successful} updated, {stats.skipped} skipped, {stats.errors} errors
              </p>
              <button
                onClick={() => router.push('/my-case')}
                style={{
                  marginTop: 16,
                  padding: '12px 24px',
                  background: '#1a3a2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                View Updated Patterns →
              </button>
            </div>
          )}
        </div>

        {/* Results Log */}
        {results.length > 0 && (
          <div style={{ background: 'white', borderRadius: 16, padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', color: '#1a3a2f' }}>
              Analysis Log ({results.length} processed)
            </h3>
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {results.slice(-50).reverse().map((r, i) => (
                <div 
                  key={i}
                  style={{
                    padding: '8px 12px',
                    background: r.success ? '#f0fdf4' : r.skipped ? '#f9fafb' : '#fef2f2',
                    borderRadius: 6,
                    marginBottom: 4,
                    fontSize: 13,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span>
                    {r.success && `✅ ${r.pattern}`}
                    {r.skipped && `⏭️ Skipped: ${r.reason}`}
                    {r.error && `❌ Error: ${r.error}`}
                  </span>
                  {r.allPatterns && r.allPatterns.length > 1 && (
                    <span style={{ color: '#6b7280', fontSize: 11 }}>
                      +{r.allPatterns.length - 1} more
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}