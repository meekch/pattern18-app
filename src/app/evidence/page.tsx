'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Incident {
  id: string;
  date: string;
  description: string;
  patterns: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  source: string;
  created_at: string;
}

const PATTERN_COLORS: { [key: string]: string } = {
  'Gaslighting': '#ef4444',
  'DARVO': '#f97316',
  'Blame-shifting': '#f59e0b',
  'Baiting': '#eab308',
  'Threats/Intimidation': '#dc2626',
  'Triangulation': '#8b5cf6',
  'Financial Manipulation': '#10b981',
  'Schedule Manipulation': '#3b82f6',
  'Hoovering': '#ec4899',
  'Projection': '#6366f1',
  'Word Salad': '#14b8a6',
  'Silent Treatment': '#6b7280',
};

const CATEGORIES = [
  'Communication',
  'Schedule/Custody',
  'Financial',
  'Medical Decisions',
  'School/Education',
  'Verbal/Emotional',
  'Legal/Court',
  'Children',
  'Other',
];

export default function EvidencePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  
  // Filters
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'patterns'>('all');
  const [patternFilter, setPatternFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');
  
  // Quick capture
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [captureText, setCaptureText] = useState('');
  const [captureCategory, setCaptureCategory] = useState('Communication');
  const [captureSaving, setCaptureSaving] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    thisMonth: 0,
    patterns: {} as { [key: string]: number },
  });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      
      // Check for active subscription
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('email', session.user.email?.toLowerCase())
        .in('status', ['active', 'trialing'])
        .single();
      
      if (!subscription) {
        router.push('/subscribe');
        return;
      }
      
      setUser(session.user);
      await loadAllDocumentation(session.user.id);
      setLoading(false);
    };
    init();
  }, [router]);

  const loadAllDocumentation = async (userId: string) => {
    // Load from incidents table
    const { data: incidentsData } = await supabase
      .from('incidents')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    // Load from evidence table
    const { data: evidenceData } = await supabase
      .from('evidence')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    // Combine and normalize both sources
    const allItems: Incident[] = [];
    
    // Add incidents
    if (incidentsData) {
      incidentsData.forEach(inc => {
        allItems.push({
          id: inc.id,
          date: inc.date || inc.created_at,
          description: inc.description,
          patterns: inc.patterns || [],
          severity: inc.severity || 'low',
          category: inc.category || 'Other',
          source: inc.source || 'incident',
          created_at: inc.created_at,
        });
      });
    }
    
    // Add evidence items (from coach saves)
    if (evidenceData) {
      evidenceData.forEach(ev => {
        allItems.push({
          id: ev.id,
          date: ev.created_at,
          description: ev.original_message || ev.content?.slice(0, 300) || 'Saved from coach',
          patterns: ev.patterns || [],
          severity: ev.patterns?.length > 2 ? 'high' : ev.patterns?.length > 0 ? 'medium' : 'low',
          category: 'Coach Analysis',
          source: 'coach',
          created_at: ev.created_at,
        });
      });
    }
    
    // Sort by date descending
    allItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setIncidents(allItems);
    
    // Calculate stats
    const now = new Date();
    const thisMonth = allItems.filter(d => {
      const date = new Date(d.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    
    const patterns: { [key: string]: number } = {};
    allItems.forEach(inc => {
      if (inc.patterns && Array.isArray(inc.patterns)) {
        inc.patterns.forEach((p: string) => {
          patterns[p] = (patterns[p] || 0) + 1;
        });
      }
    });
    
    setStats({
      total: allItems.length,
      critical: allItems.filter(d => d.severity === 'critical').length,
      high: allItems.filter(d => d.severity === 'high' || d.severity === 'critical').length,
      thisMonth: thisMonth.length,
      patterns,
    });
  };

  const quickCapture = async () => {
    if (!captureText.trim() || !user) return;
    setCaptureSaving(true);

    try {
      // Send to AI for analysis
      const response = await fetch('/api/analyze-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: captureText, category: captureCategory }),
      });

      let patterns: string[] = [];
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

      if (response.ok) {
        const analysis = await response.json();
        patterns = analysis.patterns || [];
        severity = analysis.severity || 'low';
      }

      // Save to database
      const { error } = await supabase.from('incidents').insert({
        user_id: user.id,
        date: new Date().toISOString(),
        description: captureText,
        patterns,
        severity,
        category: captureCategory,
        source: 'quick_capture',
      });

      if (!error) {
        setCaptureText('');
        setShowQuickCapture(false);
        await loadAllDocumentation(user.id);
      }
    } catch (err) {
      console.error('Capture error:', err);
    } finally {
      setCaptureSaving(false);
    }
  };

  const filteredIncidents = incidents.filter(inc => {
    // Filter by severity
    if (filter === 'critical' && inc.severity !== 'critical') return false;
    if (filter === 'high' && inc.severity !== 'high' && inc.severity !== 'critical') return false;
    
    // Filter by pattern
    if (patternFilter && (!inc.patterns || !inc.patterns.includes(patternFilter))) return false;
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesDesc = inc.description?.toLowerCase().includes(query);
      const matchesPattern = inc.patterns?.some(p => p.toLowerCase().includes(query));
      const matchesCategory = inc.category?.toLowerCase().includes(query);
      if (!matchesDesc && !matchesPattern && !matchesCategory) return false;
    }
    
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#f97316';
      case 'medium': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const groupByMonth = (incidents: Incident[]) => {
    const groups: { [key: string]: Incident[] } = {};
    incidents.forEach(inc => {
      const date = new Date(inc.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      if (!groups[label]) groups[label] = [];
      groups[label].push(inc);
    });
    return groups;
  };

  if (loading) {
    return (
      <div className="loading">
        <span>📁</span>
        <p>Loading your evidence...</p>
        <style jsx>{`
          .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #f5f7f6;
          }
          .loading span { font-size: 48px; margin-bottom: 16px; }
          .loading p { color: #666; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <button onClick={() => router.push('/coach')} className="back-btn">←</button>
          <h1>My Evidence</h1>
        </div>
        <div className="header-actions">
          <button className="generate-btn" onClick={() => router.push('/court-docs')}>
            Create Document
          </button>
          <button className="capture-btn" onClick={() => setShowQuickCapture(true)}>
            + Capture
          </button>
        </div>
      </header>

      <div className="content">
        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-pill">
            <span className="stat-num">{stats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-pill critical">
            <span className="stat-num">{stats.critical}</span>
            <span className="stat-label">Critical</span>
          </div>
          <div className="stat-pill high">
            <span className="stat-num">{stats.high}</span>
            <span className="stat-label">High+</span>
          </div>
          <div className="stat-pill">
            <span className="stat-num">{stats.thisMonth}</span>
            <span className="stat-label">This Month</span>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => { setFilter('all'); setPatternFilter(null); }}
            >
              All
            </button>
            <button 
              className={`filter-tab ${filter === 'critical' ? 'active' : ''}`}
              onClick={() => { setFilter('critical'); setPatternFilter(null); }}
            >
              Critical
            </button>
            <button 
              className={`filter-tab ${filter === 'high' ? 'active' : ''}`}
              onClick={() => { setFilter('high'); setPatternFilter(null); }}
            >
              High+
            </button>
            <button 
              className={`filter-tab ${filter === 'patterns' ? 'active' : ''}`}
              onClick={() => setFilter('patterns')}
            >
              By Pattern
            </button>
          </div>

          <div className="filter-right">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <div className="view-toggle">
              <button 
                className={viewMode === 'cards' ? 'active' : ''}
                onClick={() => setViewMode('cards')}
              >
                ▦
              </button>
              <button 
                className={viewMode === 'timeline' ? 'active' : ''}
                onClick={() => setViewMode('timeline')}
              >
                ≡
              </button>
            </div>
          </div>
        </div>

        {/* Pattern Pills (when filter === 'patterns') */}
        {filter === 'patterns' && Object.keys(stats.patterns).length > 0 && (
          <div className="pattern-pills">
            {Object.entries(stats.patterns)
              .sort((a, b) => b[1] - a[1])
              .map(([pattern, count]) => (
                <button
                  key={pattern}
                  className={`pattern-pill ${patternFilter === pattern ? 'active' : ''}`}
                  onClick={() => setPatternFilter(patternFilter === pattern ? null : pattern)}
                  style={{ 
                    borderColor: PATTERN_COLORS[pattern] || '#666',
                    background: patternFilter === pattern ? PATTERN_COLORS[pattern] || '#666' : 'white',
                    color: patternFilter === pattern ? 'white' : PATTERN_COLORS[pattern] || '#666',
                  }}
                >
                  {pattern} ({count})
                </button>
              ))}
          </div>
        )}

        {/* Content */}
        {filteredIncidents.length === 0 ? (
          <div className="empty-state">
            <span>📭</span>
            <h3>No incidents found</h3>
            <p>Start documenting to build your case</p>
            <button onClick={() => setShowQuickCapture(true)}>+ Quick Capture</button>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="incidents-grid">
            {filteredIncidents.map(incident => (
              <div key={incident.id} className="incident-card">
                <div className="card-header">
                  <span className="card-date">{formatDate(incident.date)}</span>
                  <span 
                    className="card-severity"
                    style={{ background: getSeverityColor(incident.severity) }}
                  >
                    {incident.severity}
                  </span>
                </div>
                
                <div className="card-category">{incident.category}</div>
                
                <p className="card-description">
                  {incident.description?.slice(0, 200)}
                  {incident.description?.length > 200 ? '...' : ''}
                </p>
                
                {incident.patterns && incident.patterns.length > 0 && (
                  <div className="card-patterns">
                    {incident.patterns.map(p => (
                      <span 
                        key={p} 
                        className="pattern-tag"
                        style={{ background: `${PATTERN_COLORS[p]}20`, color: PATTERN_COLORS[p] || '#666' }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
                
                <div className="card-source">
                  {incident.source === 'quick_capture' && '✏️ Quick capture'}
                  {incident.source === 'bulk_import' && '📱 Imported'}
                  {incident.source === 'coach' && '💬 From coach'}
                  {!incident.source && '📝 Manual entry'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="timeline-view">
            {Object.entries(groupByMonth(filteredIncidents)).map(([month, incs]) => (
              <div key={month} className="timeline-month">
                <h3 className="month-header">{month}</h3>
                <div className="timeline-items">
                  {incs.map(incident => (
                    <div key={incident.id} className="timeline-item">
                      <div className="timeline-dot" style={{ background: getSeverityColor(incident.severity) }} />
                      <div className="timeline-content">
                        <div className="timeline-date">{formatDate(incident.date)}</div>
                        <div className="timeline-category">{incident.category}</div>
                        <p className="timeline-desc">
                          {incident.description?.slice(0, 150)}
                          {incident.description?.length > 150 ? '...' : ''}
                        </p>
                        {incident.patterns && incident.patterns.length > 0 && (
                          <div className="timeline-patterns">
                            {incident.patterns.map(p => (
                              <span key={p} className="pattern-mini">{p}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Court Prep CTA */}
        {stats.total > 0 && (
          <div className="court-prep-cta">
            <div className="cta-content">
              <span className="cta-icon">⚖️</span>
              <div>
                <h4>Ready for Court?</h4>
                <p>Export your evidence as a court-ready exhibit package</p>
              </div>
            </div>
            <button className="cta-btn">Coming Soon</button>
          </div>
        )}
      </div>

      {/* Quick Capture Modal */}
      {showQuickCapture && (
        <div className="modal-overlay" onClick={() => setShowQuickCapture(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📝 Quick Capture</h2>
              <button className="modal-close" onClick={() => setShowQuickCapture(false)}>×</button>
            </div>
            
            <div className="modal-content">
              <p className="capture-hint">
                Document what just happened. AI will analyze for patterns automatically.
              </p>
              
              <div className="capture-category">
                <label>Category</label>
                <select value={captureCategory} onChange={(e) => setCaptureCategory(e.target.value)}>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <textarea
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                placeholder="What happened? Include exact words if possible..."
                rows={6}
                autoFocus
              />
              
              <div className="capture-tips">
                <strong>💡 Tips for strong documentation:</strong>
                <ul>
                  <li>Include exact quotes when possible</li>
                  <li>Note date, time, and who was present</li>
                  <li>Describe behavior, not interpretations</li>
                  <li>Screenshot texts/emails as backup</li>
                </ul>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="save-capture-btn"
                onClick={quickCapture}
                disabled={!captureText.trim() || captureSaving}
              >
                {captureSaving ? 'Analyzing & Saving...' : '📌 Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <button className="nav-item" onClick={() => router.push('/dashboard')}>
          <span>🏠</span>
          <span>Home</span>
        </button>
        <button className="nav-item" onClick={() => router.push('/coach')}>
          <span>💬</span>
          <span>Coach</span>
        </button>
        <button className="nav-item active">
          <span>📁</span>
          <span>Docs</span>
        </button>
        <button className="nav-item" onClick={() => router.push('/healing')}>
          <span>🌿</span>
          <span>Heal</span>
        </button>
        <button className="nav-item" onClick={() => router.push('/case-setup')}>
          <span>⚙️</span>
          <span>Settings</span>
        </button>
      </nav>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #f5f7f6;
          padding-bottom: 80px;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #1a3a2f;
          color: white;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .back-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.8);
          font-size: 18px;
          cursor: pointer;
          padding: 4px 8px;
        }
        .header h1 {
          font-size: 18px;
          font-weight: 600;
        }
        .header-actions {
          display: flex;
          gap: 10px;
        }
        .generate-btn {
          background: white;
          color: #1a3a2f;
          border: none;
          padding: 10px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .capture-btn {
          background: #14b8a6;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .content {
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
        }

        /* Stats Row */
        .stats-row {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          overflow-x: auto;
          padding-bottom: 4px;
        }
        .stat-pill {
          background: white;
          border-radius: 20px;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }
        .stat-pill.critical {
          background: #fef2f2;
        }
        .stat-pill.high {
          background: #fff7ed;
        }
        .stat-num {
          font-size: 18px;
          font-weight: 700;
          color: #1a3a2f;
        }
        .stat-pill.critical .stat-num { color: #dc2626; }
        .stat-pill.high .stat-num { color: #f97316; }
        .stat-label {
          font-size: 13px;
          color: #666;
        }

        /* Filters */
        .filters-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .filter-tabs {
          display: flex;
          gap: 8px;
        }
        .filter-tab {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid #ddd;
          background: white;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-tab.active {
          background: #1a3a2f;
          color: white;
          border-color: #1a3a2f;
        }
        .filter-right {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .search-input {
          padding: 8px 14px;
          border-radius: 20px;
          border: 1px solid #ddd;
          font-size: 14px;
          width: 180px;
        }
        .view-toggle {
          display: flex;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #ddd;
        }
        .view-toggle button {
          padding: 8px 12px;
          border: none;
          background: white;
          cursor: pointer;
          font-size: 16px;
        }
        .view-toggle button.active {
          background: #1a3a2f;
          color: white;
        }

        /* Pattern Pills */
        .pattern-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .pattern-pill {
          padding: 6px 14px;
          border-radius: 16px;
          border: 2px solid;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 16px;
        }
        .empty-state span {
          font-size: 56px;
          display: block;
          margin-bottom: 16px;
        }
        .empty-state h3 {
          color: #1a3a2f;
          margin-bottom: 8px;
        }
        .empty-state p {
          color: #666;
          margin-bottom: 20px;
        }
        .empty-state button {
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 15px;
          cursor: pointer;
        }

        /* Incidents Grid */
        .incidents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .incident-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          transition: transform 0.2s;
        }
        .incident-card:hover {
          transform: translateY(-2px);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .card-date {
          font-size: 12px;
          color: #666;
        }
        .card-severity {
          font-size: 10px;
          font-weight: 600;
          color: white;
          padding: 3px 8px;
          border-radius: 10px;
          text-transform: uppercase;
        }
        .card-category {
          font-size: 14px;
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 8px;
        }
        .card-description {
          font-size: 13px;
          color: #555;
          line-height: 1.5;
          margin-bottom: 12px;
        }
        .card-patterns {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }
        .pattern-tag {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }
        .card-source {
          font-size: 11px;
          color: #999;
        }

        /* Timeline View */
        .timeline-view {
          
        }
        .timeline-month {
          margin-bottom: 32px;
        }
        .month-header {
          font-size: 16px;
          color: #1a3a2f;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        .timeline-items {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .timeline-item {
          display: flex;
          gap: 16px;
        }
        .timeline-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-top: 4px;
          flex-shrink: 0;
        }
        .timeline-content {
          flex: 1;
          background: white;
          border-radius: 12px;
          padding: 16px;
        }
        .timeline-date {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }
        .timeline-category {
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 8px;
        }
        .timeline-desc {
          font-size: 13px;
          color: #555;
          line-height: 1.5;
          margin-bottom: 8px;
        }
        .timeline-patterns {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .pattern-mini {
          font-size: 11px;
          color: #666;
          background: #f3f4f6;
          padding: 3px 8px;
          border-radius: 8px;
        }

        /* Court Prep CTA */
        .court-prep-cta {
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a47 100%);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 24px;
          color: white;
        }
        .cta-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .cta-icon {
          font-size: 32px;
        }
        .cta-content h4 {
          font-size: 16px;
          margin-bottom: 4px;
        }
        .cta-content p {
          font-size: 13px;
          opacity: 0.8;
        }
        .cta-btn {
          background: rgba(255,255,255,0.2);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        .modal {
          background: white;
          border-radius: 20px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #eee;
        }
        .modal-header h2 {
          font-size: 18px;
          color: #1a3a2f;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 28px;
          color: #999;
          cursor: pointer;
        }
        .modal-content {
          padding: 20px;
        }
        .capture-hint {
          color: #666;
          font-size: 14px;
          margin-bottom: 16px;
        }
        .capture-category {
          margin-bottom: 16px;
        }
        .capture-category label {
          display: block;
          font-size: 13px;
          color: #666;
          margin-bottom: 6px;
        }
        .capture-category select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #ddd;
          font-size: 15px;
        }
        .modal-content textarea {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: 1px solid #ddd;
          font-size: 15px;
          font-family: inherit;
          resize: vertical;
          margin-bottom: 16px;
        }
        .capture-tips {
          background: #f0fdf4;
          border-radius: 12px;
          padding: 14px;
          font-size: 13px;
        }
        .capture-tips strong {
          display: block;
          margin-bottom: 8px;
          color: #065f46;
        }
        .capture-tips ul {
          margin: 0;
          padding-left: 18px;
          color: #047857;
        }
        .capture-tips li {
          margin-bottom: 4px;
        }
        .modal-footer {
          padding: 20px;
          border-top: 1px solid #eee;
        }
        .save-capture-btn {
          width: 100%;
          padding: 14px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .save-capture-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Bottom Nav */
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          display: flex;
          justify-content: space-around;
          padding: 10px 0 20px;
          border-top: 1px solid #eee;
        }
        .nav-item {
          background: none;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: #666;
          font-size: 11px;
          cursor: pointer;
          padding: 8px 16px;
        }
        .nav-item span:first-child {
          font-size: 20px;
        }
        .nav-item.active {
          color: #1a3a2f;
        }

        @media (max-width: 640px) {
          .filters-section {
            flex-direction: column;
            align-items: stretch;
          }
          .filter-tabs {
            overflow-x: auto;
            padding-bottom: 4px;
          }
          .filter-right {
            justify-content: space-between;
          }
          .search-input {
            flex: 1;
          }
          .incidents-grid {
            grid-template-columns: 1fr;
          }
          .court-prep-cta {
            flex-direction: column;
            text-align: center;
            gap: 16px;
          }
          .cta-content {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}