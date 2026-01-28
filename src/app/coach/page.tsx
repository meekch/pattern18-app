'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  hasFile?: boolean;
  fileName?: string;
}

export default function CoachPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [caseContext, setCaseContext] = useState<any>(null);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
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

      // Load case context
      const { data: caseData } = await supabase
        .from('case_context')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (caseData) setCaseContext(caseData);

      // Load evidence count
      const { count } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      setEvidenceCount(count || 0);
      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() && pendingFiles.length === 0) return;

    setSending(true);
    const messageText = input;
    setInput('');
    const filesToSend = [...pendingFiles];
    setPendingFiles([]);

    // Show user message
    const userMessage: Message = { 
      role: 'user', 
      content: messageText || (filesToSend.length > 0 ? `[Uploaded ${filesToSend.length} file(s)]` : ''),
      hasFile: filesToSend.length > 0,
      fileName: filesToSend.map(f => f.name).join(', ')
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('message', messageText);
      formData.append('history', JSON.stringify(messages));
      if (caseContext) formData.append('caseContext', JSON.stringify(caseContext));
      formData.append('evidenceCount', String(evidenceCount));
      
      // Add files
      formData.append('fileCount', String(filesToSend.length));
      filesToSend.forEach((file, i) => {
        formData.append(`file${i}`, file);
      });

      const response = await fetch('/api/coach', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to send');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      let assistantContent = '';
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
            } catch (e) {}
          }
        }
      }

      // Auto-save to evidence (silently)
      if (assistantContent && messageText) {
        await autoSaveEvidence(messageText, assistantContent, filesToSend.length > 0);
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

  const autoSaveEvidence = async (userMessage: string, coachResponse: string, hadFile: boolean) => {
    try {
      // Simple save - no pattern detection needed for now
      await supabase.from('incidents').insert({
        user_id: user.id,
        title: hadFile ? 'Screenshot analyzed' : 'Message analyzed',
        coparent_message: userMessage,
        coach_response: coachResponse,
        category: 'documented',
        severity: 'medium',
        incident_date: new Date().toISOString(),
        source: 'coach'
      });
      
      setEvidenceCount(prev => prev + 1);
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Silent fail - don't interrupt the user
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setPendingFiles(prev => [...prev, ...files]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatMessage = (content: string) => {
    // Convert markdown to HTML
    let html = content
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Bullets
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/^• (.+)$/gm, '<li>$1</li>')
      // Numbered lists
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Line breaks
      .replace(/\n/g, '<br />');
    
    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*?<\/li>)(<br \/>)?/g, '$1');
    html = html.replace(/(<li>.*?<\/li>)+/g, '<ul>$&</ul>');
    
    return html;
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        background: '#fafafa' 
      }}>
        <div style={{ fontSize: 32 }}>💚</div>
      </div>
    );
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="container">
      {/* Minimal Header */}
      <header className="header">
        <div className="header-brand">
          <span className="logo">18</span>
          <span className="brand-name">Pattern 18</span>
        </div>
        <button className="case-btn" onClick={() => router.push('/my-case')}>
          {evidenceCount > 0 && <span className="case-count">{evidenceCount}</span>}
          My Case
        </button>
      </header>

      {/* Main Content */}
      <main className="main">
        {!hasMessages ? (
          /* Empty State - Welcoming, Simple */
          <div className="empty-state">
            <div className="welcome-icon">💚</div>
            <h1>What's going on?</h1>
            <p>Paste a message, upload a screenshot, or just tell me what happened. I'm here.</p>
          </div>
        ) : (
          /* Chat Messages */
          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                {msg.role === 'assistant' ? (
                  <div 
                    className="message-content"
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                  />
                ) : (
                  <div className="message-content">
                    {msg.hasFile && (
                      <div className="file-indicator">📎 {msg.fileName}</div>
                    )}
                    {msg.content}
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="message assistant">
                <div className="typing">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Input Area - Always Visible */}
      <div className="input-area">
        {/* Pending Files */}
        {pendingFiles.length > 0 && (
          <div className="pending-files">
            {pendingFiles.map((file, i) => (
              <div key={i} className="file-tag">
                <span>📎 {file.name}</span>
                <button onClick={() => removeFile(i)}>×</button>
              </div>
            ))}
          </div>
        )}
        
        <div className="input-row">
          <button 
            className="attach-btn" 
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
          >
            📎
          </button>
          
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasMessages ? "What else?" : "Paste their message here..."}
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
            onClick={handleSend}
            disabled={sending || (!input.trim() && pendingFiles.length === 0)}
          >
            {sending ? '...' : '→'}
          </button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.csv,.txt"
          onChange={handleFileSelect}
          multiple
          hidden
        />
      </div>

      {/* Auto-save indicator */}
      {evidenceCount > 0 && (
        <div className="autosave-indicator">
          ✓ Auto-saving to your case file
        </div>
      )}

      <BottomNav active="coach" />

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #fafafa;
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: white;
          border-bottom: 1px solid #eee;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .logo {
          background: #1a3a2f;
          color: white;
          font-weight: 800;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 14px;
        }
        .brand-name {
          font-weight: 600;
          color: #1a3a2f;
          font-size: 16px;
        }
        .case-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f3f4f6;
          border: none;
          padding: 8px 14px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
        }
        .case-count {
          background: #1a3a2f;
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
        }

        /* Main */
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          max-width: 700px;
          width: 100%;
          margin: 0 auto;
          padding: 20px;
          padding-bottom: 180px;
        }

        /* Empty State */
        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px 20px;
        }
        .welcome-icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        .empty-state h1 {
          font-size: 28px;
          font-weight: 600;
          color: #1a3a2f;
          margin: 0 0 12px 0;
        }
        .empty-state p {
          font-size: 16px;
          color: #6b7280;
          line-height: 1.5;
          max-width: 320px;
          margin: 0;
        }

        /* Messages */
        .messages {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .message {
          max-width: 85%;
        }
        .message.user {
          align-self: flex-end;
        }
        .message.assistant {
          align-self: flex-start;
        }
        .message-content {
          padding: 14px 18px;
          border-radius: 20px;
          font-size: 15px;
          line-height: 1.5;
        }
        .message.user .message-content {
          background: #1a3a2f;
          color: white;
          border-bottom-right-radius: 4px;
        }
        .message.assistant .message-content {
          background: white;
          color: #1f2937;
          border-bottom-left-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .message-content :global(strong) {
          font-weight: 600;
        }
        .message-content :global(ul) {
          margin: 8px 0;
          padding-left: 20px;
        }
        .message-content :global(li) {
          margin: 4px 0;
        }
        .file-indicator {
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 6px;
        }

        /* Typing Indicator */
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
        .typing span:nth-child(1) { animation-delay: 0s; }
        .typing span:nth-child(2) { animation-delay: 0.2s; }
        .typing span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }

        /* Input Area */
        .input-area {
          position: fixed;
          bottom: 70px;
          left: 0;
          right: 0;
          background: white;
          border-top: 1px solid #eee;
          padding: 12px 16px;
          padding-bottom: max(12px, env(safe-area-inset-bottom));
        }
        .pending-files {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }
        .file-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 6px 10px;
          border-radius: 16px;
          font-size: 13px;
          color: #166534;
        }
        .file-tag button {
          background: none;
          border: none;
          color: #166534;
          font-size: 16px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        .input-row {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          max-width: 700px;
          margin: 0 auto;
        }
        .attach-btn {
          width: 44px;
          height: 44px;
          background: #f3f4f6;
          border: none;
          border-radius: 22px;
          font-size: 18px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .attach-btn:disabled {
          opacity: 0.5;
        }
        .input-row textarea {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 22px;
          font-size: 16px;
          resize: none;
          outline: none;
          font-family: inherit;
          line-height: 1.4;
          max-height: 150px;
        }
        .input-row textarea:focus {
          border-color: #1a3a2f;
        }
        .input-row textarea::placeholder {
          color: #9ca3af;
        }
        .send-btn {
          width: 44px;
          height: 44px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 22px;
          font-size: 20px;
          cursor: pointer;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Auto-save indicator */
        .autosave-indicator {
          position: fixed;
          bottom: 125px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(22, 101, 52, 0.9);
          color: white;
          padding: 6px 14px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}