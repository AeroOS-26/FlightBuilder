'use client'

/**
 * Single-select pill group (the pet "Temperament (pick one)" control).
 */

import { cn } from '@/utils/cn'

interface PillGroupProps<T extends string> {
  value: T | ''
  options: readonly T[]
  onChange: (value: T) => void
  invalid?: boolean
  className?: string
}

export function PillGroup<T extends string>({
  value,
  options,
  onChange,
  invalid,
  className,
}: PillGroupProps<T>) {
  return (
    <div
      className={cn('flex flex-wrap justify-start gap-2', className)}
      aria-invalid={invalid || undefined}
    >
      {options.map((opt) => {
        const active = opt === value
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt)}
            className={cn(
              'inline-flex h-[34px] items-center rounded-[12px] border border-[#A8A8A8]/20 font-sans text-[12px] font-medium leading-[18px] transition-colors focus-ring',
              active
                ? 'border-[#A8A8A8]/20 bg-[#112D7C] px-[12px] py-[9px] text-white'
                : 'bg-[#F5F5F5]/45 px-[12px] py-[9px] text-[#000000]/90 hover:text-[#000000]',
            )}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}