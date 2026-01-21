'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  patterns?: string[];
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

    const userMessage: Message = { 
      role: 'user', 
      content: text || (file ? `[Uploaded: ${file.name}]` : '')
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

      setDetectedPatterns([]);
      setEvidenceCount(prev => prev + 1);
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
        background: '#fafafa'
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
      background: '#fafafa'
    }}>
      {/* Minimal Header */}
      <header style={{
        padding: '12px 20px',
        borderBottom: '1px solid #eee',
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{
          fontWeight: 700,
          fontSize: 18,
          color: '#1a3a2f'
        }}>
          Pattern 18
        </span>
        <button 
          onClick={() => router.push('/my-case')}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 14,
            color: '#666',
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
        paddingBottom: '100px'
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
            <div style={{ fontSize: 40, marginBottom: 20 }}>💚</div>
            <h1 style={{
              fontSize: 22,
              fontWeight: 600,
              color: '#1a3a2f',
              margin: '0 0 8px 0'
            }}>
              Hey, I'm here.
            </h1>
            <p style={{
              fontSize: 16,
              color: '#666',
              margin: '0 0 32px 0'
            }}>
              What's going on?
            </p>

            {/* Subtle Suggestions */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              width: '100%',
              maxWidth: 280
            }}>
              <button
                onClick={() => handleSuggestion('upload')}
                style={{
                  padding: '14px 20px',
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: 12,
                  fontSize: 15,
                  color: '#333',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.2s'
                }}
              >
                📸 Just got a message
              </button>
              <button
                onClick={() => handleSuggestion("I have court coming up and need help preparing.")}
                style={{
                  padding: '14px 20px',
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: 12,
                  fontSize: 15,
                  color: '#333',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.2s'
                }}
              >
                ⚖️ Preparing for court
              </button>
              <button
                onClick={() => handleSuggestion("I'm feeling overwhelmed and need a moment.")}
                style={{
                  padding: '14px 20px',
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: 12,
                  fontSize: 15,
                  color: '#333',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.2s'
                }}
              >
                🌿 I need a moment
              </button>
            </div>
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
                  padding: '12px 16px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user' ? '#1a3a2f' : 'white',
                  color: msg.role === 'user' ? 'white' : '#1a3a2f',
                  fontSize: 15,
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                  boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}>
                  {msg.content}
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
                  color: '#999',
                  fontSize: 15,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}>
                  ...
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Save to Evidence - Only shows when patterns detected */}
      {detectedPatterns.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 130,
          left: 20,
          right: 20,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button
            onClick={handleSaveEvidence}
            style={{
              padding: '10px 20px',
              background: '#1a3a2f',
              color: 'white',
              border: 'none',
              borderRadius: 20,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            Save to evidence
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '2px 8px',
              borderRadius: 10,
              fontSize: 12
            }}>
              {detectedPatterns.length} {detectedPatterns.length === 1 ? 'pattern' : 'patterns'}
            </span>
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
        borderTop: '1px solid #eee'
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
              width: 40,
              height: 40,
              borderRadius: 20,
              border: 'none',
              background: '#f5f5f5',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
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
              padding: '12px 16px',
              border: '1px solid #e0e0e0',
              borderRadius: 24,
              fontSize: 16,
              outline: 'none'
            }}
          />
          <button 
            onClick={() => handleSend()}
            disabled={sending || !input.trim()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              border: 'none',
              background: input.trim() ? '#1a3a2f' : '#e0e0e0',
              color: 'white',
              fontSize: 16,
              cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
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