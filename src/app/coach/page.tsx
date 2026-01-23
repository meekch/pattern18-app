'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: { name: string; type: string }[];
}

export default function CoachPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
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
      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    const files = pendingFiles;
    
    if (!text && files.length === 0) return;

    setSending(true);
    setInput('');
    setPendingFiles([]);
    setPatterns([]);

    // Build user message with file info
    const userMessage: Message = { 
      role: 'user', 
      content: text,
      files: files.map(f => ({ name: f.name, type: f.type }))
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('message', text);
      formData.append('history', JSON.stringify(
        messages.map(m => ({ role: m.role, content: m.content }))
      ));
      
      files.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });
      formData.append('fileCount', String(files.length));

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
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
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
                setPatterns(data.patterns);
              }
            } catch (e) {}
          }
        }
      }

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const fileArray = Array.from(files);
    
    // Check for CSV - redirect
    if (fileArray.some(f => f.name.endsWith('.csv'))) {
      router.push('/evidence/upload');
      return;
    }
    
    setPendingFiles(prev => [...prev, ...fileArray]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (messages.length < 2) return;
    
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');
    
    if (!lastUserMsg || !lastAssistantMsg) return;

    try {
      await supabase.from('incidents').insert({
        user_id: user.id,
        title: patterns[0] || 'Conversation',
        coparent_message: lastUserMsg.content,
        category: patterns[0]?.toLowerCase().replace(/[\s\/]+/g, '_') || 'uncategorized',
        patterns: patterns,
        severity: 'medium',
        incident_date: new Date().toISOString(),
        ai_response: lastAssistantMsg.content,
        source: 'coach',
      });
      
      alert('Saved to My Case');
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8f9fa' }}>
        <div style={{ fontSize: 32 }}>💚</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <header style={{
        padding: '16px 20px',
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ fontWeight: 600, fontSize: 18, color: '#1a3a2f' }}>Pattern 18</div>
        <button 
          onClick={() => router.push('/my-case')}
          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14 }}
        >
          My Case →
        </button>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, paddingBottom: 160 }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 60, color: '#6b7280' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💚</div>
            <p style={{ fontSize: 18, marginBottom: 8 }}>How can I help?</p>
            <p style={{ fontSize: 14 }}>Upload documents or ask anything</p>
          </div>
        ) : (
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 24 }}>
                {/* User message */}
                {msg.role === 'user' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div>
                      {/* Show files if any */}
                      {msg.files && msg.files.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, justifyContent: 'flex-end' }}>
                          {msg.files.map((f, j) => (
                            <div key={j} style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '8px 12px',
                              background: '#f3f4f6',
                              borderRadius: 8,
                              fontSize: 13
                            }}>
                              <span>{f.type.includes('pdf') ? '📄' : '🖼️'}</span>
                              <span style={{ color: '#374151', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {f.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.content && (
                        <div style={{
                          background: '#1a3a2f',
                          color: 'white',
                          padding: '12px 16px',
                          borderRadius: 16,
                          maxWidth: 400,
                          whiteSpace: 'pre-wrap'
                        }}>
                          {msg.content}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Assistant message */}
                {msg.role === 'assistant' && (
                  <div style={{
                    background: 'white',
                    padding: '16px 20px',
                    borderRadius: 16,
                    border: '1px solid #e5e7eb',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                    color: '#1f2937'
                  }}>
                    {msg.content || '...'}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Save option - only shows after conversation with detected patterns */}
      {messages.length >= 2 && patterns.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 150,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50
        }}>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 20,
              fontSize: 14,
              color: '#6b7280',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            Save to My Case
          </button>
        </div>
      )}

      {/* Input Area */}
      <div style={{
        position: 'fixed',
        bottom: 70,
        left: 0,
        right: 0,
        background: 'white',
        borderTop: '1px solid #e5e7eb',
        padding: 16
      }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Pending files */}
          {pendingFiles.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {pendingFiles.map((file, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  background: '#f3f4f6',
                  borderRadius: 8,
                  fontSize: 13
                }}>
                  <span>{file.type.includes('pdf') ? '📄' : '🖼️'}</span>
                  <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </span>
                  <button 
                    onClick={() => removeFile(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Input row */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                border: '1px solid #e5e7eb',
                background: 'white',
                fontSize: 20,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280'
              }}
            >
              +
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask anything..."
              disabled={sending}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: 24,
                fontSize: 16,
                outline: 'none'
              }}
            />
            <button 
              onClick={handleSend}
              disabled={sending || (!input.trim() && pendingFiles.length === 0)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                border: 'none',
                background: sending || (!input.trim() && pendingFiles.length === 0) ? '#e5e7eb' : '#1a3a2f',
                color: 'white',
                fontSize: 18,
                cursor: sending ? 'wait' : 'pointer',
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
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            multiple
            hidden
          />
        </div>
      </div>

      <BottomNav active="coach" />
    </div>
  );
}