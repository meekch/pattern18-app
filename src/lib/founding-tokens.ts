import crypto from 'crypto';

// Lightweight HMAC-SHA256 token used for weekly check-in links and similar
// short-lived signed payloads. Format: base64url(json).base64url(hmac).
//
// Example payload: { application_id, week_number, exp }
//   - exp is a unix-seconds expiry, enforced on verify.

const ENC = 'base64url';

function getSecret(): string {
  const secret = process.env.FOUNDING_TOKEN_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('FOUNDING_TOKEN_SECRET must be set (>= 16 chars).');
  }
  return secret;
}

export interface CheckinTokenPayload {
  application_id: string;
  week_number: number;
  exp: number; // unix seconds
}

export function signToken(payload: CheckinTokenPayload): string {
  const json = JSON.stringify(payload);
  const body = Buffer.from(json, 'utf8').toString(ENC);
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest(ENC);
  return `${body}.${sig}`;
}

export type VerifyResult =
  | { ok: true; payload: CheckinTokenPayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' };

export function verifyToken(token: string): VerifyResult {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { ok: false, reason: 'malformed' };
  }
  const [body, sig] = token.split('.');
  if (!body || !sig) return { ok: false, reason: 'malformed' };

  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest(ENC);
  // constant-time compare
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return { ok: false, reason: 'bad_signature' };
  }

  let payload: CheckinTokenPayload;
  try {
    const json = Buffer.from(body, ENC).toString('utf8');
    payload = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: 'expired' };
  }
  return { ok: true, payload };
}

// Helper: 7-day expiring weekly check-in token.
export function signWeeklyCheckin(application_id: string, week_number: number): string {
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  return signToken({ application_id, week_number, exp });
}

// Helper: random URL-safe referral token (not HMAC, just a stable ID).
export function generateRefToken(): string {
  return crypto.randomBytes(12).toString('base64url');
}
