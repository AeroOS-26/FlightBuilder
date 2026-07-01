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
  const backText =
    canGoBack && prevStep ? `Back to ${prevStep.backLabel}` : 'Save & Exit'
  const useMobileStack = label.length > 22 || backText.length > 22

  return (
    <div
      className={cn(
        'flex min-w-0 gap-3 px-4 py-4',
        useMobileStack
          ? 'max-md:flex-col max-md:gap-3'
          : 'max-md:flex-row max-md:items-center max-md:justify-between max-md:gap-2',
        'md:flex-row md:items-center md:justify-between',
        className ?? (compact ? 'mt-[24px]' : 'mt-6 lg:mt-[94px]'),
      )}
    >
      {canGoBack && prevStep ? (
        <Button
          variant="secondary"
          onClick={goBack}
          className={cn(
            'w-full md:w-auto',
            !useMobileStack && 'max-md:w-auto max-md:shrink-0',
          )}
        >
          Back to {prevStep.backLabel}
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={onSaveAndExit}
          className={cn(
            'w-full md:w-auto',
            !useMobileStack && 'max-md:w-auto max-md:shrink-0',
          )}
        >
          Save &amp; Exit
        </Button>
      )}

      {currentStep.continueLabel && (
        <Button
          loading={continueLoading}
          disabled={continueDisabled}
          onClick={handleContinue}
          className={cn(
            'w-full pr-[11px]! md:w-auto',
            !useMobileStack && 'max-md:w-auto max-md:shrink-0',
          )}
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