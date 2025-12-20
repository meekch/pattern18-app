"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import PromptGallery from "@/components/PromptGallery";
import FeedbackModal from "@/components/FeedbackModal";
import SubscriptionGate from "@/components/SubscriptionGate";
import SafetyResources, { detectCrisis } from "@/components/SafetyResources";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  timestamp: Date;
  patterns?: string[];
  savedToEvidence?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface CaseContext {
  caseNumber: string;
  court: string;
  petitioner: string;
  respondent: string;
  userRole: string;
  documentType: string;
}

type Mode = "chat" | "document";

const affirmations = [
  { text: "Their chaos is not your emergency.", subtext: "You are allowed to pause." },
  { text: "You are not crazy. This is real.", subtext: "Trust what you've lived." },
  { text: "Silence is a complete response.", subtext: "You don't owe them an explanation." },
  { text: "You're building something they can't take.", subtext: "Every document is proof. Every boundary is progress." },
  { text: "Your peace is not up for negotiation.", subtext: "Protect it fiercely." },
  { text: "The best response is often no response.", subtext: "Let them tell on themselves." },
  { text: "You survived 100% of your worst days.", subtext: "You'll survive this one too." },
  { text: "Healing yourself is the best thing you can do for your kids.", subtext: "They're watching. They're learning." },
  { text: "You are not alone.", subtext: "Thousands of us are walking this same path." },
  { text: "This chapter is hard, but it's not the whole story.", subtext: "Keep writing." },
  { text: "You don't have to set yourself on fire to keep them warm.", subtext: "Your needs matter too." },
  { text: "Document. Breathe. Protect. Repeat.", subtext: "You're doing it right." },
  { text: "They want you reactive. Stay strategic.", subtext: "Your calm is your superpower." },
  { text: "You're not co-parenting. You're parallel parenting.", subtext: "And that's okay." },
  { text: "The truth doesn't need to be defended.", subtext: "It just needs to be documented." },
  { text: "Don't react. Respond.", subtext: "You have the power to choose." },
  { text: "Be present. Be prepared. Be empowered.", subtext: "You've got this." },
];

const groundingSteps = [
  { sense: "SEE", instruction: "Name 5 things you can see right now.", icon: "ðŸ‘" },
  { sense: "TOUCH", instruction: "Name 4 things you can physically feel.", icon: "âœ‹" },
  { sense: "HEAR", instruction: "Name 3 things you can hear.", icon: "ðŸ‘‚" },
  { sense: "SMELL", instruction: "Name 2 things you can smell.", icon: "ðŸ‘ƒ" },
  { sense: "TASTE", instruction: "Name 1 thing you can taste.", icon: "ðŸ‘…" },
];

const quickPrompts = [
  { icon: "ðŸ“±", label: "Analyze a message", prompt: "I just received this message and need help understanding what's really going on..." },
  { icon: "ðŸ“", label: "Draft a response", prompt: "I need to respond to this message. Help me craft something strategic..." },
  { icon: "âš–ï¸", label: "Court document help", prompt: "I need help with a court document..." },
  { icon: "ðŸŽ¯", label: "Identify patterns", prompt: "Can you help me identify manipulation patterns in this situation..." },
];

