const userRequestCounts = new Map<string, { count: number; resetTime: number }>();
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

// Upper bound on map size; if exceeded, expired entries are swept.
const SWEEP_THRESHOLD = 5000;

function sweepExpired(map: Map<string, { count: number; resetTime: number }>, now: number) {
  for (const [key, entry] of map) {
    if (now > entry.resetTime) map.delete(key);
  }
}

export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = userRequestCounts.get(userId);

  if (!entry || now > entry.resetTime) {
    userRequestCounts.set(userId, { count: 1, resetTime: now + WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

// Route-scoped IP rate limit. Each (routeKey, ip) pair gets its own bucket so
// one abusive route doesn't drag down unrelated endpoints.
// In-memory: acceptable for a single-region serverless deploy; upgrade to
// Upstash/Redis if you need shared state across regions.
export function checkIpRateLimit(
  req: Request,
  routeKey: string,
  maxPerMinute: number
): { ok: boolean; ip: string } {
  const ip = getClientIp(req);
  const key = `${routeKey}:${ip}`;
  const now = Date.now();

  if (ipRequestCounts.size > SWEEP_THRESHOLD) {
    sweepExpired(ipRequestCounts, now);
  }

  const entry = ipRequestCounts.get(key);
  if (!entry || now > entry.resetTime) {
    ipRequestCounts.set(key, { count: 1, resetTime: now + WINDOW_MS });
    return { ok: true, ip };
  }

  if (entry.count >= maxPerMinute) {
    return { ok: false, ip };
  }

  entry.count++;
  return { ok: true, ip };
}
