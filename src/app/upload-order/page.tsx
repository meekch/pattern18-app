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
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'analyzing' | 'saving'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [fileName, setFileName] = useState<string>('');

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

    setFileName(file.name);
    setUploading(true);
    setError(null);
    setUploadStep('uploading');

    try {
      await new Promise(r => setTimeout(r, 500));
      setUploadStep('analyzing');
      
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

      setUploadStep('saving');
      await new Promise(r => setTimeout(r, 300));
      
      setExtractedData(result.extracted);
      setSuccess(true);

    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
      setUploadStep('idle');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
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
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Upload Court Order</h1>
      </header>

      <main style={{ maxWidth: 500, margin: '0 auto', padding: 24 }}>
        {!success ? (
          <>
            {/* Upload State */}
            {uploading ? (
              <div style={{
                background: 'white',
                borderRadius: 16,
                padding: 40,
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}>
                <div style={{ 
                  width: 60, 
                  height: 60, 
                  margin: '0 auto 20px',
                  border: '4px solid #e5e7eb',
                  borderTopColor: '#059669',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <p style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: '#1a3a2f',
                  margin: '0 0 8px' 
                }}>
                  {uploadStep === 'uploading' && 'Uploading...'}
                  {uploadStep === 'analyzing' && 'AI is reading your document...'}
                  {uploadStep === 'saving' && 'Saving to your case...'}
                </p>
                <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                  {fileName}
                </p>
                <style jsx>{`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            ) : (
              <>
                {/* Big Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 16,
                    padding: '32px 24px',
                    cursor: 'pointer',
                    marginBottom: 16,
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 12 }}>+</div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                    Tap to Select PDF
                  </div>
                  <div style={{ fontSize: 14, opacity: 0.9 }}>
                    Custody orders, parenting plans, court filings
                  </div>
                </button>

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
                    marginBottom: 16
                  }}>
                    <p style={{ margin: 0, color: '#dc2626', fontSize: 14 }}>
                      {error}
                    </p>
                  </div>
                )}

                {/* What happens */}
                <div style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 20,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}>
                  <h3 style={{ 
                    margin: '0 0 12px', 
                    fontSize: 14, 
                    fontWeight: 600,
                    color: '#374151'
                  }}>
                    What happens next:
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Step num={1} text="AI reads your document" />
                    <Step num={2} text="Extracts case number, parties, dates" />
                    <Step num={3} text="Auto-fills your case details" />
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* Success State */}
            <div style={{
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              borderRadius: 16,
              padding: 32,
              textAlign: 'center',
              marginBottom: 20,
              color: 'white'
            }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
              <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>Document Saved!</h2>
              <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>{fileName}</p>
            </div>

            {/* Extracted Data */}
            {extractedData && (
              <div style={{
                background: 'white',
                borderRadius: 12,
                padding: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                marginBottom: 20
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#1a3a2f' }}>
                  Extracted Info
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {extractedData.document_type && (
                    <InfoRow label="Type" value={extractedData.document_type} />
                  )}
                  {extractedData.case_number && (
                    <InfoRow label="Case #" value={extractedData.case_number} />
                  )}
                  {extractedData.court_name && (
                    <InfoRow label="Court" value={extractedData.court_name} />
                  )}
                  {extractedData.petitioner_name && (
                    <InfoRow label="Petitioner" value={extractedData.petitioner_name} />
                  )}
                  {extractedData.respondent_name && (
                    <InfoRow label="Respondent" value={extractedData.respondent_name} />
                  )}
                  {extractedData.filing_date && (
                    <InfoRow label="Filed" value={formatDate(extractedData.filing_date)} />
                  )}
                </div>
                {extractedData.summary && (
                  <p style={{ 
                    margin: '16px 0 0', 
                    padding: 12,
                    background: '#f9fafb',
                    borderRadius: 8,
                    fontSize: 13, 
                    color: '#374151',
                    lineHeight: 1.5
                  }}>
                    {extractedData.summary}
                  </p>
                )}
              </div>
            )}

            {/* Smart Next Steps */}
            <div style={{
              background: 'white',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              marginBottom: 20
            }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#374151' }}>
                What would you like to do?
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={() => {
                    const context = [
                      extractedData?.document_type ? `Document: ${extractedData.document_type}` : '',
                      extractedData?.summary ? `Summary: ${extractedData.summary}` : '',
                      extractedData?.key_provisions?.length ? `Key provisions: ${extractedData.key_provisions.join('; ')}` : '',
                      extractedData?.petitioner_name ? `Filed by: ${extractedData.petitioner_name}` : ''
                    ].filter(Boolean).join('\n');
                    const prompt = `I just uploaded this court document:\n\n${context}\n\nWhat are my deadlines and what do I need to do?`;
                    sessionStorage.setItem('coachPrompt', prompt);
                    router.push('/coach');
                  }}
                  style={{
                    padding: '14px 16px',
                    background: '#fefce8',
                    border: '1px solid #fef08a',
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <span style={{ fontSize: 20 }}>⏰</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#92400e', fontSize: 14 }}>What do I need to do?</div>
                    <div style={{ fontSize: 12, color: '#a16207' }}>Deadlines, requirements, next steps</div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    const context = [
                      extractedData?.document_type ? `Document: ${extractedData.document_type}` : '',
                      extractedData?.summary ? `Summary: ${extractedData.summary}` : '',
                      extractedData?.key_provisions?.length ? `Key provisions: ${extractedData.key_provisions.join('; ')}` : '',
                      extractedData?.petitioner_name ? `Filed by: ${extractedData.petitioner_name}` : ''
                    ].filter(Boolean).join('\n');
                    const prompt = `I need help responding to this filing:\n\n${context}\n\nWhat are my options and help me with response strategy.`;
                    sessionStorage.setItem('coachPrompt', prompt);
                    router.push('/coach');
                  }}
                  style={{
                    padding: '14px 16px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <span style={{ fontSize: 20 }}>💬</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1e40af', fontSize: 14 }}>Help me respond</div>
                    <div style={{ fontSize: 12, color: '#3b82f6' }}>Get guidance on how to reply</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    const context = [
                      extractedData?.document_type ? `Document: ${extractedData.document_type}` : '',
                      extractedData?.summary ? `Summary: ${extractedData.summary}` : '',
                      extractedData?.key_provisions?.length ? `Key provisions: ${extractedData.key_provisions.join('; ')}` : ''
                    ].filter(Boolean).join('\n');
                    const prompt = `Explain this in plain English:\n\n${context}`;
                    sessionStorage.setItem('coachPrompt', prompt);
                    router.push('/coach');
                  }}
                  style={{
                    padding: '14px 16px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <span style={{ fontSize: 20 }}>📖</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#166534', fontSize: 14 }}>Explain this to me</div>
                    <div style={{ fontSize: 12, color: '#22c55e' }}>Plain English translation</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Secondary Actions */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  setSuccess(false);
                  setExtractedData(null);
                  setError(null);
                  setFileName('');
                }}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Upload Another
              </button>
              <button
                onClick={() => router.push('/docs')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </>
        )}
      </main>

      <BottomNav active="docs" />
    </div>
  );
}

function Step({ num, text }: { num: number; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: '#e0f2e9',
        color: '#059669',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700
      }}>
        {num}
      </div>
      <span style={{ fontSize: 14, color: '#4b5563' }}>{text}</span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between',
      padding: '6px 0',
      borderBottom: '1px solid #f3f4f6'
    }}>
      <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: '#1a3a2f', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}