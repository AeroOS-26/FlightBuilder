/**
 * Shared TanStack Query client configuration.
 *
 * Retries lean on our normalized `ApiError.retryable` flag so we only retry
 * transient failures (network, 5xx, 429) and never user-facing 4xx errors.
 *
 * Exposed as a factory so each browser session (and never the server across
 * requests) gets its own client — see the Providers component.
 */

import { QueryClient } from '@tanstack/react-query'
import type { ApiError } from '@/types'

const MAX_RETRIES = 2

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'retryable' in error &&
    'status' in error
  )
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Refresh when the tab regains focus. Client decision, 2026-09-09:
        // a member leaves a group open in a background tab, and what they come
        // back to has to reflect who has joined since.
        //
        // Set as the global default rather than opted into per query, because
        // the client stated it as a product-wide rule — a new query should
        // inherit it rather than have to remember it.
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (!isApiError(error)) return false
          return error.retryable && failureCount < MAX_RETRIES
        },
      },
      mutations: {
        // Mutations (e.g. create flight) are retried explicitly from the UI so
        // the Founder controls re-submission; no automatic retry here.
        retry: false,
      },
    },
  })
}
