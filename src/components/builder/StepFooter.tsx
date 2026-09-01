'use client'

/**
 * Step footer controls.
 *
 * Left side: "Exit" on the first step, otherwise "Back to {prev}".
 * Right side: the primary "Continue to X" (or "Create Shared Flight") button,
 * whose label comes from the step config. The continue handler defaults to
 * advancing the flow; steps override it to run their validation gate first.
 *
 * This button read "Save & Exit" and had no handler on any step — no caller
 * ever passed `onSaveAndExit`, so it was dead. It now leaves for the marketing
 * site, and is labelled "Exit" rather than "Save & Exit": there is no member
 * dashboard to save a draft into, and the draft only lives in this tab's
 * sessionStorage, so "Save" would promise persistence we do not have. Restore
 * the longer label once drafts are saved server-side.
 */

import { Button } from '@/components/ui'
import { env } from '@/config/env'
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
        // One row within the card: Back on the left, Continue on the right.
        //
        // Stacked below 440px, because that is the width the mobile artboards
        // are drawn at and the point where the longest pairs stop fitting.
        // "Back to Pets & Passengers" (193px) beside "Continue to Review"
        // (169px) needs 374px of the 324px a 390px phone leaves — a 50px
        // shortfall that cannot come out of 14px of button padding.
        //
        // It used to squeeze instead: Back held its width, Continue absorbed
        // the whole shortfall, and the row hid the overflow, so the label lost
        // its first characters and read "ontinue to review".
        'flex min-w-0 flex-col items-stretch gap-3 px-4 py-4',
        'min-[440px]:flex-row min-[440px]:items-center min-[440px]:justify-between',
        // Consistent gap above the footer on every step — matches the Figma's
        // breathing room between the last content block and the buttons.
        className ?? 'mt-10',
      )}
    >
      {canGoBack && prevStep ? (
        <Button
          variant="secondary"
          onClick={goBack}
          className="w-full shrink-0 whitespace-nowrap min-[440px]:w-auto"
        >
          Back to {prevStep.backLabel}
        </Button>
      ) : (
        <Button
          variant="secondary"
          onClick={onSaveAndExit ?? (() => { window.location.href = env.marketingSiteUrl })}
          className="w-full shrink-0 whitespace-nowrap min-[440px]:w-auto"
        >
          Exit
        </Button>
      )}

      {currentStep.continueLabel && (
        <Button
          loading={continueLoading}
          disabled={continueDisabled}
          onClick={handleContinue}
          className="w-full whitespace-nowrap min-[440px]:w-auto"
          trailingAdornment={
            <img src="/svg/arrow.svg" alt="" aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
          }
        >
          <span>{label}</span>
        </Button>
      )}
    </div>
  )
}