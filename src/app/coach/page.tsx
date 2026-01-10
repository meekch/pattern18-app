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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // New state for sender question modal
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showSenderModal, setShowSenderModal] = useState(false);
  const [copiedOption, setCopiedOption] = useState<number | null>(null);

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

      // Load evidence stats
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

  const handleSend = async (messageText?: string, file?: File) => {
    const text = messageText || input;
    if (!text.trim() && !file) return;

    setShowHome(false);
    setSending(true);
    setInput('');
    setDetectedPatterns([]);

    const userMessage: Message = { 
      role: 'user', 
      content: text || (file ? `[Uploaded screenshot]` : ''),
      hasImage: !!file
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('message', text);
      formData.append('history', JSON.stringify(messages));
      if (caseContext) formData.append('caseContext', JSON.stringify(caseContext));
      formData.append('patternCounts', JSON.stringify(patternCounts));
      formData.append('evidenceCount', String(evidenceCount));
      
      if (file) {
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

      // Update final message with patterns
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if PDF - redirect to docs
    if (file.type === 'application/pdf') {
      router.push('/docs');
      return;
    }
    
    // Check if CSV - redirect to bulk import
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      router.push('/evidence/upload');
      return;
    }

    // Handle image - show sender question modal
    if (file.type.startsWith('image/')) {
      setPendingFile(file);
      setShowSenderModal(true);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSenderChoice = async (sender: 'coparent' | 'me' | 'other') => {
    if (!pendingFile) return;
    
    setShowSenderModal(false);
    const file = pendingFile;
    setPendingFile(null);

    let prompt = '';
    if (sender === 'coparent') {
      prompt = 'This is a screenshot of a message FROM my co-parent. Please analyze it for manipulation patterns and help me respond.';
    } else if (sender === 'me') {
      prompt = 'This is a screenshot of MY OWN message that I am thinking of sending. Please review it and help me make sure it is factual, neutral, and appropriate for court documentation.';
    } else {
      prompt = 'This is a screenshot of a conversation. Please help me understand what I am looking at.';
    }

    await handleSend(prompt, file);
  };

  const copyToClipboard = async (text: string, optionNum: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedOption(optionNum);
      setTimeout(() => setCopiedOption(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Parse response options from assistant message
  const parseResponseOptions = (content: string) => {
    const options: { label: string; text: string }[] = [];
    
    // Look for Option patterns
    const optionRegex = /\*\*Option (\d)[^*]*\*\*[:\s]*\n([^*]+?)(?=\n\n\*\*|$)/gi;
    let match;
    
    while ((match = optionRegex.exec(content)) !== null) {
      const optionNum = match[1];
      const optionText = match[2].trim();
      if (optionText && !optionText.toLowerCase().includes('no response needed')) {
        options.push({
          label: `Option ${optionNum}`,
          text: optionText
        });
      }
    }
    
    return options;
  };

  const renderMessageContent = (msg: Message) => {
    if (msg.role !== 'assistant') {
      return <div className="message-content">{msg.content}</div>;
    }

    const options = parseResponseOptions(msg.content);
    
    return (
      <>
        <div className="message-content">{msg.content}</div>
        {options.length > 0 && (
          <div className="copy-options">
            <div className="copy-label">TAP TO COPY:</div>
            {options.map((opt, i) => (
              <button
                key={i}
                className={`copy-btn ${copiedOption === i ? 'copied' : ''}`}
                onClick={() => copyToClipboard(opt.text, i)}
              >
                {copiedOption === i ? '✓ Copied!' : `📋 ${opt.label}`}
              </button>
            ))}
          </div>
        )}
      </>
    );
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

            {/* Quick Actions - no stats bar */}
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
                {renderMessageContent(msg)}
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
      </div>

      {/* Sender Question Modal */}
      {showSenderModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Who sent this message?</h3>
            <p>This helps me give you the right kind of support.</p>
            
            <button className="modal-btn coparent" onClick={() => handleSenderChoice('coparent')}>
              <span>🔴</span>
              <div>
                <strong>From my co-parent</strong>
                <span>Analyze for patterns & help me respond</span>
              </div>
            </button>
            
            <button className="modal-btn me" onClick={() => handleSenderChoice('me')}>
              <span>🟢</span>
              <div>
                <strong>My message (draft)</strong>
                <span>Review before I send it</span>
              </div>
            </button>
            
            <button className="modal-btn other" onClick={() => handleSenderChoice('other')}>
              <span>⚪</span>
              <div>
                <strong>Something else</strong>
                <span>Just help me understand it</span>
              </div>
            </button>
            
            <button className="modal-cancel" onClick={() => {
              setShowSenderModal(false);
              setPendingFile(null);
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
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
        .copy-options {
          margin-top: 12px;
          margin-right: 40px;
          padding: 12px;
          background: #f0fdf4;
          border-radius: 12px;
          border: 1px solid #bbf7d0;
        }
        .copy-label {
          font-size: 10px;
          font-weight: 700;
          color: #059669;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .copy-btn {
          display: block;
          width: 100%;
          padding: 10px 14px;
          margin-bottom: 8px;
          background: white;
          border: 1px solid #d1fae5;
          border-radius: 8px;
          text-align: left;
          cursor: pointer;
          font-size: 14px;
          color: #1a3a2f;
          transition: all 0.2s;
        }
        .copy-btn:last-child {
          margin-bottom: 0;
        }
        .copy-btn:hover {
          background: #d1fae5;
          border-color: #059669;
        }
        .copy-btn.copied {
          background: #059669;
          color: white;
          border-color: #059669;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
        }
        .modal {
          background: white;
          border-radius: 20px;
          padding: 24px;
          max-width: 360px;
          width: 100%;
        }
        .modal h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          color: #1a3a2f;
        }
        .modal p {
          margin: 0 0 20px 0;
          color: #6b7280;
          font-size: 14px;
        }
        .modal-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          padding: 14px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          margin-bottom: 10px;
          transition: all 0.2s;
        }
        .modal-btn:hover {
          border-color: #1a3a2f;
          background: #f9fafb;
        }
        .modal-btn span:first-child {
          font-size: 24px;
        }
        .modal-btn div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .modal-btn strong {
          color: #1a3a2f;
          font-size: 15px;
        }
        .modal-btn div span {
          font-size: 12px;
          color: #9ca3af;
        }
        .modal-btn.coparent:hover {
          border-color: #dc2626;
          background: #fef2f2;
        }
        .modal-btn.me:hover {
          border-color: #059669;
          background: #f0fdf4;
        }
        .modal-cancel {
          width: 100%;
          padding: 12px;
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          font-size: 14px;
          margin-top: 8px;
        }
        .modal-cancel:hover {
          color: #1a3a2f;
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