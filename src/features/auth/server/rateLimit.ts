/**
 * Rate limiting for the authentication endpoints.
 *
 * The same fixed-window approach as the public lead route, with its own limits
 * and two scopes: per IP, which is what stops one caller spraying many
 * addresses, and per email, which is what stops one address being hammered from
 * many callers.
 *
 * This is the outer layer only. The real protection for a single account is in
 * the database — `failed_attempts` and `locked_until` give a 5-attempt,
 * 15-minute lockout that survives a restart and is shared across instances,
 * which an in-memory counter cannot be. This exists because that lockout is
 * per-account and so does nothing against someone trying one password against a
 * thousand addresses.
 *
 * In-memory and therefore per-instance: a deployment on several instances
 * multiplies the effective limit by the instance count. That is accepted —
 * the durable lockout is the guarantee, this is the cheap first filter.
 */

const IP_WINDOW_MS = 60_000 // 1 minute
const IP_LIMIT = 10 // max requests per IP per window

const EMAIL_WINDOW_MS = 300_000 // 5 minutes
const EMAIL_LIMIT = 3 // max requests per email per window

/**
 * When a bucket map may be swept of expired entries.
 *
 * A window expires by being overwritten the next time that key is seen, so a
 * key that never comes back is never reclaimed. Rather than a timer — which
 * does not survive a serverless instance and nothing was starting anyway — the
 * sweep runs on write, and only once the map is large enough for the walk to be
 * worth it.
 */
const SWEEP_THRESHOLD = 1_000

interface Bucket {
  count: number
  resetAt: number
}

const ipBuckets = new Map<string, Bucket>()
const emailBuckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  /** Seconds until the window resets — for a Retry-After hint. */
  retryAfterSec: number
}

/** Per-IP: one caller against many addresses. */
export function checkIpRateLimit(ip: string): RateLimitResult {
  return checkRateLimitInternal(ipBuckets, ip, IP_WINDOW_MS, IP_LIMIT)
}

/** Per-email: many callers against one address. Lower-cased, so case is not a bypass. */
export function checkEmailRateLimit(email: string): RateLimitResult {
  return checkRateLimitInternal(emailBuckets, email.toLowerCase(), EMAIL_WINDOW_MS, EMAIL_LIMIT)
}

function checkRateLimitInternal(
  buckets: Map<string, Bucket>,
  key: string,
  windowMs: number,
  limit: number,
): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now >= existing.resetAt) {
    if (buckets.size >= SWEEP_THRESHOLD) sweep(buckets, now)
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSec: 0 }
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) }
  }

  existing.count += 1
  return { allowed: true, retryAfterSec: 0 }
}

/** Drop every window that has already closed. Cheap, and only on a new key. */
function sweep(buckets: Map<string, Bucket>, now: number): void {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
}

/** 429 with a Retry-After, in the shape the auth routes already answer in. */
export function rateLimitResponse(retryAfterSec: number) {
  return new Response(
    JSON.stringify({
      success: false,
      message: 'Too many requests. Please wait a moment and try again.',
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    },
  )
}
