/**
 * Pattern Detection Integration
 * Analyzes parsed messages against the 18 coercive control patterns
 * 
 * Integrates with existing Pattern 18 detection system
 */

// ============================================
// BASE MESSAGE TYPE (flexible to handle different sources)
// ============================================

export interface BaseMessage {
  id: string;
  text: string;
  content?: string;  // Alternative to text
  sender: 'user' | 'coparent' | string;
  senderName?: string;
  timestamp: Date;
  date?: Date;  // Alternative to timestamp
  isEdited?: boolean;
  editedAt?: Date;
  replyTo?: string;
  attachments?: string[];
  [key: string]: any;  // Allow additional properties
}

// ============================================
// PATTERN DEFINITIONS
// ============================================

export interface Pattern {
  id: number;
  name: string;
  category: 'control' | 'manipulation' | 'abuse' | 'legal';
  description: string;
  indicators: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const PATTERNS: Pattern[] = [
  {
    id: 1,
    name: 'Revisionist History',
    category: 'manipulation',
    description: 'Rewriting past events or agreements to favor their narrative',
    indicators: [
      'that\'s not what happened',
      'you agreed to',
      'we never discussed',
      'i never said',
      'you\'re remembering wrong',
      'that was your idea',
      'i did that as a favor',
      'you asked me to'
    ],
    severity: 'medium'
  },
  {
    id: 2,
    name: 'Legal/Court Threats',
    category: 'legal',
    description: 'Using threats of court action to intimidate or control',
    indicators: [
      'petition the court',
      'talk to my lawyer',
      'take you to court',
      'court order',
      'judge will',
      'get this resolved',
      'legal action',
      'sue you',
      'attorneys fees',
      'monetary reward',
      'contempt'
    ],
    severity: 'high'
  },
  {
    id: 3,
    name: 'Financial Manipulation',
    category: 'control',
    description: 'Using money or financial threats to control or punish',
    indicators: [
      'can\'t afford',
      'won\'t be able to get',
      'that\'s on you',
      'pay for',
      'owe me',
      'your bill',
      'foot the bill',
      'what do i owe',
      'you\'re greedy'
    ],
    severity: 'high'
  },
  {
    id: 4,
    name: 'Triangulating Child',
    category: 'abuse',
    description: 'Putting the child in the middle or using them as a messenger',
    indicators: [
      'talked to the kids',
      'told the kids',
      'he said he wants',
      'she made it clear',
      'let him decide',
      'his decision',
      'ask your son',
      'child agrees with me',
      'tell your mother',
      'tell your father'
    ],
    severity: 'critical'
  },
  {
    id: 5,
    name: 'DARVO',
    category: 'manipulation',
    description: 'Deny, Attack, Reverse Victim and Offender',
    indicators: [
      'you\'re being unreasonable',
      'you\'re the problem',
      'you started this',
      'your fault',
      'you\'re difficult',
      'knife to my back',
      'after everything i\'ve done',
      'this is on you',
      'you manipulated',
      'you\'re trying to'
    ],
    severity: 'high'
  },
  {
    id: 6,
    name: 'Dismissing Without Engaging',
    category: 'control',
    description: 'Refusing to address substance of proposals or concerns',
    indicators: [
      'that doesn\'t work',
      'i don\'t agree',
      'not going to happen',
      'that\'s not how it works',
      'simple as that',
      'end of discussion',
      'my way or',
      'i\'ve made my decision'
    ],
    severity: 'medium'
  },
  {
    id: 7,
    name: 'Name-Calling/Verbal Abuse',
    category: 'abuse',
    description: 'Direct insults or demeaning language',
    indicators: [
      'bitch',
      'asshole',
      'stupid',
      'crazy',
      'insane',
      'pathetic',
      'loser',
      'terrible mother',
      'terrible father',
      'piece of',
      'fucked up'
    ],
    severity: 'critical'
  },
  {
    id: 8,
    name: 'False Accusations',
    category: 'manipulation',
    description: 'Making unfounded claims about behavior or character',
    indicators: [
      'gambling addiction',
      'drug problem',
      'alcoholic',
      'abusive',
      'neglect',
      'unfit parent',
      'scam',
      'liar',
      'you always',
      'you never'
    ],
    severity: 'high'
  },
  {
    id: 9,
    name: 'Gaslighting',
    category: 'manipulation',
    description: 'Making someone question their own reality or memory',
    indicators: [
      'that never happened',
      'you\'re imagining',
      'you\'re crazy',
      'nobody said that',
      'you\'re making things up',
      'that\'s not true',
      'you misunderstood'
    ],
    severity: 'critical'
  },
  {
    id: 10,
    name: 'Emotional Blackmail',
    category: 'manipulation',
    description: 'Using guilt, fear, or obligation to control',
    indicators: [
      'if you loved',
      'breaks my heart',
      'can\'t believe you would',
      'after all i\'ve done',
      'how could you',
      'you\'re hurting the kids',
      'think about what you\'re doing'
    ],
    severity: 'high'
  },
  {
    id: 11,
    name: 'Information Gatekeeping',
    category: 'control',
    description: 'Withholding or controlling access to information',
    indicators: [
      'none of your business',
      'don\'t need to know',
      'i\'ll handle it',
      'not your concern',
      'stay out of it',
      'gatekeeping'
    ],
    severity: 'medium'
  },
  {
    id: 12,
    name: 'Schedule Manipulation',
    category: 'control',
    description: 'Unilaterally changing or refusing to follow schedules',
    indicators: [
      'keeping him',
      'not exchanging',
      'change of plans',
      'i\'ll decide when',
      'not giving back',
      'my time now'
    ],
    severity: 'high'
  },
  {
    id: 13,
    name: 'Surveillance/Monitoring',
    category: 'control',
    description: 'Excessive tracking or monitoring behavior',
    indicators: [
      'i know where you',
      'i saw you',
      'tracking',
      'find my',
      'checking up',
      'watching you'
    ],
    severity: 'high'
  },
  {
    id: 14,
    name: 'Weaponizing Flexibility',
    category: 'manipulation',
    description: 'Using past accommodations against the other parent',
    indicators: [
      'did you a favor',
      'was flexible',
      'accommodated you',
      'every time i help',
      'comes back to',
      'remember this'
    ],
    severity: 'medium'
  },
  {
    id: 15,
    name: 'Threats of Exposure',
    category: 'abuse',
    description: 'Threatening to reveal information or damage reputation',
    indicators: [
      'everyone will know',
      'tell everyone',
      'expose you',
      'make sure the kids know',
      'he\'ll see who you really are',
      'court history'
    ],
    severity: 'high'
  },
  {
    id: 16,
    name: 'Minimizing/Mocking',
    category: 'abuse',
    description: 'Belittling concerns, experiences, or conditions',
    indicators: [
      'scam',
      'not a real',
      'you\'re fine',
      'get over it',
      'drama',
      'overreacting',
      'so sensitive',
      'playing victim'
    ],
    severity: 'medium'
  },
  {
    id: 17,
    name: 'Victim Positioning',
    category: 'manipulation',
    description: 'Portraying themselves as the victim of the other parent',
    indicators: [
      'doing this to me',
      'hurting me',
      'against me',
      'you\'re punishing me',
      'taking away from me',
      'unfair to me'
    ],
    severity: 'medium'
  },
  {
    id: 18,
    name: 'Deadline/Urgency Pressure',
    category: 'control',
    description: 'Creating false urgency to force decisions',
    indicators: [
      'need to know now',
      'decide today',
      'before it\'s too late',
      'running out of time',
      'last chance',
      'won\'t wait'
    ],
    severity: 'medium'
  }
];

// ============================================
// DETECTION TYPES
// ============================================

export interface PatternMatch {
  patternId: number;
  patternName: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  matchedIndicator: string;
  matchedText: string;
  confidence: number; // 0-1
}

export interface AnalyzedMessage {
  // Core properties (required)
  id: string;
  text: string;
  sender: 'user' | 'coparent' | string;
  timestamp: Date;
  
