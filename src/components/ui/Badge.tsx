'use client'

/**
 * Badge / pill label primitive.
 *
 * Used for the "Recommended" tag, status chips (FORMING, CONDITIONAL),
 * the Review timeline chips (Immediately / Filling / On fill), and the
 * "FLIGHT CREATED" eyebrow.
 */

import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type Tone = 'accent' | 'success' | 'warning' | 'neutral' | 'recommend'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
  /** UPPERCASE, letter-spaced eyebrow style. */
  uppercase?: boolean
}

const toneClasses: Record<Tone, string> = {
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success-text',
  warning: 'bg-warning-soft text-warning-text',
  neutral: 'bg-surface-muted text-muted border border-border',
  recommend: 'bg-[#E96A6F] text-white',
}

export function Badge({
  tone = 'neutral',
  uppercase = false,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ',
        uppercase && 'uppercase tracking-[0.08em]',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}