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

      // Load court documents
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
          ✨ Generate Documents
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
          📁 Court Orders ({courtDocs.length})
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
                      💡 HOW TO USE:
                    </div>
                    <ol style={{ margin: 0, paddingLeft: 18, color: '#a16207', fontSize: 13, lineHeight: 1.7 }}>
                      <li>Go to Evidence and check the boxes next to your strongest incidents</li>
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
                    📥 Generate Exhibit Packet
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
                  background: '#ede9fe',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  flexShrink: 0
                }}>
                  ✍️
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
                      <li><strong>Declaration</strong> – Numbered paragraphs under penalty of perjury</li>
                      <li><strong>Timeline</strong> – Chronological list with exhibit numbers</li>
                      <li><strong>Pattern Summary</strong> – Analysis grouped by abuse type</li>
                      <li><strong>Exhibit List</strong> – Formal index of all exhibits</li>
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
                      💡 HOW TO USE:
                    </div>
                    <ol style={{ margin: 0, paddingLeft: 18, color: '#a16207', fontSize: 13, lineHeight: 1.7 }}>
                      <li>Select incidents from Evidence (check the boxes)</li>
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
                      background: '#7c3aed',
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
                    ✍️ Write Declaration
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
                QUICK ACTIONS
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => router.push('/evidence')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#374151'
                  }}
                >
                  📋 Select Evidence
                </button>
                <button
                  onClick={() => router.push('/my-case')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#374151'
                  }}
                >
                  📊 View Dashboard
                </button>
              </div>
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
                  <div
                    key={doc.id}
                    style={{
                      background: 'white',
                      borderRadius: 12,
                      padding: 16,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ fontSize: 24 }}>📄</div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: 15, color: '#1f2937' }}>{doc.title}</h3>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                          {doc.type} • Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                        {doc.summary && (
                          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                            {doc.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
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