'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface CaseFile {
  id: string;
  file_name: string;
  file_type: 'message' | 'finance' | 'court_doc' | 'other';
  file_path: string;
  message_sender: string;
  message_date: string;
  quote_text: string;
  is_flagged: boolean;
  flag_reason: string;
  date_of_content: string;
  event_cluster: string;
  include_in_exhibit: boolean;
  exhibit_label: string;
  created_at: string;
}

interface EventCluster {
  name: string;
  label: string;
  dateRange: string;
  files: CaseFile[];
  flaggedCount: number;
}

const HOLIDAYS = [
  { name: 'christmas', label: '🎄 Christmas', month: 12, days: [23, 24, 25, 26, 27] },
  { name: 'thanksgiving', label: '🦃 Thanksgiving', month: 11, days: [20, 21, 22, 23, 24, 25, 26, 27, 28, 29] },
  { name: 'easter', label: '🐣 Easter', month: 4, days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] },
  { name: 'july4', label: '🎆 July 4th', month: 7, days: [2, 3, 4, 5, 6] },
  { name: 'newyear', label: '🎉 New Year', month: 1, days: [1, 2, 3] },
];

export default function CaseFilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<CaseFile[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<'all' | 'flagged' | 'message' | 'finance' | 'court_doc'>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
  const [selectedForExhibit, setSelectedForExhibit] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/login');
      return;
    }

    const { data, error } = await supabase
      .from('case_files')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date_of_content', { ascending: false });

    if (data) {
      setFiles(data);
      // Initialize selected from existing exhibit selections
      const exhibitIds = new Set(data.filter(f => f.include_in_exhibit).map(f => f.id));
      setSelectedForExhibit(exhibitIds);
    }
    setLoading(false);
  };

  // Group files into event clusters
  const getEventClusters = (): EventCluster[] => {
    const clusters: Map<string, CaseFile[]> = new Map();
    
    files.forEach(file => {
      if (!file.date_of_content && !file.message_date) return;
      
      const date = new Date(file.date_of_content || file.message_date);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      
      // Check if falls within a holiday
      let clusterKey = `${year}-${month.toString().padStart(2, '0')}`; // Default: by month
      let clusterLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      for (const holiday of HOLIDAYS) {
        if (month === holiday.month && holiday.days.includes(day)) {
          clusterKey = `${holiday.name}_${year}`;
          clusterLabel = `${holiday.label} ${year}`;
          break;
        }
      }
      
      // Use event_cluster if set
      if (file.event_cluster) {
        clusterKey = file.event_cluster;
        clusterLabel = file.event_cluster.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
      
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, []);
      }
      clusters.get(clusterKey)!.push(file);
    });

    return Array.from(clusters.entries()).map(([key, clusterFiles]) => {
      const dates = clusterFiles
        .map(f => new Date(f.date_of_content || f.message_date))
        .sort((a, b) => a.getTime() - b.getTime());
      
      const startDate = dates[0];
      const endDate = dates[dates.length - 1];
      
      const dateRange = startDate.toDateString() === endDate.toDateString()
        ? startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      return {
        name: key,
        label: key.includes('_') 
          ? key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          : startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        dateRange,
        files: clusterFiles.sort((a, b) => 
          new Date(a.date_of_content || a.message_date).getTime() - 
          new Date(b.date_of_content || b.message_date).getTime()
        ),
        flaggedCount: clusterFiles.filter(f => f.is_flagged).length,
      };
    }).sort((a, b) => {
      const aDate = new Date(a.files[0]?.date_of_content || a.files[0]?.message_date);
      const bDate = new Date(b.files[0]?.date_of_content || b.files[0]?.message_date);
      return bDate.getTime() - aDate.getTime();
    });
  };

  // Filter files
  const filteredFiles = files.filter(f => {
    if (filter === 'all') return true;
    if (filter === 'flagged') return f.is_flagged;
    return f.file_type === filter;
  });

  const clusters = getEventClusters();
  const filteredClusters = clusters.map(c => ({
    ...c,
    files: c.files.filter(f => {
      if (filter === 'all') return true;
      if (filter === 'flagged') return f.is_flagged;
      return f.file_type === filter;
    })
  })).filter(c => c.files.length > 0);

  // Calendar data
  const getCalendarDays = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: { date: Date; files: CaseFile[]; hasFlagged: boolean }[] = [];
    
    for (let i = 0; i < startingDay; i++) {
      days.push({ date: new Date(year, month, -startingDay + i + 1), files: [], hasFlagged: false });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dayFiles = filteredFiles.filter(f => {
        const fileDate = new Date(f.date_of_content || f.message_date);
        return fileDate.toDateString() === date.toDateString();
      });
      days.push({
        date,
        files: dayFiles,
        hasFlagged: dayFiles.some(f => f.is_flagged),
      });
    }

    return days;
  };

  const toggleExhibit = async (fileId: string) => {
    const newSelected = new Set(selectedForExhibit);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedForExhibit(newSelected);

    // Update in database
    await supabase
      .from('case_files')
      .update({ include_in_exhibit: newSelected.has(fileId) })
      .eq('id', fileId);
  };

  const handleUpload = () => {
    router.push('/case-file/upload');
  };

  const stats = {
    total: files.length,
    flagged: files.filter(f => f.is_flagged).length,
    messages: files.filter(f => f.file_type === 'message').length,
    finances: files.filter(f => f.file_type === 'finance').length,
    courtDocs: files.filter(f => f.file_type === 'court_doc').length,
    inExhibit: selectedForExhibit.size,
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fafafa' }}>
        <div style={{ fontSize: 32 }}>📁</div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <header className="header">
        <h1>My Case File</h1>
        <button className="upload-btn" onClick={handleUpload}>+ Add</button>
      </header>

      {/* Stats */}
      <div className="stats">
        <button 
          className={`stat ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          <span className="stat-num">{stats.total}</span>
          <span className="stat-label">Total</span>
        </button>
        <button 
          className={`stat flagged ${filter === 'flagged' ? 'active' : ''}`}
          onClick={() => setFilter('flagged')}
        >
          <span className="stat-num">{stats.flagged}</span>
          <span className="stat-label">🚩 Flagged</span>
        </button>
        <button 
          className={`stat ${filter === 'message' ? 'active' : ''}`}
          onClick={() => setFilter('message')}
        >
          <span className="stat-num">{stats.messages}</span>
          <span className="stat-label">📱</span>
        </button>
        <button 
          className={`stat ${filter === 'finance' ? 'active' : ''}`}
          onClick={() => setFilter('finance')}
        >
          <span className="stat-num">{stats.finances}</span>
          <span className="stat-label">💰</span>
        </button>
        <button 
          className={`stat ${filter === 'court_doc' ? 'active' : ''}`}
          onClick={() => setFilter('court_doc')}
        >
          <span className="stat-num">{stats.courtDocs}</span>
          <span className="stat-label">📋</span>
        </button>
      </div>

      {/* View Toggle */}
      <div className="view-toggle">
        <button 
          className={view === 'list' ? 'active' : ''} 
          onClick={() => setView('list')}
        >
          Timeline
        </button>
        <button 
          className={view === 'calendar' ? 'active' : ''} 
          onClick={() => setView('calendar')}
        >
          Calendar
        </button>
      </div>

      {/* Content */}
      <main className="content">
        {view === 'list' ? (
          /* Timeline View */
          <div className="timeline">
            {filteredClusters.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">📁</div>
                <p>No files yet</p>
                <button onClick={handleUpload}>Add your first file</button>
              </div>
            ) : (
              filteredClusters.map(cluster => (
                <div key={cluster.name} className="cluster">
                  <button 
                    className="cluster-header"
                    onClick={() => setExpandedCluster(
                      expandedCluster === cluster.name ? null : cluster.name
                    )}
                  >
                    <div className="cluster-info">
                      <span className="cluster-label">{cluster.label}</span>
                      <span className="cluster-meta">
                        {cluster.dateRange} · {cluster.files.length} items
                        {cluster.flaggedCount > 0 && (
                          <span className="cluster-flagged"> · {cluster.flaggedCount} 🚩</span>
                        )}
                      </span>
                    </div>
                    <span className="cluster-arrow">
                      {expandedCluster === cluster.name ? '▼' : '▶'}
                    </span>
                  </button>

                  {(expandedCluster === cluster.name || cluster.files.length <= 3) && (
                    <div className="cluster-files">
                      {cluster.files.map(file => (
                        <div 
                          key={file.id} 
                          className={`file-card ${file.is_flagged ? 'flagged' : ''}`}
                        >
                          <div className="file-select">
                            <input
                              type="checkbox"
                              checked={selectedForExhibit.has(file.id)}
                              onChange={() => toggleExhibit(file.id)}
                            />
                          </div>
                          
                          <div className="file-content">
                            <div className="file-meta">
                              {file.is_flagged && <span className="flag">🚩</span>}
                              <span className="file-date">
                                {new Date(file.date_of_content || file.message_date || file.created_at)
                                  .toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                              </span>
                              {file.message_sender && (
                                <span className="file-sender">
                                  {file.message_sender === 'coparent' ? 'Co-parent' : 'You'}
                                </span>
                              )}
                            </div>
                            
                            {file.quote_text && (
                              <div className="quote">
                                "{file.quote_text}"
                              </div>
                            )}
                            
                            {!file.quote_text && file.file_name && (
                              <div className="file-name">{file.file_name}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          /* Calendar View */
          <div className="calendar">
            <div className="calendar-header">
              <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}>
                ←
              </button>
              <span>{selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              <button onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}>
                →
              </button>
            </div>
            
            <div className="calendar-grid">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="calendar-day-label">{day}</div>
              ))}
              
              {getCalendarDays().map((day, i) => (
                <div 
                  key={i} 
                  className={`calendar-day ${day.files.length > 0 ? 'has-files' : ''} ${day.hasFlagged ? 'has-flagged' : ''}`}
                  onClick={() => {
                    if (day.files.length > 0) {
                      // Could open a modal or navigate
                    }
                  }}
                >
                  <span className="day-num">{day.date.getDate()}</span>
                  {day.files.length > 0 && (
                    <span className={`day-dot ${day.hasFlagged ? 'flagged' : ''}`}></span>
                  )}
                </div>
              ))}
            </div>
            
            <div className="calendar-legend">
              <span><span className="dot"></span> Has messages</span>
              <span><span className="dot flagged"></span> Has flagged</span>
            </div>
          </div>
        )}
      </main>

      {/* Exhibit Builder Bar */}
      {selectedForExhibit.size > 0 && (
        <div className="exhibit-bar">
          <span>{selectedForExhibit.size} selected for exhibit</span>
          <button onClick={() => router.push('/exhibit-builder')}>
            Build Exhibit →
          </button>
        </div>
      )}

      <BottomNav active="case" />

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #fafafa;
          padding-bottom: 140px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #1a3a2f;
          color: white;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }
        .upload-btn {
          background: white;
          color: #1a3a2f;
          border: none;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        }

        .stats {
          display: flex;
          gap: 8px;
          padding: 16px;
          overflow-x: auto;
          background: white;
          border-bottom: 1px solid #eee;
        }
        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 16px;
          background: #f9fafb;
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          min-width: 60px;
        }
        .stat.active {
          border-color: #1a3a2f;
          background: #f0fdf4;
        }
        .stat.flagged {
          background: #fef2f2;
        }
        .stat.flagged.active {
          border-color: #ef4444;
        }
        .stat-num {
          font-size: 20px;
          font-weight: 700;
          color: #1a3a2f;
        }
        .stat.flagged .stat-num {
          color: #ef4444;
        }
        .stat-label {
          font-size: 11px;
          color: #6b7280;
          margin-top: 2px;
        }

        .view-toggle {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          background: white;
        }
        .view-toggle button {
          flex: 1;
          padding: 10px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          color: #6b7280;
        }
        .view-toggle button.active {
          background: #1a3a2f;
          color: white;
          border-color: #1a3a2f;
        }

        .content {
          padding: 16px;
          max-width: 700px;
          margin: 0 auto;
        }

        /* Timeline */
        .timeline {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .cluster {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .cluster-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
        }
        .cluster-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .cluster-label {
          font-weight: 600;
          color: #1a3a2f;
          font-size: 15px;
        }
        .cluster-meta {
          font-size: 13px;
          color: #6b7280;
        }
        .cluster-flagged {
          color: #ef4444;
        }
        .cluster-arrow {
          color: #9ca3af;
          font-size: 12px;
        }

        .cluster-files {
          border-top: 1px solid #f3f4f6;
        }

        .file-card {
          display: flex;
          gap: 12px;
          padding: 14px 16px;
          border-bottom: 1px solid #f3f4f6;
        }
        .file-card:last-child {
          border-bottom: none;
        }
        .file-card.flagged {
          background: #fef2f2;
          border-left: 3px solid #f87171;
        }

        .file-select {
          display: flex;
          align-items: flex-start;
          padding-top: 2px;
        }
        .file-select input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .file-content {
          flex: 1;
          min-width: 0;
        }
        .file-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          flex-wrap: wrap;
        }
        .flag {
          font-size: 12px;
        }
        .file-date {
          font-size: 12px;
          color: #6b7280;
        }
        .file-sender {
          font-size: 11px;
          padding: 2px 8px;
          background: #e5e7eb;
          border-radius: 10px;
          color: #374151;
        }

        .quote {
          font-size: 15px;
          color: #1e3a5f;
          line-height: 1.5;
          padding-left: 12px;
          border-left: 3px solid #cbd5e1;
          font-style: italic;
        }
        .file-card.flagged .quote {
          border-left-color: #f87171;
          color: #1a3a2f;
        }

        .file-name {
          font-size: 14px;
          color: #374151;
        }

        /* Empty State */
        .empty {
          text-align: center;
          padding: 60px 20px;
          color: #6b7280;
        }
        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .empty p {
          margin: 0 0 16px;
        }
        .empty button {
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        /* Calendar */
        .calendar {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .calendar-header button {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 8px;
          color: #6b7280;
        }
        .calendar-header span {
          font-weight: 600;
          color: #1a3a2f;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        .calendar-day-label {
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
          padding: 8px 0;
        }
        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: #374151;
          border-radius: 8px;
          cursor: pointer;
          position: relative;
        }
        .calendar-day.has-files {
          background: #f0fdf4;
        }
        .calendar-day.has-flagged {
          background: #fef2f2;
        }
        .day-num {
          font-weight: 500;
        }
        .day-dot {
          position: absolute;
          bottom: 4px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #1a3a2f;
        }
        .day-dot.flagged {
          background: #ef4444;
        }

        .calendar-legend {
          display: flex;
          gap: 16px;
          margin-top: 16px;
          justify-content: center;
          font-size: 12px;
          color: #6b7280;
        }
        .calendar-legend .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #1a3a2f;
          margin-right: 4px;
        }
        .calendar-legend .dot.flagged {
          background: #ef4444;
        }

        /* Exhibit Bar */
        .exhibit-bar {
          position: fixed;
          bottom: 80px;
          left: 16px;
          right: 16px;
          max-width: 700px;
          margin: 0 auto;
          background: #1a3a2f;
          color: white;
          padding: 14px 20px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .exhibit-bar span {
          font-size: 14px;
        }
        .exhibit-bar button {
          background: white;
          color: #1a3a2f;
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