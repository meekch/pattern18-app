// Guards court-document generation against missing case data.
// Without this, absent fields render as visible placeholders ([PETITIONER NAME],
// [CASE NUMBER]) or silently disappear from the caption.

export type CaseFieldKey =
  | 'user_role'
  | 'petitioner_name'
  | 'respondent_name'
  | 'case_number'
  | 'court'
  | 'county'
  | 'state';

export const REQUIRED_CASE_FIELDS: CaseFieldKey[] = [
  'user_role',
  'petitioner_name',
  'respondent_name',
  'case_number',
  'court',
  'county',
  'state',
];

const FIELD_LABELS: Record<CaseFieldKey, string> = {
  user_role: 'your role in the case (petitioner or respondent)',
  petitioner_name: 'petitioner name',
  respondent_name: 'respondent name',
  case_number: 'case number',
  court: 'court name',
  county: 'county',
  state: 'state',
};

// Each field is spelled differently across DB rows and client payloads.
const FIELD_ALIASES: Record<CaseFieldKey, string[]> = {
  user_role: ['user_role', 'userRole'],
  petitioner_name: ['petitioner_name', 'petitionerName'],
  respondent_name: ['respondent_name', 'respondentName'],
  case_number: ['case_number', 'caseNumber'],
  court: ['court', 'courtName', 'court_name'],
  county: ['county'],
  state: ['state'],
};

// Routes that build a prose document rather than a court caption never render
// county/state, so requiring them there would block on unused fields.
export const REQUIRED_CASE_FIELDS_WITHOUT_VENUE: CaseFieldKey[] = [
  'user_role',
  'petitioner_name',
  'respondent_name',
  'case_number',
  'court',
];

export type NormalizedCaseFields = Record<CaseFieldKey, string>;

// Callers pass either snake_case (database rows) or camelCase (client payloads).
export function normalizeCaseFields(raw: any): NormalizedCaseFields {
  const read = (key: CaseFieldKey): string => {
    for (const alias of FIELD_ALIASES[key]) {
      const value = raw?.[alias];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  };

  const fields = {} as NormalizedCaseFields;
  for (const key of REQUIRED_CASE_FIELDS) {
    fields[key] = read(key);
  }
  fields.user_role = fields.user_role.toLowerCase();
  return fields;
}

export function findMissingCaseFields(
  fields: NormalizedCaseFields,
  required: CaseFieldKey[] = REQUIRED_CASE_FIELDS,
): CaseFieldKey[] {
  return required.filter((key) => {
    if (key === 'user_role') {
      return fields.user_role !== 'petitioner' && fields.user_role !== 'respondent';
    }
    return fields[key].length === 0;
  });
}

export function describeMissingCaseFields(missing: CaseFieldKey[]): string[] {
  return missing.map((key) => FIELD_LABELS[key]);
}

function joinLabels(labels: string[]): string {
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

export interface MissingCaseFieldsResponse {
  error: string;
  code: 'MISSING_CASE_FIELDS';
  missingFields: CaseFieldKey[];
  missingFieldLabels: string[];
  acknowledgeField: 'acknowledgeMissingFields';
}

export function buildMissingCaseFieldsResponse(missing: CaseFieldKey[]): MissingCaseFieldsResponse {
  const labels = describeMissingCaseFields(missing);
  return {
    error: `This document can't be generated yet — missing ${joinLabels(labels)}. Add ${labels.length === 1 ? 'it' : 'them'} in My Case, or confirm the ${labels.length === 1 ? 'field is' : 'fields are'} intentionally blank to generate anyway.`,
    code: 'MISSING_CASE_FIELDS',
    missingFields: missing,
    missingFieldLabels: labels,
    acknowledgeField: 'acknowledgeMissingFields',
  };
}
