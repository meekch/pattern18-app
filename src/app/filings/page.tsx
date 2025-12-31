'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ExtractedCaseInfo {
  title?: string;
  type?: string;
  date_filed?: string;
  summary?: string;
  case_info?: {
    case_number?: string;
    court?: string;
    county?: string;
    state?: string;
    petitioner_name?: string;
    respondent_name?: string;
    judge_name?: string;
  };
  deadlines?: Array<{
    id: string;
    description: string;
    date: string;
    type: string;
  }>;
  tasks?: Array<{
    id: string;
    description: string;
    due_date?: string;
  }>;
  key_requirements?: string[];
  warnings?: string[];
}

interface CourtDocument {
  id: string;
  title: string;
  type: string;
  file_url: string;
  uploaded_at: string;
  extracted_data: ExtractedCaseInfo;
}

export default function FilingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [documents, setDocuments] = useState<CourtDocument[]>([]);
  
  // Extraction flow state
  const [extractedInfo, setExtractedInfo] = useState<ExtractedCaseInfo | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [currentCaseInfo, setCurrentCaseInfo] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Load existing court documents
      const { data: docs } = await supabase
        .from('court_documents')
        .select('*')
        .eq('user_id', session.user.id)
        .order('uploaded_at', { ascending: false });

      if (docs) setDocuments(docs);

      // Load current case info for comparison
      const { data: caseData } = await supabase
        .from('case_context')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (caseData) setCurrentCaseInfo(caseData);

      setLoading(false);
    };
    init();
  }, [router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Only accept PDFs and images
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF or image of your court document');
      return;
    }

    setPendingFile(file);
    setAnalyzing(true);

    try {
      // Send to analyze-order API
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/analyze-order', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Analysis failed');

      const extracted: ExtractedCaseInfo = await response.json();
      setExtractedInfo(extracted);
      setShowConfirmation(true);
    } catch (error) {
      console.error('Failed to analyze document:', error);
      alert('Failed to analyze document. Please try again.');
      setPendingFile(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmAndSave = async () => {
    if (!user || !pendingFile || !extractedInfo) return;
    setUploading(true);

    try {
      // Upload file to Supabase storage
      const fileExt = pendingFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('court-documents')
        .upload(fileName, pendingFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('court-documents')
        .getPublicUrl(fileName);

      // Save document record
      const { data: docData, error: docError } = await supabase
        .from('court_documents')
        .insert({
          user_id: user.id,
          title: extractedInfo.title || pendingFile.name,
          type: extractedInfo.type || 'other',
          file_url: urlData.publicUrl,
          extracted_data: extractedInfo,
          uploaded_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (docError) throw docError;

      // Update case_context with extracted info (only if fields are empty or user confirms)
      const caseInfo = extractedInfo.case_info;
      if (caseInfo) {
        const updates: any = {
          user_id: user.id,
          updated_at: new Date().toISOString(),
        };

        // Only update empty fields (don't overwrite existing data)
        if (caseInfo.case_number && !currentCaseInfo?.case_number) {
          updates.case_number = caseInfo.case_number;
        }
        if (caseInfo.court && !currentCaseInfo?.court) {
          updates.court = caseInfo.court;
        }
        if (caseInfo.county && !currentCaseInfo?.county) {
          updates.county = caseInfo.county;
        }
        if (caseInfo.state && !currentCaseInfo?.state) {
          updates.state = caseInfo.state;
        }
        if (caseInfo.petitioner_name && !currentCaseInfo?.petitioner_name) {
          updates.petitioner_name = caseInfo.petitioner_name;
        }
        if (caseInfo.respondent_name && !currentCaseInfo?.respondent_name) {
          updates.respondent_name = caseInfo.respondent_name;
        }
        if (caseInfo.judge_name && !currentCaseInfo?.judge_name) {
          updates.judge_name = caseInfo.judge_name;
        }

        await supabase.from('case_context').upsert(updates, { onConflict: 'user_id' });
        setCurrentCaseInfo({ ...currentCaseInfo, ...updates });
      }

      // Add to documents list
      if (docData) {
        setDocuments([docData, ...documents]);
      }

      // Reset state
      setShowConfirmation(false);
      setExtractedInfo(null);
      setPendingFile(null);

    } catch (error) {
      console.error('Failed to save document:', error);
      alert('Failed to save document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setExtractedInfo(null);
    setPendingFile(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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

  // Show confirmation modal after extraction
  if (showConfirmation && extractedInfo) {
    return (
      <div className="container">
        <header className="header">
          <button onClick={handleCancel} className="back-btn">← Cancel</button>
          <h1>Review Extracted Info</h1>
        </header>

        <div className="content">
          <div className="success-banner">
            <span className="icon">✨</span>
            <span>Document analyzed successfully!</span>
          </div>

          {/* Document Summary */}
          <div className="card">
            <h2>{extractedInfo.title || 'Court Document'}</h2>
            <div className="doc-type">{extractedInfo.type?.toUpperCase()}</div>
            {extractedInfo.summary && (
              <p className="summary">{extractedInfo.summary}</p>
            )}
          </div>

          {/* Extracted Case Info */}
          {extractedInfo.case_info && (
            <div className="card">
              <h3>📋 Case Information Found</h3>
              <p className="card-desc">We extracted this from your document. It will be saved to your case settings.</p>
              
              <div className="extracted-grid">
                {extractedInfo.case_info.case_number && (
                  <div className="extracted-item">
                    <label>Case Number</label>
                    <span className={currentCaseInfo?.case_number ? 'already-set' : 'new-value'}>
                      {extractedInfo.case_info.case_number}
                      {currentCaseInfo?.case_number && <em>(already set)</em>}
                    </span>
                  </div>
                )}
                {extractedInfo.case_info.court && (
                  <div className="extracted-item">
                    <label>Court</label>
                    <span className={currentCaseInfo?.court ? 'already-set' : 'new-value'}>
                      {extractedInfo.case_info.court}
                      {currentCaseInfo?.court && <em>(already set)</em>}
                    </span>
                  </div>
                )}
                {extractedInfo.case_info.county && (
                  <div className="extracted-item">
                    <label>County</label>
                    <span>{extractedInfo.case_info.county}</span>
                  </div>
                )}
                {extractedInfo.case_info.state && (
                  <div className="extracted-item">
                    <label>State</label>
                    <span>{extractedInfo.case_info.state}</span>
                  </div>
                )}
                {extractedInfo.case_info.petitioner_name && (
                  <div className="extracted-item">
                    <label>Petitioner</label>
                    <span className={currentCaseInfo?.petitioner_name ? 'already-set' : 'new-value'}>
                      {extractedInfo.case_info.petitioner_name}
                    </span>
                  </div>
                )}
                {extractedInfo.case_info.respondent_name && (
                  <div className="extracted-item">
                    <label>Respondent</label>
                    <span className={currentCaseInfo?.respondent_name ? 'already-set' : 'new-value'}>
                      {extractedInfo.case_info.respondent_name}
                    </span>
                  </div>
                )}
                {extractedInfo.case_info.judge_name && (
                  <div className="extracted-item">
                    <label>Judge</label>
                    <span>{extractedInfo.case_info.judge_name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deadlines */}
          {extractedInfo.deadlines && extractedInfo.deadlines.length > 0 && (
            <div className="card">
              <h3>⏰ Deadlines</h3>
              <div className="deadlines-list">
                {extractedInfo.deadlines.map((deadline) => (
                  <div key={deadline.id} className="deadline-item">
                    <div className="deadline-date">{formatDate(deadline.date)}</div>
                    <div className="deadline-desc">{deadline.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {extractedInfo.tasks && extractedInfo.tasks.length > 0 && (
            <div className="card">
              <h3>✅ Action Items</h3>
              <div className="tasks-list">
                {extractedInfo.tasks.map((task) => (
                  <div key={task.id} className="task-item">
                    <span className="task-checkbox">☐</span>
                    <span className="task-desc">{task.description}</span>
                    {task.due_date && (
                      <span className="task-due">Due: {formatDate(task.due_date)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {extractedInfo.warnings && extractedInfo.warnings.length > 0 && (
            <div className="card warning-card">
              <h3>⚠️ Important Warnings</h3>
              <ul>
                {extractedInfo.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <button onClick={handleConfirmAndSave} disabled={uploading} className="save-btn">
              {uploading ? 'Saving...' : 'Save Document & Update Case'}
            </button>
            <button onClick={handleCancel} className="cancel-btn">
              Cancel
            </button>
          </div>
        </div>

        <style jsx>{`
          .container {
            min-height: 100vh;
            background: linear-gradient(180deg, #e8f5e9 0%, #f5f7f6 100%);
            padding-bottom: 100px;
          }
          .header {
            padding: 20px 24px;
            display: flex;
            align-items: center;
            gap: 16px;
            background: #1a3a2f;
            color: white;
          }
          .back-btn {
            background: none;
            border: none;
            font-size: 16px;
            color: white;
            cursor: pointer;
          }
          .header h1 {
            font-size: 20px;
            margin: 0;
          }
          .content {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .success-banner {
            background: #d1fae5;
            color: #065f46;
            padding: 16px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            font-weight: 600;
          }
          .success-banner .icon {
            font-size: 24px;
          }
          .card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          }
          .card h2 {
            font-size: 18px;
            color: #1a3a2f;
            margin: 0 0 8px 0;
          }
          .card h3 {
            font-size: 16px;
            color: #1a3a2f;
            margin: 0 0 12px 0;
          }
          .doc-type {
            display: inline-block;
            background: #e0e7ff;
            color: #3730a3;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 12px;
          }
          .summary {
            color: #4b5563;
            line-height: 1.5;
            margin: 0;
          }
          .card-desc {
            color: #666;
            font-size: 14px;
            margin: 0 0 16px 0;
          }
          .extracted-grid {
            display: grid;
            gap: 12px;
          }
          .extracted-item {
            display: flex;
            justify-content: space-between;
            padding: 12px;
            background: #f9fafb;
            border-radius: 8px;
          }
          .extracted-item label {
            color: #6b7280;
            font-size: 14px;
          }
          .extracted-item span {
            color: #1a3a2f;
            font-weight: 600;
          }
          .extracted-item .new-value {
            color: #059669;
          }
          .extracted-item .already-set {
            color: #9ca3af;
          }
          .extracted-item em {
            font-size: 11px;
            margin-left: 8px;
          }
          .deadlines-list, .tasks-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .deadline-item {
            display: flex;
            gap: 16px;
            padding: 12px;
            background: #fef3c7;
            border-radius: 8px;
          }
          .deadline-date {
            font-weight: 700;
            color: #92400e;
            white-space: nowrap;
          }
          .deadline-desc {
            color: #78350f;
          }
          .task-item {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 12px;
            background: #f0fdf4;
            border-radius: 8px;
          }
          .task-checkbox {
            color: #059669;
            font-size: 18px;
          }
          .task-desc {
            flex: 1;
            color: #1a3a2f;
          }
          .task-due {
            font-size: 12px;
            color: #6b7280;
            white-space: nowrap;
          }
          .warning-card {
            background: #fef2f2;
            border: 1px solid #fecaca;
          }
          .warning-card h3 {
            color: #991b1b;
          }
          .warning-card ul {
            margin: 0;
            padding-left: 20px;
            color: #991b1b;
          }
          .warning-card li {
            margin-bottom: 8px;
          }
          .action-buttons {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 20px;
            background: white;
            border-top: 1px solid #e5e7eb;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 600px;
            margin: 0 auto;
          }
          .save-btn {
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
          .save-btn:disabled {
            opacity: 0.5;
          }
          .cancel-btn {
            width: 100%;
            padding: 14px;
            background: transparent;
            color: #6b7280;
            border: none;
            font-size: 14px;
            cursor: pointer;
          }
        `}</style>
      </div>
    );
  }

  // Main filings page
  return (
    <div className="container">
      <header className="header">
        <button onClick={() => router.push('/case-setup')} className="back-btn">
          ← Back
        </button>
        <h1>Court Documents</h1>
      </header>

      <div className="content">
        {/* Upload Section */}
        <div className="upload-section">
          <div className="upload-icon">📄</div>
          <h2>Upload Court Document</h2>
          <p>Upload your custody order, court filings, or any legal document. We'll extract key information automatically.</p>
          
          <label className="upload-btn">
            {analyzing ? (
              <>
                <span className="analyzing-spinner">⏳</span>
                Analyzing document...
              </>
            ) : (
              <>
                <span>📤</span>
                Choose PDF or Image
              </>
            )}
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileUpload}
              disabled={analyzing}
              hidden
            />
          </label>
          
          <p className="upload-hint">Supported: PDF, JPG, PNG</p>
        </div>

        {/* Document List */}
        {documents.length > 0 && (
          <div className="documents-section">
            <h3>Your Documents</h3>
            <div className="documents-list">
              {documents.map((doc) => (
                <div key={doc.id} className="document-card">
                  <div className="doc-icon">
                    {doc.type === 'order' ? '⚖️' : doc.type === 'motion' ? '📝' : '📄'}
                  </div>
                  <div className="doc-info">
                    <div className="doc-title">{doc.title}</div>
                    <div className="doc-meta">
                      {doc.type?.toUpperCase()} • {formatDate(doc.uploaded_at)}
                    </div>
                  </div>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="view-btn">
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {documents.length === 0 && !analyzing && (
          <div className="empty-state">
            <p>No documents uploaded yet.</p>
            <p className="hint">Upload your custody order to auto-fill your case information and get personalized help.</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(180deg, #e8f5e9 0%, #f5f7f6 100%);
        }
        .header {
          padding: 20px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          background: #1a3a2f;
          color: white;
        }
        .back-btn {
          background: none;
          border: none;
          font-size: 16px;
          color: white;
          cursor: pointer;
        }
        .header h1 {
          font-size: 20px;
          margin: 0;
        }
        .content {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .upload-section {
          background: white;
          border-radius: 16px;
          padding: 32px 24px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          margin-bottom: 24px;
        }
        .upload-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .upload-section h2 {
          font-size: 20px;
          color: #1a3a2f;
          margin: 0 0 8px 0;
        }
        .upload-section p {
          color: #6b7280;
          margin: 0 0 24px 0;
          line-height: 1.5;
        }
        .upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 16px 32px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .upload-btn:hover {
          background: #2d4a3f;
        }
        .analyzing-spinner {
          animation: spin 1s infinite linear;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .upload-hint {
          font-size: 13px;
          color: #9ca3af;
          margin-top: 12px;
        }
        .documents-section {
          margin-top: 24px;
        }
        .documents-section h3 {
          font-size: 16px;
          color: #1a3a2f;
          margin: 0 0 16px 0;
        }
        .documents-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .document-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: white;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        .doc-icon {
          font-size: 24px;
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
        }
        .view-btn {
          padding: 8px 16px;
          background: #f3f4f6;
          color: #1a3a2f;
          border-radius: 8px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
        }
        .view-btn:hover {
          background: #e5e7eb;
        }
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #9ca3af;
        }
        .empty-state .hint {
          font-size: 14px;
          max-width: 300px;
          margin: 8px auto 0;
        }
      `}</style>
    </div>
  );
}