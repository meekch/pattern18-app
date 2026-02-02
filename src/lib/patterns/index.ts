/**
 * Pattern 18 - Pattern Matching
 * Deterministic keyword-based pattern detection.
 * NO AI involved. Fully auditable.
 */

// Import config at runtime to allow hot reloading
import patternsConfig from '../../../protocol/patterns-v1.json';

export interface PatternMatch {
  id: string;
  label: string;
  severity: number;
  keywords: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface PatternDefinition {
  id: string;
  label: string;
  category: string;
  severity: number;
  keywords: string[];
  courtDescription: string;
}

/**
 * Detect patterns in text using keyword matching
 */
export function detectPatterns(text: string): PatternMatch[] {
  if (!text) return [];
  
  const normalizedText = text.toLowerCase();
  const matches: PatternMatch[] = [];
  
  for (const pattern of patternsConfig.patterns as PatternDefinition[]) {
    if (!pattern.keywords || pattern.keywords.length === 0) continue;
    
    const matchedKeywords: string[] = [];
    
    for (const keyword of pattern.keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }
    
    if (matchedKeywords.length > 0) {
      let confidence: 'high' | 'medium' | 'low' = 'low';
      if (matchedKeywords.length >= 3) confidence = 'high';
      else if (matchedKeywords.length >= 2) confidence = 'medium';
      
      matches.push({
        id: pattern.id,
        label: pattern.label,
        severity: pattern.severity,
        keywords: matchedKeywords,
        confidence
      });
    }
  }
  
  // Sort by severity (highest first)
  return matches.sort((a, b) => b.severity - a.severity);
}

/**
 * Get pattern IDs from matches
 */
export function getPatternIds(matches: PatternMatch[]): string[] {
  return matches.map(m => m.id);
}

/**
 * Get primary pattern (highest severity)
 */
export function getPrimaryPattern(matches: PatternMatch[]): string | null {
  return matches.length > 0 ? matches[0].id : null;
}

/**
 * Get pattern definition by ID
 */
export function getPatternById(id: string): PatternDefinition | undefined {
  return (patternsConfig.patterns as PatternDefinition[]).find(p => p.id === id);
}

/**
 * Get display label for pattern
 */
export function getPatternLabel(id: string): string {
  const pattern = getPatternById(id);
  return pattern?.label || id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Check for safety concerns
 */
export function hasSafetyConcerns(text: string): boolean {
  const normalizedText = text.toLowerCase();
  return patternsConfig.safetyKeywords.some(kw => normalizedText.includes(kw));
}

/**
 * Check for child-related concerns
 */
export function hasChildConcerns(text: string): boolean {
  const normalizedText = text.toLowerCase();
  return patternsConfig.childKeywords.some(kw => normalizedText.includes(kw));
}
