'use client'

/**
 * Step footer controls.
 *
 * Left side: "Save & Exit" on the first step, otherwise "Back to {prev}".
 * Right side: the primary "Continue to X" (or "Create Shared Flight") button,
 * whose label comes from the step config. The continue handler defaults to
 * advancing the flow; steps override it to run their validation gate first.
 */

import { Button } from '@/components/ui'
import { useStepNavigation } from '@/features/flight-builder/hooks/useStepNavigation'
import { cn } from '@/utils/cn'

interface StepFooterProps {
  onContinue?: () => void
  continueLabel?: string
  continueLoading?: boolean
  continueDisabled?: boolean
  onSaveAndExit?: () => void
  /** Tighter 24px gap above footer (e.g. when validation errors are visible). */
  compact?: boolean
  className?: string
}

export function StepFooter({
  onContinue,
  continueLabel,
  continueLoading,
  continueDisabled,
  onSaveAndExit,
  compact,
  className,
}: StepFooterProps) {
  const { currentStep, prevStep, canGoBack, goBack, goNext } = useStepNavigation()

  const label = continueLabel ?? currentStep.continueLabel ?? 'Continue'
  const handleContinue = onContinue ?? goNext

  return (
    <div
      className={cn(
        // One row within the card: Back stays compact on the left, Continue takes
        // the space it needs on the right. min-w-0 + overflow-hidden keep the row
        // inside the card; a long Continue label truncates rather than spilling out.
        'flex min-w-0 flex-row items-center justify-between gap-3 overflow-hidden px-4 py-4',
        // Consistent gap above the footer on every step — matches the Figma's
        // breathing room between the last content block and the buttons.
        className ?? 'mt-10',
      )}
    >
      {canGoBack && prevStep ? (
        <Button
          variant="secondary"
          onClick={goBack}
          className="w-auto shrink-0 whitespace-nowrap"
        >
          Back to {prevStep.backLabel}
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={onSaveAndExit}
          className="w-auto shrink-0 whitespace-nowrap"
        >
          Save &amp; Exit
        </Button>
      )}

      {currentStep.continueLabel && (
        <Button
          loading={continueLoading}
          disabled={continueDisabled}
          onClick={handleContinue}
          className="w-auto min-w-0 whitespace-nowrap"
          trailingAdornment={
            <img src="/svg/arrow.svg" alt="" aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
          }
        >
          <span className="truncate">{label}</span>
        </Button>
      )}
    </div>
  )
}