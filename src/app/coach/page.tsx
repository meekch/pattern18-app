'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  patterns?: string[];
  imageUrls?: string[];
  document?: {
    title: string;
    filename: string;
    content: string;
  };
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
  const [patternCounts, setPatternCounts] = useState<Record<string, number>>({});
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [detectedPatterns, setDetectedPatterns] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Simple save state - no modal!
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastImageUrls, setLastImageUrls] = useState<string[]>([]);
  const [pendingDocument, setPendingDocument] = useState<{ title: string; filename: string; content: string } | null>(null);
  const [downloadingDoc, setDownloadingDoc] = useState(false);
  
  // Feedback state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'other'>('bug');
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

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

      const { data: evidence } = await supabase
        .from('incidents')
        .select('category')
        .eq('user_id', session.user.id);

      if (evidence) {
        setEvidenceCount(evidence.length);
        const counts: Record<string, number> = {};
        evidence.forEach((e: any) => {
          if (e.category) {
            counts[e.category] = (counts[e.category] || 0) + 1;
          }
        });
        setPatternCounts(counts);
      }

      setLoading(false);
    };
    init();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async (messageText?: string, files?: File[]) => {
    const text = messageText || input;
    if (!text.trim() && (!files || files.length === 0)) return;

    setShowHome(false);
    setSending(true);
    setInput('');
    setDetectedPatterns([]);
    setSaved(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const imageUrls: string[] = [];
    if (files) {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const url = await fileToDataUrl(file);
          imageUrls.push(url);
        }
      }
      if (imageUrls.length > 0) {
        setLastImageUrls(imageUrls);
      }
    }

    const userMessage: Message = { 
      role: 'user', 
      content: text || '',
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('message', text);
      formData.append('history', JSON.stringify(messages));
      if (caseContext) formData.append('caseContext', JSON.stringify(caseContext));
      formData.append('patternCounts', JSON.stringify(patternCounts));
      formData.append('evidenceCount', String(evidenceCount));
      
      if (files) {
        files.forEach((file, index) => {
          formData.append(`file${index}`, file);
        });
        formData.append('fileCount', String(files.length));
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
                let displayContent = assistantContent
                  .replace(/---QUOTES---[\s\S]*?---END QUOTES---/g, '')
                  .replace(/---DOCUMENT START---[\s\S]*?---DOCUMENT END---/g, '')
                  .trim();
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = displayContent;
                  return newMessages;
                });
              }
              if (data.patterns) {
                patterns = data.patterns;
                setDetectedPatterns(patterns);
              }
              if (data.document) {
                setPendingDocument(data.document);
              }
            } catch (e) {}
          }
        }
      }

      const docMatch = assistantContent.match(/---DOCUMENT START---\n?([\s\S]*?)---DOCUMENT END---/);
      let documentData: { title: string; filename: string; content: string } | undefined;
      if (docMatch) {
        const docContent = docMatch[1];
        const titleMatch = docContent.match(/TITLE:\s*(.+?)(?:\n|$)/i);
        const filenameMatch = docContent.match(/FILENAME:\s*(.+?)(?:\n|$)/i);
        let content = docContent.replace(/TITLE:\s*.+?\n/i, '').replace(/FILENAME:\s*.+?\n/i, '').trim();
        documentData = {
          title: titleMatch ? titleMatch[1].trim() : 'Document',
          filename: filenameMatch ? filenameMatch[1].trim() : 'document.docx',
          content
        };
        setPendingDocument(documentData);
      }

      const finalDisplayContent = assistantContent
        .replace(/---QUOTES---[\s\S]*?---END QUOTES---/g, '')
        .replace(/---DOCUMENT START---[\s\S]*?---DOCUMENT END---/g, '')
        .trim();
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = finalDisplayContent;
        newMessages[newMessages.length - 1].patterns = patterns;
        newMessages[newMessages.length - 1].document = documentData;
        return newMessages;
      });

      if (user?.id) {
        await supabase.from('coach_messages').insert({ user_id: user.id });
      }

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

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) return;
    setSubmittingFeedback(true);
    
    try {
      await supabase.from('feedback').insert({
        user_id: user?.id,
        type: feedbackType,
        message: feedbackText,
        page: 'coach',
        user_agent: navigator.userAgent,
      });
      
      setShowFeedback(false);
      setFeedbackText('');
      setFeedbackType('bug');
      alert('Thanks for your feedback! 💚');
    } catch (error) {
      console.error('Feedback error:', error);
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    
    if (fileArray.some(f => f.type === 'text/csv' || f.name.endsWith('.csv'))) {
      router.push('/evidence/upload');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const pdfCount = fileArray.filter(f => f.type === 'application/pdf').length;
    const imageCount = fileArray.filter(f => f.type.startsWith('image/')).length;
    
    let prompt = '';
    if (pdfCount > 0 && imageCount > 0) {
      prompt = `Analyze ${pdfCount === 1 ? 'this document' : `these ${pdfCount} documents`} and ${imageCount === 1 ? 'this screenshot' : `these ${imageCount} screenshots`} and help me understand what I need to do.`;
    } else if (pdfCount > 0) {
      prompt = pdfCount === 1 ? 'Analyze this document and help me understand what I need to do.' : `Analyze these ${pdfCount} documents and help me understand what I need to do.`;
    } else if (imageCount > 0) {
      prompt = imageCount === 1 ? 'Analyze this screenshot and help me respond.' : `Analyze these ${imageCount} screenshots and help me respond.`;
    }

    await handleSend(prompt, fileArray);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    
    if (files.some(f => f.type === 'text/csv' || f.name.endsWith('.csv'))) {
      router.push('/evidence/upload');
      return;
    }

    const pdfCount = files.filter(f => f.type === 'application/pdf').length;
    const imageCount = files.filter(f => f.type.startsWith('image/')).length;
    
    let prompt = '';
    if (pdfCount > 0 && imageCount > 0) {
      prompt = `Analyze ${pdfCount === 1 ? 'this document' : `these ${pdfCount} documents`} and ${imageCount === 1 ? 'this screenshot' : `these ${imageCount} screenshots`} and help me understand what I need to do.`;
    } else if (pdfCount > 0) {
      prompt = pdfCount === 1 ? 'Analyze this document and help me understand what I need to do.' : `Analyze these ${pdfCount} documents and help me understand what I need to do.`;
    } else if (imageCount > 0) {
      prompt = imageCount === 1 ? 'Analyze this screenshot and help me respond.' : `Analyze these ${imageCount} screenshots and help me respond.`;
    }

    await handleSend(prompt, files);
  };

  // ONE-CLICK SAVE - no modal needed!
  const handleSaveEvidence = async () => {
    if (detectedPatterns.length === 0) return;
    
    setSaving(true);

    try {
      // Get the last user message content
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      const messageContent = lastUserMsg?.content || 'Screenshot analyzed';
      
      // Auto-set severity based on patterns
      const highSeverityPatterns = ['threats', 'intimidation', 'stalking', 'monitoring', 'financial_abuse'];
      const severity = detectedPatterns.some(p => 
        highSeverityPatterns.includes(p.toLowerCase().replace(/[\s\/]+/g, '_'))
      ) ? 'high' : 'medium';

      const primaryPattern = detectedPatterns[0] || 'Uncategorized';
      const categoryKey = primaryPattern.toLowerCase().replace(/[\s\/]+/g, '_').replace(/-/g, '_');
      
      await supabase.from('incidents').insert({
        user_id: user.id,
        title: primaryPattern,
        coparent_message: messageContent,
        category: categoryKey,
        patterns: detectedPatterns,
        severity: severity,
        incident_date: new Date().toISOString(),
      });

      // Update local state
      setEvidenceCount(prev => prev + 1);
      const newCounts = { ...patternCounts };
      newCounts[categoryKey] = (newCounts[categoryKey] || 0) + 1;
      setPatternCounts(newCounts);
      
      // Show saved confirmation
      setSaved(true);
      setDetectedPatterns([]);

    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const downloadDocument = async (doc: { title: string; filename: string; content: string }) => {
    setDownloadingDoc(true);
    try {
      const response = await fetch('/api/create-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: doc.title,
          filename: doc.filename,
          content: doc.content,
          caseInfo: caseContext
        }),
      });

      if (!response.ok) throw new Error('Failed to create document');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document. Please try again.');
    } finally {
      setDownloadingDoc(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner">💚</div>
        <style jsx>{`
          .loading { display: flex; align-items: center; justify-content: center; height: 100vh; background: #f5f7f6; }
          .spinner { font-size: 48px; animation: pulse 1.5s infinite; }
          @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        `}</style>
      </div>
    );
  }

  return (
    <div 
      className="container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drag-overlay">
          <div className="drag-content">
            <span className="drag-icon">📸</span>
            <span className="drag-text">Drop to analyze</span>
          </div>
        </div>
      )}

      <header className="header">
        <div className="header-left">
          <span className="logo">18</span>
          <div className="header-text">
            <span className="app-name">Pattern 18</span>
            <span className="tagline">Your 24/7 Strategic Partner</span>
          </div>
        </div>
        <div className="header-right">
          <button className="evidence-badge" onClick={() => router.push('/my-case')}>
            📁 {evidenceCount}
          </button>
        </div>
      </header>

      <div className="content">
        {showHome ? (
          <div className="home">
            <div className="welcome">
              <div className="heart">💚</div>
              <h1>Hey, I am glad you are here.</h1>
              <p>Whether you just got a message that made your stomach drop, need help with a court document, or simply need a moment to breathe - I have got you.</p>
            </div>

            <div className="quick-actions">
              <h3>WHAT CAN I HELP WITH?</h3>
              
              <button className="action-btn primary" onClick={() => handleQuickAction('screenshot')}>
                <span className="action-icon">📸</span>
                <div className="action-text">
                  <span className="action-title">Analyze a screenshot</span>
                  <span className="action-desc">Upload image of a message</span>
                </div>
              </button>

              <button className="action-btn" onClick={() => handleQuickAction('courtdoc')}>
                <span className="action-icon">📄</span>
                <div className="action-text">
                  <span className="action-title">Court doc help</span>
                  <span className="action-desc">Understand, respond, or prepare filings</span>
                </div>
              </button>

              <button className="action-btn" onClick={() => handleQuickAction('import')}>
                <span className="action-icon">📤</span>
                <div className="action-text">
                  <span className="action-title">Import message history</span>
                  <span className="action-desc">Bulk analyze CSV export</span>
                </div>
              </button>

              <button className="action-btn" onClick={() => handleQuickAction('moment')}>
                <span className="action-icon">🌿</span>
                <div className="action-text">
                  <span className="action-title">I need a moment</span>
                  <span className="action-desc">Breathing, grounding, support</span>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="chat">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                {msg.imageUrls && msg.imageUrls.length > 0 && (
                  <div className="message-images">
                    {msg.imageUrls.map((url, idx) => (
                      <img key={idx} src={url} alt={`Uploaded ${idx + 1}`} />
                    ))}
                  </div>
                )}
                {msg.content && (
                  <div className="message-content">{msg.content}</div>
                )}
                {msg.patterns && msg.patterns.length > 0 && (
                  <div className="patterns-detected">
                    {msg.patterns.map((p, j) => (
                      <span key={j} className="pattern-tag">{p}</span>
                    ))}
                  </div>
                )}
                {msg.document && (
                  <div className="document-download">
                    <button 
                      onClick={() => downloadDocument(msg.document!)}
                      disabled={downloadingDoc}
                      className="download-btn"
                    >
                      📄 {downloadingDoc ? 'Creating...' : `Download: ${msg.document.filename}`}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="message assistant">
                <div className="analyzing">
                  <span className="analyzing-icon">🎯</span>
                  <span>Identifying patterns...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* One-click Save Evidence Button */}
        {detectedPatterns.length > 0 && !showHome && !saved && (
          <button 
            className="save-evidence-btn" 
            onClick={handleSaveEvidence}
            disabled={saving}
          >
            {saving ? '💾 Saving...' : '💾 Save to Evidence'}
          </button>
        )}
        
        {/* Saved confirmation toast */}
        {saved && !showHome && (
          <div className="saved-toast">
            ✓ Saved to Evidence
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="input-area">
        <button className="attach-btn" onClick={() => fileInputRef.current?.click()}>
          📎
        </button>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
          }}
          placeholder="What's going on?"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={sending}
          rows={1}
        />
        <button 
          className="send-btn" 
          onClick={() => handleSend()}
          disabled={sending || !input.trim()}
        >
          ➤
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.csv"
          onChange={handleFileSelect}
          multiple
          hidden
        />
      </div>

      {/* Floating Feedback Button */}
      <button className="floating-feedback" onClick={() => setShowFeedback(true)}>
        💡
      </button>

      <BottomNav active="coach" />

      {/* Feedback Modal */}
      {showFeedback && (
        <div className="modal-overlay" onClick={() => setShowFeedback(false)}>
          <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
            <div className="feedback-header">
              <h3>Send Feedback</h3>
              <button className="close-btn" onClick={() => setShowFeedback(false)}>✕</button>
            </div>
            
            <div className="feedback-types">
              {(['bug', 'feature', 'other'] as const).map((type) => (
                <button
                  key={type}
                  className={`type-btn ${feedbackType === type ? 'active' : ''}`}
                  onClick={() => setFeedbackType(type)}
                >
                  {type === 'bug' ? '🐛 Bug' : type === 'feature' ? '✨ Feature' : '💬 Other'}
                </button>
              ))}
            </div>
            
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={
                feedbackType === 'bug' 
                  ? "What happened? What did you expect?" 
                  : feedbackType === 'feature'
                  ? "What would help you?"
                  : "What's on your mind?"
              }
              rows={4}
            />
            
            <button 
              className="submit-feedback-btn"
              onClick={handleSubmitFeedback}
              disabled={submittingFeedback || !feedbackText.trim()}
            >
              {submittingFeedback ? 'Sending...' : 'Send Feedback'}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(180deg, #e8f5e9 0%, #f5f7f6 100%);
          display: flex;
          flex-direction: column;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .drag-overlay {
          position: fixed;
          inset: 0;
          background: rgba(26, 58, 47, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .drag-content {
          text-align: center;
          color: white;
        }
        .drag-icon {
          font-size: 64px;
          display: block;
          margin-bottom: 16px;
        }
        .drag-text {
          font-size: 24px;
          font-weight: 600;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #1a3a2f;
          color: white;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          background: white;
          color: #1a3a2f;
          font-weight: 800;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 14px;
        }
        .header-text {
          display: flex;
          flex-direction: column;
        }
        .app-name {
          font-weight: 700;
          font-size: 16px;
        }
        .tagline {
          font-size: 11px;
          opacity: 0.8;
        }
        .evidence-badge {
          background: rgba(255,255,255,0.15);
          border: none;
          padding: 8px 14px;
          border-radius: 20px;
          color: white;
          font-size: 14px;
          cursor: pointer;
        }
        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .floating-feedback {
          position: fixed;
          bottom: 145px;
          right: 16px;
          width: 48px;
          height: 48px;
          border-radius: 24px;
          background: #1a3a2f;
          color: white;
          border: none;
          font-size: 22px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .content {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 140px;
        }
        .home {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .welcome {
          text-align: center;
          margin-bottom: 24px;
        }
        .heart {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .welcome h1 {
          font-size: 24px;
          color: #1a3a2f;
          margin: 0 0 12px 0;
        }
        .welcome p {
          color: #4b5563;
          line-height: 1.5;
          margin: 0;
        }
        .quick-actions {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .quick-actions h3 {
          text-align: center;
          font-size: 12px;
          letter-spacing: 1px;
          color: #6b7280;
          margin: 0 0 16px 0;
        }
        .action-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          width: 100%;
          padding: 16px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          margin-bottom: 12px;
          transition: all 0.2s;
        }
        .action-btn:last-child {
          margin-bottom: 0;
        }
        .action-btn:hover {
          border-color: #1a3a2f;
          background: #f0fdf4;
        }
        .action-btn.primary {
          background: #f0fdf4;
          border-color: #1a3a2f;
        }
        .action-icon {
          font-size: 28px;
        }
        .action-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .action-title {
          font-weight: 600;
          color: #1a3a2f;
        }
        .action-desc {
          font-size: 13px;
          color: #9ca3af;
        }
        .chat {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .message {
          margin-bottom: 16px;
        }
        .message.user .message-images {
          margin-left: 40px;
          margin-bottom: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .message.user .message-images img {
          max-width: 200px;
          max-height: 200px;
          border-radius: 12px;
          border: 2px solid #1a3a2f;
          object-fit: cover;
        }
        .message.user .message-content {
          background: #1a3a2f;
          color: white;
          padding: 14px 18px;
          border-radius: 18px 18px 4px 18px;
          margin-left: 40px;
          line-height: 1.6;
          font-size: 15px;
        }
        .message.assistant .message-content {
          background: white;
          color: #374151;
          padding: 16px 20px;
          border-radius: 18px 18px 18px 4px;
          margin-right: 40px;
          white-space: pre-wrap;
          line-height: 1.7;
          font-size: 15px;
        }
        .patterns-detected {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 8px;
          margin-right: 40px;
        }
        .pattern-tag {
          background: #fef3c7;
          color: #92400e;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
        .document-download {
          margin-top: 12px;
          margin-right: 40px;
        }
        .download-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
        }
        .download-btn:disabled {
          opacity: 0.7;
          cursor: wait;
        }
        .analyzing {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #1a3a2f;
          font-weight: 500;
          padding: 8px 0;
        }
        .analyzing-icon {
          font-size: 24px;
          animation: pulse 1s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
        }
        .save-evidence-btn {
          position: fixed;
          bottom: 140px;
          left: 16px;
          background: #059669;
          color: white;
          border: none;
          padding: 12px 18px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
          z-index: 50;
        }
        .save-evidence-btn:disabled {
          opacity: 0.7;
          cursor: wait;
        }
        .saved-toast {
          position: fixed;
          bottom: 140px;
          left: 16px;
          background: #1a3a2f;
          color: white;
          padding: 12px 18px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          z-index: 50;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .input-area {
          position: fixed;
          bottom: 70px;
          left: 0;
          right: 0;
          display: flex;
          align-items: flex-end;
          gap: 12px;
          padding: 12px 16px;
          background: white;
          border-top: 1px solid #e5e7eb;
        }
        .attach-btn {
          background: #f3f4f6;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 22px;
          font-size: 20px;
          cursor: pointer;
        }
        .input-area textarea {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 20px;
          font-size: 16px;
          outline: none;
          resize: none;
          font-family: inherit;
          line-height: 1.4;
          max-height: 150px;
        }
        .input-area textarea:focus {
          border-color: #1a3a2f;
        }
        .send-btn {
          background: #1a3a2f;
          color: white;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 22px;
          font-size: 18px;
          cursor: pointer;
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
        }
        .feedback-modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 400px;
          padding: 24px;
        }
        .feedback-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .feedback-header h3 {
          margin: 0;
          font-size: 18px;
          color: #1a3a2f;
        }
        .close-btn {
          background: #f3f4f6;
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 16px;
          cursor: pointer;
          color: #6b7280;
        }
        .feedback-types {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .type-btn {
          flex: 1;
          padding: 10px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        }
        .type-btn.active {
          border-color: #1a3a2f;
          background: #f0fdf4;
        }
        .feedback-modal textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 15px;
          font-family: inherit;
          resize: none;
          margin-bottom: 16px;
          box-sizing: border-box;
        }
        .feedback-modal textarea:focus {
          outline: none;
          border-color: #1a3a2f;
        }
        .submit-feedback-btn {
          width: 100%;
          padding: 14px;
          background: #1a3a2f;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }
        .submit-feedback-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}