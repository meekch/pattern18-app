"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import PromptGallery from "@/components/PromptGallery";
import FeedbackModal from "@/components/FeedbackModal";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  timestamp: Date;
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
  { sense: "SEE", instruction: "Name 5 things you can see right now.", icon: "👁️" },
  { sense: "TOUCH", instruction: "Name 4 things you can physically feel.", icon: "✋" },
  { sense: "HEAR", instruction: "Name 3 things you can hear.", icon: "👂" },
  { sense: "SMELL", instruction: "Name 2 things you can smell.", icon: "👃" },
  { sense: "TASTE", instruction: "Name 1 thing you can taste.", icon: "👅" },
];

const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hey, I'm glad you're here. 💚\n\nI'm your 24/7 strategic partner. Whether you just got a message that made your stomach drop, need help with a court document, or simply need a moment to breathe — I've got you.\n\nBe present. Don't react. Let's take back your control.\n\nWhat's going on?",
  timestamp: new Date(),
};

export default function CoachPage() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showPromptGallery, setShowPromptGallery] = useState(false);

  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
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
  const [showFeedback, setShowFeedback] = useState(false);
const [ratedMessages, setRatedMessages] = useState<Set<string>>(new Set());

  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth check
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      setAuthLoading(false);
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

  // Load conversations
  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

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
      
      setMessages(loadedMessages.length > 0 ? loadedMessages : [welcomeMessage]);
      setCurrentConversationId(conversationId);
    }
    setShowSidebar(false);
  };
  const rateMessage = async (messageId: string, messageContent: string, helpful: boolean) => {
    if (!user || ratedMessages.has(messageId)) return;
    
    await supabase.from('feedback').insert({
      user_id: user.id,
      type: helpful ? 'message_helpful' : 'message_not_helpful',
      message_content: messageContent.slice(0, 500),
      conversation_id: currentConversationId,
    });
    
    setRatedMessages(prev => new Set(prev).add(messageId));
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([welcomeMessage]);
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
      setCurrentConversationId(data.id);
      return data.id;
    }
    return null;
  };

  const saveMessage = async (conversationId: string, role: "user" | "assistant", content: string) => {
    if (!user) return;

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: role,
      content: content,
    });

    // Update conversation's updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  };

  useEffect(() => {
    const accepted = localStorage.getItem("pattern18-disclaimer-accepted");
    if (!accepted) {
      setShowDisclaimer(true);
    }
  }, []);

  useEffect(() => {
    setCurrentAffirmation(affirmations[Math.floor(Math.random() * affirmations.length)]);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  useEffect(() => {
    if (showRegulate && regulateMode === "breathe") {
      const phases: Array<"inhale" | "hold" | "exhale" | "rest"> = ["inhale", "hold", "exhale", "rest"];
      let phaseIndex = 0;
      let count = 0;
      
      setBreathePhase("inhale");
      setBreatheCount(0);
      
      const interval = setInterval(() => {
        phaseIndex = (phaseIndex + 1) % 4;
        setBreathePhase(phases[phaseIndex]);
        
        if (phaseIndex === 0) {
          count++;
          setBreatheCount(count);
          if (count >= 4) {
            clearInterval(interval);
            setTimeout(() => setRegulateMode("menu"), 2000);
          }
        }
      }, 4000);
      
      return () => clearInterval(interval);
    }
  }, [showRegulate, regulateMode]);

  const parseCaseContext = (response: string): CaseContext | null => {
    try {
      const caseMatch = response.match(/\*\*Case:\*\*\s*([^\n]+)/);
      const courtMatch = response.match(/\*\*Court:\*\*\s*([^\n]+)/);
      const petitionerMatch = response.match(/\*\*Petitioner:\*\*\s*([^\n]+)/);
      const respondentMatch = response.match(/\*\*Respondent:\*\*\s*([^\n]+)/);
      const documentMatch = response.match(/\*\*Document:\*\*\s*([^\n]+)/);

      if (caseMatch && petitionerMatch && respondentMatch) {
        return {
          caseNumber: caseMatch[1].trim(),
          court: courtMatch ? courtMatch[1].trim() : "",
          petitioner: petitionerMatch[1].trim(),
          respondent: respondentMatch[1].trim(),
          userRole: "respondent",
          documentType: documentMatch ? documentMatch[1].trim() : "",
        };
      }
    } catch (e) {
      console.error("Failed to parse case context:", e);
    }
    return null;
  };

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const sendMessage = async (text: string, imageFile?: File) => {
    if (!text.trim() && !imageFile) return;
    if (isLoading) return;

    const userMessageId = Date.now().toString();
    let imageDataUrl: string | undefined;
    let newPdfBase64: string | undefined;
    
    const isPdf = imageFile && (imageFile.type === "application/pdf" || imageFile.name.toLowerCase().endsWith(".pdf"));

    if (imageFile) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
      });

      if (isPdf) {
        newPdfBase64 = base64.replace(/^data:application\/pdf;base64,/, "");
        setStoredPdf({ base64: newPdfBase64, name: imageFile.name });
      } else {
        imageDataUrl = base64;
      }
    }

    const displayText = text || (isPdf ? "📄 Court document uploaded" : "📷 Screenshot uploaded");

    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: displayText,
      image: imageDataUrl,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Create conversation if needed and save user message
    let convId = currentConversationId;
    if (!convId) {
      convId = await createConversation(displayText);
    }
    if (convId) {
      await saveMessage(convId, "user", displayText);
    }

    const assistantMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
      },
    ]);

    try {
      const formData = new FormData();
      formData.append("message", text || "");
      formData.append("history", JSON.stringify(messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }))));
      
      if (caseContext) {
        formData.append("caseContext", JSON.stringify(caseContext));
      }

      if (imageFile) {
        formData.append("file", imageFile);
      }
      
      const pdfToUse = newPdfBase64 || storedPdf?.base64;
      if (pdfToUse && !imageFile) {
        formData.append("storedPdf", pdfToUse);
      }

      const response = await fetch("/api/coach", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullContent += data.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: fullContent }
                      : m
                  )
                );
              }
            } catch {}
          }
        }
      }

      // Save assistant message
      if (convId && fullContent) {
        await saveMessage(convId, "assistant", fullContent);
      }

      if (!caseContext && fullContent.includes("**Case:**")) {
        const parsed = parseCaseContext(fullContent);
        if (parsed) {
          setCaseContext(parsed);
        }
      }

    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: "Sorry, I encountered an error. Please try again." }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const sendDocumentEdit = async () => {
    if (!documentText.trim() || !editInstructions.trim()) return;
    if (isLoading) return;

    let contextHeader = "";
    if (caseContext) {
      contextHeader = `[CASE CONTEXT:
Case: ${caseContext.caseNumber}
Court: ${caseContext.court}
Petitioner: ${caseContext.petitioner}
Respondent: ${caseContext.respondent}]

`;
    }

    const combinedMessage = `${contextHeader}DOCUMENT EDITING MODE - EXACT ACCURACY REQUIRED

Here is the EXACT text of my document:
---BEGIN DOCUMENT---
${documentText}
---END DOCUMENT---

CHANGES REQUESTED:
${editInstructions}

INSTRUCTIONS:
1. Make ONLY the changes I specified above
2. Keep ALL other text EXACTLY the same
3. Return the COMPLETE edited document
4. Do NOT add, remove, or change anything I didn't ask for
5. After the document, briefly list what you changed`;

    setMode("chat");
    await sendMessage(combinedMessage);
    setDocumentText("");
    setEditInstructions("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sendMessage(input || "", file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith("image/") || file.type === "application/pdf")) {
      sendMessage("", file);
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
      .replace(/\*\*\[([^\]]+)\]\s*detected\*\*/g, '<div class="pattern-alert"><span class="pattern-badge">⚠️ $1 detected</span></div>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/^• (.+)$/gm, '<li>$1</li>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n/g, '<br>');
  };

  const getRandomAffirmation = () => {
    return affirmations[Math.floor(Math.random() * affirmations.length)];
  };

  const getPhaseInstruction = () => {
    switch(breathePhase) {
      case "inhale": return "Breathe in";
      case "hold": return "Hold";
      case "exhale": return "Release";
      case "rest": return "Rest";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7f6',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '48px' }}>💚</div>
        <p style={{ color: '#666' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="coach-container">
      {/* Prompt Gallery */}
      {showPromptGallery && (
        <PromptGallery 
          onSelectPrompt={handlePromptSelect}
          onClose={() => setShowPromptGallery(false)}
        />
      )}
{showFeedback && user && (
  <FeedbackModal
    userId={user.id}
    conversationId={currentConversationId}
    onClose={() => setShowFeedback(false)}
  />
)}

      {/* Sidebar */}
      <div className={`sidebar ${showSidebar ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Conversations</h3>
          <button onClick={() => setShowSidebar(false)} className="close-sidebar">✕</button>
        </div>
        <button onClick={startNewConversation} className="new-chat-btn">
          + New Chat
        </button>
        <div className="conversation-list">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`conversation-item ${currentConversationId === conv.id ? 'active' : ''}`}
            >
              <span className="conv-title">{conv.title || "New conversation"}</span>
              <span className="conv-date">{formatDate(conv.updated_at)}</span>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="no-convos">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Overlay for mobile */}
      {showSidebar && <div className="sidebar-overlay" onClick={() => setShowSidebar(false)} />}

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="disclaimer-overlay">
          <div className="disclaimer-modal">
            <div className="disclaimer-icon">💚</div>
            <h2>Welcome to Pattern 18</h2>
            <p className="disclaimer-tagline">Be prepared. Be empowered. Take back control.</p>
            <div className="disclaimer-content">
              <p>I'm your 24/7 strategic partner for navigating high-conflict co-parenting.</p>
              <p>I'll help you:</p>
              <ul>
                <li>Recognize manipulation patterns</li>
                <li>Respond strategically (or know when silence wins)</li>
                <li>Document incidents for court</li>
                <li>Create legal documents</li>
                <li>Stay calm and regulated when it gets hard</li>
              </ul>
              <p className="disclaimer-note">I'm not a lawyer — always have an attorney review documents before filing.</p>
            </div>
            <button 
              className="disclaimer-btn" 
              onClick={() => {
                localStorage.setItem("pattern18-disclaimer-accepted", "true");
                setShowDisclaimer(false);
              }}
            >
              Let's do this 💚
            </button>
          </div>
        </div>
      )}

      {/* Regulate Modal */}
      {showRegulate && (
        <div className="regulate-overlay">
          <div className="regulate-modal">
            {regulateMode === "menu" && (
              <>
                <div className="regulate-header">
                  <span className="regulate-icon">💚</span>
                  <h2>Take a moment</h2>
                  <p>You're safe here. Whatever just happened can wait.</p>
                </div>
                <div className="regulate-options">
                  <button onClick={() => { setBreatheCount(0); setBreathePhase("inhale"); setRegulateMode("breathe"); }}>
                    <span className="option-icon">🫁</span>
                    <span className="option-text">
                      <strong>Breathe</strong>
                      <small>Box breathing to calm your nervous system</small>
                    </span>
                  </button>
                  <button onClick={() => setRegulateMode("ground")}>
                    <span className="option-icon">🌳</span>
                    <span className="option-text">
                      <strong>Ground</strong>
                      <small>5-4-3-2-1 sensory grounding</small>
                    </span>
                  </button>
                  <button onClick={() => { setCurrentAffirmation(getRandomAffirmation()); setRegulateMode("affirm"); }}>
                    <span className="option-icon">💪</span>
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
                <div className="particles">
                  {[...Array(12)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`particle particle-${i} ${breathePhase}`}
                    />
                  ))}
                </div>
                
                <div className="breathe-orb-container">
                  <div className={`breathe-ring ring-1 ${breathePhase}`} />
                  <div className={`breathe-ring ring-2 ${breathePhase}`} />
                  <div className={`breathe-ring ring-3 ${breathePhase}`} />
                  <div className={`breathe-orb ${breathePhase}`}>
                    <div className="breathe-glow" />
                    <span className="breathe-text">{getPhaseInstruction()}</span>
                  </div>
                </div>
                
                <div className="breathe-progress">
                  {[0, 1, 2, 3].map((i) => (
                    <div 
                      key={i} 
                      className={`progress-dot ${i < breatheCount ? 'complete' : ''} ${i === breatheCount ? 'active' : ''}`}
                    >
                      {i < breatheCount && <span>✓</span>}
                    </div>
                  ))}
                </div>
                
                <p className="breathe-cycle">
                  {breatheCount < 4 ? `Cycle ${breatheCount + 1} of 4` : "Complete 💚"}
                </p>
                
                <button className="regulate-skip" onClick={() => setRegulateMode("menu")}>← Back</button>
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
                        <strong>{5 - i} — {step.sense}</strong>
                        <p>{step.instruction}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="regulate-close" onClick={() => setRegulateMode("menu")}>← Back</button>
              </div>
            )}

            {regulateMode === "affirm" && (
              <div className="affirm-container">
                <div className="affirm-quote">
                  <p className="affirm-text">"{currentAffirmation.text}"</p>
                  <p className="affirm-subtext">{currentAffirmation.subtext}</p>
                </div>
                <p className="affirm-signature">— From someone who's been there</p>
                <div className="affirm-actions">
                  <button onClick={() => setCurrentAffirmation(getRandomAffirmation())}>Another ✨</button>
                  <button onClick={() => setRegulateMode("menu")}>← Back</button>
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
              ☰
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
            <button className={`header-btn ${mode === "chat" ? "active" : ""}`} onClick={() => setMode("chat")}>
              <span className="btn-icon">💬</span>
              <span className="btn-text">Chat</span>
            </button>
            <button className={`header-btn ${mode === "document" ? "active" : ""}`} onClick={() => setMode("document")}>
              <span className="btn-icon">📝</span>
              <span className="btn-text">Documents</span>
            </button>
            <button className="header-btn breathe-btn" onClick={() => { setShowRegulate(true); setRegulateMode("menu"); }}>
              <span className="btn-icon">🫁</span>
              <span className="btn-text">Breathe</span>
            </button>
            <button className="header-btn" onClick={handleLogout} title="Sign out">
              <span className="btn-icon">👋</span>
              <span className="btn-text">Logout</span>
            </button>
            <button className="header-btn" onClick={() => setShowFeedback(true)}>
  <span className="btn-icon">💬</span>
  <span className="btn-text">Feedback</span>
</button>
          </div>
        </div>
      </header>

      {(caseContext || storedPdf) && (
        <div className="context-banner">
          <span>
            {caseContext && <>📋 <strong>{caseContext.caseNumber}</strong> — {caseContext.petitioner} v. {caseContext.respondent}</>}
            {storedPdf && !caseContext && <>📄 {storedPdf.name}</>}
            {storedPdf && caseContext && <> • PDF loaded</>}
          </span>
          <button onClick={clearCaseContext}>✕</button>
        </div>
      )}

      {mode === "document" ? (
        <div className="document-editor">
          <div className="editor-container">
            <div className="editor-header">
              <h2>📝 Document Editor</h2>
              <p>Create precise court documents. Paste text and tell me what to change.</p>
            </div>
            
            {caseContext && (
              <div className="editor-context">
                <strong>{caseContext.caseNumber}</strong> — {caseContext.petitioner} v. {caseContext.respondent}
              </div>
            )}

            <div className="editor-section">
              <label>Your document text</label>
              <textarea
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="Paste the text from your court document..."
                className="document-input"
              />
            </div>
            <div className="editor-section">
              <label>What changes do you need?</label>
              <textarea
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                placeholder="Be specific about what to change, add, or remove..."
                className="instructions-input"
              />
            </div>
            <button
              onClick={sendDocumentEdit}
              disabled={!documentText.trim() || !editInstructions.trim() || isLoading}
              className="edit-btn"
            >
              {isLoading ? "Creating..." : "Create Document"}
            </button>
          </div>
        </div>
      ) : (
        <>
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
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  {msg.image && (
                    <div className="message-image">
                      <img src={msg.image} alt="Uploaded" />
                    </div>
                  )}
                  <div className="message-content" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  {msg.role === "assistant" && msg.content && !isLoading && msg.id !== "welcome" && (
  <div className="message-actions">
    <button onClick={() => copyToClipboard(msg.content)}>📋 Copy</button>
    {!ratedMessages.has(msg.id) ? (
      <>
        <button onClick={() => rateMessage(msg.id, msg.content, true)} className="rate-btn helpful">👍 Helpful</button>
        <button onClick={() => rateMessage(msg.id, msg.content, false)} className="rate-btn">👎</button>
      </>
    ) : (
      <span className="rated-thanks">Thanks!</span>
    )}
  </div>
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
        </>
      )}

      <style jsx>{`
        .coach-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          height: 100dvh;
          background: #f5f7f6;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          overflow: hidden;
          .rate-btn { transition: all 0.2s !important; }
.rate-btn.helpful:hover { background: #e8f5e9 !important; color: #2e7d32 !important; }
.rate-btn:hover { background: #ffebee !important; color: #c62828 !important; }
.rated-thanks { font-size: 13px; color: #2dd4a8; font-style: italic; padding: 8px; }
        }

        /* Sidebar */
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          width: 280px;
          background: white;
          box-shadow: 2px 0 24px rgba(0,0,0,0.1);
          z-index: 100;
          transform: translateX(-100%);
          transition: transform 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        .sidebar.open {
          transform: translateX(0);
        }
        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #eee;
        }
        .sidebar-header h3 {
          margin: 0;
          font-size: 18px;
          color: #1a3a2f;
        }
        .close-sidebar {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #666;
        }
        .new-chat-btn {
          margin: 16px;
          padding: 14px;
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .new-chat-btn:hover {
          transform: translateY(-1px);
        }
        .conversation-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }
        .conversation-item {
          padding: 14px 16px;
          border-radius: 10px;
          cursor: pointer;
          margin-bottom: 4px;
          transition: background 0.2s;
        }
        .conversation-item:hover {
          background: #f5f5f5;
        }
        .conversation-item.active {
          background: #e8f5e9;
        }
        .conv-title {
          display: block;
          font-size: 14px;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .conv-date {
          display: block;
          font-size: 12px;
          color: #999;
          margin-top: 4px;
        }
        .no-convos {
          text-align: center;
          color: #999;
          padding: 20px;
          font-size: 14px;
        }
        .sidebar-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.3);
          z-index: 99;
        }

        /* Menu button */
        .menu-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 8px;
          margin-right: 8px;
          color: white;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .menu-btn:hover {
          opacity: 1;
        }
        .logo-section {
          display: flex;
          align-items: center;
        }
        
        /* Disclaimer */
        .disclaimer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(13, 31, 24, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
          backdrop-filter: blur(8px);
          overflow-y: auto;
        }
        .disclaimer-modal {
          background: white;
          border-radius: 24px;
          max-width: 460px;
          width: 100%;
          padding: 40px;
          text-align: center;
          box-shadow: 0 24px 80px rgba(0,0,0,0.4);
          max-height: 90vh;
          overflow-y: auto;
          margin: auto;
        }
        .disclaimer-icon { font-size: 56px; margin-bottom: 20px; }
        .disclaimer-modal h2 {
          font-size: 28px;
          margin-bottom: 8px;
          color: #1a3a2f;
          font-weight: 700;
        }
        .disclaimer-tagline {
          font-size: 16px;
          color: #2dd4a8;
          font-weight: 600;
          margin-bottom: 24px;
        }
        .disclaimer-content {
          text-align: left;
          font-size: 15px;
          line-height: 1.7;
          color: #444;
        }
        .disclaimer-content p { margin-bottom: 12px; }
        .disclaimer-content ul {
          margin: 16px 0;
          padding-left: 0;
          list-style: none;
        }
        .disclaimer-content li {
          padding: 10px 0 10px 32px;
          position: relative;
          border-bottom: 1px solid #f0f0f0;
        }
        .disclaimer-content li:last-child { border-bottom: none; }
        .disclaimer-content li::before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #2dd4a8;
          font-weight: bold;
          font-size: 18px;
        }
        .disclaimer-note {
          font-size: 13px;
          color: #888;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #eee;
        }
        .disclaimer-btn {
          margin-top: 28px;
          padding: 18px 40px;
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .disclaimer-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(26, 58, 47, 0.35);
        }
        
        /* Regulate Modal */
        .regulate-overlay {
          position: fixed;
          inset: 0;
          background: linear-gradient(180deg, #0d1f18 0%, #152e24 50%, #0d1f18 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          overflow-y: auto;
        }
        .regulate-modal {
          max-width: 420px;
          width: 100%;
          padding: 40px;
          text-align: center;
          color: white;
        }
        .regulate-header { margin-bottom: 32px; }
        .regulate-icon { font-size: 56px; display: block; margin-bottom: 20px; }
        .regulate-header h2 { font-size: 28px; margin-bottom: 12px; font-weight: 700; }
        .regulate-header p { color: rgba(255,255,255,0.7); font-size: 16px; line-height: 1.5; }
        .regulate-options {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 28px;
        }
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
        .regulate-options button:hover {
          background: rgba(255,255,255,0.12);
          transform: translateY(-2px);
          border-color: rgba(45, 212, 168, 0.3);
        }
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
          transition: transform 0.2s;
        }
        .regulate-close:hover { transform: translateY(-2px); }
        .regulate-skip {
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          font-size: 15px;
          cursor: pointer;
          margin-top: 24px;
          transition: color 0.2s;
        }
        .regulate-skip:hover { color: white; }
        .regulate-footer {
          margin-top: 28px;
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          font-style: italic;
        }

        /* Breathing */
        .breathe-container {
          position: relative;
          padding: 20px 0;
          min-height: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .particle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: radial-gradient(circle, rgba(45, 212, 168, 0.8) 0%, rgba(45, 212, 168, 0) 70%);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          opacity: 0;
          transition: all 4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .particle.inhale, .particle.hold { opacity: 0.8; }
        .particle.exhale, .particle.rest { opacity: 0; }
        .particle-0.inhale, .particle-0.hold { transform: translate(-50%, -50%) translateX(0px) translateY(-160px); }
        .particle-1.inhale, .particle-1.hold { transform: translate(-50%, -50%) translateX(80px) translateY(-138px); }
        .particle-2.inhale, .particle-2.hold { transform: translate(-50%, -50%) translateX(138px) translateY(-80px); }
        .particle-3.inhale, .particle-3.hold { transform: translate(-50%, -50%) translateX(160px) translateY(0px); }
        .particle-4.inhale, .particle-4.hold { transform: translate(-50%, -50%) translateX(138px) translateY(80px); }
        .particle-5.inhale, .particle-5.hold { transform: translate(-50%, -50%) translateX(80px) translateY(138px); }
        .particle-6.inhale, .particle-6.hold { transform: translate(-50%, -50%) translateX(0px) translateY(160px); }
        .particle-7.inhale, .particle-7.hold { transform: translate(-50%, -50%) translateX(-80px) translateY(138px); }
        .particle-8.inhale, .particle-8.hold { transform: translate(-50%, -50%) translateX(-138px) translateY(80px); }
        .particle-9.inhale, .particle-9.hold { transform: translate(-50%, -50%) translateX(-160px) translateY(0px); }
        .particle-10.inhale, .particle-10.hold { transform: translate(-50%, -50%) translateX(-138px) translateY(-80px); }
        .particle-11.inhale, .particle-11.hold { transform: translate(-50%, -50%) translateX(-80px) translateY(-138px); }
        .particle.exhale, .particle.rest { transform: translate(-50%, -50%) translateX(0) translateY(0); }
        .breathe-orb-container {
          position: relative;
          width: 220px;
          height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
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
        .ring-1.inhale, .ring-1.hold { width: 320px; height: 320px; border-color: rgba(45, 212, 168, 0.15); box-shadow: 0 0 40px rgba(45, 212, 168, 0.1); }
        .ring-2.inhale, .ring-2.hold { width: 270px; height: 270px; border-color: rgba(45, 212, 168, 0.25); box-shadow: 0 0 30px rgba(45, 212, 168, 0.15); }
        .ring-3.inhale, .ring-3.hold { width: 220px; height: 220px; border-color: rgba(45, 212, 168, 0.35); box-shadow: 0 0 20px rgba(45, 212, 168, 0.2); }
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
          box-shadow: 0 0 60px rgba(45, 212, 168, 0.2), inset 0 0 30px rgba(45, 212, 168, 0.1);
        }
        .breathe-orb.inhale, .breathe-orb.hold {
          width: 160px;
          height: 160px;
          background: radial-gradient(circle at 30% 30%, rgba(45, 212, 168, 0.6) 0%, rgba(32, 176, 144, 0.4) 50%, rgba(13, 31, 24, 0.2) 100%);
          box-shadow: 0 0 80px rgba(45, 212, 168, 0.4), 0 0 120px rgba(45, 212, 168, 0.2), inset 0 0 40px rgba(45, 212, 168, 0.2);
        }
        .breathe-glow {
          position: absolute;
          inset: -30px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(45, 212, 168, 0.15) 0%, transparent 70%);
          transition: all 4s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .breathe-orb.inhale .breathe-glow, .breathe-orb.hold .breathe-glow {
          inset: -60px;
          background: radial-gradient(circle, rgba(45, 212, 168, 0.25) 0%, transparent 70%);
        }
        .breathe-text {
          font-size: 18px;
          font-weight: 600;
          color: white;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3);
          z-index: 3;
          letter-spacing: 0.5px;
        }
        .breathe-progress {
          display: flex;
          gap: 14px;
          margin-top: 40px;
          margin-bottom: 12px;
        }
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
          transition: all 0.4s ease;
        }
        .progress-dot.active {
          background: rgba(45, 212, 168, 0.2);
          border-color: #2dd4a8;
          transform: scale(1.3);
          box-shadow: 0 0 20px rgba(45, 212, 168, 0.4);
        }
        .progress-dot.complete {
          background: #2dd4a8;
          border-color: #2dd4a8;
          color: #0d1f18;
          font-weight: bold;
        }
        .breathe-cycle {
          color: rgba(255,255,255,0.6);
          font-size: 15px;
          margin-top: 8px;
        }

        /* Ground */
        .ground-container { text-align: left; padding: 10px 0; }
        .ground-container h2 { text-align: center; margin-bottom: 8px; font-size: 26px; }
        .ground-intro { text-align: center; color: rgba(255,255,255,0.6); margin-bottom: 28px; font-size: 15px; }
        .ground-steps { display: flex; flex-direction: column; gap: 10px; margin-bottom: 28px; }
        .ground-step {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 18px;
          background: rgba(255,255,255,0.05);
          border-radius: 14px;
        }
        .ground-icon { font-size: 28px; }
        .ground-step strong { font-size: 14px; color: #2dd4a8; }
        .ground-step p { font-size: 14px; color: rgba(255,255,255,0.7); margin-top: 2px; }

        /* Affirm */
        .affirm-container { padding: 20px 0; }
        .affirm-quote {
          background: rgba(255,255,255,0.05);
          border-radius: 20px;
          padding: 40px 28px;
          margin-bottom: 24px;
        }
        .affirm-text {
          font-size: 26px;
          font-weight: 600;
          line-height: 1.4;
          margin-bottom: 16px;
          color: #2dd4a8;
        }
        .affirm-subtext { font-size: 17px; color: rgba(255,255,255,0.7); }
        .affirm-signature {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          font-style: italic;
          margin-bottom: 28px;
        }
        .affirm-actions { display: flex; gap: 14px; }
        .affirm-actions button {
          flex: 1;
          padding: 16px;
          border-radius: 12px;
          font-size: 16px;
          cursor: pointer;
          border: none;
          font-weight: 600;
          transition: transform 0.2s;
        }
        .affirm-actions button:hover { transform: translateY(-2px); }
        .affirm-actions button:first-child { background: #2dd4a8; color: #0d1f18; }
        .affirm-actions button:last-child { background: rgba(255,255,255,0.1); color: white; }

        /* Header */
        .header {
          background: linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%);
          padding: 16px 24px;
          flex-shrink: 0;
        }
        .header-content {
          max-width: 900px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
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
        .logo-text { font-size: 22px; font-weight: 700; color: white; letter-spacing: -0.5px; }
        .logo-tagline { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 2px; }
        .header-actions { display: flex; gap: 10px; }
        .header-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 18px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          color: white;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .header-btn:hover {
          background: rgba(255,255,255,0.12);
          transform: translateY(-1px);
        }
        .header-btn.active {
          background: #2dd4a8;
          color: #0d1f18;
          border-color: #2dd4a8;
          font-weight: 600;
        }
        .breathe-btn {
          background: rgba(45, 212, 168, 0.12) !important;
          border-color: rgba(45, 212, 168, 0.2) !important;
        }
        .breathe-btn:hover { background: rgba(45, 212, 168, 0.2) !important; }
        .btn-icon { font-size: 18px; }

        /* Context Banner */
        .context-banner {
          background: #e8f5e9;
          padding: 12px 24px;
          font-size: 14px;
          color: #2e7d32;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #c8e6c9;
        }
        .context-banner button {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 18px;
          padding: 4px 8px;
          line-height: 1;
        }
        .context-banner button:hover { color: #c62828; }
        
        /* Document Editor */
        .document-editor { flex: 1; overflow-y: auto; padding: 24px; }
        .editor-container {
          max-width: 760px;
          margin: 0 auto;
          background: white;
          border-radius: 24px;
          padding: 36px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.05);
        }
        .editor-header { margin-bottom: 28px; }
        .editor-header h2 { font-size: 26px; margin-bottom: 10px; color: #1a3a2f; font-weight: 700; }
        .editor-header p { color: #666; font-size: 15px; }
        .editor-context {
          background: #e8f5e9;
          padding: 14px 20px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 14px;
          color: #2e7d32;
        }
        .editor-section { margin-bottom: 24px; }
        .editor-section label {
          display: block;
          font-weight: 600;
          margin-bottom: 10px;
          color: #1a3a2f;
          font-size: 15px;
        }
        .document-input, .instructions-input {
          width: 100%;
          padding: 18px;
          border: 2px solid #e8e8e8;
          border-radius: 14px;
          font-size: 15px;
          font-family: inherit;
          line-height: 1.7;
          resize: vertical;
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .document-input:focus, .instructions-input:focus {
          outline: none;
          border-color: #2dd4a8;
          box-shadow: 0 0 0 4px rgba(45, 212, 168, 0.1);
        }
        .document-input { min-height: 200px; }
        .instructions-input { min-height: 100px; }
        .edit-btn {
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 17px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .edit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(26, 58, 47, 0.25);
        }
        .edit-btn:disabled { background: #ccc; cursor: not-allowed; }
        
        /* Chat */
        .chat-area {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          position: relative;
        }
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
        .message { margin-bottom: 28px; animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
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
        .message-image {
          margin-bottom: 12px;
          border-radius: 16px;
          overflow: hidden;
          max-width: 280px;
          margin-left: auto;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
        }
        .message-image img { width: 100%; display: block; }
        .message-content :global(strong) { font-weight: 600; color: #1a3a2f; }
        .message-content :global(em) { font-style: italic; color: #666; }
        .message-content :global(ul) { margin: 16px 0; padding-left: 0; list-style: none; }
        .message-content :global(li) { padding: 8px 0 8px 28px; position: relative; }
        .message-content :global(li::before) {
          content: "→";
          position: absolute;
          left: 0;
          color: #2dd4a8;
          font-weight: bold;
        }
        .message-content :global(.pattern-alert) {
          background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
          border-left: 4px solid #e57373;
          padding: 16px 20px;
          border-radius: 12px;
          margin: 16px 0;
        }
        .message-content :global(.pattern-badge) { font-weight: 600; color: #c62828; }
        .message-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #f0f0f0;
        }
        .message-actions button {
          background: #f5f5f5;
          border: none;
          font-size: 14px;
          color: #666;
          cursor: pointer;
          padding: 8px 14px;
          border-radius: 10px;
          font-family: inherit;
          transition: all 0.2s;
        }
        .message-actions button:hover { background: #e8e8e8; color: #1a3a2f; }
        .typing-indicator { display: flex; gap: 8px; padding: 28px; }
        .typing-dot {
          width: 12px;
          height: 12px;
          background: #2dd4a8;
          border-radius: 50%;
          animation: bounce 1.2s infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-10px); }
        }
        
        /* Input */
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
        .input-wrapper:focus-within {
          border-color: #2dd4a8;
          background: white;
          box-shadow: 0 0 0 4px rgba(45, 212, 168, 0.1);
        }
        .file-input { display: none; }
        .attach-btn, .prompt-gallery-btn {
          background: none;
          border: none;
          padding: 10px;
          color: #888;
          cursor: pointer;
          flex-shrink: 0;
          border-radius: 50%;
          transition: all 0.2s;
        }
        .attach-btn:hover, .prompt-gallery-btn:hover { 
          color: #1a3a2f; 
          background: rgba(0,0,0,0.05); 
        }
        .prompt-gallery-btn {
          color: #2dd4a8;
        }
        .prompt-gallery-btn:hover {
          color: #1a3a2f;
          background: rgba(45, 212, 168, 0.1);
        }
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
        .send-btn.active {
          background: linear-gradient(135deg, #1a3a2f 0%, #2d5a4a 100%);
          color: white;
          box-shadow: 0 4px 16px rgba(26, 58, 47, 0.3);
        }
        .send-btn.active:hover { transform: scale(1.05); }
        
        @media (max-width: 640px) {
          .header { padding: 14px 16px; }
          .header-content { flex-wrap: wrap; gap: 12px; }
          .logo-tagline { display: none; }
          .logo-text { font-size: 19px; }
          .header-btn { padding: 10px 14px; }
          .btn-text { display: none; }
          .btn-icon { font-size: 20px; }
          .chat-inner { padding: 24px 16px; }
          .message.user { margin-left: 8%; }
          .editor-container { padding: 24px; margin: 0 8px; }
          .breathe-orb-container { transform: scale(0.8); }
          .breathe-container { min-height: 360px; }
          .disclaimer-modal { padding: 24px; margin: 10px; border-radius: 20px; }
          .disclaimer-icon { font-size: 40px; margin-bottom: 16px; }
          .disclaimer-modal h2 { font-size: 22px; }
          .disclaimer-tagline { font-size: 14px; margin-bottom: 16px; }
          .disclaimer-content { font-size: 14px; }
          .disclaimer-content li { padding: 8px 0 8px 28px; }
          .disclaimer-btn { padding: 16px 32px; font-size: 16px; margin-top: 20px; }
          .disclaimer-note { font-size: 12px; margin-top: 16px; padding-top: 12px; }
        }
      `}</style>
    </div>
  );
}