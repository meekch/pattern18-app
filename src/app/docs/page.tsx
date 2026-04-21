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
    <div style={{ minHeight: '100vh', background: 'var(--warm-white)', paddingBottom: 'max(100px, calc(80px + env(safe-area-inset-bottom)))' }}>
      <div style={{ height: 4, background: 'var(--teal)' }} />
      {/* Header */}
      <header style={{
        background: 'var(--warm-white)',
        borderBottom: '1px solid var(--teal-border)',
        padding: '20px 24px',
        color: 'var(--charcoal)'
      }}>
        <h1 style={{ margin: 0, fontSize: 26, fontFamily: 'var(--serif)', fontWeight: 700 }}>Documents</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--charcoal-70)', fontSize: 14 }}>Generate court documents & manage uploads</p>
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
            background: activeTab === 'generate' ? '#EAF5F3' : 'white',
            borderBottom: activeTab === 'generate' ? '3px solid #2F9D94' : '3px solid transparent',
            color: activeTab === 'generate' ? '#2F9D94' : '#6b7280',
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
            background: activeTab === 'uploads' ? '#EAF5F3' : 'white',
            borderBottom: activeTab === 'uploads' ? '3px solid #2F9D94' : '3px solid transparent',
            color: activeTab === 'uploads' ? '#2F9D94' : '#6b7280',
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
            {/* Simple intro */}
            <p style={{ 
              textAlign: 'center', 
              color: '#6b7280', 
              marginBottom: 24,
              fontSize: 14
            }}>
              Select incidents in My Case first, then generate your document.
            </p>

            {/* Document type grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
              marginBottom: 20
            }}>
              <DocTypeCard
                icon="📊"
                title="Evidence Packet"
                desc="Professional .docx for court"
                onClick={() => router.push('/generate-exhibit')}
              />
              <DocTypeCard
                icon="✏️"
                title="Declaration"
                desc="Numbered paragraphs under penalty of perjury"
                onClick={() => router.push('/generate-declaration')}
              />
              <DocTypeCard
                icon="📅"
                title="Timeline"
                desc="Chronological list with exhibit numbers"
                onClick={() => router.push('/generate-declaration?type=timeline')}
              />
              <DocTypeCard
                icon="📋"
                title="Exhibit List"
                desc="Formal index of all exhibits"
                onClick={() => router.push('/generate-declaration?type=exhibit_list')}
              />
            </div>

            {/* Go to My Case */}
            <button
              onClick={() => router.push('/evidence')}
              style={{
                width: '100%',
                padding: '14px 20px',
                background: '#1F2937',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Go to My Case to Select Evidence →
            </button>
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
                  background: '#1F2937',
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
    // Build rich context from document
    const context = [
      doc.summary ? `Summary: ${doc.summary}` : '',
      doc.key_provisions?.length ? `Key provisions: ${doc.key_provisions.join('; ')}` : '',
      doc.petitioner_name ? `Filed by: ${doc.petitioner_name}` : '',
      doc.case_number ? `Case #: ${doc.case_number}` : ''
    ].filter(Boolean).join('\n');

    let prompt = '';
    
    if (action === 'deadlines') {
      prompt = `I have this court document: "${doc.title}"\n\n${context}\n\nWhat are my deadlines and what do I need to do?`;
    } else if (action === 'respond') {
      prompt = `I need help responding to this filing: "${doc.title}"\n\n${context}\n\nWhat are my options and help me draft a response strategy.`;
    } else if (action === 'explain') {
      prompt = `Explain this in plain English: "${doc.title}"\n\n${context}`;
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
                background: '#EAF5F3',
                border: '1px solid #C7E4E0',
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

// Simple document type card for generation grid
function DocTypeCard({ 
  icon, 
  title, 
  desc, 
  recommended, 
  onClick 
}: { 
  icon: string; 
  title: string; 
  desc: string; 
  recommended?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'white',
        border: recommended ? '2px solid #2F9D94' : '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 16,
        cursor: 'pointer',
        textAlign: 'left',
        position: 'relative',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}
    >
      {recommended && (
        <span style={{
          position: 'absolute',
          top: -8,
          right: 8,
          background: '#2F9D94',
          color: 'white',
          fontSize: 9,
          padding: '2px 6px',
          borderRadius: 6,
          fontWeight: 700
        }}>
          RECOMMENDED
        </span>
      )}
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 600, color: '#1f2937', fontSize: 14, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{desc}</div>
    </button>
  );
}