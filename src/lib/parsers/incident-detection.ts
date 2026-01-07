/**
 * Incident Detection Module
 * Clusters messages into discrete incidents based on time
 * Categories are based on PRIMARY COERCIVE CONTROL PATTERN, not topic
 */

import { AnalyzedMessage, PatternMatch, PATTERNS } from './pattern-detection';

// ============================================
// HELPER: Get timestamp flexibly
// ============================================

function getTimestamp(msg: any): Date {
  return msg.timestamp || msg.date || new Date();
}

function getSender(msg: any): string {
  return msg.sender || 'unknown';
}

// ============================================
// INCIDENT TYPES - COERCIVE CONTROL PATTERNS
// ============================================

export type IncidentCategory = 
  | 'gaslighting'
  | 'darvo'
  | 'intimidation'
  | 'threats'
  | 'financial_abuse'
  | 'using_children_as_weapons'
  | 'blame_shifting'
  | 'false_accusations'
  | 'emotional_blackmail'
  | 'stonewalling'
  | 'monitoring_stalking'
  | 'isolation_tactics'
  | 'minimizing_denying'
  | 'word_salad'
  | 'moving_goalposts'
  | 'projection'
  | 'hoovering'
  | 'gatekeeping'
  | 'verbal_abuse'
  | 'legal_threats'
  | 'schedule_manipulation'
  | 'none_detected';

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
    categoryBreakdown: Record<string, number>;
    evidenceIncidents: number;
    strongEvidenceCount: number;
  };
  unclusteredMessages: AnalyzedMessage[];
}

// ============================================
// PATTERN TO CATEGORY MAPPING
// ============================================

const PATTERN_TO_CATEGORY: Record<string, IncidentCategory> = {
  'Gaslighting': 'gaslighting',
  'DARVO': 'darvo',
  'Revisionist History': 'gaslighting', // Similar to gaslighting
  'Legal/Court Threats': 'legal_threats',
  'Financial Manipulation': 'financial_abuse',
  'Triangulating Child': 'using_children_as_weapons',
  'Dismissing Without Engaging': 'stonewalling',
  'Name-Calling/Verbal Abuse': 'verbal_abuse',
  'False Accusations': 'false_accusations',
  'Emotional Blackmail': 'emotional_blackmail',
  'Information Gatekeeping': 'gatekeeping',
  'Schedule Manipulation': 'schedule_manipulation',
  'Surveillance/Monitoring': 'monitoring_stalking',
  'Weaponizing Flexibility': 'blame_shifting',
  'Threats of Exposure': 'intimidation',
  'Minimizing/Mocking': 'minimizing_denying',
  'Victim Positioning': 'darvo', // Part of DARVO
  'Deadline/Urgency Pressure': 'intimidation',
};

const CATEGORY_DISPLAY_NAMES: Record<IncidentCategory, string> = {
  gaslighting: 'Gaslighting',
  darvo: 'DARVO',
  intimidation: 'Intimidation',
  threats: 'Threats',
  financial_abuse: 'Financial Abuse',
  using_children_as_weapons: 'Using Children as Weapons',
  blame_shifting: 'Blame-Shifting',
  false_accusations: 'False Accusations',
  emotional_blackmail: 'Emotional Blackmail',
  stonewalling: 'Stonewalling',
  monitoring_stalking: 'Monitoring/Stalking',
  isolation_tactics: 'Isolation Tactics',
  minimizing_denying: 'Minimizing/Denying',
  word_salad: 'Word Salad',
  moving_goalposts: 'Moving Goalposts',
  projection: 'Projection',
  hoovering: 'Hoovering',
  gatekeeping: 'Gatekeeping',
  verbal_abuse: 'Verbal Abuse',
  legal_threats: 'Legal Threats',
  schedule_manipulation: 'Schedule Manipulation',
  none_detected: 'Uncategorized',
};

// ============================================
// INCIDENT DETECTION ENGINE
// ============================================

