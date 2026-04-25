// Feature flag helpers. Defaults are SAFE: program is OFF until explicitly enabled.

export function isFoundingMemberProgramLive(): boolean {
  return process.env.FOUNDING_MEMBER_PROGRAM_LIVE === 'true';
}

export function isDevMode(): boolean {
  return process.env.DEV_MODE !== 'false'; // default true
}

export function founderCalendlyUrl(): string {
  return process.env.FOUNDER_CALENDLY_URL ?? 'https://calendly.com/raehart-pattern18';
}

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'https://pattern18.com';
}

export const ADMIN_EMAILS = ['hello@pattern18.com', 'christymeek@yahoo.com'] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase() as typeof ADMIN_EMAILS[number]);
}
