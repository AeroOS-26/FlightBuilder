'use client'

/**
 * Text input primitive.
 *
 * Honors the "placeholders stay placeholders" rule — example text is a true
 * HTML placeholder, never a submitted value. Supports leading/trailing icons
 * and an invalid (red border) state. Errors are wired via aria-describedby by
 * the consuming FormField.
 */

import { forwardRef } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Icon } from '@/components/common'
import type { IconName } from '@/components/common'

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  leadingIcon?: IconName
  trailingIcon?: IconName
  /** Arbitrary node pinned to the right (overrides trailingIcon). */
  endAdornment?: ReactNode
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
    { invalid, leadingIcon, trailingIcon, endAdornment, className, ...props },
    ref,
  ) {
    return (
      <div className="relative flex items-center">
        {leadingIcon && (
          <span className="pointer-events-none absolute left-3.5 text-subtle">
            <Icon name={leadingIcon} size={18} />
          </span>
        )}
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(
            'min-h-[40px] w-full rounded-[12px] border py-3 font-sans text-[12px] font-medium leading-[18px] text-[#000000] transition-colors lg:text-[14px] lg:leading-4',
            'placeholder:text-placeholder focus-ring',
            leadingIcon ? 'pl-11' : 'pl-[14px]',
            endAdornment || trailingIcon ? 'pr-11' : 'pr-[14px]',
            invalid
              ? 'border-danger-text bg-error-input-bg focus:outline-none focus:ring-0'
              : 'border-[#1A45BD] bg-white',
            className,
          )}
          {...props}
        />
        {endAdornment ? (
          <span className="absolute right-[14px] flex items-center">{endAdornment}</span>
        ) : (
          trailingIcon && (
            <span className="pointer-events-none absolute right-3.5 text-subtle">
              <Icon name={trailingIcon} size={18} />
            </span>
          )
        )}
      </div>
    )
  },
)