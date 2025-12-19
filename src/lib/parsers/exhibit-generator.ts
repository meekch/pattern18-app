/**
 * Court Exhibit Generator
 * Produces court-ready PDF documentation from analyzed messages
 */

import { AnalyzedMessage, BulkAnalysisResult, Pattern, PATTERNS } from './pattern-detection';

// ============================================
// EXHIBIT TYPES
// ============================================

export interface ExhibitOptions {
  title?: string;
  caseNumber?: string;
  preparedBy?: string;
  includeAllMessages: boolean;
  includeTimeline: boolean;
  includePatternSummary: boolean;
  highlightSeverity: 'all' | 'high' | 'critical';
  dateFormat: 'us' | 'iso';
  redactUserMessages: boolean;
}

export const DEFAULT_EXHIBIT_OPTIONS: ExhibitOptions = {
  title: 'Communication Evidence Exhibit',
  includeAllMessages: false,
  includeTimeline: true,
  includePatternSummary: true,
  highlightSeverity: 'high',
  dateFormat: 'us',
  redactUserMessages: false
};

export interface ExhibitSection {
  type: 'header' | 'summary' | 'timeline' | 'patterns' | 'messages' | 'footer';
  content: string;
}

// ============================================
// HTML EXHIBIT GENERATOR
// ============================================

