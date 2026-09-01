'use client'

/**
 * Checkbox primitive with a custom check glyph.
 * Used by the pet travel-readiness disclaimer; supports an invalid (red) state.
 */

import { useId } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Icon } from '@/components/common'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  invalid?: boolean
  /**
   * Renders unusable and announces itself as such. Used where the box depends
   * on something else being filled in first — frame 31's "Text me" has no
   * meaning until there is a phone number to text.
   *
   * A real `disabled` attribute rather than pointer-events styling, so keyboard
   * users skip it and screen readers say so.
   */
  disabled?: boolean
  id?: string
  className?: string
  children: ReactNode
}

export function Checkbox({
  checked,
  onChange,
  invalid,
  disabled = false,
  id,
  className,
  children,
}: CheckboxProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <label
      htmlFor={inputId}
      className={cn(
        'inline-flex items-center gap-2 font-sans text-[14px] font-normal leading-[140%] text-[#000000]',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        className,
      )}
    >
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={cn(
            'flex h-[18px] w-[18px] items-center justify-center rounded-[6px] border transition-colors',
            'peer-focus-visible:shadow-focus',
            checked
              ? 'border-[#112D7C] bg-[#112D7C] text-white'
              : invalid
                ? 'border-danger-text border-[1.5px] bg-[#ffffff]'
                : 'border-[#000000] bg-white',
          )}
        >
          {checked && <Icon name="check" size={13} strokeWidth={2.5} />}
        </span>
      </span>
      <span>{children}</span>
    </label>
  )
}