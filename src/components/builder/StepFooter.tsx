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
        'flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between',
        className ?? (compact ? 'mt-[24px]' : 'mt-6 lg:mt-[94px]'),
      )}
    >
      {canGoBack && prevStep ? (
        <Button
          variant="secondary"
          onClick={goBack}
          className="w-full shrink-0 md:w-auto"
        >
          Back to {prevStep.backLabel}
        </Button>
      ) : (
        <Button variant="secondary" onClick={onSaveAndExit} className="w-full shrink-0 max-md:underline md:w-auto">
          Save &amp; Exit
        </Button>
      )}

      {currentStep.continueLabel && (
        <Button
          loading={continueLoading}
          disabled={continueDisabled}
          onClick={handleContinue}
          className="w-full shrink-0 !pr-[11px] md:w-auto"
          trailingAdornment={
            <img src="/svg/arrow.svg" alt="" aria-hidden="true" className="h-[18px] w-[18px]" />
          }
        >
          {label}
        </Button>
      )}
    </div>
  )
}