'use client'

/**
 * Join · Review and confirm — frame 40.
 *
 * Not a summary screen: it is the form where a member confirms who and what is
 * travelling before committing. Travellers and pets seed from the profile and
 * are editable for this flight only.
 *
 * The pet fields are the client's shape (2026-09-09): type and weight required
 * because the operator prepares the cabin from them, name optional because
 * nothing depends on it, three pets per traveller, and no document upload —
 * vet verification lives in the paperwork, not on this page. All of that is
 * enforced by `validateTravelersAndPets`, which the Flight Builder and frame 31
 * already share.
 *
 * `TravelerCard`, `PetCard` and the dashed primitives are reused rather than
 * rebuilt; this is their third surface.
 */

import { useState } from 'react'
import {
  Button,
  Checkbox,
  DashedCard,
  DashedOutline,
  ErrorBanner,
  dashedAddSurfaceClass,
} from '@/components/ui'
import { Icon, PawPrints, RouteHeading } from '@/components/common'
import { PetCard } from '@/features/flight-builder/steps/pets/PetCard'
import { TravelerCard } from '@/features/flight-builder/steps/pets/TravelerCard'
import { validateTravelersAndPets } from '@/features/flight-builder/validation'
import type { PetsErrors } from '@/features/flight-builder/validation'
import { MAX_TRAVELERS } from '@/features/flight-builder/config/capacity'
import { joinGroup } from '@/services/groupDataService'
import { metroLabel, formatDateRange, aircraftRowValue } from '../format'
import { cn } from '@/utils/cn'
import type { Pet, PublicView, Traveler } from '@/types'

const CARD = 'rounded-[20px] border border-[#A8A8A8]/20 bg-white/60 p-5'
const HEADING = 'font-heading text-[20px] font-semibold leading-[1.21] text-[#000000]'
const MUTED = 'font-sans text-[14px] font-medium leading-[1.3] text-[#000000]/70'
const LABEL = 'font-sans text-[12px] font-medium leading-[1.21] text-[#080B2B]/60'

let seq = 0
const nextId = () => `local-${++seq}`

const emptyPet = (): Pet => ({
  id: nextId(),
  name: '',
  type: '',
  breed: '',
  weight: '',
  temperament: '',
})

/** "FROM PROFILE" marker on the two cards that seed from the member's profile. */
function FromProfile() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-[7px] border border-[#E5E5E5] bg-[#EFEFEF]/85 px-2.5 py-2 font-sans text-[10px] font-medium uppercase leading-none tracking-[0.5px] text-[#090909]">
      From profile
    </span>
  )
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((text, i) => (
        <li key={text} className="flex items-start gap-3">
          <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-[#CFE3F1]/50 font-sans text-[12px] font-medium text-[#112D7C]">
            {i + 1}
          </span>
          <span className="font-sans text-[14px] leading-[1.45] text-[#000000]">{text}</span>
        </li>
      ))}
    </ol>
  )
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-5">
      <span className={cn(LABEL, 'shrink-0')}>{label}</span>
      <span className="min-w-0 text-right font-heading text-[16px] font-medium leading-normal text-[#000000]">
        {children}
      </span>
    </div>
  )
}

interface JoinReviewScreenProps {
  token: string
  flight: PublicView
  /** Seeded from the member's profile; edited here for this flight only. */
  initialTravelers?: Traveler[]
  initialPets?: Pet[]
  /**
   * `memberId` is the real seat id, so the outcome screen can show a genuine
   * reference. Optional because the contract types it so; absent simply means
   * no reference is rendered, which beats inventing one.
   */
  onJoined: (filled: boolean, memberId?: string) => void
  onBack?: () => void
}

