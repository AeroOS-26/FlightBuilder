'use client'

/**
 * Location autocomplete for the Route step.
 *
 * Searches cities/airports as the Founder types, then offers:
 *  - city matches (the top one flagged "Recommended"),
 *  - an "or lock to a specific airport" group for the recommended city,
 *  - a friendly no-match state when nothing is found.
 *
 * Keyboard: ↑/↓ move the active option, Enter selects, Esc closes.
 * Selection emits a resolved `RoutePlace`; clearing the text clears selection.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { locationService } from '@/api/services'
import { Badge, FieldError, TextInput } from '@/components/ui'
import { Icon } from '@/components/common'
import { cn } from '@/utils/cn'
import type { AirportOption, CityOption, RoutePlace } from '@/types'

type FlatOption =
  | { kind: 'city'; city: CityOption; recommended: boolean }
  | { kind: 'airport'; airport: AirportOption }

function cityToPlace(city: CityOption): RoutePlace {
  return {
    id: city.id,
    kind: 'city',
    label: `${city.city}, ${city.region}, ${city.country}`,
    city: city.city,
    region: city.region,
    country: city.country,
    code: city.defaultCode,
    displayCode: city.defaultDisplayCode,
  }
}

function airportToPlace(a: AirportOption): RoutePlace {
  return {
    id: `${a.code}`,
    kind: 'airport',
    // Show the friendly display code (IATA-preferred); the payload carries ICAO.
    label: `${a.displayCode} — ${a.name}`,
    city: a.city,
    region: a.region,
    country: a.country,
    code: a.code,
    displayCode: a.displayCode,
    airportName: a.name,
  }
}

interface LocationFieldProps {
  label: string
  placeholder: string
  value: RoutePlace | null
  onChange: (place: RoutePlace | null) => void
  invalid?: boolean
  error?: string
  onNoMatchChange?: (noMatch: boolean) => void
}

export function LocationField({
  label,
  placeholder,
  value,
  onChange,
  invalid,
  error,
  onNoMatchChange,
}: LocationFieldProps) {
  const fieldId = useId()
  const listId = `${fieldId}-list`
  const containerRef = useRef<HTMLDivElement>(null)

  const [query, setQuery] = useState(value?.label ?? '')
  const [results, setResults] = useState<CityOption[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [searched, setSearched] = useState(false)

  // Keep the text in sync if the value is set/cleared externally.
  useEffect(() => {
    setQuery(value?.label ?? '')
  }, [value])

  // Run the search whenever the query changes (debounced).
  useEffect(() => {
    const q = query.trim()
    if (q.length === 0 || q === value?.label) {
      setResults([])
      setSearched(false)
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      const found = await locationService.searchLocations(q)
      if (cancelled) return
      setResults(found)
      setSearched(true)
      setActiveIndex(found.length > 0 ? 0 : -1)
    }, 120)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, value?.label])

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const { flatOptions, topAirports } = useMemo(() => {
    const top = results[0]
    const airports = top && top.airports.length > 1 ? top.airports : []
    const rest = results.slice(1)
    const flat: FlatOption[] = []
    if (top) flat.push({ kind: 'city', city: top, recommended: true })
    for (const a of airports) flat.push({ kind: 'airport', airport: a })
    for (const c of rest) flat.push({ kind: 'city', city: c, recommended: false })
    return { flatOptions: flat, topAirports: airports }
  }, [results])

  const noMatch =
    searched && results.length === 0 && query.trim().length > 0 && query.trim() !== value?.label

  useEffect(() => {
    onNoMatchChange?.(noMatch)
  }, [noMatch, onNoMatchChange])

  useEffect(() => {
    return () => onNoMatchChange?.(false)
  }, [onNoMatchChange])

  function commit(opt: FlatOption) {
    const place = opt.kind === 'city' ? cityToPlace(opt.city) : airportToPlace(opt.airport)
    onChange(place)
    setQuery(place.label)
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatOptions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (open && activeIndex >= 0 && flatOptions[activeIndex]) {
        e.preventDefault()
        commit(flatOptions[activeIndex])
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showDropdown = open && (flatOptions.length > 0 || noMatch)

  return (
    <div ref={containerRef} className="relative flex flex-col">
      <label
        htmlFor={fieldId}
        className="mb-1.5 text-[12px] font-medium text-[#000000]/90 md:text-[#000000]"
      >
        {label}
      </label>
      <div className="relative">
        <TextInput
          id={fieldId}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          endAdornment={
            <img
              src={invalid || error ? '/svg/location.svg' : '/svg/location.svg'}
              alt=""
              aria-hidden="true"
              className="h-4 w-4"
            />
          }
          invalid={invalid || Boolean(error)}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (value) onChange(null)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />

        {showDropdown && !noMatch && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[12px] border border-[#A8A8A8]/20 bg-white shadow-pop md:border-0">
          <div className="flex flex-col gap-1 border-b border-[#D0CFDB]/30 px-4 py-3 md:flex-row md:items-center md:justify-between md:gap-3 md:py-2.5">
            <span className="font-sans text-[12px] font-medium uppercase leading-4 tracking-[0.06em] text-[#000000] md:text-[14px]">
              Suggestions for “{query.trim()}”
            </span>
            <span className="font-sans text-[10px] font-medium uppercase leading-4 tracking-[0.06em] text-[#000000]/70 md:text-[12px]">
              {topAirports.length > 0
                ? `${flatOptions.length} results · executive-airport routing on`
                : `${results.length} cities matched`}
            </span>
          </div>

          <ul
            id={listId}
            role="listbox"
            className="space-y-1.5 overflow-y-auto px-4 py-3 scrollbar-none max-md:max-h-none max-md:overflow-visible md:max-h-[260px] md:space-y-1.5 md:px-2"
          >
            {flatOptions.map((opt, index) => {
              const active = index === activeIndex
              const isFirstAirport =
                opt.kind === 'airport' &&
                flatOptions.findIndex((o) => o.kind === 'airport') === index
              return (
                <div key={optionKey(opt, index)}>
                  {isFirstAirport && (
                    <div className="py-3 font-sans text-[12px] font-medium uppercase leading-[15px] tracking-[0.06em] text-[#112D7C] md:px-2 md:pt-4 md:pb-2 md:leading-normal">
                      Or lock to a specific airport
                    </div>
                  )}
                  {opt.kind === 'city' ? (
                    <CityRow
                      city={opt.city}
                      recommended={opt.recommended}
                      active={active}
                      onSelect={() => commit(opt)}
                      onHover={() => setActiveIndex(index)}
                    />
                  ) : (
                    <AirportRow
                      airport={opt.airport}
                      active={active}
                      onSelect={() => commit(opt)}
                      onHover={() => setActiveIndex(index)}
                    />
                  )}
                </div>
              )
            })}
          </ul>

          <div className="flex items-start justify-between gap-3 px-4 py-3 md:items-center md:gap-4">
            <p className="flex min-w-0 flex-1 items-center gap-2 font-sans text-[11px] font-medium leading-[15px] text-[#000000]/70 md:gap-2.5 md:text-[12px] md:leading-[15px]">
              <img
                src="/svg/infoblue.svg"
                alt=""
                aria-hidden="true"
                className="h-[28px] w-[28px] shrink-0 md:h-[38px] md:w-[38px]"
              />
              <span className="max-md:max-w-none max-w-[523px]">
                {topAirports.length > 0
                  ? 'Most members fly from the nearest executive airport automatically. You only need to pick a specific airport if you have a reason — like avoiding traffic at the main commercial field.'
                  : 'Keep typing to narrow results, or use the arrow keys to pick.'}
              </span>
            </p>
            <div className="hidden shrink-0 md:block">
              <KeyboardHints />
            </div>
          </div>
        </div>
        )}
      </div>

      {noMatch && (
        <div
          role="alert"
          className="relative mt-[5px] flex items-start gap-2 rounded-[12px] bg-error-banner-bg p-3 md:items-center"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger-text text-white md:h-[38px] md:w-[38px]">
            <Icon name="alert" size={14} className="text-white md:h-4 md:w-4" strokeWidth={2.25} />
          </span>
          <div className="flex min-w-0 flex-1 items-stretch gap-1.5 md:contents">
            <div className="min-w-0 flex-1 md:pr-4">
              <p className="font-sans text-[12px] font-medium leading-4 text-[#000000] md:text-[14px]">
                We couldn’t find “{query.trim()}”.
              </p>
              <p className="mt-0.5 font-sans text-[10px] font-semibold leading-4 text-[#000000]/70">
                Try a city name, airport name, or 3-letter code (e.g., LAX, JFK, OPF).
              </p>
            </div>
            <div
              aria-hidden="true"
              className="w-1 shrink-0 self-stretch rounded-full bg-danger-text md:hidden"
            />
          </div>
          <div
            aria-hidden="true"
            className="absolute right-3 top-1/2 hidden h-[60%] w-1 -translate-y-1/2 rounded-full bg-danger-text md:block"
          />
        </div>
      )}

      {error && !noMatch && <FieldError className="mt-2">{error}</FieldError>}
    </div>
  )
}

function optionKey(opt: FlatOption, index: number): string {
  return opt.kind === 'city' ? `c-${opt.city.id}-${index}` : `a-${opt.airport.code}-${index}`
}

function KeyboardHints() {
  return (
    <div
      className="box-border inline-flex h-[27px] w-fit min-w-[72px] shrink-0 items-center justify-start gap-[3px] rounded-[6px] border-[0.86px] border-[#D7D7D7]/70 bg-white px-1.5 shadow-[0_1px_2px_rgba(20,22,29,0.06)]"
      aria-hidden="true"
    >
      <img
        src="/svg/arrow-up.svg"
        alt=""
        aria-hidden="true"
        className="h-[11px] w-[11px] shrink-0"
      />
      <img
        src="/svg/arrow-down.svg"
        alt=""
        aria-hidden="true"
        className="h-[11px] w-[11px] shrink-0"
      />
      <img
        src="/svg/elements.svg"
        alt=""
        aria-hidden="true"
        className="h-[9px] w-2 shrink-0"
      />
      <span className="font-sans text-[12px] font-medium leading-normal text-[#000000]/70">
        esc
      </span>
    </div>
  )
}

function RowTypeLabel({ type, showEnter }: { type: 'City' | 'Airport'; showEnter: boolean }) {
  return (
    <span className="flex shrink-0 flex-col items-end text-right">
      <span className="font-sans text-[12px] font-medium leading-[18px] tracking-[-0.2px] text-[#000000] md:leading-normal md:tracking-normal">
        {type}
      </span>
      {showEnter && (
        <span className="font-sans text-[12px] font-medium leading-6 tracking-[-0.2px] text-[#000000] md:text-[14px] md:leading-4 md:tracking-normal">
          Enter
        </span>
      )}
    </span>
  )
}

function CityRow({
  city,
  recommended,
  active,
  onSelect,
  onHover,
}: {
  city: CityOption
  recommended: boolean
  active: boolean
  onSelect: () => void
  onHover: () => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        'box-border flex w-full items-center justify-between gap-2 rounded-[12px] py-[10px] pl-2 pr-2 text-left transition-colors md:gap-3 md:pl-4 md:pr-[10px]',
        recommended && 'border border-[#F9E8D9] bg-[#FFF8F2]',
        active && recommended && 'border-[#F9E8D9] bg-[#FFF8F2]',
        !recommended && (active ? 'bg-[#D9E9F7]' : 'bg-[#D9E9F7]/40 hover:bg-[#D9E9F7]'),
      )}
    >
      <span className="flex min-w-0 items-center gap-2 md:gap-3">
        {recommended ? (
          <img
            src="/svg/locationRedBlue.svg"
            alt=""
            aria-hidden="true"
            className="h-8 w-8 shrink-0 md:h-[38px] md:w-[38px]"
          />
        ) : (
          <img
            src="/svg/locationblackblue.svg"
            alt=""
            aria-hidden="true"
            className="h-8 w-8 shrink-0 md:h-[38px] md:w-[38px]"
          />
        )}
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-[10px] gap-y-1 md:gap-x-2">
            <span className="truncate font-sans text-[14px] font-medium leading-5 text-[#000000] md:text-[16px] md:leading-6">
              {city.city}, {city.region}, {city.country}
            </span>
            {recommended && (
              <Badge
                tone="recommend"
                className="h-auto shrink-0 rounded-full px-[6px] py-[3px] text-[10px] font-medium leading-none md:h-6 md:px-[10px] md:py-[6px] md:text-[12px]"
              >
                Recommended
              </Badge>
            )}
          </span>
          <span
            className="block font-sans text-[12px] font-medium leading-[18px] tracking-[-0.2px] text-[#000000] md:leading-normal md:tracking-normal"
          >
            Any airport
          </span>
        </span>
      </span>
      <RowTypeLabel type="City" showEnter={active} />
    </button>
  )
}

function AirportRow({
  airport,
  active,
  onSelect,
  onHover,
}: {
  airport: AirportOption
  active: boolean
  onSelect: () => void
  onHover: () => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        'box-border flex w-full items-center justify-between gap-2 rounded-[12px] py-[10px] pl-3 pr-2 text-left transition-colors md:gap-3 md:pl-4 md:pr-[10px]',
        active ? 'bg-[#D9E9F7]' : 'bg-[#D9E9F7]/40 hover:bg-[#D9E9F7]',
      )}
    >
      <span className="flex min-w-0 items-center gap-2 md:gap-3">
        <img
          src="/svg/aeroplane.svg"
          alt=""
          aria-hidden="true"
          className="h-8 w-8 shrink-0 md:h-[38px] md:w-[38px]"
        />
        <span className="min-w-0">
          <span className="block truncate font-sans text-[14px] font-medium leading-6 tracking-[-0.2px] text-[#000000] md:text-[16px] md:tracking-normal">
            {airport.displayCode}— {airport.name}
          </span>
          <span className="block font-sans text-[12px] font-medium leading-[18px] tracking-[-0.2px] text-[#000000]/70 md:leading-normal md:tracking-normal md:text-[#000000]">
            {airport.category} · {airport.city}, {airport.region}
          </span>
        </span>
      </span>
      <RowTypeLabel type="Airport" showEnter={active} />
    </button>
  )
}