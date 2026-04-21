'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FloatingCoachProps {
  // Optional context about current page
  pageContext?: string;
  // Optional court date for countdown context
  courtDate?: string;
  // Optional evidence count
  evidenceCount?: number;
}

export default function FloatingCoach({ pageContext, courtDate, evidenceCount }: FloatingCoachProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [progressText, setProgressText] = useState('Thinking...');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Don't show on Coach page itself
  if (pathname === '/coach') return null;

  // Progress messages
  const progressMessages = [
    'Thinking...',
    'Analyzing your situation...',
    'Considering your case history...',
    'Preparing response...',
  ];

  useEffect(() => {
    if (!sending) return;
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % progressMessages.length;
      setProgressText(progressMessages[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, [sending]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Build context string based on current page
  const getPageContextString = () => {
    const contexts: string[] = [];
    
    if (pageContext) {
      contexts.push(pageContext);
    }
    
    // Add page-specific context
    if (pathname?.includes('court-prep')) {
      contexts.push('User is on the Court Prep page preparing for their hearing.');
    } else if (pathname?.includes('my-case')) {
      contexts.push('User is viewing their case dashboard.');
    } else if (pathname?.includes('evidence')) {
      contexts.push('User is reviewing their documented evidence.');
    } else if (pathname?.includes('docs')) {
      contexts.push('User is in the documents section.');
    }
    
    if (courtDate) {
      const days = Math.ceil((new Date(courtDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days > 0) {
        contexts.push(`Their court date is in ${days} days.`);
      }
    }
    
    if (evidenceCount) {
      contexts.push(`They have ${evidenceCount} incidents documented.`);
    }
    
    return contexts.length > 0 ? `\n\n[Context: ${contexts.join(' ')}]` : '';
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setSending(true);

    try {
      const formData = new FormData();
      formData.append('message', userMessage + getPageContextString());
      formData.append('history', JSON.stringify(messages));

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

  const handleContinueInCoach = () => {
    // Save conversation to sessionStorage and go to Coach
    if (messages.length > 0) {
      sessionStorage.setItem('coachMessages', JSON.stringify(messages));
    }
    router.push('/coach');
  };

  // Quick prompts based on page
  const getQuickPrompts = () => {
    if (pathname?.includes('court-prep')) {
      return [
        'What should I prepare?',
        'What will he argue?',
        'Practice questions',
      ];
    }
    if (pathname?.includes('evidence')) {
      return [
        'Which are strongest?',
        'What patterns matter?',
        'Ready for court?',
      ];
    }
    if (pathname?.includes('my-case')) {
      return [
        'Summarize my case',
        'What should I do next?',
        'Am I ready for court?',
      ];
    }
    return [
      'Help me respond',
      'Analyze a message',
      'What should I do?',
    ];
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: 90,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 28,
            background: 'linear-gradient(135deg, #1F2937 0%, #1A5F5A 100%)',
            border: 'none',
            boxShadow: '0 4px 20px rgba(26, 58, 47, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <span style={{ fontSize: 24 }}>💬</span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            top: 0,
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Backdrop */}
          <div 
            onClick={() => setIsOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
            }}
          />
          
          {/* Panel */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: '75vh',
              background: 'white',
              borderRadius: '20px 20px 0 0',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideUp 0.3s ease-out',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}></span>
                <span style={{ fontWeight: 600, color: '#1F2937' }}>Coach</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleContinueInCoach}
                  style={{
                    background: '#f3f4f6',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 13,
                    color: '#374151',
                    cursor: 'pointer',
                  }}
                >
                  Open Full →
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    background: '#f3f4f6',
                    border: 'none',
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    fontSize: 16,
                    cursor: 'pointer',
                    color: '#6b7280',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              minHeight: 200,
              maxHeight: 'calc(75vh - 180px)',
            }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}></div>
                  <div style={{ color: '#6b7280', marginBottom: 16 }}>
                    How can I help?
                  </div>
                  {/* Quick prompts */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                    {getQuickPrompts().map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setInput(prompt);
                          setTimeout(() => handleSend(), 100);
                        }}
                        style={{
                          background: '#EAF5F3',
                          border: '1px solid #C7E4E0',
                          padding: '8px 14px',
                          borderRadius: 20,
                          fontSize: 13,
                          color: '#166534',
                          cursor: 'pointer',
                        }}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      marginBottom: 12,
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '10px 14px',
                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.role === 'user' ? '#1F2937' : '#f3f4f6',
                        color: msg.role === 'user' ? 'white' : '#1F2937',
                        fontSize: 14,
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.content || (sending && i === messages.length - 1 ? progressText : '')}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '12px 16px',
              paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              gap: 10,
            }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask anything..."
                disabled={sending}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: 24,
                  fontSize: 15,
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  background: sending || !input.trim() ? '#9ca3af' : '#1F2937',
                  color: 'white',
                  border: 'none',
                  fontSize: 18,
                  cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                ➤
              </button>
            </div>
          </div>

          <style jsx>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </>
  );
}