export function JoinReviewScreen({
  token,
  flight,
  initialTravelers,
  initialPets,
  onJoined,
  onBack,
}: JoinReviewScreenProps) {
  const [travelers, setTravelers] = useState<Traveler[]>(
    initialTravelers ?? [{ id: nextId(), name: '', isFounder: true }],
  )
  const [pets, setPets] = useState<Pet[]>(initialPets ?? [])
  const [petsEnabled, setPetsEnabled] = useState((initialPets?.length ?? 0) > 0)
  const [readiness, setReadiness] = useState(false)
  const [errors, setErrors] = useState<PetsErrors | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const from = metroLabel(flight.route_origin_city)
  const to = metroLabel(flight.route_destination_city)
  const filled = Math.max(0, flight.spaces_total - flight.spaces_remaining)

  const check = (over: Partial<Parameters<typeof validateTravelersAndPets>[0]> = {}) =>
    validateTravelersAndPets({
      travelers,
      pets,
      petsEnabled,
      readinessAccepted: readiness,
      ...over,
    })

  /** Only re-validate after a failed attempt, so the form is not hostile up front. */
  const revalidate = (over: Parameters<typeof check>[0] = {}) => {
    if (errors) setErrors(check(over))
  }

  const handleConfirm = async () => {
    const found = check()
    setErrors(found)
    if (found.banner) return

    setSubmitting(true)
    setFailure(null)
    try {
      // The whole party, not one account. Everyone on this list occupies a
      // space, and only the signed-in member has a user row, so the count has
      // to travel with the request or the companions are invisible to capacity.
      const result = await joinGroup(flight.group_id, '', travelers.length)
      if (!result.success) throw new Error('The group could not be joined.')
      onJoined(result.filled === true, result.member_id)
    } catch (err) {
      // Stay put so the member can retry — the endpoint is idempotent, so
      // pressing Confirm again cannot seat them twice.
      setFailure(
        err instanceof Error && err.message
          ? err.message
          : 'Could not complete your join. Please try again.',
      )
      setSubmitting(false)
    }
  }

  const main = (
    <>
      {/* Flight summary — the same block the group screens use. */}
      <section className={cn(CARD, 'bg-white')}>
        <p className={cn(LABEL, 'uppercase')}>
          Flight · Group ID {flight.group_id}
        </p>
        <RouteHeading
          as="h2"
          from={from}
          to={to}
          iconClassName="size-[24px]"
          className="mt-1.5 font-heading text-[clamp(1.1rem,3vw,1.375rem)] font-semibold leading-[1.21] text-[#000000]"
        />
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-sans text-[15px] font-medium text-[#000000]">
          <span>{formatDateRange(flight.estimated_date_range)}</span>
          {flight.pet_friendly && (
            <>
              <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-[#000000]" />
              <span className="inline-flex items-center gap-2">
                Pets welcome
                <PawPrints height={14} />
              </span>
            </>
          )}
        </p>
        <p className="mt-3 font-sans text-[14px] font-medium text-[#000000]">
          {filled} of estimated {flight.spaces_total} members · You&rsquo;ll be #{filled + 1}
        </p>
      </section>

      {/* Who's flying */}
      <section className={CARD}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <h2 className={HEADING}>Who&rsquo;s flying</h2>
            <p className={MUTED}>Pulled from your profile. Edit anything specific to this flight.</p>
          </div>
          <FromProfile />
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {travelers.map((t, i) => (
            <TravelerCard
              key={t.id}
              traveler={t}
              index={i}
              error={errors?.travelers[t.id]}
              showRole={false}
              onChangeName={(name) => {
                const next = travelers.map((x) => (x.id === t.id ? { ...x, name } : x))
                setTravelers(next)
                revalidate({ travelers: next })
              }}
              onRemove={
                travelers.length > 1 && !t.isFounder
                  ? () => {
                      const next = travelers.filter((x) => x.id !== t.id)
                      setTravelers(next)
                      revalidate({ travelers: next })
                    }
                  : undefined
              }
            />
          ))}

          {travelers.length < MAX_TRAVELERS && (
            <button
              type="button"
              onClick={() => setTravelers([...travelers, { id: nextId(), name: '', isFounder: false }])}
              className={cn(
                'flex h-11 w-full items-center justify-center gap-2 font-sans text-[14px] font-medium text-[#112D7C] transition-colors hover:bg-[#CFE3F1]/30 focus-ring',
                dashedAddSurfaceClass,
              )}
            >
              <DashedOutline />
              <span className="relative">+ Add another traveler for this flight</span>
            </button>
          )}
        </div>
      </section>

      {/* Pets joining you */}
      <section className={CARD}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <h2 className={HEADING}>Pets joining you</h2>
            <p className={MUTED}>Pulled from your profile.</p>
          </div>
          <FromProfile />
        </div>

        {errors?.petCount && (
          <p className="mt-3 font-sans text-[12px] font-medium text-danger-text">
            {errors.petCount}
          </p>
        )}

        {petsEnabled && (
          <div className="mt-4 flex flex-col gap-3">
            {pets.map((p, i) => (
              <PetCard
                key={p.id}
                pet={p}
                index={i}
                errors={errors?.pets[p.id]}
                onChange={(patch) => {
                  const next = pets.map((x) => (x.id === p.id ? { ...x, ...patch } : x))
                  setPets(next)
                  revalidate({ pets: next })
                }}
                onRemove={() => {
                  const next = pets.filter((x) => x.id !== p.id)
                  setPets(next)
                  revalidate({ pets: next })
                }}
              />
            ))}

            <button
              type="button"
              onClick={() => {
                const next = [...pets, emptyPet()]
                setPets(next)
                revalidate({ pets: next })
              }}
              className={cn(
                'flex h-11 w-full items-center justify-center gap-2 font-sans text-[14px] font-medium text-[#112D7C] transition-colors hover:bg-[#CFE3F1]/30 focus-ring',
                dashedAddSurfaceClass,
              )}
            >
              <DashedOutline />
              <span className="relative">+ Add another pet for this flight</span>
            </button>
          </div>
        )}

        {/* Per-flight override of the profile's pets — only show if profile had pets. */}
        {(initialPets?.length ?? 0) > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-[#CFE3F1]/25 px-4 py-3">
            <p className="font-sans text-[14px] leading-[1.4] text-[#000000]">
              <span className="font-semibold italic">Flying without pets this time?</span>{' '}
              <span className="italic text-[#000000]/70">Clear your pets for this flight only.</span>
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setPetsEnabled(false)
                  setPets([])
                  revalidate({ petsEnabled: false, pets: [] })
                }}
              >
                Clear
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setPetsEnabled(true)
                  if (pets.length === 0) setPets([...initialPets!])
                  revalidate({ petsEnabled: true, pets: pets.length > 0 ? pets : initialPets })
                }}
              >
                {petsEnabled ? '✓ Keeping pets' : 'Keep'}
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* What you'd pay — no figure, per the standing no-pricing rule. */}
      <section className={CARD}>
        <h2 className={HEADING}>What you&rsquo;d pay</h2>
        <div className="mt-3 rounded-[16px] border border-[#A8A8A8]/20 bg-white p-4">
          <p className={LABEL}>Whole-flight cost</p>
          <p className="mt-1 font-heading text-[22px] font-semibold text-[#000000]">
            Estimate pending
          </p>
          <p className="mt-2 font-sans text-[14px] leading-[1.4] text-[#000000]/70">
            Our team is reviewing this route. We&rsquo;ll post an estimate on the Shared Flight
            page once it&rsquo;s ready.
          </p>
        </div>
        <p className="mt-3 font-sans text-[13px] italic leading-[1.45] text-[#000000]/60">
          Final amount confirmed when the group fills and the operator quote is locked. Your share
          at full group will be visible once the estimate lands.
        </p>
      </section>

      {/* Travel Readiness — required only when pets are actually coming. */}
      {petsEnabled && pets.length > 0 && (
        <DashedCard variant="readiness" padding="md">
          <DashedOutline />
          <h2 className="font-heading text-[18px] font-semibold text-[#000000]">
            Travel Readiness — confirm for this flight
          </h2>
          <p className="mt-2 font-sans text-[14px] leading-[1.45] text-[#000000]/70">
            Your pet must be travel-ready and will not disrupt other passengers or crew. Operators
            reserve the right to refuse boarding.
          </p>
          <div className="mt-3">
            <Checkbox
              checked={readiness}
              invalid={Boolean(errors?.readiness)}
              onChange={(v) => {
                setReadiness(v)
                revalidate({ readinessAccepted: v })
              }}
            >
              I confirm Travel Readiness for this flight.
            </Checkbox>
          </div>
          {errors?.readiness && (
            <p className="mt-2 font-sans text-[12px] font-medium text-danger-text">
              {errors.readiness}
            </p>
          )}
        </DashedCard>
      )}

      <section className={cn(CARD, 'bg-white')}>
        <h2 className={HEADING}>Before you commit</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {[
            'Joining now reserves your interest in this flight. It’s non-binding.',
            'Once our team posts the estimate, you’ll be asked to confirm or opt out.',
            'Final commitment only happens after you review the price.',
          ].map((t) => (
            <li key={t} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#0A1B49]"
              />
              <span className="font-sans text-[14px] leading-[1.45] text-[#000000]">{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {failure && (
        <div className="flex flex-col gap-2">
          <ErrorBanner>{failure}</ErrorBanner>
          <Button variant="secondary" size="sm" className="w-fit" onClick={handleConfirm}>
            Try again
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" onClick={onBack}>
          Go Back
        </Button>
        <Button onClick={handleConfirm} loading={submitting} trailingIcon="arrow-right">
          Confirm and Join Group
        </Button>
      </div>
    </>
  )

  const aside = (
    <>
      <section className={cn(CARD, 'bg-white')}>
        <h2 className={HEADING}>Trip Summary</h2>
        <div className="mt-4 flex flex-col gap-[18px]">
          <SummaryRow label="ROUTE">
            <span className="inline-flex items-center gap-2">
              {from}
              <img src="/svg/soFar.svg" alt="to" className="size-[16px]" />
              {to}
            </span>
          </SummaryRow>
          <SummaryRow label="DATE">{formatDateRange(flight.estimated_date_range)}</SummaryRow>
          {/* Labelled row, so it keeps its place and shows the pending
              placeholder rather than vanishing. Hiding it here while the Trip
              Details rail shows it would make the two disagree about the same
              unknown. Client, 2026-09-09. */}
          <SummaryRow label="AIRCRAFT">
            {aircraftRowValue(flight.aircraft_category)}
          </SummaryRow>
          <SummaryRow label="PETS">
            {flight.pet_friendly ? 'Allowed (cabin)' : 'Not on this flight'}
          </SummaryRow>
          <SummaryRow label="GROUP">
            {filled} of {flight.spaces_total} members
          </SummaryRow>
        </div>
      </section>

      <section className={cn(CARD, 'bg-white')}>
        <h2 className={HEADING}>What happens next</h2>
        <div className="mt-4">
          <NumberedList
            items={[
              'We add you to the group.',
              'You’ll see the estimate when our team posts it.',
              'Group fills, operator quotes.',
              'Once confirmed, we lock in your flight.',
            ]}
          />
        </div>
        <hr className="my-4 border-0 border-t border-[#A8A8A8]/30" />
        <p className="font-sans text-[13px] italic text-[#000000]/60">
          No payment is collected at this step.
        </p>
      </section>

      <section className={cn(CARD, 'bg-white')}>
        <h2 className={HEADING}>Questions before you commit?</h2>
        <a
          href="/contact"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#98C3E1] bg-[#CFE3F1]/20 px-[14px] font-sans text-[14px] font-medium text-[#000000] transition-colors hover:bg-[#CFE3F1]/40 focus-ring"
        >
          Contact support
          <Icon name="arrow-right" size={18} />
        </a>
      </section>
    </>
  )

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[30px] px-4 py-8 sm:px-6 lg:px-[50px]">
      <header className="flex flex-col items-center gap-2 text-center">
        <span className="inline-flex items-center rounded-[8px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-3 py-2 font-sans text-[12px] font-medium uppercase leading-none tracking-[0.5px] text-[#112D7C]">
          Join shared flight
        </span>
        <h1 className="font-heading text-[28px] font-semibold leading-tight text-[#000000] lg:text-[34px]">
          Review and confirm
        </h1>
        <p className={MUTED}>Here&rsquo;s what you&rsquo;re joining. Confirm to lock in your space.</p>
      </header>

      {errors?.banner && <ErrorBanner>{errors.banner}</ErrorBanner>}

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,750fr)_minmax(0,570fr)] lg:items-start lg:gap-5">
        <aside className="order-1 flex flex-col gap-5 lg:order-none lg:col-start-2 lg:row-start-1">
          {aside}
        </aside>
        <div className="order-2 flex flex-col gap-5 lg:order-none lg:col-start-1 lg:row-start-1">
          {main}
        </div>
      </div>
    </div>
  )
}
