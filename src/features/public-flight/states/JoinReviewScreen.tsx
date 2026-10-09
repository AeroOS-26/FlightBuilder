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

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import {
  Button,
  Checkbox,
  DashedCard,
  DashedOutline,
  ErrorBanner,
  Select,
  dashedAddSurfaceClass,
} from '@/components/ui'
import { Icon, PawPrints, RouteHeading } from '@/components/common'
import { APPROVAL_FLOW_ENABLED } from '@/config/features'
import { requestToJoin } from '@/services/groupDataService'
import { PetCard } from '@/features/flight-builder/steps/pets/PetCard'
import { WEIGHT_OPTIONS } from '@/features/flight-builder/config/petOptions'
import { TravelerCard } from '@/features/flight-builder/steps/pets/TravelerCard'
import { validateTravelersAndPets } from '@/features/flight-builder/validation'
import { validateEmail } from '@/features/auth/validation'
import type { PetsErrors } from '@/features/flight-builder/validation'
import { MAX_TRAVELERS } from '@/features/flight-builder/config/capacity'
import { joinGroup } from '@/services/groupDataService'
import { metroLabel, formatDateRange, aircraftRowValue } from '../format'
import { cn } from '@/utils/cn'
import type { MemberJoinResponse, Pet, PublicView, Traveler } from '@/types'
import type { ShareFlightDetail } from '../PublicFlightPage'

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
  serviceAnimal: false,
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

/**
 * An input exactly as wide as the text it holds.
 *
 * The pet field reads as one line — "Molly · Dog" — so the name has to end
 * where the dot begins, instead of taking half the field and stranding the pair
 * in the middle. `field-sizing: content` would do this in one declaration but is
 * not in every browser a member may arrive with, so this is the mirror instead:
 * an invisible span holding the same text sizes the box, and the input is laid
 * over it.
 *
 * Two details are load-bearing. The span must carry the input's exact font and
 * size or the two drift apart, and the input must be **absolutely positioned**
 * — an in-flow input contributes its own intrinsic width, which Chrome floors at
 * roughly 47px however small `size` is, so the box would never narrow past that.
 * Out of flow, only the mirror sizes it.
 */
