'use client'

/**
 * Textarea primitive with an optional character counter.
 * Used by the Notes step ("0 / 500").
 */

import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
  /** When set, renders a "{length} / {maxCount}" counter under the field. */
  maxCount?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ invalid, maxCount, className, value, ...props }, ref) {
    const length = typeof value === 'string' ? value.length : 0
    return (
      <div className="flex flex-col">
        <textarea
          ref={ref}
          value={value}
          aria-invalid={invalid || undefined}
          className={cn(
            'w-full resize-none rounded-xl border bg-surface px-3.5 py-3 font-sans text-[14px] font-medium leading-4 text-[#000000] transition-colors',
            'placeholder:text-[#6D6D6D] focus-ring',
            invalid ? 'border-danger bg-danger-soft/40' : 'border-border-strong',
            className,
          )}
          {...props}
        />
        {maxCount !== undefined && (
          <span
            className={cn(
              'mt-2 self-end font-heading text-[14px] font-medium tabular-nums leading-none',
              length > maxCount ? 'text-danger-text' : 'text-[#000000]/70',
            )}
          >
            {length} / {maxCount}
          </span>
        )}
      </div>
    )
  },
)