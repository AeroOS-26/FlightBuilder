'use client'

/**
 * Shared two-column scaffold for an in-flow step.
 *
 * Left: the white form card with the step body and the navigation footer.
 * Right: the contextual side panels ("How it works", "Why we ask", the trip
 * summary). On small screens the panels stack above the form as collapsible
 * accordions; on large screens they sit in the right column.
 */

import type { ReactNode } from 'react'
import { Card } from '@/components/ui'
import { StepFooter } from '@/components/builder/StepFooter'
import { cn } from '@/utils/cn'

interface StepShellProps {
  children: ReactNode
  aside?: ReactNode
  onContinue?: () => void
  continueLabel?: string
  continueLoading?: boolean
  continueDisabled?: boolean
  onSaveAndExit?: () => void
  /** Override the body padding (e.g. for edge-to-edge content). */
  bodyClassName?: string
  /** Override footer spacing (e.g. tighter gap when validation errors are visible). */
  footerCompact?: boolean
  /** Override footer top margin (e.g. Notes step uses 48px). */
  footerClassName?: string
  /** Mobile/tablet gap between aside stack and form card (default 20px). */
  stackClassName?: string
  /** Mobile/tablet gap between aside panels (default 16px). */
  asideClassName?: string
}

export function StepShell({
  children,
  aside,
  onContinue,
  continueLabel,
  continueLoading,
  continueDisabled,
  onSaveAndExit,
  bodyClassName,
  footerCompact,
  footerClassName,
  stackClassName,
  asideClassName,
}: StepShellProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-5 max-lg:gap-5 lg:grid lg:grid-cols-[minmax(0,1.72fr)_minmax(0,1fr)] lg:items-start lg:gap-5',
        stackClassName,
      )}
    >
      {aside && (
        <aside
          className={cn(
            'order-1 flex animate-fade-in flex-col gap-4 max-lg:gap-4 lg:order-none lg:col-start-2 lg:row-start-1 lg:gap-5',
            asideClassName,
          )}
        >
          {aside}
        </aside>
      )}
      <Card
        padding="none"
        className="order-2 flex animate-fade-in flex-col rounded-[20px] border border-[#A8A8A8]/20 bg-[#F8F9FD] max-lg:bg-[#F8F9FD] lg:order-none lg:col-start-1 lg:row-start-1 lg:bg-[#F8F9FD]"
      >
        <div className={cn('flex flex-col', bodyClassName ?? 'p-4')}>{children}</div>
        <StepFooter
          onContinue={onContinue}
          continueLabel={continueLabel}
          continueLoading={continueLoading}
          continueDisabled={continueDisabled}
          onSaveAndExit={onSaveAndExit}
          compact={footerCompact}
          className={footerClassName}
        />
      </Card>

    </div>
  )
}