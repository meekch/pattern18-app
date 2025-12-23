"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  timestamp: Date;
  patterns?: string[];
  savedToTimeline?: boolean;
}

interface CoachSession {
  id: string;
  startedAt: Date;
  images: string[];
  messages: Message[];
  patterns: string[];
  autoSaved: boolean;
  needsReview: boolean;
}

export default function CoachPage() {
  const supabase = createClientComponentClient();
  const [user, setUser] = useState<any>(null);
  const [caseData, setCaseData] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "I'm here. Drop a screenshot, paste a message, or upload a whole thread. Everything you share is automatically saved to your evidence timeline — you can focus on getting through this moment, and review the details later when you're ready.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  
  // Session tracking for auto-save
  const [currentSession, setCurrentSession] = useState<CoachSession | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [sessionImages, setSessionImages] = useState<string[]>([]);
  const [allPatterns, setAllPatterns] = useState<string[]>([]);
  
  const chatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current user and case data
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Get case setup data
        const { data: caseInfo } = await supabase
          .from('user_cases')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (caseInfo) {
          setCaseData(caseInfo);
        }
      }
    };
    init();
  }, [supabase]);

  const scrollToBottom = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingPreviews, scrollToBottom]);

  // Extract patterns from AI response
  const extractPatterns = (content: string): string[] => {
    const patterns: string[] = [];
    
    const knownPatterns = [
      'intimidation', 'false accusation', 'false-accusation', 'darvo', 
      'guilt trip', 'guilt-trip', 'baiting', 'gaslighting', 'triangulation',
      'escalation', 'documentation threat', 'documentation-threat',
      'moving goalposts', 'moving-goalposts', 'urgency', 'character attack',
      'selective enforcement', 'selective-enforcement', 'authority threat',
      'authority-threat', 'outdated order', 'legal posturing', 'hoovering',
      'love bombing', 'love-bombing', 'silent treatment', 'future faking',
      'word salad'
    ];
    
    const lowerContent = content.toLowerCase();
    knownPatterns.forEach(p => {
      if (lowerContent.includes(p)) {
        // Normalize pattern name
        const normalized = p.replace(/-/g, ' ');
        if (!patterns.includes(normalized)) {
          patterns.push(normalized);
        }
      }
    });
    
    return patterns;
  };

  // AUTO-SAVE: Save session to evidence timeline
  const autoSaveSession = async (
    images: string[], 
    coachingContent: string, 
    patterns: string[],
    userMessages: string
  ) => {
    if (!user) return null;
    
    setSaveStatus("saving");
    
    try {
      // Upload images to storage
      const imageUrls: string[] = [];
      
      for (let i = 0; i < images.length; i++) {
        const base64Data = images[i].replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `${user.id}/${Date.now()}-${i}.png`;
        
        const { error: uploadError } = await supabase.storage
          .from('evidence-screenshots')
          .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: false
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('evidence-screenshots')
            .getPublicUrl(fileName);
          
          if (urlData?.publicUrl) {
            imageUrls.push(urlData.publicUrl);
          }
        }
      }

      // Save to evidence timeline
      const { data, error } = await supabase
        .from('evidence_timeline')
        .insert({
          user_id: user.id,
          screenshot_urls: imageUrls,
          patterns_detected: patterns,
          coaching_summary: coachingContent,
          user_messages: userMessages,
          co_parent_name: caseData?.co_parent_name || null,
          incident_date: new Date().toISOString(),
          auto_saved: true,
          needs_review: true, // Flag for later review
          reviewed: false,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setSaveStatus("saved");
      return data;

    } catch (error) {
      console.error("Auto-save error:", error);
      setSaveStatus("error");
      return null;
    }
  };

  // Handle file selection
  const handleFileSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;

    setPendingImages(prev => [...prev, ...imageFiles]);

    for (const file of imageFiles) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPendingPreviews(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePendingImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
    setPendingPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Send message
  const sendMessage = async (text: string = input) => {
    if (!text.trim() && pendingImages.length === 0) return;
    if (isLoading) return;

    const userMessageId = Date.now().toString();
    const imagePreviews = [...pendingPreviews];
    
    // Track images for this session
    if (imagePreviews.length > 0) {
      setSessionImages(prev => [...prev, ...imagePreviews]);
    }

    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: text || "",
      images: imagePreviews,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    setMessages(prev => [
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
      formData.append("message", text || "I need help with this message.");
      
      pendingImages.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });
      formData.append("fileCount", pendingImages.length.toString());
      
      // Include case context if available
      if (caseData) {
        formData.append("caseContext", JSON.stringify({
          coParentName: caseData.co_parent_name,
          userRole: caseData.user_role, // petitioner or respondent
          childAge: caseData.child_age,
        }));
      }

      const hadImages = pendingImages.length > 0;
      setPendingImages([]);
      setPendingPreviews([]);

      const response = await fetch("/api/coach", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("API request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: msg.content + parsed.content }
                        : msg
                    )
                  );
                }
              } catch (e) {}
            }
          }
        }
      }

      // Extract patterns
      const patterns = extractPatterns(fullContent);
      setAllPatterns(prev => [...new Set([...prev, ...patterns])]);
      
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, patterns }
            : msg
        )
      );

      // AUTO-SAVE if this conversation had images (evidence)
      if (hadImages && user) {
        const userMsgs = messages
          .filter(m => m.role === "user")
          .map(m => m.content)
          .join("\n");
        
        await autoSaveSession(
          sessionImages.length > 0 ? sessionImages : imagePreviews,
          fullContent,
          [...new Set([...allPatterns, ...patterns])],
          userMsgs + "\n" + (text || "")
        );
      }

    } catch (error) {
      console.error("Error:", error);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: "Sorry, something went wrong. Please try again." }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Mark for review later
  const markForReview = () => {
    // Visual feedback
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "assistant",
        content: "✓ Marked for review. This conversation is saved to your evidence timeline. When you're ready, go to Evidence → Needs Review to see everything you flagged.",
        timestamp: new Date(),
      }
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  return (
    <div 
      className="coach-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Auto-save status indicator */}
      {saveStatus !== "idle" && (
        <div className={`save-status ${saveStatus}`}>
          {saveStatus === "saving" && "💾 Saving to timeline..."}
          {saveStatus === "saved" && "✓ Saved to evidence timeline"}
          {saveStatus === "error" && "⚠ Couldn't save — try again later"}
        </div>
      )}

      {dragOver && (
        <div className="drag-overlay">
          <div className="drag-content">
            <span className="drag-icon">📸</span>
            <p>Drop screenshot(s) here</p>
            <p className="drag-subtext">Everything is auto-saved</p>
          </div>
        </div>
      )}

      <div className="chat-area" ref={chatRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            {msg.images && msg.images.length > 0 && (
              <div className="message-images">
                {msg.images.map((img, idx) => (
                  <img 
                    key={idx} 
                    src={img} 
                    alt={`Screenshot ${idx + 1}`} 
                    className="message-image"
                    onClick={() => window.open(img, '_blank')}
                  />
                ))}
              </div>
            )}
            <div className="message-content">{msg.content}</div>
            
            {/* Show patterns naturally, not as clinical tags */}
            {msg.role === "assistant" && msg.patterns && msg.patterns.length > 0 && (
              <div className="patterns-detected">
                <span className="patterns-label">Patterns identified:</span>
                {msg.patterns.map((p, i) => (
                  <span key={i} className="pattern-tag">{p}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && messages[messages.length - 1]?.content === "" && (
          <div className="typing-indicator">Reading and analyzing...</div>
        )}
      </div>

      {/* Session controls - shows when there's been activity */}
      {sessionImages.length > 0 && saveStatus === "saved" && (
        <div className="session-controls">
          <span className="session-info">
            ✓ {sessionImages.length} screenshot{sessionImages.length > 1 ? 's' : ''} saved
          </span>
          <button onClick={markForReview} className="review-btn">
            📌 Flag for Review Later
          </button>
        </div>
      )}

      {pendingPreviews.length > 0 && (
        <div className="pending-images">
          <div className="pending-label">
            Ready to send ({pendingPreviews.length}):
          </div>
          <div className="pending-grid">
            {pendingPreviews.map((preview, idx) => (
              <div key={idx} className="pending-item">
                <img src={preview} alt={`Preview ${idx + 1}`} />
                <button 
                  className="remove-btn"
                  onClick={() => removePendingImage(idx)}
                >×</button>
              </div>
            ))}
            <button 
              className="add-more-btn"
              onClick={() => fileInputRef.current?.click()}
            >+ Add</button>
          </div>
        </div>
      )}

      <div className="input-area">
        <div className="input-container">
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="attach-btn"
            title="Upload screenshot(s)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            hidden 
            accept="image/*"
            multiple
            onChange={(e) => {
              if (e.target.files) handleFileSelect(e.target.files);
              e.target.value = '';
            }}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingImages.length > 0 ? "Add context or just send..." : "Paste a message or drop a screenshot..."}
            rows={1}
          />
          <button 
            onClick={() => sendMessage()} 
            disabled={isLoading || (!input.trim() && pendingImages.length === 0)}
            className="send-btn"
          >
            {isLoading ? "..." : "→"}
          </button>
        </div>
        <div className="input-hint">
          Everything is auto-saved to your evidence timeline
        </div>
      </div>

      <style jsx>{`
        .coach-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 800px;
          margin: 0 auto;
          position: relative;
          background: #fff;
        }

        .save-status {
          padding: 8px 16px;
          text-align: center;
          font-size: 13px;
          animation: fadeIn 0.3s ease;
        }

        .save-status.saving {
          background: #fef3c7;
          color: #92400e;
        }

        .save-status.saved {
          background: #d1fae5;
          color: #065f46;
        }

        .save-status.error {
          background: #fee2e2;
          color: #991b1b;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .drag-overlay {
          position: absolute;
          inset: 0;
          background: rgba(34, 197, 94, 0.1);
          border: 3px dashed #22c55e;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }

        .drag-content {
          text-align: center;
          color: #22c55e;
        }

        .drag-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 8px;
        }

        .drag-subtext {
          font-size: 14px;
          opacity: 0.8;
        }

        .chat-area {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message {
          max-width: 85%;
          padding: 14px 18px;
          border-radius: 18px;
          line-height: 1.6;
        }

        .message.user {
          align-self: flex-end;
          background: #22c55e;
          color: white;
          border-bottom-right-radius: 4px;
        }

        .message.assistant {
          align-self: flex-start;
          background: #f3f4f6;
          color: #1f2937;
          border-bottom-left-radius: 4px;
        }

        .message-images {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 10px;
        }

        .message-image {
          max-width: 180px;
          max-height: 250px;
          border-radius: 8px;
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.3);
        }

        .message-content {
          white-space: pre-wrap;
        }

        .patterns-detected {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(0,0,0,0.08);
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }

        .patterns-label {
          font-size: 12px;
          color: #6b7280;
          margin-right: 4px;
        }

        .pattern-tag {
          background: #dbeafe;
          color: #1e40af;
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 12px;
        }

        .typing-indicator {
          color: #9ca3af;
          font-style: italic;
          padding: 10px 18px;
        }

        .session-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 20px;
          background: #f0fdf4;
          border-top: 1px solid #bbf7d0;
        }

        .session-info {
          font-size: 13px;
          color: #166534;
        }

        .review-btn {
          background: white;
          border: 1px solid #22c55e;
          color: #16a34a;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .review-btn:hover {
          background: #22c55e;
          color: white;
        }

        .pending-images {
          padding: 12px 20px;
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
        }

        .pending-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .pending-grid {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .pending-item {
          position: relative;
          width: 70px;
          height: 70px;
        }

        .pending-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
          border: 2px solid #e5e7eb;
        }

        .remove-btn {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #ef4444;
          color: white;
          border: none;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
        }

        .add-more-btn {
          width: 70px;
          height: 70px;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          background: transparent;
          color: #9ca3af;
          cursor: pointer;
          font-size: 13px;
        }

        .add-more-btn:hover {
          border-color: #22c55e;
          color: #22c55e;
        }

        .input-area {
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
          background: white;
        }

        .input-container {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        .attach-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 10px;
          border-radius: 8px;
          color: #6b7280;
          transition: all 0.2s;
        }

        .attach-btn:hover {
          background: #f3f4f6;
          color: #22c55e;
        }

        textarea {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          resize: none;
          font-size: 16px;
          font-family: inherit;
          max-height: 120px;
          outline: none;
        }

        textarea:focus {
          border-color: #22c55e;
        }

        .send-btn {
          background: #22c55e;
          color: white;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
        }

        .send-btn:hover:not(:disabled) {
          background: #16a34a;
        }

        .send-btn:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .input-hint {
          text-align: center;
          font-size: 12px;
          color: #22c55e;
          margin-top: 8px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}