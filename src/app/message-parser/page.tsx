'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ParsedMessage {
  id: string;
  date: Date;
  sender: string;
  content: string;
  isFromThem: boolean;
}

interface DetectedIncident {
  id: string;
  date: Date;
  messages: ParsedMessage[];
  patterns: string[];
  severity: 'low' | 'medium' | 'high';
  summary: string;
  saved: boolean;
}

export default function MessageParserPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  
  const [coparentName, setCoparentName] = useState('');
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [incidents, setIncidents] = useState<DetectedIncident[]>([]);
  const [stats, setStats] = useState<{
    totalMessages: number;
    totalIncidents: number;
    patterns: { [key: string]: number };
    dateRange: { start: Date | null; end: Date | null };
  } | null>(null);
  
  const [savingAll, setSavingAll] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }
      setUser(session.user);
      
      // Load coparent name from case context
      const { data: caseData } = await supabase
        .from('case_context')
        .select('coparent_name')
        .eq('user_id', session.user.id)
        .single();
      
      if (caseData?.coparent_name) {
        setCoparentName(caseData.coparent_name);
      }
      
      setLoading(false);
    };
    init();
  }, [router]);

  const parseCSV = (text: string): ParsedMessage[] => {
    const lines = text.split('\n');
    const messages: ParsedMessage[] = [];
    
    // Try to detect format (various export tools)
    const header = lines[0]?.toLowerCase() || '';
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      // Parse CSV properly (handle quoted fields)
      const fields = parseCSVLine(line);
      
      if (fields.length >= 3) {
        // Common formats: Date, Sender, Message or Date, Type, Sender, Message
        let date: Date;
        let sender: string;
        let content: string;
        
        // Try to detect date field
        const dateIndex = fields.findIndex(f => /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(f) || /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(f));
        
        if (dateIndex !== -1) {
          date = new Date(fields[dateIndex]);
          // Find sender and content
          const remaining = fields.filter((_, idx) => idx !== dateIndex);
          sender = remaining[0] || 'Unknown';
          content = remaining.slice(1).join(' ') || remaining[0] || '';
          
          // If content is empty, sender might be the content
          if (!content && sender) {
            content = sender;
            sender = 'Unknown';
          }
        } else {
          // Fallback: assume Date, Sender, Message
          date = new Date(fields[0]);
          sender = fields[1] || 'Unknown';
          content = fields.slice(2).join(' ');
        }
        
        if (!isNaN(date.getTime()) && content) {
          const isFromThem = coparentName ? 
            sender.toLowerCase().includes(coparentName.toLowerCase()) :
            !sender.toLowerCase().includes('me');
          
          messages.push({
            id: `msg-${i}`,
            date,
            sender,
            content,
            isFromThem,
          });
        }
      }
    }
    
    return messages.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const parseCSVLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    
    return fields;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setParsing(true);
    setProgress(10);
    setProgressText('Reading file...');
    
    try {
      const text = await file.text();
      setProgress(30);
      setProgressText('Parsing messages...');
      
      const parsed = parseCSV(text);
      setMessages(parsed);
      setProgress(50);
      setProgressText(`Found ${parsed.length} messages. Analyzing patterns...`);
      
      if (parsed.length > 0) {
        await analyzeMessages(parsed);
      }
    } catch (error) {
      console.error('Parse error:', error);
      setProgressText('Error parsing file. Please check the format.');
    } finally {
      setParsing(false);
    }
  };

  const analyzeMessages = async (msgs: ParsedMessage[]) => {
    setAnalyzing(true);
    setProgress(60);
    
    // Group messages into conversation chunks (within 2 hours of each other)
    const chunks: ParsedMessage[][] = [];
    let currentChunk: ParsedMessage[] = [];
    
    for (const msg of msgs) {
      if (currentChunk.length === 0) {
        currentChunk.push(msg);
      } else {
        const lastMsg = currentChunk[currentChunk.length - 1];
        const timeDiff = msg.date.getTime() - lastMsg.date.getTime();
        
        if (timeDiff > 2 * 60 * 60 * 1000) { // 2 hours
          chunks.push(currentChunk);
          currentChunk = [msg];
        } else {
          currentChunk.push(msg);
        }
      }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk);
    
    setProgressText(`Analyzing ${chunks.length} conversation chunks...`);
    
    // Analyze each chunk for patterns
    const detectedIncidents: DetectedIncident[] = [];
    const patternCounts: { [key: string]: number } = {};
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      setProgress(60 + Math.floor((i / chunks.length) * 30));
      
      // Get messages from them in this chunk
      const theirMessages = chunk.filter(m => m.isFromThem);
      if (theirMessages.length === 0) continue;
      
      const combinedText = theirMessages.map(m => m.content).join(' ');
      const patterns = detectPatterns(combinedText);
      
      if (patterns.length > 0) {
        // Calculate severity
        const severity = patterns.length >= 3 ? 'high' : patterns.length >= 2 ? 'medium' : 'low';
        
        // Count patterns
        patterns.forEach(p => {
          patternCounts[p] = (patternCounts[p] || 0) + 1;
        });
        
        detectedIncidents.push({
          id: `incident-${i}`,
          date: chunk[0].date,
          messages: chunk,
          patterns,
          severity,
          summary: generateSummary(patterns, theirMessages[0]?.content || ''),
          saved: false,
        });
      }
    }
    
    setIncidents(detectedIncidents);
    setStats({
      totalMessages: msgs.length,
      totalIncidents: detectedIncidents.length,
      patterns: patternCounts,
      dateRange: {
        start: msgs[0]?.date || null,
        end: msgs[msgs.length - 1]?.date || null,
      },
    });
    
    setProgress(100);
    setProgressText('Analysis complete!');
    setAnalyzing(false);
  };

  const detectPatterns = (text: string): string[] => {
    const patterns: string[] = [];
    const lowerText = text.toLowerCase();
    
    // Baiting / Provocation
    if (/you always|you never|why can't you|what's wrong with you|you're (so|such)|how dare you/i.test(text)) {
      patterns.push('Baiting');
    }
    
    // DARVO
    if (/you('re| are) the (one|problem)|you did this|this is your fault|you made me|look what you|i('m| am) the victim/i.test(text)) {
      patterns.push('DARVO');
    }
    
    // Gaslighting
    if (/never (happened|said)|you('re| are) (crazy|imagining|making.*up)|that('s| is) not (true|what)|i didn't|you('re| are) (remembering|misremember)/i.test(text)) {
      patterns.push('Gaslighting');
    }
    
    // Blame-shifting
    if (/because (of )?you|your fault|you caused|you('re| are) (the reason|to blame)|if you (hadn't|didn't|would)/i.test(text)) {
      patterns.push('Blame-shifting');
    }
    
    // Threats
    if (/i('ll| will) (take|get|make sure)|you('ll| will) (never|lose|regret)|court|lawyer|custody|judge/i.test(text)) {
      patterns.push('Threats/Intimidation');
    }
    
    // Manipulation through kids
    if (/(kids?|children|son|daughter).*(said|told|want|hate|don't like|prefer)|tell(ing)? (the )?(kids?|children)/i.test(text)) {
      patterns.push('Triangulation (Kids)');
    }
    
    // Financial control
    if (/money|pay|owe|support|afford|cheap|greedy/i.test(text)) {
      patterns.push('Financial Manipulation');
    }
    
    // Schedule manipulation
    if (/can't (make|do)|change.*(time|day|schedule)|switch|not (available|free)|busy|something came up/i.test(text)) {
      patterns.push('Schedule Manipulation');
    }
    
    // Word salad / confusion
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length > 3 && text.length > 500) {
      const topics = new Set(sentences.map(s => s.slice(0, 20)));
      if (topics.size > sentences.length * 0.7) {
        patterns.push('Word Salad');
      }
    }
    
    // Hoovering
    if (/miss you|love you|family|remember when|we (used to|were)|give (me|us) (another|a) chance|for the kids/i.test(text)) {
      patterns.push('Hoovering');
    }
    
    // Projection
    if (/you('re| are) (controlling|manipulative|abusive|narcissi|lying|the abuser)/i.test(text)) {
      patterns.push('Projection');
    }
    
    // Silent treatment mention
    if (/won't (talk|respond|answer)|ignore|silent|not speaking/i.test(text)) {
      patterns.push('Silent Treatment');
    }
    
    return [...new Set(patterns)];
  };

  const generateSummary = (patterns: string[], sampleText: string): string => {
    const preview = sampleText.slice(0, 100) + (sampleText.length > 100 ? '...' : '');
    return `${patterns.join(', ')} detected: "${preview}"`;
  };

  const saveIncident = async (incident: DetectedIncident) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('incidents')
      .insert({
        user_id: user.id,
        date: incident.date.toISOString(),
        description: incident.messages.filter(m => m.isFromThem).map(m => m.content).join('\n\n'),
        patterns: incident.patterns,
        severity: incident.severity,
        source: 'bulk_import',
        raw_messages: incident.messages,
      });
    
    if (!error) {
      setIncidents(prev => prev.map(inc => 
        inc.id === incident.id ? { ...inc, saved: true } : inc
      ));
      setSavedCount(prev => prev + 1);
    }
  };

  const saveAllIncidents = async () => {
    setSavingAll(true);
    const unsaved = incidents.filter(inc => !inc.saved);
    
    for (const incident of unsaved) {
      await saveIncident(incident);
    }
    
    setSavingAll(false);
  };

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <span>📱</span>
        <p>Loading...</p>
        <style jsx>{`
          .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #f5f7f6;
          }
          .loading span { font-size: 48px; margin-bottom: 16px; }
          .loading p { color: #666; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <button onClick={() => router.back()} className="back-btn">← Back</button>
        <h1>📱 Message Analyzer</h1>
        <div style={{ width: 60 }} />
      </header>

      <div className="content">
        {!stats ? (
          // Upload State
          <div className="upload-section">
            <div className="upload-intro">
              <span className="upload-icon">📱</span>
              <h2>Upload Your Message History</h2>
              <p>
                Upload a CSV export of your text messages and Pattern 18 will automatically 
                scan months of conversations to identify manipulation patterns.
              </p>
              <div className="how-to">
                <h4>How to export your texts:</h4>
                <p className="how-to-intro">Use any tool that exports texts to CSV format:</p>
                <ul className="tool-list">
                  <li><strong>iPhone:</strong> iMazing, AnyTrans, iExplorer, TouchCopy</li>
                  <li><strong>Android:</strong> SMS Backup & Restore, SMS to Text</li>
                  <li><strong>Any phone:</strong> Dr.Fone, MobileTrans</li>
                </ul>
                <p className="how-to-note">Export the conversation as CSV, then upload here. We're not affiliated with any of these tools.</p>
              </div>
            </div>

            {!coparentName && (
              <div className="name-input">
                <label>Co-parent's name (to identify their messages):</label>
                <input
                  type="text"
                  value={coparentName}
                  onChange={(e) => setCoparentName(e.target.value)}
                  placeholder="Enter their name..."
                />
              </div>
            )}

            <div 
              className="upload-zone"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                hidden
              />
              <span className="upload-plus">+</span>
              <p>Click to upload CSV file</p>
              <span className="upload-hint">or drag and drop</span>
            </div>

            {(parsing || analyzing) && (
              <div className="progress-section">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <p className="progress-text">{progressText}</p>
              </div>
            )}

            <div className="privacy-note">
              <span>🔒</span>
              <p>Your messages are analyzed locally and never stored on our servers. Only the incidents you choose to save are stored in your private evidence library.</p>
            </div>
          </div>
        ) : (
          // Results State
          <div className="results-section">
            <div className="stats-cards">
              <div className="stat-card">
                <span className="stat-number">{stats.totalMessages}</span>
                <span className="stat-label">Messages Analyzed</span>
              </div>
              <div className="stat-card highlight">
                <span className="stat-number">{stats.totalIncidents}</span>
                <span className="stat-label">Incidents Found</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">
                  {stats.dateRange.start ? `${Math.ceil((stats.dateRange.end!.getTime() - stats.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} days` : '-'}
                </span>
                <span className="stat-label">Date Range</span>
              </div>
            </div>

            {Object.keys(stats.patterns).length > 0 && (
              <div className="pattern-summary">
                <h3>Patterns Detected</h3>
                <div className="pattern-bars">
                  {Object.entries(stats.patterns)
                    .sort((a, b) => b[1] - a[1])
                    .map(([pattern, count]) => (
                      <div key={pattern} className="pattern-bar-row">
                        <span className="pattern-name">{pattern}</span>
                        <div className="pattern-bar">
                          <div 
                            className="pattern-bar-fill"
                            style={{ width: `${(count / Math.max(...Object.values(stats.patterns))) * 100}%` }}
                          />
                        </div>
                        <span className="pattern-count">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {incidents.length > 0 && (
              <>
                <div className="incidents-header">
                  <h3>Incidents ({incidents.length})</h3>
                  <button 
                    className="save-all-btn"
                    onClick={saveAllIncidents}
                    disabled={savingAll || incidents.every(i => i.saved)}
                  >
                    {savingAll ? 'Saving...' : incidents.every(i => i.saved) ? '✓ All Saved' : `Save All to Evidence (${incidents.filter(i => !i.saved).length})`}
                  </button>
                </div>

                <div className="incidents-list">
                  {incidents.map(incident => (
                    <div key={incident.id} className={`incident-card ${incident.severity}`}>
                      <div className="incident-header">
                        <span className="incident-date">
                          {incident.date.toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                        <span 
                          className="incident-severity"
                          style={{ background: severityColor(incident.severity) }}
                        >
                          {incident.severity}
                        </span>
                      </div>
                      
                      <div className="incident-patterns">
                        {incident.patterns.map(p => (
                          <span key={p} className="pattern-tag">{p}</span>
                        ))}
                      </div>
                      
                      <div className="incident-preview">
                        {incident.messages.slice(0, 3).map(msg => (
                          <div key={msg.id} className={`preview-msg ${msg.isFromThem ? 'them' : 'me'}`}>
                            <span className="msg-sender">{msg.isFromThem ? coparentName || 'Them' : 'You'}:</span>
                            <span className="msg-text">{msg.content.slice(0, 150)}{msg.content.length > 150 ? '...' : ''}</span>
                          </div>
                        ))}
                        {incident.messages.length > 3 && (
                          <span className="more-msgs">+{incident.messages.length - 3} more messages</span>
                        )}
                      </div>
                      
                      <div className="incident-actions">
                        {incident.saved ? (
                          <span className="saved-badge">✓ Saved to Evidence</span>
                        ) : (
                          <button 
                            className="save-btn"
                            onClick={() => saveIncident(incident)}
                          >
                            📌 Save to Evidence
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button 
              className="new-upload-btn"
              onClick={() => {
                setStats(null);
                setMessages([]);
                setIncidents([]);
                setProgress(0);
              }}
            >
              📱 Analyze Another Export
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: #f5f7f6;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: #1a3a2f;
          color: white;
        }
        .header h1 {
          font-size: 18px;
          font-weight: 600;
        }
        .back-btn {
          background: none;
          border: none;
          color: white;
          font-size: 15px;
          cursor: pointer;
        }
        .content {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }

        /* Upload Section */
        .upload-section {
          background: white;
          border-radius: 16px;
          padding: 32px;
        }
        .upload-intro {
          text-align: center;
          margin-bottom: 24px;
        }
        .upload-icon {
          font-size: 56px;
          display: block;
          margin-bottom: 16px;
        }
        .upload-intro h2 {
          color: #1a3a2f;
          margin-bottom: 12px;
        }
        .upload-intro p {
          color: #666;
          line-height: 1.6;
        }
        .how-to {
          background: #f9fafb;
          border-radius: 12px;
          padding: 16px;
          margin-top: 20px;
          text-align: left;
        }
        .how-to h4 {
          color: #1a3a2f;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .how-to-intro {
          font-size: 13px;
          color: #666;
          margin-bottom: 10px;
        }
        .tool-list {
          margin: 0 0 10px 0;
          padding-left: 20px;
          color: #666;
          font-size: 13px;
        }
        .tool-list li {
          margin-bottom: 6px;
        }
        .tool-list strong {
          color: #444;
        }
        .how-to-note {
          font-size: 12px;
          color: #999;
          font-style: italic;
          margin: 0;
        }
        .how-to ol {
          margin: 0;
          padding-left: 20px;
          color: #666;
          font-size: 14px;
        }
        .how-to li {
          margin-bottom: 6px;
        }
        .name-input {
          margin-bottom: 20px;
        }
        .name-input label {
          display: block;
          font-size: 14px;
          color: #666;
          margin-bottom: 8px;
        }
        .name-input input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 16px;
        }
        .upload-zone {
          border: 2px dashed #ddd;
          border-radius: 16px;
          padding: 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .upload-zone:hover {
          border-color: #14b8a6;
          background: #f0fdf4;
        }
        .upload-plus {
          font-size: 48px;
          color: #14b8a6;
          display: block;
          margin-bottom: 12px;
        }
        .upload-zone p {
          color: #333;
          font-weight: 500;
          margin-bottom: 4px;
        }
        .upload-hint {
          color: #999;
          font-size: 13px;
        }
        .progress-section {
          margin-top: 24px;
        }
        .progress-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #14b8a6, #0d9488);
          transition: width 0.3s;
        }
        .progress-text {
          text-align: center;
          color: #666;
          font-size: 14px;
          margin-top: 12px;
        }
        .privacy-note {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-top: 24px;
          padding: 16px;
          background: #fef9c3;
          border-radius: 12px;
        }
        .privacy-note span {
          font-size: 20px;
        }
        .privacy-note p {
          font-size: 13px;
          color: #854d0e;
          line-height: 1.5;
          margin: 0;
        }

        /* Results Section */
        .results-section {
          
        }
        .stats-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        .stat-card.highlight {
          background: #1a3a2f;
          color: white;
        }
        .stat-number {
          display: block;
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .stat-label {
          font-size: 13px;
          opacity: 0.8;
        }
        .pattern-summary {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .pattern-summary h3 {
          color: #1a3a2f;
          margin-bottom: 16px;
          font-size: 16px;
        }
        .pattern-bars {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .pattern-bar-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pattern-name {
          width: 140px;
          font-size: 13px;
          color: #444;
        }
        .pattern-bar {
          flex: 1;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }
        .pattern-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #f59e0b, #ef4444);
          border-radius: 4px;
        }
        .pattern-count {
          width: 30px;
          text-align: right;
          font-size: 13px;
          font-weight: 600;
          color: #666;
        }
        .incidents-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .incidents-header h3 {
          color: #1a3a2f;
          font-size: 16px;
        }
        .save-all-btn {
          background: #1a3a2f;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }
        .save-all-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .incidents-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .incident-card {
          background: white;
          border-radius: 12px;
          padding: 16px;
          border-left: 4px solid #6b7280;
        }
        .incident-card.high {
          border-left-color: #ef4444;
        }
        .incident-card.medium {
          border-left-color: #f59e0b;
        }
        .incident-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .incident-date {
          font-size: 13px;
          color: #666;
        }
        .incident-severity {
          font-size: 11px;
          font-weight: 600;
          color: white;
          padding: 3px 8px;
          border-radius: 10px;
          text-transform: uppercase;
        }
        .incident-patterns {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }
        .pattern-tag {
          background: #fef3c7;
          color: #92400e;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        .incident-preview {
          background: #f9fafb;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
        }
        .preview-msg {
          margin-bottom: 8px;
          font-size: 13px;
          line-height: 1.5;
        }
        .preview-msg:last-child {
          margin-bottom: 0;
        }
        .preview-msg.them {
          color: #dc2626;
        }
        .preview-msg.me {
          color: #666;
        }
        .msg-sender {
          font-weight: 600;
          margin-right: 6px;
        }
        .more-msgs {
          display: block;
          color: #999;
          font-size: 12px;
          margin-top: 8px;
        }
        .incident-actions {
          display: flex;
          justify-content: flex-end;
        }
        .save-btn {
          background: #f3f4f6;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 500;
        }
        .save-btn:hover {
          background: #e5e7eb;
        }
        .saved-badge {
          color: #059669;
          font-size: 13px;
          font-weight: 500;
        }
        .new-upload-btn {
          width: 100%;
          padding: 14px;
          margin-top: 24px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 12px;
          font-size: 15px;
          cursor: pointer;
        }

        @media (max-width: 640px) {
          .stats-cards {
            grid-template-columns: 1fr;
          }
          .pattern-name {
            width: 100px;
          }
          .incidents-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
}