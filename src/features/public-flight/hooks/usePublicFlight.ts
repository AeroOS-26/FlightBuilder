'use client'

/**
 * Reads the public-safe flight view for a share token via the read-relay.
 *
 * Wraps the service in a TanStack Query so the page gets loading / error /
 * retry for free, keyed by token. Retry is gated on the normalized
 * ApiError.retryable flag (network / 5xx / 429 only) by the shared QueryClient;
 * a not-found token resolves successfully to `{ status: 'not_found' }` so it is
 * not treated as an error.
 */

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/queryKeys'
import { fetchPublicFlight } from '@/api/services/publicFlightService'

export function usePublicFlight(token: string) {
  return useQuery({
    queryKey: queryKeys.publicFlight.byToken(token),
    queryFn: () => fetchPublicFlight(token),
    enabled: token.length > 0,
    // Public data is as-of page load per the milestone; no polling.
    staleTime: 60_000,
  })
}
