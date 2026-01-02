'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface ExtractedData {
  case_number: string | null;
  court_name: string | null;
  county: string | null;
  state: string | null;
  judge_name: string | null;
  petitioner_name: string | null;
  respondent_name: string | null;
  document_type: string | null;
  filing_date: string | null;
  effective_date: string | null;
  key_dates: Array<{ date: string; description: string }> | null;
  custody_arrangement: string | null;
  parenting_time: string | null;
  key_provisions: string[] | null;
  summary: string | null;
}

export default function UploadOrderPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    init();
  }, [router]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('File size must be under 20MB');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress('Uploading document...');

    try {
      setUploadProgress('Analyzing document with AI...');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);

      const response = await fetch('/api/parse-court-order', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to process document');
      }

      setUploadProgress('Document processed successfully!');
      setExtractedData(result.extracted);
      setSuccess(true);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#f8faf9' 
      }}>
        <p style={{ color: '#6b7280' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf9', paddingBottom: 100 }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%)',
        padding: '16px 24px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 16
      }}>
        <button 
          onClick={() => router.push('/docs')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'white', 
            cursor: 'pointer',
            fontSize: 18
          }}
        >
          ←
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Upload Court Order</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.8 }}>
            AI extracts case info automatically
          </p>
        </div>
      </header>

      <main style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
        {!success ? (
          <>
            {/* Upload Zone */}
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                background: dragOver ? '#f0fdf4' : 'white',
                border: `2px dashed ${dragOver ? '#059669' : '#e5e7eb'}`,
                borderRadius: 16,
                padding: 48,
                textAlign: 'center',
                cursor: uploading ? 'wait' : 'pointer',
                transition: 'all 0.2s',
                marginBottom: 24
              }}
            >
              {uploading ? (
                <>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
                  <p style={{ 
                    fontSize: 16, 
                    fontWeight: 600, 
                    color: '#1a3a2f',
                    margin: '0 0 8px' 
                  }}>
                    {uploadProgress}
                  </p>
                  <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                    This may take a moment...
                  </p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                  <p style={{ 
                    fontSize: 16, 
                    fontWeight: 600, 
                    color: '#1a3a2f',
                    margin: '0 0 8px' 
                  }}>
                    Drop your PDF here or tap to browse
                  </p>
                  <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                    Custody orders, parenting plans, court orders
                  </p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {/* Error Message */}
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12,
                padding: 16,
                marginBottom: 24
              }}>
                <p style={{ 
                  margin: 0, 
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span>⚠️</span> {error}
                </p>
              </div>
            )}

            {/* What Gets Extracted */}
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ 
                margin: '0 0 16px', 
                fontSize: 15, 
                fontWeight: 600,
                color: '#374151'
              }}>
                📋 What AI extracts:
              </h3>
              <ul style={{ 
                margin: 0, 
                paddingLeft: 20, 
                color: '#6b7280',
                fontSize: 14,
                lineHeight: 1.8
              }}>
                <li>Case number & court info</li>
                <li>Petitioner & respondent names</li>
                <li>Key dates and deadlines</li>
                <li>Custody & parenting time arrangements</li>
                <li>Important provisions</li>
              </ul>
              <div style={{
                marginTop: 16,
                padding: 12,
                background: '#fefce8',
                borderRadius: 8,
                border: '1px solid #fef08a'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: 13, 
                  color: '#92400e' 
                }}>
                  💡 Extracted info auto-fills your case details for document generation
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Success State */}
            <div style={{
              background: '#f0fdf4',
              border: '2px solid #059669',
              borderRadius: 16,
              padding: 24,
              textAlign: 'center',
              marginBottom: 24
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h2 style={{ 
                margin: '0 0 8px', 
                fontSize: 20, 
                color: '#1a3a2f' 
              }}>
                Document Uploaded!
              </h2>
              <p style={{ 
                margin: 0, 
                fontSize: 14, 
                color: '#059669' 
              }}>
                AI successfully extracted your case information
              </p>
            </div>

            {/* Extracted Data Display */}
            {extractedData && (
              <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: 24
              }}>
                <h3 style={{ 
                  margin: '0 0 16px', 
                  fontSize: 16, 
                  fontWeight: 600,
                  color: '#1a3a2f'
                }}>
                  Extracted Information
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {extractedData.document_type && (
                    <InfoRow label="Document Type" value={extractedData.document_type} />
                  )}
                  {extractedData.case_number && (
                    <InfoRow label="Case Number" value={extractedData.case_number} />
                  )}
                  {extractedData.court_name && (
                    <InfoRow label="Court" value={extractedData.court_name} />
                  )}
                  {(extractedData.county || extractedData.state) && (
                    <InfoRow 
                      label="Location" 
                      value={[extractedData.county, extractedData.state].filter(Boolean).join(', ')} 
                    />
                  )}
                  {extractedData.judge_name && (
                    <InfoRow label="Judge" value={extractedData.judge_name} />
                  )}
                  {extractedData.petitioner_name && (
                    <InfoRow label="Petitioner" value={extractedData.petitioner_name} />
                  )}
                  {extractedData.respondent_name && (
                    <InfoRow label="Respondent" value={extractedData.respondent_name} />
                  )}
                  {extractedData.filing_date && (
                    <InfoRow label="Filing Date" value={formatDate(extractedData.filing_date)} />
                  )}
                  {extractedData.effective_date && (
                    <InfoRow label="Effective Date" value={formatDate(extractedData.effective_date)} />
                  )}
                </div>

                {extractedData.summary && (
                  <div style={{ 
                    marginTop: 16, 
                    padding: 12, 
                    background: '#f9fafb',
                    borderRadius: 8
                  }}>
                    <p style={{ 
                      margin: 0, 
                      fontSize: 13, 
                      color: '#374151',
                      lineHeight: 1.6
                    }}>
                      <strong>Summary:</strong> {extractedData.summary}
                    </p>
                  </div>
                )}

                {extractedData.key_provisions && extractedData.key_provisions.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ 
                      margin: '0 0 8px', 
                      fontSize: 13, 
                      fontWeight: 600,
                      color: '#374151'
                    }}>
                      Key Provisions:
                    </p>
                    <ul style={{ 
                      margin: 0, 
                      paddingLeft: 18, 
                      fontSize: 13,
                      color: '#6b7280',
                      lineHeight: 1.6
                    }}>
                      {extractedData.key_provisions.slice(0, 5).map((provision, i) => (
                        <li key={i}>{provision}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={() => {
                  setSuccess(false);
                  setExtractedData(null);
                  setError(null);
                }}
                style={{
                  padding: '14px 20px',
                  background: '#1a3a2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📄 Upload Another Document
              </button>
              <button
                onClick={() => router.push('/docs')}
                style={{
                  padding: '14px 20px',
                  background: 'white',
                  color: '#1a3a2f',
                  border: '2px solid #1a3a2f',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ← Back to Documents
              </button>
            </div>
          </>
        )}
      </main>

      <BottomNav active="docs" />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between',
      padding: '8px 0',
      borderBottom: '1px solid #f3f4f6'
    }}>
      <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2f' }}>{value}</span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}