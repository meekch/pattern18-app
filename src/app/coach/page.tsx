'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import SafetyResources, { detectCrisis } from '@/components/SafetyResources';

// ============================================
// TYPES
// ============================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  patterns?: string[];
  savedToEvidence?: boolean;
}

interface CaseContext {
  caseNumber: string;
  court: string;
  petitionerName: string;
  respondentName: string;
  userRole: string;
  coparentName: string;
  nextCourtDate: string | null;
}

// ============================================
// CONSTANTS
// ============================================

const affirmations = [
  { text: "Their chaos is not your emergency.", subtext: "You are allowed to pause." },
  { text: "You are not crazy. This is real.", subtext: "Trust what you've lived." },
  { text: "Silence is a complete response.", subtext: "You don't owe them an explanation." },
  { text: "You're building something they can't take.", subtext: "Every document is proof." },
  { text: "Your peace is not up for negotiation.", subtext: "Protect it fiercely." },
  { text: "The best response is often no response.", subtext: "Let them tell on themselves." },
  { text: "You survived 100% of your worst days.", subtext: "You'll survive this one too." },
  { text: "Document. Breathe. Protect. Repeat.", subtext: "You're doing it right." },
  { text: "They want you reactive. Stay strategic.", subtext: "Your calm is your superpower." },
  { text: "Be present. Be prepared. Be empowered.", subtext: "You've got this." },
];

const groundingSteps = [
  { sense: 'SEE', instruction: 'Name 5 things you can see right now.', icon: '👁️' },
  { sense: 'TOUCH', instruction: 'Name 4 things you can physically feel.', icon: '✋' },
  { sense: 'HEAR', instruction: 'Name 3 things you can hear.', icon: '👂' },
  { sense: 'SMELL', instruction: 'Name 2 things you can smell.', icon: '👃' },
  { sense: 'TASTE', instruction: 'Name 1 thing you can taste.', icon: '👅' },
];

