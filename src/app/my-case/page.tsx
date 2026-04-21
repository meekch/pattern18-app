'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

const categoryLabels: Record<string, string> = {
  gaslighting: "Gaslighting",
  darvo: "DARVO",
  intimidation: "Intimidation",
  threats: "Threats",
  financial_abuse: "Financial Abuse",
  financial_coercion: "Financial Abuse",
  using_children_as_weapons: "Using Children as Weapons",
  blame_shifting: "Blame-Shifting",
  false_accusations: "False Accusations",
  emotional_blackmail: "Emotional Blackmail",
  stonewalling: "Stonewalling",
  monitoring: "Monitoring/Stalking",
  monitoring_control: "Monitoring/Control",
  stalking: "Monitoring/Stalking",
  isolation: "Isolation Tactics",
  minimizing: "Minimizing/Denying",
  word_salad: "Word Salad",
  moving_goalposts: "Moving Goalposts",
  projection: "Projection",
  hoovering: "Hoovering",
  gatekeeping: "Gatekeeping",
  escalation_patterns: "Escalation",
};

interface PatternCount {
  pattern: string;
  label: string;
  count: number;
}

export default function MyCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [caseContext, setCaseContext] = useState<any>(null);
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [highCriticalCount, setHighCriticalCount] = useState(0);
  const [exhibitCount, setExhibitCount] = useState(0);
  const [patternCounts, setPatternCounts] = useState<PatternCount[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Load case context
      const { data: caseData } = await supabase
        .from('case_context')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (caseData) setCaseContext(caseData);

      // Load evidence stats
      const { data: evidence } = await supabase
        .from('incidents')
        .select('id, category, severity, include_in_exhibit')
        .eq('user_id', session.user.id);

      if (evidence && evidence.length > 0) {
        setTotalIncidents(evidence.length);
        setHighCriticalCount(evidence.filter((e: any) => 
          e.severity === 'critical' || e.severity === 'high'
        ).length);
        setExhibitCount(evidence.filter((e: any) => e.include_in_exhibit).length);

        // Pattern counts
        const patterns: Record<string, number> = {};
        evidence.forEach((e: any) => {
          const cat = e.category || 'uncategorized';
          patterns[cat] = (patterns[cat] || 0) + 1;
        });

        const sorted = Object.entries(patterns)
          .map(([pattern, count]) => ({
            pattern,
            label: categoryLabels[pattern] || pattern.replace(/_/g, ' '),
            count
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setPatternCounts(sorted);
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const daysUntilCourt = caseContext?.next_court_date
    ? Math.ceil((new Date(caseContext.next_court_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const hasCourtSoon = daysUntilCourt && daysUntilCourt > 0 && daysUntilCourt <= 30;
  const topPattern = patternCounts[0];
  const patternIsStrong = topPattern && topPattern.count >= 5;


  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        background: '#f8faf9' 
      }}>
        <div style={{ fontSize: 32 }}>📊</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1>My Case</h1>
        </div>
        <div className="header-right">
          {daysUntilCourt && daysUntilCourt > 0 && (
            <div className="court-badge">
              🗓️ Feb 9 <span className="days-pill">{daysUntilCourt}d</span>
            </div>
          )}
          <button onClick={() => router.push('/case-setup')} className="settings-btn">
            ⚙️
          </button>
        </div>
      </header>

      <main className="content">
        {/* Primary Action Card */}
        <div className="action-card">
          {hasCourtSoon ? (
            <>
              <div className="action-header">
                <span className="action-emoji">⚖️</span>
                <div>
                  <div className="action-title">Court in {daysUntilCourt} days</div>
                  <div className="action-subtitle">Your evidence is ready to export</div>
                </div>
              </div>
              <button 
                className="primary-btn"
                onClick={() => router.push('/generate-exhibit')}
              >
                Generate Court Packet →
              </button>
            </>
          ) : totalIncidents === 0 ? (
            <>
              <div className="action-header">
                <span className="action-emoji">📝</span>
                <div>
                  <div className="action-title">Start documenting</div>
                  <div className="action-subtitle">Every message builds your case</div>
                </div>
              </div>
              <button 
                className="primary-btn"
                onClick={() => router.push('/coach')}
              >
                Analyze First Message →
              </button>
            </>
          ) : (
            <>
              <div className="action-header">
                <span className="action-emoji">📈</span>
                <div>
                  <div className="action-title">Keep building</div>
                  <div className="action-subtitle">{totalIncidents} incidents documented</div>
                </div>
              </div>
              <button 
                className="primary-btn"
                onClick={() => router.push('/coach')}
              >
                Add New Evidence →
              </button>
            </>
          )}
        </div>

        {/* Evidence Summary */}
        {totalIncidents > 0 && (
          <div className="evidence-card">
            <div className="evidence-header">
              <h2>My Evidence</h2>
              <button onClick={() => router.push('/evidence')} className="view-link">
                View All →
              </button>
            </div>

            <div className="stats-row">
              <div className="stat" onClick={() => router.push('/evidence')} style={{ cursor: 'pointer' }}>
                <div className="stat-value">{totalIncidents}</div>
                <div className="stat-label">Total</div>
              </div>
              <div className="stat highlight-red" onClick={() => router.push('/evidence?severity=high')} style={{ cursor: 'pointer' }}>
                <div className="stat-value">{highCriticalCount}</div>
                <div className="stat-label">High/Critical</div>
              </div>
              <div className="stat highlight-green" onClick={() => router.push('/evidence?exhibit=true')} style={{ cursor: 'pointer' }}>
                <div className="stat-value">{exhibitCount}</div>
                <div className="stat-label">In Exhibit</div>
              </div>
            </div>

            {/* Top Patterns */}
            {patternCounts.length > 0 && (
              <div className="patterns-section">
                <div className="patterns-header">TOP PATTERNS</div>
                {patternCounts.map((p, i) => (
                  <div key={p.pattern} className="pattern-row" onClick={() => router.push('/evidence?pattern=' + encodeURIComponent(p.label))} style={{ cursor: 'pointer' }}>
                    <span className="pattern-rank">{i + 1}</span>
                    <span className="pattern-name">{p.label}</span>
                    <div className="pattern-bar-wrap">
                      <div 
                        className="pattern-bar" 
                        style={{ 
                          width: `${(p.count / topPattern.count) * 100}%`,
                          background: p.count >= 5 ? '#2F9D94' : '#d1d5db'
                        }} 
                      />
                    </div>
                    <span className="pattern-count">{p.count}</span>
                  </div>
                ))}
                {patternIsStrong && (
                  <div className="pattern-note success" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span>✓ {topPattern.count}+ instances = provable pattern for court</span>
                    <button
                      onClick={() => router.push('/docs')}
                      style={{ background: '#2F9D94', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}
                    >
                      Generate Report →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Go to Coach */}
        <div className="quick-input-card" style={{ textAlign: 'center' }}>
          <div className="quick-label">Ready to document more evidence?</div>
          <button
            className="primary-btn"
            onClick={() => router.push('/coach')}
            style={{ marginTop: 8 }}
          >
            Go to Coach →
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="secondary-actions">
          <button onClick={() => router.push('/docs')} className="secondary-btn">
            <span>📄</span>
            <span>Create Document</span>
          </button>
          <button onClick={() => router.push('/evidence/upload')} className="secondary-btn">
            <span>📤</span>
            <span>Bulk Import</span>
          </button>
        </div>
      </main>

      <BottomNav active="case" />

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #f8faf9;
          padding-bottom: max(100px, calc(80px + env(safe-area-inset-bottom)));
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #1F2937;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .court-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.15);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
        }
        .days-pill {
          background: #fbbf24;
          color: #1F2937;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 12px;
        }
        .settings-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 22px;
          font-size: 18px;
          cursor: pointer;
        }
        .content {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }

        /* Action Card */
        .action-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .action-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }
        .action-emoji {
          font-size: 36px;
        }
        .action-title {
          font-size: 18px;
          font-weight: 700;
          color: #1F2937;
        }
        .action-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin-top: 2px;
        }
        .primary-btn {
          width: 100%;
          padding: 14px 20px;
          background: #1F2937;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .primary-btn:hover {
          background: #1A5F5A;
        }

        /* Evidence Card */
        .evidence-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .evidence-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .evidence-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1F2937;
        }
        .view-link {
          background: none;
          border: none;
          color: #2F9D94;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .stats-row {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat {
          flex: 1;
          text-align: center;
          padding: 12px 8px;
          background: #f9fafb;
          border-radius: 10px;
        }
        .stat.highlight-red {
          background: #fef2f2;
        }
        .stat.highlight-green {
          background: #EAF5F3;
        }
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #1F2937;
        }
        .stat.highlight-red .stat-value {
          color: #dc2626;
        }
        .stat.highlight-green .stat-value {
          color: #2F9D94;
        }
        .stat-label {
          font-size: 11px;
          color: #6b7280;
          margin-top: 2px;
        }

        /* Patterns */
        .patterns-section {
          border-top: 1px solid #e5e7eb;
          padding-top: 16px;
        }
        .patterns-header {
          font-size: 11px;
          font-weight: 600;
          color: #9ca3af;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }
        .pattern-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .pattern-rank {
          width: 20px;
          height: 20px;
          background: #e5e7eb;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #6b7280;
        }
        .pattern-name {
          width: 140px;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pattern-bar-wrap {
          flex: 1;
          height: 8px;
          background: #f3f4f6;
          border-radius: 4px;
          overflow: hidden;
        }
        .pattern-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s;
        }
        .pattern-count {
          width: 28px;
          text-align: right;
          font-size: 14px;
          font-weight: 700;
          color: #1F2937;
        }
        .pattern-note {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
        }
        .pattern-note.success {
          background: #EAF5F3;
          color: #2F9D94;
          border: 1px solid #C7E4E0;
        }

        /* Quick Input */
        .quick-input-card {
          background: white;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .quick-label {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 10px;
        }
        .stat:hover {
          transform: translateY(-1px);
          transition: transform 0.15s;
        }
        .pattern-row:hover {
          background: #f9fafb;
          border-radius: 6px;
        }

        /* Secondary Actions */
        .secondary-actions {
          display: flex;
          gap: 12px;
        }
        .secondary-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
        }
        .secondary-btn:hover {
          border-color: #1F2937;
          background: #EAF5F3;
        }
      `}</style>
    </div>
  );
}