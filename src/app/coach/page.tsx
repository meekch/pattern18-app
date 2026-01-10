'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  patterns?: string[];
  imageUrl?: string;
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
  
  // Sender question modal
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [showSenderModal, setShowSenderModal] = useState(false);
  const [copiedOption, setCopiedOption] = useState<number | null>(null);
  
  // Import tracking
  const [daysSinceImport, setDaysSinceImport] = useState<number | null>(null);
  
  // Progress messages for better UX during analysis
  const [progressIndex, setProgressIndex] = useState(0);
  const [hasImage, setHasImage] = useState(false);
  const progressMessages = [
    "Reading your message...",
    "Identifying patterns...",
    "Checking for manipulation tactics...",
    "Preparing response options...",
  ];
  const imageProgressMessages = [
    "Reading the screenshot...",
    "Analyzing the conversation...",
    "Identifying coercive patterns...",
    "Checking tone and language...",
    "Preparing strategic response...",
  ];

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

      // Calculate days since last import
      const lastImport = localStorage.getItem('pattern18_last_import');
      if (lastImport) {
        const lastDate = new Date(lastImport);
        const days = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        setDaysSinceImport(days);
      } else {
        setDaysSinceImport(null); // Never imported
      }

      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Rotate progress messages while analyzing
  useEffect(() => {
    if (!sending) {
      setProgressIndex(0);
      return;
    }
    // Auto-send prompt from document upload
  useEffect(() => {
    if (loading) return;
    const savedPrompt = sessionStorage.getItem('coachPrompt');
    if (savedPrompt) {
      sessionStorage.removeItem('coachPrompt');
      handleSend(savedPrompt);
    }
  }, [loading]);
    const msgs = hasImage ? imageProgressMessages : progressMessages;
    const interval = setInterval(() => {
      setProgressIndex(prev => (prev + 1) % msgs.length);
    }, 2500);
    
    return () => clearInterval(interval);
  }, [sending, hasImage]);

  const getImportMessage = () => {
    if (daysSinceImport === null) return { text: 'Import messages', urgent: false };
    if (daysSinceImport === 0) return { text: 'Imported today ✓', urgent: false };
    if (daysSinceImport <= 7) return { text: `${daysSinceImport}d ago`, urgent: false };
    if (daysSinceImport <= 30) return { text: `${daysSinceImport}d since import`, urgent: false };
    return { text: `${daysSinceImport}d - import now`, urgent: true };
  };

  const handleSend = async (messageText?: string, file?: File, imageUrl?: string) => {
    const text = messageText || input;
    if (!text.trim() && !file) return;

    setShowHome(false);
    setSending(true);
    setHasImage(!!file);
    setProgressIndex(0);
    setInput('');
    setDetectedPatterns([]);

    const userMessage: Message = { 
      role: 'user', 
      content: text,
      imageUrl: imageUrl
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('message', text);
      formData.append('history', JSON.stringify(messages));
      if (caseContext) formData.append('caseContext', JSON.stringify(caseContext));
      formData.append('patternCounts', JSON.stringify(patternCounts));
      formData.append('evidenceCount', String(evidenceCount));
      
      if (file) formData.append('file', file);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type === 'application/pdf') {
      router.push('/docs');
      return;
    }
    
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      router.push('/evidence/upload');
      return;
    }

    if (file.type.startsWith('image/')) {
      setPendingFile(file);
      setShowSenderModal(true);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSenderChoice = async (sender: 'coparent' | 'me' | 'other') => {
    if (!pendingFile) return;
    
    setShowSenderModal(false);
    const file = pendingFile;
    setPendingFile(null);

    // Create image URL for preview
    const imageUrl = URL.createObjectURL(file);

    let prompt = '';
    if (sender === 'coparent') {
      prompt = 'This is from my co-parent. Help me respond.';
    } else if (sender === 'me') {
      prompt = 'This is my draft. Is it safe to send?';
    } else {
      prompt = 'Help me understand this.';
    }

    await handleSend(prompt, file, imageUrl);
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

  const parseResponseOptions = (content: string) => {
    const options: { label: string; text: string }[] = [];
    
    const patterns = [
      /OPTION 1[^:]*:\s*"([^"]+)"/i,
      /OPTION 2[^:]*:\s*"([^"]+)"/i,
    ];
    
    patterns.forEach((regex, i) => {
      const match = content.match(regex);
      if (match && match[1]) {
        options.push({
          label: i === 0 ? 'Gray Rock' : 'With Boundary',
          text: match[1].trim()
        });
      }
    });
    
    return options;
  };

  const renderMessageContent = (msg: Message) => {
    if (msg.role !== 'assistant') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          {msg.imageUrl && (
            <img 
              src={msg.imageUrl} 
              alt="Uploaded screenshot" 
              style={{
                maxWidth: 280,
                maxHeight: 400,
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                objectFit: 'contain'
              }}
            />
          )}
          <div style={{
            background: '#1a3a2f',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '18px 18px 4px 18px'
          }}>{msg.content}</div>
        </div>
      );
    }

    const options = parseResponseOptions(msg.content);
    
    return (
      <>
        <div className="message-content">{msg.content}</div>
        {options.length > 0 && (
          <div className="copy-options">
            <div className="copy-label">📋 TAP TO COPY:</div>
            {options.map((opt, i) => (
              <button
                key={i}
                className={`copy-btn ${copiedOption === i ? 'copied' : ''}`}
                onClick={() => copyToClipboard(opt.text, i)}
              >
                {copiedOption === i ? '✓ Copied!' : `${opt.label}: "${opt.text.slice(0, 50)}${opt.text.length > 50 ? '...' : ''}"`}
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
          .loading { display: flex; align-items: center; justify-content: center; height: 100vh; background: #ffffff; }
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
        <div className="header-right">
          <button 
            className={`import-badge ${getImportMessage().urgent ? 'urgent' : ''}`}
            onClick={() => router.push('/evidence/upload')}
          >
            📤 {getImportMessage().text}
          </button>
          <button className="evidence-badge" onClick={() => router.push('/my-case')}>
            📁 {evidenceCount}
          </button>
        </div>
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
                {msg.role === 'assistant' && <div className="avatar">18</div>}
                <div className="message-wrapper">
                  {renderMessageContent(msg)}
                  {msg.patterns && msg.patterns.length > 0 && (
                    <div className="patterns-detected">
                      {msg.patterns.map((p, j) => (
                        <span key={j} className="pattern-tag">{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="message assistant">
                <div className="avatar">18</div>
                <div className="message-wrapper">
                  <div style={{ 
                    padding: '12px 16px', 
                    background: '#f7f7f8', 
                    borderRadius: '4px 18px 18px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}>
                    <div style={{
                      width: 16,
                      height: 16,
                      border: '2px solid #e5e7eb',
                      borderTopColor: '#059669',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <span style={{ color: '#4b5563', fontSize: 14 }}>
                      {(hasImage ? imageProgressMessages : progressMessages)[progressIndex]}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {showSenderModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Who sent this message?</h3>
            <p>This helps me give you the right support.</p>
            
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
          background: #ffffff;
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
          padding: 8px 12px;
          border-radius: 20px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .import-badge {
          background: rgba(255,255,255,0.15);
          border: none;
          padding: 6px 12px;
          border-radius: 16px;
          color: rgba(255,255,255,0.9);
          font-size: 12px;
          cursor: pointer;
        }
        .import-badge.urgent {
          background: #f59e0b;
          color: white;
          animation: pulse-urgent 2s infinite;
        }
        @keyframes pulse-urgent {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .content {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 140px;
          background: #ffffff;
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
          background: #f9fafb;
          border-radius: 16px;
          padding: 20px;
          border: 1px solid #e5e7eb;
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
          border: 1px solid #e5e7eb;
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
          background: #f9fafb;
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
          max-width: 700px;
          margin: 0 auto;
          padding: 20px;
        }
        .message {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        .message.user {
          flex-direction: row-reverse;
        }
        .avatar {
          width: 32px;
          height: 32px;
          background: #1a3a2f;
          color: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .message-wrapper {
          max-width: 85%;
        }
        .user-message-content {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }
        .message-image {
          max-width: 280px;
          max-height: 400px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          object-fit: contain;
        }
        .message.user .message-content {
          background: #1a3a2f;
          color: white;
          padding: 12px 16px;
          border-radius: 18px 18px 4px 18px;
        }
        .message.assistant .message-content {
          background: #f7f7f8;
          color: #1a1a1a;
          padding: 16px;
          border-radius: 4px 18px 18px 18px;
          font-size: 15px;
          line-height: 1.7;
          white-space: pre-wrap;
        }
        .patterns-detected {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }
        .pattern-tag {
          background: #fef3c7;
          color: #92400e;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }
        .typing {
          display: flex;
          gap: 4px;
          padding: 8px 0;
        }
        .typing span {
          width: 8px;
          height: 8px;
          background: #9ca3af;
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out;
        }
        .typing span:nth-child(1) { animation-delay: -0.32s; }
        .typing span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        .copy-options {
          margin-top: 12px;
          padding: 14px;
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
        }
        .copy-label {
          font-size: 11px;
          font-weight: 700;
          color: #059669;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
        }
        .copy-btn {
          display: block;
          width: 100%;
          padding: 12px 14px;
          margin-bottom: 8px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          text-align: left;
          cursor: pointer;
          font-size: 13px;
          color: #374151;
          transition: all 0.2s;
          line-height: 1.4;
        }
        .copy-btn:last-child {
          margin-bottom: 0;
        }
        .copy-btn:hover {
          background: #f0fdf4;
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
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
        }
        .modal {
          background: white;
          border-radius: 16px;
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
          border: 1px solid #e5e7eb;
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
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          font-size: 16px;
          outline: none;
          background: #f9fafb;
        }
        .input-area input[type="text"]:focus {
          border-color: #1a3a2f;
          background: white;
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