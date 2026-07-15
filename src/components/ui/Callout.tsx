'use client'

/**
 * Inline callouts: the soft blue info note and the red validation banner.
 * Both appear inside step cards.
 */

import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Icon } from '@/components/common'

interface InfoNoteProps {
  children: ReactNode
  className?: string
}

/** Soft blue note, e.g. "Don't worry about exact airports yet…". */
export function InfoNote({ children, className }: InfoNoteProps) {
  return (
    <div
      className={cn(
        'flex min-h-[40px] w-full  items-center gap-2 rounded-[12px] border border-[#D0CFDB]/24 bg-[#CFE3F1]/30 p-3',
        className,
      )}
    >
      <img
        src="/svg/infoIcon.svg"
        alt=""
        aria-hidden="true"
        className="size-4 shrink-0"
      />
      <p className="font-sans text-[12px] font-normal leading-4 tracking-[-0.1px] text-[#112D7C] lg:text-[14px] lg:font-medium lg:tracking-normal">
        {children}
      </p>
    </div>
  )
}

interface ErrorBannerProps {
  children: ReactNode
  className?: string
}

/** Red validation banner shown at the top of a step card. */
export function ErrorBanner({ children, className }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={cn(
        'relative flex min-h-[40px] items-center gap-2 rounded-[12px] bg-error-banner-bg p-3 md:items-center',
        className,
      )}
    >
      <Icon
        name="alert"
        size={12}
        className="mt-0.5 h-3 w-3 shrink-0 text-danger-text md:mt-px md:h-4 md:w-4"
        strokeWidth={2}
      />
      <div className="flex min-w-0 flex-1 items-stretch gap-1.5 md:contents">
        <p className="min-w-0 flex-1 font-sans text-[12px] font-normal leading-[15px] tracking-normal text-danger-text md:max-w-[638.52px] md:flex-none md:text-[14px] md:font-medium md:leading-4">
          {children}
        </p>
        <div
          aria-hidden="true"
          className="w-[3.5px] shrink-0 self-stretch rounded-full bg-danger-text md:hidden"
        />
      </div>
      <div
        aria-hidden="true"
        className="absolute right-3 top-1/2 hidden h-[60%] w-[3.5px] -translate-y-1/2 rounded-full bg-danger-text md:block"
      />
    </div>
  )
}