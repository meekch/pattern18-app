// Canonical mapping for the Founding Member application
// "biggest challenge" pill picker. The form, validation, admin
// dashboard, and email templates all read from this file so labels
// stay in sync with stored stable keys.

export const CHALLENGE_PILLS: Array<{ value: string; label: string }> = [
  { value: 'non_stop_texts',           label: 'Non-stop texts and emails' },
  { value: 'emotional_spirals',        label: 'Getting pulled into emotional spirals' },
  { value: 'disorganized_evidence',    label: 'Years of evidence I can\u2019t organize' },
  { value: 'court_docs_unclear',       label: 'Court documents I don\u2019t understand' },
  { value: 'deadlines_slipping',       label: 'Due dates and deadlines slipping' },
  { value: 'identifying_manipulation', label: 'Knowing what\u2019s actually manipulation' },
  { value: 'drafting_responses',       label: 'Drafting responses that don\u2019t escalate' },
  { value: 'preparing_hearings',       label: 'Preparing for hearings' },
  { value: 'lawyer_fees',              label: 'Lawyer fees I can\u2019t afford' },
  { value: 'feeling_unbelieved',       label: 'Feeling like no one believes me' },
];

export const CHALLENGE_PILL_KEYS = new Set(CHALLENGE_PILLS.map(p => p.value));

export const CHALLENGE_PILL_LABELS: Record<string, string> = Object.fromEntries(
  CHALLENGE_PILLS.map(p => [p.value, p.label])
);

export function challengeKeysToLabels(keys: string[] | null | undefined): string[] {
  if (!Array.isArray(keys)) return [];
  return keys.map(k => CHALLENGE_PILL_LABELS[k] ?? k);
}
