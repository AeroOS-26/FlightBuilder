'use client'

/**
 * Textarea primitive with an optional character counter.
 * Used by the Notes step ("0 / 500").
 */

import { forwardRef } from 'react'
import type { TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { FieldError } from './FormField'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
  /** When set, renders a "{length} / {maxCount}" counter under the field. */
  maxCount?: number
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ invalid, maxCount, error, className, value, ...props }, ref) {
    const length = typeof value === 'string' ? value.length : 0
    const showFooter = maxCount !== undefined || Boolean(error)

    return (
      <div className="flex flex-col">
        <textarea
          ref={ref}
          value={value}
          aria-invalid={invalid || undefined}
          className={cn(
            'w-full resize-none rounded-xl border bg-surface px-3.5 py-3 font-sans text-[14px] font-medium leading-4 text-[#000000] transition-colors',
            'placeholder:text-[#6D6D6D] focus-visible:border-accent focus-visible:outline-none',
            invalid ? 'border-danger bg-danger-soft/40' : 'border-border-strong',
            className,
          )}
          {...props}
        />
        {showFooter && (
          <div className="mt-2 flex items-start justify-between gap-2">
            {error ? (
              <FieldError className="min-w-0 flex-1">{error}</FieldError>
            ) : (
              <span aria-hidden="true" />
            )}
            {maxCount !== undefined && (
              <span
                className={cn(
                  'shrink-0 font-heading text-[14px] font-medium tabular-nums leading-none',
                  length > maxCount ? 'text-danger-text' : 'text-[#000000]/70',
                )}
              >
                {length} / {maxCount}
              </span>
            )}
          </div>
        )}
      </div>
    )
  },
)