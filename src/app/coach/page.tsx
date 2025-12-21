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

const bodyScanSteps = [
  { area: 'Feet', instruction: 'Feel your feet on the ground. Notice the weight, the temperature, the connection to the earth.', icon: '🦶' },
  { area: 'Legs', instruction: 'Scan up through your legs. Release any tension in your calves, knees, thighs. Let them soften.', icon: '🦵' },
  { area: 'Belly', instruction: 'Place a hand on your belly. Feel it rise and fall. This is your center. You are safe here.', icon: '🫁' },
  { area: 'Chest', instruction: 'Notice your heart. It has carried you through so much. Thank it for keeping you going.', icon: '💚' },
  { area: 'Shoulders', instruction: 'Drop your shoulders away from your ears. Roll them back. Release what you have been carrying.', icon: '💆' },
  { area: 'Jaw', instruction: 'Unclench your jaw. Let your tongue rest. Soften the space between your eyebrows.', icon: '😌' },
  { area: 'Whole Body', instruction: 'Take one deep breath. You are here. You are whole. You are safe in this moment.', icon: '✨' },
];

const breathingTypes = {
  box: { name: 'Box Breathing', desc: 'Used by Navy SEALs to stay calm', phases: ['inhale', 'hold', 'exhale', 'hold2'], times: [4, 4, 4, 4] },
  '478': { name: '4-7-8 Breath', desc: 'Deep calm and better sleep', phases: ['inhale', 'hold', 'exhale'], times: [4, 7, 8] },
  sigh: { name: 'Physiological Sigh', desc: 'Fastest way to calm down', phases: ['inhale', 'inhale', 'exhale'], times: [2, 1, 6] },
};

const kidConnectionIdeas = [
  { idea: "Write them a letter they'll read someday", desc: "Tell them about this time. How hard you fought. How much you love them." },
  { idea: "Plan a special adventure", desc: "Even small ones count. A new park, a picnic, stargazing in the backyard." },
  { idea: "Learn something new together", desc: "A card trick, a recipe, a few words in another language. They'll remember." },
  { idea: "Create a secret handshake", desc: "Something just between you. A tiny bond no one can take." },
  { idea: "Start a tradition", desc: "Sunday pancakes, Friday movie night, a special goodbye phrase." },
  { idea: "Make them a playlist", desc: "Songs that remind you of them. Songs that will make them smile." },
  { idea: "Collect rocks or leaves together", desc: "Start a little nature collection. Name them silly things." },
  { idea: "Write jokes to tell them", desc: "Kids love jokes. Save up some good ones for next time." },
  { idea: "Plan a kindness mission", desc: "Make cards for neighbors, feed birds, leave painted rocks around town." },
  { idea: "Create a memory jar", desc: "Write down happy moments together on slips of paper." },
];

