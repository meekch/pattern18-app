/**
 * Incident Detection - ONLY creates incidents when patterns ARE detected
 * 
 * Key change: Normal messages are NOT incidents. 
 * Only cluster and save messages that have actual abuse patterns.
 */

import { AnalyzedMessage, PatternMatch, PATTERNS } from './pattern-detection';

function getTimestamp(msg: any): Date {
  return msg.timestamp || msg.date || new Date();
}

function getSender(msg: any): string {
  return msg.sender || 'unknown';
}

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
  | 'verbal_abuse'
  | 'legal_threats'
  | 'name_calling';

export interface Incident {
  id: string;
  title: string;
  category: IncidentCategory;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  messages: AnalyzedMessage[];
  messageCount: number;
  coparentMessageCount: number;
  userMessageCount: number;
  patterns: PatternMatch[];
  uniquePatterns: string[];
  severityScore: number;
  maxSeverity: 'low' | 'medium' | 'high' | 'critical';
  isEvidence: boolean;
  evidenceStrength: 'weak' | 'moderate' | 'strong';
  courtReadyNotes: string[];
  quotableText: string; // The exact problematic quote
  isManuallyEdited: boolean;
}

export interface IncidentDetectionResult {
  incidents: Incident[];
  summary: {
    totalIncidents: number;
    totalMessages: number;
    messagesWithPatterns: number;
    dateRange: { start: Date; end: Date } | null;
    categoryBreakdown: Record<string, number>;
    evidenceIncidents: number;
    strongEvidenceCount: number;
  };
  unclusteredMessages: AnalyzedMessage[];
}

const PATTERN_TO_CATEGORY: Record<string, IncidentCategory> = {
  'Threats': 'threats',
  'Name-Calling': 'name_calling',
  'Using Children as Weapons': 'using_children_as_weapons',
  'False Accusations': 'false_accusations',
  'Gaslighting': 'gaslighting',
  'Intimidation': 'intimidation',
  'Legal Threats': 'legal_threats',
  'Blame-Shifting': 'blame_shifting',
  'DARVO': 'darvo',
  'Financial Manipulation': 'financial_abuse',
  'Stonewalling': 'stonewalling',
};

export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
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
  verbal_abuse: 'Verbal Abuse',
  legal_threats: 'Legal Threats',
  name_calling: 'Name-Calling',
};

export function detectIncidents(
  messages: AnalyzedMessage[],
  options: { timeWindowHours?: number } = {}
): IncidentDetectionResult {
  const { timeWindowHours = 24 } = options;

  // CRITICAL: Only consider messages that have patterns
  const messagesWithPatterns = messages.filter(m => m.patterns && m.patterns.length > 0);
  
  if (messagesWithPatterns.length === 0) {
    return {
      incidents: [],
      summary: {
        totalIncidents: 0,
        totalMessages: messages.length,
        messagesWithPatterns: 0,
        dateRange: null,
        categoryBreakdown: {},
        evidenceIncidents: 0,
        strongEvidenceCount: 0
      },
      unclusteredMessages: []
    };
  }

  // Sort by timestamp
  const sorted = [...messagesWithPatterns].sort(
    (a, b) => getTimestamp(a).getTime() - getTimestamp(b).getTime()
  );

  // Cluster by time - only messages with patterns
  const clusters = clusterByTime(sorted, timeWindowHours);

  // Create incidents from clusters
  const incidents = clusters.map((cluster, index) => createIncident(cluster, index));

  // Build summary
  const categoryBreakdown: Record<string, number> = {};
  for (const incident of incidents) {
    categoryBreakdown[incident.category] = (categoryBreakdown[incident.category] || 0) + 1;
  }

  const strongEvidenceCount = incidents.filter(i => i.evidenceStrength === 'strong').length;

  // Date range from all messages
  let dateRange: { start: Date; end: Date } | null = null;
  if (messages.length > 0) {
    const allSorted = [...messages].sort(
      (a, b) => getTimestamp(a).getTime() - getTimestamp(b).getTime()
    );
    dateRange = {
      start: getTimestamp(allSorted[0]),
      end: getTimestamp(allSorted[allSorted.length - 1])
    };
  }

  return {
    incidents,
    summary: {
      totalIncidents: incidents.length,
      totalMessages: messages.length,
      messagesWithPatterns: messagesWithPatterns.length,
      dateRange,
      categoryBreakdown,
      evidenceIncidents: incidents.length, // All incidents are evidence now
      strongEvidenceCount
    },
    unclusteredMessages: []
  };
}

