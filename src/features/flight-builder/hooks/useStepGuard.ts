'use client'

/**
 * Route guard for the Flight Builder flow.
 *
 * Prevents deep-linking past incomplete steps: if the user opens a step URL
 * (e.g. /build/review) without having legitimately completed the steps before
 * it, they're redirected to the first incomplete step. This enforces the same
 * gating the Continue buttons do, so a manual URL change can't bypass the flow.
 *
 * Runs client-side after store hydration, because completion is derived from the
 * draft in the (sessionStorage-persisted) Zustand store — not available during
 * the server render / static generation of the step page.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFlightBuilderStore } from '@/features/flight-builder/store/flightBuilderStore'
import {
  FIRST_STEP,
  getStepIndex,
} from '@/features/flight-builder/config/steps'
import { firstIncompleteStep } from '@/features/flight-builder/validation'
import type { StepId } from '@/types'

interface StepGuard {
  /** True once hydration has settled and any needed redirect has been decided. */
  ready: boolean
}

export function useStepGuard(currentStepId: StepId): StepGuard {
  const router = useRouter()
  const draft = useFlightBuilderStore((s) => s.draft)
  const createdFlight = useFlightBuilderStore((s) => s.createdFlight)
  const [hasHydrated, setHasHydrated] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  // Wait for the persisted store to hydrate before judging completeness — the
  // draft is empty on first client render otherwise, which would bounce every
  // deep link (including legitimate refreshes mid-flow).
  useEffect(() => {
    const persist = useFlightBuilderStore.persist
    if (!persist || persist.hasHydrated()) {
      setHasHydrated(true)
      return
    }
    return persist.onFinishHydration(() => setHasHydrated(true))
  }, [])

  useEffect(() => {
    if (!hasHydrated) return

    const target = resolveRedirect(currentStepId, draft, Boolean(createdFlight))
    if (target && target !== currentStepId) {
      setRedirecting(true)
      router.replace(`/build/${target}`)
    } else {
      setRedirecting(false)
    }
  }, [hasHydrated, currentStepId, draft, createdFlight, router])

  return { ready: hasHydrated && !redirecting }
}

/**
 * Where the user should be sent, or `null` if the current step is allowed.
 *
 * Rule: you may sit on any completed step or the first incomplete one, but not
 * beyond it. The Share step additionally requires a created flight.
 */
function resolveRedirect(
  currentStepId: StepId,
  draft: Parameters<typeof firstIncompleteStep>[0],
  hasCreatedFlight: boolean,
): StepId | null {
  // Share is a post-creation screen — gated by the created flight, not the draft.
  if (currentStepId === 'share') {
    return hasCreatedFlight ? null : FIRST_STEP
  }

  const blockedAt = firstIncompleteStep(draft)
  if (!blockedAt) return null // Whole gated flow is complete — any step allowed.

  // Allow the blocking step itself and anything before it; redirect the rest.
  if (getStepIndex(currentStepId) > getStepIndex(blockedAt)) {
    return blockedAt
  }
  return null
}
