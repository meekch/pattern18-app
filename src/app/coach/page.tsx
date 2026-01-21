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
  const [caseContext, setCaseContext] = useState<any>(null);
  const [patternCounts, setPatternCounts] = useState<Record<string, number>>({});
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [detectedPatterns, setDetectedPatterns] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
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

  const handleSend = async (messageText?: string, file?: File) => {
    const text = messageText || input;
    if (!text.trim() && !file) return;

    setSending(true);
    setInput('');
    setDetectedPatterns([]);
    setSaved(false);

    // Create image URL for display if file is an image
    let imageUrl: string | undefined;
    if (file && file.type.startsWith('image/')) {
      imageUrl = URL.createObjectURL(file);
    }

    const userMessage: Message = { 
      role: 'user', 
      content: text,
      imageUrl
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type === 'application/pdf') {
      await handleSend('Please help me understand this document.', file);
    } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      router.push('/evidence/upload');
      return;
    } else if (file.type.startsWith('image/')) {
      await handleSend('', file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveEvidence = async () => {
    if (messages.length < 2 || !detectedPatterns.length) return;

    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    try {
      const primaryPattern = detectedPatterns[0];
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

      setSaved(true);
      setEvidenceCount(prev => prev + 1);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setDetectedPatterns([]);
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    if (suggestion === 'upload') {
      fileInputRef.current?.click();
    } else {
      handleSend(suggestion);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f9faf8'
      }}>
        <div style={{ fontSize: 32 }}>💚</div>
      </div>
    );
  }

  const showWelcome = messages.length === 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#f9faf8'
    }}>
      {/* Header */}
      <header style={{
        padding: '14px 20px',
        borderBottom: '1px solid #e8ebe8',
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{
            fontWeight: 700,
            fontSize: 18,
            color: '#1a3a2f'
          }}>
            Pattern 18
          </div>
          <div style={{
            fontSize: 12,
            color: '#7a8a80',
            marginTop: 1
          }}>
            I've got you
          </div>
        </div>
        <button 
          onClick={() => router.push('/my-case')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 14,
            color: '#5a6a60',
            cursor: 'pointer'
          }}
        >
          My Case →
        </button>
      </header>

      {/* Chat Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
        paddingBottom: detectedPatterns.length > 0 ? '240px' : '140px'
      }}>
        {showWelcome ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            textAlign: 'center',
            padding: '0 20px'
          }}>
            <div style={{ fontSize: 44, marginBottom: 24 }}>💚</div>
            <h1 style={{
              fontSize: 24,
              fontWeight: 600,
              color: '#1a3a2f',
              margin: '0 0 8px 0'
            }}>
              Hey, I'm here.
            </h1>
            <p style={{
              fontSize: 17,
              color: '#5a6a60',
              margin: '0 0 36px 0'
            }}>
              What's going on?
            </p>

            {/* Suggestions */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              width: '100%',
              maxWidth: 300
            }}>
              {/* Primary action */}
              <button
                onClick={() => handleSuggestion('upload')}
                style={{
                  padding: '16px 20px',
                  background: '#f0f7f4',
                  border: '1px solid #c8e0d5',
                  borderRadius: 14,
                  fontSize: 16,
                  color: '#1a3a2f',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                📸 Just got a message
              </button>
              
              {/* Secondary actions */}
              <button
                onClick={() => handleSuggestion("I have court coming up and need help preparing.")}
                style={{
                  padding: '16px 20px',
                  background: 'white',
                  border: '1px solid #e0e4e1',
                  borderRadius: 14,
                  fontSize: 16,
                  color: '#3a4a40',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                ⚖️ Preparing for court
              </button>
              <button
                onClick={() => handleSuggestion("I'm feeling overwhelmed and need a moment.")}
                style={{
                  padding: '16px 20px',
                  background: 'white',
                  border: '1px solid #e0e4e1',
                  borderRadius: 14,
                  fontSize: 16,
                  color: '#3a4a40',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
              >
                🌿 I need a moment
              </button>
            </div>

            {/* Hint */}
            <p style={{
              fontSize: 14,
              color: '#9ca89f',
              marginTop: 28
            }}>
              or just start typing
            </p>
          </div>
        ) : (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
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
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  {msg.imageUrl && (
                    <img 
                      src={msg.imageUrl} 
                      alt="Uploaded" 
                      style={{
                        maxWidth: '100%',
                        maxHeight: 200,
                        borderRadius: 12,
                        objectFit: 'contain'
                      }}
                    />
                  )}
                  {msg.content && (
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: msg.role === 'user' ? '#1a3a2f' : 'white',
                      color: msg.role === 'user' ? 'white' : '#1a3a2f',
                      fontSize: 15,
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                    }}>
                      {msg.content}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {sending && (
              <div style={{
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'flex-start'
              }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '18px 18px 18px 4px',
                  background: 'white',
                  color: '#7a8a80',
                  fontSize: 15,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}>
                  Analyzing...
                </div>
                <style>{`
                  @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                  }
                `}</style>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Save to Evidence */}
      {detectedPatterns.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 135,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '0 20px',
          pointerEvents: 'none'
        }}>
          {/* Pattern tags */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            justifyContent: 'center',
            pointerEvents: 'auto'
          }}>
            {detectedPatterns.map((pattern, i) => (
              <span key={i} style={{
                background: '#fef3c7',
                color: '#92400e',
                padding: '4px 10px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 500
              }}>
                {pattern}
              </span>
            ))}
          </div>
          
          {/* Save button */}
          <button
            onClick={handleSaveEvidence}
            disabled={saved}
            style={{
              padding: '12px 24px',
              background: saved ? '#059669' : '#1a3a2f',
              color: 'white',
              border: 'none',
              borderRadius: 24,
              fontSize: 15,
              fontWeight: 500,
              cursor: saved ? 'default' : 'pointer',
              boxShadow: '0 4px 12px rgba(26,58,47,0.3)',
              pointerEvents: 'auto',
              transition: 'background 0.2s'
            }}
          >
            {saved ? '✓ Saved to evidence!' : 'Save to evidence'}
          </button>
        </div>
      )}

      {/* Input Area */}
      <div style={{
        position: 'fixed',
        bottom: 70,
        left: 0,
        right: 0,
        padding: '12px 16px',
        background: 'white',
        borderTop: '1px solid #e8ebe8'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          maxWidth: 600,
          margin: '0 auto'
        }}>
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              border: 'none',
              background: '#f0f2f0',
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#5a6a60'
            }}
          >
            +
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What's happening?"
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={sending}
            style={{
              flex: 1,
              padding: '12px 18px',
              border: '1px solid #dfe3df',
              borderRadius: 24,
              fontSize: 16,
              outline: 'none',
              background: '#fafbfa'
            }}
          />
          <button 
            onClick={() => handleSend()}
            disabled={sending || !input.trim()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              border: 'none',
              background: input.trim() ? '#1a3a2f' : '#dfe3df',
              color: 'white',
              fontSize: 18,
              cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
          >
            ↑
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.csv"
          onChange={handleFileSelect}
          hidden
        />
      </div>

      <BottomNav active="coach" />
    </div>
  );
}