const quickActions = [
  { icon: '📱', title: 'Analyze a message', desc: 'Decode what they really mean', prompt: 'I just received this message and need help understanding what\'s really going on:\n\n[paste message here]' },
  { icon: '✍️', title: 'Draft a response', desc: 'Strategic, calm replies', prompt: 'I need to respond to this message. Help me craft something strategic:\n\n' },
  { icon: '⚖️', title: 'Court document help', desc: 'Motions, declarations, exhibits', prompt: 'I need help with a court document. Here\'s what I\'m trying to accomplish:\n\n' },
  { icon: '🎯', title: 'Identify patterns', desc: 'See the manipulation tactics', prompt: 'Can you help me identify manipulation patterns in this situation:\n\n' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function CoachPage() {
  const router = useRouter();
  
  // Core state
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // UI state
  const [showSidebar, setShowSidebar] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [savingEvidence, setSavingEvidence] = useState<string | null>(null);
  
  // Safety state
  const [showSafetyResources, setShowSafetyResources] = useState(false);
  const [safetyTriggered, setSafetyTriggered] = useState(false);
  
  // Case & evidence state
  const [caseContext, setCaseContext] = useState<CaseContext | null>(null);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [daysUntilCourt, setDaysUntilCourt] = useState<number | null>(null);
  
  // Regulate state
  const [showRegulate, setShowRegulate] = useState(false);
  const [regulateMode, setRegulateMode] = useState<'menu' | 'breathe' | 'ground' | 'affirm'>('menu');
  const [breathePhase, setBreathePhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [groundStep, setGroundStep] = useState(0);
  const [currentAffirmation, setCurrentAffirmation] = useState(affirmations[0]);
  
  // Refs
  const chatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // AUTH & DATA LOADING
  // ============================================

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
        if (caseData.nextCourtDate) {
          const days = Math.ceil((new Date(caseData.nextCourtDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (days > 0) setDaysUntilCourt(days);
        }
      }
      
      // Load evidence count - check both tables
      const { count: evidenceTableCount } = await supabase
        .from('evidence')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      
      const { count: incidentsCount } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);
      
      setEvidenceCount((evidenceTableCount || 0) + (incidentsCount || 0));
      setAuthLoading(false);
    };
    
    init();
  }, [router]);

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Breathing animation
  useEffect(() => {
    if (showRegulate && regulateMode === 'breathe') {
      const phases = ['inhale', 'hold', 'exhale'] as const;
      const durations = [4000, 4000, 4000];
      let index = 0;
      
      const cycle = () => {
        setBreathePhase(phases[index]);
        index = (index + 1) % 3;
      };
      
      cycle();
      const interval = setInterval(cycle, durations[index]);
      return () => clearInterval(interval);
    }
  }, [showRegulate, regulateMode]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const sendMessage = async (overrideMessage?: string) => {
    const messageText = overrideMessage || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowWelcome(false);

    // Check for crisis keywords - gentle safety check
    if (detectCrisis(messageText)) {
      setSafetyTriggered(true);
      setShowSafetyResources(true);
    }

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
          message: messageText,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          caseContext,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let patterns: string[] = [];

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
              if (data.patterns) {
                patterns = data.patterns;
              }
              if (data.done && patterns.length > 0) {
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, patterns }
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

  const saveToEvidence = async (msg: Message, userMsg?: Message) => {
    if (!user || savingEvidence) return;
    setSavingEvidence(msg.id);

    try {
      await supabase.from('evidence').insert({
        user_id: user.id,
        type: 'ai_analysis',
        content: msg.content,
        original_message: userMsg?.content || null,
        patterns: msg.patterns || [],
        created_at: new Date().toISOString(),
      });

      setMessages(prev => prev.map(m =>
        m.id === msg.id ? { ...m, savedToEvidence: true } : m
      ));
      setEvidenceCount(prev => prev + 1);
    } catch (error) {
      console.error('Failed to save evidence:', error);
    } finally {
      setSavingEvidence(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectQuickAction = (prompt: string) => {
    setInput(prompt);
    setShowWelcome(false);
  };

  const nextAffirmation = () => {
    const currentIndex = affirmations.indexOf(currentAffirmation);
    setCurrentAffirmation(affirmations[(currentIndex + 1) % affirmations.length]);
  };

  // ============================================
  // RENDER
  // ============================================

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-heart">💚</div>
        <p>Loading your safe space...</p>
        <style jsx>{`
          .loading-screen {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #f5f7f6;
          }
          .loading-heart {
            font-size: 48px;
            animation: pulse 1.5s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Sidebar Overlay */}
      {showSidebar && <div className="overlay" onClick={() => setShowSidebar(false)} />}

      {/* Sidebar */}
      <div className={`sidebar ${showSidebar ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-logo">18</span>
            <span>Pattern 18</span>
          </div>
          <button onClick={() => setShowSidebar(false)} className="close-btn">×</button>
        </div>
        
        <nav className="nav">
          <button onClick={() => { router.push('/dashboard'); setShowSidebar(false); }} className="nav-item">
            🏠 Home
          </button>
          <button className="nav-item active">
            💬 Coach
          </button>
          <button onClick={() => { router.push('/evidence'); setShowSidebar(false); }} className="nav-item">
            📁 Evidence
          </button>
          <button onClick={() => { router.push('/case-setup'); setShowSidebar(false); }} className="nav-item">
            ⚙️ Settings
          </button>
          
          <div className="nav-divider" />
          
          <button onClick={() => { setSafetyTriggered(false); setShowSafetyResources(true); setShowSidebar(false); }} className="nav-item safety">
            🤍 Safety Resources
          </button>
          <button onClick={handleLogout} className="nav-item logout">
            🚪 Log Out
          </button>
        </nav>
      </div>

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <button onClick={() => setShowSidebar(true)} className="menu-btn">☰</button>
          <div className="brand" onClick={() => router.push('/dashboard')} style={{cursor: 'pointer'}}>
            <span className="logo">18</span>
            <div className="brand-text">
              <span className="brand-name">Pattern 18</span>
              <span className="brand-tag">Your 24/7 Strategic Partner</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          {daysUntilCourt && (
            <div className="court-badge" onClick={() => router.push('/case-setup')}>
              <span className="court-days">{daysUntilCourt}</span>
              <span className="court-label">days to court</span>
            </div>
          )}
          <div className="evidence-badge" onClick={() => router.push('/evidence')}>
            <span className="evidence-count">{evidenceCount}</span>
            <span>Evidence</span>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="chat-area" ref={chatRef}>
        {showWelcome ? (
          <div className="welcome">
            <div className="welcome-heart">💚</div>
            <h1 className="welcome-title">Hey, I am glad you are here.</h1>
            <p className="welcome-text">
              Whether you just got a message that made your stomach drop, 
              need help with a court document, or simply need a moment to breathe - I have got you.
            </p>

            <div className="quick-actions">
              <h3>What can I help with?</h3>
              <div className="actions-grid">
                {quickActions.map((action, i) => (
                  <button key={i} className="action-card" onClick={() => selectQuickAction(action.prompt)}>
                    <span className="action-icon">{action.icon}</span>
                    <div>
                      <div className="action-title">{action.title}</div>
                      <div className="action-desc">{action.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button className="breathe-btn" onClick={() => { setShowRegulate(true); setRegulateMode('menu'); }}>
              🫁 Need to breathe first?
            </button>
          </div>
        ) : (
          <div className="messages">
            {messages.map((msg, idx) => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="bubble">
                  {msg.content || (isLoading && msg.role === 'assistant' ? '...' : '')}
                </div>
                {msg.role === 'assistant' && msg.content && (
                  <div className="message-actions">
                    <div className="action-buttons">
                      <button onClick={() => navigator.clipboard.writeText(msg.content)} className="action-btn">
                        📋 Copy
                      </button>
                      {msg.patterns && msg.patterns.length > 0 && (
                        msg.savedToEvidence ? (
                          <span className="saved-badge">✓ Saved</span>
                        ) : (
                          <button
                            onClick={() => {
                              const userMsg = idx > 0 ? messages[idx - 1] : undefined;
                              saveToEvidence(msg, userMsg);
                            }}
                            disabled={savingEvidence === msg.id}
                            className="action-btn save"
                          >
                            {savingEvidence === msg.id ? 'Saving...' : '📌 Save'}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="input-area">
        <div className="input-container">
          <button onClick={() => fileInputRef.current?.click()} className="attach-btn">📎</button>
          <input 
            type="file" 
            ref={fileInputRef} 
            hidden 
            accept="image/*,.pdf" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              
              const formData = new FormData();
              formData.append('file', file);
              formData.append('message', input || '');
              formData.append('history', JSON.stringify(messages.map(m => ({ role: m.role, content: m.content }))));
              if (caseContext) formData.append('caseContext', JSON.stringify(caseContext));
              
              setIsLoading(true);
              setShowWelcome(false);
              
              const userMsg: Message = {
                id: Date.now().toString(),
                role: 'user',
                content: input || `[Uploaded: ${file.name}]`,
                timestamp: new Date(),
              };
              setMessages(prev => [...prev, userMsg]);
              setInput('');
              
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
                  body: formData,
                });
                
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let patterns: string[] = [];
                
                if (reader) {
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
                          if (data.patterns) patterns = data.patterns;
                          if (data.done && patterns.length > 0) {
                            setMessages(prev => prev.map(m =>
                              m.id === assistantId ? { ...m, patterns } : m
                            ));
                          }
                        } catch {}
                      }
                    }
                  }
                }
              } catch (error) {
                console.error('Upload error:', error);
                setMessages(prev => prev.map(m =>
                  m.id === assistantId
                    ? { ...m, content: 'Sorry, I had trouble with that file. Try again?' }
                    : m
                ));
              } finally {
                setIsLoading(false);
                e.target.value = '';
              }
            }}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's happening?"
            rows={1}
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="send-btn"
          >
            ➤
          </button>
        </div>
      </div>

      {/* Regulate Modal */}
      {showRegulate && (
        <div className="regulate-overlay" onClick={() => setShowRegulate(false)}>
          <div className="regulate-modal" onClick={(e) => e.stopPropagation()}>
            <button className="regulate-close" onClick={() => setShowRegulate(false)}>×</button>
            
            {regulateMode === 'menu' && (
              <div className="regulate-menu">
                <h2>Take a moment</h2>
                <p>What do you need right now?</p>
                <div className="regulate-options">
                  <button onClick={() => setRegulateMode('breathe')} className="regulate-option">
                    <span>🫁</span>
                    <div>
                      <strong>Breathe</strong>
                      <p>4-4-4 calming breath</p>
                    </div>
                  </button>
                  <button onClick={() => setRegulateMode('ground')} className="regulate-option">
                    <span>🌳</span>
                    <div>
                      <strong>Ground</strong>
                      <p>5-4-3-2-1 senses</p>
                    </div>
                  </button>
                  <button onClick={() => setRegulateMode('affirm')} className="regulate-option">
                    <span>💚</span>
                    <div>
                      <strong>Affirm</strong>
                      <p>Words of truth</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {regulateMode === 'breathe' && (
              <div className="breathe-mode">
                <div className={`breathe-circle ${breathePhase}`}>
                  <span>{breathePhase === 'inhale' ? 'Breathe in' : breathePhase === 'hold' ? 'Hold' : 'Breathe out'}</span>
                </div>
                <button onClick={() => setRegulateMode('menu')} className="back-btn">← Back</button>
              </div>
            )}

            {regulateMode === 'ground' && (
              <div className="ground-mode">
                <div className="ground-step">
                  <span className="ground-icon">{groundingSteps[groundStep].icon}</span>
                  <h3>{groundingSteps[groundStep].sense}</h3>
                  <p>{groundingSteps[groundStep].instruction}</p>
                </div>
                <div className="ground-nav">
                  <button onClick={() => setGroundStep(Math.max(0, groundStep - 1))} disabled={groundStep === 0}>Previous</button>
                  <span>{groundStep + 1} / 5</span>
                  <button onClick={() => groundStep < 4 ? setGroundStep(groundStep + 1) : setRegulateMode('menu')}>
                    {groundStep < 4 ? 'Next' : 'Done'}
                  </button>
                </div>
                <button onClick={() => setRegulateMode('menu')} className="back-btn">← Back</button>
              </div>
            )}

            {regulateMode === 'affirm' && (
              <div className="affirm-mode">
                <div className="affirmation">
                  <p className="affirm-text">{currentAffirmation.text}</p>
                  <p className="affirm-subtext">{currentAffirmation.subtext}</p>
                </div>
                <button onClick={nextAffirmation} className="next-affirm">Another →</button>
                <button onClick={() => setRegulateMode('menu')} className="back-btn">← Back</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Safety Resources Modal */}
      <SafetyResources 
        isOpen={showSafetyResources} 
        onClose={() => {
          setShowSafetyResources(false);
          setSafetyTriggered(false);
        }}
        triggered={safetyTriggered}
      />

      <style jsx>{`
        .container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #f5f7f6;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Overlay */
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 40;
        }

        /* Sidebar */
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 280px;
          background: #1a3a2f;
          z-index: 50;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
        }
        .sidebar.open { transform: translateX(0); }
        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white;
          font-weight: 600;
        }
        .sidebar-logo {
          background: rgba(255,255,255,0.15);
          padding: 6px 10px;
          border-radius: 6px;
          font-weight: 700;
        }
        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 28px;
          cursor: pointer;
        }
        .nav {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: rgba(255,255,255,0.7);
          font-size: 15px;
          cursor: pointer;
          text-align: left;
        }
        .nav-item:hover, .nav-item.active {
          background: rgba(255,255,255,0.1);
          color: white;
        }
        .nav-item.breathe { color: #5eead4; }
        .nav-item.safety { color: #f9a8d4; }
        .nav-item.logout { color: #fca5a5; }
        .nav-divider {
          height: 1px;
          background: rgba(255,255,255,0.1);
          margin: 8px 0;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: #1a3a2f;
          color: white;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .menu-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          background: rgba(255,255,255,0.15);
          padding: 8px 12px;
          border-radius: 8px;
          font-weight: 700;
        }
        .brand-text {
          display: flex;
          flex-direction: column;
        }
        .brand-name { font-weight: 600; }
        .brand-tag { font-size: 12px; opacity: 0.7; }
        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .court-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(251,191,36,0.2);
          padding: 6px 12px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 13px;
        }
        .court-days {
          background: #fbbf24;
          color: #1a3a2f;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 700;
        }
        .evidence-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.1);
          padding: 6px 12px;
          border-radius: 20px;
          cursor: pointer;
          font-size: 13px;
        }
        .evidence-count {
          background: #14b8a6;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 700;
        }

        /* Chat Area */
        .chat-area {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        /* Welcome */
        .welcome {
          max-width: 600px;
          margin: 0 auto;
          text-align: center;
          padding: 20px;
        }
        .welcome-heart {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .welcome-title {
          font-size: 28px;
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 12px;
        }
        .welcome-text {
          color: #666;
          line-height: 1.6;
          margin-bottom: 20px;
        }
        .tagline {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 32px;
        }
        .tag {
          background: #1a3a2f;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
        }
        .quick-actions {
          background: white;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .quick-actions h3 {
          color: #666;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 16px;
        }
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .action-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }
        .action-card:hover {
          border-color: #14b8a6;
          background: #f0fdfa;
        }
        .action-icon { font-size: 24px; }
        .action-title { font-weight: 600; color: #1a3a2f; }
        .action-desc { font-size: 13px; color: #666; }
        .breathe-btn {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: none;
          padding: 12px 24px;
          border-radius: 24px;
          font-size: 15px;
          cursor: pointer;
          color: #92400e;
        }

        /* Messages */
        .messages {
          max-width: 800px;
          margin: 0 auto;
        }
        .message {
          margin-bottom: 16px;
        }
        .message.user {
          display: flex;
          justify-content: flex-end;
        }
        .message.user .bubble {
          background: #1a3a2f;
          color: white;
          border-radius: 18px 18px 4px 18px;
        }
        .message.assistant .bubble {
          background: white;
          color: #333;
          border-radius: 18px 18px 18px 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .bubble {
          padding: 12px 16px;
          max-width: 80%;
          white-space: pre-wrap;
          line-height: 1.5;
        }
        .message-actions {
          margin-top: 8px;
          padding-left: 4px;
        }
        .patterns {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
        }
        .pattern-tag {
          background: #fef3c7;
          color: #92400e;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        .action-buttons {
          display: flex;
          gap: 8px;
        }
        .action-btn {
          background: #f3f4f6;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
        }
        .action-btn.save {
          background: #14b8a6;
          color: white;
        }
        .saved-badge {
          color: #059669;
          font-size: 13px;
          font-weight: 500;
        }

        /* Input Area */
        .input-area {
          padding: 16px 20px;
          background: white;
          border-top: 1px solid #eee;
        }
        .input-container {
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 800px;
          margin: 0 auto;
        }
        .attach-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 8px;
        }
        .input-container textarea {
          flex: 1;
          padding: 12px 16px;
          border-radius: 24px;
          border: 1px solid #ddd;
          font-size: 16px;
          resize: none;
          outline: none;
          font-family: inherit;
        }
        .send-btn {
          background: #1a3a2f;
          color: white;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 18px;
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Regulate Modal */
        .regulate-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .regulate-modal {
          background: white;
          border-radius: 24px;
          padding: 32px;
          max-width: 400px;
          width: 90%;
          position: relative;
        }
        .regulate-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #999;
        }
        .regulate-menu h2 {
          text-align: center;
          margin-bottom: 8px;
        }
        .regulate-menu > p {
          text-align: center;
          color: #666;
          margin-bottom: 24px;
        }
        .regulate-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .regulate-option {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
        }
        .regulate-option span {
          font-size: 32px;
        }
        .regulate-option strong {
          display: block;
          margin-bottom: 2px;
        }
        .regulate-option p {
          margin: 0;
          font-size: 13px;
          color: #666;
        }
        .back-btn {
          display: block;
          margin: 20px auto 0;
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
        }

        /* Breathe Mode */
        .breathe-mode {
          text-align: center;
          padding: 20px;
        }
        .breathe-circle {
          width: 200px;
          height: 200px;
          border-radius: 50%;
          background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: white;
          font-size: 20px;
          font-weight: 600;
          transition: transform 4s ease-in-out;
        }
        .breathe-circle.inhale { transform: scale(1.2); }
        .breathe-circle.hold { transform: scale(1.2); }
        .breathe-circle.exhale { transform: scale(1); }

        /* Ground Mode */
        .ground-mode {
          text-align: center;
        }
        .ground-step {
          padding: 24px;
        }
        .ground-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 16px;
        }
        .ground-step h3 {
          color: #1a3a2f;
          margin-bottom: 8px;
        }
        .ground-step p {
          color: #666;
        }
        .ground-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-top: 1px solid #eee;
        }
        .ground-nav button {
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
        }
        .ground-nav button:first-child {
          background: #f3f4f6;
          border: none;
        }
        .ground-nav button:last-child {
          background: #1a3a2f;
          color: white;
          border: none;
        }
        .ground-nav button:disabled {
          opacity: 0.4;
        }

        /* Affirm Mode */
        .affirm-mode {
          text-align: center;
        }
        .affirmation {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 16px;
          padding: 32px 24px;
          margin-bottom: 20px;
        }
        .affirm-text {
          font-size: 22px;
          color: #1a3a2f;
          font-weight: 600;
          margin-bottom: 8px;
        }
        .affirm-subtext {
          color: #166534;
          font-size: 15px;
        }
        .next-affirm {
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 500;
        }

        @media (max-width: 640px) {
          .actions-grid {
            grid-template-columns: 1fr;
          }
          .tagline {
            flex-direction: column;
            align-items: center;
          }
          .header-right {
            gap: 8px;
          }
          .court-badge, .evidence-badge {
            padding: 4px 8px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}