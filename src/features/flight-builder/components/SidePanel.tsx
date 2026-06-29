'use client'

/**
 * Generic contextual side panel (a titled card with an optional uppercase
 * eyebrow on the right). Used to compose "Why we ask", "Date flexibility
 * helps", "Get help", etc. On mobile, collapses to a header row with a chevron.
 */

import { useState, type ReactNode } from 'react'
import { Card, DashedOutline, dashedPanelSurfaceClass } from '@/components/ui'
import { Icon } from '@/components/common'
import { cn } from '@/utils/cn'

interface SidePanelProps {
  title: string
  eyebrow?: string
  children: ReactNode
  className?: string
  /** When false, content stays visible on mobile with no chevron toggle. */
  collapsible?: boolean
  defaultOpen?: boolean
}

export function SidePanel({
  title,
  eyebrow,
  children,
  className,
  collapsible = true,
  defaultOpen = false,
}: SidePanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const isCollapsed = collapsible && !open

  return (
    <Card
      padding="none"
      className={cn(
        'flex flex-col rounded-[20px] border border-[#A8A8A8]/20 bg-white p-4 shadow-none',
        'max-lg:box-border max-lg:gap-0',
        collapsible && isCollapsed ? 'max-lg:h-[54px] max-lg:overflow-hidden' : 'max-lg:h-auto',
        'lg:gap-6',
        className,
      )}
    >
      <div className="hidden items-center justify-between gap-3 lg:flex">
        <h3 className="font-heading text-[20px] font-medium leading-6 text-[#000000]">
          {title}
        </h3>
        {eyebrow && (
          <span className="font-sans text-[10.5px] font-semibold uppercase tracking-[0.07em] text-subtle">
            {eyebrow}
          </span>
        )}
      </div>
      {collapsible ? (
        <div className="flex w-full flex-1 items-center justify-between gap-3 lg:hidden">
          <h3 className="font-heading text-[16px] font-medium leading-[19px] text-[#000000]">
            {title}
          </h3>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? `Collapse ${title}` : `Expand ${title}`}
            onClick={() => setOpen((value) => !value)}
            className="shrink-0 text-accent"
          >
            <Icon
              name="chevron-down"
              size={20}
              className={cn('transition-transform', open && 'rotate-180')}
            />
          </button>
        </div>
      ) : (
        <h3 className="font-heading text-[16px] font-medium leading-[19px] text-[#000000] lg:hidden">
          {title}
        </h3>
      )}
      <div
        className={cn(
          'space-y-4 font-sans text-[12px] font-medium leading-[18px] text-[#000000]/70 lg:text-[14px] lg:font-normal lg:leading-5 lg:text-[#000000]',
          collapsible
            ? open
              ? 'max-lg:mt-4 block'
              : 'hidden lg:mt-0 lg:block'
            : 'max-lg:mt-1 block lg:mt-0',
        )}
      >
        {children}
      </div>
    </Card>
  )
}

/** A dashed-outline variant used for secondary/legal panels (e.g. Privacy). */
export function DashedPanel({ title, children, className }: Omit<SidePanelProps, 'eyebrow'>) {
  return (
    <div className={cn(dashedPanelSurfaceClass, 'p-4', className)}>
      <DashedOutline />
      <div className="relative">
        <h3 className="font-heading text-[16px] font-medium leading-[19px] text-[#000000] lg:text-[20px] lg:leading-6">{title}</h3>
        <div className="mt-1 font-sans text-[14px] font-normal leading-5 text-[#000000] lg:text-[14px] lg:font-medium lg:leading-[130%] lg:text-[#000000]/70">
          {children}
        </div>
      </div>
    </div>
  )
}