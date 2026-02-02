/**
 * Pattern 18 - Event Types
 * Consistent shape for all evidence.
 */

export interface Event {
  id: string;
  caseId: string;
  userId: string;
  
  eventDateTime: string;
  capturedAt: string;
  
  sourceType: 'screenshot' | 'pasted_text' | 'bulk_import' | 'manual_entry';
  channel: 'text' | 'email' | 'app' | 'voicemail' | 'in_person' | 'unknown';
  direction: 'received' | 'sent' | 'unknown';
  
  rawContent: string;
  quote: string;
  
  patterns: string[];
  primaryPattern: string | null;
  
  scores: {
    severity: number;
    frequency: number;
    escalation: number;
    clarity: number;
    total: number;
  };
  
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  flags: {
    safetyReview: boolean;
    childConcern: boolean;
    legalUrgent: boolean;
    responseNeeded: boolean;
  };
  
  suggestedResponse: string | null;
  status: 'draft' | 'confirmed' | 'archived';
  includeInExhibit: boolean;
  exhibitNumber: string | null;
}

export interface EventHistory {
  primaryPattern: string | null;
  total: number;
  eventDateTime: string;
}

export interface EventInput {
  rawContent: string;
  sourceType: Event['sourceType'];
  channel?: Event['channel'];
  direction?: Event['direction'];
  eventDateTime?: string;
}
