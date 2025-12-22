'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Incident {
  id: string;
  date: string;
  description: string;
  patterns: string[];
  severity: string;
  category: string;
}

interface CaseContext {
  caseNumber: string;
  court: string;
  petitionerName: string;
  respondentName: string;
  userRole: 'petitioner' | 'respondent';
  childrenNames: string[];
  nextCourtDate: string;
  coparent_name: string;
}

const DOCUMENT_TYPES = [
  { 
    id: 'declaration', 
    icon: '📝', 
    title: 'Declaration', 
    desc: 'Sworn statement of facts for the court',
    time: '5-10 min'
  },
  { 
    id: 'exhibit-list', 
    icon: '📋', 
    title: 'Exhibit List', 
    desc: 'Organized list of your evidence',
    time: '2-3 min'
  },
  { 
    id: 'pattern-summary', 
    icon: '🎯', 
    title: 'Pattern Summary', 
    desc: 'Overview of documented manipulation patterns',
    time: '3-5 min'
  },
  { 
    id: 'incident-timeline', 
    icon: '📅', 
    title: 'Incident Timeline', 
    desc: 'Chronological list of incidents',
    time: '2-3 min'
  },
];

export default function DocumentGeneratorPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  
  const [caseContext, setCaseContext] = useState<CaseContext | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  const [declarationPurpose, setDeclarationPurpose] = useState('');
  
  const [step, setStep] = useState<'select-type' | 'select-incidents' | 'customize' | 'preview'>('select-type');

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
      
      if (caseData) {
        setCaseContext(caseData);
      }
      
      // Load from incidents table (with error handling)
      const { data: incidentsData, error: incError } = await supabase
        .from('incidents')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (incError) console.log('Incidents query:', incError.message);
      
      // Load from evidence table (coach saves)
      const { data: evidenceData, error: evError } = await supabase
        .from('evidence')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (evError) console.log('Evidence query:', evError.message);
      
      // Combine both sources
      const allIncidents: Incident[] = [];
      
      if (incidentsData) {
        incidentsData.forEach(inc => {
          allIncidents.push({
            id: inc.id,
            date: inc.date || inc.created_at,
            description: inc.description,
            patterns: inc.patterns || [],
            severity: inc.severity || 'medium',
            category: inc.category || 'Other',
          });
        });
      }
      
      if (evidenceData) {
        evidenceData.forEach(ev => {
          // Try multiple fields for the description
          const desc = ev.original_message 
            || ev.message 
            || ev.content 
            || ev.text 
            || ev.analysis 
            || ev.title
            || ev.summary
            || ev.description
            || 'Documented from coach';
          
          allIncidents.push({
            id: ev.id,
            date: ev.created_at,
            description: typeof desc === 'string' ? desc.slice(0, 500) : JSON.stringify(desc).slice(0, 500),
            patterns: ev.patterns || ev.detected_patterns || [],
            severity: (ev.patterns?.length || ev.detected_patterns?.length || 0) > 2 ? 'high' : (ev.patterns?.length || ev.detected_patterns?.length || 0) > 0 ? 'medium' : 'low',
            category: 'Coach Analysis',
          });
        });
      }
      
      // Sort by date
      allIncidents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setIncidents(allIncidents);
      
      setLoading(false);
    };
    init();
  }, [router]);

  const generateDocument = async () => {
    setGenerating(true);
    
    const selectedIncidentData = incidents.filter(i => selectedIncidents.includes(i.id));
    
    try {
      const response = await fetch('/api/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: selectedType,
          incidents: selectedIncidentData,
          caseContext,
          purpose: declarationPurpose,
        }),
      });
      
      const data = await response.json();
      if (data.document) {
        setGeneratedDoc(data.document);
        setStep('preview');
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedDoc) {
      navigator.clipboard.writeText(generatedDoc);
    }
  };

  const downloadAsText = () => {
    if (generatedDoc) {
      const blob = new Blob([generatedDoc], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedType}-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
    }
  };

  const patternStats = incidents.reduce((acc, inc) => {
    inc.patterns?.forEach(p => {
      acc[p] = (acc[p] || 0) + 1;
    });
    return acc;
  }, {} as { [key: string]: number });

  if (loading) {
    return (
      <div className="loading">
        <span>⚖️</span>
        <p>Loading your case...</p>
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
        <h1>⚖️ Court Documents</h1>
        <div style={{ width: 60 }} />
      </header>

      <div className="content">
        {/* Progress Steps */}
        <div className="progress-steps">
          <div className={`progress-step ${step === 'select-type' ? 'active' : ''} ${['select-incidents', 'customize', 'preview'].includes(step) ? 'completed' : ''}`}>
            <span className="step-num">1</span>
            <span className="step-label">Type</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step === 'select-incidents' ? 'active' : ''} ${['customize', 'preview'].includes(step) ? 'completed' : ''}`}>
            <span className="step-num">2</span>
            <span className="step-label">Select</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step === 'customize' ? 'active' : ''} ${step === 'preview' ? 'completed' : ''}`}>
            <span className="step-num">3</span>
            <span className="step-label">Details</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step === 'preview' ? 'active' : ''}`}>
            <span className="step-num">4</span>
            <span className="step-label">Review</span>
          </div>
        </div>

        {/* Step 1: Select Document Type */}
        {step === 'select-type' && (
          <div className="step-content">
            <h2>What do you need?</h2>
            <p className="step-desc">Select the type of document you want to create</p>
            
            <div className="doc-types">
              {DOCUMENT_TYPES.map(doc => (
                <button
                  key={doc.id}
                  className={`doc-type-card ${selectedType === doc.id ? 'selected' : ''}`}
                  onClick={() => setSelectedType(doc.id)}
                >
                  <span className="doc-icon">{doc.icon}</span>
                  <div className="doc-info">
                    <h3>{doc.title}</h3>
                    <p>{doc.desc}</p>
                    <span className="doc-time">~{doc.time}</span>
                  </div>
                  {selectedType === doc.id && <span className="check">✓</span>}
                </button>
              ))}
            </div>

            {!caseContext && (
              <div className="warning-box">
                <span>⚠️</span>
                <div>
                  <strong>Case details not set up</strong>
                  <p>Add your case number, court, and party names for properly formatted documents.</p>
                  <button onClick={() => router.push('/case-setup')}>Set Up Case →</button>
                </div>
              </div>
            )}

            <button 
              className="next-btn"
              disabled={!selectedType}
              onClick={() => setStep('select-incidents')}
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Select Incidents */}
        {step === 'select-incidents' && (
          <div className="step-content">
            <h2>Select incidents to include</h2>
            <p className="step-desc">Choose which documented incidents to include in your {selectedType?.replace('-', ' ')}</p>
            
            <div className="select-actions">
              <button 
                className="select-all-btn"
                onClick={() => setSelectedIncidents(incidents.map(i => i.id))}
              >
                Select All ({incidents.length})
              </button>
              <button 
                className="clear-btn"
                onClick={() => setSelectedIncidents([])}
              >
                Clear
              </button>
              <span className="selected-count">{selectedIncidents.length} selected</span>
            </div>

            <div className="incidents-list">
              {incidents.length === 0 ? (
                <div className="empty-incidents">
                  <p>No incidents documented yet.</p>
                  <button onClick={() => router.push('/coach')}>Document with Coach →</button>
                </div>
              ) : (
                incidents.map(incident => (
                  <div 
                    key={incident.id}
                    className={`incident-select-card ${selectedIncidents.includes(incident.id) ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedIncidents(prev => 
                        prev.includes(incident.id) 
                          ? prev.filter(id => id !== incident.id)
                          : [...prev, incident.id]
                      );
                    }}
                  >
                    <div className="incident-checkbox">
                      {selectedIncidents.includes(incident.id) ? '✓' : ''}
                    </div>
                    <div className="incident-content">
                      <div className="incident-header">
                        <span className="incident-date">
                          {new Date(incident.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className={`incident-severity ${incident.severity}`}>{incident.severity}</span>
                      </div>
                      <p className="incident-desc">{incident.description?.slice(0, 150)}...</p>
                      {incident.patterns && incident.patterns.length > 0 && (
                        <div className="incident-patterns">
                          {incident.patterns.map(p => (
                            <span key={p} className="pattern-tag">{p}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="step-nav">
              <button className="back-step-btn" onClick={() => setStep('select-type')}>← Back</button>
              <button 
                className="next-btn"
                disabled={selectedIncidents.length === 0}
                onClick={() => setStep('customize')}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Customize */}
        {step === 'customize' && (
          <div className="step-content">
            <h2>Add context</h2>
            <p className="step-desc">Help us tailor the document to your needs</p>

            {selectedType === 'declaration' && (
              <div className="customize-form">
                <label>What is this declaration for?</label>
                <textarea
                  value={declarationPurpose}
                  onChange={(e) => setDeclarationPurpose(e.target.value)}
                  placeholder="e.g., Response to motion to modify custody, Support for restraining order, Evidence of parental alienation..."
                  rows={4}
                />
                <p className="form-hint">This helps us frame your declaration appropriately for the court.</p>
              </div>
            )}

            <div className="summary-box">
              <h4>Document Summary</h4>
              <div className="summary-item">
                <span>Document Type:</span>
                <strong>{DOCUMENT_TYPES.find(d => d.id === selectedType)?.title}</strong>
              </div>
              <div className="summary-item">
                <span>Incidents Included:</span>
                <strong>{selectedIncidents.length}</strong>
              </div>
              <div className="summary-item">
                <span>Patterns Covered:</span>
                <strong>{Object.keys(patternStats).length} types</strong>
              </div>
              {caseContext && (
                <>
                  <div className="summary-item">
                    <span>Case:</span>
                    <strong>{caseContext.caseNumber || 'Not set'}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Court:</span>
                    <strong>{caseContext.court || 'Not set'}</strong>
                  </div>
                </>
              )}
            </div>

            <div className="disclaimer">
              <span>⚠️</span>
              <p>This document is generated to help you prepare. It is not legal advice. Review with your attorney before filing.</p>
            </div>

            <div className="step-nav">
              <button className="back-step-btn" onClick={() => setStep('select-incidents')}>← Back</button>
              <button 
                className="generate-btn"
                disabled={generating}
                onClick={generateDocument}
              >
                {generating ? 'Generating...' : '✨ Generate Document'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 'preview' && generatedDoc && (
          <div className="step-content">
            <h2>Your document is ready</h2>
            <p className="step-desc">Review, copy, or download your generated document</p>

            <div className="doc-actions">
              <button className="action-btn" onClick={copyToClipboard}>
                📋 Copy to Clipboard
              </button>
              <button className="action-btn" onClick={downloadAsText}>
                💾 Download
              </button>
            </div>

            <div className="document-preview">
              <pre>{generatedDoc}</pre>
            </div>

            <div className="next-steps">
              <h4>Next Steps:</h4>
              <ul>
                <li>Review the document carefully for accuracy</li>
                <li>Have your attorney review before filing</li>
                <li>Make any necessary edits in your word processor</li>
                <li>Sign and date where indicated</li>
              </ul>
            </div>

            <div className="step-nav">
              <button className="back-step-btn" onClick={() => setStep('customize')}>← Edit</button>
              <button className="new-doc-btn" onClick={() => {
                setSelectedType(null);
                setSelectedIncidents([]);
                setDeclarationPurpose('');
                setGeneratedDoc(null);
                setStep('select-type');
              }}>
                + Create Another Document
              </button>
            </div>
          </div>
        )}
      </div>

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
        .back-btn {
          background: none;
          border: none;
          color: white;
          font-size: 15px;
          cursor: pointer;
        }
        .content {
          max-width: 700px;
          margin: 0 auto;
          padding: 20px;
        }

        /* Progress Steps */
        .progress-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 32px;
        }
        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .step-num {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          color: #666;
        }
        .progress-step.active .step-num {
          background: #1a3a2f;
          color: white;
        }
        .progress-step.completed .step-num {
          background: #14b8a6;
          color: white;
        }
        .step-label {
          font-size: 11px;
          color: #666;
        }
        .progress-line {
          width: 40px;
          height: 2px;
          background: #e5e7eb;
          margin: 0 8px 20px;
        }

        /* Step Content */
        .step-content h2 {
          font-size: 24px;
          color: #1a3a2f;
          margin-bottom: 8px;
        }
        .step-desc {
          color: #666;
          margin-bottom: 24px;
        }

        /* Document Types */
        .doc-types {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }
        .doc-type-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
          position: relative;
        }
        .doc-type-card:hover {
          border-color: #14b8a6;
        }
        .doc-type-card.selected {
          border-color: #1a3a2f;
          background: #f0fdf4;
        }
        .doc-icon {
          font-size: 32px;
        }
        .doc-info h3 {
          font-size: 16px;
          color: #1a3a2f;
          margin-bottom: 4px;
        }
        .doc-info p {
          font-size: 13px;
          color: #666;
          margin-bottom: 4px;
        }
        .doc-time {
          font-size: 11px;
          color: #14b8a6;
        }
        .check {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          width: 24px;
          height: 24px;
          background: #1a3a2f;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        /* Warning Box */
        .warning-box {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: #fef3c7;
          border-radius: 12px;
          margin-bottom: 24px;
        }
        .warning-box span {
          font-size: 24px;
        }
        .warning-box strong {
          display: block;
          color: #92400e;
          margin-bottom: 4px;
        }
        .warning-box p {
          font-size: 13px;
          color: #a16207;
          margin-bottom: 8px;
        }
        .warning-box button {
          background: #92400e;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        }

        /* Buttons */
        .next-btn, .generate-btn {
          width: 100%;
          padding: 16px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .next-btn:disabled, .generate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .generate-btn {
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
        }

        /* Select Actions */
        .select-actions {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 16px;
        }
        .select-all-btn, .clear-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
        }
        .select-all-btn {
          background: #1a3a2f;
          color: white;
          border: none;
        }
        .clear-btn {
          background: white;
          border: 1px solid #ddd;
          color: #666;
        }
        .selected-count {
          margin-left: auto;
          font-size: 14px;
          color: #14b8a6;
          font-weight: 600;
        }

        /* Incidents List */
        .incidents-list {
          max-height: 400px;
          overflow-y: auto;
          margin-bottom: 24px;
        }
        .incident-select-card {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .incident-select-card:hover {
          border-color: #14b8a6;
        }
        .incident-select-card.selected {
          border-color: #1a3a2f;
          background: #f0fdf4;
        }
        .incident-checkbox {
          width: 24px;
          height: 24px;
          border: 2px solid #ddd;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: white;
          flex-shrink: 0;
        }
        .incident-select-card.selected .incident-checkbox {
          background: #1a3a2f;
          border-color: #1a3a2f;
        }
        .incident-content {
          flex: 1;
        }
        .incident-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .incident-date {
          font-size: 12px;
          color: #666;
        }
        .incident-severity {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 10px;
          text-transform: uppercase;
          font-weight: 600;
        }
        .incident-severity.critical { background: #fef2f2; color: #dc2626; }
        .incident-severity.high { background: #fff7ed; color: #ea580c; }
        .incident-severity.medium { background: #fefce8; color: #ca8a04; }
        .incident-severity.low { background: #f0fdf4; color: #16a34a; }
        .incident-desc {
          font-size: 13px;
          color: #444;
          line-height: 1.5;
          margin-bottom: 8px;
        }
        .incident-patterns {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .pattern-tag {
          font-size: 10px;
          padding: 2px 8px;
          background: #e0e7ff;
          color: #4f46e5;
          border-radius: 8px;
        }
        .empty-incidents {
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 12px;
        }
        .empty-incidents p {
          color: #666;
          margin-bottom: 16px;
        }
        .empty-incidents button {
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
        }

        /* Customize Form */
        .customize-form {
          margin-bottom: 24px;
        }
        .customize-form label {
          display: block;
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 8px;
        }
        .customize-form textarea {
          width: 100%;
          padding: 14px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 15px;
          font-family: inherit;
          resize: vertical;
          box-sizing: border-box;
        }
        .customize-form textarea:focus {
          outline: none;
          border-color: #14b8a6;
        }
        .form-hint {
          font-size: 12px;
          color: #666;
          margin-top: 6px;
        }

        /* Summary Box */
        .summary-box {
          background: white;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .summary-box h4 {
          font-size: 14px;
          color: #1a3a2f;
          margin-bottom: 12px;
        }
        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f3f4f6;
          font-size: 14px;
        }
        .summary-item:last-child {
          border-bottom: none;
        }
        .summary-item span {
          color: #666;
        }
        .summary-item strong {
          color: #1a3a2f;
        }

        /* Disclaimer */
        .disclaimer {
          display: flex;
          gap: 10px;
          padding: 14px;
          background: #fef2f2;
          border-radius: 10px;
          margin-bottom: 24px;
        }
        .disclaimer span {
          font-size: 18px;
        }
        .disclaimer p {
          font-size: 12px;
          color: #991b1b;
          margin: 0;
        }

        /* Step Navigation */
        .step-nav {
          display: flex;
          gap: 12px;
        }
        .back-step-btn {
          padding: 16px 24px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 12px;
          font-size: 15px;
          cursor: pointer;
        }
        .step-nav .next-btn, .step-nav .generate-btn {
          flex: 1;
        }

        /* Preview */
        .doc-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        .action-btn {
          flex: 1;
          padding: 12px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
        }
        .action-btn:hover {
          background: #f9fafb;
        }
        .document-preview {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 24px;
          max-height: 500px;
          overflow-y: auto;
        }
        .document-preview pre {
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.6;
          color: #333;
        }
        .next-steps {
          background: #f0fdf4;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
        }
        .next-steps h4 {
          color: #065f46;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .next-steps ul {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          color: #047857;
        }
        .next-steps li {
          margin-bottom: 6px;
        }
        .new-doc-btn {
          flex: 1;
          padding: 16px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          cursor: pointer;
        }

        @media (max-width: 640px) {
          .progress-line {
            width: 20px;
          }
          .doc-type-card {
            padding: 16px;
          }
          .doc-icon {
            font-size: 24px;
          }
        }
      `}</style>
    </div>
  );
}