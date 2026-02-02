/**
 * Pattern 18 - Migration Utilities
 * Maps legacy categories to new neutral descriptors.
 */

export const LEGACY_TO_NEUTRAL: Record<string, string> = {
  // Psychological
  'gaslighting': 'reality_questioning',
  'darvo': 'blame_reversal',
  'blame_shifting': 'responsibility_deflection',
  'blame-shifting': 'responsibility_deflection',
  'intimidation': 'pressure_tactics',
  'threats': 'pressure_tactics',
  'emotional_blackmail': 'emotional_leverage',
  'minimizing': 'minimizing_dismissing',
  'denying': 'minimizing_dismissing',
  'minimizing_denying': 'minimizing_dismissing',
  'word_salad': 'circular_communication',
  'moving_goalposts': 'agreement_instability',
  'projection': 'projection',
  'hoovering': 'reconciliation_attempts',
  'manipulation': 'responsibility_deflection',
  'coercive_control': 'pressure_tactics',
  
  // Financial
  'financial_abuse': 'financial_pressure',
  'financial_coercion': 'financial_pressure',
  'financial_manipulation': 'financial_pressure',
  
  // Child-related
  'using_children_as_weapons': 'child_involvement',
  'triangulating_child': 'child_involvement',
  'parental_alienation': 'parent_child_interference',
  'gatekeeping': 'access_restriction',
  
  // Schedule
  'schedule_manipulation': 'schedule_interference',
  
  // Communication
  'stonewalling': 'non_response',
  
  // Boundary
  'monitoring': 'surveillance_indicators',
  'stalking': 'surveillance_indicators',
  'monitoring_stalking': 'surveillance_indicators',
  'isolation': 'isolation_attempts',
  'isolation_tactics': 'isolation_attempts',
  'boundary_violation': 'boundary_violations',
  
  // Legal
  'legal_threats': 'legal_threats',
  'false_accusations': 'false_reports',
  
  // Catch-all
  'uncategorized': 'uncategorized',
  'none_detected': 'uncategorized',
  'not_abuse': 'not_applicable',
};

export const NEUTRAL_TO_DISPLAY: Record<string, string> = {
  'reality_questioning': 'Reality Questioning',
  'blame_reversal': 'Blame Reversal',
  'responsibility_deflection': 'Responsibility Deflection',
  'pressure_tactics': 'Pressure Tactics',
  'emotional_leverage': 'Emotional Leverage',
  'minimizing_dismissing': 'Minimizing/Dismissing',
  'circular_communication': 'Circular Communication',
  'reconciliation_attempts': 'Reconciliation Attempts',
  'financial_pressure': 'Financial Pressure',
  'child_involvement': 'Child Involvement',
  'parent_child_interference': 'Parent-Child Interference',
  'access_restriction': 'Access Restriction',
  'schedule_interference': 'Schedule Interference',
  'surveillance_indicators': 'Surveillance Indicators',
  'legal_threats': 'Legal Process References',
  'false_reports': 'False Reports',
  'uncategorized': 'Uncategorized',
};

/**
 * Convert legacy category to neutral descriptor
 */
export function migrateCategory(legacy: string): string {
  if (!legacy) return 'uncategorized';
  const key = legacy.toLowerCase().replace(/[\s\-\/]+/g, '_');
  return LEGACY_TO_NEUTRAL[key] || 'uncategorized';
}

/**
 * Get display label for pattern
 */
export function getDisplayLabel(neutralId: string): string {
  return NEUTRAL_TO_DISPLAY[neutralId] || 
    neutralId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Migrate array of patterns
 */
export function migratePatterns(patterns: string[]): string[] {
  if (!patterns) return [];
  const migrated = patterns.map(p => migrateCategory(p));
  return [...new Set(migrated)].filter(p => p !== 'uncategorized');
}
