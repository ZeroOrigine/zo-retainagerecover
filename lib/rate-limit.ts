// CANONICAL rate limiter for RetainageRecover write routes.
// Best-effort, in-memory, daily UTC windows, bounded memory. Per serverless
// instance by design: this exists to stop hammering and runaway loops, not to
// be a billing meter. Both limits must pass: per-caller and per-bucket global.
//
// Signature matches every call site:
//   rateLimitCheck(bucket, clientIp(request), perCallerDailyLimit, bucketDailyLimit)

export interface RateLimitVerdict {
  allowed: boolean;
  remaining: number;
}

interface Counter {
  day: string;
  count: number;
}

const MAX_TRACKED_KEYS = 20_000;

const perCallerCounters = new Map<string, Counter>();
const perBucketCounters = new Map<string, Counter>();

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function bump(map: Map<string, Counter>, key: string): number {
  const day = utcDay();
  const existing = map.get(key);
  if (!existing || existing.day !== day) {
    if (map.size >= MAX_TRACKED_KEYS) {
      // Crude but bounded: a full reset is safer than unbounded memory.
      map.clear();
    }
    map.set(key, { day, count: 1 });
    return 1;
  }
  existing.count += 1;
  return existing.count;
}

// Works for both NextRequest and the standard Request used in route handlers.
export function clientIp(
  request: { headers: Headers },
  authenticatedUserId?: string | null
): string {
  // On authenticated write routes, pass user.id: it cannot be rotated the way
  // spoofed IP headers can, so it is the strongest caller key available.
  if (authenticatedUserId) return `user:${authenticatedUserId}`;
  // Prefer the platform-trusted header. Netlify's edge sets/overwrites
  // x-nf-client-connection-ip itself, so unlike x-forwarded-for it is not
  // client-spoofable.
  const netlifyIp = request.headers.get('x-nf-client-connection-ip');
  if (netlifyIp && netlifyIp.trim()) return netlifyIp.trim();
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get('x-real-ip');
  if (real && real.trim()) return real.trim();
  return 'unknown';
}

export async function rateLimitCheck(
  bucket: string,
  callerKey: string,
  perCallerDailyLimit: number,
  bucketDailyLimit: number
): Promise<RateLimitVerdict> {
  const callerCount = bump(perCallerCounters, `${bucket}:${callerKey}`);
  const bucketCount = bump(perBucketCounters, bucket);
  const allowed =
    callerCount <= perCallerDailyLimit && bucketCount <= bucketDailyLimit;
  return {
    allowed,
    remaining: Math.max(0, perCallerDailyLimit - callerCount),
  };
}
