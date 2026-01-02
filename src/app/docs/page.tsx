'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface CourtDoc {
  id: string;
  title: string;
  type: string;
  summary: string;
  uploaded_at: string;
  file_path: string;
  case_number?: string;
  court_name?: string;
  petitioner_name?: string;
  respondent_name?: string;
  key_provisions?: string[];
}

export default function DocsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [courtDocs, setCourtDocs] = useState<CourtDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'generate' | 'uploads'>('generate');

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

      const { data: docs } = await supabase
        .from('court_documents')
        .select('*')
        .eq('user_id', session.user.id)
        .order('uploaded_at', { ascending: false });

      setCourtDocs(docs || []);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
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
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%)',
        padding: '20px 24px',
        color: 'white'
      }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Documents</h1>
        <p style={{ margin: '8px 0 0', opacity: 0.8, fontSize: 14 }}>Generate court documents & manage uploads</p>
      </header>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        background: 'white',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <button
          onClick={() => setActiveTab('generate')}
          style={{
            flex: 1,
            padding: '14px',
            border: 'none',
            background: activeTab === 'generate' ? '#f0fdf4' : 'white',
            borderBottom: activeTab === 'generate' ? '3px solid #059669' : '3px solid transparent',
            color: activeTab === 'generate' ? '#059669' : '#6b7280',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          Generate Documents
        </button>
        <button
          onClick={() => setActiveTab('uploads')}
          style={{
            flex: 1,
            padding: '14px',
            border: 'none',
            background: activeTab === 'uploads' ? '#f0fdf4' : 'white',
            borderBottom: activeTab === 'uploads' ? '3px solid #059669' : '3px solid transparent',
            color: activeTab === 'uploads' ? '#059669' : '#6b7280',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          Court Orders ({courtDocs.length})
        </button>
      </div>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
        {activeTab === 'generate' ? (
          <>
            {/* Exhibit Packet - Primary */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              marginBottom: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              border: '2px solid #059669'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{
                  width: 56,
                  height: 56,
                  background: '#d1fae5',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  flexShrink: 0
                }}>
                  📊
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h2 style={{ margin: 0, fontSize: 18, color: '#1f2937' }}>Court Exhibit Packet</h2>
                    <span style={{
                      background: '#059669',
                      color: 'white',
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontWeight: 600
                    }}>
                      RECOMMENDED
                    </span>
                  </div>
                  <p style={{ margin: '8px 0 16px', color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
                    Downloads a professional Word document (.docx) with your evidence formatted for court submission.
                  </p>
                  
                  <div style={{
                    background: '#f9fafb',
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 16
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      WHAT'S INCLUDED:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: '#6b7280', fontSize: 13, lineHeight: 1.7 }}>
                      <li>Cover page with case information</li>
                      <li>Executive summary with statistics</li>
                      <li>Pattern breakdown with frequency counts</li>
                      <li>Monthly timeline showing escalation</li>
                      <li>All incidents with exact quotes</li>
                      <li>Appendix with pattern definitions & academic sources</li>
                    </ul>
                  </div>

                  <div style={{
                    background: '#fefce8',
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 16,
                    border: '1px solid #fef08a'
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
                      HOW TO USE:
                    </div>
                    <ol style={{ margin: 0, paddingLeft: 18, color: '#a16207', fontSize: 13, lineHeight: 1.7 }}>
                      <li>Go to My Case and check the boxes next to your strongest incidents</li>
                      <li>Click "Generate Exhibit" below</li>
                      <li>Choose "Only include marked incidents" for a focused document</li>
                      <li>Download and attach to your court filing as an exhibit</li>
                    </ol>
                  </div>

                  <button
                    onClick={() => router.push('/generate-exhibit')}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: '#059669',
                      color: 'white',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    Generate Exhibit Packet
                  </button>
                </div>
              </div>
            </div>

            {/* AI Document Writer */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              marginBottom: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{
                  width: 56,
                  height: 56,
                  background: '#e0f2e9',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  flexShrink: 0
                }}>
                  ✏️
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: '0 0 4px', fontSize: 18, color: '#1f2937' }}>AI Declaration Writer</h2>
                  <p style={{ margin: '8px 0 16px', color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>
                    AI writes a formal declaration in proper legal format. Great for declarations, motions, and responses.
                  </p>
                  
                  <div style={{
                    background: '#f9fafb',
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 16
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                      DOCUMENT TYPES:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: '#6b7280', fontSize: 13, lineHeight: 1.7 }}>
                      <li><strong>Declaration</strong> - Numbered paragraphs under penalty of perjury</li>
                      <li><strong>Timeline</strong> - Chronological list with exhibit numbers</li>
                      <li><strong>Pattern Summary</strong> - Analysis grouped by abuse type</li>
                      <li><strong>Exhibit List</strong> - Formal index of all exhibits</li>
                    </ul>
                  </div>

                  <div style={{
                    background: '#fefce8',
                    borderRadius: 10,
                    padding: 14,
                    marginBottom: 16,
                    border: '1px solid #fef08a'
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
                      HOW TO USE:
                    </div>
                    <ol style={{ margin: 0, paddingLeft: 18, color: '#a16207', fontSize: 13, lineHeight: 1.7 }}>
                      <li>Select incidents from My Case (check the boxes)</li>
                      <li>Choose the document type you need</li>
                      <li>AI generates the text in proper legal format</li>
                      <li>Copy into your Word document or court form</li>
                    </ol>
                  </div>

                  <button
                    onClick={() => router.push('/generate-declaration')}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      background: '#1a3a2f',
                      color: 'white',
                      border: 'none',
                      borderRadius: 10,
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    Write Declaration
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{
              background: '#f3f4f6',
              borderRadius: 12,
              padding: 16
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 12 }}>
                QUICK ACTION
              </div>
              <button
                onClick={() => router.push('/evidence')}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#374151'
                }}
              >
                Go to My Case to Select Evidence
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Upload Section */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              marginBottom: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#1f2937' }}>Upload Court Orders</h2>
              <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: 14 }}>
                Upload custody orders, parenting plans, and other court documents. AI will extract key dates, deadlines, and requirements.
              </p>
              <button
                onClick={() => router.push('/upload-order')}
                style={{
                  padding: '12px 24px',
                  background: '#1a3a2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                + Upload Document
              </button>
            </div>

            {/* Document List */}
            {courtDocs.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: 48,
                color: '#6b7280'
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
                <p>No court documents uploaded yet</p>
                <p style={{ fontSize: 13 }}>Upload orders, parenting plans, and custody agreements</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {courtDocs.map(doc => (
                  <DocumentCard key={doc.id} doc={doc} router={router} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav active="docs" />
    </div>
  );
}

// Expandable document card with action buttons
function DocumentCard({ doc, router }: { doc: CourtDoc; router: any }) {
  const [expanded, setExpanded] = useState(false);

  const handleAction = (action: 'deadlines' | 'respond' | 'explain') => {
    let prompt = '';
    
    if (action === 'deadlines') {
      prompt = `I have a "${doc.title}" in my case. What are my deadlines and what do I need to do next?`;
    } else if (action === 'respond') {
      const petitioner = doc.petitioner_name || 'the other party';
      prompt = `I need help responding to "${doc.title}" filed by ${petitioner}. What are my options and how should I respond?`;
    } else if (action === 'explain') {
      const summary = doc.summary || '';
      prompt = `Explain this court document to me in plain English: "${doc.title}". ${summary}`;
    }
    
    sessionStorage.setItem('coachPrompt', prompt);
    router.push('/coach');
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {/* Main row - tappable */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: 16,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12
        }}
      >
        <div style={{ fontSize: 24 }}>📄</div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: '#1f2937' }}>{doc.title}</h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
            {doc.type} • Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
          </p>
          {doc.summary && !expanded && (
            <p style={{ 
              margin: '8px 0 0', 
              fontSize: 13, 
              color: '#374151', 
              lineHeight: 1.5,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {doc.summary}
            </p>
          )}
        </div>
        <div style={{ 
          color: '#9ca3af', 
          transform: expanded ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.2s'
        }}>
          ›
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ 
          padding: '0 16px 16px',
          borderTop: '1px solid #f3f4f6'
        }}>
          {doc.summary && (
            <p style={{ 
              margin: '12px 0', 
              fontSize: 13, 
              color: '#374151', 
              lineHeight: 1.6 
            }}>
              {doc.summary}
            </p>
          )}
          
          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => handleAction('deadlines')}
              style={{
                padding: '10px 12px',
                background: '#fefce8',
                border: '1px solid #fef08a',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              <span>⏰</span>
              <span style={{ fontWeight: 500, color: '#92400e', fontSize: 13 }}>What do I need to do?</span>
            </button>
            
            <button
              onClick={() => handleAction('respond')}
              style={{
                padding: '10px 12px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              <span>💬</span>
              <span style={{ fontWeight: 500, color: '#1e40af', fontSize: 13 }}>Help me respond</span>
            </button>

            <button
              onClick={() => handleAction('explain')}
              style={{
                padding: '10px 12px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              <span>📖</span>
              <span style={{ fontWeight: 500, color: '#166534', fontSize: 13 }}>Explain this to me</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}