const gratitudePrompts = [
  { prompt: "What's one small thing that went right today?", followup: "Even tiny wins count." },
  { prompt: "Who showed you kindness recently?", followup: "It's okay if it was yourself." },
  { prompt: "What's something your body did for you today?", followup: "It carried you through." },
  { prompt: "What's a challenge you've survived?", followup: "You're still here. That's strength." },
  { prompt: "What do your kids teach you?", followup: "They see things we forget to notice." },
  { prompt: "What's one thing you're looking forward to?", followup: "Even small things count." },
  { prompt: "What made you smile this week?", followup: "Joy still finds you." },
  { prompt: "What's something you did well recently?", followup: "You're doing better than you think." },
  { prompt: "Who would you thank if you could?", followup: "Gratitude heals the giver." },
  { prompt: "What's beautiful around you right now?", followup: "Beauty exists even in hard seasons." },
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
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  
  // Case & evidence state
  const [caseContext, setCaseContext] = useState<CaseContext | null>(null);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [daysUntilCourt, setDaysUntilCourt] = useState<number | null>(null);
  
  // Regulate state
  const [showRegulate, setShowRegulate] = useState(false);
  const [regulateMode, setRegulateMode] = useState<'menu' | 'breathe' | 'ground' | 'affirm' | 'body' | 'release' | 'shake' | 'kids' | 'gratitude'>('menu');
  const [breatheType, setBreatheType] = useState<'box' | '478' | 'sigh'>('box');
  const [breathePhase, setBreathePhase] = useState<'inhale' | 'hold' | 'exhale' | 'hold2'>('inhale');
  const [breatheCount, setBreatheCount] = useState(0);
  const [groundStep, setGroundStep] = useState(0);
  const [bodyStep, setBodyStep] = useState(0);
  const [releaseText, setReleaseText] = useState('');
  const [shakeSeconds, setShakeSeconds] = useState(30);
  const [currentAffirmation, setCurrentAffirmation] = useState(affirmations[0]);
  const [currentKidIdea, setCurrentKidIdea] = useState(kidConnectionIdeas[0]);
  const [currentGratitude, setCurrentGratitude] = useState(gratitudePrompts[0]);
  
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
      
      // Check if first time user (show onboarding)
      const hasSeenOnboarding = localStorage.getItem('p18_onboarding_complete');
      if (!hasSeenOnboarding) {
        setShowOnboarding(true);
      }
      
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

  // Breathing animation - handles different breathing types
  useEffect(() => {
    if (showRegulate && regulateMode === 'breathe') {
      const config = breathingTypes[breatheType];
      const phases = config.phases as ('inhale' | 'hold' | 'exhale' | 'hold2')[];
      const times = config.times;
      let index = 0;
      
      const cycle = () => {
        setBreathePhase(phases[index]);
        setBreatheCount(times[index]);
        const duration = times[index] * 1000;
        index = (index + 1) % phases.length;
        return duration;
      };
      
      let timeout: NodeJS.Timeout;
      const runCycle = () => {
        const duration = cycle();
        timeout = setTimeout(runCycle, duration);
      };
      
      runCycle();
      return () => clearTimeout(timeout);
    }
  }, [showRegulate, regulateMode, breatheType]);

  // Shake timer
  useEffect(() => {
    if (showRegulate && regulateMode === 'shake' && shakeSeconds > 0) {
      const timer = setTimeout(() => setShakeSeconds(s => s - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [showRegulate, regulateMode, shakeSeconds]);

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

  const nextKidIdea = () => {
    const currentIndex = kidConnectionIdeas.indexOf(currentKidIdea);
    setCurrentKidIdea(kidConnectionIdeas[(currentIndex + 1) % kidConnectionIdeas.length]);
  };

  const nextGratitude = () => {
    const currentIndex = gratitudePrompts.indexOf(currentGratitude);
    setCurrentGratitude(gratitudePrompts[(currentIndex + 1) % gratitudePrompts.length]);
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
              🌿 Take care of you first
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
        {messages.length > 0 && messages.some(m => m.patterns && m.patterns.length > 0) && (
          <button 
            className="no-respond-btn"
            onClick={() => {
              const lastPattern = messages.filter(m => m.patterns && m.patterns.length > 0).pop();
              const patternName = lastPattern?.patterns?.[0] || 'manipulation';
              sendMessage(`I'm choosing not to respond to that ${patternName.toLowerCase()}. Silence is my power.`);
            }}
          >
            🚫 I'm not responding to this
          </button>
        )}
      </div>

      {/* Regulate Modal - Enhanced Somatic Healing */}
      {showRegulate && (
        <div className="regulate-overlay" onClick={() => setShowRegulate(false)}>
          <div className="regulate-modal" onClick={(e) => e.stopPropagation()}>
            <button className="regulate-close" onClick={() => setShowRegulate(false)}>×</button>
            
            {regulateMode === 'menu' && (
              <div className="regulate-menu">
                <h2>🌿 Restore</h2>
                <p>You can't pour from an empty cup</p>
                <div className="regulate-options">
                  <button onClick={() => setRegulateMode('breathe')} className="regulate-option">
                    <span>🫁</span>
                    <div>
                      <strong>Breathe</strong>
                      <p>Calm your nervous system</p>
                    </div>
                  </button>
                  <button onClick={() => { setBodyStep(0); setRegulateMode('body'); }} className="regulate-option">
                    <span>💆</span>
                    <div>
                      <strong>Body Scan</strong>
                      <p>Release stored tension</p>
                    </div>
                  </button>
                  <button onClick={() => setRegulateMode('ground')} className="regulate-option">
                    <span>🌳</span>
                    <div>
                      <strong>Ground</strong>
                      <p>Come back to now</p>
                    </div>
                  </button>
                  <button onClick={() => { setShakeSeconds(30); setRegulateMode('shake'); }} className="regulate-option">
                    <span>🦋</span>
                    <div>
                      <strong>Shake It Out</strong>
                      <p>Release the energy</p>
                    </div>
                  </button>
                  <button onClick={() => { setReleaseText(''); setRegulateMode('release'); }} className="regulate-option">
                    <span>🔥</span>
                    <div>
                      <strong>Write & Release</strong>
                      <p>Let it go</p>
                    </div>
                  </button>
                  <button onClick={() => setRegulateMode('affirm')} className="regulate-option">
                    <span>💚</span>
                    <div>
                      <strong>Affirm</strong>
                      <p>Words of truth</p>
                    </div>
                  </button>
                  <button onClick={() => setRegulateMode('kids')} className="regulate-option kids-option">
                    <span>💛</span>
                    <div>
                      <strong>For Your Kids</strong>
                      <p>Ideas to make them smile</p>
                    </div>
                  </button>
                  <button onClick={() => setRegulateMode('gratitude')} className="regulate-option">
                    <span>✨</span>
                    <div>
                      <strong>Gratitude</strong>
                      <p>Find the light</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {regulateMode === 'breathe' && (
              <div className="breathe-mode">
                <div className="breathe-selector">
                  <button 
                    className={`breathe-type ${breatheType === 'box' ? 'active' : ''}`}
                    onClick={() => setBreatheType('box')}
                  >
                    Box
                  </button>
                  <button 
                    className={`breathe-type ${breatheType === '478' ? 'active' : ''}`}
                    onClick={() => setBreatheType('478')}
                  >
                    4-7-8
                  </button>
                  <button 
                    className={`breathe-type ${breatheType === 'sigh' ? 'active' : ''}`}
                    onClick={() => setBreatheType('sigh')}
                  >
                    Sigh
                  </button>
                </div>
                <p className="breathe-desc">{breathingTypes[breatheType].desc}</p>
                <div className={`breathe-circle ${breathePhase}`}>
                  <span className="breathe-instruction">
                    {breathePhase === 'inhale' ? 'Breathe in' : 
                     breathePhase === 'hold' || breathePhase === 'hold2' ? 'Hold' : 
                     'Breathe out'}
                  </span>
                  <span className="breathe-counter">{breatheCount}</span>
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

            {regulateMode === 'body' && (
              <div className="body-mode">
                <div className="body-step">
                  <span className="body-icon">{bodyScanSteps[bodyStep].icon}</span>
                  <h3>{bodyScanSteps[bodyStep].area}</h3>
                  <p>{bodyScanSteps[bodyStep].instruction}</p>
                </div>
                <div className="body-progress">
                  {bodyScanSteps.map((_, i) => (
                    <span key={i} className={`body-dot ${i <= bodyStep ? 'active' : ''}`} />
                  ))}
                </div>
                <div className="ground-nav">
                  <button onClick={() => setBodyStep(Math.max(0, bodyStep - 1))} disabled={bodyStep === 0}>Previous</button>
                  <button onClick={() => bodyStep < bodyScanSteps.length - 1 ? setBodyStep(bodyStep + 1) : setRegulateMode('menu')}>
                    {bodyStep < bodyScanSteps.length - 1 ? 'Next' : 'Complete'}
                  </button>
                </div>
                <button onClick={() => setRegulateMode('menu')} className="back-btn">← Back</button>
              </div>
            )}

            {regulateMode === 'shake' && (
              <div className="shake-mode">
                <h3>Shake It Out</h3>
                <p className="shake-instruction">
                  Stand up if you can. Shake your hands, arms, legs - let your whole body move. 
                  This releases the stress energy stored in your muscles.
                </p>
                <div className="shake-timer">
                  <span className="shake-emoji">🦋</span>
                  <span className="shake-seconds">{shakeSeconds}</span>
                  <span className="shake-label">seconds</span>
                </div>
                {shakeSeconds === 0 && (
                  <div className="shake-complete">
                    <p>Notice how your body feels now. Lighter? Calmer?</p>
                    <button onClick={() => setShakeSeconds(30)} className="shake-again">Go again</button>
                  </div>
                )}
                <button onClick={() => setRegulateMode('menu')} className="back-btn">← Back</button>
              </div>
            )}

            {regulateMode === 'release' && (
              <div className="release-mode">
                <h3>Write & Release</h3>
                <p className="release-instruction">
                  Type everything you wish you could say. Get it all out. 
                  No one will ever see this.
                </p>
                <textarea 
                  className="release-textarea"
                  value={releaseText}
                  onChange={(e) => setReleaseText(e.target.value)}
                  placeholder="Let it all out..."
                  rows={6}
                />
                {releaseText.length > 0 && (
                  <button 
                    className="release-burn"
                    onClick={() => {
                      setReleaseText('');
                    }}
                  >
                    🔥 Release & Let Go
                  </button>
                )}
                {releaseText === '' && releaseText !== undefined && (
                  <p className="release-done">Released. Those words no longer have power over you.</p>
                )}
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

            {regulateMode === 'kids' && (
              <div className="kids-mode">
                <div className="kids-card">
                  <span className="kids-icon">💛</span>
                  <h3>{currentKidIdea.idea}</h3>
                  <p>{currentKidIdea.desc}</p>
                </div>
                <button onClick={nextKidIdea} className="next-affirm">Another idea →</button>
                <p className="kids-reminder">They feel your love even when you're apart.</p>
                <button onClick={() => setRegulateMode('menu')} className="back-btn">← Back</button>
              </div>
            )}

            {regulateMode === 'gratitude' && (
              <div className="gratitude-mode">
                <div className="gratitude-card">
                  <span className="gratitude-icon">✨</span>
                  <h3>{currentGratitude.prompt}</h3>
                  <p>{currentGratitude.followup}</p>
                </div>
                <button onClick={nextGratitude} className="next-affirm">Another prompt →</button>
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

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="onboarding-overlay">
          <div className="onboarding-modal">
            {onboardingStep === 0 && (
              <div className="onboarding-step">
                <div className="onboarding-icon">💚</div>
                <h2>Welcome to Pattern 18</h2>
                <p>Your 24/7 strategic partner for navigating high-conflict situations.</p>
                <p className="onboarding-sub">Let me show you around in 60 seconds.</p>
              </div>
            )}
            {onboardingStep === 1 && (
              <div className="onboarding-step">
                <div className="onboarding-icon">📱</div>
                <h2>The Crisis Moment</h2>
                <p>Got a text that made your stomach drop?</p>
                <p className="onboarding-sub">Click 📎 to upload a screenshot or just paste the message. I'll show you exactly what's happening.</p>
              </div>
            )}
            {onboardingStep === 2 && (
              <div className="onboarding-step">
                <div className="onboarding-icon">🎯</div>
                <h2>I See Through It</h2>
                <p>I identify manipulation tactics instantly — what took courts years to see.</p>
                <p className="onboarding-sub">Gaslighting, DARVO, baiting, blame-shifting... I'll name it and help you respond strategically.</p>
              </div>
            )}
            {onboardingStep === 3 && (
              <div className="onboarding-step">
                <div className="onboarding-icon">📁</div>
                <h2>Build Your Case</h2>
                <p>Every conversation can become evidence.</p>
                <p className="onboarding-sub">When I identify patterns, you can save the analysis with one tap. Building your case happens automatically.</p>
              </div>
            )}
            {onboardingStep === 4 && (
              <div className="onboarding-step">
                <div className="onboarding-icon">🫁</div>
                <h2>You're Not Alone</h2>
                <p>Need to breathe first? I've got that too.</p>
                <p className="onboarding-sub">Grounding exercises, affirmations, and safety resources are always here when you need them.</p>
              </div>
            )}
            <div className="onboarding-nav">
              <div className="onboarding-dots">
                {[0,1,2,3,4].map(i => (
                  <span key={i} className={`dot ${onboardingStep === i ? 'active' : ''}`} />
                ))}
              </div>
              {onboardingStep < 4 ? (
                <button onClick={() => setOnboardingStep(onboardingStep + 1)} className="onboarding-btn">
                  Next →
                </button>
              ) : (
                <button onClick={() => { 
                  localStorage.setItem('p18_onboarding_complete', 'true');
                  setShowOnboarding(false); 
                }} className="onboarding-btn primary">
                  Let's Go 💚
                </button>
              )}
            </div>
            <button 
              onClick={() => { 
                localStorage.setItem('p18_onboarding_complete', 'true');
                setShowOnboarding(false); 
              }} 
              className="onboarding-skip"
            >
              Skip intro
            </button>
          </div>
        </div>
      )}

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
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          border: none;
          padding: 12px 24px;
          border-radius: 24px;
          font-size: 15px;
          cursor: pointer;
          color: #065f46;
          font-weight: 500;
          transition: transform 0.2s;
        }
        .breathe-btn:hover {
          transform: scale(1.02);
          background: linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%);
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
        .no-respond-btn {
          display: block;
          margin: 12px auto 0;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 14px;
          color: #92400e;
          cursor: pointer;
          font-weight: 500;
        }
        .no-respond-btn:hover {
          background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
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
          max-width: 440px;
          width: 90%;
          position: relative;
          max-height: 90vh;
          overflow-y: auto;
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
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        .regulate-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }
        .regulate-option:hover {
          background: #f0fdf4;
          border-color: #14b8a6;
        }
        .regulate-option span {
          font-size: 28px;
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
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: white;
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

        /* Enhanced Breathe Mode */
        .breathe-selector {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .breathe-type {
          padding: 8px 16px;
          border: 1px solid #ddd;
          border-radius: 20px;
          background: white;
          cursor: pointer;
          font-size: 13px;
        }
        .breathe-type.active {
          background: #1a3a2f;
          color: white;
          border-color: #1a3a2f;
        }
        .breathe-desc {
          color: #666;
          font-size: 13px;
          margin-bottom: 20px;
        }
        .breathe-circle {
          flex-direction: column;
        }
        .breathe-instruction {
          font-size: 18px;
        }
        .breathe-counter {
          font-size: 48px;
          font-weight: 300;
          margin-top: 8px;
        }
        .breathe-circle.hold2 { transform: scale(1); }

        /* Body Scan Mode */
        .body-mode {
          text-align: center;
        }
        .body-step {
          padding: 24px;
          min-height: 200px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .body-icon {
          font-size: 56px;
          display: block;
          margin-bottom: 16px;
        }
        .body-step h3 {
          color: #1a3a2f;
          font-size: 24px;
          margin-bottom: 12px;
        }
        .body-step p {
          color: #555;
          line-height: 1.6;
          font-size: 15px;
        }
        .body-progress {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin: 16px 0;
        }
        .body-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ddd;
          transition: background 0.3s;
        }
        .body-dot.active {
          background: #14b8a6;
        }

        /* Shake Mode */
        .shake-mode {
          text-align: center;
          padding: 20px;
        }
        .shake-mode h3 {
          color: #1a3a2f;
          margin-bottom: 12px;
        }
        .shake-instruction {
          color: #666;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .shake-timer {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin: 24px 0;
        }
        .shake-emoji {
          font-size: 64px;
          animation: shake 0.5s infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-5px) rotate(-5deg); }
          75% { transform: translateX(5px) rotate(5deg); }
        }
        .shake-seconds {
          font-size: 56px;
          font-weight: 700;
          color: #1a3a2f;
        }
        .shake-label {
          color: #666;
          font-size: 14px;
        }
        .shake-complete {
          margin-top: 16px;
        }
        .shake-complete p {
          color: #666;
          margin-bottom: 12px;
        }
        .shake-again {
          background: #14b8a6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
        }

        /* Release Mode */
        .release-mode {
          text-align: center;
          padding: 20px;
        }
        .release-mode h3 {
          color: #1a3a2f;
          margin-bottom: 8px;
        }
        .release-instruction {
          color: #666;
          font-size: 14px;
          margin-bottom: 16px;
        }
        .release-textarea {
          width: 100%;
          padding: 16px;
          border: 1px solid #ddd;
          border-radius: 12px;
          font-size: 15px;
          font-family: inherit;
          resize: none;
          margin-bottom: 16px;
        }
        .release-textarea:focus {
          outline: none;
          border-color: #14b8a6;
        }
        .release-burn {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .release-burn:hover {
          transform: scale(1.05);
        }
        .release-done {
          color: #14b8a6;
          font-style: italic;
          margin-top: 16px;
        }

        /* Kids Mode */
        .kids-mode {
          text-align: center;
          padding: 20px;
        }
        .kids-card {
          background: linear-gradient(135deg, #fef9c3 0%, #fef08a 100%);
          border-radius: 16px;
          padding: 28px 24px;
          margin-bottom: 20px;
        }
        .kids-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }
        .kids-card h3 {
          font-size: 20px;
          color: #854d0e;
          margin-bottom: 10px;
        }
        .kids-card p {
          color: #a16207;
          font-size: 15px;
          line-height: 1.5;
        }
        .kids-reminder {
          color: #666;
          font-size: 13px;
          font-style: italic;
          margin: 16px 0;
        }
        .kids-option {
          background: #fefce8 !important;
          border-color: #fef08a !important;
        }

        /* Gratitude Mode */
        .gratitude-mode {
          text-align: center;
          padding: 20px;
        }
        .gratitude-card {
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
          border-radius: 16px;
          padding: 28px 24px;
          margin-bottom: 20px;
        }
        .gratitude-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 12px;
        }
        .gratitude-card h3 {
          font-size: 20px;
          color: #6b21a8;
          margin-bottom: 10px;
        }
        .gratitude-card p {
          color: #7c3aed;
          font-size: 15px;
        }

        /* Onboarding */
        .onboarding-overlay {
          position: fixed;
          inset: 0;
          background: rgba(26, 58, 47, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
        }
        .onboarding-modal {
          background: white;
          border-radius: 24px;
          padding: 40px 32px 32px;
          max-width: 420px;
          width: 100%;
          text-align: center;
        }
        .onboarding-step {
          min-height: 200px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .onboarding-icon {
          font-size: 56px;
          margin-bottom: 20px;
        }
        .onboarding-step h2 {
          font-size: 24px;
          color: #1a3a2f;
          margin: 0 0 12px;
        }
        .onboarding-step p {
          color: #333;
          font-size: 16px;
          line-height: 1.5;
          margin: 0 0 8px;
        }
        .onboarding-sub {
          color: #666 !important;
          font-size: 14px !important;
        }
        .onboarding-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        .onboarding-dots {
          display: flex;
          gap: 8px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ddd;
        }
        .dot.active {
          background: #14b8a6;
        }
        .onboarding-btn {
          background: #f3f4f6;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          color: #1a3a2f;
        }
        .onboarding-btn.primary {
          background: #1a3a2f;
          color: white;
        }
        .onboarding-skip {
          background: none;
          border: none;
          color: #999;
          font-size: 13px;
          margin-top: 16px;
          cursor: pointer;
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