"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
  timestamp: Date;
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

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hey — I'm here to help you stay calm, strategic, and one step ahead.\n\nYou can:\n• **Drop a message or screenshot** — I'll spot the patterns and help you respond (or not respond)\n• **Upload a court document** — I'll break it down and help you plan your next move\n• **Use Document Editor** — for creating precise legal documents\n\nWhat's going on today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [documentText, setDocumentText] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [caseContext, setCaseContext] = useState<CaseContext | null>(null);
  const [storedPdf, setStoredPdf] = useState<{ base64: string; name: string } | null>(null);
  
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const accepted = localStorage.getItem("pattern18-disclaimer-accepted");
    if (!accepted) {
      setShowDisclaimer(true);
    }
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

  return (
    <div className="coach-container">
      {showDisclaimer && (
        <div className="disclaimer-overlay">
          <div className="disclaimer-modal">
            <div className="disclaimer-icon">⚖️</div>
            <h2>Important Notice</h2>
            <div className="disclaimer-content">
              <p><strong>Pattern 18 Coach is not a law firm and does not provide legal advice.</strong></p>
              <p>This tool helps you organize documentation and recognize patterns in communication. It is not a substitute for professional legal counsel.</p>
              <ul>
                <li>Laws vary by state, country, and jurisdiction</li>
                <li>Always consult with a licensed attorney in your area</li>
                <li>Do not rely solely on this tool for legal decisions</li>
                <li>Your attorney should review any documents before filing</li>
              </ul>
              <p className="disclaimer-note">By continuing, you acknowledge that you understand this tool provides documentation support only, not legal advice.</p>
            </div>
            <button 
              className="disclaimer-btn" 
              onClick={() => {
                localStorage.setItem("pattern18-disclaimer-accepted", "true");
                setShowDisclaimer(false);
              }}
            >
              I Understand — Continue
            </button>
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">18</div>
            <span className="logo-text">Pattern 18</span>
          </div>
          <div className="header-actions">
            <button className={`header-btn ${mode === "chat" ? "active" : ""}`} onClick={() => setMode("chat")}>
              💬 Chat
            </button>
            <button className={`header-btn ${mode === "document" ? "active" : ""}`} onClick={() => setMode("document")}>
              📝 Document Editor
            </button>
            <button className="header-btn info-btn" onClick={() => setShowDisclaimer(true)}>ⓘ</button>
          </div>
        </div>
      </header>

      {(caseContext || storedPdf) && (
        <div className="context-banner">
          <span>
            {caseContext && <>📋 <strong>{caseContext.caseNumber}</strong> — {caseContext.petitioner} v. {caseContext.respondent}</>}
            {storedPdf && !caseContext && <>📄 Document loaded: {storedPdf.name}</>}
            {storedPdf && caseContext && <> • 📄 PDF in context</>}
          </span>
          <button onClick={clearCaseContext}>✕ Clear</button>
        </div>
      )}

      {mode === "document" ? (
        <div className="document-editor">
          <div className="editor-container">
            <div className="editor-instructions">
              <h2>📝 Document Editor</h2>
              <p>For precise court document creation. Paste text from your PDF and specify what to change.</p>
            </div>
            
            {caseContext && (
              <div className="editor-context">
                Using: <strong>{caseContext.caseNumber}</strong> — {caseContext.petitioner} (Petitioner) v. {caseContext.respondent} (Respondent)
              </div>
            )}

            <div className="editor-section">
              <label>1. Paste your document text here:</label>
              <textarea
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="Copy and paste the exact text from your document here..."
                className="document-input"
                rows={12}
              />
            </div>
            <div className="editor-section">
              <label>2. What changes do you need?</label>
              <textarea
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                placeholder="Be specific, e.g.:
- Change 'Father gets Thanksgiving 2025' to 'Father gets Thanksgiving 2026'
- Remove the paragraph about summer vacation
- Add after Section 3: 'Neither parent shall...'"
                className="instructions-input"
                rows={5}
              />
            </div>
            <button
              onClick={sendDocumentEdit}
              disabled={!documentText.trim() || !editInstructions.trim() || isLoading}
              className="edit-btn"
            >
              {isLoading ? "Processing..." : "Apply Changes"}
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
              <div className="disclaimer-banner">
                <span>📋 Documentation support only — not legal advice. <button onClick={() => setShowDisclaimer(true)}>Learn more</button></span>
              </div>
              {messages.map((msg) => (
                <div key={msg.id} className={`message ${msg.role}`}>
                  {msg.image && (
                    <div className="message-image">
                      <img src={msg.image} alt="Uploaded" />
                    </div>
                  )}
                  <div className="message-content" dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  {msg.role === "assistant" && msg.content && !isLoading && (
                    <div className="message-actions">
                      <button onClick={() => copyToClipboard(msg.content)}>📋 Copy</button>
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
                <button type="button" className="attach-btn" onClick={() => fileInputRef.current?.click()}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
                  </svg>
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What's going on?"
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
        .coach-container { display: flex; flex-direction: column; height: 100vh; height: 100dvh; background: #f8faf9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        .disclaimer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .disclaimer-modal { background: white; border-radius: 16px; max-width: 500px; width: 100%; padding: 32px; text-align: center; }
        .disclaimer-icon { font-size: 48px; margin-bottom: 16px; }
        .disclaimer-modal h2 { font-size: 22px; margin-bottom: 20px; color: #1a3a2f; }
        .disclaimer-content { text-align: left; font-size: 14px; line-height: 1.6; color: #444; }
        .disclaimer-content p { margin-bottom: 12px; }
        .disclaimer-content ul { margin: 16px 0; padding-left: 20px; }
        .disclaimer-content li { margin-bottom: 8px; }
        .disclaimer-note { font-size: 13px; color: #666; font-style: italic; margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee; }
        .disclaimer-btn { margin-top: 24px; padding: 14px 32px; background: #1a3a2f; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; }
        .disclaimer-banner { background: #fff9e6; border: 1px solid #f0e6c0; border-radius: 8px; padding: 10px 16px; margin-bottom: 20px; font-size: 13px; color: #8a7500; text-align: center; }
        .disclaimer-banner button { background: none; border: none; color: #6b5a00; text-decoration: underline; cursor: pointer; font-size: 13px; }
        .context-banner { background: #e8f5e9; border-bottom: 1px solid #c8e6c9; padding: 8px 16px; font-size: 13px; color: #2e7d32; display: flex; justify-content: space-between; align-items: center; }
        .context-banner button { background: none; border: none; color: #666; cursor: pointer; font-size: 14px; padding: 4px 8px; }
        .context-banner button:hover { color: #c62828; }
        .header { background: linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%); padding: 12px 16px; padding-top: max(12px, env(safe-area-inset-top)); flex-shrink: 0; }
        .header-content { max-width: 800px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
        .logo { display: flex; align-items: center; gap: 10px; color: white; }
        .logo-icon { width: 36px; height: 36px; background: #2dd4a8; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; color: #0d1f18; }
        .logo-text { font-size: 18px; font-weight: 600; }
        .header-actions { display: flex; gap: 8px; }
        .header-btn { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: rgba(255,255,255,0.1); border: none; border-radius: 8px; color: white; font-size: 13px; cursor: pointer; transition: all 0.2s; }
        .header-btn:hover { background: rgba(255,255,255,0.2); }
        .header-btn.active { background: #2dd4a8; color: #0d1f18; }
        .info-btn { padding: 8px 10px; }
        .document-editor { flex: 1; overflow-y: auto; padding: 20px; }
        .editor-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; padding: 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); }
        .editor-instructions { margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
        .editor-instructions h2 { font-size: 20px; margin-bottom: 8px; color: #1a3a2f; }
        .editor-instructions p { color: #666; font-size: 14px; }
        .editor-context { background: #e8f5e9; padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; color: #2e7d32; }
        .editor-section { margin-bottom: 20px; }
        .editor-section label { display: block; font-weight: 600; margin-bottom: 8px; color: #1a3a2f; }
        .document-input, .instructions-input { width: 100%; padding: 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: 'SF Mono', Monaco, 'Courier New', monospace; line-height: 1.6; resize: vertical; box-sizing: border-box; }
        .document-input:focus, .instructions-input:focus { outline: none; border-color: #2dd4a8; box-shadow: 0 0 0 3px rgba(45, 212, 168, 0.1); }
        .document-input { min-height: 200px; }
        .edit-btn { width: 100%; padding: 16px; background: #1a3a2f; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 8px; }
        .edit-btn:hover:not(:disabled) { background: #0d1f18; }
        .edit-btn:disabled { background: #ccc; cursor: not-allowed; }
        .chat-area { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; position: relative; }
        .chat-area.drag-over { background: rgba(45, 212, 168, 0.1); }
        .drop-overlay { position: absolute; inset: 16px; background: rgba(45, 212, 168, 0.2); border: 3px dashed #2dd4a8; border-radius: 16px; display: flex; align-items: center; justify-content: center; z-index: 10; }
        .drop-text { font-size: 18px; font-weight: 600; color: #1a3a2f; }
        .chat-inner { max-width: 800px; margin: 0 auto; padding: 20px 16px; }
        .message { margin-bottom: 20px; animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .message.user { margin-left: 15%; }
        .message.user .message-content { background: linear-gradient(135deg, #1a3a2f 0%, #0d1f18 100%); color: white; padding: 14px 18px; border-radius: 18px; border-bottom-right-radius: 4px; white-space: pre-wrap; font-size: 14px; }
        .message.assistant .message-content { background: white; padding: 18px 22px; border-radius: 18px; border-bottom-left-radius: 4px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); line-height: 1.6; }
        .message-image { margin-bottom: 8px; border-radius: 12px; overflow: hidden; max-width: 300px; margin-left: auto; }
        .message-image img { width: 100%; display: block; }
        .message-content :global(strong) { font-weight: 600; }
        .message-content :global(em) { font-style: italic; color: #666; }
        .message-content :global(ul) { margin: 12px 0; padding-left: 0; list-style: none; }
        .message-content :global(li) { padding: 4px 0 4px 20px; position: relative; }
        .message-content :global(li::before) { content: "→"; position: absolute; left: 0; color: #2dd4a8; }
        .message-content :global(.pattern-alert) { background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%); border-left: 4px solid #e57373; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; }
        .message-content :global(.pattern-badge) { font-weight: 600; color: #c62828; }
        .message-actions { display: flex; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
        .message-actions button { background: none; border: none; font-size: 13px; color: #666; cursor: pointer; padding: 4px 8px; border-radius: 6px; font-family: inherit; }
        .message-actions button:hover { background: #f0f0f0; color: #1a3a2f; }
        .typing-indicator { display: flex; gap: 5px; padding: 20px; }
        .typing-dot { width: 8px; height: 8px; background: #2dd4a8; border-radius: 50%; animation: bounce 1.2s infinite; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
        .input-area { background: white; border-top: 1px solid #e8e8e8; padding: 12px 16px; padding-bottom: max(12px, env(safe-area-inset-bottom)); flex-shrink: 0; }
        .input-container { max-width: 800px; margin: 0 auto; }
        .input-wrapper { display: flex; align-items: flex-end; gap: 10px; background: #f5f5f5; border-radius: 24px; padding: 6px 6px 6px 16px; }
        .file-input { display: none; }
        .attach-btn { background: none; border: none; padding: 8px; color: #666; cursor: pointer; flex-shrink: 0; }
        .attach-btn:hover { color: #1a3a2f; }
        .input-field { flex: 1; border: none; background: transparent; font-size: 16px; line-height: 1.5; resize: none; outline: none; padding: 10px 0; font-family: inherit; min-height: 24px; max-height: 150px; }
        .send-btn { width: 42px; height: 42px; border-radius: 50%; border: none; background: #e0e0e0; color: #999; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
        .send-btn.active { background: #1a3a2f; color: white; }
        @media (max-width: 600px) { .message.user { margin-left: 10%; } .header-btn { padding: 8px 10px; font-size: 12px; } }
      `}</style>
    </div>
  );
}