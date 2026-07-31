/**
 * Lightweight per-IP rate limit for the public lead route — server-only.
 *
 * A fixed-window counter kept in memory: each client (keyed by IP) may submit up
 * to LIMIT times per WINDOW; further submissions in the window are throttled.
 * Right-sized for the MVP per the milestone doc — a hardened, persistent limit
 * across serverless instances (a shared store) is a later hardening if needed.
 *
 * Time is read via Date.now() only inside request handling (never at module
 * load), so it stays deterministic to import.
 */

const WINDOW_MS = 60_000 // 1 minute
const LIMIT = 5 // max lead submissions per IP per window

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  /** Seconds until the window resets — for a Retry-After hint. */
  retryAfterSec: number
}

/** Record a hit for `key` and report whether it is within the limit. */
export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, retryAfterSec: 0 }
  }

  if (existing.count >= LIMIT) {
    return { allowed: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) }
  }

  existing.count += 1
  return { allowed: true, retryAfterSec: 0 }
}

/**
 * Best-effort client IP from proxy headers (Vercel/most hosts set these).
 * Falls back to a shared key so the limiter still functions if headers are
 * absent — it degrades to a global cap rather than failing open per-request.
 */
export function clientKeyFrom(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
