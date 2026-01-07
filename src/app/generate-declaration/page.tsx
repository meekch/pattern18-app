'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface Incident {
  id: string;
  title: string;
  category: string;
  patterns: string[];
  severity: string;
  incident_date: string;
  coparent_message?: string;
  messages_json?: any[];
  include_in_exhibit?: boolean;
}

const DOC_TYPES = [
  {
    id: 'declaration',
    name: 'Declaration',
    icon: '📜',
    description: 'Formal statement under penalty of perjury with numbered paragraphs. Use for declarations in support of motions.',
    example: '5. On July 15, 2024, Respondent sent me the following text message: "You\'re a terrible mother." (See Exhibit A-5)'
  },
  {
    id: 'timeline',
    name: 'Timeline',
    icon: '📅',
    description: 'Chronological list of all incidents with dates, quotes, and exhibit numbers. Great for showing a pattern over time.',
    example: 'July 10, 2024 | A-1 | Text Message | "Just dropped at Tumbleweed"'
  },
  {
    id: 'pattern_summary',
    name: 'Pattern Summary',
    icon: '🔍',
    description: 'Incidents grouped by abuse pattern type with counts and examples. Shows the nature of the behavior.',
    example: 'FINANCIAL MANIPULATION (12 occurrences) - Example: "We doing the 60/40 split?"'
  },
  {
    id: 'exhibit_list',
    name: 'Exhibit List',
    icon: '📋',
    description: 'Formal index of all exhibits with numbers, dates, and descriptions. Required for court submissions.',
    example: 'Exhibit A-1 | July 10, 2024 | Text Message | Communication regarding pickup'
  }
];

