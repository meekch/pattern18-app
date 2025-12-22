'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Filing {
  id: string;
  title: string;
  type: 'order' | 'motion' | 'response' | 'declaration' | 'other';
  filed_by: 'me' | 'them' | 'court';
  date_filed: string;
  date_received: string;
  summary: string;
  tasks: Task[];
  deadlines: Deadline[];
  status: 'pending' | 'in_progress' | 'completed';
  file_url?: string;
  created_at: string;
}

interface Task {
  id: string;
  description: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  resources?: string[];
}

interface Deadline {
  id: string;
  description: string;
  date: string;
  type: 'response' | 'hearing' | 'filing' | 'service' | 'other';
  completed: boolean;
}

const FILING_TYPES = [
  { value: 'order', label: 'Court Order', icon: '📜' },
  { value: 'motion', label: 'Motion', icon: '📄' },
  { value: 'response', label: 'Response', icon: '↩️' },
  { value: 'declaration', label: 'Declaration', icon: '📝' },
  { value: 'other', label: 'Other', icon: '📎' },
];

export default function FilingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filings, setFilings] = useState<Filing[]>([]);
  const [existingCaseInfo, setExistingCaseInfo] = useState<any>(null);
  
  // Upload & analyze state
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  // Case info confirmation
  const [showCaseConfirm, setShowCaseConfirm] = useState(false);
  const [extractedCaseInfo, setExtractedCaseInfo] = useState<any>(null);
  const [savingCaseInfo, setSavingCaseInfo] = useState(false);
  
  // Form state for new filing
  const [newFiling, setNewFiling] = useState({
    title: '',
    type: 'order' as Filing['type'],
    filed_by: 'court' as Filing['filed_by'],
    date_filed: '',
    date_received: new Date().toISOString().split('T')[0],
  });
  
  // View state
  const [selectedFiling, setSelectedFiling] = useState<Filing | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'court' | 'mine'>('all');

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      await loadFilings(session.user.id);
      
      // Load existing case context
      const { data: caseData } = await supabase
        .from('case_context')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (caseData) {
        setExistingCaseInfo(caseData);
      }
      
      setLoading(false);
    };
    init();
  }, [router]);

  const loadFilings = async (userId: string) => {
    const { data } = await supabase
      .from('filings')
      .select('*')
      .eq('user_id', userId)
      .order('date_received', { ascending: false });
    
    if (data) {
      setFilings(data);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedFile(file);
    setAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/analyze-order', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        setAnalysisResult(result);
        
        // Auto-fill form from analysis
        if (result.title) {
          setNewFiling(prev => ({ ...prev, title: result.title }));
        }
        if (result.type) {
          setNewFiling(prev => ({ ...prev, type: result.type }));
        }
        if (result.date_filed) {
          setNewFiling(prev => ({ ...prev, date_filed: result.date_filed }));
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const saveFiling = async () => {
    if (!user || !newFiling.title) return;
    setUploading(true);
    
    try {
      const filingData = {
        user_id: user.id,
        title: newFiling.title,
        type: newFiling.type,
        filed_by: newFiling.filed_by,
        date_filed: newFiling.date_filed || null,
        date_received: newFiling.date_received,
        summary: analysisResult?.summary || '',
        tasks: analysisResult?.tasks || [],
        deadlines: analysisResult?.deadlines || [],
        status: 'pending',
      };
      
      const { data, error } = await supabase
        .from('filings')
        .insert(filingData)
        .select()
        .single();
      
      if (data) {
        setFilings(prev => [data, ...prev]);
        
        // Check if we extracted case info and don't have existing case context
        const caseInfo = analysisResult?.case_info;
        if (caseInfo && !existingCaseInfo && (caseInfo.case_number || caseInfo.court || caseInfo.petitioner_name)) {
          setExtractedCaseInfo(caseInfo);
          setShowCaseConfirm(true);
        }
        
        resetUpload();
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setUploading(false);
    }
  };

  const saveCaseInfo = async () => {
    if (!user || !extractedCaseInfo) return;
    setSavingCaseInfo(true);
    
    try {
      const caseData = {
        user_id: user.id,
        caseNumber: extractedCaseInfo.case_number || '',
        court: extractedCaseInfo.court || '',
        county: extractedCaseInfo.county || '',
        petitionerName: extractedCaseInfo.petitioner_name || '',
        respondentName: extractedCaseInfo.respondent_name || '',
        judgeName: extractedCaseInfo.judge_name || '',
      };
      
      const { data, error } = await supabase
        .from('case_context')
        .upsert(caseData, { onConflict: 'user_id' })
        .select()
        .single();
      
      if (data) {
        setExistingCaseInfo(data);
      }
      
      setShowCaseConfirm(false);
      setExtractedCaseInfo(null);
    } catch (error) {
      console.error('Save case info error:', error);
    } finally {
      setSavingCaseInfo(false);
    }
  };

  const resetUpload = () => {
    setShowUpload(false);
    setUploadedFile(null);
    setAnalysisResult(null);
    setNewFiling({
      title: '',
      type: 'order',
      filed_by: 'court',
      date_filed: '',
      date_received: new Date().toISOString().split('T')[0],
    });
  };

  const toggleTask = async (filingId: string, taskId: string) => {
    const filing = filings.find(f => f.id === filingId);
    if (!filing) return;
    
    const updatedTasks = filing.tasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed, completed_at: !t.completed ? new Date().toISOString() : undefined } : t
    );
    
    await supabase
      .from('filings')
      .update({ tasks: updatedTasks })
      .eq('id', filingId);
    
    setFilings(prev => prev.map(f => 
      f.id === filingId ? { ...f, tasks: updatedTasks } : f
    ));
    
    if (selectedFiling?.id === filingId) {
      setSelectedFiling({ ...selectedFiling, tasks: updatedTasks });
    }
  };

  const toggleDeadline = async (filingId: string, deadlineId: string) => {
    const filing = filings.find(f => f.id === filingId);
    if (!filing) return;
    
    const updatedDeadlines = filing.deadlines.map(d => 
      d.id === deadlineId ? { ...d, completed: !d.completed } : d
    );
    
    await supabase
      .from('filings')
      .update({ deadlines: updatedDeadlines })
      .eq('id', filingId);
    
    setFilings(prev => prev.map(f => 
      f.id === filingId ? { ...f, deadlines: updatedDeadlines } : f
    ));
    
    if (selectedFiling?.id === filingId) {
      setSelectedFiling({ ...selectedFiling, deadlines: updatedDeadlines });
    }
  };

  const getUpcomingDeadlines = () => {
    const now = new Date();
    const allDeadlines: (Deadline & { filingTitle: string; filingId: string })[] = [];
    
    filings.forEach(f => {
      f.deadlines?.forEach(d => {
        if (!d.completed) {
          allDeadlines.push({ ...d, filingTitle: f.title, filingId: f.id });
        }
      });
    });
    
    return allDeadlines
      .filter(d => new Date(d.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  };

  const getPendingTasks = () => {
    const allTasks: (Task & { filingTitle: string; filingId: string })[] = [];
    
    filings.forEach(f => {
      f.tasks?.forEach(t => {
        if (!t.completed) {
          allTasks.push({ ...t, filingTitle: f.title, filingId: f.id });
        }
      });
    });
    
    return allTasks
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      })
      .slice(0, 10);
  };

  const filteredFilings = filings.filter(f => {
    if (filter === 'pending') return f.status === 'pending';
    if (filter === 'court') return f.filed_by === 'court';
    if (filter === 'mine') return f.filed_by === 'me';
    return true;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="loading">
        <span>⚖️</span>
        <p>Loading your case filings...</p>
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
      <header className="header">
        <button onClick={() => router.back()} className="back-btn">← Back</button>
        <h1>Court Calendar</h1>
        <button onClick={() => setShowUpload(true)} className="add-btn">+ Add</button>
      </header>

      <div className="content">
        {/* Upcoming Deadlines Alert */}
        {getUpcomingDeadlines().length > 0 && (
          <div className="deadlines-alert">
            <h3>⏰ Upcoming Deadlines</h3>
            <div className="deadline-list">
              {getUpcomingDeadlines().map(d => {
                const daysUntil = getDaysUntil(d.date);
                return (
                  <div 
                    key={d.id} 
                    className={`deadline-item ${daysUntil <= 3 ? 'urgent' : daysUntil <= 7 ? 'soon' : ''}`}
                  >
                    <div className="deadline-info">
                      <span className="deadline-date">{formatDate(d.date)}</span>
                      <span className="deadline-days">
                        {daysUntil === 0 ? 'TODAY!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                      </span>
                    </div>
                    <p className="deadline-desc">{d.description}</p>
                    <span className="deadline-filing">{d.filingTitle}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Tasks */}
        {getPendingTasks().length > 0 && (
          <div className="tasks-section">
            <h3>📝 Action Items</h3>
            <div className="tasks-list">
              {getPendingTasks().map(t => (
                <div key={t.id} className="task-item">
                  <button 
                    className="task-checkbox"
                    onClick={() => toggleTask(t.filingId, t.id)}
                  >
                    {t.completed ? '✓' : ''}
                  </button>
                  <div className="task-content">
                    <p className="task-desc">{t.description}</p>
                    <span className="task-filing">{t.filingTitle}</span>
                  </div>
                  {t.due_date && (
                    <span className={`task-due ${getDaysUntil(t.due_date) <= 3 ? 'urgent' : ''}`}>
                      {formatDate(t.due_date)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({filings.length})
          </button>
          <button 
            className={`filter-tab ${filter === 'court' ? 'active' : ''}`}
            onClick={() => setFilter('court')}
          >
            📜 Court Orders
          </button>
          <button 
            className={`filter-tab ${filter === 'mine' ? 'active' : ''}`}
            onClick={() => setFilter('mine')}
          >
            📤 My Filings
          </button>
        </div>

        {/* Filings List */}
        {filteredFilings.length === 0 ? (
          <div className="empty-state">
            <span>📋</span>
            <h3>Track Your Case Documents</h3>
            <p>Upload court orders, motions, and other filings. We'll automatically extract:</p>
            <ul className="feature-list">
              <li>⏰ <strong>Deadlines</strong> - Response dates, hearing dates</li>
              <li>✓ <strong>Action items</strong> - What you need to do</li>
              <li>📁 <strong>Case details</strong> - Case number, court, parties</li>
            </ul>
            <p className="hint">Start with any court order you've received - we'll read it and tell you what to do next.</p>
            <button onClick={() => setShowUpload(true)}>+ Upload a Document</button>
          </div>
        ) : (
          <div className="filings-list">
            {filteredFilings.map(filing => (
              <div 
                key={filing.id} 
                className="filing-card"
                onClick={() => setSelectedFiling(filing)}
              >
                <div className="filing-header">
                  <span className="filing-icon">
                    {FILING_TYPES.find(t => t.value === filing.type)?.icon || '📄'}
                  </span>
                  <div className="filing-info">
                    <h4>{filing.title}</h4>
                    <span className="filing-meta">
                      {filing.filed_by === 'court' && '📜 Court Order'}
                      {filing.filed_by === 'me' && '📤 Filed by me'}
                      {filing.filed_by === 'them' && '📥 Filed by them'}
                      {' • '}
                      {formatDate(filing.date_received)}
                    </span>
                  </div>
                </div>
                
                {filing.summary && (
                  <p className="filing-summary">{filing.summary.slice(0, 150)}...</p>
                )}
                
                <div className="filing-stats">
                  {filing.tasks?.length > 0 && (
                    <span className="stat">
                      ✓ {filing.tasks.filter(t => t.completed).length}/{filing.tasks.length} tasks
                    </span>
                  )}
                  {filing.deadlines?.length > 0 && (
                    <span className="stat">
                      ⏰ {filing.deadlines.filter(d => !d.completed).length} deadlines
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={resetUpload}>
          <div className="modal upload-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📜 Add Court Document</h2>
              <button onClick={resetUpload} className="modal-close">×</button>
            </div>
            
            <div className="modal-content">
              {!uploadedFile ? (
                <div 
                  className="upload-zone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="upload-icon">📤</span>
                  <h3>Upload Court Order or Filing</h3>
                  <p>PDF or image of any court document</p>
                  <p className="upload-hint">We'll read it and extract deadlines & action items</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </div>
              ) : analyzing ? (
                <div className="analyzing">
                  <div className="analyzing-spinner" />
                  <h3>Reading document...</h3>
                  <p>Extracting deadlines, requirements, and action items</p>
                </div>
              ) : (
                <div className="analysis-results">
                  <div className="file-info">
                    <span>📄</span>
                    <span>{uploadedFile.name}</span>
                    <button onClick={() => { setUploadedFile(null); setAnalysisResult(null); }}>×</button>
                  </div>
                  
                  <div className="form-group">
                    <label>Document Title</label>
                    <input
                      type="text"
                      value={newFiling.title}
                      onChange={e => setNewFiling(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g., Order to Appear, Motion to Modify"
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Document Type</label>
                      <select
                        value={newFiling.type}
                        onChange={e => setNewFiling(prev => ({ ...prev, type: e.target.value as Filing['type'] }))}
                      >
                        {FILING_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Filed By</label>
                      <select
                        value={newFiling.filed_by}
                        onChange={e => setNewFiling(prev => ({ ...prev, filed_by: e.target.value as Filing['filed_by'] }))}
                      >
                        <option value="court">📜 Court</option>
                        <option value="me">📤 Me</option>
                        <option value="them">📥 Other Party</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date Filed</label>
                      <input
                        type="date"
                        value={newFiling.date_filed}
                        onChange={e => setNewFiling(prev => ({ ...prev, date_filed: e.target.value }))}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Date Received</label>
                      <input
                        type="date"
                        value={newFiling.date_received}
                        onChange={e => setNewFiling(prev => ({ ...prev, date_received: e.target.value }))}
                      />
                    </div>
                  </div>
                  
                  {analysisResult && (
                    <>
                      {analysisResult.summary && (
                        <div className="analysis-section">
                          <h4>📋 Summary</h4>
                          <p>{analysisResult.summary}</p>
                        </div>
                      )}
                      
                      {analysisResult.case_info && (analysisResult.case_info.case_number || analysisResult.case_info.court) && (
                        <div className="analysis-section case-info-section">
                          <h4>📁 Case Details Detected</h4>
                          <div className="case-info-grid">
                            {analysisResult.case_info.case_number && (
                              <div className="case-info-item">
                                <span className="case-label">Case #:</span>
                                <span className="case-value">{analysisResult.case_info.case_number}</span>
                              </div>
                            )}
                            {analysisResult.case_info.court && (
                              <div className="case-info-item">
                                <span className="case-label">Court:</span>
                                <span className="case-value">{analysisResult.case_info.court}</span>
                              </div>
                            )}
                            {analysisResult.case_info.petitioner_name && (
                              <div className="case-info-item">
                                <span className="case-label">Petitioner:</span>
                                <span className="case-value">{analysisResult.case_info.petitioner_name}</span>
                              </div>
                            )}
                            {analysisResult.case_info.respondent_name && (
                              <div className="case-info-item">
                                <span className="case-label">Respondent:</span>
                                <span className="case-value">{analysisResult.case_info.respondent_name}</span>
                              </div>
                            )}
                          </div>
                          {!existingCaseInfo && (
                            <p className="case-info-note">✨ We'll ask you to save this after uploading</p>
                          )}
                        </div>
                      )}
                      
                      {analysisResult.deadlines?.length > 0 && (
                        <div className="analysis-section deadlines">
                          <h4>⏰ Deadlines Found</h4>
                          {analysisResult.deadlines.map((d: any, i: number) => (
                            <div key={i} className="extracted-item">
                              <span className="item-date">{d.date}</span>
                              <span className="item-desc">{d.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {analysisResult.tasks?.length > 0 && (
                        <div className="analysis-section tasks">
                          <h4>✓ Action Items</h4>
                          {analysisResult.tasks.map((t: any, i: number) => (
                            <div key={i} className="extracted-item">
                              <span className="item-num">{i + 1}</span>
                              <span className="item-desc">{t.description}</span>
                              {t.due_date && <span className="item-due">Due: {t.due_date}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {analysisResult.resources?.length > 0 && (
                        <div className="analysis-section resources">
                          <h4>🔗 Helpful Resources</h4>
                          {analysisResult.resources.map((r: any, i: number) => (
                            <div key={i} className="resource-item">
                              <span>{r.name}</span>
                              {r.description && <p>{r.description}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            
            {uploadedFile && !analyzing && (
              <div className="modal-footer">
                <button onClick={resetUpload} className="cancel-btn">Cancel</button>
                <button 
                  onClick={saveFiling}
                  disabled={!newFiling.title || uploading}
                  className="save-btn"
                >
                  {uploading ? 'Saving...' : '💾 Save to Case'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filing Detail Modal */}
      {selectedFiling && (
        <div className="modal-overlay" onClick={() => setSelectedFiling(null)}>
          <div className="modal detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedFiling.title}</h2>
                <span className="detail-meta">
                  {selectedFiling.filed_by === 'court' && '📜 Court Order'}
                  {selectedFiling.filed_by === 'me' && '📤 Filed by me'}
                  {selectedFiling.filed_by === 'them' && '📥 Filed by them'}
                  {' • '}{formatDate(selectedFiling.date_received)}
                </span>
              </div>
              <button onClick={() => setSelectedFiling(null)} className="modal-close">×</button>
            </div>
            
            <div className="modal-content">
              {selectedFiling.summary && (
                <div className="detail-section">
                  <h4>Summary</h4>
                  <p>{selectedFiling.summary}</p>
                </div>
              )}
              
              {selectedFiling.deadlines?.length > 0 && (
                <div className="detail-section">
                  <h4>⏰ Deadlines</h4>
                  {selectedFiling.deadlines.map(d => (
                    <div key={d.id} className={`deadline-row ${d.completed ? 'completed' : ''}`}>
                      <button 
                        className="check-btn"
                        onClick={() => toggleDeadline(selectedFiling.id, d.id)}
                      >
                        {d.completed ? '✓' : ''}
                      </button>
                      <div className="deadline-content">
                        <span className="deadline-date">{formatDate(d.date)}</span>
                        <span className="deadline-text">{d.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {selectedFiling.tasks?.length > 0 && (
                <div className="detail-section">
                  <h4>✓ Action Items</h4>
                  {selectedFiling.tasks.map(t => (
                    <div key={t.id} className={`task-row ${t.completed ? 'completed' : ''}`}>
                      <button 
                        className="check-btn"
                        onClick={() => toggleTask(selectedFiling.id, t.id)}
                      >
                        {t.completed ? '✓' : ''}
                      </button>
                      <div className="task-content-detail">
                        <span className="task-text">{t.description}</span>
                        {t.due_date && <span className="task-due-detail">Due: {formatDate(t.due_date)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="detail-actions">
                <button 
                  className="action-btn"
                  onClick={() => {
                    router.push('/court-docs');
                  }}
                >
                  📝 Create Response Document
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => {
                    router.push('/coach');
                  }}
                >
                  💬 Get Help from Coach
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Case Info Confirmation Modal */}
      {showCaseConfirm && extractedCaseInfo && (
        <div className="modal-overlay" onClick={() => setShowCaseConfirm(false)}>
          <div className="modal case-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Case Details Found</h2>
              <button onClick={() => setShowCaseConfirm(false)} className="modal-close">×</button>
            </div>
            
            <div className="modal-content">
              <p className="case-intro">We found your case information in this document. Save it to auto-fill your court documents?</p>
              
              <div className="case-details">
                {extractedCaseInfo.case_number && (
                  <div className="case-row">
                    <label>Case Number</label>
                    <span>{extractedCaseInfo.case_number}</span>
                  </div>
                )}
                {extractedCaseInfo.court && (
                  <div className="case-row">
                    <label>Court</label>
                    <span>{extractedCaseInfo.court}</span>
                  </div>
                )}
                {extractedCaseInfo.county && (
                  <div className="case-row">
                    <label>County</label>
                    <span>{extractedCaseInfo.county}</span>
                  </div>
                )}
                {extractedCaseInfo.petitioner_name && (
                  <div className="case-row">
                    <label>Petitioner</label>
                    <span>{extractedCaseInfo.petitioner_name}</span>
                  </div>
                )}
                {extractedCaseInfo.respondent_name && (
                  <div className="case-row">
                    <label>Respondent</label>
                    <span>{extractedCaseInfo.respondent_name}</span>
                  </div>
                )}
                {extractedCaseInfo.judge_name && (
                  <div className="case-row">
                    <label>Judge</label>
                    <span>{extractedCaseInfo.judge_name}</span>
                  </div>
                )}
              </div>
              
              <p className="case-note">You can edit these anytime in Settings.</p>
            </div>
            
            <div className="modal-footer">
              <button onClick={() => setShowCaseConfirm(false)} className="cancel-btn">
                Skip for now
              </button>
              <button 
                onClick={saveCaseInfo}
                disabled={savingCaseInfo}
                className="save-btn"
              >
                {savingCaseInfo ? 'Saving...' : '✓ Save Case Info'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #f5f7f6;
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
          font-size: 18px;
          font-weight: 600;
        }
        .back-btn, .add-btn {
          background: none;
          border: none;
          color: white;
          font-size: 15px;
          cursor: pointer;
        }
        .add-btn {
          background: rgba(255,255,255,0.15);
          padding: 8px 16px;
          border-radius: 8px;
        }
        .content {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        /* Deadlines Alert */
        .deadlines-alert {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .deadlines-alert h3 {
          font-size: 16px;
          color: #92400e;
          margin-bottom: 12px;
        }
        .deadline-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .deadline-item {
          background: white;
          border-radius: 10px;
          padding: 12px;
        }
        .deadline-item.urgent {
          border-left: 4px solid #dc2626;
        }
        .deadline-item.soon {
          border-left: 4px solid #f59e0b;
        }
        .deadline-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .deadline-date {
          font-weight: 600;
          color: #1a3a2f;
        }
        .deadline-days {
          font-size: 12px;
          font-weight: 600;
          color: #dc2626;
        }
        .deadline-desc {
          font-size: 14px;
          color: #444;
          margin-bottom: 4px;
        }
        .deadline-filing {
          font-size: 11px;
          color: #666;
        }

        /* Tasks Section */
        .tasks-section {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .tasks-section h3 {
          font-size: 16px;
          color: #1a3a2f;
          margin-bottom: 12px;
        }
        .tasks-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .task-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px;
          background: #f9fafb;
          border-radius: 8px;
        }
        .task-checkbox {
          width: 22px;
          height: 22px;
          border: 2px solid #ddd;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #14b8a6;
          flex-shrink: 0;
        }
        .task-content {
          flex: 1;
        }
        .task-desc {
          font-size: 14px;
          color: #333;
          margin-bottom: 2px;
        }
        .task-filing {
          font-size: 11px;
          color: #666;
        }
        .task-due {
          font-size: 12px;
          color: #666;
          white-space: nowrap;
        }
        .task-due.urgent {
          color: #dc2626;
          font-weight: 600;
        }

        /* Filter Tabs */
        .filter-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          overflow-x: auto;
        }
        .filter-tab {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid #ddd;
          background: white;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
        }
        .filter-tab.active {
          background: #1a3a2f;
          color: white;
          border-color: #1a3a2f;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 40px 20px;
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
          margin-bottom: 12px;
        }
        .empty-state p {
          color: #666;
          margin-bottom: 16px;
          max-width: 350px;
          margin-left: auto;
          margin-right: auto;
        }
        .feature-list {
          list-style: none;
          padding: 0;
          margin: 0 auto 20px;
          max-width: 320px;
          text-align: left;
        }
        .feature-list li {
          padding: 8px 0;
          color: #444;
          font-size: 14px;
        }
        .feature-list strong {
          color: #1a3a2f;
        }
        .hint {
          font-size: 13px;
          color: #14b8a6;
          font-style: italic;
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

        /* Filings List */
        .filings-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .filing-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .filing-card:hover {
          transform: translateY(-2px);
        }
        .filing-header {
          display: flex;
          gap: 12px;
          margin-bottom: 10px;
        }
        .filing-icon {
          font-size: 24px;
        }
        .filing-info h4 {
          font-size: 15px;
          color: #1a3a2f;
          margin-bottom: 4px;
        }
        .filing-meta {
          font-size: 12px;
          color: #666;
        }
        .filing-summary {
          font-size: 13px;
          color: #555;
          line-height: 1.5;
          margin-bottom: 10px;
        }
        .filing-stats {
          display: flex;
          gap: 16px;
        }
        .stat {
          font-size: 12px;
          color: #14b8a6;
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
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .upload-modal {
          max-width: 600px;
        }
        .detail-modal {
          max-width: 600px;
        }
        .case-modal {
          max-width: 480px;
        }
        .case-intro {
          font-size: 15px;
          color: #444;
          margin-bottom: 20px;
          line-height: 1.5;
        }
        .case-details {
          background: #f0fdf4;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .case-row {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .case-row:last-child {
          border-bottom: none;
        }
        .case-row label {
          font-size: 13px;
          color: #666;
        }
        .case-row span {
          font-size: 14px;
          font-weight: 600;
          color: #1a3a2f;
          text-align: right;
          max-width: 60%;
        }
        .case-note {
          font-size: 12px;
          color: #666;
          text-align: center;
          font-style: italic;
        }
        .case-info-section {
          background: #f0fdf4;
          border: 1px solid #a7f3d0;
        }
        .case-info-grid {
          display: grid;
          gap: 8px;
        }
        .case-info-item {
          display: flex;
          gap: 8px;
        }
        .case-label {
          font-size: 13px;
          color: #666;
          min-width: 80px;
        }
        .case-value {
          font-size: 13px;
          font-weight: 600;
          color: #065f46;
        }
        .case-info-note {
          font-size: 12px;
          color: #14b8a6;
          margin-top: 10px;
          margin-bottom: 0;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px;
          border-bottom: 1px solid #eee;
        }
        .modal-header h2 {
          font-size: 18px;
          color: #1a3a2f;
        }
        .detail-meta {
          font-size: 13px;
          color: #666;
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
        .modal-footer {
          display: flex;
          gap: 12px;
          padding: 20px;
          border-top: 1px solid #eee;
        }
        .cancel-btn {
          flex: 1;
          padding: 14px;
          background: #f3f4f6;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          cursor: pointer;
        }
        .save-btn {
          flex: 2;
          padding: 14px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }
        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Upload Zone */
        .upload-zone {
          border: 2px dashed #ddd;
          border-radius: 16px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .upload-zone:hover {
          border-color: #14b8a6;
          background: #f0fdf4;
        }
        .upload-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }
        .upload-zone h3 {
          color: #1a3a2f;
          margin-bottom: 8px;
        }
        .upload-zone p {
          color: #666;
          font-size: 14px;
        }
        .upload-hint {
          color: #14b8a6 !important;
          margin-top: 12px;
          font-weight: 500;
        }

        /* Analyzing */
        .analyzing {
          text-align: center;
          padding: 40px;
        }
        .analyzing-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #14b8a6;
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .analyzing h3 {
          color: #1a3a2f;
          margin-bottom: 8px;
        }
        .analyzing p {
          color: #666;
          font-size: 14px;
        }

        /* Analysis Results */
        .file-info {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: #f3f4f6;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .file-info button {
          margin-left: auto;
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #444;
          margin-bottom: 6px;
        }
        .form-group input, .form-group select {
          width: 100%;
          padding: 12px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 15px;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .analysis-section {
          background: #f9fafb;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .analysis-section h4 {
          font-size: 14px;
          color: #1a3a2f;
          margin-bottom: 10px;
        }
        .analysis-section p {
          font-size: 14px;
          color: #444;
          line-height: 1.6;
        }
        .analysis-section.deadlines {
          background: #fef3c7;
        }
        .analysis-section.tasks {
          background: #d1fae5;
        }
        .analysis-section.resources {
          background: #dbeafe;
        }
        .extracted-item {
          display: flex;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(0,0,0,0.1);
          font-size: 14px;
        }
        .extracted-item:last-child {
          border-bottom: none;
        }
        .item-date, .item-num {
          font-weight: 600;
          color: #1a3a2f;
          min-width: 80px;
        }
        .item-num {
          min-width: 20px;
        }
        .item-desc {
          flex: 1;
        }
        .item-due {
          font-size: 12px;
          color: #dc2626;
        }
        .resource-item {
          padding: 8px 0;
        }
        .resource-item span {
          font-weight: 600;
          color: #1e40af;
        }
        .resource-item p {
          font-size: 13px;
          margin-top: 4px;
        }

        /* Detail Modal */
        .detail-section {
          margin-bottom: 24px;
        }
        .detail-section h4 {
          font-size: 15px;
          color: #1a3a2f;
          margin-bottom: 12px;
        }
        .detail-section p {
          font-size: 14px;
          color: #444;
          line-height: 1.6;
        }
        .deadline-row, .task-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 8px;
        }
        .deadline-row.completed, .task-row.completed {
          opacity: 0.6;
        }
        .deadline-row.completed .deadline-text,
        .task-row.completed .task-text {
          text-decoration: line-through;
        }
        .check-btn {
          width: 24px;
          height: 24px;
          border: 2px solid #ddd;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: #14b8a6;
          flex-shrink: 0;
        }
        .deadline-content, .task-content-detail {
          flex: 1;
        }
        .deadline-date {
          font-weight: 600;
          color: #1a3a2f;
          display: block;
          margin-bottom: 2px;
        }
        .deadline-text, .task-text {
          font-size: 14px;
          color: #444;
        }
        .task-due-detail {
          font-size: 12px;
          color: #666;
          display: block;
          margin-top: 4px;
        }
        .detail-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 20px;
        }
        .action-btn {
          padding: 14px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          cursor: pointer;
        }
        .action-btn.secondary {
          background: #f3f4f6;
          color: #444;
        }

        @media (max-width: 640px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}