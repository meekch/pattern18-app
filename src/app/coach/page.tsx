'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  patterns?: string[];
  hasImage?: boolean;
}

function CoachContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showHome, setShowHome] = useState(true);
  const [showNewUserWelcome, setShowNewUserWelcome] = useState(false);
  const [caseContext, setCaseContext] = useState<any>(null);
  const [patternCounts, setPatternCounts] = useState<Record<string, number>>({});
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [detectedPatterns, setDetectedPatterns] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [lastSavedMessageIndex, setLastSavedMessageIndex] = useState<number>(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for new signup success
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowNewUserWelcome(true);
      // Clean up the URL
      window.history.replaceState({}, '', '/coach');
    }
  }, [searchParams]);

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

  // Toast notification helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Auto-save evidence when patterns are detected
  const autoSaveEvidence = async (userContent: string, patterns: string[], messageIndex: number) => {
    if (!user || patterns.length === 0) return;
    
    // Don't save if we already saved this message
    if (messageIndex <= lastSavedMessageIndex) return;

    try {
      const primaryPattern = patterns[0] || 'Uncategorized';
      const categoryKey = primaryPattern.toLowerCase().replace(/[\s\/]+/g, '_').replace(/-/g, '_');
      
      const { error } = await supabase.from('incidents').insert({
        user_id: user.id,
        title: primaryPattern,
        coparent_message: userContent,
        category: categoryKey,
        patterns: patterns,
        severity: patterns.some(p => 
          ['threats', 'intimidation', 'stalking', 'monitoring', 'financial_abuse'].includes(p.toLowerCase().replace(/[\s\/]+/g, '_'))
        ) ? 'high' : 'medium',
        incident_date: new Date().toISOString(),
      });

      if (error) throw error;

      setLastSavedMessageIndex(messageIndex);
      setEvidenceCount(prev => prev + 1);
      
      // Update pattern counts locally
      patterns.forEach(p => {
        const key = p.toLowerCase().replace(/[\s\/]+/g, '_').replace(/-/g, '_');
        setPatternCounts(prev => ({
          ...prev,
          [key]: (prev[key] || 0) + 1
        }));
      });

      showToast(`✓ Saved to evidence (${patterns.length} pattern${patterns.length > 1 ? 's' : ''} detected)`);
    } catch (error) {
      console.error('Auto-save failed:', error);
      showToast('Failed to save evidence. Try again.', 'error');
    }
  };

  const handleSend = async (messageText?: string, file?: File) => {
    const text = messageText || input;
    if (!text.trim() && !file) return;

    setShowHome(false);
    setSending(true);
    setInput('');
    setDetectedPatterns([]);

    const userMessage: Message = { 
      role: 'user', 
      content: text || (file ? `[Uploaded: ${file.name}]` : ''),
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

      // Auto-save if patterns were detected
      if (patterns.length > 0) {
        const userContent = text || (file ? `[Uploaded: ${file.name}]` : '');
        const currentMessageIndex = messages.length; // Index of the user message we just added
        await autoSaveEvidence(userContent, patterns, currentMessageIndex);
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

    // Handle image
    if (file.type.startsWith('image/')) {
      await handleSend('Please analyze this screenshot and help me respond.', file);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      {/* New User Welcome Modal */}
      {showNewUserWelcome && (
        <div className="welcome-modal-overlay">
          <div className="welcome-modal">
            <div className="welcome-modal-icon">🎉</div>
            <h2>Welcome to Pattern 18!</h2>
            <p>Your 7-day free trial has started. You now have a 24/7 strategic partner to help you document patterns and build your case.</p>
            <div className="welcome-modal-tips">
              <div className="tip">📸 Drop a screenshot to analyze</div>
              <div className="tip">💬 Paste a message for response help</div>
              <div className="tip">📄 Get help with court documents</div>
            </div>
            <button 
              className="welcome-modal-btn"
              onClick={() => setShowNewUserWelcome(false)}
            >
              Let's Get Started
            </button>
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
              <h1>Hey, I'm glad you're here.</h1>
              <p>Paste a message, attach a screenshot, or just tell me what's going on.</p>
            </div>

            <div className="prompts">
              <p className="prompts-label">Try saying...</p>
              <button 
                className="prompt-btn"
                onClick={() => setInput("He just sent me this message and I don't know how to respond...")}
              >
                "He just sent me this message..."
              </button>
              <button 
                className="prompt-btn"
                onClick={() => setInput("Help me respond to this without taking the bait")}
              >
                "Help me respond without taking the bait"
              </button>
              <button 
                className="prompt-btn"
                onClick={() => setInput("I need to document what just happened")}
              >
                "I need to document what happened"
              </button>
              <button 
                className="prompt-btn attach"
                onClick={() => fileInputRef.current?.click()}
              >
                📎 Attach a screenshot
              </button>
            </div>
          </div>
        ) : (
          <div className="chat">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
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
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
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
        .prompts {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 32px;
        }
        .prompts-label {
          font-size: 13px;
          color: #9ca3af;
          text-align: center;
          margin: 0 0 4px 0;
        }
        .prompt-btn {
          padding: 14px 18px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 15px;
          color: #374151;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }
        .prompt-btn:hover {
          border-color: #1a3a2f;
          background: #f0fdf4;
        }
        .prompt-btn.attach {
          background: #f0fdf4;
          border-color: #1a3a2f;
          color: #1a3a2f;
          font-weight: 600;
          text-align: center;
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
        .toast {
          position: fixed;
          bottom: 140px;
          left: 50%;
          transform: translateX(-50%);
          padding: 14px 24px;
          border-radius: 12px;
          font-weight: 500;
          font-size: 14px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
          z-index: 100;
          animation: toastSlide 0.3s ease-out;
        }
        .toast.success {
          background: #1a3a2f;
          color: white;
        }
        .toast.error {
          background: #dc2626;
          color: white;
        }
        @keyframes toastSlide {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
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
        .welcome-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .welcome-modal {
          background: white;
          border-radius: 24px;
          padding: 40px;
          max-width: 420px;
          width: 100%;
          text-align: center;
          animation: modalSlideIn 0.3s ease-out;
        }
        @keyframes modalSlideIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .welcome-modal-icon {
          font-size: 56px;
          margin-bottom: 16px;
        }
        .welcome-modal h2 {
          color: #1a3a2f;
          font-size: 24px;
          margin: 0 0 12px 0;
        }
        .welcome-modal p {
          color: #666;
          line-height: 1.5;
          margin: 0 0 24px 0;
        }
        .welcome-modal-tips {
          background: #f0fdf4;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 24px;
          text-align: left;
        }
        .welcome-modal-tips .tip {
          padding: 8px 0;
          color: #1a3a2f;
          font-size: 14px;
        }
        .welcome-modal-tips .tip:not(:last-child) {
          border-bottom: 1px solid #d1fae5;
        }
        .welcome-modal-btn {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

export default function CoachPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        background: '#f5f7f6' 
      }}>
        <div style={{ fontSize: '48px', animation: 'pulse 1.5s infinite' }}>💚</div>
      </div>
    }>
      <CoachContent />
    </Suspense>
  );
}