export default function GenerateDeclarationPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState('declaration');
  const [useExhibitOnly, setUseExhibitOnly] = useState(true);
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  // Case context
  const [caseNumber, setCaseNumber] = useState('');
  const [courtName, setCourtName] = useState('');
  const [yourName, setYourName] = useState('');
  const [coparentName, setCoparentName] = useState('');
  const [userRole, setUserRole] = useState<'petitioner' | 'respondent'>('respondent');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Load incidents
      const { data } = await supabase
        .from('incidents')
        .select('*')
        .eq('user_id', session.user.id)
        .order('incident_date', { ascending: true });

      setIncidents(data || []);

      // Load case context
      const { data: caseContext } = await supabase
        .from('case_context')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (caseContext) {
        setCaseNumber(caseContext.case_number || '');
        setCourtName(caseContext.court || '');
        
        // Set role
        const role = caseContext.user_role || 'respondent';
        setUserRole(role);
        
        // Map names based on role
        if (role === 'petitioner') {
          setYourName(caseContext.petitioner_name || '');
          setCoparentName(caseContext.respondent_name || caseContext.coparent_name || '');
        } else {
          // User is respondent
          setYourName(caseContext.respondent_name || '');
          setCoparentName(caseContext.petitioner_name || caseContext.coparent_name || '');
        }
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedIncidents = useExhibitOnly 
    ? incidents.filter(i => i.include_in_exhibit)
    : incidents;

  const handleGenerate = async () => {
    if (selectedIncidents.length === 0) {
      setError('No incidents selected. Go to Evidence and check the boxes next to incidents you want to include.');
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedDoc(null);

    try {
      const response = await fetch('/api/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: selectedType,
          incidents: selectedIncidents,
          caseContext: {
            caseNumber,
            courtName,
            // Map back to petitioner/respondent based on role
            petitionerName: userRole === 'petitioner' ? yourName : coparentName,
            respondentName: userRole === 'petitioner' ? coparentName : yourName,
            userRole
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate document');
      }

      setGeneratedDoc(data.document);
    } catch (err: any) {
      setError(err.message || 'Failed to generate document');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedDoc) return;
    
    try {
      // Try clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(generatedDoc);
      } else {
        // Fallback: create textarea and copy
        const textarea = document.createElement('textarea');
        textarea.value = generatedDoc;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      
      // Always set copied state on success
      setCopied(true);
      setShowToast(true);
      setTimeout(() => {
        setCopied(false);
        setShowToast(false);
      }, 2500);
      
    } catch (err) {
      console.error('Copy failed:', err);
      // Even on error, try the fallback
      try {
        const textarea = document.createElement('textarea');
        textarea.value = generatedDoc;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setShowToast(true);
        setTimeout(() => {
          setCopied(false);
          setShowToast(false);
        }, 2500);
      } catch {
        // Last resort: select all text so user can copy manually
        if (textRef.current) {
          const range = document.createRange();
          range.selectNodeContents(textRef.current);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          alert('Text selected - press Ctrl+C to copy');
        }
      }
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8faf9' }}>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf9', paddingBottom: 100 }}>
      {/* Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#059669',
          color: 'white',
          padding: '12px 24px',
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 15,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'slideDown 0.3s ease'
        }}>
          <span style={{ fontSize: 18 }}>✓</span> Copied to clipboard!
        </div>
      )}
      
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        padding: '16px 24px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <button 
          onClick={() => router.push('/docs')}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}
        >
          ←
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>AI Declaration Writer</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>Generate court documents from your evidence</p>
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        {!generatedDoc ? (
          <>
            {/* Document Type Selection */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#374151' }}>1. Choose Document Type</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {DOC_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    style={{
                      padding: 16,
                      background: selectedType === type.id ? '#d1fae5' : '#f9fafb',
                      border: selectedType === type.id ? '2px solid #059669' : '2px solid transparent',
                      borderRadius: 12,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{type.icon}</div>
                    <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: 4 }}>{type.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Incident Selection */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#374151' }}>2. Select Incidents</h2>
              
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: 16,
                background: useExhibitOnly ? '#d1fae5' : '#f9fafb',
                borderRadius: 10,
                cursor: 'pointer',
                marginBottom: 12
              }}>
                <input
                  type="checkbox"
                  checked={useExhibitOnly}
                  onChange={(e) => setUseExhibitOnly(e.target.checked)}
                  style={{ width: 20, height: 20 }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#1f2937' }}>Only use incidents marked "In Exhibit"</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    {incidents.filter(i => i.include_in_exhibit).length} of {incidents.length} incidents selected
                  </div>
                </div>
              </label>

              <div style={{
                padding: 12,
                background: '#fefce8',
                borderRadius: 8,
                fontSize: 13,
                color: '#92400e'
              }}>
                💡 Go to <button onClick={() => router.push('/evidence')} style={{ color: '#059669', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>Evidence</button> to select which incidents to include
              </div>
            </div>

            {/* Case Information */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#374151' }}>3. Case Information (Optional)</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Case Number</label>
                  <input
                    type="text"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    placeholder="FC2024-001234"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Court Name</label>
                  <input
                    type="text"
                    value={courtName}
                    onChange={(e) => setCourtName(e.target.value)}
                    placeholder="Maricopa County Superior Court"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Your Name</label>
                  <input
                    type="text"
                    value={yourName}
                    onChange={(e) => setYourName(e.target.value)}
                    placeholder="Your full legal name"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Co-Parent Name</label>
                  <input
                    type="text"
                    value={coparentName}
                    onChange={(e) => setCoparentName(e.target.value)}
                    placeholder="Co-parent's full legal name"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Your Role</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={userRole === 'petitioner'}
                      onChange={() => setUserRole('petitioner')}
                    />
                    <span style={{ fontSize: 14, color: '#374151' }}>Petitioner (filed the case)</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={userRole === 'respondent'}
                      onChange={() => setUserRole('respondent')}
                    />
                    <span style={{ fontSize: 14, color: '#374151' }}>Respondent</span>
                  </label>
                </div>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                color: '#dc2626'
              }}>
                {error}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating || selectedIncidents.length === 0}
              style={{
                width: '100%',
                padding: 16,
                background: generating || selectedIncidents.length === 0 ? '#9ca3af' : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: generating || selectedIncidents.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {generating ? '⏳ Generating...' : `✍️ Generate ${DOC_TYPES.find(t => t.id === selectedType)?.name}`}
            </button>

            {selectedIncidents.length === 0 && (
              <p style={{ textAlign: 'center', color: '#dc2626', fontSize: 13, marginTop: 12 }}>
                No incidents selected. Go to Evidence and check the boxes.
              </p>
            )}
          </>
        ) : (
          /* Generated Document View */
          <>
            {/* Legal Disclaimer Banner */}
            <div style={{
              background: '#fefce8',
              border: '1px solid #fcd34d',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12
            }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
                  Draft Document - Attorney Review Recommended
                </div>
                <div style={{ fontSize: 13, color: '#a16207', lineHeight: 1.5 }}>
                  This is a starting point generated from your evidence. Have an attorney review before filing with the court.
                </div>
              </div>
            </div>

            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18, color: '#1f2937' }}>
                  {DOC_TYPES.find(t => t.id === selectedType)?.icon} Generated {DOC_TYPES.find(t => t.id === selectedType)?.name}
                </h2>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '8px 16px',
                    background: copied ? '#059669' : '#f3f4f6',
                    border: copied ? '2px solid #059669' : 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                    color: copied ? 'white' : '#374151',
                    transition: 'all 0.2s',
                    transform: copied ? 'scale(1.05)' : 'scale(1)'
                  }}
                >
                  {copied ? '✓ Copied!' : '📋 Copy All'}
                </button>
              </div>

              <div 
                ref={textRef}
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 20,
                  maxHeight: 500,
                  overflowY: 'auto',
                  fontFamily: 'Georgia, serif',
                  fontSize: 14,
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                  color: '#1f2937'
                }}
              >
                {generatedDoc}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setGeneratedDoc(null)}
                style={{
                  flex: 1,
                  padding: 14,
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#374151'
                }}
              >
                ← Generate Another
              </button>
              <button
                onClick={handleCopy}
                style={{
                  flex: 1,
                  padding: 14,
                  background: copied ? '#047857' : '#059669',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: 'white',
                  transition: 'all 0.2s',
                  transform: copied ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                {copied ? '✓ Copied to Clipboard!' : '📋 Copy to Clipboard'}
              </button>
            </div>
          </>
        )}
      </main>

      <BottomNav active="docs" />
      
      {/* Toast animation */}
      <style jsx global>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}