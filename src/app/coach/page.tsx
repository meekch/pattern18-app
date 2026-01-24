'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  patterns?: string[];
  hasImage?: boolean;
  fileNames?: string[];
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
  const [patternCounts, setPatternCounts] = useState<Record<string, number>>({});
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [detectedPatterns, setDetectedPatterns] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
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

  const topPattern = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])[0];

  const handleSend = async () => {
    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;

    setShowHome(false);
    setSending(true);
    setInput('');
    setDetectedPatterns([]);

    const fileNames = pendingFiles.map(f => f.name);
    const userMessage: Message = { 
      role: 'user', 
      content: text || `[Uploaded ${pendingFiles.length} file${pendingFiles.length > 1 ? 's' : ''}]`,
      hasImage: pendingFiles.some(f => f.type.startsWith('image/')),
      fileNames: fileNames.length > 0 ? fileNames : undefined
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('message', text);
      formData.append('history', JSON.stringify(messages));
      if (caseContext) formData.append('caseContext', JSON.stringify(caseContext));
      formData.append('patternCounts', JSON.stringify(patternCounts));
      formData.append('evidenceCount', String(evidenceCount));
      
      // Append all files
      pendingFiles.forEach((file, i) => {
        formData.append(`file${i}`, file);
      });
      formData.append('fileCount', String(pendingFiles.length));

      // Clear pending files
      setPendingFiles([]);

      const response = await fetch('/api/coach', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      let assistantContent = '';
      let patterns: string[] = [];
      
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantContent += data.content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = assistantContent;
                  return newMessages;
                });
              }
              if (data.patterns) {
                patterns = data.patterns;
                setDetectedPatterns(patterns);
              }
            } catch (e) {}
          }
        }
      }

      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].patterns = patterns;
        return newMessages;
      });

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Check for CSV - redirect to bulk import
    const hasCSV = Array.from(files).some(f => f.type === 'text/csv' || f.name.endsWith('.csv'));
    if (hasCSV) {
      router.push('/evidence/upload');
      return;
    }

    // Add files to pending (images and PDFs allowed)
    const validFiles = Array.from(files).filter(f => 
      f.type.startsWith('image/') || f.type === 'application/pdf'
    );
    
    setPendingFiles(prev => [...prev, ...validFiles]);
    
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveEvidence = async () => {
    if (messages.length < 2 || !detectedPatterns.length) return;

    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

    if (!lastUserMsg || !lastAssistantMsg) return;

    try {
      const primaryPattern = detectedPatterns[0] || 'Uncategorized';
      const categoryKey = primaryPattern.toLowerCase().replace(/[\s\/]+/g, '_').replace(/-/g, '_');
      
      await supabase.from('incidents').insert({
        user_id: user.id,
        title: primaryPattern,
        coparent_message: lastUserMsg.content,
        category: categoryKey,
        patterns: detectedPatterns,
        severity: detectedPatterns.some(p => 
          ['threats', 'intimidation', 'stalking', 'monitoring', 'financial_abuse'].includes(p.toLowerCase().replace(/[\s\/]+/g, '_'))
        ) ? 'high' : 'medium',
        incident_date: new Date().toISOString(),
      });

      alert('Saved to evidence!');
      setDetectedPatterns([]);
      setEvidenceCount(prev => prev + 1);
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save. Please try again.');
    }
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
              <h1>Hey, I am glad you are here.</h1>
              <p>Whether you just got a message that made your stomach drop, need help with a court document, or simply need a moment to breathe - I have got you.</p>
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
                  <span className="stat-label">PATTERNS FOUND</span>
                </div>
                {topPattern && (
                  <>
                    <div className="stat-divider" />
                    <div className="stat">
                      <span className="stat-pattern">{topPattern[0]}</span>
                      <span className="stat-label">TOP PATTERN ({topPattern[1]}X)</span>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="quick-actions">
              <h3>WHAT CAN I HELP WITH?</h3>
              
              <button className="action-btn primary" onClick={() => handleQuickAction('screenshot')}>
                <span className="action-icon">📸</span>
                <div className="action-text">
                  <span className="action-title">Analyze a screenshot</span>
                  <span className="action-desc">Upload image of a message</span>
                </div>
              </button>

              <button className="action-btn" onClick={() => handleQuickAction('courtdoc')}>
                <span className="action-icon">📄</span>
                <div className="action-text">
                  <span className="action-title">Court doc help</span>
                  <span className="action-desc">Understand, respond, or prepare filings</span>
                </div>
              </button>

              <button className="action-btn" onClick={() => handleQuickAction('import')}>
                <span className="action-icon">📤</span>
                <div className="action-text">
                  <span className="action-title">Import message history</span>
                  <span className="action-desc">Bulk analyze CSV export</span>
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
                {msg.fileNames && msg.fileNames.length > 0 && (
                  <div className="message-files">
                    {msg.fileNames.map((name, j) => (
                      <span key={j} className="file-tag">
                        {name.endsWith('.pdf') ? '📄' : '🖼️'} {name}
                      </span>
                    ))}
                  </div>
                )}
                <div className="message-content">{msg.content}</div>
                {msg.patterns && msg.patterns.length > 0 && (
                  <div className="patterns-detected">
                    {msg.patterns.map((p, j) => (
                      <span key={j} className="pattern-tag">{p}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="message assistant">
                <div className="typing">Thinking...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {detectedPatterns.length > 0 && !showHome && (
          <button className="save-evidence-btn" onClick={handleSaveEvidence}>
            💾 Save to Evidence ({detectedPatterns.length} patterns detected)
          </button>
        )}
      </div>

      {/* Input Area */}
      <div className="input-area">
        {/* Pending Files Preview */}
        {pendingFiles.length > 0 && (
          <div className="pending-files">
            {pendingFiles.map((file, i) => (
              <div key={i} className="pending-file">
                <span className="file-icon">{file.type === 'application/pdf' ? '📄' : '🖼️'}</span>
                <span className="file-name">{file.name.length > 20 ? file.name.slice(0, 17) + '...' : file.name}</span>
                <button className="remove-file" onClick={() => removeFile(i)}>✕</button>
              </div>
            ))}
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
            placeholder={pendingFiles.length > 0 ? "Add a message or just send..." : "What's going on?"}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={sending}
          />
          <button 
            className="send-btn" 
            onClick={handleSend}
            disabled={sending || (!input.trim() && pendingFiles.length === 0)}
          >
            ➤
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.csv"
            onChange={handleFileSelect}
            multiple
            hidden
          />
        </div>
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
          padding-bottom: 160px;
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
          font-size: 14px;
          font-weight: 700;
          color: #1a3a2f;
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
        .message-files {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
          margin-left: 40px;
        }
        .message.assistant .message-files {
          margin-left: 0;
          margin-right: 40px;
        }
        .file-tag {
          background: #e5e7eb;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 12px;
          color: #374151;
        }
        .message.user .message-content {
          background: #1a3a2f;
          color: white;
          padding: 14px 18px;
          border-radius: 18px 18px 4px 18px;
          margin-left: 40px;
        }
        .message.assistant .message-content {
          background: white;
          color: #1a3a2f;
          padding: 14px 18px;
          border-radius: 18px 18px 18px 4px;
          margin-right: 40px;
          white-space: pre-wrap;
        }
        .patterns-detected {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
          margin-right: 40px;
        }
        .pattern-tag {
          background: #fef3c7;
          color: #92400e;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .typing {
          color: #9ca3af;
          font-style: italic;
        }
        .save-evidence-btn {
          position: fixed;
          bottom: 160px;
          left: 50%;
          transform: translateX(-50%);
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 24px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 50;
        }
        .input-area {
          position: fixed;
          bottom: 70px;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #e5e7eb;
          padding: 12px 16px;
        }
        .pending-files {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .pending-file {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f3f4f6;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 13px;
        }
        .file-icon {
          font-size: 16px;
        }
        .file-name {
          color: #374151;
        }
        .remove-file {
          background: none;
          border: none;
          color: #9ca3af;
          cursor: pointer;
          font-size: 14px;
          padding: 0 2px;
        }
        .remove-file:hover {
          color: #dc2626;
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
          flex-shrink: 0;
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}