'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import MilestonePrompt from '@/components/MilestonePrompt';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  patterns?: string[];
  riskLevel?: string;
}

export default function CoachPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showHome, setShowHome] = useState(true);
  const [caseContext, setCaseContext] = useState<any>(null);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [patternCounts, setPatternCounts] = useState<Record<string, number>>({});
  const [currentPatterns, setCurrentPatterns] = useState<string[]>([]);
  const [currentQuote, setCurrentQuote] = useState<string>('');
  const [currentRiskLevel, setCurrentRiskLevel] = useState<string>('');
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // "Send to Rae" per-message override — keyed by message index, value
  // is 'idle' | 'confirm' | 'sending' | 'sent' | 'error'.
  const [stcStatus, setStcStatus] = useState<Record<number, 'idle' | 'confirm' | 'sending' | 'sent' | 'error'>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);

      const { data: caseData } = await supabase
        .from('case_context')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (caseData) setCaseContext(caseData);

      const { data: evidence } = await supabase
        .from('incidents')
        .select('category')
        .eq('user_id', session.user.id);

      if (evidence) {
        setEvidenceCount(evidence.length);
        const counts: Record<string, number> = {};
        evidence.forEach((e: any) => {
          if (e.category) {
            counts[e.category] = (counts[e.category] || 0) + 1;
          }
        });
        setPatternCounts(counts);

      }

      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  // Auto-send prompt from court orders page
  useEffect(() => {
    if (!loading && user) {
      const prompt = sessionStorage.getItem('coachPrompt');
      if (prompt) {
        sessionStorage.removeItem('coachPrompt');
        handleSend(prompt);
      }
    }
  }, [loading, user]);
  // Auto-send prompt from court orders page
  useEffect(() => {
    if (!loading && user) {
      const prompt = sessionStorage.getItem('coachPrompt');
      if (prompt) {
        sessionStorage.removeItem('coachPrompt');
        handleSend(prompt);
      }
    }
  }, [loading, user]);

  const handleSend = async (messageText?: string, files?: FileList | File[]) => {
    const fileArray = files ? Array.from(files) : pendingFile ? [pendingFile] : [];
    const text = messageText || input || (fileArray.length > 0 ? 'Please analyze this document.' : '');

    if (!text.trim() && fileArray.length === 0) return;
    setPendingFile(null);

    setShowHome(false);
    setSending(true);
    setInput('');
    setCurrentPatterns([]);
    setCurrentQuote('');
    setShowSavePrompt(false);

    const imageUrls: string[] = [];
    for (const file of fileArray) {
      if (file.type.startsWith('image/')) {
        imageUrls.push(URL.createObjectURL(file));
      }
    }

    const userMessage: Message = { 
      role: 'user', 
      content: text || '',
      images: imageUrls.length > 0 ? imageUrls : undefined
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('message', text);
      formData.append('history', JSON.stringify(messages));
      if (caseContext) formData.append('caseContext', JSON.stringify(caseContext));
      formData.append('patternCounts', JSON.stringify(patternCounts));
      formData.append('evidenceCount', String(evidenceCount));
      
      for (const file of fileArray) {
        formData.append('file', file);
      }

      const response = await fetch('/api/coach', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      let assistantContent = '';
      let detectedPatterns: string[] = [];
      let extractedQuote = '';
      let riskLevel = '';
      
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.replaceContent !== undefined) {
                assistantContent = data.replaceContent;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = assistantContent;
                  return newMessages;
                });
              } else if (data.content) {
                assistantContent += data.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = assistantContent;
                  return newMessages;
                });
              }
              // Capture pattern data
              if (data.patternLabels && data.patternLabels.length > 0) {
                detectedPatterns = data.patternLabels;
                setCurrentPatterns(detectedPatterns);
              }
              if (data.extractedQuote) {
                extractedQuote = data.extractedQuote;
                setCurrentQuote(extractedQuote);
              }
              if (data.riskLevel) {
                riskLevel = data.riskLevel;
                setCurrentRiskLevel(riskLevel);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Update the last message with patterns
      if (detectedPatterns.length > 0) {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].patterns = detectedPatterns;
          newMessages[newMessages.length - 1].riskLevel = riskLevel;
          return newMessages;
        });
        setShowSavePrompt(true);
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

  const handleSaveEvidence = async () => {
    if (!user || currentPatterns.length === 0) return;

    try {
      const primaryPattern = currentPatterns[0];
      const categoryKey = primaryPattern.toLowerCase().replace(/[\s\/]+/g, '_').replace(/-/g, '_');
      
      await supabase.from('incidents').insert({
        user_id: user.id,
        title: primaryPattern,
        coparent_message: currentQuote || 'Screenshot analysis',
        category: categoryKey,
        patterns: currentPatterns,
        severity: currentRiskLevel || 'medium',
        incident_date: new Date().toISOString(),
      });

      setEvidenceCount(prev => prev + 1);
      setShowSavePrompt(false);
      setCurrentPatterns([]);
      setCurrentQuote('');
      
      // Brief confirmation
      alert('✓ Saved to evidence');
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save. Please try again.');
    }
  };

  const sendToRae = async (messageIndex: number, content: string) => {
    setStcStatus(prev => ({ ...prev, [messageIndex]: 'sending' }));
    try {
      const res = await fetch('/api/coach-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          intent: 'manual_override',
          pathname: typeof window !== 'undefined' ? window.location.pathname : '/coach',
        }),
      });
      if (!res.ok) {
        setStcStatus(prev => ({ ...prev, [messageIndex]: 'error' }));
        return;
      }
      setStcStatus(prev => ({ ...prev, [messageIndex]: 'sent' }));
    } catch {
      setStcStatus(prev => ({ ...prev, [messageIndex]: 'error' }));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const hasCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
    if (hasCSV) {
      router.push('/evidence/upload');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPendingFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const DOCUMENT_MARKERS = ['SUPERIOR COURT', 'PRETRIAL STATEMENT', 'DECLARATION', 'PROPOSED ORDER', 'FAMILY COURT', 'DISTRICT COURT', 'CIRCUIT COURT', 'PETITION', 'MOTION TO', 'RESPONDENT\'S', 'PETITIONER\'S'];

  const isCourtDocument = (content: string): boolean => {
    const upper = content.toUpperCase();
    return DOCUMENT_MARKERS.some(marker => upper.includes(marker));
  };

  const getDocumentTitle = (content: string): string => {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (line === line.toUpperCase() && line.length > 5 && line.length < 80 && /[A-Z]/.test(line)) {
        if (/(STATEMENT|DECLARATION|ORDER|MOTION|PETITION|RESPONSE)/.test(line)) {
          return line;
        }
      }
    }
    return 'Court Document';
  };

  const handleDocumentDownload = async (content: string) => {
    try {
      const title = getDocumentTitle(content);
      const res = await fetch('/api/coach-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentContent: content,
          documentTitle: title,
          caseContext: caseContext || {},
        }),
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  // Extract the suggested response from assistant message for easy copying
  const getResponseToCopy = (content: string): string | null => {
    // Look for content between common markers
    const lines = content.split('\n').filter(l => l.trim());
    // Usually the actual response is a paragraph that looks like a message
    for (const line of lines) {
      if (line.length > 20 && line.length < 500 && !line.includes('Want it') && !line.includes('?')) {
        return line.trim();
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <style jsx>{`
          .loading { display: flex; align-items: center; justify-content: center; height: 100vh; background: #FAFAF7; }
          .spinner { font-size: 48px; animation: pulse 1.5s infinite; }
          @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <div className="header-left">
          <span className="logo">18</span>
          <div className="header-text">
            <span className="app-name">Pattern18</span>
            <span className="tagline">Your 24/7 Strategic Partner</span>
          </div>
        </div>
        <button className="evidence-badge" onClick={() => router.push('/my-case')}>
          📁 {evidenceCount}
        </button>
      </header>

      <div className="content">
        {showHome ? (
          <div className="home">
            <MilestonePrompt />
            <div className="welcome">
              <div className="heart"></div>
              {(() => {
                const courtDate = caseContext?.next_court_date;
                const daysUntil = courtDate ? Math.ceil((new Date(courtDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                const uniquePatterns = Object.keys(patternCounts).length;

                if (daysUntil && daysUntil > 0) {
                  return (
                    <>
                      <h1>You have {daysUntil} days until your hearing.</h1>
                      <p>What do you need to work on today?</p>
                    </>
                  );
                } else if (evidenceCount > 0) {
                  return (
                    <>
                      <h1>You've documented {evidenceCount} incident{evidenceCount !== 1 ? 's' : ''}{uniquePatterns > 0 ? ` across ${uniquePatterns} pattern${uniquePatterns !== 1 ? 's' : ''}` : ''}.</h1>
                      <p>Ready to add more or generate a document?</p>
                    </>
                  );
                } else {
                  return (
                    <>
                      <h1>Hey, I'm glad you're here.</h1>
                      <p>First time? Tell me what's going on or paste a message you need help with.</p>
                    </>
                  );
                }
              })()}
            </div>
          </div>
        ) : (
          <div className="chat">
            {messages.map((msg, i) => {
              const stc = stcStatus[i] ?? 'idle';
              return (
                <div key={i} className={`message ${msg.role}`}>
                  {msg.images && msg.images.length > 0 && (
                    <div className="message-images">
                      {msg.images.map((url, j) => (
                        <img key={j} src={url} alt="Uploaded" className="message-image" />
                      ))}
                    </div>
                  )}
                  {msg.content && (
                    <div className="message-content">
                      {msg.content}
                    </div>
                  )}
                  {msg.role === 'assistant' && msg.patterns && msg.patterns.length > 0 && (
                    <div className="pattern-section">
                      <div className="pattern-tags">
                        {msg.patterns.map((p, j) => (
                          <span key={j} className={`pattern-tag ${msg.riskLevel || 'medium'}`}>{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.role === 'assistant' && msg.content && isCourtDocument(msg.content) && (
                    <button className="download-doc-btn" onClick={() => handleDocumentDownload(msg.content)}>
                      ⬇ Download as Word Document
                    </button>
                  )}
                  {msg.role === 'user' && msg.content && (
                    <div className="message-actions">
                      {stc === 'idle' && (
                        <button
                          type="button"
                          className="send-to-rae"
                          onClick={() => setStcStatus(prev => ({ ...prev, [i]: 'confirm' }))}
                          aria-label="Send this message to Rae as feedback"
                        >
                          Send to Rae →
                        </button>
                      )}
                      {stc === 'confirm' && (
                        <span className="stc-confirm">
                          <span className="stc-confirm-q">Send to Rae as feedback?</span>
                          <button
                            type="button"
                            className="stc-yes"
                            onClick={() => sendToRae(i, msg.content)}
                          >
                            Send
                          </button>
                          <button
                            type="button"
                            className="stc-no"
                            onClick={() => setStcStatus(prev => ({ ...prev, [i]: 'idle' }))}
                          >
                            Cancel
                          </button>
                        </span>
                      )}
                      {stc === 'sending' && (
                        <button type="button" className="send-to-rae" disabled>
                          Sending…
                        </button>
                      )}
                      {stc === 'sent' && (
                        <button type="button" className="send-to-rae sent" disabled>
                          Sent ✓
                        </button>
                      )}
                      {stc === 'error' && (
                        <button
                          type="button"
                          className="send-to-rae"
                          onClick={() => sendToRae(i, msg.content)}
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {sending && (
              <div className="message assistant">
                <div className="typing">Analyzing...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

      </div>

      {/* Save to Evidence Prompt */}
      {showSavePrompt && currentPatterns.length > 0 && (
        <div className="save-prompt">
          <div className="save-header">
            <span className="save-icon">📋</span>
            <span>{currentPatterns.length} pattern{currentPatterns.length > 1 ? 's' : ''} detected</span>
          </div>
          <div className="save-patterns">
            {currentPatterns.slice(0, 3).map((p, i) => (
              <span key={i} className="save-pattern-tag">{p}</span>
            ))}
          </div>
          <div className="save-actions">
            <button className="save-btn" onClick={handleSaveEvidence}>
              💾 Save to Evidence
            </button>
            <button className="dismiss-btn" onClick={() => setShowSavePrompt(false)}>
              Skip
            </button>
          </div>
        </div>
      )}

      <div className="input-area">
        {pendingFile && (
          <div className="file-preview">
            <span className="file-icon">{pendingFile.type === 'application/pdf' ? '📄' : '🖼️'}</span>
            <span className="file-name">{pendingFile.name.length > 25 ? pendingFile.name.substring(0, 22) + '...' : pendingFile.name}</span>
            <button className="file-remove" onClick={() => setPendingFile(null)}>✕</button>
          </div>
        )}
        <div className="input-row">
          <button className="attach-btn" onClick={() => fileInputRef.current?.click()}>
            📎
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={pendingFile ? "Add a message or hit send..." : "What's going on?"}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={sending}
            aria-describedby="coach-input-helper"
          />
          <button
            className="send-btn"
            onClick={() => handleSend()}
            disabled={sending || (!input.trim() && !pendingFile)}
          >
            ➤
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.csv"
            onChange={handleFileSelect}
            hidden
          />
        </div>
        <p id="coach-input-helper" className="input-helper">
          Paste a message, ask a question, tell me what&rsquo;s broken, anything you need.
        </p>
      </div>

      <BottomNav active="coach" />

      <style jsx>{`
        .container {
          height: 100dvh;
          background: linear-gradient(180deg, #EAF5F3 0%, #FAFAF7 100%);
          display: flex;
          flex-direction: column;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          background: #FAFAF7;
          color: #1F2937;
          border-top: 4px solid #2F9D94;
          border-bottom: 1px solid #C7E4E0;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          background: #2F9D94;
          color: #FAFAF7;
          font-family: 'Fraunces', Georgia, serif;
          font-weight: 800;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: 16px;
        }
        .header-text {
          display: flex;
          flex-direction: column;
        }
        .app-name {
          font-family: 'Fraunces', Georgia, serif;
          font-weight: 700;
          font-size: 17px;
          color: #1F2937;
        }
        .tagline {
          font-size: 11px;
          color: rgba(31, 41, 55, 0.7);
        }
        .evidence-badge {
          background: #EAF5F3;
          border: 1px solid #C7E4E0;
          padding: 8px 14px;
          border-radius: 20px;
          color: #1A5F5A;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        }
        .evidence-badge:hover {
          background: #C7E4E0;
        }
        .content {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 16px;
        }
        .home {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .welcome {
          text-align: center;
          margin-bottom: 24px;
        }
        .heart {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .welcome h1 {
          font-size: 24px;
          color: #1F2937;
          margin: 0 0 12px 0;
        }
        .welcome p {
          color: #4b5563;
          line-height: 1.5;
          margin: 0;
        }
        .chat {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .message {
          margin-bottom: 16px;
        }
        .message.user {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .message.assistant {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .message-images {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 8px;
          justify-content: flex-end;
        }
        .message-image {
          max-width: 200px;
          max-height: 300px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .message.user .message-content {
          background: #1F2937;
          color: white;
          padding: 14px 18px;
          border-radius: 18px 18px 4px 18px;
          max-width: 85%;
          white-space: pre-wrap;
        }
        .message.assistant .message-content {
          background: white;
          color: #1F2937;
          padding: 14px 18px;
          border-radius: 18px 18px 18px 4px;
          max-width: 85%;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .download-doc-btn {
          margin-top: 10px;
          background: #2F9D94;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .pattern-section {
          margin-top: 8px;
        }
        .pattern-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .pattern-tag {
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
        }
        .pattern-tag.low {
          background: #f3f4f6;
          color: #6b7280;
        }
        .pattern-tag.medium {
          background: #fef3c7;
          color: #92400e;
        }
        .pattern-tag.high {
          background: #fed7aa;
          color: #c2410c;
        }
        .pattern-tag.critical {
          background: #fecaca;
          color: #dc2626;
        }
        .typing {
          color: #9ca3af;
          font-style: italic;
          padding: 14px 18px;
          background: white;
          border-radius: 18px;
        }
        .save-prompt {
          margin: 0 16px;
          background: #1F2937;
          flex-shrink: 0;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          z-index: 50;
        }
        .save-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: white;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .save-icon {
          font-size: 20px;
        }
        .save-patterns {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .save-pattern-tag {
          background: rgba(255,255,255,0.2);
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
        }
        .save-actions {
          display: flex;
          gap: 12px;
        }
        .save-btn {
          flex: 1;
          padding: 12px;
          background: #2F9D94;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          font-size: 15px;
        }
        .dismiss-btn {
          padding: 12px 20px;
          background: transparent;
          color: rgba(255,255,255,0.7);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 10px;
          cursor: pointer;
        }
        .input-area {
          display: flex;
          flex-direction: column;
          padding: 10px 16px;
          /* Clearance for fixed BottomNav (~64px content + safe-area) + breathing room */
          padding-bottom: calc(88px + env(safe-area-inset-bottom));
          background: white;
          border-top: 1px solid #e5e7eb;
          flex-shrink: 0;
          gap: 8px;
        }
        .file-preview {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #EAF5F3;
          border: 1px solid #C7E4E0;
          border-radius: 10px;
          padding: 8px 12px;
        }
        .file-icon {
          font-size: 18px;
        }
        .file-name {
          flex: 1;
          font-size: 13px;
          color: #1F2937;
          font-weight: 500;
        }
        .file-remove {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 16px;
          cursor: pointer;
          padding: 2px 6px;
        }
        .input-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .attach-btn {
          background: #f3f4f6;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 22px;
          font-size: 20px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .input-row input[type="text"] {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 24px;
          font-size: 16px;
          outline: none;
        }
        .input-row input[type="text"]:focus {
          border-color: #1F2937;
        }
        .send-btn {
          background: #1F2937;
          color: white;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 22px;
          font-size: 18px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .input-helper {
          font-size: 12px;
          color: #9ca3af;
          margin: 8px 0 0;
          text-align: center;
          line-height: 1.4;
          padding: 0 4px;
        }

        /* Per-message "Send to Rae →" override (Step 5).
           Small, muted text-link bottom-right of each user bubble.
           Visible-on-hover on desktop, always visible on mobile so it
           remains tappable on touch devices without a hover state. */
        .message-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 4px;
          font-size: 12px;
          line-height: 1.3;
          color: #9ca3af;
        }
        .send-to-rae {
          background: none;
          border: none;
          color: #6b7280;
          font: inherit;
          font-size: 12px;
          cursor: pointer;
          padding: 6px 8px;
          border-radius: 6px;
          opacity: 0.55;
          transition: opacity 0.15s, color 0.15s, background 0.15s;
          min-height: 32px;
        }
        .send-to-rae:hover {
          opacity: 1;
          color: #2F9D94;
          background: #EAF5F3;
        }
        .send-to-rae.sent {
          color: #1A5F5A;
          opacity: 1;
          cursor: default;
        }
        .send-to-rae:disabled {
          cursor: not-allowed;
        }
        .stc-confirm {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #EAF5F3;
          border: 1px solid #C7E4E0;
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 12px;
          color: #1F2937;
        }
        .stc-confirm-q {
          color: #1F2937;
          font-weight: 500;
        }
        .stc-yes,
        .stc-no {
          background: none;
          border: none;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          min-height: 32px;
        }
        .stc-yes {
          color: #FAFAF7;
          background: #2F9D94;
        }
        .stc-yes:hover { background: #1A5F5A; }
        .stc-no {
          color: #6b7280;
        }
        .stc-no:hover { color: #1F2937; }
        @media (hover: none) {
          .send-to-rae { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
