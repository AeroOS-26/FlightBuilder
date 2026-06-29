'use client'

/**
 * Toggle switch primitive (the "Bringing pets?" control).
 * Figma: 36×22 track, 16px radius, 4px padding, 14×14 white knob.
 */

import { cn } from '@/utils/cn'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
}

export function Toggle({ checked, onChange, label, className }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex h-[22px] w-9 shrink-0 items-center rounded-[16px] p-1 transition-colors duration-200 focus-ring',
        checked ? 'bg-[#112D7C]' : 'bg-[#D0CFDB]',
        className,
      )}
    >
      <span
        className={cn(
          'size-[14px] shrink-0 rounded-full bg-white transition-transform duration-200',
          checked ? 'translate-x-[14px]' : 'translate-x-0',
        )}
      />
    </button>
  )
}