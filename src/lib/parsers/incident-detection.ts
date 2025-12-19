/**
 * Incident Detection Module
 * Clusters messages into discrete incidents based on time + topic
 * 
 * An incident = a specific dispute, conversation, or event
 * that can be documented as a unit for court purposes
 */

import { AnalyzedMessage, PatternMatch } from './pattern-detection';

// ============================================
// INCIDENT TYPES
// ============================================

export type IncidentCategory = 
  | 'holiday_scheduling'
  | 'regular_schedule'
  | 'exchange_conflict'
  | 'financial_dispute'
  | 'child_activities'
  | 'medical_decisions'
  | 'verbal_abuse'
  | 'legal_threats'
  | 'communication_breakdown'
  | 'other';

export interface Incident {
  id: string;
  title: string;
  category: IncidentCategory;
  
  // Timing
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  
  // Messages
  messages: AnalyzedMessage[];
  messageCount: number;
  coparentMessageCount: number;
  userMessageCount: number;
  
  // Pattern analysis
  patterns: PatternMatch[];
  uniquePatterns: string[];
  severityScore: number;
  maxSeverity: 'low' | 'medium' | 'high' | 'critical';
  
  // Evidence assessment
  isEvidence: boolean;
  evidenceStrength: 'weak' | 'moderate' | 'strong';
  courtReadyNotes: string[];
  
  // User refinement
  userTitle?: string;
  userCategory?: IncidentCategory;
  userNotes?: string;
  isManuallyEdited: boolean;
}

export interface IncidentDetectionResult {
  incidents: Incident[];
  summary: {
    totalIncidents: number;
    totalMessages: number;
    dateRange: { start: Date; end: Date } | null;
    categoryBreakdown: Record<IncidentCategory, number>;
    evidenceIncidents: number;
    strongEvidenceCount: number;
  };
  unclusteredMessages: AnalyzedMessage[];
}

// ============================================
// TOPIC KEYWORDS
// ============================================

const TOPIC_KEYWORDS: Record<IncidentCategory, string[]> = {
  holiday_scheduling: [
    'thanksgiving', 'christmas', 'xmas', 'new year', 'easter', 'holiday',
    'spring break', 'summer break', 'winter break', 'fall break',
    'memorial day', 'labor day', 'july 4', 'fourth of july',
    'birthday', 'halloween', 'vacation'
  ],
  regular_schedule: [
    'schedule', 'week on', 'week off', 'friday', 'pickup', 'drop off',
    'dropoff', 'pick up', 'exchange day', 'parenting time', 'custody',
    'rotation', 'switch', 'swap days', 'regular schedule'
  ],
  exchange_conflict: [
    'pick him up', 'drop him off', 'exchange', 'meet at', 'waiting',
    'late', 'no show', 'didn\'t show', 'where are you', 'on my way',
    'be there', 'running late', 'exchange location'
  ],
  financial_dispute: [
    'money', 'pay', 'paid', 'owe', 'cost', 'expense', 'bill', 'fee',
    'reimburse', 'split', '50/50', '60/40', 'child support', 'support',
    'afford', 'insurance', 'medical bill', 'tuition', 'registration'
  ],
  child_activities: [
    'practice', 'game', 'tournament', 'school', 'homework', 'grades',
    'teacher', 'coach', 'basketball', 'football', 'soccer', 'baseball',
    'band', 'music', 'lesson', 'activity', 'club', 'team', 'sports',
    'weight lifting', 'training', 'camp'
  ],
  medical_decisions: [
    'doctor', 'appointment', 'sick', 'medicine', 'prescription', 'therapy',
    'therapist', 'counselor', 'dentist', 'orthodontist', 'hospital',
    'emergency', 'health', 'medical', 'diagnosis', 'treatment'
  ],
  verbal_abuse: [
    'bitch', 'asshole', 'fuck', 'hate', 'stupid', 'crazy', 'insane',
    'pathetic', 'loser', 'terrible', 'worst', 'disgusting'
  ],
  legal_threats: [
    'court', 'lawyer', 'attorney', 'judge', 'petition', 'motion',
    'custody', 'order', 'contempt', 'legal', 'sue', 'filing'
  ],
  communication_breakdown: [
    'respond', 'answer', 'ignore', 'blocking', 'won\'t talk',
    'communicate', 'co-parent', 'coparent', 'difficult', 'impossible'
  ],
  other: []
};

