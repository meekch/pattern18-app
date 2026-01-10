'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  patterns?: string[];
  savedIncidentId?: string;
  isAnalysis?: boolean;
}

interface PatternCounts {
  [key: string]: number;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [patternCounts, setPatternCounts] = useState<PatternCounts>({});
  const [daysUntilCourt, setDaysUntilCourt] = useState<number | null>(null);
  const [courtDate, setCourtDate] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [progressText, setProgressText] = useState('');
  const [caseContext, setCaseContext] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const progressMessages = [
    'Reading the message...',
    'Identifying patterns...',
    'Checking your history...',
    'Preparing response options...',
  ];

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

      if (caseData) {
        setCaseContext(caseData);
        if (caseData.next_court_date) {
          const days = Math.ceil((new Date(caseData.next_court_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (days > 0) {
            setDaysUntilCourt(days);
            setCourtDate(new Date(caseData.next_court_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
          }
        }
      }

      // Load evidence stats
      const { data: evidence } = await supabase
        .from('incidents')
        .select('category, patterns')
        .eq('user_id', session.user.id);

      if (evidence) {
        setEvidenceCount(evidence.length);
        
        // Count patterns
        const counts: PatternCounts = {};
        evidence.forEach((e: any) => {
          if (e.category && e.category !== 'not_abuse' && e.category !== 'uncategorized') {
            counts[e.category] = (counts[e.category] || 0) + 1;
          }
          if (e.patterns) {
            e.patterns.forEach((p: string) => {
              const key = p.toLowerCase().replace(/[\s\/]+/g, '_');
              counts[key] = (counts[key] || 0) + 1;
            });
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

  useEffect(() => {
    if (!sending) return;
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % progressMessages.length;
      setProgressText(progressMessages[index]);
    }, 1500);
    return () => clearInterval(interval);
  }, [sending]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSend = async (messageText?: string, file?: File) => {
    const text = messageText || input;
    if (!text.trim() && !file) return;

    setShowWelcome(false);
    setSending(true);
    setProgressText(progressMessages[0]);
    setInput('');

    const userMessage: Message = {
      role: 'user',
      content: text || (file ? `[Analyzing image...]` : ''),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('message', text);
      formData.append('history', JSON.stringify(messages.slice(-10)));
      formData.append('patternCounts', JSON.stringify(patternCounts));
      formData.append('evidenceCount', String(evidenceCount));
      formData.append('autoSave', 'true');
      formData.append('userId', user.id);
      
      if (caseContext) {
        formData.append('caseContext', JSON.stringify(caseContext));
      }

      if (file) {
        formData.append('file', file);
      }

      const response = await fetch('/api/coach-unified', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      let assistantContent = '';
      let detectedPatterns: string[] = [];
      let savedId: string | null = null;

      setMessages(prev => [...prev, { role: 'assistant', content: '', isAnalysis: true }]);

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
                detectedPatterns = data.patterns;
              }
              if (data.savedId) {
                savedId = data.savedId;
                setEvidenceCount(prev => prev + 1);
                // Update pattern counts
                detectedPatterns.forEach(p => {
                  const key = p.toLowerCase().replace(/[\s\/]+/g, '_');
                  setPatternCounts(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
                });
              }
            } catch (e) {}
          }
        }
      }

      // Update final message
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        lastMsg.patterns = detectedPatterns;
        lastMsg.savedIncidentId = savedId || undefined;
        return newMessages;
      });

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Something went wrong. Please try again.'
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      await handleSend('Analyze this screenshot', file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const quickActions = [
    { label: '📸 Analyze screenshot', action: () => fileInputRef.current?.click() },
    { label: '📋 Show my patterns', action: () => handleSend('Show me a summary of all my documented patterns') },
    { label: '⚖️ Prepare for court', action: () => handleSend('Help me prepare for my upcoming court hearing') },
    { label: '🌿 I need a moment', action: () => handleSend('I need help calming down right now') },
  ];

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#fafafa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💚</div>
          <div style={{ color: '#666' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fafafa',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            background: '#1a3a2f',
            color: 'white',
            fontWeight: 800,
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: 14
          }}>18</span>
          <span style={{ fontWeight: 600, color: '#1a3a2f' }}>Pattern 18</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Evidence Count */}
          <button
            onClick={() => router.push('/evidence')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: evidenceCount > 0 ? '#f0fdf4' : '#f3f4f6',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 20,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: '#1a3a2f'
            }}
          >
            <span>📁</span>
            <span>{evidenceCount}</span>
          </button>

          {/* Court Countdown */}
          {daysUntilCourt && (
            <button
              onClick={() => handleSend('Help me prepare for my court hearing on ' + courtDate)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: daysUntilCourt <= 7 ? '#fef2f2' : daysUntilCourt <= 14 ? '#fef3c7' : '#f0fdf4',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 20,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: daysUntilCourt <= 7 ? '#dc2626' : daysUntilCourt <= 14 ? '#d97706' : '#059669'
              }}
            >
              <span>📅</span>
              <span>{daysUntilCourt}d</span>
            </button>
          )}

          {/* Settings */}
          <button
            onClick={() => router.push('/settings')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              padding: 4
            }}
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 20,
        paddingBottom: 180
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          
          {/* Welcome State */}
          {showWelcome && messages.length === 0 && (
            <div style={{ paddingTop: 40 }}>
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>💚</div>
                <h1 style={{ 
                  fontSize: 24, 
                  fontWeight: 600, 
                  color: '#1a3a2f',
                  margin: '0 0 8px'
                }}>
                  Hey. What's going on?
                </h1>
                <p style={{ 
                  color: '#6b7280', 
                  margin: 0,
                  fontSize: 15,
                  lineHeight: 1.5
                }}>
                  Paste a message, upload a screenshot, or just talk.<br/>
                  I'll identify patterns and save everything for court.
                </p>
              </div>

              {/* Stats if they have evidence */}
              {evidenceCount > 0 && (
                <div style={{
                  background: 'white',
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 24,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-around',
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#1a3a2f' }}>{evidenceCount}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>DOCUMENTED</div>
                    </div>
                    <div style={{ width: 1, background: '#e5e7eb' }} />
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: '#1a3a2f' }}>
                        {Object.keys(patternCounts).filter(k => !['not_abuse', 'uncategorized', 'none_detected'].includes(k)).length}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>PATTERNS</div>
                    </div>
                    {daysUntilCourt && (
                      <>
                        <div style={{ width: 1, background: '#e5e7eb' }} />
                        <div>
                          <div style={{ 
                            fontSize: 28, 
                            fontWeight: 700, 
                            color: daysUntilCourt <= 7 ? '#dc2626' : '#d97706' 
                          }}>
                            {daysUntilCourt}
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280' }}>DAYS TO COURT</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12
              }}>
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={action.action}
                    style={{
                      padding: 16,
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#374151',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#1a3a2f';
                      e.currentTarget.style.background = '#f0fdf4';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              {msg.role === 'user' ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end'
                }}>
                  <div style={{
                    background: '#1a3a2f',
                    color: 'white',
                    padding: '12px 16px',
                    borderRadius: '18px 18px 4px 18px',
                    maxWidth: '80%',
                    fontSize: 15,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div>
                  {/* Pattern Alert */}
                  {msg.patterns && msg.patterns.length > 0 && (
                    <div style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>🔴</span>
                        <div>
                          <div style={{ fontWeight: 600, color: '#dc2626', fontSize: 14 }}>
                            {msg.patterns.slice(0, 2).join(' + ')} detected
                          </div>
                          {msg.savedIncidentId && (
                            <div style={{ fontSize: 12, color: '#059669' }}>
                              ✓ Saved automatically
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {msg.patterns.map((p, j) => {
                          const key = p.toLowerCase().replace(/[\s\/]+/g, '_');
                          const count = patternCounts[key] || 1;
                          return (
                            <span key={j} style={{
                              background: 'white',
                              padding: '4px 10px',
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#92400e'
                            }}>
                              {count}x {p}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Assistant Message */}
                  <div style={{
                    background: 'white',
                    padding: '16px',
                    borderRadius: '18px 18px 18px 4px',
                    maxWidth: '90%',
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: '#1a3a2f',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content || (sending && i === messages.length - 1 && (
                      <span style={{ color: '#9ca3af' }}>{progressText}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Fixed at Bottom */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'white',
        borderTop: '1px solid #e5e7eb',
        padding: '12px 20px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))'
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Generate Exhibit Button - Only show if they have evidence */}
          {evidenceCount > 0 && (
            <button
              onClick={() => router.push('/generate-exhibit')}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <span>📄</span>
              Generate Court Exhibit ({evidenceCount} incidents)
            </button>
          )}
          
          {/* Input Row */}
          <div style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end'
          }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: '#f3f4f6',
                border: 'none',
                width: 44,
                height: 44,
                borderRadius: 22,
                fontSize: 20,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              📎
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Paste a message, ask anything..."
              disabled={sending}
              rows={1}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: 24,
                fontSize: 16,
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.4,
                maxHeight: 120
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#1a3a2f'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
            />
            <button
              onClick={() => handleSend()}
              disabled={sending || !input.trim()}
              style={{
                background: sending || !input.trim() ? '#9ca3af' : '#1a3a2f',
                color: 'white',
                border: 'none',
                width: 44,
                height: 44,
                borderRadius: 22,
                fontSize: 18,
                cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                flexShrink: 0
              }}
            >
              ➤
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          hidden
        />
      </div>
    </div>
  );
}