  // Optional alternative properties
  content?: string;
  date?: Date;
  senderName?: string;
  
  // Edit tracking
  isEdited?: boolean;
  editedAt?: Date;
  
  // Message relationships
  replyTo?: string;
  attachments?: string[];
  
  // Pattern analysis results
  patterns: PatternMatch[];
  severityScore: number;
  isEvidence: boolean;
  evidenceNotes?: string;
  
  // Allow any additional properties
  [key: string]: any;
}

export interface BulkAnalysisResult {
  messages: AnalyzedMessage[];
  summary: {
    totalMessages: number;
    coparentMessages: number;
    userMessages: number;
    messagesWithPatterns: number;
    totalPatternMatches: number;
    patternBreakdown: Record<string, number>;
    categoryBreakdown: Record<string, number>;
    severityBreakdown: Record<string, number>;
    averageSeverity: number;
    highSeverityCount: number;
    criticalCount: number;
    dateRange: { start: Date; end: Date } | null;
  };
  topPatterns: Array<{ pattern: Pattern; count: number; examples: string[] }>;
  timeline: Array<{ date: string; severity: number; patternCount: number }>;
  courtReady: boolean;
  courtReadyNotes: string[];
}

// ============================================
// HELPER: Get properties flexibly
// ============================================

function getText(msg: any): string {
  return msg.text || msg.content || '';
}

function getTimestamp(msg: any): Date {
  return msg.timestamp || msg.date || new Date();
}

function getSender(msg: any): string {
  return msg.sender || 'unknown';
}

// ============================================
// DETECTION ENGINE
// ============================================

export function analyzeMessage(message: any): AnalyzedMessage {
  const patterns: PatternMatch[] = [];
  const sender = getSender(message);
  const text = getText(message);
  const timestamp = getTimestamp(message);
  
  // Only analyze coparent messages for patterns
  if (sender !== 'coparent') {
    return {
      ...message,
      id: message.id || `msg-${Date.now()}`,
      text,
      sender,
      timestamp,
      patterns: [],
      severityScore: 0,
      isEvidence: false
    };
  }

  const textLower = text.toLowerCase();
  
  for (const pattern of PATTERNS) {
    for (const indicator of pattern.indicators) {
      if (textLower.includes(indicator.toLowerCase())) {
        // Calculate confidence based on indicator specificity
        const confidence = calculateConfidence(indicator, text);
        
        patterns.push({
          patternId: pattern.id,
          patternName: pattern.name,
          category: pattern.category,
          severity: pattern.severity,
          matchedIndicator: indicator,
          matchedText: extractContext(text, indicator),
          confidence
        });
        
        // Only match each pattern once per message
        break;
      }
    }
  }

  // Calculate overall severity score
  const severityScore = calculateSeverityScore(patterns);
  
  // Determine if this is evidence-worthy
  const isEvidence = severityScore >= 3 || patterns.some(p => 
    p.severity === 'critical' || p.severity === 'high'
  );

  return {
    ...message,
    id: message.id || `msg-${Date.now()}`,
    text,
    sender,
    timestamp,
    patterns,
    severityScore,
    isEvidence,
    evidenceNotes: isEvidence ? generateEvidenceNotes(patterns) : undefined
  };
}

export function analyzeBulk(messages: any[]): BulkAnalysisResult {
  const analyzedMessages = messages.map(analyzeMessage);
  
  // Build summary statistics
  const coparentMessages = analyzedMessages.filter(m => getSender(m) === 'coparent');
  const userMessages = analyzedMessages.filter(m => getSender(m) === 'user');
  const messagesWithPatterns = analyzedMessages.filter(m => m.patterns.length > 0);
  
  const patternBreakdown: Record<string, number> = {};
  const categoryBreakdown: Record<string, number> = {};
  const severityBreakdown: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  
  let totalPatternMatches = 0;
  let totalSeverity = 0;
  let highSeverityCount = 0;
  let criticalCount = 0;
  
  for (const msg of analyzedMessages) {
    for (const pattern of msg.patterns) {
      totalPatternMatches++;
      
      patternBreakdown[pattern.patternName] = (patternBreakdown[pattern.patternName] || 0) + 1;
      categoryBreakdown[pattern.category] = (categoryBreakdown[pattern.category] || 0) + 1;
      severityBreakdown[pattern.severity]++;
      
      if (pattern.severity === 'high') highSeverityCount++;
      if (pattern.severity === 'critical') criticalCount++;
    }
    
    totalSeverity += msg.severityScore;
  }

  // Build top patterns list
  const topPatterns = Object.entries(patternBreakdown)
    .map(([name, count]) => {
      const pattern = PATTERNS.find(p => p.name === name)!;
      const examples = messagesWithPatterns
        .filter(m => m.patterns.some(p => p.patternName === name))
        .slice(0, 3)
        .map(m => getText(m).substring(0, 100) + (getText(m).length > 100 ? '...' : ''));
      
      return { pattern, count, examples };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Build timeline
  const timelineMap: Record<string, { severity: number; count: number }> = {};
  for (const msg of analyzedMessages) {
    if (msg.patterns.length === 0) continue;
    
    const dateKey = getTimestamp(msg).toISOString().split('T')[0];
    if (!timelineMap[dateKey]) {
      timelineMap[dateKey] = { severity: 0, count: 0 };
    }
    timelineMap[dateKey].severity += msg.severityScore;
    timelineMap[dateKey].count += msg.patterns.length;
  }
  
  const timeline = Object.entries(timelineMap)
    .map(([date, data]) => ({
      date,
      severity: data.severity,
      patternCount: data.count
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Date range
  let dateRange: { start: Date; end: Date } | null = null;
  if (analyzedMessages.length > 0) {
    const sorted = [...analyzedMessages].sort(
      (a, b) => getTimestamp(a).getTime() - getTimestamp(b).getTime()
    );
    dateRange = {
      start: getTimestamp(sorted[0]),
      end: getTimestamp(sorted[sorted.length - 1])
    };
  }

  // Court readiness assessment
  const courtReadyNotes: string[] = [];
  const courtReady = assessCourtReadiness(analyzedMessages, courtReadyNotes);

  return {
    messages: analyzedMessages,
    summary: {
      totalMessages: analyzedMessages.length,
      coparentMessages: coparentMessages.length,
      userMessages: userMessages.length,
      messagesWithPatterns: messagesWithPatterns.length,
      totalPatternMatches,
      patternBreakdown,
      categoryBreakdown,
      severityBreakdown,
      averageSeverity: coparentMessages.length > 0 
        ? totalSeverity / coparentMessages.length 
        : 0,
      highSeverityCount,
      criticalCount,
      dateRange
    },
    topPatterns,
    timeline,
    courtReady,
    courtReadyNotes
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateConfidence(indicator: string, fullText: string): number {
  // Longer indicators = higher confidence
  const lengthFactor = Math.min(indicator.length / 20, 1);
  
  // Check if it's a phrase match vs single word
  const isPhrase = indicator.includes(' ') ? 0.2 : 0;
  
  // Check context (beginning of sentence = higher confidence)
  const sentences = fullText.split(/[.!?]/);
  let contextBonus = 0;
  for (const sentence of sentences) {
    if (sentence.trim().toLowerCase().startsWith(indicator.toLowerCase())) {
      contextBonus = 0.2;
      break;
    }
  }
  
  return Math.min(0.5 + lengthFactor + isPhrase + contextBonus, 1);
}

function extractContext(text: string, indicator: string): string {
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(indicator.toLowerCase());
  
  if (index === -1) return text.substring(0, 100);
  
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + indicator.length + 30);
  
  let context = text.substring(start, end);
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  
  return context;
}

function calculateSeverityScore(patterns: PatternMatch[]): number {
  if (patterns.length === 0) return 0;
  
  const severityValues = { low: 1, medium: 3, high: 6, critical: 10 };
  
  let score = 0;
  for (const pattern of patterns) {
    score += severityValues[pattern.severity] * pattern.confidence;
  }
  
  // Cap at 10
  return Math.min(Math.round(score * 10) / 10, 10);
}

function generateEvidenceNotes(patterns: PatternMatch[]): string {
  const notes: string[] = [];
  
  const critical = patterns.filter(p => p.severity === 'critical');
  const high = patterns.filter(p => p.severity === 'high');
  
  if (critical.length > 0) {
    notes.push(`Critical patterns: ${critical.map(p => p.patternName).join(', ')}`);
  }
  
  if (high.length > 0) {
    notes.push(`High severity: ${high.map(p => p.patternName).join(', ')}`);
  }
  
  return notes.join('. ');
}

function assessCourtReadiness(
  messages: AnalyzedMessage[], 
  notes: string[]
): boolean {
  const evidenceMessages = messages.filter(m => m.isEvidence);
  const criticalPatterns = messages.flatMap(m => 
    m.patterns.filter(p => p.severity === 'critical')
  );
  
  if (evidenceMessages.length === 0) {
    notes.push('No high-severity patterns detected in this batch.');
    return false;
  }
  
  if (evidenceMessages.length < 3) {
    notes.push('Limited evidence - courts typically want to see a pattern of behavior.');
    notes.push('Continue documenting incidents to strengthen your case.');
    return false;
  }
  
  notes.push(`Found ${evidenceMessages.length} messages with documented patterns.`);
  
  if (criticalPatterns.length > 0) {
    notes.push(`${criticalPatterns.length} critical severity incidents identified.`);
  }
  
  // Check for pattern consistency over time
  const dates = new Set(evidenceMessages.map(m => 
    getTimestamp(m).toISOString().split('T')[0]
  ));
  
  if (dates.size >= 3) {
    notes.push('Pattern established across multiple dates - strengthens documentation.');
    return true;
  }
  
  notes.push('Evidence limited to few dates - continue documenting.');
  return false;
}