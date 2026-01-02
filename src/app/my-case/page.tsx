'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

const categoryLabels: Record<string, string> = {
  // Coercive Control Patterns (correct)
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
  
  // Legacy topic-based (for old data)
  child_activities: "Child Activities",
  financial_dispute: "Financial Dispute",
  regular_schedule: "Schedule",
  exchange_conflict: "Exchange Conflict",
  legal_threats: "Legal Threats",
  medical_decisions: "Medical Decisions",
  communication: "Communication",
  boundary_violation: "Boundary Violation",
  parenting_decisions: "Parenting Decisions",
  holiday_scheduling: "Holiday Scheduling",
  uncategorized: "Uncategorized",
};

interface PatternCount {
  pattern: string;
  count: number;
  trend: 'up' | 'down' | 'same';
  recentCount: number;
}

interface MonthlyData {
  month: string;
  count: number;
}

export default function MyCasePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [caseContext, setCaseContext] = useState<any>(null);
  
  // Stats
  const [totalIncidents, setTotalIncidents] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [patternCounts, setPatternCounts] = useState<PatternCount[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [documentingDays, setDocumentingDays] = useState(0);

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
        .eq('user_id', session.user.id)
        .order('incident_date', { ascending: true });

      if (evidence && evidence.length > 0) {
        setTotalIncidents(evidence.length);
        
        // Critical count
        const critical = evidence.filter((e: any) => 
          e.severity === 'critical' || e.severity === 'high'
        ).length;
        setCriticalCount(critical);

        // Calculate documenting days
        const firstDate = new Date(evidence[0].incident_date);
        const daysDiff = Math.ceil((Date.now() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
        setDocumentingDays(daysDiff);

        // Pattern counts with trends
        const patterns: Record<string, { total: number; recent: number }> = {};
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        evidence.forEach((e: any) => {
          const category = e.category || 'Uncategorized';
          if (!patterns[category]) {
            patterns[category] = { total: 0, recent: 0 };
          }
          patterns[category].total++;
          
          const date = new Date(e.incident_date);
          if (date > thirtyDaysAgo) {
            patterns[category].recent++;
          }
        });

        // Filter out non-patterns
        const excludePatterns = ['not_abuse', 'uncategorized', 'none_detected', 'other'];
        
        const patternList: PatternCount[] = Object.entries(patterns)
          .filter(([pattern]) => !excludePatterns.includes(pattern))
          .map(([pattern, data]) => ({
            pattern,
            count: data.total,
            recentCount: data.recent,
            trend: data.recent > 3 ? 'up' : data.recent === 0 ? 'down' : 'same' as 'up' | 'down' | 'same'
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        setPatternCounts(patternList);

        // Monthly data for chart
        const monthly: Record<string, number> = {};
        evidence.forEach((e: any) => {
          const date = new Date(e.incident_date);
          const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          monthly[key] = (monthly[key] || 0) + 1;
        });

        const monthlyArray = Object.entries(monthly)
          .slice(-6)
          .map(([month, count]) => ({ month, count }));
        setMonthlyData(monthlyArray);
      }

      setLoading(false);
    };
    init();
  }, [router]);

  const daysUntilCourt = caseContext?.next_court_date
    ? Math.ceil((new Date(caseContext.next_court_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const maxMonthlyCount = Math.max(...monthlyData.map(m => m.count), 1);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner">ðŸ“Š</div>
        <style jsx>{`
          .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #f5f7f6;
          }
          .spinner {
            font-size: 48px;
            animation: pulse 1.5s infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>My Case</h1>
        <button onClick={() => router.push('/case-setup')} className="settings-btn">
          âš™ï¸
        </button>
      </header>

      <div className="content">
        {/* Court Countdown */}
        {daysUntilCourt && daysUntilCourt > 0 && (
          <div className="court-banner">
            <div className="court-days">{daysUntilCourt}</div>
            <div className="court-label">days until court</div>
            <button onClick={() => router.push('/docs')} className="prep-btn">
              Prepare Documents â†’
            </button>
          </div>
        )}

        {/* Main Stats */}
        <div className="stats-grid">
          <div className="stat-card primary" onClick={() => router.push('/evidence')}>
            <div className="stat-number">{totalIncidents}</div>
            <div className="stat-label">Incidents Documented</div>
            <div className="stat-sub">{documentingDays} days of documentation</div>
          </div>
          <div className="stat-card critical">
            <div className="stat-number">{criticalCount}</div>
            <div className="stat-label">High & Critical</div>
          </div>
          <div className="stat-card patterns">
            <div className="stat-number">{patternCounts.length}</div>
            <div className="stat-label">Patterns Found</div>
          </div>
        </div>

        {/* Pattern Breakdown */}
        <div className="section">
          <div className="section-header">
            <h2>Pattern Breakdown</h2>
            <span className="section-hint">Tap for details</span>
          </div>
          <div className="patterns-list">
            {patternCounts.map((p, i) => (
              <div key={p.pattern} className="pattern-row" onClick={() => router.push(`/evidence?filter=${encodeURIComponent(p.pattern)}`)}>
                <div className="pattern-rank">#{i + 1}</div>
                <div className="pattern-info">
                  <div className="pattern-name">{categoryLabels[p.pattern] || p.pattern}</div>
                  <div className="pattern-bar-container">
                    <div 
                      className="pattern-bar" 
                      style={{ width: `${(p.count / patternCounts[0]?.count) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="pattern-stats">
                  <div className="pattern-count">{p.count}</div>
                  <div className={`pattern-trend ${p.trend}`}>
                    {p.trend === 'up' && 'â†‘'}
                    {p.trend === 'down' && 'â†“'}
                    {p.trend === 'same' && 'â†’'}
                    <span>{p.recentCount} this month</span>
                  </div>
                </div>
              </div>
            ))}
            {patternCounts.length === 0 && (
              <div className="empty-patterns">
                <p>No patterns documented yet.</p>
                <button onClick={() => router.push('/coach')} className="start-btn">
                  Start Documenting â†’
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Activity Chart */}
        {monthlyData.length > 1 && (
          <div className="section">
            <h2>Documentation Timeline</h2>
            <div className="chart">
              {monthlyData.map((m) => (
                <div key={m.month} className="chart-bar-container">
                  <div className="chart-count">{m.count}</div>
                  <div 
                    className="chart-bar" 
                    style={{ height: `${(m.count / maxMonthlyCount) * 100}%` }}
                  />
                  <div className="chart-label">{m.month}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="section">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <button onClick={() => router.push('/evidence')} className="action-btn">
              <span className="action-icon">ðŸ“‹</span>
              <span>View Evidence</span>
            </button>
            <button onClick={() => router.push('/docs?create=true')} className="action-btn">
              <span className="action-icon">ðŸ“„</span>
              <span>Create Document</span>
            </button>
            <button onClick={() => router.push('/evidence/upload')} className="action-btn">
              <span className="action-icon">ðŸ“¤</span>
              <span>Bulk Import</span>
            </button>
            <button onClick={() => router.push('/calendar')} className="action-btn">
              <span className="action-icon">ðŸ“…</span>
              <span>Court Calendar</span>
            </button>
          </div>
        </div>

        {/* Case Info Summary */}
        {caseContext && (
          <div className="case-info">
            <div className="case-info-header">
              <span>Case Info</span>
              <button onClick={() => router.push('/case-setup')}>Edit</button>
            </div>
            <div className="case-info-content">
              {caseContext.case_number && <div><strong>Case #:</strong> {caseContext.case_number}</div>}
              {caseContext.court && <div><strong>Court:</strong> {caseContext.court}</div>}
              {caseContext.state && <div><strong>State:</strong> {caseContext.state}</div>}
              {!caseContext.case_number && !caseContext.court && (
                <div className="case-info-empty">
                  <p>Add your case details for accurate document generation</p>
                  <button onClick={() => router.push('/case-setup')}>Set Up Case â†’</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNav active="case" />

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(180deg, #e8f5e9 0%, #f5f7f6 100%);
          padding-bottom: 100px;
        }
        .header {
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #1a3a2f;
          color: white;
        }
        .header h1 {
          font-size: 24px;
          margin: 0;
        }
        .settings-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 20px;
          cursor: pointer;
        }
        .content {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .court-banner {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          margin-bottom: 20px;
          border: 2px solid #f59e0b;
        }
        .court-days {
          font-size: 48px;
          font-weight: 800;
          color: #92400e;
        }
        .court-label {
          font-size: 16px;
          color: #92400e;
          margin-bottom: 12px;
        }
        .prep-btn {
          background: #92400e;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }
        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          cursor: pointer;
        }
        .stat-card.primary {
          grid-column: 1 / -1;
          background: #1a3a2f;
          color: white;
        }
        .stat-card.critical {
          background: #fef2f2;
          border: 1px solid #fecaca;
        }
        .stat-card.critical .stat-number {
          color: #dc2626;
        }
        .stat-card.patterns {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }
        .stat-card.patterns .stat-number {
          color: #2563eb;
        }
        .stat-number {
          font-size: 36px;
          font-weight: 800;
          margin-bottom: 4px;
        }
        .stat-label {
          font-size: 14px;
          opacity: 0.8;
        }
        .stat-sub {
          font-size: 12px;
          opacity: 0.6;
          margin-top: 8px;
        }
        .section {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .section h2 {
          font-size: 18px;
          color: #1a3a2f;
          margin: 0 0 16px 0;
        }
        .section-header h2 {
          margin: 0;
        }
        .section-hint {
          font-size: 12px;
          color: #9ca3af;
        }
        .patterns-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .pattern-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 12px;
          cursor: pointer;
        }
        .pattern-row:hover {
          background: #f3f4f6;
        }
        .pattern-rank {
          font-size: 12px;
          font-weight: 700;
          color: #9ca3af;
          width: 28px;
        }
        .pattern-info {
          flex: 1;
        }
        .pattern-name {
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 6px;
        }
        .pattern-bar-container {
          height: 6px;
          background: #e5e7eb;
          border-radius: 3px;
          overflow: hidden;
        }
        .pattern-bar {
          height: 100%;
          background: #1a3a2f;
          border-radius: 3px;
        }
        .pattern-stats {
          text-align: right;
        }
        .pattern-count {
          font-size: 20px;
          font-weight: 700;
          color: #1a3a2f;
        }
        .pattern-trend {
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 4px;
          justify-content: flex-end;
        }
        .pattern-trend.up {
          color: #dc2626;
        }
        .pattern-trend.down {
          color: #16a34a;
        }
        .pattern-trend.same {
          color: #9ca3af;
        }
        .empty-patterns {
          text-align: center;
          padding: 20px;
          color: #6b7280;
        }
        .start-btn {
          margin-top: 12px;
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .chart {
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          height: 120px;
          gap: 8px;
        }
        .chart-bar-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          height: 100%;
        }
        .chart-count {
          font-size: 12px;
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 4px;
        }
        .chart-bar {
          width: 100%;
          max-width: 40px;
          background: linear-gradient(180deg, #1a3a2f 0%, #2d5a4a 100%);
          border-radius: 4px 4px 0 0;
          min-height: 4px;
        }
        .chart-label {
          font-size: 11px;
          color: #6b7280;
          margin-top: 8px;
        }
        .quick-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn:hover {
          border-color: #1a3a2f;
          background: #f0fdf4;
        }
        .action-icon {
          font-size: 24px;
        }
        .action-btn span:last-child {
          font-size: 13px;
          font-weight: 600;
          color: #1a3a2f;
        }
        .case-info {
          background: white;
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .case-info-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .case-info-header span {
          font-weight: 600;
          color: #1a3a2f;
        }
        .case-info-header button {
          background: none;
          border: none;
          color: #2563eb;
          font-size: 14px;
          cursor: pointer;
        }
        .case-info-content {
          font-size: 14px;
          color: #4b5563;
        }
        .case-info-content div {
          margin-bottom: 4px;
        }
        .case-info-empty {
          text-align: center;
          padding: 12px;
        }
        .case-info-empty p {
          margin: 0 0 12px 0;
          color: #9ca3af;
        }
        .case-info-empty button {
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}