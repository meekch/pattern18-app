'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  patterns?: string[];
  imageUrl?: string;
}

interface SaveData {
  coparentMessage: string;
  userContext: string;
  patterns: string[];
  severity: string;
  date: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveData, setSaveData] = useState<SaveData>({
    coparentMessage: '',
    userContext: '',
    patterns: [],
    severity: 'medium',
    date: new Date().toISOString().split('T')[0]
  });
  const [saving, setSaving] = useState(false);

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

  const topPattern = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])[0];

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async (messageText?: string, file?: File) => {
    const text = messageText || input;
    if (!text.trim() && !file) return;

    setShowHome(false);
    setSending(true);
    setInput('');
    setDetectedPatterns([]);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let imageUrl: string | undefined;
    if (file && file.type.startsWith('image/')) {
      imageUrl = await fileToDataUrl(file);
    }

    const userMessage: Message = { 
      role: 'user', 
      content: text || '',
      imageUrl
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const formData = new FormData();
      formData.append('message', text);
      formData.append('history', JSON.stringify(messages));
      if (caseContext) formData.append('caseContext', JSON.stringify(caseContext));
      formData.append('patternCounts', JSON.stringify(patternCounts));
      formData.append('evidenceCount', String(evidenceCount));
      
      if (file) {
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
                setDetectedPatterns(patterns);
              }
            } catch (e) {}
          }
        }
      }

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type === 'application/pdf') {
      router.push('/docs');
      return;
    }
    
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      router.push('/evidence/upload');
      return;
    }

    if (file.type.startsWith('image/')) {
      await handleSend('Please analyze this screenshot and help me respond.', file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Open save modal with pre-filled data
  const openSaveModal = () => {
    // Try to extract what might be the co-parent's message from the conversation
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    
    setSaveData({
      coparentMessage: '', // Start empty - user needs to paste HIS exact words
      userContext: lastUserMsg?.content || '',
      patterns: detectedPatterns,
      severity: detectedPatterns.some(p => 
        ['threats', 'intimidation', 'stalking', 'monitoring', 'financial_abuse'].includes(p.toLowerCase().replace(/[\s\/]+/g, '_'))
      ) ? 'high' : 'medium',
      date: new Date().toISOString().split('T')[0]
    });
    setShowSaveModal(true);
  };

  const handleSaveEvidence = async () => {
    if (!saveData.coparentMessage.trim()) {
      alert('Please paste the co-parent\'s exact message. This is what goes in court documents.');
      return;
    }

    setSaving(true);

    try {
      const primaryPattern = saveData.patterns[0] || 'Uncategorized';
      const categoryKey = primaryPattern.toLowerCase().replace(/[\s\/]+/g, '_').replace(/-/g, '_');
      
      await supabase.from('incidents').insert({
        user_id: user.id,
        title: primaryPattern,
        coparent_message: saveData.coparentMessage, // HIS exact words
        user_context: saveData.userContext, // Your message for context (not used in exhibit)
        category: categoryKey,
        patterns: saveData.patterns,
        severity: saveData.severity,
        incident_date: new Date(saveData.date).toISOString(),
      });

      setShowSaveModal(false);
      setDetectedPatterns([]);
      setEvidenceCount(prev => prev + 1);
      
      // Update pattern counts
      const newCounts = { ...patternCounts };
      newCounts[categoryKey] = (newCounts[categoryKey] || 0) + 1;
      setPatternCounts(newCounts);

    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const togglePattern = (pattern: string) => {
    setSaveData(prev => ({
      ...prev,
      patterns: prev.patterns.includes(pattern)
        ? prev.patterns.filter(p => p !== pattern)
        : [...prev.patterns, pattern]
    }));
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

  const coparentName = caseContext?.coparent_name || 'your co-parent';

  return (
    <div className="container">
      <header className="header">
        <div className="header-left">
          <span className="logo">18</span>
          <div className="header-text">
            <span className="app-name">Pattern 18</span>
            <span className="tagline">Your 24/7 Strategic Partner</span>
          </div>
        </div>
        <button className="evidence-badge" onClick={() => router.push('/my-case')}>
          📁 {evidenceCount}
        </button>
      </header>

      <div className="content">
        {showHome ? (
          <div className="home">
            <div className="welcome">
              <div className="heart">💚</div>
              <h1>Hey, I am glad you are here.</h1>
              <p>Whether you just got a message that made your stomach drop, need help with a court document, or simply need a moment to breathe - I have got you.</p>
            </div>

            {evidenceCount > 0 && (
              <div className="stats-bar">
                <div className="stat">
                  <span className="stat-num">{evidenceCount}</span>
                  <span className="stat-label">DOCUMENTED</span>
                </div>
                <div className="stat-divider" />
                <div className="stat">
                  <span className="stat-num">{Object.keys(patternCounts).length}</span>
                  <span className="stat-label">PATTERNS FOUND</span>
                </div>
                {topPattern && (
                  <>
                    <div className="stat-divider" />
                    <div className="stat">
                      <span className="stat-pattern">{topPattern[0]}</span>
                      <span className="stat-label">TOP PATTERN ({topPattern[1]}X)</span>
                    </div>
                  </>
                )}
              </div>
            )}

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
                {msg.imageUrl && (
                  <div className="message-image">
                    <img src={msg.imageUrl} alt="Uploaded screenshot" />
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
              </div>
            ))}
            {sending && (
              <div className="message assistant">
                <div className="typing">Thinking...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Save Evidence Button */}
        {detectedPatterns.length > 0 && !showHome && (
          <button className="save-evidence-btn" onClick={openSaveModal}>
            💾 Save to Evidence ({detectedPatterns.length} patterns detected)
          </button>
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
            // Auto-resize
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
          hidden
        />
      </div>

      {/* Save Evidence Modal */}
      {showSaveModal && (
        <div className="modal-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Save to Evidence</h2>
              <button className="close-btn" onClick={() => setShowSaveModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Co-parent's exact message */}
              <div className="form-group">
                <label>
                  {coparentName}'s exact message <span className="required">*</span>
                </label>
                <p className="help-text">
                  Paste their exact words. This is what appears in court documents.
                </p>
                <textarea
                  value={saveData.coparentMessage}
                  onChange={e => setSaveData(prev => ({ ...prev, coparentMessage: e.target.value }))}
                  placeholder={`Paste ${coparentName}'s message here...`}
                  rows={4}
                />
              </div>

              {/* Context (optional) */}
              <div className="form-group">
                <label>Your message / context <span className="optional">(optional)</span></label>
                <p className="help-text">
                  What you said before this, or what prompted it. For your reference only - not included in exhibits.
                </p>
                <textarea
                  value={saveData.userContext}
                  onChange={e => setSaveData(prev => ({ ...prev, userContext: e.target.value }))}
                  placeholder="What happened before this? What did you say?"
                  rows={3}
                />
              </div>

              {/* Date */}
              <div className="form-group">
                <label>Date this was sent</label>
                <input
                  type="date"
                  value={saveData.date}
                  onChange={e => setSaveData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>

              {/* Patterns */}
              <div className="form-group">
                <label>Patterns detected</label>
                <p className="help-text">Tap to add or remove patterns.</p>
                <div className="pattern-toggles">
                  {detectedPatterns.map(p => (
                    <button
                      key={p}
                      className={`pattern-toggle ${saveData.patterns.includes(p) ? 'active' : ''}`}
                      onClick={() => togglePattern(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                {/* Add common patterns if not detected */}
                <div className="add-pattern">
                  <select onChange={e => {
                    if (e.target.value && !saveData.patterns.includes(e.target.value)) {
                      setSaveData(prev => ({ ...prev, patterns: [...prev.patterns, e.target.value] }));
                    }
                    e.target.value = '';
                  }}>
                    <option value="">+ Add pattern...</option>
                    <option value="Gaslighting">Gaslighting</option>
                    <option value="DARVO">DARVO</option>
                    <option value="Triangulation">Triangulation</option>
                    <option value="Blame-Shifting">Blame-Shifting</option>
                    <option value="Financial Abuse">Financial Abuse</option>
                    <option value="Threats">Threats</option>
                    <option value="Intimidation">Intimidation</option>
                    <option value="Gatekeeping">Gatekeeping</option>
                    <option value="Stonewalling">Stonewalling</option>
                    <option value="False Accusations">False Accusations</option>
                  </select>
                </div>
              </div>

              {/* Severity */}
              <div className="form-group">
                <label>Severity</label>
                <div className="severity-buttons">
                  {['low', 'medium', 'high', 'critical'].map(sev => (
                    <button
                      key={sev}
                      className={`severity-btn ${sev} ${saveData.severity === sev ? 'active' : ''}`}
                      onClick={() => setSaveData(prev => ({ ...prev, severity: sev }))}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowSaveModal(false)}>
                Cancel
              </button>
              <button 
                className="save-btn" 
                onClick={handleSaveEvidence}
                disabled={saving || !saveData.coparentMessage.trim()}
              >
                {saving ? 'Saving...' : 'Save Evidence'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="coach" />

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(180deg, #e8f5e9 0%, #f5f7f6 100%);
          display: flex;
          flex-direction: column;
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
        .stats-bar {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          background: white;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .stat {
          text-align: center;
        }
        .stat-num {
          display: block;
          font-size: 24px;
          font-weight: 800;
          color: #1a3a2f;
        }
        .stat-pattern {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: #1a3a2f;
        }
        .stat-label {
          font-size: 10px;
          color: #9ca3af;
          letter-spacing: 0.5px;
        }
        .stat-divider {
          width: 1px;
          height: 40px;
          background: #e5e7eb;
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
        .message.user .message-image {
          margin-left: 40px;
          margin-bottom: 8px;
        }
        .message.user .message-image img {
          max-width: 100%;
          max-height: 300px;
          border-radius: 12px;
          border: 2px solid #1a3a2f;
        }
        .message.user .message-content {
          background: #1a3a2f;
          color: white;
          padding: 14px 18px;
          border-radius: 18px 18px 4px 18px;
          margin-left: 40px;
        }
        .message.assistant .message-content {
          background: white;
          color: #1a3a2f;
          padding: 14px 18px;
          border-radius: 18px 18px 18px 4px;
          margin-right: 40px;
          white-space: pre-wrap;
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
        .typing {
          color: #9ca3af;
          font-style: italic;
        }
        .save-evidence-btn {
          position: fixed;
          bottom: 140px;
          left: 50%;
          transform: translateX(-50%);
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 24px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 50;
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
          overflow-y: auto;
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
        
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          color: #1a3a2f;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 28px;
          color: #9ca3af;
          cursor: pointer;
          line-height: 1;
        }
        .modal-body {
          padding: 20px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          font-weight: 600;
          color: #1a3a2f;
          margin-bottom: 4px;
        }
        .required {
          color: #dc2626;
        }
        .optional {
          font-weight: normal;
          color: #9ca3af;
        }
        .help-text {
          font-size: 13px;
          color: #6b7280;
          margin: 0 0 8px 0;
        }
        .form-group textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
        }
        .form-group textarea:focus {
          outline: none;
          border-color: #1a3a2f;
        }
        .form-group input[type="date"] {
          padding: 10px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
        }
        .pattern-toggles {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 8px;
        }
        .pattern-toggle {
          padding: 6px 14px;
          border-radius: 16px;
          font-size: 13px;
          cursor: pointer;
          border: 2px solid #e5e7eb;
          background: white;
          color: #6b7280;
        }
        .pattern-toggle.active {
          background: #fef3c7;
          border-color: #f59e0b;
          color: #92400e;
        }
        .add-pattern select {
          padding: 8px 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 13px;
          color: #6b7280;
          background: white;
        }
        .severity-buttons {
          display: flex;
          gap: 8px;
        }
        .severity-btn {
          flex: 1;
          padding: 10px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          cursor: pointer;
          background: white;
        }
        .severity-btn.low { color: #6b7280; }
        .severity-btn.medium { color: #ca8a04; }
        .severity-btn.high { color: #ea580c; }
        .severity-btn.critical { color: #dc2626; }
        .severity-btn.active {
          border-width: 3px;
        }
        .severity-btn.low.active { background: #f9fafb; border-color: #6b7280; }
        .severity-btn.medium.active { background: #fefce8; border-color: #ca8a04; }
        .severity-btn.high.active { background: #fff7ed; border-color: #ea580c; }
        .severity-btn.critical.active { background: #fef2f2; border-color: #dc2626; }
        .modal-footer {
          display: flex;
          gap: 12px;
          padding: 20px;
          border-top: 1px solid #e5e7eb;
        }
        .cancel-btn {
          flex: 1;
          padding: 14px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          background: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          color: #6b7280;
        }
        .save-btn {
          flex: 1;
          padding: 14px;
          border: none;
          border-radius: 10px;
          background: #1a3a2f;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
        }
        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}