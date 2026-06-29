'use client'

/**
 * Calendar primitive — supports single-day and range selection.
 *
 * Weeks start on Monday (Mon…Sun) to match the design. Past days are disabled,
 * today is marked, and range selection highlights the span between endpoints.
 * Pure controlled component: it owns only the visible month.
 */

import { useState } from 'react'
import { cn } from '@/utils/cn'
import { Icon } from '@/components/common'
import { addMonths, buildMonthGrid, formatMonthLabel, fromISODate } from '@/utils/date'
import type { DateSelection } from '@/types'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface CalendarProps {
  mode: DateSelection['mode']
  start: string | null
  end: string | null
  onChange: (next: { start: string | null; end: string | null }) => void
}

export function Calendar({ mode, start, end, onChange }: CalendarProps) {
  const initial = start ? fromISODate(start) : new Date()
  const [view, setView] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1))

  const todayMonth = new Date()
  const canGoPrev =
    view.getFullYear() > todayMonth.getFullYear() ||
    (view.getFullYear() === todayMonth.getFullYear() &&
      view.getMonth() > todayMonth.getMonth())

  const days = buildMonthGrid(view)

  function handleSelect(iso: string) {
    if (mode === 'specific') {
      onChange({ start: iso, end: null })
      return
    }
    // Range mode.
    if (!start || (start && end)) {
      onChange({ start: iso, end: null })
    } else if (iso < start) {
      onChange({ start: iso, end: start })
    } else {
      onChange({ start, end: iso })
    }
  }

  function dayState(iso: string) {
    const isStart = iso === start
    const isEnd = iso === end
    const inRange =
      mode === 'range' && start && end && iso > start && iso < end ? true : false
    return { isStart, isEnd, inRange, isSelected: isStart || isEnd }
  }

  return (
    <div className="box-border flex w-full max-w-full min-h-[320px] sm:min-h-[370px] flex-col rounded-[20px] border border-[#CFE3F1] bg-[linear-gradient(to_bottom,#FFFFFF_0%,#E8EEFF_28%,#E0E8FF_100%)] p-5 md:max-w-[439px]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => setView((v) => addMonths(v, -1))}
          aria-label="Previous month"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-[#0C0C0E] transition-colors hover:bg-[#F7F8FB] disabled:cursor-not-allowed disabled:opacity-35 focus-ring"
        >
          <Icon name="chevron-left" size={18} />
        </button>
        <span className="min-w-[132px] text-center font-sans text-[14px] font-semibold leading-4 text-[#0C0C0E]">
          {formatMonthLabel(view)}
        </span>
        <button
          type="button"
          onClick={() => setView((v) => addMonths(v, 1))}
          aria-label="Next month"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-[#0C0C0E] transition-colors hover:bg-[#F7F8FB] focus-ring"
        >
          <Icon name="chevron-right" size={18} />
        </button>
        </div>

        <div className="grid grid-cols-7 gap-x-[10px]">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="flex h-5 w-full items-center justify-center font-sans text-[12px] font-medium leading-4 text-[#0C0C0E]/70"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-x-[10px] gap-y-1">
        {days.map((d) => {
          const disabled = d.isPast
          const { isSelected, inRange } = dayState(d.iso)
          return (
            <button
              key={d.iso}
              type="button"
              disabled={disabled}
              onClick={() => handleSelect(d.iso)}
              aria-pressed={isSelected}
              aria-current={d.isToday ? 'date' : undefined}
              className={cn(
                'flex min-w-0 items-center justify-center rounded-[12px] font-sans text-[12px] font-medium leading-4 transition-colors focus-ring h-[38px] w-[38px] md:h-[55.34px] md:w-[55.34px] md:text-[14px]',
                isSelected
                  ? 'bg-[#0A1B49] text-white hover:bg-[#0A1B49]'
                  : inRange
                    ? 'bg-[#ffffff] border border-[112D7C] text-[#0A1B49]'
                    : cn(
                        'bg-white text-[#0C0C0E]',
                        !d.inMonth && 'text-[#0C0C0E]/40',
                        disabled && 'cursor-not-allowed bg-transparent text-[#0C0C0E]/25',
                        !disabled && 'hover:bg-[#F7F8FB]',
                        d.isToday && !isSelected && 'ring-1 ring-inset ring-[#112D7C]/30',
                      ),
              )}
            >
              {d.day}
            </button>
          )
        })}
        </div>
      </div>
    </div>
  )
}