/**
 * Pattern Detection Integration
 * Analyzes parsed messages against coercive control patterns
 * 
 * EXPANDED VERSION - 3-4x more indicators per pattern for better detection
 */

// ============================================
// BASE MESSAGE TYPE (flexible to handle different sources)
// ============================================

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

// ============================================
// PATTERN DEFINITIONS - EXPANDED INDICATORS
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
    name: 'Gaslighting',
    category: 'manipulation',
    description: 'Making someone question their own reality or memory',
    indicators: [
      // Direct denial
      'that never happened',
      'that didn\'t happen',
      'never said that',
      'i never said',
      'never did that',
      'i didn\'t say',
      'didn\'t happen',
      'not what happened',
      'not how it happened',
      // Memory attacks
      'you\'re imagining',
      'imagining things',
      'you\'re remembering wrong',
      'remember it wrong',
      'your memory',
      'bad memory',
      'you forgot',
      'you\'re confused',
      'you\'re mistaken',
      'misremember',
      // Reality denial
      'you\'re crazy',
      'you\'re insane',
      'losing your mind',
      'you\'re delusional',
      'making things up',
      'making stuff up',
      'that\'s not true',
      'not true at all',
      'complete lie',
      'total lie',
      'you\'re lying',
      'you misunderstood',
      'you misheard',
      'you took it wrong',
      'twisting my words',
      'putting words in my mouth',
      // Perception attacks
      'nobody said that',
      'no one said',
      'i would never',
      'you know that\'s not',
      'we both know',
      'you know better',
      'that\'s ridiculous',
      'that\'s absurd'
    ],
    severity: 'critical'
  },
  {
    id: 2,
    name: 'DARVO',
    category: 'manipulation',
    description: 'Deny, Attack, Reverse Victim and Offender',
    indicators: [
      // Blame reversal
      'you\'re the problem',
      'you\'re the one',
      'you started this',
      'you caused this',
      'your fault',
      'this is on you',
      'you did this',
      'you made me',
      'because of you',
      'thanks to you',
      'you brought this on',
      // Attack phrases
      'you\'re being unreasonable',
      'you\'re impossible',
      'you\'re difficult',
      'so difficult',
      'impossible to deal with',
      'can\'t talk to you',
      'no reasoning with you',
      // Victim reversal
      'after everything i\'ve done',
      'after all i do',
      'i\'m the victim here',
      'you\'re hurting me',
      'you\'re punishing me',
      'doing this to me',
      'what you\'re doing to me',
      'how you treat me',
      'how could you do this',
      'knife in my back',
      'stabbed me',
      'betrayed',
      // Counter-accusations
      'you\'re the abuser',
      'you\'re the manipulator',
      'you manipulated',
      'you\'re controlling',
      'you\'re toxic',
      'you\'re the narcissist',
      'you\'re trying to',
      'you always play victim'
    ],
    severity: 'high'
  },
  {
    id: 3,
    name: 'Legal/Court Threats',
    category: 'legal',
    description: 'Using threats of court action to intimidate or control',
    indicators: [
      // Direct legal threats
      'take you to court',
      'see you in court',
      'going to court',
      'file a motion',
      'file against you',
      'petition the court',
      'talk to my lawyer',
      'call my lawyer',
      'my attorney',
      'lawyer will',
      'attorney will',
      'legal action',
      'sue you',
      'i\'ll sue',
      // Court order references
      'court order',
      'court will',
      'judge will',
      'contempt',
      'held in contempt',
      'violating the order',
      'violation of',
      // Financial legal threats
      'attorney\'s fees',
      'legal fees',
      'pay for my lawyer',
      'monetary award',
      'damages',
      // Custody threats
      'full custody',
      'sole custody',
      'take the kids',
      'lose custody',
      'custody modification',
      'emergency custody',
      'supervised visitation',
      // General legal intimidation
      'documented',
      'documenting this',
      'on record',
      'evidence against you',
      'use this against you',
      'get this resolved',
      'handle this legally'
    ],
    severity: 'high'
  },
  {
    id: 4,
    name: 'Financial Manipulation',
    category: 'control',
    description: 'Using money or financial threats to control or punish',
    indicators: [
      // Withholding/refusing
      'can\'t afford',
      'won\'t pay',
      'not paying',
      'refuse to pay',
      'don\'t have the money',
      'not my responsibility',
      'that\'s on you',
      'your problem',
      'figure it out yourself',
      // Demands
      'you owe me',
      'owe me money',
      'pay me back',
      'need to be reimbursed',
      'reimburse me',
      'your bill',
      'foot the bill',
      'pay for it',
      'pay your share',
      'what do i owe',
      // Accusations
      'you\'re greedy',
      'money hungry',
      'all about money',
      'just want my money',
      'using me for money',
      'gold digger',
      // Support manipulation
      'child support',
      'support payment',
      'won\'t get a dime',
      'cut you off',
      'financially',
      // Tracking/controlling
      'every penny',
      'account for',
      'receipts',
      'prove you spent',
      'where did the money'
    ],
    severity: 'high'
  },
  {
    id: 5,
    name: 'Triangulating Child',
    category: 'abuse',
    description: 'Putting the child in the middle or using them as a messenger',
    indicators: [
      // Using child as messenger
      'tell your mother',
      'tell your father',
      'tell your mom',
      'tell your dad',
      'ask your mother',
      'ask your father',
      'tell him i said',
      'tell her i said',
      // Child preferences
      'he said he wants',
      'she said she wants',
      'he doesn\'t want to',
      'she doesn\'t want to',
      'let him decide',
      'let her decide',
      'his decision',
      'her decision',
      'ask your son',
      'ask your daughter',
      'child agrees with me',
      'kids want to',
      'kids don\'t want',
      // Talking to/through child
      'talked to the kids',
      'told the kids',
      'kids told me',
      'he told me that you',
      'she told me that you',
      'according to the kids',
      // Making child choose
      'make him choose',
      'which parent',
      'choose between us',
      'where he wants to live',
      'who he wants to be with',
      // Alienating
      'doesn\'t love you',
      'scared of you',
      'afraid of you',
      'doesn\'t want to see you',
      'cries when',
      'hates going to your'
    ],
    severity: 'critical'
  },
  {
    id: 6,
    name: 'Name-Calling/Verbal Abuse',
    category: 'abuse',
    description: 'Direct insults or demeaning language',
    indicators: [
      // Direct insults
      'bitch',
      'asshole',
      'bastard',
      'stupid',
      'idiot',
      'moron',
      'dumb',
      'pathetic',
      'loser',
      'worthless',
      'piece of shit',
      'piece of crap',
      'fucked up',
      'fuck you',
      'go to hell',
      'screw you',
      // Parenting attacks
      'terrible mother',
      'terrible father',
      'bad mother',
      'bad father',
      'worst mother',
      'worst father',
      'horrible parent',
      'unfit parent',
      'deadbeat',
      // Mental health attacks
      'crazy',
      'insane',
      'psycho',
      'mental',
      'unstable',
      'bipolar',
      'borderline',
      'narcissist',
      // Character attacks
      'disgusting',
      'vile',
      'evil',
      'monster',
      'trash',
      'garbage',
      'joke',
      'embarrassment',
      'disappointment'
    ],
    severity: 'critical'
  },
  {
    id: 7,
    name: 'Emotional Blackmail',
    category: 'manipulation',
    description: 'Using guilt, fear, or obligation to control',
    indicators: [
      // Guilt trips
      'if you loved',
      'if you cared',
      'if you were a good',
      'a real mother would',
      'a real father would',
      'any decent parent',
      'how could you',
      'can\'t believe you would',
      'after all i\'ve done',
      'everything i\'ve sacrificed',
      'i gave up everything',
      // Emotional pressure
      'breaks my heart',
      'breaking my heart',
      'you\'re killing me',
      'destroying me',
      'tearing me apart',
      'hurting the kids',
      'think about what you\'re doing',
      'think of the children',
      'for the kids',
      'do it for',
      // Fear/threat
      'you\'ll regret',
      'you\'ll be sorry',
      'live with yourself',
      'on your conscience',
      'your choice',
      'remember this moment',
      // Obligation
      'you owe me',
      'owe it to',
      'the least you could do',
      'after everything',
      'i deserve',
      'promised me'
    ],
    severity: 'high'
  },
  {
    id: 8,
    name: 'Stonewalling',
    category: 'control',
    description: 'Refusing to communicate or engage',
    indicators: [
      // Direct refusals
      'not discussing this',
      'not talking about this',
      'nothing to discuss',
      'conversation over',
      'end of discussion',
      'done talking',
      'not responding',
      'won\'t respond',
      'don\'t contact me',
      'stop messaging',
      'stop texting',
      'leave me alone',
      // Dismissals
      'that doesn\'t work',
      'doesn\'t work for me',
      'i don\'t agree',
      'not going to happen',
      'not happening',
      'that\'s not how it works',
      'simple as that',
      'my way or',
      'take it or leave it',
      'i\'ve made my decision',
      'decision is final',
      'not up for debate',
      'not negotiable',
      // Ignoring
      'i\'ll handle it',
      'don\'t worry about it',
      'none of your concern',
      'not your business',
      'stay out of it',
      'butt out',
      'back off'
    ],
    severity: 'medium'
  },
  {
    id: 9,
    name: 'False Accusations',
    category: 'manipulation',
    description: 'Making unfounded claims about behavior or character',
    indicators: [
      // Addiction accusations
      'drinking problem',
      'drug problem',
      'alcoholic',
      'addict',
      'substance abuse',
      'gambling addiction',
      'on drugs',
      'you were drunk',
      'you were high',
      // Abuse accusations
      'you\'re abusive',
      'you abuse',
      'you hit',
      'you hurt',
      'physically abusive',
      'emotionally abusive',
      // Neglect accusations
      'you neglect',
      'neglecting the kids',
      'don\'t take care of',
      'unfit',
      'endangering',
      'put them at risk',
      // Character accusations
      'liar',
      'you\'re lying',
      'always lie',
      'pathological liar',
      'can\'t trust you',
      'scam',
      'fraud',
      'cheater',
      // Absolute statements
      'you always',
      'you never',
      'every time',
      'constantly',
      'all the time'
    ],
    severity: 'high'
  },
  {
    id: 10,
    name: 'Minimizing/Mocking',
    category: 'abuse',
    description: 'Belittling concerns, experiences, or conditions',
    indicators: [
      // Minimizing
      'not a big deal',
      'no big deal',
      'not that bad',
      'overreacting',
      'over-reacting',
      'so dramatic',
      'drama queen',
      'you\'re fine',
      'get over it',
      'move on',
      'let it go',
      'grow up',
      'stop whining',
      'stop complaining',
      // Mocking
      'oh please',
      'give me a break',
      'cry me a river',
      'boo hoo',
      'poor you',
      'playing victim',
      'victim card',
      'so sensitive',
      'too sensitive',
      'thin skinned',
      'can\'t take a joke',
      // Dismissing concerns
      'doesn\'t matter',
      'who cares',
      'so what',
      'whatever',
      'sure jan',
      'yeah right',
      'not a real',
      'fake',
      'made up'
    ],
    severity: 'medium'
  },
  {
    id: 11,
    name: 'Schedule Manipulation',
    category: 'control',
    description: 'Unilaterally changing or refusing to follow schedules',
    indicators: [
      // Withholding
      'keeping him',
      'keeping her',
      'keeping the kids',
      'not exchanging',
      'not bringing',
      'not dropping off',
      'won\'t return',
      'not coming back',
      'staying with me',
      // Unilateral changes
      'change of plans',
      'plans changed',
      'i decided',
      'i\'ll decide when',
      'when i say so',
      'on my schedule',
      'my time now',
      'not your time',
      'not your day',
      'not your weekend',
      // Control
      'not giving back',
      'pick up early',
      'drop off late',
      'different time',
      'won\'t work',
      'can\'t do that time',
      'find someone else',
      'make arrangements',
      // Interference
      'busy that day',
      'we have plans',
      'something came up',
      'can\'t make it',
      'running late',
      'be there when i get there'
    ],
    severity: 'high'
  },
  {
    id: 12,
    name: 'Threats',
    category: 'abuse',
    description: 'Direct or veiled threats of harm or negative consequences',
    indicators: [
      // Direct threats
      'you\'ll regret this',
      'you\'ll be sorry',
      'you\'ll pay for this',
      'watch your back',
      'be careful',
      'watch out',
      'warning you',
      'i\'m warning',
      'don\'t test me',
      'don\'t push me',
      'don\'t mess with me',
      // Consequence threats
      'consequences',
      'suffer the consequences',
      'you asked for this',
      'brought this on yourself',
      'your funeral',
      'on your head',
      'mark my words',
      'remember this',
      // Reputation threats
      'everyone will know',
      'tell everyone',
      'expose you',
      'ruin you',
      'destroy you',
      'make sure people know',
      'your reputation',
      // Relationship threats
      'never see the kids',
      'take them away',
      'you\'ll lose them',
      'turn them against you',
      'won\'t have a relationship',
      'disown',
      'dead to me'
    ],
    severity: 'critical'
  },
  {
    id: 13,
    name: 'Surveillance/Monitoring',
    category: 'control',
    description: 'Excessive tracking or monitoring behavior',
    indicators: [
      // Location tracking
      'i know where you',
      'know where you are',
      'i saw you at',
      'saw you there',
      'tracking you',
      'find my',
      'location',
      'gps',
      'where were you',
      'where are you',
      // Checking up
      'checking up',
      'keeping tabs',
      'watching you',
      'eyes on you',
      'people tell me',
      'heard you were',
      'someone saw you',
      'little birdie',
      // Social media
      'saw your post',
      'your facebook',
      'your instagram',
      'who is that',
      'who were you with',
      'new boyfriend',
      'new girlfriend',
      // Communications
      'read your messages',
      'your texts',
      'your emails',
      'know what you said',
      'who are you talking to',
      'who called you'
    ],
    severity: 'high'
  },
  {
    id: 14,
    name: 'Information Gatekeeping',
    category: 'control',
    description: 'Withholding or controlling access to information',
    indicators: [
      // Direct withholding
      'none of your business',
      'not your business',
      'don\'t need to know',
      'doesn\'t concern you',
      'not your concern',
      'stay out of it',
      'butt out',
      'mind your own',
      // Control
      'i\'ll handle it',
      'i\'ll take care of it',
      'don\'t worry about it',
      'leave it to me',
      'my decision',
      'i decide',
      // School/medical gatekeeping
      'don\'t need your input',
      'already decided',
      'already handled',
      'taken care of',
      'made the appointment',
      'cancelled the appointment',
      'changed doctors',
      'new school'
    ],
    severity: 'medium'
  },
  {
    id: 15,
    name: 'Blame-Shifting',
    category: 'manipulation',
    description: 'Refusing to accept responsibility, deflecting to others',
    indicators: [
      // Direct blame shifts
      'your fault',
      'you caused',
      'you made this happen',
      'because of you',
      'if you hadn\'t',
      'if you didn\'t',
      'you started',
      'you\'re the reason',
      'this is on you',
      // Deflection
      'not my fault',
      'not my problem',
      'don\'t blame me',
      'nothing to do with me',
      'i didn\'t do anything',
      'what did i do',
      'i\'m not the one',
      // Counter-blame
      'look at yourself',
      'look in the mirror',
      'you should talk',
      'that\'s rich coming from you',
      'pot calling kettle',
      'you\'re one to talk',
      // Weaponizing flexibility
      'did you a favor',
      'was being nice',
      'tried to help',
      'this is what i get',
      'every time i help',
      'remember when i'
    ],
    severity: 'medium'
  },
  {
    id: 16,
    name: 'Intimidation',
    category: 'abuse',
    description: 'Creating fear through words or implied actions',
    indicators: [
      // Aggressive tone
      'don\'t test me',
      'don\'t push me',
      'don\'t make me',
      'you don\'t want to',
      'wouldn\'t do that if i were you',
      'bad idea',
      'big mistake',
      'huge mistake',
      // Implied threats
      'you know what happens',
      'you know what i\'m capable of',
      'you\'ve seen what i can do',
      'i always win',
      'never lost',
      'i will win',
      'you can\'t beat me',
      // Urgency/pressure
      'need to know now',
      'decide now',
      'today',
      'right now',
      'immediately',
      'last chance',
      'final offer',
      'won\'t ask again',
      'running out of time',
      'before it\'s too late',
      // Power statements
      'i\'m in charge',
      'i\'m the parent',
      'my house my rules',
      'what i say goes',
      'i make the decisions'
    ],
    severity: 'high'
  },
  {
    id: 17,
    name: 'Hoovering',
    category: 'manipulation',
    description: 'Attempting to suck you back in after conflict',
    indicators: [
      // Sudden niceness
      'i miss you',
      'miss the family',
      'miss us',
      'we were good together',
      'remember when',
      'the good times',
      'think about the kids',
      'for the family',
      // False promises
      'i\'ve changed',
      'i\'m different now',
      'give me another chance',
      'one more chance',
      'things will be different',
      'i promise',
      'swear to you',
      'it won\'t happen again',
      'learned my lesson',
      // Love bombing
      'i still love you',
      'always loved you',
      'you\'re the one',
      'no one else',
      'meant to be',
      'soulmates',
      // Guilt hoovering
      'don\'t give up on us',
      'don\'t throw this away',
      'think of what we had',
      'the kids need us together'
    ],
    severity: 'medium'
  },
  {
    id: 18,
    name: 'Word Salad',
    category: 'manipulation',
    description: 'Circular, confusing communication designed to exhaust',
    indicators: [
      // Topic shifting
      'that\'s not the point',
      'not what we\'re talking about',
      'changing the subject',
      'but what about',
      'and another thing',
      'while we\'re at it',
      'speaking of which',
      // Circular logic
      'i already told you',
      'already explained',
      'how many times',
      'we\'ve been over this',
      'round and round',
      'talking in circles',
      'not going to keep',
      // Confusion tactics
      'you\'re not listening',
      'not understanding',
      'missing the point',
      'you don\'t get it',
      'let me explain again',
      'clearly you don\'t',
      // Exhaustion phrases
      'i\'m done explaining',
      'can\'t keep doing this',
      'exhausting',
      'draining',
      'waste of time',
      'pointless'
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

  const severityScore = calculateSeverityScore(patterns);
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

function calculateConfidence(indicator: string, fullText: string): number {
  const lengthFactor = Math.min(indicator.length / 20, 1);
  const isPhrase = indicator.includes(' ') ? 0.2 : 0;
  
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