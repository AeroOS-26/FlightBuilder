'use client'

/**
 * Dates step.
 *
 * A segmented control switches between a single travel day and a flexible
 * range. The inline calendar drives selection; the read-only fields above it
 * display the current choice. Past dates are disabled and validated.
 */

import { useState } from 'react'
import { StepShell } from './StepShell'
import {
  Calendar,
  FieldError,
  FormField,
  InfoNote,
  SegmentedControl,
  TextInput,
} from '@/components/ui'
import type { SegmentOption } from '@/components/ui'
import { SectionHeading, SidePanel, TripRouteHeader } from '@/features/flight-builder/components'
import { useFlightBuilderStore } from '@/features/flight-builder/store/flightBuilderStore'
import { useStepNavigation } from '@/features/flight-builder/hooks'
import { validateDates, hasDateErrors } from '@/features/flight-builder/validation'
import { formatLongDate } from '@/utils/date'
import type { DateMode } from '@/types'

const MODE_OPTIONS: SegmentOption<DateMode>[] = [
  { value: 'specific', label: 'Specific Date' },
  { value: 'range', label: 'Date Range' },
]

const calendarInputIcon = (
  <img src="/svg/calenderstepicon.svg" alt="" aria-hidden="true" className="size-[16px]" />
)

export function DatesStep() {
  const date = useFlightBuilderStore((s) => s.draft.date)
  const setDate = useFlightBuilderStore((s) => s.setDate)
  const { goNext } = useStepNavigation()
  const [submitted, setSubmitted] = useState(false)

  const errors = submitted ? validateDates(date) : {}

  function handleContinue() {
    setSubmitted(true)
    if (!hasDateErrors(validateDates(date))) goNext()
  }

  return (
    <StepShell
      onContinue={handleContinue}
      footerCompact
      bodyClassName="gap-6 p-4"
      aside={
        <>
          <TripRouteHeader />
          <SidePanel title="Date flexibility helps">
            <p>
              Flights with a flexible date range fill faster — more travelers can match
              their plans to yours.
            </p>
            <p>
              If you can give us a 3–7 day window, your odds of a full group go up
              noticeably.
            </p>
          </SidePanel>
        </>
      }
    >
      <SectionHeading
        title="Dates"
        description="Flexible on dates? Pick a range. Locked in? Pick a specific day."
      />

      <SegmentedControl
        value={date.mode}
        options={MODE_OPTIONS}
        onChange={(mode) =>
          setDate(mode === 'specific' ? { mode, end: null } : { mode })
        }
      />

      <div className="flex flex-col gap-[6px] md:gap-2">
        <div className="grid gap-4 sm:grid-cols-2">
          {date.mode === 'specific' ? (
            <FormField label="Travel date" className="sm:col-span-2">
              <TextInput
                readOnly
                placeholder="Select your date"
                endAdornment={calendarInputIcon}
                value={date.start ? formatLongDate(date.start) : ''}
                invalid={Boolean(errors.date)}
              />
            </FormField>
          ) : (
            <>
              <FormField label="Earliest travel date">
                <TextInput
                  readOnly
                  placeholder="Select a start date"
                  endAdornment={calendarInputIcon}
                  value={date.start ? formatLongDate(date.start) : ''}
                />
              </FormField>
              <FormField label="Travel date">
                <TextInput
                  readOnly
                  placeholder="Select an end date"
                  endAdornment={calendarInputIcon}
                  value={date.end ? formatLongDate(date.end) : ''}
                  invalid={Boolean(errors.date)}
                />
              </FormField>
            </>
          )}
        </div>

        <Calendar
          mode={date.mode}
          start={date.start}
          end={date.end}
          onChange={({ start, end }) => setDate({ start, end })}
        />

        {errors.date && <FieldError>{errors.date}</FieldError>}
      </div>

      <InfoNote>
        Shared flights typically form 2–6 weeks out from your travel date.
      </InfoNote>
    </StepShell>
  )
}