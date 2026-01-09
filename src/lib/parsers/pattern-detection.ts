/**
 * Pattern Detection - CONSERVATIVE VERSION
 * 
 * CRITICAL PRINCIPLE: Better to miss abuse than flag normal conversation.
 * False positives destroy court credibility.
 * 
 * Rules:
 * 1. Indicators must be 4+ words OR very specific phrases
 * 2. Only match coparent messages
 * 3. Context matters - generic phrases don't match
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

// CONSERVATIVE PATTERNS - Long, specific phrases only
export const PATTERNS: Pattern[] = [
  {
    id: 1,
    name: 'Gaslighting',
    category: 'manipulation',
    description: 'Making someone question their own reality or memory',
    indicators: [
      'that never happened and you know it',
      'i never said that to you',
      'you\'re imagining things again',
      'you\'re making things up again',
      'you\'re crazy if you think',
      'you\'re losing your mind',
      'you\'re completely delusional',
      'you\'re remembering it wrong',
      'that\'s not what happened and you know it',
      'you\'re twisting my words again',
      'stop lying about what i said',
    ],
    severity: 'high'
  },
  {
    id: 2,
    name: 'DARVO',
    category: 'manipulation',
    description: 'Deny, Attack, Reverse Victim and Offender',
    indicators: [
      'you\'re the abusive one not me',
      'you\'re the one who started this',
      'i\'m the real victim here',
      'you\'re doing this to me on purpose',
      'look what you made me do',
      'this is all your fault not mine',
      'you brought this on yourself',
      'you\'re the problem not me',
      'after everything i\'ve done for you',
      'you\'re the manipulative one',
      'you\'re the narcissist not me',
    ],
    severity: 'high'
  },
  {
    id: 3,
    name: 'Threats',
    category: 'abuse',
    description: 'Direct threats of harm or negative consequences',
    indicators: [
      'you will regret this',
      'you\'re going to be sorry',
      'you\'ll pay for this',
      'i\'ll make sure you regret',
      'i\'ll destroy you',
      'i\'ll ruin your life',
      'i will ruin you',
      'watch your back',
      'you\'ll never see the kids again',
      'i\'ll take the kids from you',
      'you will lose custody',
      'i\'ll make your life hell',
      'i\'ll make your life miserable',
      'don\'t test me on this',
      'you don\'t want to mess with me',
    ],
    severity: 'critical'
  },
  {
    id: 4,
    name: 'Legal/Court Threats',
    category: 'legal',
    description: 'Using legal system to intimidate',
    indicators: [
      'i\'ll take you back to court',
      'see you in court then',
      'my lawyer will handle this',
      'my lawyer will be in touch',
      'i\'ll file a motion against you',
      'i\'ll have you held in contempt',
      'you\'ll pay my attorney fees',
      'i\'ll get full custody of',
      'i\'ll petition for sole custody',
      'i\'ll report you to cps',
      'i\'m calling my attorney about this',
      'you\'re in violation of the court order',
    ],
    severity: 'high'
  },
  {
    id: 5,
    name: 'Name-Calling/Verbal Abuse',
    category: 'abuse',
    description: 'Direct insults and demeaning language',
    indicators: [
      'you\'re a pathetic excuse',
      'you\'re completely worthless',
      'you\'re a terrible mother',
      'you\'re a terrible father',
      'you\'re a terrible parent',
      'you\'re a horrible person',
      'you\'re absolutely disgusting',
      'you piece of shit',
      'you\'re such an idiot',
      'you\'re so fucking stupid',
      'you\'re such a loser',
      'what a joke you are',
      'you make me sick',
      'i fucking hate you',
      'go to hell',
      'fuck you',
    ],
    severity: 'critical'
  },
  {
    id: 6,
    name: 'Using Children as Weapons',
    category: 'abuse',
    description: 'Manipulating through or about children',
    indicators: [
      'the kids don\'t want to see you anymore',
      'the kids hate going to your house',
      'the kids told me they don\'t want',
      'he doesn\'t want to be with you',
      'she doesn\'t want to be with you',
      'you\'re hurting the kids by',
      'the kids are scared of you',
      'tell your mother that she',
      'tell your father that he',
      'ask your mom why she',
      'ask your dad why he',
      'your mother is a terrible',
      'your father is a terrible',
      'don\'t tell your mom about',
      'don\'t tell your dad about',
      'the kids said they hate',
    ],
    severity: 'critical'
  },
  {
    id: 7,
    name: 'Financial Manipulation',
    category: 'control',
    description: 'Using money to control or punish',
    indicators: [
      'i\'m not paying for that anymore',
      'you\'re not getting a dime from me',
      'you\'re just after my money',
      'i\'ll cut you off financially',
      'good luck paying for that yourself',
      'you can\'t afford anything without me',
      'you\'re so greedy it\'s disgusting',
      'all you care about is my money',
      'figure it out yourself then',
      'that\'s your problem to pay for',
      'i refuse to pay another cent',
      'you\'ll have to pay for everything now',
    ],
    severity: 'high'
  },
  {
    id: 8,
    name: 'Intimidation',
    category: 'abuse',
    description: 'Creating fear through words',
    indicators: [
      'you know what i\'m capable of',
      'you\'ve seen what i can do',
      'you don\'t want to find out what happens',
      'bad things will happen if you',
      'you\'re playing with fire here',
      'this is your last warning',
      'i\'m warning you right now',
      'you better watch yourself',
      'don\'t make me do something',
      'you know what happens when you',
      'remember what happened last time you',
    ],
    severity: 'high'
  },
  {
    id: 9,
    name: 'Blame-Shifting',
    category: 'manipulation',
    description: 'Refusing responsibility, deflecting blame',
    indicators: [
      'this is all your fault',
      'you made me do this to you',
      'if you hadn\'t done that then',
      'you only have yourself to blame',
      'you caused all of this',
      'none of this would have happened if you',
      'you\'re the reason this happened',
      'this is because of what you did',
    ],
    severity: 'medium'
  },
  {
    id: 10,
    name: 'Stonewalling',
    category: 'control',
    description: 'Refusing to communicate about children',
    indicators: [
      'i\'m not discussing this with you anymore',
      'i\'m done talking to you about this',
      'don\'t contact me about this again',
      'stop texting me about this',
      'i won\'t respond to you anymore',
      'leave me alone about this',
      'this conversation is over',
      'i have nothing to say to you',
      'stop emailing me about',
      'i refuse to engage with you',
    ],
    severity: 'medium'
  },
  {
    id: 11,
    name: 'False Accusations',
    category: 'manipulation',
    description: 'Making unfounded serious claims',
    indicators: [
      'you\'re abusing the kids',
      'you\'re neglecting our children',
      'you\'re an alcoholic and everyone knows',
      'you\'re on drugs around the kids',
      'you\'re mentally unstable to parent',
      'you\'re unfit to be a parent',
      'you\'re dangerous to the children',
      'the kids aren\'t safe with you',
      'you\'re putting the kids at risk',
      'you\'re an abusive parent',
    ],
    severity: 'critical'
  },
  {
    id: 12,
    name: 'Minimizing/Mocking',
    category: 'abuse',
    description: 'Belittling concerns or mocking',
    indicators: [
      'you\'re overreacting as usual',
      'stop being so dramatic about everything',
      'you\'re such a drama queen',
      'cry me a river',
      'boo hoo poor you',
      'get over yourself already',
      'you\'re way too sensitive',
      'stop playing the victim all the time',
      'oh please give me a break',
    ],
    severity: 'medium'
  },
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

// ============================================
// HELPER FUNCTIONS
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
// CONSERVATIVE DETECTION ENGINE
// ============================================

export function analyzeMessage(message: any): AnalyzedMessage {
  const patterns: PatternMatch[] = [];
  const sender = getSender(message);
  const text = getText(message);
  const timestamp = getTimestamp(message);
  
  // ONLY analyze coparent messages - never flag user's own messages
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

  // Skip short messages - they can't contain meaningful patterns
  if (text.length < 20) {
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
      // CRITICAL: Skip short indicators - they cause false positives
      if (indicator.length < 15) {
        continue;
      }
      
      if (textLower.includes(indicator.toLowerCase())) {
        patterns.push({
          patternId: pattern.id,
          patternName: pattern.name,
          category: pattern.category,
          severity: pattern.severity,
          matchedIndicator: indicator,
          matchedText: extractContext(text, indicator),
          confidence: 0.9 // High confidence for long phrase matches
        });
        
        // Only match each pattern once per message
        break;
      }
    }
  }

  const severityScore = calculateSeverityScore(patterns);
  const isEvidence = patterns.length > 0;

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

function extractContext(text: string, indicator: string): string {
  const lowerText = text.toLowerCase();
  const index = lowerText.indexOf(indicator.toLowerCase());
  
  if (index === -1) return text.substring(0, 100);
  
  const start = Math.max(0, index - 20);
  const end = Math.min(text.length, index + indicator.length + 20);
  
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

function generateEvidenceNotes(patterns: PatternMatch[]): string {
  return patterns.map(p => p.patternName).join(', ');
}

function assessCourtReadiness(
  messages: AnalyzedMessage[], 
  notes: string[]
): boolean {
  const evidenceMessages = messages.filter(m => m.isEvidence);
  
  if (evidenceMessages.length === 0) {
    notes.push('No clear abuse patterns detected. This appears to be normal communication.');
    return false;
  }
  
  if (evidenceMessages.length < 3) {
    notes.push('Limited evidence found. Continue documenting to establish patterns.');
    return false;
  }
  
  notes.push(`Found ${evidenceMessages.length} messages with documented patterns.`);
  return true;
}