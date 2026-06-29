'use client'

/**
 * Select primitive — a styled native <select> with a chevron affordance.
 *
 * Native is intentional: it gives correct mobile behavior and accessibility
 * for free. A placeholder option (empty value) renders as muted until a real
 * choice is made, honoring the "placeholders stay placeholders" rule.
 */

import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { Icon } from '@/components/common'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[]
  placeholder?: string
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, placeholder, invalid, className, value, ...props },
  ref,
) {
  const isPlaceholder = value === '' || value === undefined
  return (
    <div className="relative flex items-center">
      <select
        ref={ref}
        value={value}
        aria-invalid={invalid || undefined}
        className={cn(
          'min-h-[40px] w-full appearance-none rounded-[12px] border py-3 pl-[14px] pr-10 font-sans text-[12px] font-medium leading-[18px] transition-colors lg:text-[14px] lg:leading-4',
          'focus-ring',
          isPlaceholder ? 'text-placeholder' : 'text-[#000000]',
          invalid
            ? 'border-danger-text bg-error-input-bg focus:outline-none focus:ring-0'
            : 'border-[#1A45BD] bg-white',
          className,
        )}
        {...props}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-[14px] text-subtle">
        <Icon name="chevron-down" size={18} />
      </span>
    </div>
  )
})