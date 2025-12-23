"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[]; // Changed from single image to array
  timestamp: Date;
}

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "I'm here. Drop a screenshot, paste a message, or upload a whole thread. I'll help you see it clearly and respond from a place of calm.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingImages, setPendingImages] = useState<File[]>([]); // Preview before send
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingPreviews]);

  // Handle file selection - supports multiple
  const handleFileSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const imageFiles = fileArray.filter(f => 
      f.type.startsWith('image/') || f.type === 'application/pdf'
    );
    
    if (imageFiles.length === 0) return;

    // Add to pending (allows multiple uploads before sending)
    setPendingImages(prev => [...prev, ...imageFiles]);

    // Generate previews
    for (const file of imageFiles) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPendingPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      } else {
        // PDF placeholder
        setPendingPreviews(prev => [...prev, 'PDF']);
      }
    }
  };

  // Remove a pending image
  const removePendingImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
    setPendingPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Send message with optional images
  const sendMessage = async (text: string = input) => {
    if (!text.trim() && pendingImages.length === 0) return;
    if (isLoading) return;

    const userMessageId = Date.now().toString();
    
    // Store previews for display in chat
    const imagePreviews = [...pendingPreviews];

    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: text || (pendingImages.length > 1 ? "Analyze this thread" : "Analyze this"),
      images: imagePreviews.filter(p => p !== 'PDF'), // Only show image previews
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
      formData.append("message", text || "Analyze this message thread and help me respond");
      
      // Append all images
      pendingImages.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });
      formData.append("fileCount", pendingImages.length.toString());

      // Clear pending after capturing
      setPendingImages([]);
      setPendingPreviews([]);

      const response = await fetch("/api/coach", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("API request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

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
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: msg.content + parsed.content }
                        : msg
                    )
                  );
                }
              } catch (e) {
                // Skip parse errors
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: "Sorry, something went wrong. Please try again." }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Drag and drop handlers
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
      {/* Drag overlay */}
      {dragOver && (
        <div className="drag-overlay">
          <div className="drag-content">
            <span className="drag-icon">📸</span>
            <p>Drop screenshot(s) here</p>
            <p className="drag-subtext">You can drop multiple images for a thread</p>
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div className="chat-area" ref={chatRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            {/* Show images in user messages */}
            {msg.images && msg.images.length > 0 && (
              <div className="message-images">
                {msg.images.map((img, idx) => (
                  <img 
                    key={idx} 
                    src={img} 
                    alt={`Uploaded ${idx + 1}`} 
                    className="message-image"
                    onClick={() => window.open(img, '_blank')}
                  />
                ))}
              </div>
            )}
            <div className="message-content">
              {msg.content}
              {msg.role === "assistant" && isLoading && msg.content === "" && (
                <span className="typing">●●●</span>
              )}
            </div>
            
            {/* Action buttons for assistant messages with patterns */}
            {msg.role === "assistant" && msg.content.includes("Patterns detected") && (
              <div className="message-actions">
                <button 
                  className="action-btn save-btn"
                  onClick={() => alert("Save to evidence - coming soon!")}
                >
                  📌 Save to Evidence
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pending image previews */}
      {pendingPreviews.length > 0 && (
        <div className="pending-images">
          <div className="pending-label">
            Ready to send ({pendingPreviews.length} {pendingPreviews.length === 1 ? 'image' : 'images'}):
          </div>
          <div className="pending-grid">
            {pendingPreviews.map((preview, idx) => (
              <div key={idx} className="pending-item">
                {preview === 'PDF' ? (
                  <div className="pdf-preview">📄 PDF</div>
                ) : (
                  <img src={preview} alt={`Preview ${idx + 1}`} />
                )}
                <button 
                  className="remove-btn"
                  onClick={() => removePendingImage(idx)}
                >
                  ✕
                </button>
              </div>
            ))}
            <button 
              className="add-more-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              + Add more
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="input-area">
        <div className="input-container">
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="attach-btn"
            title="Upload screenshot(s)"
          >
            📎
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            hidden 
            accept="image/*,.pdf"
            multiple  // Enable multiple file selection
            onChange={(e) => {
              if (e.target.files) {
                handleFileSelect(e.target.files);
              }
              e.target.value = ''; // Reset for same file selection
            }}
          />
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingImages.length > 0 ? "Add context or just hit send..." : "Paste a message or drop a screenshot..."}
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
          Drop multiple screenshots to analyze a full thread
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
          padding: 12px 16px;
          border-radius: 16px;
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
          margin-bottom: 8px;
        }

        .message-image {
          max-width: 200px;
          max-height: 300px;
          border-radius: 8px;
          cursor: pointer;
          border: 2px solid rgba(255,255,255,0.3);
          transition: transform 0.2s;
        }

        .message-image:hover {
          transform: scale(1.02);
        }

        .message-content {
          white-space: pre-wrap;
          line-height: 1.5;
        }

        .message-actions {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(0,0,0,0.1);
        }

        .action-btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .save-btn {
          background: #22c55e;
          color: white;
        }

        .save-btn:hover {
          background: #16a34a;
        }

        .typing {
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
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
          width: 80px;
          height: 80px;
        }

        .pending-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 8px;
          border: 2px solid #e5e7eb;
        }

        .pdf-preview {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          border-radius: 8px;
          border: 2px solid #e5e7eb;
          font-size: 12px;
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
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .add-more-btn {
          width: 80px;
          height: 80px;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          background: transparent;
          color: #9ca3af;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
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
          font-size: 24px;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .attach-btn:hover {
          background: #f3f4f6;
        }

        textarea {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          resize: none;
          font-size: 16px;
          font-family: inherit;
          max-height: 150px;
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
          transition: background 0.2s;
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
          color: #9ca3af;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
}