function clusterByTime(messages: AnalyzedMessage[], windowHours: number): AnalyzedMessage[][] {
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

function createIncident(messages: AnalyzedMessage[], index: number): Incident {
  const sorted = [...messages].sort(
    (a, b) => getTimestamp(a).getTime() - getTimestamp(b).getTime()
  );

  const startTime = getTimestamp(sorted[0]);
  const endTime = getTimestamp(sorted[sorted.length - 1]);
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

  // Collect all patterns
  const allPatterns = sorted.flatMap(m => m.patterns || []);
  const uniquePatterns = [...new Set(allPatterns.map(p => p.patternName))];

  // Find the most severe pattern for category
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  let maxSeverityValue = 0;
  let primaryPattern = allPatterns[0];

  for (const pattern of allPatterns) {
    const value = severityOrder[pattern.severity];
    if (value > maxSeverityValue) {
      maxSeverityValue = value;
      primaryPattern = pattern;
    }
  }

  const maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 
    maxSeverityValue >= 4 ? 'critical' :
    maxSeverityValue >= 3 ? 'high' :
    maxSeverityValue >= 2 ? 'medium' : 'low';

  // Category from primary pattern
  const category = PATTERN_TO_CATEGORY[primaryPattern.patternName] || 'intimidation';

  // Get the quotable text - the exact problematic phrase
  const quotableText = primaryPattern.matchedText || sorted[0].text.substring(0, 150);

  // Title with the quote preview
  const dateStr = startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const title = `${CATEGORY_DISPLAY_NAMES[category] || category} - ${dateStr}`;

  // Evidence strength
  const evidenceStrength: 'weak' | 'moderate' | 'strong' = 
    maxSeverityValue >= 4 ? 'strong' :
    maxSeverityValue >= 3 ? 'moderate' : 'weak';

  const courtReadyNotes: string[] = [];
  courtReadyNotes.push(`"${quotableText.substring(0, 80)}${quotableText.length > 80 ? '...' : ''}"`);
  courtReadyNotes.push(`Pattern: ${primaryPattern.patternName}`);

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
    severityScore: maxSeverityValue * 2.5,
    maxSeverity,
    isEvidence: true, // All incidents are evidence now
    evidenceStrength,
    courtReadyNotes,
    quotableText,
    isManuallyEdited: false
  };
}

// Keep existing exports
export function mergeIncidents(incidents: Incident[], ids: string[]): Incident {
  const toMerge = incidents.filter(i => ids.includes(i.id));
  if (toMerge.length === 0) throw new Error('No incidents found');
  const allMessages = toMerge.flatMap(i => i.messages);
  return createIncident(allMessages, Date.now());
}

export function splitIncident(incident: Incident, splitAtMessageId: string): [Incident, Incident] {
  const splitIndex = incident.messages.findIndex(m => m.id === splitAtMessageId);
  if (splitIndex === -1 || splitIndex === 0) throw new Error('Invalid split point');
  return [
    createIncident(incident.messages.slice(0, splitIndex), Date.now()),
    createIncident(incident.messages.slice(splitIndex), Date.now() + 1)
  ];
}

export function updateIncident(incident: Incident, updates: { title?: string; category?: IncidentCategory; notes?: string }): Incident {
  return {
    ...incident,
    title: updates.title || incident.title,
    category: updates.category || incident.category,
    isManuallyEdited: true
  };
}