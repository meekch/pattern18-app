'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  patterns?: string[];
  files?: { name: string; type: string }[];
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
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
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

  const handleSend = async () => {
    const text = input.trim();
    const files = pendingFiles;
    
    if (!text && files.length === 0) return;

    setShowHome(false);
    setSending(true);
    setInput('');
    setPendingFiles([]);

    // Build display content
    const fileInfo = files.map(f => ({ name: f.name, type: f.type }));
    
    const userMessage: Message = { 
      role: 'user', 
      content: text || (files.length > 0 ? `Uploaded ${files.length} file${files.length > 1 ? 's' : ''}` : ''),
      files: fileInfo.length > 0 ? fileInfo : undefined
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('message', text);
      formData.append('history', JSON.stringify(messages));
      if (caseContext) formData.append('caseContext', JSON.stringify(caseContext));
      
      // Append all files
      for (const file of files) {
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
              }
            } catch (e) {}
          }
        }
      }

      // Update with patterns (for quiet tagging)
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    
    // Check for CSV - redirect to bulk import
    if (fileArray.some(f => f.type === 'text/csv' || f.name.endsWith('.csv'))) {
      router.push('/evidence/upload');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Add files to pending (supports multiple)
    setPendingFiles(prev => [...prev, ...fileArray]);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') return '📄';
    if (type.startsWith('image/')) return '📷';
    return '📎';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f7f6' }}>
        <div style={{ fontSize: 48, animation: 'pulse 1.5s infinite' }}>💚</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #e8f5e9 0%, #f5f7f6 100%)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: '#1a3a2f', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ background: 'white', color: '#1a3a2f', fontWeight: 800, padding: '6px 10px', borderRadius: 8, fontSize: 14 }}>18</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Pattern 18</span>
            <span style={{ fontSize: 11, opacity: 0.8 }}>Your 24/7 Strategic Partner</span>
          </div>
        </div>
        <button onClick={() => router.push('/my-case')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', padding: '8px 14px', borderRadius: 20, color: 'white', fontSize: 14, cursor: 'pointer' }}>
          📁 {evidenceCount}
        </button>
      </header>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 160 }}>
        {showHome ? (
          <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>💚</div>
              <h1 style={{ fontSize: 24, color: '#1a3a2f', margin: '0 0 12px 0' }}>Hey, I am glad you are here.</h1>
              <p style={{ color: '#4b5563', lineHeight: 1.5, margin: 0 }}>Whether you just got a message that made your stomach drop, need help with a court document, or simply need a moment to breathe - I have got you.</p>
            </div>

            <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ textAlign: 'center', fontSize: 12, letterSpacing: 1, color: '#6b7280', margin: '0 0 16px 0' }}>WHAT CAN I HELP WITH?</h3>
              
              {[
                { id: 'screenshot', icon: '📸', title: 'Analyze a screenshot', desc: 'Upload image of a message', primary: true },
                { id: 'courtdoc', icon: '📄', title: 'Court doc help', desc: 'Understand, respond, or prepare filings' },
                { id: 'import', icon: '📤', title: 'Import message history', desc: 'Bulk analyze CSV export' },
                { id: 'moment', icon: '🌿', title: 'I need a moment', desc: 'Breathing, grounding, support' },
              ].map(action => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: 16,
                    background: action.primary ? '#f0fdf4' : 'white',
                    border: `2px solid ${action.primary ? '#1a3a2f' : '#e5e7eb'}`,
                    borderRadius: 12, cursor: 'pointer', textAlign: 'left', marginBottom: 12
                  }}
                >
                  <span style={{ fontSize: 28 }}>{action.icon}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ fontWeight: 600, color: '#1a3a2f' }}>{action.title}</span>
                    <span style={{ fontSize: 13, color: '#9ca3af' }}>{action.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 600, margin: '0 auto', padding: 20 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                {/* Show files if present */}
                {msg.files && msg.files.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8, marginLeft: msg.role === 'user' ? 40 : 0, marginRight: msg.role === 'assistant' ? 40 : 0 }}>
                    {msg.files.map((f, j) => (
                      <span key={j} style={{ background: '#f3f4f6', padding: '4px 10px', borderRadius: 8, fontSize: 12, color: '#374151' }}>
                        {getFileIcon(f.type)} {f.name}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{
                  background: msg.role === 'user' ? '#1a3a2f' : 'white',
                  color: msg.role === 'user' ? 'white' : '#1a3a2f',
                  padding: '14px 18px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  marginLeft: msg.role === 'user' ? 40 : 0,
                  marginRight: msg.role === 'assistant' ? 40 : 0,
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ background: 'white', color: '#9ca3af', padding: '14px 18px', borderRadius: '18px 18px 18px 4px', marginRight: 40, fontStyle: 'italic' }}>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ position: 'fixed', bottom: 70, left: 0, right: 0, background: 'white', borderTop: '1px solid #e5e7eb', padding: '8px 16px 12px' }}>
        {/* File Previews */}
        {pendingFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
            {pendingFiles.map((file, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #1a3a2f', borderRadius: 8, padding: '6px 10px' }}>
                <span style={{ fontSize: 14 }}>{getFileIcon(file.type)}</span>
                <span style={{ fontSize: 12, color: '#1a3a2f', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 14, cursor: 'pointer', padding: 0 }}>✕</button>
              </div>
            ))}
          </div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => fileInputRef.current?.click()} style={{ background: '#f3f4f6', border: 'none', width: 44, height: 44, borderRadius: 22, fontSize: 20, cursor: 'pointer', flexShrink: 0 }}>
            +
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={pendingFiles.length > 0 ? "Add a message (optional)..." : "What's going on?"}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={sending}
            style={{ flex: 1, padding: '12px 16px', border: '2px solid #e5e7eb', borderRadius: 24, fontSize: 16, outline: 'none' }}
          />
          <button 
            onClick={handleSend}
            disabled={sending || (!input.trim() && pendingFiles.length === 0)}
            style={{ background: '#1a3a2f', color: 'white', border: 'none', width: 44, height: 44, borderRadius: 22, fontSize: 18, cursor: 'pointer', flexShrink: 0, opacity: (sending || (!input.trim() && pendingFiles.length === 0)) ? 0.5 : 1 }}
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

      <BottomNav active="coach" />
    </div>
  );
}