export function generateExhibitHTML(
  analysis: BulkAnalysisResult,
  options: Partial<ExhibitOptions> = {}
): string {
  const opts = { ...DEFAULT_EXHIBIT_OPTIONS, ...options };
  
  const sections: string[] = [];
  
  // Header
  sections.push(generateHeader(opts, analysis));
  
  // Executive Summary
  sections.push(generateSummary(analysis));
  
  // Pattern Summary
  if (opts.includePatternSummary) {
    sections.push(generatePatternSummary(analysis));
  }
  
  // Timeline
  if (opts.includeTimeline && analysis.timeline.length > 0) {
    sections.push(generateTimeline(analysis));
  }
  
  // Messages
  sections.push(generateMessages(analysis, opts));
  
  // Footer
  sections.push(generateFooter(opts));
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${opts.title}</title>
  <style>
    ${getExhibitStyles()}
  </style>
</head>
<body>
  <div class="exhibit">
    ${sections.join('\n')}
  </div>
</body>
</html>
  `.trim();
}

// ============================================
// SECTION GENERATORS
// ============================================

function generateHeader(
  opts: ExhibitOptions, 
  analysis: BulkAnalysisResult
): string {
  const dateRange = analysis.summary.dateRange;
  const dateStr = dateRange 
    ? `${formatDate(dateRange.start, opts.dateFormat)} - ${formatDate(dateRange.end, opts.dateFormat)}`
    : 'Date range not available';
  
  return `
    <header class="exhibit-header">
      <h1>${opts.title}</h1>
      ${opts.caseNumber ? `<p class="case-number">Case No: ${opts.caseNumber}</p>` : ''}
      <p class="date-range">Communication Period: ${dateStr}</p>
      <p class="generated">Generated: ${formatDate(new Date(), opts.dateFormat)}</p>
      ${opts.preparedBy ? `<p class="prepared-by">Prepared by: ${opts.preparedBy}</p>` : ''}
    </header>
  `;
}

function generateSummary(analysis: BulkAnalysisResult): string {
  const s = analysis.summary;
  
  return `
    <section class="summary">
      <h2>Executive Summary</h2>
      <div class="summary-grid">
        <div class="stat">
          <span class="stat-value">${s.totalMessages}</span>
          <span class="stat-label">Total Messages</span>
        </div>
        <div class="stat">
          <span class="stat-value">${s.messagesWithPatterns}</span>
          <span class="stat-label">Messages with Patterns</span>
        </div>
        <div class="stat">
          <span class="stat-value">${s.totalPatternMatches}</span>
          <span class="stat-label">Total Pattern Matches</span>
        </div>
        <div class="stat ${s.criticalCount > 0 ? 'critical' : ''}">
          <span class="stat-value">${s.criticalCount}</span>
          <span class="stat-label">Critical Severity</span>
        </div>
        <div class="stat ${s.highSeverityCount > 0 ? 'high' : ''}">
          <span class="stat-value">${s.highSeverityCount}</span>
          <span class="stat-label">High Severity</span>
        </div>
        <div class="stat">
          <span class="stat-value">${s.averageSeverity.toFixed(1)}</span>
          <span class="stat-label">Avg Severity (0-10)</span>
        </div>
      </div>
      
      ${analysis.courtReady ? `
        <div class="court-ready-badge">
          ✓ Sufficient documentation for court presentation
        </div>
      ` : `
        <div class="court-notes">
          <strong>Documentation Notes:</strong>
          <ul>
            ${analysis.courtReadyNotes.map(n => `<li>${n}</li>`).join('')}
          </ul>
        </div>
      `}
    </section>
  `;
}

function generatePatternSummary(analysis: BulkAnalysisResult): string {
  if (analysis.topPatterns.length === 0) {
    return '';
  }
  
  const rows = analysis.topPatterns.map(({ pattern, count, examples }) => `
    <tr class="severity-${pattern.severity}">
      <td><strong>${pattern.name}</strong></td>
      <td><span class="category-badge ${pattern.category}">${pattern.category}</span></td>
      <td><span class="severity-badge ${pattern.severity}">${pattern.severity}</span></td>
      <td>${count}</td>
      <td class="description">${pattern.description}</td>
    </tr>
  `).join('');
  
  return `
    <section class="pattern-summary">
      <h2>Identified Patterns</h2>
      <p class="section-intro">
        The following behavioral patterns were identified in the communications, 
        based on the Pattern 18 framework for recognizing coercive control.
      </p>
      <table class="patterns-table">
        <thead>
          <tr>
            <th>Pattern</th>
            <th>Category</th>
            <th>Severity</th>
            <th>Count</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      
      <div class="category-breakdown">
        <h3>Category Distribution</h3>
        <div class="category-bars">
          ${Object.entries(analysis.summary.categoryBreakdown).map(([cat, count]) => `
            <div class="category-bar">
              <span class="category-label">${cat}</span>
              <div class="bar-container">
                <div class="bar ${cat}" style="width: ${(count / analysis.summary.totalPatternMatches) * 100}%"></div>
              </div>
              <span class="category-count">${count}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function generateTimeline(analysis: BulkAnalysisResult): string {
  const entries = analysis.timeline.map(entry => `
    <div class="timeline-entry">
      <div class="timeline-date">${entry.date}</div>
      <div class="timeline-data">
        <span class="severity-indicator" style="background: ${getSeverityColor(entry.severity)}"></span>
        <span>${entry.patternCount} pattern${entry.patternCount > 1 ? 's' : ''} detected</span>
      </div>
    </div>
  `).join('');
  
  return `
    <section class="timeline">
      <h2>Incident Timeline</h2>
      <div class="timeline-container">
        ${entries}
      </div>
    </section>
  `;
}

function generateMessages(
  analysis: BulkAnalysisResult, 
  opts: ExhibitOptions
): string {
  let messages = analysis.messages;
  
  // Filter based on options
  if (!opts.includeAllMessages) {
    messages = messages.filter(m => m.isEvidence);
  }
  
  if (opts.highlightSeverity === 'critical') {
    messages = messages.filter(m => 
      m.patterns.some(p => p.severity === 'critical')
    );
  } else if (opts.highlightSeverity === 'high') {
    messages = messages.filter(m => 
      m.patterns.some(p => p.severity === 'critical' || p.severity === 'high')
    );
  }
  
  // Sort by date
  messages = [...messages].sort((a, b) => 
    a.timestamp.getTime() - b.timestamp.getTime()
  );
  
  if (messages.length === 0) {
    return `
      <section class="messages">
        <h2>Evidence Messages</h2>
        <p class="no-messages">No messages match the current filter criteria.</p>
      </section>
    `;
  }
  
  const messageHTML = messages.map((msg, index) => {
    const patternTags = msg.patterns.map(p => `
      <span class="pattern-tag ${p.severity}">${p.patternName}</span>
    `).join('');
    
    const senderClass = msg.sender === 'coparent' ? 'coparent' : 'user';
    const senderLabel = msg.sender === 'coparent' 
      ? (msg.senderName || 'Co-Parent') 
      : 'User';
    
    // Optionally redact user messages
    const displayText = (opts.redactUserMessages && msg.sender === 'user')
      ? '[User message redacted]'
      : escapeHtml(msg.text);
    
    return `
      <div class="message ${senderClass} severity-${msg.severityScore > 5 ? 'high' : msg.severityScore > 2 ? 'medium' : 'low'}">
        <div class="message-header">
          <span class="message-number">#${index + 1}</span>
          <span class="message-sender">${senderLabel}</span>
          <span class="message-time">${formatDateTime(msg.timestamp, opts.dateFormat)}</span>
          ${msg.isEdited ? '<span class="edited-badge">Edited</span>' : ''}
          ${msg.severityScore > 0 ? `<span class="severity-score">Severity: ${msg.severityScore}/10</span>` : ''}
        </div>
        <div class="message-body">
          <p>${displayText}</p>
        </div>
        ${msg.patterns.length > 0 ? `
          <div class="message-patterns">
            <strong>Patterns Detected:</strong>
            <div class="pattern-tags">${patternTags}</div>
          </div>
        ` : ''}
        ${msg.evidenceNotes ? `
          <div class="evidence-notes">
            <strong>Evidence Notes:</strong> ${msg.evidenceNotes}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  
  return `
    <section class="messages">
      <h2>Evidence Messages</h2>
      <p class="message-count">Showing ${messages.length} of ${analysis.summary.totalMessages} total messages</p>
      <div class="messages-container">
        ${messageHTML}
      </div>
    </section>
  `;
}

function generateFooter(opts: ExhibitOptions): string {
  return `
    <footer class="exhibit-footer">
      <p>This exhibit was generated using Pattern 18 Coach communication analysis.</p>
      <p>Pattern detection is based on research-identified indicators of coercive control.</p>
      <p class="disclaimer">
        This document is intended to assist in organizing evidence for legal proceedings. 
        Pattern identification is algorithmic and should be reviewed by appropriate professionals.
      </p>
    </footer>
  `;
}

// ============================================
// STYLES
// ============================================

function getExhibitStyles(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1a1a1a;
      background: #fff;
    }
    
    .exhibit {
      max-width: 8.5in;
      margin: 0 auto;
      padding: 0.75in;
    }
    
    /* Header */
    .exhibit-header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 1rem;
      margin-bottom: 1.5rem;
    }
    
    .exhibit-header h1 {
      font-size: 18pt;
      margin-bottom: 0.5rem;
    }
    
    .exhibit-header p {
      font-size: 10pt;
      color: #555;
    }
    
    .case-number {
      font-weight: bold;
      color: #333 !important;
    }
    
    /* Summary */
    .summary {
      margin-bottom: 2rem;
      page-break-inside: avoid;
    }
    
    h2 {
      font-size: 14pt;
      border-bottom: 1px solid #ccc;
      padding-bottom: 0.25rem;
      margin-bottom: 1rem;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }
    
    .stat {
      text-align: center;
      padding: 0.75rem;
      background: #f5f5f5;
      border-radius: 4px;
    }
    
    .stat.critical {
      background: #fee;
      border: 1px solid #c00;
    }
    
    .stat.high {
      background: #fff3e0;
      border: 1px solid #f57c00;
    }
    
    .stat-value {
      display: block;
      font-size: 24pt;
      font-weight: bold;
    }
    
    .stat-label {
      font-size: 9pt;
      color: #666;
    }
    
    .court-ready-badge {
      background: #e8f5e9;
      border: 1px solid #4caf50;
      color: #2e7d32;
      padding: 0.75rem;
      border-radius: 4px;
      text-align: center;
      font-weight: bold;
    }
    
    .court-notes {
      background: #fff8e1;
      border: 1px solid #ffc107;
      padding: 0.75rem;
      border-radius: 4px;
    }
    
    .court-notes ul {
      margin-left: 1.5rem;
      margin-top: 0.5rem;
    }
    
    /* Pattern Summary */
    .pattern-summary {
      margin-bottom: 2rem;
    }
    
    .section-intro {
      font-style: italic;
      margin-bottom: 1rem;
      color: #555;
    }
    
    .patterns-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1.5rem;
      font-size: 10pt;
    }
    
    .patterns-table th,
    .patterns-table td {
      border: 1px solid #ddd;
      padding: 0.5rem;
      text-align: left;
    }
    
    .patterns-table th {
      background: #f5f5f5;
      font-weight: bold;
    }
    
    .patterns-table .description {
      font-size: 9pt;
      color: #666;
    }
    
    .severity-badge, .category-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 9pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .severity-badge.critical { background: #c00; color: white; }
    .severity-badge.high { background: #f57c00; color: white; }
    .severity-badge.medium { background: #ffc107; color: #333; }
    .severity-badge.low { background: #8bc34a; color: white; }
    
    .category-badge.control { background: #e3f2fd; color: #1565c0; }
    .category-badge.manipulation { background: #fce4ec; color: #c2185b; }
    .category-badge.abuse { background: #ffebee; color: #c62828; }
    .category-badge.legal { background: #e8eaf6; color: #3949ab; }
    
    /* Messages */
    .messages {
      margin-bottom: 2rem;
    }
    
    .message-count {
      font-style: italic;
      color: #666;
      margin-bottom: 1rem;
    }
    
    .message {
      border: 1px solid #ddd;
      margin-bottom: 1rem;
      page-break-inside: avoid;
    }
    
    .message.coparent {
      border-left: 4px solid #c00;
    }
    
    .message.user {
      border-left: 4px solid #1565c0;
    }
    
    .message-header {
      background: #f5f5f5;
      padding: 0.5rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      font-size: 10pt;
    }
    
    .message-number {
      font-weight: bold;
    }
    
    .message-sender {
      font-weight: bold;
    }
    
    .message-time {
      color: #666;
    }
    
    .edited-badge {
      background: #fff3e0;
      color: #f57c00;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 9pt;
    }
    
    .severity-score {
      margin-left: auto;
      font-weight: bold;
      color: #c00;
    }
    
    .message-body {
      padding: 0.75rem;
    }
    
    .message-patterns {
      background: #fafafa;
      padding: 0.5rem 0.75rem;
      border-top: 1px solid #eee;
    }
    
    .pattern-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin-top: 0.25rem;
    }
    
    .pattern-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-size: 9pt;
    }
    
    .pattern-tag.critical { background: #ffcdd2; color: #c62828; }
    .pattern-tag.high { background: #ffe0b2; color: #e65100; }
    .pattern-tag.medium { background: #fff9c4; color: #f57f17; }
    .pattern-tag.low { background: #dcedc8; color: #558b2f; }
    
    .evidence-notes {
      background: #e8f5e9;
      padding: 0.5rem 0.75rem;
      border-top: 1px solid #c8e6c9;
      font-size: 10pt;
    }
    
    /* Timeline */
    .timeline {
      margin-bottom: 2rem;
    }
    
    .timeline-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .timeline-entry {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem;
      background: #fafafa;
      border-radius: 4px;
    }
    
    .timeline-date {
      font-weight: bold;
      min-width: 100px;
    }
    
    .timeline-data {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .severity-indicator {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    
    /* Footer */
    .exhibit-footer {
      border-top: 2px solid #333;
      padding-top: 1rem;
      margin-top: 2rem;
      text-align: center;
      font-size: 9pt;
      color: #666;
    }
    
    .disclaimer {
      font-style: italic;
      margin-top: 0.5rem;
    }
    
    /* Print styles */
    @media print {
      .exhibit {
        padding: 0.5in;
      }
      
      .message {
        page-break-inside: avoid;
      }
      
      .summary, .pattern-summary, .timeline {
        page-break-inside: avoid;
      }
    }
  `;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDate(date: Date, format: 'us' | 'iso'): string {
  if (format === 'iso') {
    return date.toISOString().split('T')[0];
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDateTime(date: Date, format: 'us' | 'iso'): string {
  if (format === 'iso') {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function getSeverityColor(score: number): string {
  if (score >= 8) return '#c62828';
  if (score >= 5) return '#f57c00';
  if (score >= 2) return '#ffc107';
  return '#8bc34a';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}