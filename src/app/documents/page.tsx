"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/layout/AppLayout";

interface CaseInfo {
  user_role: string;
  user_legal_name: string;
  coparent_legal_name: string;
  case_number: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const [caseInfo, setCaseInfo] = useState<CaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [myDocs, setMyDocs] = useState<any[]>([]);
  const [theirDocs, setTheirDocs] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Load case info
      const { data: caseData } = await supabase
        .from("user_cases")
        .select("*")
        .eq("user_id", session.user.id)
        .single();
      
      if (caseData) {
        setCaseInfo(caseData);
      }

      // Load documents
      const { data: generatedDocs } = await supabase
        .from("generated_documents")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      
      if (generatedDocs) {
        setMyDocs(generatedDocs);
      }

      const { data: opposingDocs } = await supabase
        .from("opposing_filings")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      
      if (opposingDocs) {
        setTheirDocs(opposingDocs);
      }

      setLoading(false);
    };
    load();
  }, [router]);

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
      <div className="documents-page">
        <div className="page-header">
          <h1>📄 Documents</h1>
          <p>Generate court documents and manage filings</p>
        </div>

        {/* Case setup warning */}
        {!caseInfo && (
          <div className="warning-banner">
            <span>⚠️</span>
            <div>
              <strong>Case Setup Required</strong>
              <p>Set up your case information before generating court documents.</p>
            </div>
            <button onClick={() => router.push("/case-setup")}>Set Up Now</button>
          </div>
        )}

        {/* Generate New Section */}
        <section className="section">
          <h2>Generate New Document</h2>
          <div className="doc-types">
            <button className="doc-type-card" onClick={() => router.push("/court-docs/respond")}>
              <div className="doc-icon">📩</div>
              <div className="doc-info">
                <h3>Response to Filing</h3>
                <p>Respond to their motion or petition with your evidence</p>
              </div>
              <span className="arrow">→</span>
            </button>

            <button className="doc-type-card" onClick={() => router.push("/court-docs/motion")}>
              <div className="doc-icon">📋</div>
              <div className="doc-info">
                <h3>Motion / Petition</h3>
                <p>Create your own motion with supporting exhibits</p>
              </div>
              <span className="arrow">→</span>
            </button>

            <button className="doc-type-card" onClick={() => router.push("/court-docs/exhibit")}>
              <div className="doc-icon">📎</div>
              <div className="doc-info">
                <h3>Exhibit Package</h3>
                <p>Bundle evidence into court-ready exhibits</p>
              </div>
              <span className="arrow">→</span>
            </button>

            <button className="doc-type-card" onClick={() => router.push("/court-docs/summary")}>
              <div className="doc-icon">📊</div>
              <div className="doc-info">
                <h3>Pattern Summary</h3>
                <p>Generate a report showing behavior patterns</p>
              </div>
              <span className="arrow">→</span>
            </button>
          </div>
        </section>

        {/* Their Filings */}
        <section className="section">
          <div className="section-header">
            <h2>Their Filings</h2>
            <button className="upload-btn" onClick={() => router.push("/documents/theirs/upload")}>
              + Upload Filing
            </button>
          </div>
          
          {theirDocs.length === 0 ? (
            <div className="empty-state">
              <p>No opposing filings uploaded yet.</p>
              <button onClick={() => router.push("/documents/theirs/upload")}>
                Upload Their Filing
              </button>
            </div>
          ) : (
            <div className="docs-list">
              {theirDocs.map((doc) => (
                <div key={doc.id} className="doc-item">
                  <div className="doc-item-icon">📥</div>
                  <div className="doc-item-info">
                    <h4>{doc.title}</h4>
                    <span className="doc-meta">
                      {doc.filing_type} • {new Date(doc.filing_date || doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {doc.response_due && !doc.response_filed && (
                    <span className="deadline-badge">
                      Due: {new Date(doc.response_due).toLocaleDateString()}
                    </span>
                  )}
                  <button className="respond-btn" onClick={() => router.push(`/court-docs/respond?filing=${doc.id}`)}>
                    Respond
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* My Documents */}
        <section className="section">
          <div className="section-header">
            <h2>My Documents</h2>
          </div>
          
          {myDocs.length === 0 ? (
            <div className="empty-state">
              <p>No documents generated yet. Create your first document above.</p>
            </div>
          ) : (
            <div className="docs-list">
              {myDocs.map((doc) => (
                <div key={doc.id} className="doc-item">
                  <div className="doc-item-icon">📄</div>
                  <div className="doc-item-info">
                    <h4>{doc.title}</h4>
                    <span className="doc-meta">
                      {doc.document_type} • {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <button className="download-btn">Download</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .documents-page {
          max-width: 900px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 32px;
        }
        .page-header h1 {
          margin: 0 0 8px;
          font-size: 28px;
          color: #1a3a2f;
        }
        .page-header p {
          margin: 0;
          color: #666;
        }

        .warning-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #fff3cd;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 32px;
        }
        .warning-banner span {
          font-size: 24px;
        }
        .warning-banner strong {
          display: block;
          color: #856404;
        }
        .warning-banner p {
          margin: 4px 0 0;
          font-size: 13px;
          color: #856404;
        }
        .warning-banner button {
          margin-left: auto;
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          white-space: nowrap;
        }

        .section {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .section h2 {
          margin: 0 0 16px;
          font-size: 18px;
          color: #333;
        }
        .section-header h2 {
          margin: 0;
        }
        .upload-btn {
          background: #f0f9f6;
          border: 1px solid #2dd4a8;
          color: #1a3a2f;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
        }

        .doc-types {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .doc-type-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: #f8f9fa;
          border: 1px solid #eee;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }
        .doc-type-card:hover {
          border-color: #2dd4a8;
          background: #f0f9f6;
        }
        .doc-icon {
          font-size: 28px;
        }
        .doc-info {
          flex: 1;
        }
        .doc-info h3 {
          margin: 0 0 4px;
          font-size: 15px;
          color: #1a3a2f;
        }
        .doc-info p {
          margin: 0;
          font-size: 13px;
          color: #666;
        }
        .arrow {
          font-size: 20px;
          color: #2dd4a8;
        }

        .empty-state {
          text-align: center;
          padding: 32px;
          color: #666;
        }
        .empty-state button {
          margin-top: 12px;
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
        }

        .docs-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .doc-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border: 1px solid #eee;
          border-radius: 10px;
        }
        .doc-item-icon {
          font-size: 24px;
        }
        .doc-item-info {
          flex: 1;
        }
        .doc-item-info h4 {
          margin: 0 0 4px;
          font-size: 14px;
          color: #333;
        }
        .doc-meta {
          font-size: 12px;
          color: #999;
        }
        .deadline-badge {
          background: #fee2e2;
          color: #dc2626;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 10px;
          font-weight: 500;
        }
        .respond-btn {
          background: #2dd4a8;
          color: #1a3a2f;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }
        .download-btn {
          background: none;
          border: 1px solid #ddd;
          color: #666;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
        }
      `}</style>
    </AppLayout>
  );
}