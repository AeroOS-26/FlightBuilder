'use client'

/**
 * Step navigation hook.
 *
 * Bridges the router and the step config so step components only have to say
 * "go next" / "go back". The draft itself lives in the Zustand store and is
 * untouched by navigation, which is what preserves entered data when moving
 * forward and back.
 */

import { useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  FIRST_STEP,
  getNextStepId,
  getPrevStepId,
  getStep,
  getStepIndex,
  STEPS,
} from '@/features/flight-builder/config/steps'
import type { StepId } from '@/types'

const BUILDER_BASE = '/build'

function isStepId(value: string | undefined): value is StepId {
  return STEPS.some((s) => s.id === value)
}

export function useStepNavigation() {
  const router = useRouter()
  const params = useParams<{ stepId?: string }>()
  const rawStepId = typeof params.stepId === 'string' ? params.stepId : undefined

  // Fall back to the first step if the URL segment isn't a known step.
  const currentStepId: StepId = isStepId(rawStepId) ? rawStepId : FIRST_STEP

  const current = useMemo(() => getStep(currentStepId), [currentStepId])
  const index = getStepIndex(currentStepId)
  const nextStepId = getNextStepId(currentStepId)
  const prevStepId = getPrevStepId(currentStepId)
  const prevStep = prevStepId ? getStep(prevStepId) : null
  const nextStep = nextStepId ? getStep(nextStepId) : null

  const goTo = useCallback(
    (stepId: StepId) => router.push(`${BUILDER_BASE}/${stepId}`),
    [router],
  )

  const goNext = useCallback(() => {
    if (nextStepId) goTo(nextStepId)
  }, [nextStepId, goTo])

  const goBack = useCallback(() => {
    if (prevStepId) goTo(prevStepId)
  }, [prevStepId, goTo])

  return {
    currentStep: current,
    currentStepId,
    prevStep,
    nextStep,
    stepIndex: index,
    totalSteps: STEPS.length,
    canGoBack: prevStepId !== null,
    canGoNext: nextStepId !== null,
    goTo,
    goNext,
    goBack,
  }
}
