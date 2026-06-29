/**
 * Single source of truth for the Flight Builder step flow.
 *
 * Order, labels, icons, and "Continue to X" / "Back to X" copy live here and
 * drive the stepper, the router, and navigation. Changing the flow is a
 * one-line edit in this array.
 */

import type { StepDefinition, StepId } from '@/types'

export const STEPS: readonly StepDefinition[] = [
  {
    id: 'route',
    label: 'Route',
    icon: 'route',
    path: 'route',
    showInStepper: true,
    skippable: false,
    continueLabel: 'Continue To Dates',
    backLabel: 'Details',
  },
  {
    id: 'dates',
    label: 'Dates',
    icon: 'calendar',
    path: 'dates',
    showInStepper: true,
    skippable: false,
    continueLabel: 'Continue To Pets & Passengers',
    backLabel: 'Dates',
  },
  {
    id: 'pets',
    label: 'Pets & Passengers',
    icon: 'pets',
    path: 'pets',
    showInStepper: true,
    skippable: false,
    continueLabel: 'Continue To Notes',
    backLabel: 'Pets & Passengers',
  },
  {
    id: 'notes',
    label: 'Notes',
    icon: 'notes',
    path: 'notes',
    showInStepper: true,
    skippable: true,
    continueLabel: 'Continue to Review',
    backLabel: 'Notes',
  },
  {
    id: 'review',
    label: 'Review',
    icon: 'review',
    path: 'review',
    showInStepper: true,
    skippable: false,
    continueLabel: 'Create Shared Flight',
    backLabel: 'Review',
  },
  {
    id: 'share',
    label: 'Share link',
    icon: 'arrow-right',
    path: 'share',
    showInStepper: false,
    skippable: false,
    continueLabel: null,
    backLabel: 'Share link',
  },
] as const

export const FIRST_STEP: StepId = STEPS[0].id

/** Steps that appear in the progress indicator (excludes the Share screen). */
export const STEPPER_STEPS: readonly StepDefinition[] = STEPS.filter(
  (s) => s.showInStepper,
)

/** Ordered list of step ids, e.g. for index math in the stepper. */
export const STEP_IDS: readonly StepId[] = STEPS.map((s) => s.id)

export function getStep(id: StepId): StepDefinition {
  const step = STEPS.find((s) => s.id === id)
  if (!step) throw new Error(`Unknown step id: ${id}`)
  return step
}

export function getStepIndex(id: StepId): number {
  return STEP_IDS.indexOf(id)
}

export function getNextStepId(id: StepId): StepId | null {
  const index = getStepIndex(id)
  return index >= 0 && index < STEPS.length - 1 ? STEPS[index + 1].id : null
}

export function getPrevStepId(id: StepId): StepId | null {
  const index = getStepIndex(id)
  return index > 0 ? STEPS[index - 1].id : null
}
