'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: string; // base64
  preview?: string;
  tag?: string; // e.g., "Exhibit A", "Service Order"
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function DocBuilderPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [caseContext, setCaseContext] = useState<any>(null);
  
  // File management
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showFilePanel, setShowFilePanel] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Generated document
  const [generatedDoc, setGeneratedDoc] = useState<string | null>(null);
  const [docName, setDocName] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      // Load case context
      const { data: caseData } = await supabase
        .from('case_context')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (caseData) setCaseContext(caseData);
      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const fileData = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      newFiles.push({
        id: `file-${Date.now()}-${i}`,
        name: file.name,
        type: file.type,
        size: file.size,
        data: fileData,
        preview: file.type.startsWith('image/') ? fileData : undefined
      });
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const tagFile = (id: string, tag: string) => {
    setUploadedFiles(prev => prev.map(f => 
      f.id === id ? { ...f, tag } : f
    ));
  };

  const handleSend = async () => {
    if (!input.trim() && uploadedFiles.length === 0) return;

    setSending(true);
    const userMessage = input;
    setInput('');

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Build context for API
      const filesContext = uploadedFiles.map(f => ({
        name: f.name,
        type: f.type,
        tag: f.tag,
        // Include base64 for images, truncated text for docs
        data: f.type.startsWith('image/') ? f.data : '[Document uploaded]'
      }));

      const response = await fetch('/api/doc-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
          caseContext,
          files: filesContext,
          uploadedFiles: uploadedFiles.map(f => ({
            id: f.id,
            name: f.name,
            type: f.type,
            tag: f.tag,
            data: f.data
          }))
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response 
      }]);

      // If a document was generated
      if (data.generatedDocument) {
        setGeneratedDoc(data.generatedDocument);
        setDocName(data.documentName || 'document.docx');
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, something went wrong. Please try again.' 
      }]);
    } finally {
      setSending(false);
    }
  };

  const downloadDocument = () => {
    if (!generatedDoc) return;
    
    const link = document.createElement('a');
    link.href = generatedDoc;
    link.download = docName;
    link.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <p style={{ color: '#6b7280' }}>Loading Doc Builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f8faf9',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #1F2937 0%, #1A5F5A 100%)',
        padding: '16px 20px',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Doc Builder</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.8 }}>
            Upload docs • Build filings • Export ready-to-file
          </p>
        </div>
        <button
          onClick={() => setShowFilePanel(!showFilePanel)}
          style={{
            background: 'rgba(255,255,255,0.15)',
            border: 'none',
            padding: '8px 14px',
            borderRadius: 8,
            color: 'white',
            fontSize: 13,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          📁 {uploadedFiles.length} files
        </button>
      </header>

      <div style={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        paddingBottom: 'max(100px, calc(80px + env(safe-area-inset-bottom)))'
      }}>
        {/* File Panel */}
        {showFilePanel && (
          <div style={{
            width: 280,
            background: 'white',
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Upload Area */}
            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: '#EAF5F3',
                  border: '2px dashed #2F9D94',
                  borderRadius: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <span style={{ fontSize: 24 }}>📤</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#2F9D94' }}>
                  Upload Files
                </span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>
                  PDFs, images, docs
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={handleFileUpload}
                hidden
              />
            </div>

            {/* File List */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto',
              padding: 12
            }}>
              {uploadedFiles.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: 24, 
                  color: '#9ca3af' 
                }}>
                  <p style={{ fontSize: 13 }}>No files uploaded yet</p>
                  <p style={{ fontSize: 12, marginTop: 8 }}>
                    Upload court orders, screenshots, prior filings
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {uploadedFiles.map(file => (
                    <div
                      key={file.id}
                      style={{
                        background: '#f9fafb',
                        borderRadius: 10,
                        padding: 12,
                        position: 'relative'
                      }}
                    >
                      {/* Preview for images */}
                      {file.preview && (
                        <div style={{
                          width: '100%',
                          height: 80,
                          marginBottom: 8,
                          borderRadius: 6,
                          overflow: 'hidden',
                          background: '#e5e7eb'
                        }}>
                          <img 
                            src={file.preview} 
                            alt={file.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                        </div>
                      )}
                      
                      {/* File info */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontSize: 20 }}>
                          {file.type.startsWith('image/') ? '🖼️' : 
                           file.type === 'application/pdf' ? '📕' : '📄'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: '#1f2937',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {file.name}
                          </div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            {formatFileSize(file.size)}
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(file.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            fontSize: 16,
                            padding: 4
                          }}
                        >
                          ×
                        </button>
                      </div>

                      {/* Tag input */}
                      <input
                        type="text"
                        placeholder="Tag (e.g., Exhibit A)"
                        value={file.tag || ''}
                        onChange={(e) => tagFile(file.id, e.target.value)}
                        style={{
                          width: '100%',
                          marginTop: 8,
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: 6,
                          fontSize: 12,
                          background: 'white'
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Messages */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            padding: 20
          }}>
            {messages.length === 0 ? (
              <div style={{ 
                maxWidth: 500, 
                margin: '40px auto', 
                textAlign: 'center' 
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>⚖️</div>
                <h2 style={{ 
                  fontSize: 20, 
                  color: '#1f2937', 
                  marginBottom: 12 
                }}>
                  Let's prepare your court documents
                </h2>
                <p style={{ 
                  color: '#6b7280', 
                  fontSize: 14, 
                  lineHeight: 1.6,
                  marginBottom: 24
                }}>
                  Upload your files on the left, then tell me what you need:
                </p>
                
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 10,
                  textAlign: 'left'
                }}>
                  {[
                    "I need a Resolution Statement for my Feb 10 hearing",
                    "Create an Affidavit of Service with these screenshots",
                    "Help me respond to this motion",
                    "Generate a declaration using my evidence"
                  ].map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(suggestion)}
                      style={{
                        padding: '12px 16px',
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: 10,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: 14,
                        color: '#374151'
                      }}
                    >
                      "{suggestion}"
                    </button>
                  ))}
                </div>

                {caseContext && (
                  <div style={{
                    marginTop: 24,
                    padding: 16,
                    background: '#EAF5F3',
                    borderRadius: 12,
                    textAlign: 'left'
                  }}>
                    <div style={{ 
                      fontSize: 12, 
                      fontWeight: 600, 
                      color: '#2F9D94',
                      marginBottom: 8
                    }}>
                      YOUR CASE INFO (auto-filled)
                    </div>
                    <div style={{ fontSize: 13, color: '#374151' }}>
                      {caseContext.case_number && <div>Case #: {caseContext.case_number}</div>}
                      {caseContext.court && <div>Court: {caseContext.court}</div>}
                      {caseContext.state && <div>State: {caseContext.state}</div>}
                      {caseContext.user_role && (
                        <div>You are: {caseContext.user_role === 'petitioner' ? 'Petitioner' : 'Respondent'}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ maxWidth: 700, margin: '0 auto' }}>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: 16,
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      maxWidth: '85%',
                      padding: '14px 18px',
                      borderRadius: msg.role === 'user' 
                        ? '18px 18px 4px 18px' 
                        : '18px 18px 18px 4px',
                      background: msg.role === 'user' ? '#1F2937' : 'white',
                      color: msg.role === 'user' ? 'white' : '#1f2937',
                      boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      whiteSpace: 'pre-wrap',
                      fontSize: 14,
                      lineHeight: 1.6
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div style={{ 
                    padding: '14px 18px',
                    background: 'white',
                    borderRadius: '18px 18px 18px 4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: 'inline-block'
                  }}>
                    <span style={{ color: '#9ca3af' }}>Preparing document...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Generated Document Download */}
          {generatedDoc && (
            <div style={{
              padding: '12px 20px',
              background: '#EAF5F3',
              borderTop: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>📄</span>
                <div>
                  <div style={{ fontWeight: 600, color: '#065f46' }}>{docName}</div>
                  <div style={{ fontSize: 12, color: '#1A5F5A' }}>Ready to download</div>
                </div>
              </div>
              <button
                onClick={downloadDocument}
                style={{
                  padding: '10px 20px',
                  background: '#2F9D94',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Download
              </button>
            </div>
          )}

          {/* Input Area */}
          <div style={{
            padding: '12px 20px',
            background: 'white',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: 12
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="What document do you need?"
              disabled={sending}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: 12,
                fontSize: 15,
                outline: 'none'
              }}
            />
            <button
              onClick={handleSend}
              disabled={sending || (!input.trim() && uploadedFiles.length === 0)}
              style={{
                padding: '12px 24px',
                background: sending ? '#9ca3af' : '#1F2937',
                color: 'white',
                border: 'none',
                borderRadius: 12,
                fontWeight: 600,
                cursor: sending ? 'not-allowed' : 'pointer'
              }}
            >
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      <BottomNav active="docs" />
    </div>
  );
}