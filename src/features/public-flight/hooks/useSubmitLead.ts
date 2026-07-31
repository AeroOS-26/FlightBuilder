'use client'

/**
 * Submit the MVP interest lead.
 *
 * Wraps the interest-lead service in a TanStack mutation so the form gets
 * pending / success / error for free. On a successful response (success: true)
 * the caller advances to the confirmation state; a handled failure surfaces the
 * error and retry path. Transport/5xx failures reject with a normalized
 * ApiError; a returned { success: false } resolves so the caller can show its
 * message without treating it as a thrown error.
 */

import { useMutation } from '@tanstack/react-query'
import { submitInterestLead, type SubmitLeadArgs } from '@/api/services/interestLeadService'
import type { ApiError } from '@/types'

export function useSubmitLead() {
  const mutation = useMutation({
    mutationFn: (args: SubmitLeadArgs) => submitInterestLead(args),
  })

  return {
    submit: mutation.mutate,
    submitAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error as ApiError | null,
    data: mutation.data ?? null,
    reset: mutation.reset,
  }
}