export function detectIncidents(
  messages: AnalyzedMessage[],
  options: {
    timeWindowHours?: number;
    minMessagesPerIncident?: number;
  } = {}
): IncidentDetectionResult {
  const {
    timeWindowHours = 24,
    minMessagesPerIncident = 2,
  } = options;

  // Sort messages by timestamp using helper
  const sorted = [...messages].sort(
    (a, b) => getTimestamp(a).getTime() - getTimestamp(b).getTime()
  );

  if (sorted.length === 0) {
    return {
      incidents: [],
      summary: {
        totalIncidents: 0,
        totalMessages: 0,
        dateRange: null,
        categoryBreakdown: {},
        evidenceIncidents: 0,
        strongEvidenceCount: 0
      },
      unclusteredMessages: []
    };
  }

  // Step 1: Time-based clustering only (no topic splitting)
  const timeClusters = clusterByTime(sorted, timeWindowHours);

  // Step 2: Filter out tiny clusters
  const validClusters = timeClusters.filter(
    cluster => cluster.length >= minMessagesPerIncident
  );

  // Step 3: Convert clusters to incidents (category = primary PATTERN)
  const incidents = validClusters.map((cluster, index) => 
    createIncident(cluster, index)
  );

  // Collect unclustered messages
  const clusteredIds = new Set(
    validClusters.flat().map(m => m.id)
  );
  const unclusteredMessages = sorted.filter(m => !clusteredIds.has(m.id));

  // Build summary
  const categoryBreakdown: Record<string, number> = {};
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
        start: getTimestamp(sorted[0]),
        end: getTimestamp(sorted[sorted.length - 1])
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
    const timeDiff = getTimestamp(message).getTime() - getTimestamp(lastMessage).getTime();

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

// ============================================
// INCIDENT CREATION - PATTERN-BASED CATEGORY
// ============================================

function createIncident(
  messages: AnalyzedMessage[], 
  index: number
): Incident {
  const sorted = [...messages].sort(
    (a, b) => getTimestamp(a).getTime() - getTimestamp(b).getTime()
  );

  const startTime = getTimestamp(sorted[0]);
  const endTime = getTimestamp(sorted[sorted.length - 1]);
  const durationMinutes = Math.round(
    (endTime.getTime() - startTime.getTime()) / (1000 * 60)
  );

  // Collect all patterns from messages
  const allPatterns = sorted.flatMap(m => m.patterns || []);
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

  // CATEGORY = PRIMARY PATTERN (not topic!)
  const category = detectPrimaryPattern(allPatterns);

  // Generate title based on pattern
  const title = generateIncidentTitle(category, startTime, uniquePatterns);

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
    coparentMessageCount: sorted.filter(m => getSender(m) === 'coparent').length,
    userMessageCount: sorted.filter(m => getSender(m) === 'user').length,
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

/**
 * Detect the PRIMARY pattern from all matched patterns
 * Priority: critical > high > medium > low, then by frequency
 */
function detectPrimaryPattern(patterns: PatternMatch[]): IncidentCategory {
  if (patterns.length === 0) {
    return 'none_detected';
  }

  // Count patterns by name
  const patternCounts: Record<string, { count: number; severity: string }> = {};
  
  for (const pattern of patterns) {
    if (!patternCounts[pattern.patternName]) {
      patternCounts[pattern.patternName] = { count: 0, severity: pattern.severity };
    }
    patternCounts[pattern.patternName].count++;
  }

  // Sort by severity (critical > high > medium > low) then by count
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  
  const sortedPatterns = Object.entries(patternCounts).sort((a, b) => {
    const sevA = severityOrder[a[1].severity as keyof typeof severityOrder] || 0;
    const sevB = severityOrder[b[1].severity as keyof typeof severityOrder] || 0;
    
    if (sevB !== sevA) return sevB - sevA; // Higher severity first
    return b[1].count - a[1].count; // Then by count
  });

  const primaryPatternName = sortedPatterns[0][0];
  
  // Map to category
  return PATTERN_TO_CATEGORY[primaryPatternName] || 'none_detected';
}

function generateIncidentTitle(
  category: IncidentCategory,
  date: Date,
  uniquePatterns: string[]
): string {
  const dateStr = date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });

  const categoryName = CATEGORY_DISPLAY_NAMES[category] || 'Incident';
  
  // If multiple patterns, mention that
  if (uniquePatterns.length > 2) {
    return `${categoryName} + ${uniquePatterns.length - 1} more - ${dateStr}`;
  }

  return `${categoryName} - ${dateStr}`;
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
    const patternNames = [...new Set(criticalPatterns.map(p => p.patternName))];
    notes.push(`Critical: ${patternNames.join(', ')}`);
  }

  if (highPatterns.length > 0) {
    strengthScore += 2;
    const patternNames = [...new Set(highPatterns.map(p => p.patternName))];
    notes.push(`High severity: ${patternNames.join(', ')}`);
  }

  // Check message count (more = better documentation)
  if (messages.length >= 10) {
    strengthScore += 2;
    notes.push('Well-documented exchange');
  } else if (messages.length >= 5) {
    strengthScore += 1;
  }

  // Check for pattern variety (multiple types = stronger case)
  const uniquePatternCount = new Set(patterns.map(p => p.patternName)).size;
  if (uniquePatternCount >= 3) {
    strengthScore += 2;
    notes.push(`${uniquePatternCount} different manipulation tactics`);
  }

  // Check duration (sustained conflict vs quick exchange)
  if (durationMinutes >= 60) {
    strengthScore += 1;
    notes.push('Sustained over extended period');
  }

  // Check if user responses are calm/appropriate
  const userMessages = messages.filter(m => getSender(m) === 'user');
  const userHasPatterns = userMessages.some(m => (m.patterns || []).length > 0);
  if (!userHasPatterns && userMessages.length > 0) {
    strengthScore += 1;
    notes.push('Your responses remained appropriate');
  }

  const isEvidence = strengthScore >= 2 || patterns.length > 0;
  const evidenceStrength: 'weak' | 'moderate' | 'strong' = 
    strengthScore >= 5 ? 'strong' :
    strengthScore >= 3 ? 'moderate' : 'weak';

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
    title: updates.title || incident.title,
    category: updates.category || incident.category
  };
}

// ============================================
// EXPORTS
// ============================================

export { CATEGORY_DISPLAY_NAMES };