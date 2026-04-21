'use client';

import { useState, useEffect } from 'react';

interface KPIs {
  total_leads: number;
  total_leads_this_week: number;
  total_leads_last_week: number;
  avg_quality: number;
  avg_quality_this_week: number;
  avg_quality_last_week: number;
  after_hours: number;
  after_hours_this_week: number;
  after_hours_last_week: number;
  revenue_potential: number;
  revenue_this_week: number;
  revenue_last_week: number;
}

interface Quality {
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface SourceItem {
  name: string;
  count: number;
}

interface TreatmentItem {
  name: string;
  count: number;
  revenue: number;
}

interface RecentLead {
  name: string;
  treatment: string;
  timeline: string;
  quality_score: number;
  quality_label: string;
  source: string;
  after_hours: boolean;
  created_at: string;
}

interface DashboardData {
  kpis: KPIs;
  quality: Quality;
  sources: SourceItem[];
  treatments: TreatmentItem[];
  recent_leads: RecentLead[];
}

export default function DashboardPage() {
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('dashboard_auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.key && Date.now() - parsed.ts < 4 * 60 * 60 * 1000) {
          setAuthorized(true);
          fetchData(parsed.key);
        }
      } catch { /* expired or invalid */ }
    }
    setChecking(false);
  }, []);

  const fetchData = async (key: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/data', {
        method: 'POST',
        headers: { 'x-dashboard-key': key },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        sessionStorage.removeItem('dashboard_auth');
        setAuthorized(false);
        setError('Session expired. Please re-enter your access key.');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;
    setVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/dashboard/data', {
        method: 'POST',
        headers: { 'x-dashboard-key': passcode.trim() },
      });
      if (res.ok) {
        const json = await res.json();
        sessionStorage.setItem('dashboard_auth', JSON.stringify({ key: passcode.trim(), ts: Date.now() }));
        setData(json);
        setAuthorized(true);
      } else {
        setError('Invalid access key.');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setVerifying(false);
  };

  if (checking) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <div className="gate"><div className="gate-loading">Verifying access...</div></div>
        <style jsx>{gateStyles}</style>
      </>
    );
  }

  if (!authorized) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <div className="gate">
          <div className="gate-card">
            <div className="gate-badge">Business Intelligence</div>
            <h1>Luméa Dashboard</h1>
            <p>Enter your access key to view analytics.</p>
            <form onSubmit={handleSubmit}>
              <input
                type="password"
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                placeholder="Access key"
                autoFocus
                disabled={verifying}
              />
              {error && <div className="gate-error">{error}</div>}
              <button type="submit" disabled={verifying || !passcode.trim()}>
                {verifying ? 'Verifying...' : 'View Dashboard'}
              </button>
            </form>
          </div>
        </div>
        <style jsx>{gateStyles}</style>
      </>
    );
  }

  if (loading || !data) {
    return (
      <>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <div className="gate"><div className="gate-loading">Loading dashboard...</div></div>
        <style jsx>{gateStyles}</style>
      </>
    );
  }

  const { kpis, quality, sources, treatments, recent_leads } = data;
  const now = new Date();
  const monthBadge = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Donut chart
  const total = quality.total || 1;
  const highDeg = (quality.high / total) * 360;
  const medDeg = (quality.medium / total) * 360;
  const lowDeg = (quality.low / total) * 360;
  const donutGradient = quality.total === 0
    ? 'conic-gradient(#E7E2DA 0deg 360deg)'
    : `conic-gradient(#8B7355 0deg ${highDeg}deg, #C7B8A3 ${highDeg}deg ${highDeg + medDeg}deg, #E7E2DA ${highDeg + medDeg}deg ${highDeg + medDeg + lowDeg}deg)`;

  // Source bar max
  const sourceMax = sources.length > 0 ? Math.max(...sources.map(s => s.count)) : 1;
  const sourceColors = ['#8B7355', '#C7B8A3', '#A69279', '#D4C5B0', '#6B5B45'];

  // Treatment bar max
  const treatmentMax = treatments.length > 0 ? Math.max(...treatments.map(t => t.revenue)) : 1;

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <div className="dashboard">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-left">
            <h1 className="practice-name">Luméa Medical Aesthetics</h1>
            <span className="month-badge">{monthBadge}</span>
          </div>
          <div className="live-badge">
            <span className="live-dot" />
            Live
          </div>
        </header>

        {/* KPI row */}
        <div className="kpi-row">
          <KPICard
            label="Total Leads"
            value={String(kpis.total_leads)}
            thisWeek={kpis.total_leads_this_week}
            lastWeek={kpis.total_leads_last_week}
          />
          <KPICard
            label="Avg Quality Score"
            value={kpis.avg_quality.toFixed(1)}
            thisWeek={kpis.avg_quality_this_week}
            lastWeek={kpis.avg_quality_last_week}
            decimals
          />
          <KPICard
            label="After-Hours Leads"
            value={String(kpis.after_hours)}
            thisWeek={kpis.after_hours_this_week}
            lastWeek={kpis.after_hours_last_week}
          />
          <KPICard
            label="Revenue Potential"
            value={`$${kpis.revenue_potential.toLocaleString()}`}
            thisWeek={kpis.revenue_this_week}
            lastWeek={kpis.revenue_last_week}
            currency
          />
        </div>

        {/* Two-column grid */}
        <div className="grid-2col">
          {/* Quality Distribution */}
          <div className="card">
            <h2 className="card-title">Lead Quality Distribution</h2>
            <div className="quality-content">
              <div className="donut-wrap">
                <div className="donut" style={{ background: donutGradient }}>
                  <div className="donut-center">
                    <span className="donut-number">{quality.total}</span>
                    <span className="donut-label">Total</span>
                  </div>
                </div>
              </div>
              <div className="quality-bars">
                <QualityBar label="High" count={quality.high} total={total} color="#8B7355" />
                <QualityBar label="Medium" count={quality.medium} total={total} color="#C7B8A3" />
                <QualityBar label="Low" count={quality.low} total={total} color="#E7E2DA" />
              </div>
            </div>
          </div>

          {/* Lead Sources */}
          <div className="card">
            <h2 className="card-title">Lead Sources</h2>
            <div className="source-bars">
              {sources.length === 0 && <p className="empty-text">No source data yet</p>}
              {sources.map((s, i) => (
                <div key={s.name} className="source-row">
                  <span className="source-name">{s.name}</span>
                  <div className="source-bar-track">
                    <div
                      className="source-bar-fill"
                      style={{
                        width: `${(s.count / sourceMax) * 100}%`,
                        background: sourceColors[i % sourceColors.length],
                      }}
                    />
                  </div>
                  <span className="source-count">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue by Treatment */}
        <div className="card">
          <h2 className="card-title">Revenue by Treatment</h2>
          <div className="treatment-bars">
            {treatments.length === 0 && <p className="empty-text">No treatment data yet</p>}
            {treatments.map((t) => (
              <div key={t.name} className="treatment-row">
                <div className="treatment-info">
                  <span className="treatment-name">{t.name}</span>
                  <span className="treatment-meta">{t.count} lead{t.count !== 1 ? 's' : ''}</span>
                </div>
                <div className="treatment-bar-track">
                  <div
                    className="treatment-bar-fill"
                    style={{ width: `${(t.revenue / treatmentMax) * 100}%` }}
                  />
                </div>
                <span className="treatment-revenue">${t.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="card">
          <h2 className="card-title">Recent Leads</h2>
          <div className="table-scroll">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Treatment</th>
                  <th>Timeline</th>
                  <th>Quality</th>
                  <th>Score</th>
                  <th>Source</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recent_leads.length === 0 && (
                  <tr><td colSpan={7} className="empty-cell">No leads yet</td></tr>
                )}
                {recent_leads.map((lead, i) => (
                  <tr key={i}>
                    <td className="lead-name">{lead.name}</td>
                    <td>{lead.treatment}</td>
                    <td>{lead.timeline}</td>
                    <td>
                      <span className={`quality-badge quality-${lead.quality_label.toLowerCase()}`}>
                        {lead.quality_label}
                      </span>
                    </td>
                    <td className="score-cell">{lead.quality_score.toFixed(1)}</td>
                    <td><span className="source-tag">{lead.source}</span></td>
                    <td className="time-cell">
                      {lead.after_hours && <span className="moon">🌙</span>}
                      {formatTime(lead.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Navigation */}
        <div className="nav-links">
          <a href="/demo" className="nav-link">View Demo</a>
        </div>
      </div>
      <style jsx>{dashboardStyles}</style>
    </>
  );
}

function KPICard({ label, value, thisWeek, lastWeek, decimals, currency }: {
  label: string;
  value: string;
  thisWeek: number;
  lastWeek: number;
  decimals?: boolean;
  currency?: boolean;
}) {
  const fmt = (n: number) => {
    if (currency) return `$${n.toLocaleString()}`;
    if (decimals) return n.toFixed(1);
    return String(n);
  };
  return (
    <div className="kpi-card">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      <span className="kpi-sub">This week: {fmt(thisWeek)} · Last week: {fmt(lastWeek)}</span>
    </div>
  );
}

function QualityBar({ label, count, total, color }: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="qbar-row">
      <div className="qbar-label-row">
        <span className="qbar-dot" style={{ background: color }} />
        <span className="qbar-label">{label}</span>
        <span className="qbar-count">{count} ({pct}%)</span>
      </div>
      <div className="qbar-track">
        <div className="qbar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const gateStyles = `
  .gate {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F7F6F3;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    padding: 24px;
  }
  .gate-loading {
    font-size: 14px;
    color: #5A5A5A;
    letter-spacing: 0.5px;
  }
  .gate-card {
    text-align: center;
    max-width: 380px;
    width: 100%;
  }
  .gate-badge {
    display: inline-block;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #5A5A5A;
    border: 1px solid #E7E2DA;
    padding: 6px 16px;
    border-radius: 20px;
    margin-bottom: 24px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .gate-card h1 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 32px;
    font-weight: 500;
    color: #232323;
    margin: 0 0 12px 0;
    letter-spacing: -0.3px;
  }
  .gate-card p {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 15px;
    color: #5A5A5A;
    margin: 0 0 28px 0;
    line-height: 1.5;
  }
  .gate-card form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .gate-card input {
    padding: 14px 16px;
    border: 1px solid #E7E2DA;
    border-radius: 12px;
    font-size: 15px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #232323;
    background: #FFFFFF;
    outline: none;
    text-align: center;
    letter-spacing: 1px;
    transition: border-color 0.2s;
  }
  .gate-card input:focus {
    border-color: #C7B8A3;
  }
  .gate-card input::placeholder {
    color: #9A948B;
    letter-spacing: 0.5px;
  }
  .gate-error {
    font-size: 13px;
    color: #B44;
  }
  .gate-card button {
    padding: 14px 24px;
    background: #C7B8A3;
    color: #FFFFFF;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    letter-spacing: 0.3px;
  }
  .gate-card button:hover:not(:disabled) {
    background: #B7A48C;
  }
  .gate-card button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const dashboardStyles = `
  .dashboard {
    min-height: 100vh;
    background: #F7F6F3;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    padding: 24px;
    max-width: 1200px;
    margin: 0 auto;
  }

  /* Top bar */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 32px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .topbar-left {
    display: flex;
    align-items: baseline;
    gap: 16px;
    flex-wrap: wrap;
  }
  .practice-name {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 28px;
    font-weight: 500;
    color: #232323;
    margin: 0;
    letter-spacing: -0.3px;
  }
  .month-badge {
    font-size: 12px;
    color: #5A5A5A;
    background: #FFFFFF;
    border: 1px solid #E7E2DA;
    padding: 4px 14px;
    border-radius: 20px;
    letter-spacing: 0.5px;
  }
  .live-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #2F9D94;
    font-weight: 500;
    letter-spacing: 0.5px;
  }
  .live-dot {
    width: 8px;
    height: 8px;
    background: #2F9D94;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* KPI row */
  .kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }
  .kpi-card {
    background: #FFFFFF;
    border: 1px solid #E7E2DA;
    border-radius: 16px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .kpi-label {
    font-size: 12px;
    color: #5A5A5A;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .kpi-value {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 36px;
    font-weight: 600;
    color: #232323;
    line-height: 1.1;
  }
  .kpi-sub {
    font-size: 11px;
    color: #9A948B;
    margin-top: 4px;
  }

  /* Cards */
  .card {
    background: #FFFFFF;
    border: 1px solid #E7E2DA;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
  }
  .card-title {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #232323;
    margin: 0 0 20px 0;
    letter-spacing: 0.3px;
  }

  /* Two-column grid */
  .grid-2col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  .grid-2col .card {
    margin-bottom: 0;
  }

  /* Quality distribution */
  .quality-content {
    display: flex;
    gap: 32px;
    align-items: center;
  }
  .donut-wrap {
    flex-shrink: 0;
  }
  .donut {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .donut-center {
    width: 72px;
    height: 72px;
    background: #FFFFFF;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .donut-number {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 24px;
    font-weight: 600;
    color: #232323;
    line-height: 1;
  }
  .donut-label {
    font-size: 10px;
    color: #9A948B;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .quality-bars {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .qbar-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .qbar-label-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .qbar-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .qbar-label {
    font-size: 13px;
    color: #232323;
  }
  .qbar-count {
    font-size: 12px;
    color: #9A948B;
    margin-left: auto;
  }
  .qbar-track {
    height: 6px;
    background: #F3F1ED;
    border-radius: 3px;
    overflow: hidden;
  }
  .qbar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.6s ease;
  }

  /* Source bars */
  .source-bars {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .source-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .source-name {
    font-size: 13px;
    color: #232323;
    min-width: 80px;
    text-transform: capitalize;
  }
  .source-bar-track {
    flex: 1;
    height: 8px;
    background: #F3F1ED;
    border-radius: 4px;
    overflow: hidden;
  }
  .source-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.6s ease;
  }
  .source-count {
    font-size: 13px;
    color: #5A5A5A;
    min-width: 24px;
    text-align: right;
  }

  /* Treatment bars */
  .treatment-bars {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .treatment-row {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .treatment-info {
    min-width: 180px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .treatment-name {
    font-size: 13px;
    color: #232323;
    font-weight: 500;
  }
  .treatment-meta {
    font-size: 11px;
    color: #9A948B;
  }
  .treatment-bar-track {
    flex: 1;
    height: 10px;
    background: #F3F1ED;
    border-radius: 5px;
    overflow: hidden;
  }
  .treatment-bar-fill {
    height: 100%;
    border-radius: 5px;
    background: #C7B8A3;
    transition: width 0.6s ease;
  }
  .treatment-revenue {
    font-size: 14px;
    font-weight: 500;
    color: #232323;
    min-width: 80px;
    text-align: right;
  }

  /* Empty state */
  .empty-text {
    font-size: 14px;
    color: #9A948B;
    font-style: italic;
    margin: 0;
  }
  .empty-cell {
    text-align: center;
    color: #9A948B;
    font-style: italic;
    padding: 32px 16px !important;
  }

  /* Table */
  .table-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .leads-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 700px;
  }
  .leads-table th {
    font-size: 11px;
    color: #9A948B;
    text-transform: uppercase;
    letter-spacing: 1px;
    text-align: left;
    padding: 0 12px 12px;
    border-bottom: 1px solid #E7E2DA;
    font-weight: 500;
    white-space: nowrap;
  }
  .leads-table td {
    font-size: 13px;
    color: #232323;
    padding: 14px 12px;
    border-bottom: 1px solid #F3F1ED;
    white-space: nowrap;
  }
  .leads-table tbody tr:hover {
    background: #FAFAF8;
  }
  .lead-name {
    font-weight: 500;
  }
  .score-cell {
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  .quality-badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.3px;
  }
  .quality-high {
    background: #F0EBE3;
    color: #8B7355;
  }
  .quality-medium {
    background: #F3F1ED;
    color: #A69279;
  }
  .quality-low {
    background: #F7F6F3;
    color: #9A948B;
  }
  .source-tag {
    display: inline-block;
    padding: 2px 8px;
    background: #F3F1ED;
    border-radius: 8px;
    font-size: 11px;
    color: #5A5A5A;
    text-transform: capitalize;
  }
  .time-cell {
    color: #5A5A5A;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .moon {
    font-size: 12px;
  }

  /* Navigation */
  .nav-links {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding: 24px 0 48px;
  }
  .nav-link {
    font-size: 13px;
    color: #5A5A5A;
    text-decoration: none;
    padding: 8px 20px;
    border: 1px solid #E7E2DA;
    border-radius: 20px;
    transition: all 0.2s;
    letter-spacing: 0.3px;
  }
  .nav-link:hover {
    background: #FFFFFF;
    border-color: #C7B8A3;
    color: #232323;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .dashboard {
      padding: 16px;
    }
    .practice-name {
      font-size: 22px;
    }
    .kpi-row {
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .kpi-value {
      font-size: 28px;
    }
    .grid-2col {
      grid-template-columns: 1fr;
      gap: 16px;
    }
    .quality-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 20px;
    }
    .treatment-info {
      min-width: 120px;
    }
  }
  @media (max-width: 480px) {
    .kpi-value {
      font-size: 24px;
    }
    .kpi-sub {
      font-size: 10px;
    }
    .treatment-row {
      flex-wrap: wrap;
      gap: 8px;
    }
    .treatment-info {
      min-width: 100%;
    }
    .treatment-bar-track {
      min-width: 0;
    }
  }
`;
