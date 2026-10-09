/**
 * Best-effort client IP from proxy headers (Vercel and most hosts set these).
 *
 * It lived twice, identically — once in the auth limiter and once in the
 * public-flight one — which is two places for one rule about how a caller is
 * identified. If the hosting changes the header it sets, a limiter that still
 * reads the old one silently falls back to the shared key and degrades to a
 * global cap, so the two copies could not be allowed to drift.
 *
 * Falls back to a shared key when no header is present: that degrades to a
 * global cap rather than failing open per request.
 */
export function clientKeyFrom(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
