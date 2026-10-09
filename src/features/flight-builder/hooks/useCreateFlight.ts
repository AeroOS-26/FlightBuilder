'use client'

/**
 * Create-flight mutation hook.
 *
 * Wraps the flight service in a TanStack Query mutation and, on success,
 * advances to the Share step. The created record (including the tracked share
 * URL) is kept in component-local state by the caller via `data`.
 *
 * This is the single seam the Review step uses to trigger the Zoho write;
 * loading/success/failure are all derived from the mutation status.
 */

import { useMutation } from '@tanstack/react-query'
import { flightService } from '@/api/services'
import { useFlightBuilderStore } from '@/features/flight-builder/store/flightBuilderStore'
import { useStepNavigation } from './useStepNavigation'
import { ACKNOWLEDGMENT_TEXT_VERSION } from '@/features/flight-builder/config/acknowledgment'
import type { ApiError } from '@/types'

export function useCreateFlight() {
  const draft = useFlightBuilderStore((s) => s.draft)
  const founder = useFlightBuilderStore((s) => s.founder)
  const setCreatedFlight = useFlightBuilderStore((s) => s.setCreatedFlight)
  const { goTo } = useStepNavigation()

  const mutation = useMutation({
    // The acceptance rides beside the payload. `founder.id` is the `acct_`
    // string the contract calls `account_id`, not the database row id.
    mutationFn: ({ acknowledged }: { acknowledged: boolean } = { acknowledged: false }) =>
      flightService.createFlight({
        draft,
        founder,
        acknowledgment:
          acknowledged && founder?.id
            ? { accountId: founder.id, textVersion: ACKNOWLEDGMENT_TEXT_VERSION }
            : null,
      }),
    onSuccess: ({ flight }) => {
      // Persist the record so the Share step can read it, then advance.
      setCreatedFlight(flight)
      goTo('share')
    },
  })

  return {
    /** Trigger flight creation from the current draft. */
    confirm: () => mutation.mutate({ acknowledged: false }),
    /** The same, with the organiser's acknowledgment recorded alongside it. */
    confirmWithAcknowledgment: () => mutation.mutate({ acknowledged: true }),
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error as ApiError | null,
    flight: mutation.data?.flight ?? null,
    reset: mutation.reset,
  }
}