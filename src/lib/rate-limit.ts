const requestCounts = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(userId);

  if (!entry || now > entry.resetTime) {
    requestCounts.set(userId, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}
