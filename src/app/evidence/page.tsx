"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/layout/AppLayout";

interface Incident {
  id: string;
  title?: string;
  coparent_message: string | null;
  patterns: string[];
  severity: string;
  incident_date: string;
  created_at: string;
  source?: string;
  message_count?: number;
  evidence_strength?: string;
}

export default function EvidencePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [patternSummary, setPatternSummary] = useState<Record<string, number>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      try {
        const res = await fetch(`/api/incidents?userId=${session.user.id}`);
        const data = await res.json();
        if (data.incidents) {
          setIncidents(data.incidents);
          setPatternSummary(data.patternSummary || {});
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [router]);

  const filteredIncidents = incidents.filter(inc => {
    if (filter === 'critical' && inc.severity !== 'critical') return false;
    if (filter === 'high' && inc.severity !== 'high' && inc.severity !== 'critical') return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesTitle = inc.title?.toLowerCase().includes(term);
      const matchesMessage = inc.coparent_message?.toLowerCase().includes(term);
      const matchesPattern = inc.patterns?.some(p => p.toLowerCase().includes(term));
      if (!matchesTitle && !matchesMessage && !matchesPattern) return false;
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredIncidents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredIncidents.map(i => i.id)));
    }
  };

  const handleCreateExhibit = () => {
    const ids = Array.from(selectedIds).join(',');
    router.push(`/court-docs/exhibit?incidents=${ids}`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'50vh'}}>
          Loading...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="evidence-page">
        <div className="page-header">
          <div className="header-left">
            <h1>📁 Evidence Library</h1>
            <p>{incidents.length} documented incidents</p>
          </div>
          <div className="header-actions">
            <button 
              className={`select-btn ${selectMode ? 'active' : ''}`}
              onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
            >
              {selectMode ? '✕ Cancel' : '☑ Select'}
            </button>
            <button className="import-btn" onClick={() => router.push("/evidence/upload")}>
              📤 Import
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-bar">
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({incidents.length})
            </button>
            <button 
              className={`filter-btn critical ${filter === 'critical' ? 'active' : ''}`}
              onClick={() => setFilter('critical')}
            >
              Critical ({incidents.filter(i => i.severity === 'critical').length})
            </button>
            <button 
              className={`filter-btn high ${filter === 'high' ? 'active' : ''}`}
              onClick={() => setFilter('high')}
            >
              High+ ({incidents.filter(i => i.severity === 'high' || i.severity === 'critical').length})
            </button>
          </div>
          <input
            type="text"
            placeholder="Search incidents..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Select mode bar */}
        {selectMode && (
          <div className="select-bar">
            <button className="select-all-btn" onClick={selectAll}>
              {selectedIds.size === filteredIncidents.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="selected-count">{selectedIds.size} selected</span>
            {selectedIds.size > 0 && (
              <button className="create-exhibit-btn" onClick={handleCreateExhibit}>
                📎 Create Exhibit
              </button>
            )}
          </div>
        )}

        {/* Incidents list */}
        <div className="incidents-list">
          {filteredIncidents.length === 0 ? (
            <div className="empty-state">
              <p>No incidents found</p>
              {incidents.length === 0 && (
                <button onClick={() => router.push("/evidence/upload")}>Import Messages</button>
              )}
            </div>
          ) : (
            filteredIncidents.map((inc) => (
              <div 
                key={inc.id} 
                className={`incident-card ${selectedIds.has(inc.id) ? 'selected' : ''} ${selectMode ? 'selectable' : ''}`}
                onClick={selectMode ? () => toggleSelect(inc.id) : undefined}
              >
                {selectMode && (
                  <div className="checkbox">
                    {selectedIds.has(inc.id) ? '☑' : '☐'}
                  </div>
                )}
                <div className="incident-content">
                  <div className="incident-top">
                    <span className="date">
                      {new Date(inc.incident_date || inc.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                    {inc.severity === 'critical' && <span className="badge critical">Critical</span>}
                    {inc.severity === 'high' && <span className="badge high">High</span>}
                    {inc.source === 'bulk_import' && <span className="badge source">Imported</span>}
                  </div>
                  {inc.title && <div className="title">{inc.title}</div>}
                  <div className="patterns">
                    {inc.patterns?.slice(0, 5).map((p, i) => (
                      <span key={i} className="pattern">{p}</span>
                    ))}
                    {inc.patterns?.length > 5 && (
                      <span className="more">+{inc.patterns.length - 5}</span>
                    )}
                  </div>
                  {inc.coparent_message && (
                    <div className="preview">
                      "{inc.coparent_message.slice(0, 150)}{inc.coparent_message.length > 150 ? '...' : ''}"
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .evidence-page {
          max-width: 900px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        .header-left h1 {
          margin: 0 0 4px;
          font-size: 28px;
          color: #1a3a2f;
        }
        .header-left p {
          margin: 0;
          color: #666;
        }
        .header-actions {
          display: flex;
          gap: 12px;
        }
        .select-btn, .import-btn {
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
        }
        .select-btn {
          background: white;
          border: 1px solid #ddd;
          color: #666;
        }
        .select-btn.active {
          background: #fee;
          border-color: #fcc;
          color: #c00;
        }
        .import-btn {
          background: #2dd4a8;
          border: none;
          color: #1a3a2f;
          font-weight: 600;
        }

        .filters-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .filter-buttons {
          display: flex;
          gap: 8px;
        }
        .filter-btn {
          padding: 8px 16px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 20px;
          font-size: 13px;
          cursor: pointer;
        }
        .filter-btn.active {
          background: #1a3a2f;
          border-color: #1a3a2f;
          color: white;
        }
        .filter-btn.critical.active {
          background: #dc2626;
          border-color: #dc2626;
        }
        .filter-btn.high.active {
          background: #ea580c;
          border-color: #ea580c;
        }
        .search-input {
          padding: 10px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          width: 200px;
          font-size: 14px;
        }

        .select-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px 16px;
          background: #f0f9f6;
          border-radius: 10px;
          margin-bottom: 16px;
        }
        .select-all-btn {
          background: none;
          border: 1px solid #2dd4a8;
          color: #1a3a2f;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }
        .selected-count {
          font-size: 13px;
          color: #666;
        }
        .create-exhibit-btn {
          margin-left: auto;
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .incidents-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 12px;
          color: #666;
        }
        .empty-state button {
          margin-top: 16px;
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
        }

        .incident-card {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: white;
          border: 1px solid #eee;
          border-radius: 12px;
          transition: all 0.2s;
        }
        .incident-card.selectable {
          cursor: pointer;
        }
        .incident-card.selectable:hover {
          border-color: #2dd4a8;
        }
        .incident-card.selected {
          background: #f0f9f6;
          border-color: #2dd4a8;
        }

        .checkbox {
          font-size: 22px;
          color: #2dd4a8;
          width: 28px;
          flex-shrink: 0;
        }

        .incident-content {
          flex: 1;
          min-width: 0;
        }
        .incident-top {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .date {
          font-size: 12px;
          color: #999;
        }
        .badge {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 500;
        }
        .badge.critical {
          background: #fee;
          color: #c00;
        }
        .badge.high {
          background: #fff3e0;
          color: #e65100;
        }
        .badge.source {
          background: #e8f5e9;
          color: #2e7d32;
        }
        .title {
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 6px;
        }
        .patterns {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 8px;
        }
        .pattern {
          background: #1a3a2f;
          color: white;
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 11px;
        }
        .more {
          font-size: 11px;
          color: #999;
        }
        .preview {
          font-size: 13px;
          color: #666;
          font-style: italic;
          line-height: 1.4;
        }
      `}</style>
    </AppLayout>
  );
}