/**
 * Builds the tracked share link for a created flight.
 *
 * The link carries a short slug (route codes + month) so downstream sign-ups
 * are attributed to this flight. The Stage-1 lead-capture page that consumes
 * this link is a separate module; we only generate and display the URL here.
 */

import { env } from '@/config/env'

/** Full, shareable URL for a flight slug, e.g. ".../share/SFO-JFK-202606". */
export function buildShareUrl(slug: string): string {
  const url = new URL(`/share/${slug}`, env.shareBaseUrl)
  return url.toString()
}

/** Host + path only, for display ("perroair.com/share/SFO-JFK-202606"). */
export function displayShareUrl(fullUrl: string): string {
  try {
    const u = new URL(fullUrl)
    return `${u.host}${u.pathname}`
  } catch {
    return fullUrl.replace(/^https?:\/\//, '')
  }
}
