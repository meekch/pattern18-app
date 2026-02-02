'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

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

  const topPattern = Object.entries(patternCounts).sort((a, b) => b[1] - a[1])[0];

  const handleSend = async (messageText?: string, files?: FileList | File[]) => {
    const text = messageText || input;
    const fileArray = files ? Array.from(files) : [];
    
    if (!text.trim() && fileArray.length === 0) return;

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
              if (data.content) {
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

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'screenshot':
        fileInputRef.current?.click();
        break;
      case 'import':
        router.push('/evidence/upload');
        break;
      case 'courtdoc':
        router.push('/docs');
        break;
      case 'moment':
        router.push('/healing');
        break;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const hasCSV = Array.from(files).some(f => f.type === 'text/csv' || f.name.endsWith('.csv'));
    if (hasCSV) {
      router.push('/evidence/upload');
      return;
    }

    await handleSend('', files);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast notification here
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
        <div className="spinner">💚</div>
        <style jsx>{`
          .loading { display: flex; align-items: center; justify-content: center; height: 100vh; background: #f5f7f6; }
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
            <span className="app-name">Pattern 18</span>
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
            <div className="welcome">
              <div className="heart">💚</div>
              <h1>Hey, I'm glad you're here.</h1>
              <p>Whether you just got a message that made your stomach drop, need help with a court document, or simply need a moment to breathe - I've got you.</p>
            </div>

            {evidenceCount > 0 && (
              <div className="stats-bar">
                <div className="stat">
                  <span className="stat-num">{evidenceCount}</span>
                  <span className="stat-label">DOCUMENTED</span>
                </div>
                <div className="stat-divider" />
                <div className="stat">
                  <span className="stat-num">{Object.keys(patternCounts).length}</span>
                  <span className="stat-label">PATTERNS</span>
                </div>
                {topPattern && (
                  <>
                    <div className="stat-divider" />
                    <div className="stat">
                      <span className="stat-pattern">{topPattern[0].replace(/_/g, ' ')}</span>
                      <span className="stat-label">TOP ({topPattern[1]}x)</span>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="quick-actions">
              <h3>WHAT DO YOU NEED?</h3>
              
              <button className="action-btn primary" onClick={() => handleQuickAction('screenshot')}>
                <span className="action-icon">📸</span>
                <div className="action-text">
                  <span className="action-title">I just got a message</span>
                  <span className="action-desc">Upload screenshot, get help responding</span>
                </div>
              </button>

              <button className="action-btn" onClick={() => handleQuickAction('courtdoc')}>
                <span className="action-icon">📄</span>
                <div className="action-text">
                  <span className="action-title">Court document help</span>
                  <span className="action-desc">Upload, understand, prepare filings</span>
                </div>
              </button>

              <button className="action-btn" onClick={() => handleQuickAction('import')}>
                <span className="action-icon">📤</span>
                <div className="action-text">
                  <span className="action-title">Import message history</span>
                  <span className="action-desc">Bulk analyze exported messages</span>
                </div>
              </button>

              <button className="action-btn" onClick={() => handleQuickAction('moment')}>
                <span className="action-icon">🌿</span>
                <div className="action-text">
                  <span className="action-title">I need a moment</span>
                  <span className="action-desc">Breathing, grounding, support</span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="chat">
            {messages.map((msg, i) => (
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
              </div>
            ))}
            {sending && (
              <div className="message assistant">
                <div className="typing">Analyzing...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

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
      </div>

      <div className="input-area">
        <button className="attach-btn" onClick={() => fileInputRef.current?.click()}>
          📎
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What's going on?"
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={sending}
        />
        <button 
          className="send-btn" 
          onClick={() => handleSend()}
          disabled={sending || !input.trim()}
        >
          ➤
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.csv"
          multiple
          onChange={handleFileSelect}
          hidden
        />
      </div>

      <BottomNav active="coach" />

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(180deg, #e8f5e9 0%, #f5f7f6 100%);
          display: flex;
          flex-direction: column;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #1a3a2f;
          color: white;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          background: white;
          color: #1a3a2f;
          font-weight: 800;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 14px;
        }
        .header-text {
          display: flex;
          flex-direction: column;
        }
        .app-name {
          font-weight: 700;
          font-size: 16px;
        }
        .tagline {
          font-size: 11px;
          opacity: 0.8;
        }
        .evidence-badge {
          background: rgba(255,255,255,0.15);
          border: none;
          padding: 8px 14px;
          border-radius: 20px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        }
        .content {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 140px;
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
          color: #1a3a2f;
          margin: 0 0 12px 0;
        }
        .welcome p {
          color: #4b5563;
          line-height: 1.5;
          margin: 0;
        }
        .stats-bar {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          background: white;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .stat {
          text-align: center;
        }
        .stat-num {
          display: block;
          font-size: 24px;
          font-weight: 800;
          color: #1a3a2f;
        }
        .stat-pattern {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #1a3a2f;
          text-transform: capitalize;
        }
        .stat-label {
          font-size: 10px;
          color: #9ca3af;
          letter-spacing: 0.5px;
        }
        .stat-divider {
          width: 1px;
          height: 40px;
          background: #e5e7eb;
        }
        .quick-actions {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .quick-actions h3 {
          text-align: center;
          font-size: 12px;
          letter-spacing: 1px;
          color: #6b7280;
          margin: 0 0 16px 0;
        }
        .action-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
          padding: 16px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          margin-bottom: 12px;
          transition: all 0.2s;
        }
        .action-btn:last-child {
          margin-bottom: 0;
        }
        .action-btn:hover {
          border-color: #1a3a2f;
          background: #f0fdf4;
        }
        .action-btn.primary {
          background: #f0fdf4;
          border-color: #1a3a2f;
        }
        .action-icon {
          font-size: 28px;
        }
        .action-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .action-title {
          font-weight: 600;
          color: #1a3a2f;
        }
        .action-desc {
          font-size: 13px;
          color: #9ca3af;
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
          background: #1a3a2f;
          color: white;
          padding: 14px 18px;
          border-radius: 18px 18px 4px 18px;
          max-width: 85%;
          white-space: pre-wrap;
        }
        .message.assistant .message-content {
          background: white;
          color: #1a3a2f;
          padding: 14px 18px;
          border-radius: 18px 18px 18px 4px;
          max-width: 85%;
          line-height: 1.6;
          white-space: pre-wrap;
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
          position: fixed;
          bottom: 130px;
          left: 16px;
          right: 16px;
          background: #1a3a2f;
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
          background: #059669;
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
          position: fixed;
          bottom: 70px;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: white;
          border-top: 1px solid #e5e7eb;
        }
        .attach-btn {
          background: #f3f4f6;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 22px;
          font-size: 20px;
          cursor: pointer;
        }
        .input-area input[type="text"] {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 24px;
          font-size: 16px;
          outline: none;
        }
        .input-area input[type="text"]:focus {
          border-color: #1a3a2f;
        }
        .send-btn {
          background: #1a3a2f;
          color: white;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 22px;
          font-size: 18px;
          cursor: pointer;
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
