/**
 * Duplicate Detection for Incidents
 * 
 * Prevents duplicate incidents from being created or saved
 * Key: Same message text + same date = duplicate
 */

import { supabase } from '@/lib/supabase';

interface Incident {
  id?: string;
  title?: string;
  coparent_message?: string;
  messages_json?: any[];
  incident_date: string;
  [key: string]: any;
}

/**
 * Create a fingerprint for an incident based on content and date
 */
function createFingerprint(incident: Incident): string {
  // Get the primary message text
  let messageText = '';
  
  if (incident.coparent_message) {
    messageText = incident.coparent_message;
  } else if (incident.messages_json && incident.messages_json.length > 0) {
    // Use first coparent message
    const coparentMsg = incident.messages_json.find(m => m.sender === 'coparent');
    messageText = coparentMsg?.text || incident.messages_json[0]?.text || '';
  }
  
  // Normalize: lowercase, trim, remove extra whitespace
  const normalizedText = messageText.toLowerCase().trim().replace(/\s+/g, ' ').substring(0, 100);
  
  // Get date (just the date part, not time)
  const dateStr = incident.incident_date?.split('T')[0] || '';
  
  return `${dateStr}|${normalizedText}`;
}

/**
 * Remove duplicates from an array of incidents (before showing preview)
 */
export function deduplicateIncidents(incidents: Incident[]): Incident[] {
  const seen = new Set<string>();
  const unique: Incident[] = [];
  
  for (const incident of incidents) {
    const fingerprint = createFingerprint(incident);
    
    if (!seen.has(fingerprint)) {
      seen.add(fingerprint);
      unique.push(incident);
    }
  }
  
  console.log(`Deduplication: ${incidents.length} -> ${unique.length} incidents (removed ${incidents.length - unique.length} duplicates)`);
  
  return unique;
}

/**
 * Check which incidents already exist in database
 * Returns array of incidents that are NOT duplicates
 */
export async function filterExistingIncidents(
  userId: string, 
  incidents: Incident[]
): Promise<{ newIncidents: Incident[]; duplicateCount: number }> {
  if (incidents.length === 0) {
    return { newIncidents: [], duplicateCount: 0 };
  }
  
  // Get date range from incidents
  const dates = incidents.map(i => i.incident_date?.split('T')[0]).filter(Boolean);
  const minDate = dates.sort()[0];
  const maxDate = dates.sort().reverse()[0];
  
  // Fetch existing incidents in that date range
  const { data: existing, error } = await supabase
    .from('incidents')
    .select('coparent_message, messages_json, incident_date')
    .eq('user_id', userId)
    .gte('incident_date', minDate)
    .lte('incident_date', maxDate + 'T23:59:59');
  
  if (error) {
    console.error('Error checking for duplicates:', error);
    return { newIncidents: incidents, duplicateCount: 0 };
  }
  
  // Create fingerprints of existing incidents
  const existingFingerprints = new Set<string>();
  for (const inc of existing || []) {
    existingFingerprints.add(createFingerprint(inc));
  }
  
  // Filter out duplicates
  const newIncidents: Incident[] = [];
  let duplicateCount = 0;
  
  for (const incident of incidents) {
    const fingerprint = createFingerprint(incident);
    
    if (existingFingerprints.has(fingerprint)) {
      duplicateCount++;
    } else {
      newIncidents.push(incident);
    }
  }
  
  console.log(`Database check: ${duplicateCount} duplicates found, ${newIncidents.length} new incidents`);
  
  return { newIncidents, duplicateCount };
}

/**
 * Combined: deduplicate array AND check database
 */
export async function prepareIncidentsForSave(
  userId: string,
  incidents: Incident[]
): Promise<{
  incidentsToSave: Incident[];
  removedDuplicates: number;
  existingInDb: number;
}> {
  // Step 1: Remove duplicates within the array
  const deduplicated = deduplicateIncidents(incidents);
  const removedDuplicates = incidents.length - deduplicated.length;
  
  // Step 2: Check against database
  const { newIncidents, duplicateCount: existingInDb } = await filterExistingIncidents(
    userId,
    deduplicated
  );
  
  return {
    incidentsToSave: newIncidents,
    removedDuplicates,
    existingInDb
  };
}