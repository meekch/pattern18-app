'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CaseFileUploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [fileType, setFileType] = useState<'message' | 'finance' | 'court_doc' | 'other'>('message');
  const [dateOfContent, setDateOfContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`Processing ${i + 1} of ${files.length}...`);

        // 1. Upload file to storage
        const filePath = `${session.user.id}/${fileType}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('case-files')
          .upload(filePath, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        // 2. Parse file with AI
        setProgress(`Analyzing ${i + 1} of ${files.length}...`);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('fileType', fileType);
        if (dateOfContent) formData.append('dateOfContent', dateOfContent);

        const parseResponse = await fetch('/api/parse-file', {
          method: 'POST',
          body: formData,
        });

        const parsed = await parseResponse.json();

        // 3. Save to case_files table
        await supabase.from('case_files').insert({
          user_id: session.user.id,
          file_name: file.name,
          file_type: fileType,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          extracted_text: parsed.extractedText || null,
          parsed_data: parsed.parsedData || null,
          message_sender: parsed.sender || null,
          message_date: parsed.messageDate || null,
          quote_text: parsed.quoteText || null,
          is_flagged: parsed.isFlagged || false,
          flag_reason: parsed.flagReason || null,
          date_of_content: dateOfContent || parsed.dateOfContent || new Date().toISOString(),
          event_cluster: parsed.eventCluster || null,
        });
      }

      setProgress('Done!');
      setTimeout(() => router.push('/case-file'), 500);

    } catch (error) {
      console.error('Upload failed:', error);
      setProgress('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <button onClick={() => router.back()} className="back-btn">← Back</button>
        <h1>Add to Case File</h1>
      </header>

      <main className="content">
        {/* File Drop Zone */}
        <div 
          className="dropzone"
          onClick={() => fileInputRef.current?.click()}
        >
          {files.length === 0 ? (
            <>
              <div className="dropzone-icon">📁</div>
              <p>Tap to select files</p>
              <span>Screenshots, PDFs, documents</span>
            </>
          ) : (
            <div className="file-list">
              {files.map((file, i) => (
                <div key={i} className="file-item">
                  <span>{file.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); removeFile(i); }}>×</button>
                </div>
              ))}
              <button className="add-more" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                + Add more
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.txt,.csv"
          onChange={handleFileSelect}
          multiple
          hidden
        />

        {/* File Type */}
        <div className="section">
          <label>What is this?</label>
          <div className="type-grid">
            <button 
              className={`type-btn ${fileType === 'message' ? 'active' : ''}`}
              onClick={() => setFileType('message')}
            >
              <span>📱</span>
              <span>Messages</span>
            </button>
            <button 
              className={`type-btn ${fileType === 'finance' ? 'active' : ''}`}
              onClick={() => setFileType('finance')}
            >
              <span>💰</span>
              <span>Finances</span>
            </button>
            <button 
              className={`type-btn ${fileType === 'court_doc' ? 'active' : ''}`}
              onClick={() => setFileType('court_doc')}
            >
              <span>📋</span>
              <span>Court Doc</span>
            </button>
            <button 
              className={`type-btn ${fileType === 'other' ? 'active' : ''}`}
              onClick={() => setFileType('other')}
            >
              <span>📁</span>
              <span>Other</span>
            </button>
          </div>
        </div>

        {/* Date (optional) */}
        <div className="section">
          <label>Date of document (optional)</label>
          <input
            type="date"
            value={dateOfContent}
            onChange={(e) => setDateOfContent(e.target.value)}
            className="date-input"
          />
          <span className="hint">We'll try to detect the date automatically</span>
        </div>

        {/* Upload Button */}
        <button 
          className="upload-btn"
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
        >
          {uploading ? progress : `Save ${files.length} file${files.length !== 1 ? 's' : ''} to Case File`}
        </button>

        {/* Or talk to coach */}
        <div className="divider">
          <span>or</span>
        </div>

        <button 
          className="coach-btn"
          onClick={() => router.push('/coach')}
        >
          💬 Talk to Coach about this
        </button>
        <span className="hint center">Get help understanding a document before saving</span>
      </main>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #fafafa;
        }

        .header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: white;
          border-bottom: 1px solid #eee;
        }
        .back-btn {
          background: none;
          border: none;
          font-size: 16px;
          color: #6b7280;
          cursor: pointer;
        }
        .header h1 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1a3a2f;
        }

        .content {
          max-width: 500px;
          margin: 0 auto;
          padding: 20px;
        }

        .dropzone {
          background: white;
          border: 2px dashed #d1d5db;
          border-radius: 16px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .dropzone:hover {
          border-color: #1a3a2f;
        }
        .dropzone-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }
        .dropzone p {
          margin: 0;
          font-weight: 600;
          color: #1a3a2f;
        }
        .dropzone span {
          font-size: 14px;
          color: #6b7280;
        }

        .file-list {
          text-align: left;
        }
        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: #f0fdf4;
          border-radius: 8px;
          margin-bottom: 8px;
          font-size: 14px;
          color: #166534;
        }
        .file-item button {
          background: none;
          border: none;
          font-size: 18px;
          color: #166534;
          cursor: pointer;
        }
        .add-more {
          width: 100%;
          padding: 10px;
          background: none;
          border: 1px dashed #d1d5db;
          border-radius: 8px;
          color: #6b7280;
          cursor: pointer;
          font-size: 14px;
        }

        .section {
          margin-top: 24px;
        }
        .section label {
          display: block;
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 10px;
          font-size: 14px;
        }

        .type-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .type-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 14px 8px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          font-size: 12px;
          color: #6b7280;
        }
        .type-btn span:first-child {
          font-size: 24px;
        }
        .type-btn.active {
          border-color: #1a3a2f;
          background: #f0fdf4;
          color: #1a3a2f;
        }

        .date-input {
          width: 100%;
          padding: 12px 14px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 16px;
        }
        .date-input:focus {
          outline: none;
          border-color: #1a3a2f;
        }

        .hint {
          display: block;
          font-size: 12px;
          color: #9ca3af;
          margin-top: 6px;
        }
        .hint.center {
          text-align: center;
        }

        .upload-btn {
          width: 100%;
          padding: 16px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 32px;
        }
        .upload-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 24px 0;
          color: #9ca3af;
          font-size: 14px;
        }
        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }

        .coach-btn {
          width: 100%;
          padding: 14px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          color: #374151;
        }
        .coach-btn:hover {
          border-color: #1a3a2f;
        }
      `}</style>
    </div>
  );
}