export default function CoachPage() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showPromptGallery, setShowPromptGallery] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [ratedMessages, setRatedMessages] = useState<Set<string>>(new Set());
  const [savingEvidence, setSavingEvidence] = useState<string | null>(null);
  const [showSafetyResources, setShowSafetyResources] = useState(false);
  const [safetyTriggered, setSafetyTriggered] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [documentText, setDocumentText] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [caseContext, setCaseContext] = useState<CaseContext | null>(null);
  const [storedPdf, setStoredPdf] = useState<{ base64: string; name: string } | null>(null);
  const [showRegulate, setShowRegulate] = useState(false);
  const [regulateMode, setRegulateMode] = useState<"menu" | "breathe" | "ground" | "affirm">("menu");
  const [breathePhase, setBreathePhase] = useState<"inhale" | "hold" | "exhale" | "rest">("inhale");
  const [breatheCount, setBreatheCount] = useState(0);
  const [currentAffirmation, setCurrentAffirmation] = useState(affirmations[0]);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      const { data: sub } = await supabase
        .from('user_subscriptions')
        .select('status')
        .eq('email', user.email?.toLowerCase())
        .single();

      setSubscriptionStatus(sub?.status || 'none');
      setAuthLoading(false);

      const { count } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      setEvidenceCount(count || 0);
    };
    
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        router.push("/login");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (showRegulate && regulateMode === "breathe") {
      const phases = ["inhale", "hold", "exhale", "rest"] as const;
      let currentPhaseIndex = 0;
      
      const interval = setInterval(() => {
        currentPhaseIndex = (currentPhaseIndex + 1) % 4;
        setBreathePhase(phases[currentPhaseIndex]);
        
        if (currentPhaseIndex === 0) {
          setBreatheCount(prev => {
            if (prev >= 3) {
              return 4;
            }
            return prev + 1;
          });
        }
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [showRegulate, regulateMode]);

  const loadConversations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (data && !error) {
      setConversations(data);
    }
  };

  const loadConversation = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data && !error) {
      const loadedMessages: Message[] = data.map(msg => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));

      setMessages(loadedMessages);
      setCurrentConversationId(conversationId);
      setShowWelcome(false);
    }
    setShowSidebar(false);
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setShowWelcome(true);
    setShowSidebar(false);
  };

  const createConversation = async (firstMessage: string): Promise<string | null> => {
    if (!user) return null;

    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: title,
      })
      .select()
      .single();

    if (data && !error) {
      setConversations(prev => [data, ...prev]);
      return data.id;
    }
    return null;
  };

  const saveMessage = async (conversationId: string, role: string, content: string) => {
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role,
      content,
    });

    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  };

  const getRandomAffirmation = () => {
    return affirmations[Math.floor(Math.random() * affirmations.length)];
  };

  const getPhaseInstruction = () => {
    switch (breathePhase) {
      case "inhale": return "Breathe in";
      case "hold": return "Hold";
      case "exhale": return "Breathe out";
      case "rest": return "Rest";
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
    setShowWelcome(false);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setShowWelcome(false);

    if (detectCrisis(userMessage.content) && !safetyTriggered) {
      setSafetyTriggered(true);
      setShowSafetyResources(true);
    }

    let convId = currentConversationId;
    if (!convId) {
      convId = await createConversation(userMessage.content);
      setCurrentConversationId(convId);
    }

    if (convId) {
      await saveMessage(convId, 'user', userMessage.content);
    }

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content,
          })),
          caseContext,
          pdfContent: storedPdf?.base64,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages(prev => 
                  prev.map(m => 
                    m.id === assistantMessage.id 
                      ? { ...m, content: fullContent }
                      : m
                  )
                );
              }
              if (parsed.patterns) {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMessage.id
                      ? { ...m, patterns: parsed.patterns }
                      : m
                  )
                );
              }
            } catch (e) {}
          }
        }
      }

      if (convId && fullContent) {
        await saveMessage(convId, 'assistant', fullContent);
      }

    } catch (error) {
      console.error("Error:", error);
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessage.id
            ? { ...m, content: "I apologize, but I encountered an error. Please try again." }
            : m
        )
      );
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setStoredPdf({ base64, name: file.name });
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result as string;
        setInput(prev => prev + (prev ? '\n' : '') + '[Image attached]');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      handleFileSelect({ target: { files: dt.files } } as any);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const saveToEvidence = async (msg: Message, userMsg?: Message) => {
    if (!user) return;
    setSavingEvidence(msg.id);

    try {
      await supabase.from('incidents').insert({
        user_id: user.id,
        message_text: userMsg?.content || '',
        ai_analysis: msg.content,
        patterns_detected: msg.patterns || [],
        severity: msg.patterns?.length ? 'medium' : 'low',
        incident_date: new Date().toISOString(),
      });

      setMessages(prev =>
        prev.map(m =>
          m.id === msg.id ? { ...m, savedToEvidence: true } : m
        )
      );
      setEvidenceCount(prev => prev + 1);
    } catch (error) {
      console.error('Error saving evidence:', error);
    }

    setSavingEvidence(null);
  };

  const clearCaseContext = () => {
    setCaseContext(null);
    setStoredPdf(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };

  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(180deg, #f5f7f6 0%, #e8f5e9 100%);
            gap: 16px;
          }
          .loading-spinner {
            width: 48px;
            height: 48px;
            border: 4px solid #e0e0e0;
            border-top-color: #2dd4a8;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          p { color: #666; font-size: 16px; }
        `}</style>
      </div>
    );
  }

  if (subscriptionStatus && subscriptionStatus !== 'active' && subscriptionStatus !== 'trialing') {
    return <SubscriptionGate status={subscriptionStatus} email={user?.email || ''} />;
  }

  return (
    <div className="coach-container">
      {showSidebar && <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} />}
      
      <div className={`sidebar ${showSidebar ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Pattern 18</h3>
          <button onClick={() => setShowSidebar(false)} className="close-sidebar">Ã—</button>
        </div>
        
        <div className="sidebar-menu">
          <button className="menu-item" onClick={() => router.push("/dashboard")}>
            <span>ðŸ“Š</span> Dashboard
          </button>
          <button className="menu-item" onClick={() => router.push("/log")}>
            <span>ðŸ“</span> Log Incident
          </button>
          <button className="menu-item" onClick={() => router.push("/evidence")}>
            <span>ðŸ“</span> Evidence Library
          </button>
          <button className="menu-item" onClick={() => router.push("/documents")}>
            <span>ðŸ“„</span> Documents
          </button>
          <div className="menu-divider" />
          <button className="menu-item breathe-item" onClick={() => { setShowRegulate(true); setShowSidebar(false); }}>
            <span>ðŸ§˜</span> Take a Breath
          </button>
          <button className="menu-item" onClick={() => router.push("/case-setup")}>
            <span>âš™ï¸</span> Case Setup
          </button>
          <div className="menu-divider" />
          <button className="menu-item logout-item" onClick={handleLogout}>
            <span>ðŸ‘‹</span> Sign Out
          </button>
        </div>

        <div className="sidebar-section-title">Recent Chats</div>
        <button className="new-chat-btn" onClick={startNewConversation}>+ New Conversation</button>
        
        <div className="conversation-list">
          {conversations.length === 0 ? (
            <p className="no-convos">No conversations yet</p>
          ) : (
            conversations.slice(0, 10).map(conv => (
              <div
                key={conv.id}
                className={`conversation-item ${currentConversationId === conv.id ? 'active' : ''}`}
                onClick={() => loadConversation(conv.id)}
              >
                <span className="conv-title">{conv.title}</span>
                <span className="conv-date">{new Date(conv.updated_at).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {showPromptGallery && (
        <PromptGallery
          onSelectPrompt={(prompt) => { setInput(prompt); setShowPromptGallery(false); setShowWelcome(false); }}
          onClose={() => setShowPromptGallery(false)}
        />
      )}

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      {showSafetyResources && <SafetyResources onClose={() => setShowSafetyResources(false)} />}

      {showRegulate && (
        <div className="regulate-overlay">
          <div className="regulate-modal">
            {regulateMode === "menu" && (
              <>
                <div className="regulate-header">
                  <span className="regulate-icon">ðŸ’š</span>
                  <h2>Take a moment</h2>
                  <p>You're safe here. Whatever just happened can wait.</p>
                </div>
                <div className="regulate-options">
                  <button onClick={() => { setBreatheCount(0); setBreathePhase("inhale"); setRegulateMode("breathe"); }}>
                    <span className="option-icon">ðŸ«</span>
                    <span className="option-text">
                      <strong>Breathe</strong>
                      <small>Box breathing to calm your nervous system</small>
                    </span>
                  </button>
                  <button onClick={() => setRegulateMode("ground")}>
                    <span className="option-icon">ðŸŒ³</span>
                    <span className="option-text">
                      <strong>Ground</strong>
                      <small>5-4-3-2-1 sensory grounding</small>
                    </span>
                  </button>
                  <button onClick={() => { setCurrentAffirmation(getRandomAffirmation()); setRegulateMode("affirm"); }}>
                    <span className="option-icon">ðŸ’ª</span>
                    <span className="option-text">
                      <strong>Remember</strong>
                      <small>A reminder from someone who's been there</small>
                    </span>
                  </button>
                </div>
                <button className="regulate-close" onClick={() => setShowRegulate(false)}>
                  I'm ready
                </button>
                <p className="regulate-footer">You're not alone. The more you heal, the better parent you become.</p>
              </>
            )}

            {regulateMode === "breathe" && (
              <div className="breathe-container">
                <div className="breathe-orb-container">
                  <div className={`breathe-ring ring-1 ${breathePhase}`} />
                  <div className={`breathe-ring ring-2 ${breathePhase}`} />
                  <div className={`breathe-ring ring-3 ${breathePhase}`} />
                  <div className={`breathe-orb ${breathePhase}`}>
                    <span className="breathe-text">{getPhaseInstruction()}</span>
                  </div>
                </div>

                <div className="breathe-progress">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`progress-dot ${i < breatheCount ? 'complete' : ''} ${i === breatheCount ? 'active' : ''}`}
                    >
                      {i < breatheCount && <span>âœ“</span>}
                    </div>
                  ))}
                </div>

                <p className="breathe-cycle">
                  {breatheCount < 4 ? `Cycle ${breatheCount + 1} of 4` : "Complete ðŸ’š"}
                </p>

                <button className="regulate-skip" onClick={() => setRegulateMode("menu")}>â† Back</button>
              </div>
            )}

            {regulateMode === "ground" && (
              <div className="ground-container">
                <h2>Ground Yourself</h2>
                <p className="ground-intro">Come back to the present moment.</p>
                <div className="ground-steps">
                  {groundingSteps.map((step, i) => (
                    <div key={i} className="ground-step">
                      <span className="ground-icon">{step.icon}</span>
                      <div>
                        <strong>{5 - i} - {step.sense}</strong>
                        <p>{step.instruction}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="regulate-close" onClick={() => setRegulateMode("menu")}>â† Back</button>
              </div>
            )}

            {regulateMode === "affirm" && (
              <div className="affirm-container">
                <div className="affirm-quote">
                  <p className="affirm-text">"{currentAffirmation.text}"</p>
                  <p className="affirm-subtext">{currentAffirmation.subtext}</p>
                </div>
                <p className="affirm-signature">- From someone who's been there</p>
                <div className="affirm-actions">
                  <button onClick={() => setCurrentAffirmation(getRandomAffirmation())}>Another âœ¨</button>
                  <button onClick={() => setRegulateMode("menu")}>â† Back</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-content">
          <div className="logo-section">
            <button onClick={() => setShowSidebar(true)} className="menu-btn">
              â˜°
            </button>
            <div className="logo">
              <div className="logo-icon">18</div>
              <div className="logo-text-group">
                <span className="logo-text">Pattern 18</span>
                <span className="logo-tagline">Your 24/7 Strategic Partner</span>
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button className="evidence-badge" onClick={() => router.push("/evidence")}>
              <span className="badge-count">{evidenceCount}</span>
              <span className="badge-text">Evidence</span>
            </button>
          </div>
        </div>
      </header>

      {(caseContext || storedPdf) && (
        <div className="context-banner">
          <span>
            {caseContext && <>ðŸ“‹ <strong>{caseContext.caseNumber}</strong> - {caseContext.petitioner} v. {caseContext.respondent}</>}
            {storedPdf && !caseContext && <>ðŸ“„ {storedPdf.name}</>}
            {storedPdf && caseContext && <> â€¢ PDF loaded</>}
          </span>
          <button onClick={clearCaseContext}>Ã—</button>
        </div>
      )}

      <div
        ref={chatRef}
        className={`chat-area ${dragOver ? "drag-over" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {dragOver && (
          <div className="drop-overlay">
            <div className="drop-text">Drop to upload</div>
          </div>
        )}
        <div className="chat-inner">
          {showWelcome && messages.length === 0 && (
            <div className="welcome-section">
              <div className="welcome-card">
                <div className="welcome-icon">ðŸ’š</div>
                <h1>Hey, I'm glad you're here.</h1>
                <p className="welcome-subtitle">
                  I'm your 24/7 strategic partner. Whether you just got a message that made your stomach drop, 
                  need help with a court document, or simply need a moment to breathe - I've got you.
                </p>
                <div className="welcome-mantra">
                  <span>Be present.</span>
                  <span>Don't react.</span>
                  <span>Take back control.</span>
                </div>
              </div>

              <div className="quick-actions">
                <p className="quick-actions-label">What can I help with?</p>
                <div className="quick-actions-grid">
                  {quickPrompts.map((item, i) => (
                    <button
                      key={i}
                      className="quick-action-btn"
                      onClick={() => handleQuickPrompt(item.prompt)}
                    >
                      <span className="quick-action-icon">{item.icon}</span>
                      <span className="quick-action-label">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="breathe-cta">
                <button onClick={() => setShowRegulate(true)}>
                  <span>ðŸ§˜</span> Need to breathe first?
                </button>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              {msg.image && (
                <div className="message-image">
                  <img src={msg.image} alt="Uploaded" />
                </div>
              )}
              <div className="message-content" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
              {msg.role === "assistant" && msg.content && !isLoading && (
                <>
                  {msg.patterns && msg.patterns.length > 0 && (
                    <div className="patterns-detected">
                      <span className="patterns-label">ðŸŽ¯ Patterns identified:</span>
                      <div className="pattern-tags">
                        {msg.patterns.map((pattern, i) => (
                          <span key={i} className="pattern-tag">{pattern}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="message-actions">
                    <button onClick={() => copyToClipboard(msg.content)}>ðŸ“‹ Copy</button>
                    {msg.savedToEvidence ? (
                      <span className="saved-badge">âœ“ Saved</span>
                    ) : (
                      <button
                        onClick={() => {
                          const msgIndex = messages.findIndex(m => m.id === msg.id);
                          const userMsg = msgIndex > 0 ? messages[msgIndex - 1] : undefined;
                          saveToEvidence(msg, userMsg);
                        }}
                        disabled={savingEvidence === msg.id}
                        className="save-evidence-btn"
                      >
                        {savingEvidence === msg.id ? 'ðŸ’¾ Saving...' : 'ðŸ’¾ Save to Evidence'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.content === "" && (
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          )}
        </div>
      </div>

      <div className="input-area">
        <div className="input-container">
          <form onSubmit={handleSubmit} className="input-wrapper">
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileSelect} className="file-input" />
            <button type="button" className="attach-btn" onClick={() => fileInputRef.current?.click()} title="Upload screenshot or PDF">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
            <button type="button" className="prompt-gallery-btn" onClick={() => setShowPromptGallery(true)} title="Browse prompts">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18h6"/>
                <path d="M10 22h4"/>
                <path d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2z"/>
              </svg>
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What's happening?"
              rows={1}
              className="input-field"
            />
            <button type="submit" disabled={(!input.trim() && !isLoading) || isLoading} className={`send-btn ${input.trim() ? "active" : ""}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .coach-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          height: 100dvh;
          background: #f5f7f6;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          overflow: hidden;
        }

        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
        }

        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 280px;
          background: white;
          box-shadow: 2px 0 24px rgba(0,0,0,0.15);
          z-index: 1001;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        .sidebar.open { transform: translateX(0); }
        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #eee;
        }
        .sidebar-header h3 { margin: 0; font-size: 18px; color: #1a3a2f; }
        .close-sidebar { background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 4px 8px; }

        .sidebar-menu { padding: 8px 12px; }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 14px 16px;
          background: none;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          color: #333;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .menu-item:hover { background: #f0f0f0; }
        .breathe-item { color: #2dd4a8; }
        .logout-item { color: #999; }
        .menu-divider { height: 1px; background: #eee; margin: 8px 16px; }
        .sidebar-section-title {
          padding: 16px 16px 8px;
          font-size: 12px;
          font-weight: 600;
          color: #999;
          text-transform: uppercase;
        }

        .new-chat-btn {
          margin: 0 16px 16px;
          padding: 14px;
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }
        .conversation-list { flex: 1; overflow-y: auto; padding: 0 8px 8px; }
        .conversation-item {
          padding: 14px 16px;
          border-radius: 10px;
          cursor: pointer;
          margin-bottom: 4px;
        }
        .conversation-item:hover { background: #f5f5f5; }
        .conversation-item.active { background: #e8f5e9; }
        .conv-title { display: block; font-size: 14px; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .conv-date { display: block; font-size: 12px; color: #999; margin-top: 4px; }
        .no-convos { text-align: center; color: #999; padding: 20px; font-size: 14px; }

        .header { background: linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%); padding: 16px 24px; flex-shrink: 0; }
        .header-content { max-width: 900px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
        .logo-section { display: flex; align-items: center; }
        .menu-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 8px;
          margin-right: 8px;
          color: white;
          opacity: 0.8;
        }
        .logo { display: flex; align-items: center; gap: 14px; }
        .logo-icon {
          width: 46px;
          height: 46px;
          background: linear-gradient(135deg, #2dd4a8 0%, #20b090 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 18px;
          color: #0d1f18;
          box-shadow: 0 4px 16px rgba(45, 212, 168, 0.3);
        }
        .logo-text-group { display: flex; flex-direction: column; }
        .logo-text { font-size: 22px; font-weight: 700; color: white; }
        .logo-tagline { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 2px; }
        .header-actions { display: flex; gap: 10px; }
        .evidence-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #d4a82d 0%, #b8922a 100%);
          border: none;
          border-radius: 20px;
          color: #1a3a2f;
          font-weight: 600;
          cursor: pointer;
        }
        .badge-count { font-size: 18px; font-weight: 700; }
        .badge-text { font-size: 13px; }

        .context-banner {
          background: #e8f5e9;
          padding: 12px 24px;
          font-size: 14px;
          color: #2e7d32;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .context-banner button { background: none; border: none; color: #999; cursor: pointer; font-size: 18px; }

        .chat-area { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; position: relative; }
        .chat-area.drag-over { background: rgba(45, 212, 168, 0.08); }
        .drop-overlay {
          position: absolute;
          inset: 24px;
          background: rgba(45, 212, 168, 0.12);
          border: 3px dashed #2dd4a8;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }
        .drop-text { font-size: 20px; font-weight: 600; color: #1a3a2f; }
        .chat-inner { max-width: 760px; margin: 0 auto; padding: 32px 24px; }

        .welcome-section { animation: fadeIn 0.6s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        .welcome-card {
          background: white;
          border-radius: 24px;
          padding: 40px;
          text-align: center;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          margin-bottom: 24px;
        }
        .welcome-icon { font-size: 56px; margin-bottom: 20px; }
        .welcome-card h1 {
          font-size: 28px;
          color: #1a3a2f;
          margin: 0 0 16px;
          font-weight: 700;
        }
        .welcome-subtitle {
          font-size: 16px;
          color: #666;
          line-height: 1.7;
          margin: 0 0 24px;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
        }
        .welcome-mantra {
          display: flex;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
        }
        .welcome-mantra span {
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
          padding: 10px 20px;
          border-radius: 30px;
          font-size: 14px;
          font-weight: 600;
        }

        .quick-actions {
          background: white;
          border-radius: 20px;
          padding: 28px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
          margin-bottom: 20px;
        }
        .quick-actions-label {
          font-size: 14px;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 16px;
          text-align: center;
        }
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .quick-action-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: #f8f9fa;
          border: 2px solid transparent;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .quick-action-btn:hover {
          background: #f0f9f6;
          border-color: #2dd4a8;
          transform: translateY(-2px);
        }
        .quick-action-icon { font-size: 24px; }
        .quick-action-label { font-size: 14px; font-weight: 600; color: #1a3a2f; }

        .breathe-cta {
          text-align: center;
        }
        .breathe-cta button {
          background: none;
          border: 2px solid #2dd4a8;
          color: #2dd4a8;
          padding: 12px 24px;
          border-radius: 30px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .breathe-cta button:hover {
          background: #2dd4a8;
          color: #1a3a2f;
        }

        .message { margin-bottom: 28px; animation: fadeIn 0.4s ease-out; }
        .message.user { margin-left: 12%; }
        .message.user .message-content {
          background: linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%);
          color: white;
          padding: 18px 24px;
          border-radius: 24px;
          border-bottom-right-radius: 8px;
          white-space: pre-wrap;
          font-size: 15px;
          line-height: 1.6;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        }
        .message.assistant .message-content {
          background: white;
          padding: 24px 28px;
          border-radius: 24px;
          border-bottom-left-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.06);
          line-height: 1.7;
          font-size: 15px;
        }
        .message-image { margin-bottom: 12px; border-radius: 16px; overflow: hidden; max-width: 280px; margin-left: auto; }
        .message-image img { width: 100%; display: block; }

        .patterns-detected {
          background: linear-gradient(135deg, rgba(45, 212, 168, 0.1) 0%, rgba(26, 58, 47, 0.1) 100%);
          border: 1px solid rgba(45, 212, 168, 0.3);
          border-radius: 12px;
          padding: 12px 16px;
          margin-top: 12px;
        }
        .patterns-label { font-size: 13px; font-weight: 600; color: #1a3a2f; display: block; margin-bottom: 8px; }
        .pattern-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .pattern-tag { background: #1a3a2f; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
        
        .message-actions { display: flex; gap: 12px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0; }
        .message-actions button {
          background: #f5f5f5;
          border: none;
          font-size: 14px;
          color: #666;
          cursor: pointer;
          padding: 8px 14px;
          border-radius: 10px;
        }
        .message-actions button:hover { background: #e8e8e8; color: #1a3a2f; }
        .save-evidence-btn {
          background: linear-gradient(135deg, #2dd4a8 0%, #1a9a7a 100%) !important;
          color: white !important;
        }
        .saved-badge { color: #2dd4a8; font-weight: 600; font-size: 13px; }

        .typing-indicator { display: flex; gap: 8px; padding: 28px; }
        .typing-dot { width: 12px; height: 12px; background: #2dd4a8; border-radius: 50%; animation: bounce 1.2s infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-10px); } }

        .input-area {
          background: white;
          border-top: 1px solid #e8e8e8;
          padding: 20px 24px;
          padding-bottom: max(20px, env(safe-area-inset-bottom));
          flex-shrink: 0;
        }
        .input-container { max-width: 760px; margin: 0 auto; }
        .input-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          background: #f5f5f5;
          border-radius: 28px;
          padding: 10px 10px 10px 18px;
          border: 2px solid transparent;
          transition: all 0.2s;
        }
        .input-wrapper:focus-within { border-color: #2dd4a8; background: white; box-shadow: 0 0 0 4px rgba(45, 212, 168, 0.1); }
        .file-input { display: none; }
        .attach-btn, .prompt-gallery-btn {
          background: none;
          border: none;
          padding: 10px;
          color: #888;
          cursor: pointer;
          flex-shrink: 0;
          border-radius: 50%;
        }
        .attach-btn:hover, .prompt-gallery-btn:hover { color: #1a3a2f; background: rgba(0,0,0,0.05); }
        .prompt-gallery-btn { color: #2dd4a8; }
        .input-field {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 16px;
          line-height: 1.5;
          resize: none;
          outline: none;
          padding: 12px 0;
          font-family: inherit;
          min-height: 24px;
          max-height: 150px;
        }
        .send-btn {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: none;
          background: #e0e0e0;
          color: #999;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s;
        }
        .send-btn.active { background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%); color: white; box-shadow: 0 4px 16px rgba(26, 58, 47, 0.3); }

        .regulate-overlay {
          position: fixed;
          inset: 0;
          background: linear-gradient(180deg, #0d1f18 0%, #152e24 50%, #0d1f18 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
        }
        .regulate-modal { max-width: 420px; width: 100%; padding: 40px; text-align: center; color: white; }
        .regulate-header { margin-bottom: 32px; }
        .regulate-icon { font-size: 56px; display: block; margin-bottom: 20px; }
        .regulate-header h2 { font-size: 28px; margin-bottom: 12px; font-weight: 700; }
        .regulate-header p { color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.5; }
        .regulate-options { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }
        .regulate-options button {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 20px 24px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          color: white;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s;
        }
        .regulate-options button:hover { background: rgba(255,255,255,0.12); transform: translateY(-2px); }
        .option-icon { font-size: 36px; }
        .option-text { display: flex; flex-direction: column; gap: 4px; }
        .option-text strong { font-size: 18px; font-weight: 600; }
        .option-text small { font-size: 14px; color: rgba(255,255,255,0.6); }
        .regulate-close {
          padding: 18px 32px;
          background: #2dd4a8;
          color: #0d1f18;
          border: none;
          border-radius: 14px;
          font-size: 17px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
        }
        .regulate-skip { background: none; border: none; color: rgba(255,255,255,0.5); font-size: 15px; cursor: pointer; margin-top: 24px; }
        .regulate-footer { margin-top: 28px; font-size: 14px; color: rgba(255,255,255,0.4); font-style: italic; }

        .breathe-container { padding: 20px 0; min-height: 420px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .breathe-orb-container { position: relative; width: 220px; height: 220px; display: flex; align-items: center; justify-content: center; }
        .breathe-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(45, 212, 168, 0.2);
          transition: all 4s cubic-bezier(0.4, 0, 0.2, 1);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        .ring-1 { width: 220px; height: 220px; }
        .ring-2 { width: 180px; height: 180px; }
        .ring-3 { width: 140px; height: 140px; }
        .ring-1.inhale, .ring-1.hold { width: 320px; height: 320px; border-color: rgba(45, 212, 168, 0.15); }
        .ring-2.inhale, .ring-2.hold { width: 270px; height: 270px; border-color: rgba(45, 212, 168, 0.25); }
        .ring-3.inhale, .ring-3.hold { width: 220px; height: 220px; border-color: rgba(45, 212, 168, 0.35); }
        .breathe-orb {
          position: relative;
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, rgba(45, 212, 168, 0.4) 0%, rgba(32, 176, 144, 0.2) 50%, rgba(13, 31, 24, 0.3) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 2;
          box-shadow: 0 0 60px rgba(45, 212, 168, 0.2);
        }
        .breathe-orb.inhale, .breathe-orb.hold {
          width: 160px;
          height: 160px;
          background: radial-gradient(circle at 30% 30%, rgba(45, 212, 168, 0.6) 0%, rgba(32, 176, 144, 0.4) 50%, rgba(13, 31, 24, 0.2) 100%);
          box-shadow: 0 0 80px rgba(45, 212, 168, 0.4);
        }
        .breathe-text { font-size: 18px; font-weight: 600; color: white; text-shadow: 0 2px 10px rgba(0,0,0,0.3); }
        .breathe-progress { display: flex; gap: 14px; margin-top: 40px; margin-bottom: 12px; }
        .progress-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
        }
        .progress-dot.active { background: rgba(45, 212, 168, 0.2); border-color: #2dd4a8; transform: scale(1.3); }
        .progress-dot.complete { background: #2dd4a8; border-color: #2dd4a8; color: #0d1f18; }
        .breathe-cycle { color: rgba(255,255,255,0.6); font-size: 15px; margin-top: 8px; }

        .ground-container { text-align: left; padding: 10px 0; }
        .ground-container h2 { text-align: center; margin-bottom: 8px; font-size: 26px; }
        .ground-intro { text-align: center; color: rgba(255,255,255,0.6); margin-bottom: 28px; font-size: 15px; }
        .ground-steps { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
        .ground-step { display: flex; align-items: center; gap: 16px; padding: 14px 18px; background: rgba(255,255,255,0.05); border-radius: 14px; }
        .ground-icon { font-size: 28px; }
        .ground-step strong { font-size: 14px; color: #2dd4a8; }
        .ground-step p { font-size: 14px; color: rgba(255,255,255,0.7); margin-top: 2px; }

        .affirm-container { padding: 20px 0; }
        .affirm-quote { background: rgba(255,255,255,0.05); border-radius: 20px; padding: 40px 28px; margin-bottom: 24px; }
        .affirm-text { font-size: 26px; font-weight: 600; line-height: 1.4; margin-bottom: 16px; color: #2dd4a8; }
        .affirm-subtext { font-size: 17px; color: rgba(255,255,255,0.7); }
        .affirm-signature { font-size: 14px; color: rgba(255,255,255,0.4); font-style: italic; margin-bottom: 28px; }
        .affirm-actions { display: flex; gap: 14px; }
        .affirm-actions button { flex: 1; padding: 16px; border-radius: 12px; font-size: 16px; cursor: pointer; border: none; font-weight: 600; }
        .affirm-actions button:first-child { background: #2dd4a8; color: #0d1f18; }
        .affirm-actions button:last-child { background: rgba(255,255,255,0.1); color: white; }

        @media (max-width: 640px) {
          .header { padding: 14px 16px; }
          .logo-tagline { display: none; }
          .logo-text { font-size: 19px; }
          .chat-inner { padding: 24px 16px; }
          .message.user { margin-left: 8%; }
          .welcome-card { padding: 28px 20px; }
          .welcome-card h1 { font-size: 24px; }
          .welcome-mantra { gap: 12px; }
          .welcome-mantra span { padding: 8px 16px; font-size: 12px; }
          .quick-actions-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