const CATEGORY_DISPLAY_NAMES: Record<IncidentCategory, string> = {
  holiday_scheduling: 'Holiday/Vacation Scheduling',
  regular_schedule: 'Regular Schedule Dispute',
  exchange_conflict: 'Exchange Conflict',
  financial_dispute: 'Financial/Expenses',
  child_activities: 'Child Activities',
  medical_decisions: 'Medical Decisions',
  verbal_abuse: 'Verbal Abuse Episode',
  legal_threats: 'Legal Threats',
  communication_breakdown: 'Communication Breakdown',
  other: 'Other'
};

// ============================================
// INCIDENT DETECTION ENGINE
// ============================================

export function detectIncidents(
  messages: AnalyzedMessage[],
  options: {
    timeWindowHours?: number;
    minMessagesPerIncident?: number;
    splitOnTopicChange?: boolean;
  } = {}
): IncidentDetectionResult {
  const {
    timeWindowHours = 24,
    minMessagesPerIncident = 2,
    splitOnTopicChange = true
  } = options;

  // Sort messages by timestamp
  const sorted = [...messages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  if (sorted.length === 0) {
    return {
      incidents: [],
      summary: {
        totalIncidents: 0,
        totalMessages: 0,
        dateRange: null,
        categoryBreakdown: {} as Record<IncidentCategory, number>,
        evidenceIncidents: 0,
        strongEvidenceCount: 0
      },
      unclusteredMessages: []
    };
  }

  // Step 1: Initial time-based clustering
  const timeClusters = clusterByTime(sorted, timeWindowHours);

  // Step 2: Split clusters by topic if enabled
  const topicClusters = splitOnTopicChange 
    ? timeClusters.flatMap(cluster => splitByTopic(cluster))
    : timeClusters;

  // Step 3: Filter out tiny clusters
  const validClusters = topicClusters.filter(
    cluster => cluster.length >= minMessagesPerIncident
  );

  // Step 4: Convert clusters to incidents
  const incidents = validClusters.map((cluster, index) => 
    createIncident(cluster, index)
  );

  // Collect unclustered messages
  const clusteredIds = new Set(
    validClusters.flat().map(m => m.id)
  );
  const unclusteredMessages = sorted.filter(m => !clusteredIds.has(m.id));

  // Build summary
  const categoryBreakdown = {} as Record<IncidentCategory, number>;
  for (const incident of incidents) {
    categoryBreakdown[incident.category] = 
      (categoryBreakdown[incident.category] || 0) + 1;
  }

  const evidenceIncidents = incidents.filter(i => i.isEvidence);
  const strongEvidenceCount = incidents.filter(
    i => i.evidenceStrength === 'strong'
  ).length;

  return {
    incidents,
    summary: {
      totalIncidents: incidents.length,
      totalMessages: sorted.length,
      dateRange: sorted.length > 0 ? {
        start: sorted[0].timestamp,
        end: sorted[sorted.length - 1].timestamp
      } : null,
      categoryBreakdown,
      evidenceIncidents: evidenceIncidents.length,
      strongEvidenceCount
    },
    unclusteredMessages
  };
}

// ============================================
// CLUSTERING FUNCTIONS
// ============================================

function clusterByTime(
  messages: AnalyzedMessage[], 
  windowHours: number
): AnalyzedMessage[][] {
  const windowMs = windowHours * 60 * 60 * 1000;
  const clusters: AnalyzedMessage[][] = [];
  let currentCluster: AnalyzedMessage[] = [];

  for (const message of messages) {
    if (currentCluster.length === 0) {
      currentCluster.push(message);
      continue;
    }

    const lastMessage = currentCluster[currentCluster.length - 1];
    const timeDiff = message.timestamp.getTime() - lastMessage.timestamp.getTime();

    if (timeDiff <= windowMs) {
      currentCluster.push(message);
    } else {
      clusters.push(currentCluster);
      currentCluster = [message];
    }
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  return clusters;
}

function splitByTopic(messages: AnalyzedMessage[]): AnalyzedMessage[][] {
  if (messages.length <= 3) {
    return [messages];
  }

  // Detect primary topic for the cluster
  const primaryTopic = detectPrimaryTopic(messages);
  
  // Look for significant topic shifts
  const clusters: AnalyzedMessage[][] = [];
  let currentCluster: AnalyzedMessage[] = [];
  let currentTopic = primaryTopic;

  for (const message of messages) {
    const messageTopic = detectMessageTopic(message);
    
    // If topic shifts significantly and we have enough messages
    if (messageTopic !== currentTopic && 
        messageTopic !== 'other' && 
        currentCluster.length >= 3) {
      clusters.push(currentCluster);
      currentCluster = [message];
      currentTopic = messageTopic;
    } else {
      currentCluster.push(message);
    }
  }

  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  return clusters;
}

function detectPrimaryTopic(messages: AnalyzedMessage[]): IncidentCategory {
  const topicScores: Record<IncidentCategory, number> = {
    holiday_scheduling: 0,
    regular_schedule: 0,
    exchange_conflict: 0,
    financial_dispute: 0,
    child_activities: 0,
    medical_decisions: 0,
    verbal_abuse: 0,
    legal_threats: 0,
    communication_breakdown: 0,
    other: 0
  };

  const allText = messages.map(m => m.text).join(' ').toLowerCase();

  for (const [category, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    for (const keyword of keywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = allText.match(regex);
      if (matches) {
        topicScores[category as IncidentCategory] += matches.length;
      }
    }
  }

  // Also consider detected patterns
  for (const message of messages) {
    for (const pattern of message.patterns) {
      if (pattern.patternName === 'Name-Calling/Verbal Abuse') {
        topicScores.verbal_abuse += 3;
      }
      if (pattern.patternName === 'Legal/Court Threats') {
        topicScores.legal_threats += 3;
      }
      if (pattern.patternName === 'Financial Manipulation') {
        topicScores.financial_dispute += 2;
      }
    }
  }

  // Find highest scoring category
  let maxScore = 0;
  let primaryTopic: IncidentCategory = 'other';

  for (const [category, score] of Object.entries(topicScores)) {
    if (score > maxScore) {
      maxScore = score;
      primaryTopic = category as IncidentCategory;
    }
  }

  return primaryTopic;
}

function detectMessageTopic(message: AnalyzedMessage): IncidentCategory {
  const textLower = message.text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    for (const keyword of keywords) {
      if (textLower.includes(keyword)) {
        return category as IncidentCategory;
      }
    }
  }

  return 'other';
}

// ============================================
// INCIDENT CREATION
// ============================================

function createIncident(
  messages: AnalyzedMessage[], 
  index: number
): Incident {
  const sorted = [...messages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  const startTime = sorted[0].timestamp;
  const endTime = sorted[sorted.length - 1].timestamp;
  const durationMinutes = Math.round(
    (endTime.getTime() - startTime.getTime()) / (1000 * 60)
  );

  // Collect all patterns
  const allPatterns = sorted.flatMap(m => m.patterns);
  const uniquePatterns = [...new Set(allPatterns.map(p => p.patternName))];

  // Calculate severity
  const severityValues = { low: 1, medium: 2, high: 3, critical: 4 };
  let maxSeverityValue = 0;
  let totalSeverity = 0;

  for (const pattern of allPatterns) {
    const value = severityValues[pattern.severity];
    totalSeverity += value;
    if (value > maxSeverityValue) {
      maxSeverityValue = value;
    }
  }

  const maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 
    maxSeverityValue >= 4 ? 'critical' :
    maxSeverityValue >= 3 ? 'high' :
    maxSeverityValue >= 2 ? 'medium' : 'low';

  const severityScore = allPatterns.length > 0 
    ? Math.min(10, totalSeverity / allPatterns.length * 2)
    : 0;

  // Detect category
  const category = detectPrimaryTopic(messages);

  // Generate title
  const title = generateIncidentTitle(category, startTime, messages);

  // Assess evidence strength
  const { isEvidence, evidenceStrength, courtReadyNotes } = 
    assessEvidenceStrength(messages, allPatterns, durationMinutes);

  return {
    id: `incident-${index}-${startTime.getTime()}`,
    title,
    category,
    startTime,
    endTime,
    durationMinutes,
    messages: sorted,
    messageCount: sorted.length,
    coparentMessageCount: sorted.filter(m => m.sender === 'coparent').length,
    userMessageCount: sorted.filter(m => m.sender === 'user').length,
    patterns: allPatterns,
    uniquePatterns,
    severityScore: Math.round(severityScore * 10) / 10,
    maxSeverity,
    isEvidence,
    evidenceStrength,
    courtReadyNotes,
    isManuallyEdited: false
  };
}

function generateIncidentTitle(
  category: IncidentCategory,
  date: Date,
  messages: AnalyzedMessage[]
): string {
  const dateStr = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });

  // Try to extract specific topic from messages
  const allText = messages.map(m => m.text).join(' ').toLowerCase();

  // Check for specific holidays
  if (category === 'holiday_scheduling') {
    if (allText.includes('thanksgiving')) return `Thanksgiving ${date.getFullYear()} Dispute`;
    if (allText.includes('christmas') || allText.includes('xmas')) return `Christmas ${date.getFullYear()} Dispute`;
    if (allText.includes('new year')) return `New Year's ${date.getFullYear()} Dispute`;
    if (allText.includes('spring break')) return `Spring Break ${date.getFullYear()} Dispute`;
    if (allText.includes('summer')) return `Summer ${date.getFullYear()} Scheduling`;
    return `Holiday Scheduling - ${dateStr}`;
  }

  // Default to category name + date
  return `${CATEGORY_DISPLAY_NAMES[category]} - ${dateStr}`;
}

function assessEvidenceStrength(
  messages: AnalyzedMessage[],
  patterns: PatternMatch[],
  durationMinutes: number
): {
  isEvidence: boolean;
  evidenceStrength: 'weak' | 'moderate' | 'strong';
  courtReadyNotes: string[];
} {
  const notes: string[] = [];
  let strengthScore = 0;

  // Check for high/critical patterns
  const criticalPatterns = patterns.filter(p => p.severity === 'critical');
  const highPatterns = patterns.filter(p => p.severity === 'high');

  if (criticalPatterns.length > 0) {
    strengthScore += 3;
    notes.push(`${criticalPatterns.length} critical severity pattern(s) detected`);
  }

  if (highPatterns.length > 0) {
    strengthScore += 2;
    notes.push(`${highPatterns.length} high severity pattern(s) detected`);
  }

  // Check message count (more = better documentation)
  if (messages.length >= 10) {
    strengthScore += 2;
    notes.push('Extended exchange well-documented');
  } else if (messages.length >= 5) {
    strengthScore += 1;
  }

  // Check for pattern variety (multiple types = stronger case)
  const uniquePatternCount = new Set(patterns.map(p => p.patternName)).size;
  if (uniquePatternCount >= 3) {
    strengthScore += 2;
    notes.push(`Multiple pattern types identified (${uniquePatternCount})`);
  }

  // Check duration (sustained conflict vs quick exchange)
  if (durationMinutes >= 60) {
    strengthScore += 1;
    notes.push('Sustained conflict over extended period');
  }

  // Check if user responses are calm/appropriate
  const userMessages = messages.filter(m => m.sender === 'user');
  const userHasPatterns = userMessages.some(m => m.patterns.length > 0);
  if (!userHasPatterns && userMessages.length > 0) {
    strengthScore += 1;
    notes.push('User maintained appropriate communication');
  }

  const isEvidence = strengthScore >= 2 || patterns.length > 0;
  const evidenceStrength: 'weak' | 'moderate' | 'strong' = 
    strengthScore >= 5 ? 'strong' :
    strengthScore >= 3 ? 'moderate' : 'weak';

  if (evidenceStrength === 'weak' && isEvidence) {
    notes.push('Consider documenting additional incidents to strengthen case');
  }

  return { isEvidence, evidenceStrength, courtReadyNotes: notes };
}

// ============================================
// INCIDENT MANAGEMENT
// ============================================

export function mergeIncidents(
  incidents: Incident[], 
  ids: string[]
): Incident {
  const toMerge = incidents.filter(i => ids.includes(i.id));
  if (toMerge.length === 0) {
    throw new Error('No incidents found with provided IDs');
  }

  const allMessages = toMerge.flatMap(i => i.messages);
  return createIncident(allMessages, Date.now());
}

export function splitIncident(
  incident: Incident, 
  splitAtMessageId: string
): [Incident, Incident] {
  const splitIndex = incident.messages.findIndex(m => m.id === splitAtMessageId);
  if (splitIndex === -1 || splitIndex === 0) {
    throw new Error('Invalid split point');
  }

  const firstHalf = incident.messages.slice(0, splitIndex);
  const secondHalf = incident.messages.slice(splitIndex);

  return [
    createIncident(firstHalf, Date.now()),
    createIncident(secondHalf, Date.now() + 1)
  ];
}

export function updateIncident(
  incident: Incident,
  updates: {
    title?: string;
    category?: IncidentCategory;
    notes?: string;
  }
): Incident {
  return {
    ...incident,
    userTitle: updates.title || incident.userTitle,
    userCategory: updates.category || incident.userCategory,
    userNotes: updates.notes || incident.userNotes,
    isManuallyEdited: true,
    // Use user values for display if set
    title: updates.title || incident.title,
    category: updates.category || incident.category
  };
}

// ============================================
// EXPORTS
// ============================================

export { CATEGORY_DISPLAY_NAMES, TOPIC_KEYWORDS };