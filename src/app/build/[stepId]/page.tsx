/**
 * Dynamic step route — renders the Flight Builder step matching the [stepId]
 * URL segment. Replaces the previous React Router <StepOutlet />.
 *
 * Unknown segments redirect to the first step. Known steps are pre-rendered as
 * static params so each step has its own static route.
 */

import { redirect } from 'next/navigation'
import {
  RouteStep,
  DatesStep,
  PetsStep,
  NotesStep,
  ReviewStep,
  ShareStep,
} from '@/features/flight-builder/steps'
import { FIRST_STEP, STEP_IDS } from '@/features/flight-builder/config/steps'
import type { StepId } from '@/types'

const stepComponents: Record<StepId, React.ComponentType> = {
  route: RouteStep,
  dates: DatesStep,
  pets: PetsStep,
  notes: NotesStep,
  review: ReviewStep,
  share: ShareStep,
}

function isStepId(value: string): value is StepId {
  return STEP_IDS.includes(value as StepId)
}

export function generateStaticParams() {
  return STEP_IDS.map((stepId) => ({ stepId }))
}

export default async function StepPage({
  params,
}: {
  params: Promise<{ stepId: string }>
}) {
  const { stepId } = await params
  if (!isStepId(stepId)) redirect(`/build/${FIRST_STEP}`)

  const StepComponent = stepComponents[stepId]
  return <StepComponent />
}
