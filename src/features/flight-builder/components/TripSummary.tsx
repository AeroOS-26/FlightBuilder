'use client'

/**
 * Trip-summary surfaces shown across later steps.
 *
 *  - RouteInline       "San Francisco → New York" with the soFar route icon.
 *  - EditTripButton    pill that jumps back to the Route ("details") step.
 *  - TripRouteHeader   the compact eyebrow + route + edit row (Dates aside).
 *  - PetsSummaryStrip  the bordered route/date strip atop the Pets card.
 *  - TripSummaryPanel  the full "Your Trip so far" card (Notes, Review).
 */

import { cn } from '@/utils/cn'
import { useStepNavigation } from '@/features/flight-builder/hooks/useStepNavigation'
import { useTripSummary } from '@/features/flight-builder/hooks/useTripSummary'

const tripSummaryLabelClass =
  'font-sans text-[12px] font-medium uppercase leading-[15px] tracking-normal text-[#080B2B]/60'

const tripSummaryValueClass =
  'font-heading text-[14px] font-medium leading-[17px] text-[#000000] lg:text-[16px] lg:leading-5'

const tripSummaryCardClass =
  'min-w-0 rounded-[20px] border border-[#A8A8A8]/20 bg-white p-4 lg:px-[16px] lg:py-4'

const tripRouteEyebrowClass =
  'font-sans text-[12px] font-medium uppercase leading-[15px] tracking-normal text-[#080B2B]/60'

const tripRouteCityClass =
  'font-heading text-[16px] font-medium leading-[19px] text-[#000000] min-[1322px]:text-[22px] min-[1322px]:leading-[27px]'

const routeCityClass =
  'font-heading text-[22px] font-medium leading-[27px] text-[#000000]'

function RouteInline({
  from,
  to,
  className,
  compact,
}: {
  from: string
  to: string
  className?: string
  compact?: boolean
}) {
  const cityClass = compact ? tripRouteCityClass : routeCityClass
  const iconClass = 'size-[18px]'

  return (
    <span className={cn('inline-flex max-w-full flex-nowrap items-center gap-2 min-[1322px]:gap-[20px]', className)}>
      <span className={cityClass}>{from || '—'}</span>
      <img src="/svg/soFar.svg" alt="" aria-hidden="true" className={cn('shrink-0', iconClass)} />
      <span className={cityClass}>{to || '—'}</span>
    </span>
  )
}

function EditTripButton({ label = 'Edit trip details' }: { label?: string }) {
  const { goTo } = useStepNavigation()
  return (
    <button
      type="button"
      onClick={() => goTo('route')}
      aria-label={label}
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-[#98C3E1] bg-[#F5F9FC] p-[10px] text-[#000000] transition-opacity hover:opacity-90 focus-ring lg:h-10 lg:w-auto lg:gap-2 lg:bg-[#CFE3F1]/20 lg:p-0 lg:pl-[14px] lg:pr-[10px] lg:font-sans lg:text-[14px] lg:font-medium lg:leading-4 lg:hover:bg-[#CFE3F1]/30"
    >
      <span className="hidden lg:inline">{label}</span>
      <img src="/svg/edittrip.svg" alt="" aria-hidden="true" className="size-[18px] shrink-0" />
    </button>
  )
}

/** Eyebrow + route + edit, shown above the Dates aside card. */
export function TripRouteHeader() {
  const { fromCity, toCity } = useTripSummary()
  return (
    <div className="flex items-start justify-between gap-3 rounded-[20px] border border-[#A8A8A8]/20 bg-white p-4 lg:items-center lg:gap-4">
      <div className="min-w-0 flex-1">
        <p className={tripRouteEyebrowClass}>Your trip so far</p>
        <RouteInline compact from={fromCity} to={toCity} className="mt-2" />
      </div>
      <EditTripButton />
    </div>
  )
}

/** Route + date strip pinned to the top of the Pets & Passengers card. */
export function PetsSummaryStrip() {
  const { fromCity, toCity, date } = useTripSummary()
  return (
    <div className="flex items-start justify-between gap-3 rounded-[20px] border border-[#A8A8A8]/20 bg-[#ffffff] p-4 max-lg:rounded-[20px] lg:gap-4 lg:bg-white">
      <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start lg:gap-[60px]">
        <div className="min-w-0">
          <p className={tripRouteEyebrowClass}>Your trip so far</p>
          <RouteInline
            compact
            from={fromCity}
            to={toCity}
            className="mt-2 [&_span]:lg:text-[16px] [&_span]:lg:leading-[19px]"
          />
        </div>
        <div className="min-w-0">
          <p className={tripRouteEyebrowClass}>Date</p>
          <p className="mt-2 font-heading text-[14px] font-medium leading-[18px] text-[#000000] lg:text-[16px] lg:leading-[19px]">
            {date || '—'}
          </p>
        </div>
      </div>
      <EditTripButton />
    </div>
  )
}

interface SummaryRow {
  label: string
  value: string
  emphasize?: boolean
}

interface TripSummaryPanelProps {
  /** Include the notes row (Review step shows it; Notes step doesn't). */
  includeNotes?: boolean
  className?: string
  /** Show the edit trip details control (hidden on Review per Figma). */
  showEditButton?: boolean
}

function useTripSummaryRows(includeNotes: boolean) {
  const { fromCity, toCity, date, travelers, pets, hasPets, notes } = useTripSummary()

  const rows: SummaryRow[] = [
    { label: 'Route', value: `${fromCity || '—'}  ⇄  ${toCity || '—'}`, emphasize: true },
    { label: 'Date', value: date || '—' },
    { label: 'Travelers', value: travelers },
    { label: 'Pets', value: hasPets ? pets : 'No pets' },
  ]
  if (includeNotes) {
    rows.push({ label: 'Notes', value: notes || 'None added' })
  }

  return { rows, fromCity, toCity }
}

/** Trip summary rows without the outer card shell (for collapsible mobile panels). */
export function TripSummaryRows({ includeNotes = false }: TripSummaryPanelProps) {
  const { rows, fromCity, toCity } = useTripSummaryRows(includeNotes)

  return (
    <dl className="flex flex-col gap-3">
      {rows.map((row) => (
        <div
          key={row.label}
          className={cn(
            'flex justify-between gap-4',
            row.label === 'Notes' ? 'items-start' : 'items-center',
          )}
        >
          <dt
            className={cn(
              tripSummaryLabelClass,
              'shrink-0',
              row.label === 'Notes' && 'mt-[4px]',
            )}
          >
            {row.label}
          </dt>
          <dd
            className={cn(
              'min-w-0 flex-1',
              row.label === 'Notes' ? 'text-right' : 'text-right',
              tripSummaryValueClass,
              row.label === 'Notes' && 'break-words',
            )}
          >
            {row.emphasize ? (
              <RouteInline
                compact
                from={fromCity}
                to={toCity}
                className="justify-end [&_span]:text-[14px] [&_span]:leading-[17px] lg:[&_span]:text-[16px] lg:[&_span]:leading-6"
              />
            ) : (
              row.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Full "Your Trip so far" card used on the Notes and Review steps. */
export function TripSummaryPanel({
  includeNotes = false,
  className,
  showEditButton = true,
}: TripSummaryPanelProps) {
  return (
    <div className={cn(tripSummaryCardClass, className)}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-[18px] font-medium leading-[22px] text-[#000000] lg:text-[20px] lg:leading-6">
          Your Trip so far
        </h3>
        {showEditButton && <EditTripButton />}
      </div>
      <div className="mt-4">
        <TripSummaryRows includeNotes={includeNotes} />
      </div>
    </div>
  )
}