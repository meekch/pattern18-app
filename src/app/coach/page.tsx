'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  patterns?: string[];
  imageUrls?: string[];
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
  const [isDragging, setIsDragging] = useState(false);
  const [showExportNudge, setShowExportNudge] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async (messageText?: string, files?: File[]) => {
    const text = messageText || input;
    if (!text.trim() && (!files || files.length === 0)) return;

    setShowHome(false);
    setSending(true);
    setInput('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const imageUrls: string[] = [];
    if (files) {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const url = await fileToDataUrl(file);
          imageUrls.push(url);
        }
      }
      if (imageUrls.length > 0) {
        setShowExportNudge(true);
      }
    }

    const userMessage: Message = { 
      role: 'user', 
      content: text || '',
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('message', text);
      formData.append('history', JSON.stringify(messages));
      if (caseContext) formData.append('caseContext', JSON.stringify(caseContext));
      formData.append('patternCounts', JSON.stringify(patternCounts));
      formData.append('evidenceCount', String(evidenceCount));
      
      if (files) {
        files.forEach((file, index) => {
          formData.append(`file${index}`, file);
        });
        formData.append('fileCount', String(files.length));
      }

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
                setDetectedPatterns(prev => {
                  const merged = [...new Set([...prev, ...patterns])];
                  return merged;
                });
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

      if (user?.id) {
        await supabase.from('coach_messages').insert({ user_id: user.id });
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
    
    const fileArray = Array.from(files);
    
    if (fileArray.some(f => f.type === 'text/csv' || f.name.endsWith('.csv'))) {
      router.push('/evidence/upload');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const pdfCount = fileArray.filter(f => f.type === 'application/pdf').length;
    const imageCount = fileArray.filter(f => f.type.startsWith('image/')).length;
    
    let prompt = '';
    if (pdfCount > 0 && imageCount > 0) {
      prompt = `Analyze ${pdfCount === 1 ? 'this document' : `these ${pdfCount} documents`} and ${imageCount === 1 ? 'this screenshot' : `these ${imageCount} screenshots`} and help me understand what I need to do.`;
    } else if (pdfCount > 0) {
      prompt = pdfCount === 1 ? 'Analyze this document and help me understand what I need to do.' : `Analyze these ${pdfCount} documents and help me understand what I need to do.`;
    } else if (imageCount > 0) {
      prompt = imageCount === 1 ? 'Analyze this screenshot and help me respond.' : `Analyze these ${imageCount} screenshots and help me respond.`;
    }

    await handleSend(prompt, fileArray);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    if (files.some(f => f.type === 'text/csv' || f.name.endsWith('.csv'))) {
      router.push('/evidence/upload');
      return;
    }

    const pdfCount = files.filter(f => f.type === 'application/pdf').length;
    const imageCount = files.filter(f => f.type.startsWith('image/')).length;
    
    let prompt = '';
    if (pdfCount > 0 && imageCount > 0) {
      prompt = `Analyze ${pdfCount === 1 ? 'this document' : `these ${pdfCount} documents`} and ${imageCount === 1 ? 'this screenshot' : `these ${imageCount} screenshots`} and help me understand what I need to do.`;
    } else if (pdfCount > 0) {
      prompt = pdfCount === 1 ? 'Analyze this document and help me understand what I need to do.' : `Analyze these ${pdfCount} documents and help me understand what I need to do.`;
    } else if (imageCount > 0) {
      prompt = imageCount === 1 ? 'Analyze this screenshot and help me respond.' : `Analyze these ${imageCount} screenshots and help me respond.`;
    }

    await handleSend(prompt, files);
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
    <div 
      className="container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-content">
            <span className="drag-icon">📸</span>
            <span className="drag-text">Drop to analyze</span>
          </div>
        </div>
      )}

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
                {msg.imageUrls && msg.imageUrls.length > 0 && (
                  <div className="message-images">
                    {msg.imageUrls.map((url, idx) => (
                      <img key={idx} src={url} alt={`Uploaded ${idx + 1}`} />
                    ))}
                  </div>
                )}
                {msg.content && (
                  <div className="message-content">{msg.content}</div>
                )}
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
                <div className="analyzing">
                  <span className="analyzing-icon">🎯</span>
                  <span>Identifying patterns...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Export Nudge */}
        {showExportNudge && !showHome && (
          <div className="export-nudge">
            <div className="nudge-content">
              <span className="nudge-icon">💡</span>
              <p>When things settle, export this text thread from your phone. Your calm responses next to their messages - that is your evidence.</p>
              <button onClick={() => router.push('/evidence/upload')} className="nudge-btn">
                Import Messages →
              </button>
              <button onClick={() => setShowExportNudge(false)} className="nudge-dismiss">
                Got it
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="input-area">
        <button className="attach-btn" onClick={() => fileInputRef.current?.click()}>
          📎
        </button>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
          }}
          placeholder="What's going on?"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={sending}
          rows={1}
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
          onChange={handleFileSelect}
          multiple
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
        .drag-overlay {
          position: fixed;
          inset: 0;
          background: rgba(26, 58, 47, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .drag-content {
          text-align: center;
          color: white;
        }
        .drag-icon {
          font-size: 64px;
          display: block;
          margin-bottom: 16px;
        }
        .drag-text {
          font-size: 24px;
          font-weight: 600;
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
        .message.user .message-images {
          margin-left: 40px;
          margin-bottom: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .message.user .message-images img {
          max-width: 200px;
          max-height: 200px;
          border-radius: 12px;
          border: 2px solid #1a3a2f;
          object-fit: cover;
        }
        .message.user .message-content {
          background: #1a3a2f;
          color: white;
          padding: 14px 18px;
          border-radius: 18px 18px 4px 18px;
          margin-left: 40px;
          line-height: 1.6;
          font-size: 15px;
        }
        .message.assistant .message-content {
          background: white;
          color: #374151;
          padding: 16px 20px;
          border-radius: 18px 18px 18px 4px;
          margin-right: 40px;
          white-space: pre-wrap;
          line-height: 1.7;
          font-size: 15px;
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
        .analyzing {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #1a3a2f;
          font-weight: 500;
          padding: 8px 0;
        }
        .analyzing-icon {
          font-size: 24px;
          animation: pulse 1s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
        .export-nudge {
          position: fixed;
          bottom: 130px;
          left: 16px;
          right: 16px;
          max-width: 400px;
          margin: 0 auto;
          z-index: 50;
        }
        .nudge-content {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .nudge-icon {
          font-size: 20px;
        }
        .nudge-content p {
          margin: 8px 0 12px;
          font-size: 14px;
          color: #4b5563;
          line-height: 1.5;
        }
        .nudge-btn {
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          margin-right: 8px;
        }
        .nudge-dismiss {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 14px;
          cursor: pointer;
        }
        .input-area {
          position: fixed;
          bottom: 70px;
          left: 0;
          right: 0;
          display: flex;
          align-items: flex-end;
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
        .input-area textarea {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 20px;
          font-size: 16px;
          outline: none;
          resize: none;
          font-family: inherit;
          line-height: 1.4;
          max-height: 150px;
        }
        .input-area textarea:focus {
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