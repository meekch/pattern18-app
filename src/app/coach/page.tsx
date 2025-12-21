"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function CoachPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auth check
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);
    };
    checkUser();
  }, [router]);

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add empty assistant message for streaming
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: m.content + data.text }
                    : m
                ));
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: 'I apologize, but I encountered an error. Please try again.' }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      {/* Sidebar Overlay */}
      {showSidebar && (
        <div style={styles.overlay} onClick={() => setShowSidebar(false)} />
      )}

      {/* Sidebar */}
      <div style={{
        ...styles.sidebar,
        transform: showSidebar ? 'translateX(0)' : 'translateX(-100%)',
      }}>
        <div style={styles.sidebarHeader}>
          <h3 style={styles.sidebarTitle}>Menu</h3>
          <button onClick={() => setShowSidebar(false)} style={styles.closeBtn}>×</button>
        </div>
        <nav style={styles.nav}>
          <button onClick={() => router.push('/dashboard')} style={styles.navItem}>
            📊 Dashboard
          </button>
          <button onClick={() => router.push('/coach')} style={{...styles.navItem, ...styles.navItemActive}}>
            💬 AI Coach
          </button>
          <button onClick={() => router.push('/evidence')} style={styles.navItem}>
            📁 Evidence
          </button>
          <button onClick={() => router.push('/case-setup')} style={styles.navItem}>
            ⚙️ Case Settings
          </button>
          <div style={styles.navDivider} />
          <button onClick={() => router.push('/faq')} style={styles.navItem}>
            ❓ FAQ
          </button>
          <button onClick={handleLogout} style={{...styles.navItem, ...styles.logoutBtn}}>
            🚪 Log Out
          </button>
        </nav>
      </div>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => setShowSidebar(true)} style={styles.menuBtn}>☰</button>
          <div style={styles.brand}>
            <span style={styles.logo}>18</span>
            <div>
              <div style={styles.brandName}>Pattern 18</div>
              <div style={styles.brandTag}>Your 24/7 Strategic Partner</div>
            </div>
          </div>
        </div>
        <button onClick={handleLogout} style={styles.headerLogout}>Log Out</button>
      </header>

      {/* Chat Area */}
      <div style={styles.chatArea} ref={chatRef}>
        {messages.length === 0 ? (
          <div style={styles.welcome}>
            <div style={styles.heart}>💚</div>
            <h1 style={styles.welcomeTitle}>Hey, I am glad you are here.</h1>
            <p style={styles.welcomeText}>
              I am your 24/7 strategic partner. Whether you just got a message that made your
              stomach drop, need help with a court document, or simply need a moment to
              breathe - I have got you.
            </p>
            <div style={styles.tagline}>
              <span style={styles.tag}>Be present.</span>
              <span style={styles.tag}>Don't react.</span>
              <span style={styles.tag}>Take back control.</span>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              style={msg.role === 'user' ? styles.userMsg : styles.assistantMsg}
            >
              <div style={msg.role === 'user' ? styles.userBubble : styles.assistantBubble}>
                {msg.content || (isLoading && msg.role === 'assistant' ? '...' : '')}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div style={styles.inputArea}>
        <div style={styles.inputContainer}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's happening?"
            style={styles.input}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            style={{
              ...styles.sendBtn,
              opacity: isLoading || !input.trim() ? 0.5 : 1,
            }}
          >
            ➤
          </button>
        </div>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f5f7f6',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '18px',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 40,
  },
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: '280px',
    backgroundColor: '#1a3a2f',
    zIndex: 50,
    transition: 'transform 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  sidebarTitle: {
    color: 'white',
    fontSize: '18px',
    fontWeight: 600,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '28px',
    cursor: 'pointer',
  },
  nav: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '15px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.2s',
  },
  navItemActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white',
  },
  navDivider: {
    height: '1px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    margin: '12px 0',
  },
  logoutBtn: {
    color: '#ff6b6b',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#1a3a2f',
    color: 'white',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  menuBtn: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: '8px 12px',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '18px',
  },
  brandName: {
    fontWeight: 600,
    fontSize: '16px',
  },
  brandTag: {
    fontSize: '12px',
    opacity: 0.7,
  },
  headerLogout: {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.3)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
  },
  welcome: {
    textAlign: 'center',
    padding: '40px 20px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  heart: {
    fontSize: '48px',
    marginBottom: '20px',
  },
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: 600,
    color: '#1a3a2f',
    marginBottom: '16px',
  },
  welcomeText: {
    color: '#666',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  tagline: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#1a3a2f',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '14px',
  },
  userMsg: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '16px',
  },
  assistantMsg: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: '16px',
  },
  userBubble: {
    backgroundColor: '#1a3a2f',
    color: 'white',
    padding: '12px 16px',
    borderRadius: '18px 18px 4px 18px',
    maxWidth: '80%',
    whiteSpace: 'pre-wrap',
  },
  assistantBubble: {
    backgroundColor: 'white',
    color: '#333',
    padding: '12px 16px',
    borderRadius: '18px 18px 18px 4px',
    maxWidth: '80%',
    whiteSpace: 'pre-wrap',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  inputArea: {
    padding: '16px 20px',
    backgroundColor: 'white',
    borderTop: '1px solid #eee',
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  input: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '24px',
    border: '1px solid #ddd',
    fontSize: '16px',
    resize: 'none',
    outline: 'none',
  },
  sendBtn: {
    backgroundColor: '#1a3a2f',
    color: 'white',
    border: 'none',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};