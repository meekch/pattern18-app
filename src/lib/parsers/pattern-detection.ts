/**
 * Pattern Detection - ULTRA CONSERVATIVE VERSION
 * 
 * CRITICAL: Only flag CLEAR, OBVIOUS abuse. 
 * False positives destroy court credibility.
 * 
 * If in doubt, DON'T flag it.
 */

export interface BaseMessage {
  id: string;
  text: string;
  content?: string;
  sender: 'user' | 'coparent' | string;
  senderName?: string;
  timestamp: Date;
  date?: Date;
  isEdited?: boolean;
  editedAt?: Date;
  replyTo?: string;
  attachments?: string[];
  [key: string]: any;
}

export interface Pattern {
  id: number;
  name: string;
  category: 'control' | 'manipulation' | 'abuse' | 'legal';
  description: string;
  indicators: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ULTRA CONSERVATIVE - Only very specific, unambiguous abuse phrases
export const PATTERNS: Pattern[] = [
  {
    id: 1,
    name: 'Threats',
    category: 'abuse',
    description: 'Direct threats',
    indicators: [
      'you will regret this',
      'you\'re going to regret',
      'going to be sorry',
      'you\'ll pay for this',
      'i\'ll destroy you',
      'i\'ll ruin your life',
      'i will ruin you',
      'never see the kids again',
      'take the kids from you',
      'make your life hell',
      'make your life miserable',
      'have fun crossing the border',
      'good luck crossing the border',
      'fun at the border',
      'watch your back',
      'you\'ll be sorry',
    ],
    severity: 'critical'
  },
  {
    id: 2,
    name: 'Name-Calling',
    category: 'abuse',
    description: 'Direct insults',
    indicators: [
      'terrible mother',
      'terrible father',
      'terrible parent',
      'horrible person',
      'piece of shit',
      'such an idiot',
      'fucking stupid',
      'you\'re pathetic',
      'you\'re worthless',
      'you\'re disgusting',
      'i hate you',
      'fuck you',
    ],
    severity: 'critical'
  },
  {
    id: 3,
    name: 'Using Children as Weapons',
    category: 'abuse',
    description: 'Weaponizing children',
    indicators: [
      'kids don\'t want to see you',
      'kids hate going to your',
      'doesn\'t want to be with you',
      'kids are scared of you',
      'tell your mother',
      'tell your father',
      'your mother is',
      'your father is',
      'don\'t tell your mom',
      'don\'t tell your dad',
      'stealing my parenting time',
      'keeping the kids from me',
    ],
    severity: 'critical'
  },
  {
    id: 4,
    name: 'False Accusations',
    category: 'manipulation',
    description: 'Unfounded serious claims',
    indicators: [
      'you\'re abusing',
      'you\'re neglecting',
      'on drugs around the kids',
      'mentally unstable',
      'unfit to be a parent',
      'dangerous to the children',
      'kids aren\'t safe with you',
      'not following court orders',
      'violating the court order',
    ],
    severity: 'critical'
  },
  {
    id: 5,
    name: 'Gaslighting',
    category: 'manipulation',
    description: 'Denying reality',
    indicators: [
      'that never happened',
      'you\'re imagining things',
      'you\'re crazy',
      'you\'re making things up',
      'losing your mind',
      'you\'re delusional',
    ],
    severity: 'high'
  },
  {
    id: 6,
    name: 'Intimidation',
    category: 'abuse',
    description: 'Creating fear',
    indicators: [
      'you know what i\'m capable of',
      'this is your last warning',
      'don\'t test me',
      'you don\'t want to find out',
      'playing with fire',
      'remember what happened last time',
      'no accountability',
      'give me the middle finger',
    ],
    severity: 'high'
  },
  {
    id: 7,
    name: 'Legal Threats',
    category: 'legal',
    description: 'Weaponizing courts',
    indicators: [
      'take you back to court',
      'lawyer will destroy',
      'held in contempt',
      'get full custody',
      'report you to cps',
      'in violation of the court',
    ],
    severity: 'high'
  },
  {
    id: 8,
    name: 'Blame-Shifting',
    category: 'manipulation',
    description: 'Deflecting responsibility',
    indicators: [
      'this is all your fault',
      'you made me do this',
      'look what you made me',
      'you only have yourself to blame',
      'you caused all of this',
    ],
    severity: 'medium'
  },
];

export interface PatternMatch {
  patternId: number;
  patternName: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  matchedIndicator: string;
  matchedText: string;
  confidence: number;
}

export interface AnalyzedMessage {
  id: string;
  text: string;
  sender: 'user' | 'coparent' | string;
  timestamp: Date;
  content?: string;
  date?: Date;
  senderName?: string;
  isEdited?: boolean;
  editedAt?: Date;
  replyTo?: string;
  attachments?: string[];
  patterns: PatternMatch[];
  severityScore: number;
  isEvidence: boolean;
  evidenceNotes?: string;
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

function getText(msg: any): string {
  return msg.text || msg.content || '';
}

function getTimestamp(msg: any): Date {
  return msg.timestamp || msg.date || new Date();
}

function getSender(msg: any): string {
  return msg.sender || 'unknown';
}

export function analyzeMessage(message: any): AnalyzedMessage {
  const patterns: PatternMatch[] = [];
  const sender = getSender(message);
  const text = getText(message);
  const timestamp = getTimestamp(message);
  
  // Skip user's own messages (check for 'user' or 'me' or 'You')
  const senderLower = sender.toLowerCase();
  if (senderLower === 'user' || senderLower === 'me' || senderLower === 'you') {
    return {
      ...message,
      id: message.id || `msg-${Date.now()}-${Math.random()}`,
      text,
      sender,
      timestamp,
      patterns: [],
      severityScore: 0,
      isEvidence: false
    };
  }

  // Skip short messages - can't contain meaningful patterns
  if (text.length < 15) {
    return {
      ...message,
      id: message.id || `msg-${Date.now()}-${Math.random()}`,
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
      // Must be at least 12 chars to match
      if (indicator.length < 12) continue;
      
      if (textLower.includes(indicator.toLowerCase())) {
        patterns.push({
          patternId: pattern.id,
          patternName: pattern.name,
          category: pattern.category,
          severity: pattern.severity,
          matchedIndicator: indicator,
          matchedText: extractContext(text, indicator),
          confidence: 0.9
        });
        break; // One match per pattern type
      }
    }
  }

  const severityScore = calculateSeverityScore(patterns);
  const isEvidence = patterns.length > 0;

  return {
    ...message,
    id: message.id || `msg-${Date.now()}-${Math.random()}`,
    text,
    sender,
    timestamp,
    patterns,
    severityScore,
    isEvidence,
    evidenceNotes: isEvidence ? patterns.map(p => p.patternName).join(', ') : undefined
  };
}

export function analyzeBulk(messages: any[]): BulkAnalysisResult {
  const analyzedMessages = messages.map(analyzeMessage);
  
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
  
  for (const msg of messagesWithPatterns) {
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

  const topPatterns = Object.entries(patternBreakdown)
    .map(([name, count]) => {
      const pattern = PATTERNS.find(p => p.name === name)!;
      const examples = messagesWithPatterns
        .filter(m => m.patterns.some(p => p.patternName === name))
        .slice(0, 3)
        .map(m => getText(m).substring(0, 100));
      return { pattern, count, examples };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const timelineMap: Record<string, { severity: number; count: number }> = {};
  for (const msg of messagesWithPatterns) {
    const dateKey = getTimestamp(msg).toISOString().split('T')[0];
    if (!timelineMap[dateKey]) {
      timelineMap[dateKey] = { severity: 0, count: 0 };
    }
    timelineMap[dateKey].severity += msg.severityScore;
    timelineMap[dateKey].count += msg.patterns.length;
  }
  
  const timeline = Object.entries(timelineMap)
    .map(([date, data]) => ({ date, severity: data.severity, patternCount: data.count }))
    .sort((a, b) => a.date.localeCompare(b.date));

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

  const courtReadyNotes: string[] = [];
  if (messagesWithPatterns.length === 0) {
    courtReadyNotes.push('No abuse patterns detected in this batch.');
  } else {
    courtReadyNotes.push(`Found ${messagesWithPatterns.length} messages with patterns.`);
  }

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
      averageSeverity: messagesWithPatterns.length > 0 
        ? totalSeverity / messagesWithPatterns.length 
        : 0,
      highSeverityCount,
      criticalCount,
      dateRange
    },
    topPatterns,
    timeline,
    courtReady: messagesWithPatterns.length >= 3,
    courtReadyNotes
  };
}

function extractContext(text: string, indicator: string): string {
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(indicator.toLowerCase());
  if (index === -1) return text.substring(0, 100);
  
  const start = Math.max(0, index - 10);
  const end = Math.min(text.length, index + indicator.length + 10);
  
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
    score += severityValues[pattern.severity];
  }
  return Math.min(score, 10);
}