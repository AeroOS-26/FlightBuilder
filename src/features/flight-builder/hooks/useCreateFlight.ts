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
import type { ApiError } from '@/types'

export function useCreateFlight() {
  const draft = useFlightBuilderStore((s) => s.draft)
  const founder = useFlightBuilderStore((s) => s.founder)
  const setCreatedFlight = useFlightBuilderStore((s) => s.setCreatedFlight)
  const { goTo } = useStepNavigation()

  const mutation = useMutation({
    mutationFn: () => flightService.createFlight({ draft, founder }),
    onSuccess: ({ flight }) => {
      // Persist the record so the Share step can read it, then advance.
      setCreatedFlight(flight)
      goTo('share')
    },
  })

  return {
    /** Trigger flight creation from the current draft. */
    confirm: () => mutation.mutate(),
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error as ApiError | null,
    flight: mutation.data?.flight ?? null,
    reset: mutation.reset,
  }
}