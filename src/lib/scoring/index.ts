/**
 * Pattern 18 - Scoring Engine
 * Deterministic scoring. NO AI involved.
 */

import scoringConfig from '../../../protocol/scoring-v1.json';
import patternsConfig from '../../../protocol/patterns-v1.json';
import { PatternMatch, hasSafetyConcerns, hasChildConcerns } from '../patterns';
import type { EventHistory } from '../events/types';
export type { EventHistory };

export interface Scores {
  severity: number;
  frequency: number;
  escalation: number;
  clarity: number;
  total: number;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Flags {
  safetyReview: boolean;
  childConcern: boolean;
  legalUrgent: boolean;
  responseNeeded: boolean;
}

export interface EventHistory {
  primaryPattern: string | null;
  total: number;
  eventDateTime: string;
}

/**
 * Calculate all scores for an event
 */
export function calculateScores(
  patterns: PatternMatch[],
  content: string,
  sourceType: string,
  history: EventHistory[] = []
): Scores {
  const severity = calcSeverity(patterns);
  const frequency = calcFrequency(patterns, history);
  const escalation = calcEscalation(history);
  const clarity = calcClarity(content, sourceType);
  
  const w = scoringConfig.weights;
  const total = Math.round(
    severity * w.severity +
    frequency * w.frequency +
    escalation * w.escalation +
    clarity * w.clarity
  );
  
  return { severity, frequency, escalation, clarity, total };
}

function calcSeverity(patterns: PatternMatch[]): number {
  if (patterns.length === 0) return 20;
  const maxSev = Math.max(...patterns.map(p => p.severity));
  const base = maxSev * 20; // 1-5 scale to 20-100
  const bonus = Math.min((patterns.length - 1) * 5, 15);
  return Math.min(100, base + bonus);
}

function calcFrequency(patterns: PatternMatch[], history: EventHistory[]): number {
  if (patterns.length === 0 || history.length === 0) return 20;
  
  const patternIds = patterns.map(p => p.id);
  let count = 0;
  for (const e of history) {
    if (e.primaryPattern && patternIds.includes(e.primaryPattern)) count++;
  }
  
  const mult = scoringConfig.frequencyMultipliers;
  let multiplier = 1.0;
  if (count >= 11) multiplier = mult['11+'];
  else if (count >= 7) multiplier = mult['7-10'];
  else if (count >= 4) multiplier = mult['4-6'];
  else if (count >= 2) multiplier = mult['2-3'];
  
  return Math.min(100, Math.round(20 + count * 8 * multiplier));
}

function calcEscalation(history: EventHistory[]): number {
  if (history.length < 5) return 50;
  
  const windowDays = scoringConfig.escalationWindow;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  
  const recent = history.filter(e => new Date(e.eventDateTime) > cutoff);
  const older = history.filter(e => new Date(e.eventDateTime) <= cutoff);
  
  if (older.length === 0) return 50;
  
  const recentAvg = recent.length > 0 
    ? recent.reduce((s, e) => s + e.total, 0) / recent.length 
    : 0;
  const olderAvg = older.reduce((s, e) => s + e.total, 0) / older.length;
  
  const ratio = olderAvg > 0 ? recentAvg / olderAvg : 1;
  
  if (ratio >= 1.3) return 90;
  if (ratio >= 1.15) return 70;
  if (ratio >= 1.0) return 55;
  return 40;
}

function calcClarity(content: string, sourceType: string): number {
  let score = 40;
  
  const bonus = scoringConfig.clarityBonus as Record<string, number>;
  score += bonus[sourceType] || 0;
  
  if (content.length > 200) score += 10;
  else if (content.length > 50) score += 5;
  
  if (content.includes('"') || content.includes("'")) score += 10;
  
  return Math.min(100, score);
}

/**
 * Get risk level from score
 */
export function getRiskLevel(total: number): RiskLevel {
  const t = patternsConfig.riskThresholds;
  if (total >= t.critical) return 'critical';
  if (total >= t.high) return 'high';
  if (total >= t.medium) return 'medium';
  return 'low';
}

/**
 * Calculate flags
 */
export function calculateFlags(patterns: PatternMatch[], content: string): Flags {
  const patternIds = patterns.map(p => p.id);
  
  const safetyReview = hasSafetyConcerns(content) || 
    patternIds.includes('surveillance_indicators') ||
    patternIds.includes('pressure_tactics');
    
  const childConcern = hasChildConcerns(content) ||
    patternIds.includes('child_involvement') ||
    patternIds.includes('parent_child_interference');
    
  const legalUrgent = patternIds.includes('legal_threats') ||
    patternIds.includes('false_reports');
    
  const noResponsePatterns = ['reconciliation_attempts', 'emotional_leverage'];
  const responseNeeded = !patternIds.some(p => noResponsePatterns.includes(p));
  
  return { safetyReview, childConcern, legalUrgent, responseNeeded };
}

/**
 * Full scoring pipeline
 */
export function scoreEvent(
  patterns: PatternMatch[],
  content: string,
  sourceType: string,
  history: EventHistory[] = []
) {
  const scores = calculateScores(patterns, content, sourceType, history);
  const riskLevel = getRiskLevel(scores.total);
  const flags = calculateFlags(patterns, content);
  return { scores, riskLevel, flags };
}