function AutoWidthInput({
  value,
  placeholder,
  label,
  onChange,
}: {
  value: string
  placeholder: string
  label: string
  onChange: (value: string) => void
}) {
  return (
    <span className="relative inline-flex min-w-0 shrink items-center self-stretch">
      <span aria-hidden="true" className="invisible whitespace-pre font-sans text-[14px]">
        {value || placeholder}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full min-w-0 bg-transparent font-sans text-[14px] text-[#000000] outline-none"
      />
    </span>
  )
}

interface JoinReviewScreenProps {
  token: string
  flight: PublicView
  /** Airport codes and the organiser's name for frame 42's shared-flight card. */
  flightDetail?: ShareFlightDetail
  /** The account holder's address, shown read-only on their traveller card. */
  viewerEmail?: string
  /** Seeded from the member's profile; edited here for this flight only. */
  initialTravelers?: Traveler[]
  initialPets?: Pet[]
  /**
   * The endpoint's whole answer. It carries the real seat id, so the outcome
   * screen can show a genuine reference, and the roster's counts after the
   * join, which the public view does not have.
   */
  onJoined: (result: MemberJoinResponse) => void
  /**
   * Called instead of `onJoined` while the approval flow is on. A request is
   * not a membership, so it answers with nothing a roster could be built from —
   * which is the point, and why this is a separate callback rather than a
   * reshaped one.
   */
  onRequested?: () => void
  onBack?: () => void
}

export function JoinReviewScreen({
  token,
  flight,
  initialTravelers,
  initialPets,
  onJoined,
  onRequested,
  onBack,
  flightDetail,
  viewerEmail,
}: JoinReviewScreenProps) {
  const [travelers, setTravelers] = useState<Traveler[]>(
    initialTravelers ?? [{ id: nextId(), name: '', isFounder: true }],
  )
  const [pets, setPets] = useState<Pet[]>(initialPets ?? [])
  const [petsEnabled, setPetsEnabled] = useState(true)
  const [readiness, setReadiness] = useState(false)
  /**
   * Editable on frame 42, seeded from the account.
   *
   * NOTE: nothing currently reads it back. `join_request.created` takes the
   * requester's address from `users.email` via `requesterContact`, so an edit
   * here changes what the screen shows and not what is sent. Raised.
   */
  const [email, setEmail] = useState(viewerEmail ?? '')
  /**
   * Shown once a send has been attempted, not while the field is first being
   * typed into. `type="email"` alone does nothing here — native constraint
   * validation only fires on a real form submit, and this screen submits from
   * a click handler.
   */
  const [emailError, setEmailError] = useState<string | undefined>()
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

    // Only frame 42 offers the field, so only frame 42 can fail on it. One rule
    // for addresses across the product — the same validator sign-in uses.
    const badEmail = APPROVAL_FLOW_ENABLED ? validateEmail(email) : undefined
    setEmailError(badEmail)

    if (found.banner || badEmail) return

    setSubmitting(true)
    setFailure(null)
    try {
      // The whole party, not one account. Everyone on this list occupies a
      // space, and only the signed-in member has a user row, so the count has
      // to travel with the request or the companions are invisible to capacity.
      // Under approval this asks rather than joins: no place is taken and
      // nobody is seated until the Group Organizer decides. The old call stays
      // for the pre-approval path, which is still what runs today.
      if (APPROVAL_FLOW_ENABLED) {
        const sent = await requestToJoin(flight.group_id, {
          travelers: travelers.map((t) => ({ id: t.id, name: t.name })),
          pets: petsEnabled ? pets : [],
          readinessAccepted: readiness,
          // What they typed on frame 42 becomes `requester.email` on the
          // event, so the decision reaches the address they just confirmed.
          email,
        })
        if (!sent.success) throw new Error('Your request could not be sent.')
        // Clear the spinner before handing over. On the join path the screen is
        // unmounted by `onJoined`, so it never needed clearing; a request that
        // nobody is listening for would otherwise spin for ever on a success.
        setSubmitting(false)
        onRequested?.()
        return
      }

      const result = await joinGroup(flight.group_id, {
        seats: travelers.length,
        // Only pets that are actually coming: a cleared section sends none.
        pets: petsEnabled ? pets : [],
        readinessAccepted: readiness,
      })
      if (!result.success) throw new Error('The group could not be joined.')
      onJoined(result)
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
      {/* Frame 40's flight header. Frame 42 replaces it with the "The shared flight"
          card above the column, so it is not drawn twice. */}
      {!APPROVAL_FLOW_ENABLED && (
      <>
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
      </>
      )}

      {/* Who's flying */}
      <section className={CARD}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <h2 className={HEADING}>
              {APPROVAL_FLOW_ENABLED ? 'Who is travelling' : 'Who\u2019s flying'}
            </h2>
            <p className={MUTED}>
              {APPROVAL_FLOW_ENABLED
                ? 'Pulled from your profile. Change anything specific to this flight. Each traveller takes one place.'
                : 'Pulled from your profile. Edit anything specific to this flight.'}
            </p>
          </div>
          <FromProfile />
        </div>

        {/* Frame 42's own cards. The shared TravelerCard carries no email and
            PetCard is the Flight Builder's full editor; this frame shows a
            compact view of what the profile already holds, with the service
            animal question as the only thing to answer here. */}
        {APPROVAL_FLOW_ENABLED && (
          <div className="mt-4 flex flex-col gap-3">
            {travelers.map((t, i) => (
              <div key={t.id} className="rounded-[16px] border border-[#A8A8A8]/40 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-heading text-[16px] font-medium text-[#000000]">
                    Traveler {i + 1}
                    {t.isFounder && <span className="text-[#000000]/60"> (You)</span>}
                  </p>
                  {t.isFounder && (
                    <span className="inline-flex shrink-0 items-center rounded-[8px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-2.5 py-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.5px] text-[#112D7C]">
                      Primary
                    </span>
                  )}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="flex min-w-0 flex-col gap-1.5">
                    <span className={LABEL}>Full name</span>
                    {/* `size={1}` for the same reason as the pet type below:
                        an input's default 20-character intrinsic width is what
                        the grid column takes as its minimum, which pushed this
                        pair past the card edge on a 320px phone. */}
                    <input
                      size={1}
                      value={t.name}
                      onChange={(e) => {
                        const next = travelers.map((x) =>
                          x.id === t.id ? { ...x, name: e.target.value } : x,
                        )
                        setTravelers(next)
                        revalidate({ travelers: next })
                      }}
                      className="h-11 rounded-[12px] border border-[#98C3E1] bg-white px-3 font-sans text-[14px] text-[#000000] focus-ring"
                    />
                  </label>
                  {/* Only the account holder has one. Everyone else on the party
                      is a name with no account, so there is nothing to show. */}
                  {t.isFounder && (
                    <label className="flex min-w-0 flex-col gap-1.5">
                      <span className={LABEL}>Email</span>
                      <input
                        size={1}
                        type="email"
                        value={email}
                        aria-invalid={Boolean(emailError)}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          // Clear as soon as it is valid, so the message does
                          // not sit there while someone is fixing it.
                          if (emailError) setEmailError(validateEmail(e.target.value))
                        }}
                        className={cn(
                          'h-11 rounded-[12px] border bg-white px-3 font-sans text-[14px] text-[#000000] focus-ring',
                          emailError ? 'border-danger-text' : 'border-[#98C3E1]',
                        )}
                      />
                      {emailError && (
                        <span className="font-sans text-[12px] text-danger-text">
                          {emailError}
                        </span>
                      )}
                    </label>
                  )}
                </div>
              </div>
            ))}

            {pets.map((pet, i) => (
              <div key={pet.id} className="rounded-[16px] border border-[#A8A8A8]/40 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-heading text-[16px] font-medium text-[#000000]">Pet {i + 1}</p>
                  <span className="inline-flex shrink-0 items-center rounded-[8px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-2.5 py-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.5px] text-[#112D7C]">
                    Cabin
                  </span>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {/*
                    One field, two inputs, the pair sitting at the left edge
                    with the dot between them.

                    Both sides are free text: the name is typed, and so is the
                    type. That differs from the Flight Builder, which picks the
                    type from five fixed values — see the note below on what
                    that means for the CRM.
                  */}
                  <div className="flex flex-col gap-1.5">
                    <span className={LABEL}>Name and type</span>
                    <div
                      className={cn(
                        'flex h-11 items-center rounded-[12px] border bg-white px-3 focus-within:ring-2 focus-within:ring-[#112D7C]/20',
                        errors?.pets[pet.id]?.type ? 'border-danger-text' : 'border-[#98C3E1]',
                      )}
                    >
                      <AutoWidthInput
                        value={pet.name}
                        placeholder="Name"
                        label="Pet name"
                        onChange={(value) => {
                          const next = pets.map((x) =>
                            x.id === pet.id ? { ...x, name: value } : x,
                          )
                          setPets(next)
                          revalidate({ pets: next })
                        }}
                      />
                      <span aria-hidden="true" className="shrink-0 px-3 text-[#000000]/40">
                        ·
                      </span>
                      {/*
                        The type is not mirrored: it runs to the end of the
                        field, so the empty space to its right is still a click
                        target rather than dead area.

                        `size={1}` is what keeps it inside the card on a narrow
                        phone. An input's intrinsic width comes from `size`,
                        which defaults to 20 characters — about 208px here — and
                        that is the width the field reports as its minimum when
                        the grid column asks, whatever `min-w-0` says. At 360px
                        the column is 252px, so the field used to push 43px past
                        the card's right edge.
                      */}
                      <input
                        size={1}
                        value={pet.type}
                        placeholder="Type"
                        aria-label="Pet type"
                        aria-invalid={Boolean(errors?.pets[pet.id]?.type) || undefined}
                        onChange={(e) => {
                          const next = pets.map((x) =>
                            x.id === pet.id ? { ...x, type: e.target.value } : x,
                          )
                          setPets(next)
                          revalidate({ pets: next })
                        }}
                        className="h-full min-w-0 flex-1 bg-transparent font-sans text-[14px] text-[#000000] outline-none"
                      />
                    </div>
                    {errors?.pets[pet.id]?.type && (
                      <span className="font-sans text-[12px] text-danger-text">
                        {errors.pets[pet.id]!.type}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className={LABEL}>Weight</span>
                    <Select
                      aria-label="Pet weight"
                      placeholder="Select weight"
                      options={WEIGHT_OPTIONS}
                      value={pet.weight}
                      invalid={Boolean(errors?.pets[pet.id]?.weight)}
                      onChange={(e) => {
                        const next = pets.map((x) =>
                          x.id === pet.id ? { ...x, weight: e.target.value } : x,
                        )
                        setPets(next)
                        revalidate({ pets: next })
                      }}
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="font-sans text-[14px] text-[#000000]">
                    Is {pet.name || 'this pet'} a service animal?
                  </p>
                  <div className="inline-flex overflow-hidden rounded-[10px] border border-[#98C3E1]">
                    {([false, true] as const).map((value) => (
                      <button
                        key={String(value)}
                        type="button"
                        onClick={() =>
                          setPets(
                            pets.map((x) =>
                              x.id === pet.id ? { ...x, serviceAnimal: value } : x,
                            ),
                          )
                        }
                        className={cn(
                          'h-9 px-5 font-sans text-[13px] font-medium transition-colors',
                          Boolean(pet.serviceAnimal) === value
                            ? 'bg-[#0B1B4D] text-white'
                            : 'bg-white text-[#000000] hover:bg-[#CFE3F1]/30',
                        )}
                      >
                        {value ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={cn('mt-4 flex-col gap-3', APPROVAL_FLOW_ENABLED ? 'hidden' : 'flex')}>
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

          {/*
            Frame 42 draws no add control, confirmed with the client 2026-10-07.
            The party comes from the member's saved profile — "Pulled from your
            profile" — so a request for two places is made by someone whose
            profile holds two travellers, not by adding one here. That is what
            keeps frame 47's "Needs 2 places, 1 open" reachable.
          */}
          {!APPROVAL_FLOW_ENABLED && travelers.length < MAX_TRAVELERS && (
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

      {/* Frame 40 keeps pets in their own card with an add control. Frame 42
          folds them into "Who is travelling" and offers no add — the party and
          its animals both come from the saved profile. */}
      {!APPROVAL_FLOW_ENABLED && (
        <>
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
                showServiceAnimal={APPROVAL_FLOW_ENABLED}
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
        </>
      )}

      {/* What you'd pay — frame 40 only. A request commits to nothing and the
          estimate lives on the Shared Flight page, so frame 42 omits it. */}
      {!APPROVAL_FLOW_ENABLED && (
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
      )}

      {/* Travel Readiness — frame 40's single card. Frame 42 states it per pet,
          with the service-animal alternative, so only one of the two renders. */}
      {!APPROVAL_FLOW_ENABLED && petsEnabled && pets.length > 0 && (
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

      {APPROVAL_FLOW_ENABLED && (
        <p className="font-sans text-[14px] text-[#000000]/70">
          {travelers.length} {travelers.length === 1 ? 'traveller' : 'travellers'}, so this request
          needs {travelers.length} {travelers.length === 1 ? 'place' : 'places'}. Pets do not take
          a place.
        </p>
      )}

      {/*
        Travel readiness. Two states per pet, both drawn on the frame: a pet
        that is not a service animal carries the confirmation and its
        checkbox; a qualified service animal is not subject to it and gets the
        carrier's wording instead.
      */}
      {APPROVAL_FLOW_ENABLED && pets.length > 0 && (
        <section className="rounded-[20px] border border-dashed border-[#112D7C] bg-[#CFE3F1]/10 p-4">
          <h2 className={HEADING}>Travel readiness</h2>
          <p className={cn(MUTED, 'mt-1')}>Confirmed for each pet on this request.</p>
          <div className="mt-4 flex flex-col gap-3">
            {/*
              Service animals are left out: they are not subject to the
              confirmation, and the standing note below carries the carrier
              wording. Listing one here printed that paragraph twice.
            */}
            {pets.filter((pet) => !pet.serviceAnimal).map((pet) => (
              <div
                key={pet.id}
                className="rounded-[16px] border border-[#A8A8A8]/40 bg-white p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-heading text-[16px] font-medium text-[#000000]">
                    {[pet.name, pet.type].filter(Boolean).join(' · ') || 'This pet'}
                  </p>
                  <span className="inline-flex shrink-0 items-center rounded-[8px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-2.5 py-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.5px] text-[#112D7C]">
                    Not a service animal
                  </span>
                </div>
                <p className="mt-2 font-sans text-[14px] leading-[1.5] text-[#000000]/70">
                  I confirm any pet I bring on this flight is travel-ready, will not disrupt
                  other passengers or crew, and I accept responsibility for their behaviour.
                </p>
                  {/*
                    The frame puts the confirmation inside the pet's card. It is
                    bound to one value for the request — "confirmed for each pet
                    on this request" — so with several pets every box moves
                    together. Only one pet is drawn, so whether it should be per
                    pet is not settled; the single flag matches what the payload
                    carries today.
                  */}
                  <div
                    className={cn(
                      'mt-3 rounded-[12px] border bg-white p-3',
                      errors?.readiness ? 'border-danger-text' : 'border-[#A8A8A8]/40',
                    )}
                  >
                    <Checkbox
                      checked={readiness}
                      invalid={Boolean(errors?.readiness)}
                      onChange={(next) => {
                        setReadiness(next)
                        revalidate({ readinessAccepted: next })
                      }}
                    >
                      <span className="font-sans text-[14px] leading-[1.4] text-[#000000]">
                        <em className="font-medium not-italic">I agree</em> &mdash; I have read
                        and accept the above.
                      </span>
                    </Checkbox>
                    {/* The rule lives in `validatePetList`; without this the
                        send was simply refused with nothing said. */}
                    {errors?.readiness && (
                      <p className="mt-2 font-sans text-[12px] font-medium text-danger-text">
                        {errors.readiness}
                      </p>
                    )}
                  </div>
              </div>
            ))}

            {/*
              A standing note, not an alternative state. Its heading is written
              conditionally — "If a pet is set to service animal" — so it
              explains what changes in that case and belongs alongside the
              confirmations rather than replacing one.
            */}
            <div className="rounded-[16px] border border-[#A8A8A8]/40 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-heading text-[16px] font-medium text-[#000000]">
                  If a pet is set to service animal
                </p>
                <span className="inline-flex shrink-0 items-center rounded-[8px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-2.5 py-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.5px] text-[#112D7C]">
                  Yes selected
                </span>
              </div>
              <p className="mt-2 font-sans text-[14px] leading-[1.5] text-[#000000]/70">
                A qualified service animal is not subject to the travel readiness confirmation.
                The operating carrier may still make the inquiries permitted by law, request the
                documentation authorised by law, and assess the animal&rsquo;s behaviour. For a
                large service animal, carriage depends on an accommodation and safety assessment
                by the carrier.
              </p>
            </div>

          </div>
        </section>
      )}

      <section className={cn(CARD, 'bg-white')}>
        <h2 className={HEADING}>
          {APPROVAL_FLOW_ENABLED ? 'What happens after you send it?' : 'Before you commit'}
        </h2>
        <ol className="mt-3 flex flex-col gap-2">
          {(APPROVAL_FLOW_ENABLED
            ? [
                'The Group Organizer approves or declines your request.',
                'Perro Air also runs its own check.',
                'Your screens show Under review until both are done. We email you as soon as there is a decision.',
              ]
            : [
                'Joining now reserves your interest in this flight. It’s non-binding.',
                'Once our team posts the estimate, you’ll be asked to confirm or opt out.',
                'Final commitment only happens after you review the price.',
              ]
          ).map((t, index) => (
            <li key={t} className="flex items-start gap-3">
              {APPROVAL_FLOW_ENABLED ? (
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-[26px] shrink-0 items-center justify-center rounded-full border border-[#CFE3F1] bg-[#CFE3F1]/40 font-sans text-[12px] font-medium text-[#080B2B]"
                >
                  {index + 1}
                </span>
              ) : (
                <span
                  aria-hidden="true"
                  className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#0A1B49]"
                />
              )}
              <span className="font-sans text-[14px] leading-[1.45] text-[#000000]">{t}</span>
            </li>
          ))}
        </ol>
      </section>

      {failure && (
        <div className="flex flex-col gap-2">
          <ErrorBanner>{failure}</ErrorBanner>
          <Button variant="secondary" size="sm" className="w-fit" onClick={handleConfirm}>
            Try again
          </Button>
        </div>
      )}

      {/* Frame 42 has one button, centred, and no Go Back — the request is sent
          from here or not at all. Frame 40 keeps both. */}
      {APPROVAL_FLOW_ENABLED ? (
        <div className="flex flex-col items-center gap-2">
          <Button onClick={handleConfirm} loading={submitting} trailingIcon="arrow-right">
            Send Join Request
          </Button>
          <p className="font-sans text-[14px] text-[#000000]/70">
            The Group Organizer reviews every request.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" onClick={onBack}>
            Go Back
          </Button>
          <Button onClick={handleConfirm} loading={submitting} trailingIcon="arrow-right">
            Confirm and Join Group
          </Button>
        </div>
      )}
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

  /**
   * Frame 42 is a single 804px column; frame 40 is two with a sidebar.
   *
   * The sidebar's cards — Trip Summary, the old four-step "What happens next",
   * "Questions before you commit?" — and the "What you'd pay" block belong to
   * frame 40 and are not on frame 42. One of them is actively wrong under
   * approval: "We add you to the group" is the opposite of what a request does.
   */
  const wide = !APPROVAL_FLOW_ENABLED

  return (
    <div
      className={cn(
        'mx-auto flex w-full flex-col gap-[30px] px-4 py-8 sm:px-6',
        wide ? 'max-w-[1440px] lg:px-[50px]' : 'max-w-[804px]',
      )}
    >
      {/* Frame 42 left-aligns its header inside the 804 column. Frame 40
          centres across the full width. */}
      <header
        className={cn(
          'flex flex-col gap-2',
          wide ? 'items-center text-center' : 'items-start text-left',
        )}
      >
        <span className="inline-flex items-center rounded-[8px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-3 py-2 font-sans text-[12px] font-medium uppercase leading-none tracking-[0.5px] text-[#112D7C]">
          {APPROVAL_FLOW_ENABLED ? 'Flight Club · Join a shared flight' : 'Join shared flight'}
        </span>
        <h1 className="font-heading text-[28px] font-semibold leading-tight text-[#000000] lg:text-[34px]">
          {APPROVAL_FLOW_ENABLED ? 'Review your request' : 'Review and confirm'}
        </h1>
        {/*
          The hero was the last thing on this screen still promising a place.
          Under approval nothing is held until the organiser decides, so
          "Confirm to lock in your space" contradicts both the button beneath it
          and "What happens after you send it?" further down. Same rule as
          "Group Full, never Sold Out" and "Register your interest" rather than
          "Save your spot": the copy may not claim something is held when it is
          not. Charles, 2026-07-30.
        */}
        <p className={MUTED}>
          {APPROVAL_FLOW_ENABLED
            ? `Check the flight and who is travelling with you. Your request needs ${
                travelers.length === 1 ? 'one place' : `${travelers.length} places`
              }. Nothing is charged at this step.`
            : 'Here\u2019s what you\u2019re joining. Confirm to lock in your space.'}
        </p>
      </header>

      {errors?.banner && <ErrorBanner>{errors.banner}</ErrorBanner>}

      {wide ? (
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,750fr)_minmax(0,570fr)] lg:items-start lg:gap-5">
          <aside className="order-1 flex flex-col gap-5 lg:order-none lg:col-start-2 lg:row-start-1">
            {aside}
          </aside>
          <div className="order-2 flex flex-col gap-5 lg:order-none lg:col-start-1 lg:row-start-1">
            {main}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <SharedFlightCard flight={flight} detail={flightDetail} />
          {main}
        </div>
      )}
    </div>
  )
}

/**
 * Frame 42's "The shared flight" — route, departure, and who is organising it.
 *
 * It replaces frame 40's flight header, which led with the group id and the
 * member count. A requester does not need the id, and "You'll be #1" is wrong
 * under approval because they are not in the group yet.
 *
 * `organizerName` is optional and the row is omitted without it. The public
 * view has no organiser field — it is public-safe and deliberately carries no
 * names — so supplying it means reading it from our own database on the share
 * route and threading it down. Until that is wired the card shows two rows
 * rather than inventing a third.
 */
function SharedFlightCard({
  flight,
  detail,
}: {
  flight: PublicView
  detail?: ShareFlightDetail
}) {
  /** "San Francisco (SFO)" — the code only when an airport was locked. */
  const place = (city: string, code: string | null | undefined) =>
    code ? `${metroLabel(city)} (${code})` : metroLabel(city)

  return (
    <section className="rounded-[20px] border border-[#A8A8A8]/20 bg-white/60 p-4">
      <h2 className={HEADING}>The shared flight</h2>
      <dl className="mt-4 flex flex-col gap-[18px] rounded-[20px] border border-[#A8A8A8]/40 bg-white p-4">
        <Detail label="Route">
          <span className="inline-flex flex-wrap items-center gap-2">
            {place(flight.route_origin_city, detail?.originCode)}
            <Image
              src="/images/routes/Flighticons.png"
              alt="to"
              width={34}
              height={34}
              className="size-[22px] shrink-0 object-contain"
            />
            {place(flight.route_destination_city, detail?.destinationCode)}
          </span>
        </Detail>
        <Detail label="Departure">{formatDateRange(flight.estimated_date_range)}</Detail>
        {detail?.organizerName && (
          <Detail label="Group Organizer">{detail.organizerName}</Detail>
        )}
      </dl>
    </section>
  )
}

/** Label left, value right at 18px — the row shape frames 42, 43 and 44 share. */
function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {/* 12px on the 440 frame, 14 on the desktop one. */}
      <dt className="font-sans text-[12px] font-medium uppercase tracking-[0.5px] text-[#080B2B] lg:text-[14px]">
        {label}
      </dt>
      <dd className="font-heading text-[16px] font-medium text-[#000000] lg:text-[18px]">
        {children}
      </dd>
    </div>
  )
}
