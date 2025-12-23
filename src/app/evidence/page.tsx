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
  // New fields from evidence_timeline
  screenshot_urls?: string[];
  coaching_summary?: string;
  needs_review?: boolean;
  reviewed?: boolean;
  include_in_exhibit?: boolean;
  user_notes?: string;
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
  'intimidation': '#dc2626',
  'false accusation': '#f97316',
  'selective enforcement': '#8b5cf6',
  'authority threat': '#ef4444',
  'guilt trip': '#f59e0b',
  'gaslighting': '#ef4444',
  'baiting': '#eab308',
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
  
  // Filters - added 'needs_review' and 'in_exhibit'
  const [filter, setFilter] = useState<'all' | 'needs_review' | 'critical' | 'high' | 'patterns' | 'in_exhibit'>('all');
  const [patternFilter, setPatternFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'timeline'>('cards');
  
  // Quick capture
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [captureText, setCaptureText] = useState('');
  const [captureCategory, setCaptureCategory] = useState('Communication');
  const [captureSaving, setCaptureSaving] = useState(false);
  
  // Detail modal
  const [selectedItem, setSelectedItem] = useState<Incident | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    thisMonth: 0,
    needsReview: 0,
    inExhibit: 0,
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
    
    // Load from evidence table (old)
    const { data: evidenceData } = await supabase
      .from('evidence')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    // Load from evidence_timeline table (NEW - auto-saved from coach)
    const { data: timelineData } = await supabase
      .from('evidence_timeline')
      .select('*')
      .eq('user_id', userId)
      .order('incident_date', { ascending: false });
    
    // Combine and normalize all sources
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
    
    // Add old evidence items
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
    
    // Add NEW evidence_timeline items (auto-saved)
    if (timelineData) {
      timelineData.forEach(item => {
        allItems.push({
          id: item.id,
          date: item.incident_date || item.created_at,
          description: item.coaching_summary?.slice(0, 300) || item.user_messages?.slice(0, 300) || 'Auto-saved from coach',
          patterns: item.patterns_detected || [],
          severity: item.patterns_detected?.length > 2 ? 'high' : item.patterns_detected?.length > 0 ? 'medium' : 'low',
          category: 'Coach Session',
          source: 'auto_save',
          created_at: item.created_at,
          // New fields
          screenshot_urls: item.screenshot_urls,
          coaching_summary: item.coaching_summary,
          needs_review: item.needs_review,
          reviewed: item.reviewed,
          include_in_exhibit: item.include_in_exhibit,
          user_notes: item.user_notes,
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
      needsReview: allItems.filter(d => d.needs_review && !d.reviewed).length,
      inExhibit: allItems.filter(d => d.include_in_exhibit).length,
      patterns,
    });
  };

  const quickCapture = async () => {
    if (!captureText.trim() || !user) return;
    setCaptureSaving(true);

    try {
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

  // Mark item as reviewed
  const markReviewed = async (id: string) => {
    await supabase
      .from('evidence_timeline')
      .update({ 
        reviewed: true, 
        needs_review: false,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);
    
    if (user) await loadAllDocumentation(user.id);
    setSelectedItem(null);
  };

  // Toggle include in exhibit
  const toggleExhibit = async (id: string, currentValue: boolean) => {
    await supabase
      .from('evidence_timeline')
      .update({ include_in_exhibit: !currentValue })
      .eq('id', id);
    
    if (user) await loadAllDocumentation(user.id);
  };

  // Save user notes
  const saveNotes = async (id: string) => {
    await supabase
      .from('evidence_timeline')
      .update({ user_notes: editingNotes })
      .eq('id', id);
    
    if (user) await loadAllDocumentation(user.id);
  };

  const filteredIncidents = incidents.filter(inc => {
    // Filter by needs_review (NEW)
    if (filter === 'needs_review' && (!inc.needs_review || inc.reviewed)) return false;
    
    // Filter by in_exhibit (NEW)
    if (filter === 'in_exhibit' && !inc.include_in_exhibit) return false;
    
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
          {stats.needsReview > 0 && (
            <span className="review-badge">{stats.needsReview} to review</span>
          )}
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
          {stats.needsReview > 0 && (
            <div className="stat-pill needs-review" onClick={() => setFilter('needs_review')}>
              <span className="stat-num">{stats.needsReview}</span>
              <span className="stat-label">To Review</span>
            </div>
          )}
          <div className="stat-pill critical">
            <span className="stat-num">{stats.critical}</span>
            <span className="stat-label">Critical</span>
          </div>
          <div className="stat-pill high">
            <span className="stat-num">{stats.high}</span>
            <span className="stat-label">High+</span>
          </div>
          {stats.inExhibit > 0 && (
            <div className="stat-pill exhibit" onClick={() => setFilter('in_exhibit')}>
              <span className="stat-num">{stats.inExhibit}</span>
              <span className="stat-label">In Exhibit</span>
            </div>
          )}
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
            {stats.needsReview > 0 && (
              <button 
                className={`filter-tab needs-review-tab ${filter === 'needs_review' ? 'active' : ''}`}
                onClick={() => { setFilter('needs_review'); setPatternFilter(null); }}
              >
                📌 Needs Review
                <span className="tab-badge">{stats.needsReview}</span>
              </button>
            )}
            <button 
              className={`filter-tab ${filter === 'in_exhibit' ? 'active' : ''}`}
              onClick={() => { setFilter('in_exhibit'); setPatternFilter(null); }}
            >
              ⚖️ In Exhibit
            </button>
            <button 
              className={`filter-tab ${filter === 'critical' ? 'active' : ''}`}
              onClick={() => { setFilter('critical'); setPatternFilter(null); }}
            >
              Critical
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

        {/* Pattern Pills */}
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
            <span>{filter === 'needs_review' ? '✓' : '📭'}</span>
            <h3>{filter === 'needs_review' ? 'All caught up!' : 'No incidents found'}</h3>
            <p>{filter === 'needs_review' ? 'Nothing to review right now.' : 'Start documenting to build your case'}</p>
            {filter !== 'needs_review' && (
              <button onClick={() => setShowQuickCapture(true)}>+ Quick Capture</button>
            )}
          </div>
        ) : viewMode === 'cards' ? (
          <div className="incidents-grid">
            {filteredIncidents.map(incident => (
              <div 
                key={incident.id} 
                className={`incident-card ${incident.needs_review && !incident.reviewed ? 'needs-review' : ''}`}
                onClick={() => {
                  setSelectedItem(incident);
                  setEditingNotes(incident.user_notes || '');
                }}
              >
                {/* Screenshot thumbnail if available */}
                {incident.screenshot_urls && incident.screenshot_urls.length > 0 && (
                  <div className="card-thumbnail">
                    <img src={incident.screenshot_urls[0]} alt="Screenshot" />
                    {incident.screenshot_urls.length > 1 && (
                      <span className="more-images">+{incident.screenshot_urls.length - 1}</span>
                    )}
                  </div>
                )}
                
                <div className="card-body">
                  <div className="card-header">
                    <span className="card-date">{formatDate(incident.date)}</span>
                    <div className="card-badges">
                      {incident.needs_review && !incident.reviewed && (
                        <span className="badge review-badge-small">Review</span>
                      )}
                      {incident.include_in_exhibit && (
                        <span className="badge exhibit-badge-small">Exhibit</span>
                      )}
                      <span 
                        className="card-severity"
                        style={{ background: getSeverityColor(incident.severity) }}
                      >
                        {incident.severity}
                      </span>
                    </div>
                  </div>
                  
                  <div className="card-category">{incident.category}</div>
                  
                  <p className="card-description">
                    {incident.description?.slice(0, 200)}
                    {incident.description?.length > 200 ? '...' : ''}
                  </p>
                  
                  {incident.patterns && incident.patterns.length > 0 && (
                    <div className="card-patterns">
                      {incident.patterns.slice(0, 3).map(p => (
                        <span 
                          key={p} 
                          className="pattern-tag"
                          style={{ background: `${PATTERN_COLORS[p] || '#666'}20`, color: PATTERN_COLORS[p] || '#666' }}
                        >
                          {p}
                        </span>
                      ))}
                      {incident.patterns.length > 3 && (
                        <span className="pattern-more">+{incident.patterns.length - 3}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="card-source">
                    {incident.source === 'quick_capture' && '✏️ Quick capture'}
                    {incident.source === 'bulk_import' && '📱 Imported'}
                    {incident.source === 'coach' && '💬 From coach'}
                    {incident.source === 'auto_save' && '🤖 Auto-saved'}
                    {!incident.source && '📝 Manual entry'}
                  </div>
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
                    <div 
                      key={incident.id} 
                      className="timeline-item"
                      onClick={() => {
                        setSelectedItem(incident);
                        setEditingNotes(incident.user_notes || '');
                      }}
                    >
                      <div className="timeline-dot" style={{ background: getSeverityColor(incident.severity) }} />
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="timeline-date">{formatDate(incident.date)}</span>
                          {incident.needs_review && !incident.reviewed && (
                            <span className="badge review-badge-small">Review</span>
                          )}
                        </div>
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
                <p>
                  {stats.inExhibit > 0 
                    ? `${stats.inExhibit} items ready for exhibit`
                    : 'Mark items "In Exhibit" to build your court package'
                  }
                </p>
              </div>
            </div>
            <button className="cta-btn" onClick={() => router.push('/court-docs')}>
              {stats.inExhibit > 0 ? 'Generate Exhibit' : 'Coming Soon'}
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{formatDate(selectedItem.date)}</h2>
              <button className="modal-close" onClick={() => setSelectedItem(null)}>×</button>
            </div>
            
            <div className="modal-content">
              {/* Screenshots */}
              {selectedItem.screenshot_urls && selectedItem.screenshot_urls.length > 0 && (
                <div className="detail-screenshots">
                  {selectedItem.screenshot_urls.map((url, i) => (
                    <img 
                      key={i} 
                      src={url} 
                      alt={`Screenshot ${i + 1}`}
                      onClick={() => window.open(url, '_blank')}
                    />
                  ))}
                </div>
              )}
              
              {/* Patterns */}
              {selectedItem.patterns && selectedItem.patterns.length > 0 && (
                <div className="detail-patterns">
                  <label>Patterns Identified</label>
                  <div className="patterns-list">
                    {selectedItem.patterns.map(p => (
                      <span 
                        key={p} 
                        className="pattern-tag"
                        style={{ background: `${PATTERN_COLORS[p] || '#666'}20`, color: PATTERN_COLORS[p] || '#666' }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Coaching Summary */}
              {selectedItem.coaching_summary && (
                <div className="detail-section">
                  <label>Coach Analysis</label>
                  <div className="coaching-summary">{selectedItem.coaching_summary}</div>
                </div>
              )}
              
              {/* Description */}
              <div className="detail-section">
                <label>Description</label>
                <p>{selectedItem.description}</p>
              </div>
              
              {/* Notes */}
              {selectedItem.source === 'auto_save' && (
                <div className="detail-section">
                  <label>Your Notes (for attorney)</label>
                  <textarea
                    value={editingNotes}
                    onChange={(e) => setEditingNotes(e.target.value)}
                    placeholder="Add context, what happened before/after, how it made you feel..."
                  />
                  <button 
                    className="save-notes-btn"
                    onClick={() => saveNotes(selectedItem.id)}
                  >
                    Save Notes
                  </button>
                </div>
              )}
            </div>
            
            {/* Actions */}
            {selectedItem.source === 'auto_save' && (
              <div className="modal-footer detail-actions">
                <button 
                  className={`exhibit-btn ${selectedItem.include_in_exhibit ? 'active' : ''}`}
                  onClick={() => toggleExhibit(selectedItem.id, selectedItem.include_in_exhibit || false)}
                >
                  {selectedItem.include_in_exhibit ? '✓ In Exhibit' : '+ Add to Exhibit'}
                </button>
                
                {selectedItem.needs_review && !selectedItem.reviewed && (
                  <button 
                    className="reviewed-btn"
                    onClick={() => markReviewed(selectedItem.id)}
                  >
                    ✓ Mark Reviewed
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

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
          {stats.needsReview > 0 && <span className="nav-badge">{stats.needsReview}</span>}
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
        .review-badge {
          background: #f59e0b;
          color: white;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
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
          cursor: pointer;
        }
        .stat-pill.needs-review {
          background: #fef3c7;
          border: 2px solid #f59e0b;
        }
        .stat-pill.needs-review .stat-num { color: #d97706; }
        .stat-pill.critical {
          background: #fef2f2;
        }
        .stat-pill.high {
          background: #fff7ed;
        }
        .stat-pill.exhibit {
          background: #d1fae5;
        }
        .stat-pill.exhibit .stat-num { color: #059669; }
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
          overflow-x: auto;
        }
        .filter-tab {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid #ddd;
          background: white;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        .filter-tab.active {
          background: #1a3a2f;
          color: white;
          border-color: #1a3a2f;
        }
        .filter-tab.needs-review-tab {
          border-color: #f59e0b;
        }
        .filter-tab.needs-review-tab.active {
          background: #f59e0b;
          border-color: #f59e0b;
        }
        .tab-badge {
          background: rgba(255,255,255,0.3);
          padding: 2px 6px;
          border-radius: 8px;
          font-size: 11px;
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
          overflow: hidden;
          transition: transform 0.2s;
          cursor: pointer;
        }
        .incident-card:hover {
          transform: translateY(-2px);
        }
        .incident-card.needs-review {
          border-left: 4px solid #f59e0b;
        }
        .card-thumbnail {
          position: relative;
          height: 120px;
          background: #f3f4f6;
        }
        .card-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .more-images {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }
        .card-body {
          padding: 14px;
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
          gap: 8px;
        }
        .card-date {
          font-size: 12px;
          color: #666;
        }
        .card-badges {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .badge {
          font-size: 9px;
          font-weight: 600;
          padding: 3px 6px;
          border-radius: 8px;
          text-transform: uppercase;
        }
        .review-badge-small {
          background: #fef3c7;
          color: #d97706;
        }
        .exhibit-badge-small {
          background: #d1fae5;
          color: #059669;
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
        .pattern-more {
          font-size: 11px;
          color: #999;
        }
        .card-source {
          font-size: 11px;
          color: #999;
        }

        /* Timeline View */
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
          cursor: pointer;
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
        .timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .timeline-date {
          font-size: 12px;
          color: #666;
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

        /* Detail Modal */
        .detail-modal {
          max-width: 600px;
        }
        .detail-screenshots {
          display: flex;
          gap: 8px;
          padding: 0 20px;
          overflow-x: auto;
          margin-bottom: 16px;
        }
        .detail-screenshots img {
          height: 200px;
          border-radius: 8px;
          cursor: pointer;
        }
        .detail-patterns {
          padding: 0 20px;
          margin-bottom: 16px;
        }
        .detail-patterns label {
          display: block;
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }
        .patterns-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .detail-section {
          padding: 0 20px;
          margin-bottom: 16px;
        }
        .detail-section label {
          display: block;
          font-size: 12px;
          color: #666;
          margin-bottom: 8px;
        }
        .coaching-summary {
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
          max-height: 200px;
          overflow-y: auto;
          background: #f9fafb;
          padding: 12px;
          border-radius: 8px;
        }
        .detail-section p {
          font-size: 14px;
          line-height: 1.6;
        }
        .detail-section textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
        }
        .save-notes-btn {
          margin-top: 8px;
          padding: 8px 16px;
          background: #f3f4f6;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        }
        .detail-actions {
          display: flex;
          gap: 10px;
          padding: 20px;
          border-top: 1px solid #eee;
        }
        .exhibit-btn {
          padding: 10px 20px;
          border-radius: 8px;
          border: 2px solid #1a3a2f;
          background: white;
          color: #1a3a2f;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .exhibit-btn.active {
          background: #1a3a2f;
          color: white;
        }
        .reviewed-btn {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          background: #22c55e;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        /* Modal Base */
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
          position: relative;
        }
        .nav-item span:first-child {
          font-size: 20px;
        }
        .nav-item.active {
          color: #1a3a2f;
        }
        .nav-badge {
          position: absolute;
          top: 2px;
          right: 8px;
          background: #f59e0b;
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 5px;
          border-radius: 8px;
          min-width: 16px;
          text-align: center;
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
          .header-actions {
            flex-direction: column;
            gap: 6px;
          }
          .generate-btn, .capture-btn {
            padding: 8px 12px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
}