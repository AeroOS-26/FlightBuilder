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
import type { PublicFlightResult } from '@/types'

/**
 * `initialData` is the server-rendered read handed down by /share/[token]. With
 * it the page paints straight away and, because it is seeded fresh against the
 * staleTime below, the browser does not repeat the upstream read on mount.
 */
export function usePublicFlight(token: string, initialData?: PublicFlightResult) {
  return useQuery({
    queryKey: queryKeys.publicFlight.byToken(token),
    queryFn: () => fetchPublicFlight(token),
    enabled: token.length > 0,
    initialData,
    /**
     * Refresh when the tab regains focus — client, 2026-09-09. A share link is
     * left open in a background tab while the group fills, so what it shows on
     * return has to be current.
     *
     * These two settings are a pair; changing either alone breaks it.
     *
     * `staleTime: 0` is what makes the refresh reliable. Focus refetch only
     * fires on a query already considered stale, so the previous 60s window
     * meant returning to the tab within a minute did nothing — a refresh that
     * works *sometimes*, which is worse than either extreme because it cannot
     * be reproduced in a walkthrough.
     *
     * `refetchOnMount: false` preserves the server-rendered seed described
     * above. Without it, staleTime 0 would refetch on every mount and repeat
     * the upstream Zoho read the `initialData` exists to avoid.
     *
     * Still no polling: nothing here sets refetchInterval.
     */
    staleTime: 0,
    refetchOnMount: false,
  })
}
