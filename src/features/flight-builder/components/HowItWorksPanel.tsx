'use client'

/**
 * "How it works" panel — the numbered overview shown on the Route step.
 * The item matching the current step is highlighted ("you're here").
 * On mobile, the panel collapses to a header row with a chevron.
 */

import { useState } from 'react'
import { Card } from '@/components/ui'
import { Icon } from '@/components/common'
import { cn } from '@/utils/cn'
import type { StepId } from '@/types'

interface HowItWorksItem {
  step: StepId
  label: string
}

const ITEMS: HowItWorksItem[] = [
  { step: 'route', label: 'Tell us your route' },
  { step: 'dates', label: 'Pick your dates' },
  { step: 'pets', label: 'Add who’s flying and any pets' },
  { step: 'notes', label: 'Add any notes' },
  { step: 'review', label: 'Review and create your shared flight' },
]

interface HowItWorksPanelProps {
  currentStepId: StepId
}

export function HowItWorksPanel({ currentStepId }: HowItWorksPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <Card
      padding="none"
      className="flex flex-col gap-6 rounded-[20px] border border-[#A8A8A8]/20 bg-white p-4 shadow-none"
    >
      <div className="hidden items-center justify-between gap-3 lg:flex">
        <h3 className="font-heading text-[20px] font-medium leading-6 text-[#000000]">
          How it works
        </h3>
        <span className="font-sans text-[12px] font-medium uppercase tracking-normal text-[#080B2B]/60">
          5 quick steps · about 2 min
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <div className="flex min-w-0 flex-1 items-center justify-start md:justify-between gap-2">
          <h3 className="font-heading text-[16px] font-medium leading-none text-[#000000]">
            How it works
          </h3>
          <span className="shrink-0 font-sans text-[12px] font-medium uppercase tracking-normal text-[#080B2B]">
            5 quick steps · about 2 min
          </span>
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? 'Collapse How it works' : 'Expand How it works'}
          onClick={() => setOpen((value) => !value)}
          className="shrink-0 text-accent"
        >
          <Icon
            name="chevron-down"
            size={20}
            className={cn('transition-transform', open && 'rotate-180')}
          />
        </button>
      </div>
      <ol className={cn('space-y-4', open ? 'block' : 'hidden lg:block')}>
        {ITEMS.map((item, index) => {
          const active = item.step === currentStepId
          return (
            <li key={item.step} className="flex items-center gap-3">
              <span
                className={cn(
                  'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
                  active
                    ? 'bg-accent text-white'
                    : 'border border-[#CFE3F1] bg-[#ECF4F9] text-[#080B2B]',
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  'font-sans text-[16px] leading-6',
                  active ? 'font-medium text-accent' : 'font-medium text-[#6D6D6D]',
                )}
              >
                {item.label}
                {active && <span className="text-accent"> — you’re here</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}