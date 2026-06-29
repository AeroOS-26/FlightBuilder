'use client'

/** Section heading used at the top of a step's form card. */

import type { ReactNode } from 'react'
import { SubHeadingInfoTooltip } from '@/components/ui'
import { cn } from '@/utils/cn'

interface SectionHeadingProps {
  title: string
  description?: ReactNode
  descriptionClassName?: string
  className?: string
}

export function SectionHeading({
  title,
  description,
  descriptionClassName,
  className,
}: SectionHeadingProps) {
  return (
    <div className={className}>
      <h2 className="font-heading text-[18px] font-medium leading-[22px] tracking-tight text-[#000000] lg:text-[20px] lg:leading-6">
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            'mt-1.5 font-sans text-[12px] font-medium leading-[18px] tracking-normal lg:text-[14px] lg:leading-4',
            descriptionClassName ?? 'text-[#000000]/70',
          )}
        >
          {description}
        </p>
      )}
    </div>
  )
}

interface SubHeadingProps {
  title: string
  description?: ReactNode
  /** Tooltip shown beside the title (info icon). */
  infoTooltip?: ReactNode
  action?: ReactNode
  className?: string
}

/** Smaller heading for sub-sections (e.g. "Travelers", "Bringing pets?"). */
export function SubHeading({
  title,
  description,
  infoTooltip,
  action,
  className,
}: SubHeadingProps) {
  const titleEl = (
    <h3 className="font-heading text-[16px] font-medium leading-[19px] text-[#000000] lg:text-[20px] lg:leading-6">
      {title}
    </h3>
  )

  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      {infoTooltip ? (
        <SubHeadingInfoTooltip
          title={titleEl}
          tooltip={infoTooltip}
          description={description}
        />
      ) : (
        <div className="min-w-0 flex-1">
          {titleEl}
          {description && (
            <p className="mt-1.5 font-sans text-[12px] font-medium leading-[18px] text-[#000000]/70 lg:text-[14px] lg:leading-4">
              {description}
            </p>
          )}
        </div>
      )}
      {action}
    </div>
  )
}