'use client'

/**
 * Segmented control (the "Specific Date" / "Date Range" switch).
 * The active segment is a filled navy pill on a light track.
 */

import { cn } from '@/utils/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
  className?: string
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-grid h-10 w-full gap-[3px] rounded-[12px] border border-[#CFE3F1] bg-[#CFE3F1]/20 p-[3px]',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'h-[34px] cursor-pointer rounded-[10px] font-sans text-[13px] font-medium leading-4 transition-colors focus-ring',
              active
                ? 'bg-[#0A1B49] text-white'
                : 'bg-transparent text-[#0A1B49] hover:text-[#0A1B49]',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}