'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface CourtDocument {
  id: string;
  title: string;
  type: string;
  file_url: string;
  uploaded_at: string;
  extracted_data: any;
}

interface GeneratedDocument {
  id: string;
  title: string;
  type: string;
  created_at: string;
  content: string;
}

function DocsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showCreate = searchParams.get('create') === 'true';
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'court' | 'generated'>(showCreate ? 'generated' : 'court');
  const [courtDocs, setCourtDocs] = useState<CourtDocument[]>([]);
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Load court documents
      const { data: courtData } = await supabase
        .from('court_documents')
        .select('*')
        .eq('user_id', session.user.id)
        .order('uploaded_at', { ascending: false });

      if (courtData) setCourtDocs(courtData);

      // Load generated documents
      const { data: genData } = await supabase
        .from('generated_documents')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (genData) setGeneratedDocs(genData);

      setLoading(false);
    };
    init();
  }, [router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF or image of your court document');
      return;
    }

    setAnalyzing(true);

    try {
      // Step 1: Send to analyze-order API
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/analyze-order', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Analysis failed (${response.status}): ${errorText}`);
      }

      const extracted = await response.json();

      // Step 2: Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('court-documents')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Step 3: Save document record
      const { data: docData, error: docError } = await supabase
        .from('court_documents')
        .insert({
          user_id: user.id,
          title: extracted.title || file.name,
          type: extracted.type || 'other',
          file_url: fileName,
          extracted_data: extracted,
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (docError) {
        throw new Error(`Database save failed: ${docError.message}`);
      }

      // Update case_context with extracted info
      if (extracted.case_info) {
        const { data: existingCase } = await supabase
          .from('case_context')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const updates: any = { user_id: user.id, updated_at: new Date().toISOString() };
        
        if (extracted.case_info.case_number && !existingCase?.case_number) {
          updates.case_number = extracted.case_info.case_number;
        }
        if (extracted.case_info.court && !existingCase?.court) {
          updates.court = extracted.case_info.court;
        }
        if (extracted.case_info.county && !existingCase?.county) {
          updates.county = extracted.case_info.county;
        }
        if (extracted.case_info.state && !existingCase?.state) {
          updates.state = extracted.case_info.state;
        }
        if (extracted.case_info.petitioner_name && !existingCase?.petitioner_name) {
          updates.petitioner_name = extracted.case_info.petitioner_name;
        }
        if (extracted.case_info.respondent_name && !existingCase?.respondent_name) {
          updates.respondent_name = extracted.case_info.respondent_name;
        }

        await supabase.from('case_context').upsert(updates, { onConflict: 'user_id' });
      }

      if (docData) {
        setCourtDocs([docData, ...courtDocs]);
      }

      alert('Document uploaded and analyzed! Case info updated.');

    } catch (error: any) {
      console.error('Failed to upload document:', error);
      alert(`Upload failed: ${error?.message || error || 'Unknown error'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleViewDocument = async (filePath: string) => {
    // Generate a signed URL that expires in 1 hour
    const { data, error } = await supabase.storage
      .from('court-documents')
      .createSignedUrl(filePath, 3600); // 3600 seconds = 1 hour
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      alert('Could not load document. Please try again.');
    }
  };

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'order': return '⚖️';
      case 'motion': return '📝';
      case 'response': return '↩️';
      case 'declaration': return '✍️';
      default: return '📄';
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner">📄</div>
        <style jsx>{`
          .loading {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #f5f7f6;
          }
          .spinner {
            font-size: 48px;
            animation: pulse 1.5s infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Documents</h1>
      </header>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'court' ? 'active' : ''}`}
          onClick={() => setActiveTab('court')}
        >
          Court Orders
        </button>
        <button 
          className={`tab ${activeTab === 'generated' ? 'active' : ''}`}
          onClick={() => setActiveTab('generated')}
        >
          My Documents
        </button>
      </div>

      <div className="content">
        {/* Court Documents Tab */}
        {activeTab === 'court' && (
          <>
            {/* Upload Section */}
            <div className="upload-card">
              <div className="upload-icon">📤</div>
              <h3>Upload Court Document</h3>
              <p>We'll extract case info and deadlines automatically</p>
              <label className="upload-btn">
                {analyzing ? (
                  <>⏳ Analyzing...</>
                ) : (
                  <>Choose PDF or Image</>
                )}
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileUpload}
                  disabled={analyzing}
                  hidden
                />
              </label>
            </div>

            {/* Document List */}
            {courtDocs.length > 0 ? (
              <div className="docs-list">
                {courtDocs.map((doc) => (
                  <div key={doc.id} className="doc-card">
                    <div className="doc-icon">{getDocIcon(doc.type)}</div>
                    <div className="doc-info">
                      <div className="doc-title">{doc.title}</div>
                      <div className="doc-meta">
                        {doc.type?.toUpperCase()} • {formatDate(doc.uploaded_at)}
                      </div>
                      {doc.extracted_data?.summary && (
                        <div className="doc-summary">{doc.extracted_data.summary}</div>
                      )}
                    </div>
                    <button onClick={() => handleViewDocument(doc.file_url)} className="view-btn">
                      View
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No court documents uploaded yet.</p>
                <p className="hint">Upload your custody order to auto-fill case details.</p>
              </div>
            )}
          </>
        )}

        {/* Generated Documents Tab */}
        {activeTab === 'generated' && (
          <>
            {/* Create New Document */}
            <div className="create-section">
              <h3>Create New Document</h3>
              <p>Generate court-ready documents from your evidence</p>
              <div className="doc-types">
                <button onClick={() => router.push('/evidence/create-document')} className="doc-type-btn">
                  <span className="type-icon">📊</span>
                  <span className="type-name">Pattern Summary</span>
                  <span className="type-desc">Overview of documented patterns</span>
                </button>
                <button onClick={() => router.push('/evidence/create-document?type=timeline')} className="doc-type-btn">
                  <span className="type-icon">📅</span>
                  <span className="type-name">Timeline</span>
                  <span className="type-desc">Chronological incident list</span>
                </button>
                <button onClick={() => router.push('/evidence/create-document?type=declaration')} className="doc-type-btn">
                  <span className="type-icon">✍️</span>
                  <span className="type-name">Declaration</span>
                  <span className="type-desc">Sworn statement draft</span>
                </button>
                <button onClick={() => router.push('/evidence/create-document?type=exhibits')} className="doc-type-btn">
                  <span className="type-icon">📎</span>
                  <span className="type-name">Exhibit Pack</span>
                  <span className="type-desc">Evidence bundle for court</span>
                </button>
              </div>
            </div>

            {/* Generated Documents List */}
            {generatedDocs.length > 0 ? (
              <div className="section">
                <h3>Your Documents</h3>
                <div className="docs-list">
                  {generatedDocs.map((doc) => (
                    <div key={doc.id} className="doc-card">
                      <div className="doc-icon">📄</div>
                      <div className="doc-info">
                        <div className="doc-title">{doc.title}</div>
                        <div className="doc-meta">
                          {doc.type?.toUpperCase()} • {formatDate(doc.created_at)}
                        </div>
                      </div>
                      <button className="view-btn">Open</button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No documents created yet.</p>
                <p className="hint">Generate your first document from your evidence above.</p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav active="docs" />

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #f5f7f6;
          padding-bottom: 100px;
        }
        .header {
          padding: 20px 24px;
          background: #1a3a2f;
          color: white;
        }
        .header h1 {
          font-size: 24px;
          margin: 0;
        }
        .tabs {
          display: flex;
          background: white;
          border-bottom: 1px solid #e5e7eb;
        }
        .tab {
          flex: 1;
          padding: 16px;
          background: none;
          border: none;
          font-size: 15px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          border-bottom: 3px solid transparent;
        }
        .tab.active {
          color: #1a3a2f;
          border-bottom-color: #1a3a2f;
        }
        .content {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .upload-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .upload-icon {
          font-size: 40px;
          margin-bottom: 12px;
        }
        .upload-card h3 {
          margin: 0 0 8px 0;
          color: #1a3a2f;
        }
        .upload-card p {
          margin: 0 0 16px 0;
          color: #6b7280;
          font-size: 14px;
        }
        .upload-btn {
          display: inline-block;
          padding: 14px 28px;
          background: #1a3a2f;
          color: white;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }
        .docs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .doc-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          background: white;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .doc-icon {
          font-size: 28px;
          padding-top: 2px;
        }
        .doc-info {
          flex: 1;
        }
        .doc-title {
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 4px;
        }
        .doc-meta {
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 8px;
        }
        .doc-summary {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.4;
        }
        .view-btn {
          padding: 8px 16px;
          background: #f3f4f6;
          color: #1a3a2f;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
        }
        .view-btn:hover {
          background: #e5e7eb;
        }
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
        }
        .empty-state .hint {
          font-size: 14px;
          color: #9ca3af;
        }
        .create-section {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .create-section h3 {
          margin: 0 0 4px 0;
          color: #1a3a2f;
        }
        .create-section > p {
          margin: 0 0 16px 0;
          color: #6b7280;
          font-size: 14px;
        }
        .doc-types {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .doc-type-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 12px;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
        }
        .doc-type-btn:hover {
          border-color: #1a3a2f;
          background: #f0fdf4;
        }
        .type-icon {
          font-size: 28px;
          margin-bottom: 8px;
        }
        .type-name {
          font-weight: 600;
          color: #1a3a2f;
          font-size: 14px;
          margin-bottom: 4px;
        }
        .type-desc {
          font-size: 11px;
          color: #9ca3af;
        }
        .section {
          margin-top: 24px;
        }
        .section h3 {
          margin: 0 0 16px 0;
          color: #1a3a2f;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}

export default function DocsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f7f6' }}>
        <div style={{ fontSize: '48px', animation: 'pulse 1.5s infinite' }}>📄</div>
      </div>
    }>
      <DocsContent />
    </Suspense>
  );
}