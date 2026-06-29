/**
 * Step definitions for the multi-step creation flow.
 *
 * Flow order is locked by the spec:
 *   Route -> Dates -> Pets & passengers -> Notes -> Review -> Share link
 *
 * The Share step is the post-creation success screen and is intentionally
 * excluded from the stepper.
 */

import type { IconName } from '@/components/common/Icon'

/** Stable, URL-safe id for each step. Used as the route segment. */
export type StepId = 'route' | 'dates' | 'pets' | 'notes' | 'review' | 'share'

export interface StepDefinition {
  id: StepId
  /** Sentence/Title-case label shown in the stepper. */
  label: string
  /** Glyph shown in the stepper node. */
  icon: IconName
  /** Route path segment, e.g. "route" -> /build/route. */
  path: StepId
  /** Whether the step appears in the progress stepper. */
  showInStepper: boolean
  /**
   * Whether this step can be advanced past without input.
   * Only the Notes step is skippable.
   */
  skippable: boolean
  /**
   * Label for the primary "Continue to X" button.
   * Null on steps without a forward action handled by the shared footer.
   */
  continueLabel: string | null
  /** How this step is referred to in a "Back to {…}" control. */
  backLabel: string
}
