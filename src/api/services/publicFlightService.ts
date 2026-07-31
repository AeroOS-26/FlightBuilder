/**
 * Public-flight service — the client-side reader for the public join page.
 *
 * Fetches the public-safe view from the read-relay (GET /api/public-flight/
 * [token]). The relay has already filtered to `public_view` server-side, so
 * this layer only transports and normalizes; it never sees sensitive fields.
 *
 * A missing/stale/unknown token comes back from the relay as 404 → we surface
 * it as a typed `not_found` result rather than throwing, so the page can render
 * the Not-found state. Any other failure throws a normalized ApiError for the
 * query layer to handle as loading/error.
 */

import { normalizeError } from '@/api/errors'
import type { ApiError, PublicFlightResult } from '@/types'

const RELAY_BASE = '/api/public-flight'

/** Statuses worth a retry (transient / server-side); 4xx are not. */
const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504])

export async function fetchPublicFlight(token: string): Promise<PublicFlightResult> {
  let res: Response
  try {
    res = await fetch(`${RELAY_BASE}/${encodeURIComponent(token)}`, {
      headers: { Accept: 'application/json' },
    })
  } catch (err) {
    // Network/transport failure — normalize and let the query surface it.
    throw normalizeError(err)
  }

  // A stale, closed, or unknown token → typed not-found, not an error state.
  if (res.status === 404) {
    return { status: 'not_found' }
  }

  if (!res.ok) {
    const error: ApiError = {
      status: res.status,
      message: 'We could not load this flight. Please try again.',
      retryable: RETRYABLE.has(res.status),
    }
    throw error
  }

  return (await res.json()) as PublicFlightResult
}
