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
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { APPROVAL_FLOW_ENABLED } from '@/config/features'
import { NATIONALITY_OPTIONS } from '@/features/flight-builder/config/nationalities'
import {
  STAGE1_HELP,
  STAGE1_CONFIRMATIONS,
  PASSPORT_NAME_LABEL,
} from '@/features/flight-builder/config/stage1Help'
import { requestToJoin } from '@/services/groupDataService'
import { PetCard } from '@/features/flight-builder/steps/pets/PetCard'
import { PET_TYPES, WEIGHT_OPTIONS } from '@/features/flight-builder/config/petOptions'
import { TravelerCard } from '@/features/flight-builder/steps/pets/TravelerCard'
import { validateTravelersAndPets } from '@/features/flight-builder/validation'
import { validateEmail } from '@/features/auth/validation'
import type { PetsErrors } from '@/features/flight-builder/validation'
import { MAX_TRAVELERS, MAX_PETS_PER_TRAVELER } from '@/features/flight-builder/config/capacity'
import { joinGroup } from '@/services/groupDataService'
import { metroLabel, formatDateRange, aircraftRowValue } from '../format'
import { cn } from '@/utils/cn'
import type { MemberJoinResponse, Pet, PublicView, Traveler } from '@/types'
import type { ShareFlightDetail } from '../PublicFlightPage'

const CARD = 'rounded-[20px] border border-[#A8A8A8]/20 bg-white/60 p-5'
const HEADING = 'font-heading text-[20px] font-semibold leading-[1.21] text-[#000000]'
const MUTED = 'font-sans text-[14px] font-medium leading-[1.3] text-[#000000]/70'
const LABEL = 'font-sans text-[12px] font-medium leading-[1.21] text-[#080B2B]/60'

/**
 * A field label, with the help icon only where there are words for it.
 *
 * The frames draw the icon on all six text fields; three have copy and three
 * do not. Rendering it on the other three would put a control on the page that
 * opens nothing, which is the thing `config/features.ts` already refuses
 * elsewhere. So `help` is optional and its absence removes the icon rather
 * than showing an empty one.
 */
function FieldLabel({ children, help }: { children: ReactNode; help?: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={LABEL}>{children}</span>
      {help && <InfoTooltip>{help}</InfoTooltip>}
    </span>
  )
}

/**
 * The "nothing here yet" block, shared by the two that need it.
 *
 * Both empty states — the pets list and travel readiness — are drawn
 * identically, so they are rendered from one place rather than two that can
 * drift. Measured off 4836:50923 rather than eyeballed:
 *
 *   icon      44 × 44, centred
 *   gap       24 between the icon and the text
 *   text      20px heading, 14px line beneath it, 8 between them
 *   colour    #000000 at FULL opacity on both lines, not the 70% used for
 *             muted copy elsewhere on this screen
 *   padding   20 top and bottom, 16 either side
 */
/**
 * The empty state both blocks draw, measured on `4836:50923`.
 *
 * 44px icon, 24px under it, heading 20px and line 14px with 8px between, the
 * card padded 20. Two things differ between the two blocks and they are the
 * two props: the **icon** — a paw above the pets block, a note above the
 * readiness one — and the **radius**, 16 on the pets card and 20 on the
 * readiness card.
 *
 * Both glyphs are exported from the frame itself rather than drawn here: each
 * is the 44px white rounded container with its shadow baked in, which is what
 * the frame's `popup icon` instance is.
 */
const EMPTY_STATE_ICON = {
  paw: '/images/routes/popup-icon-paw.png',
  note: '/images/routes/popup-icon-note.png',
} as const

function EmptyState({
  heading,
  line,
  icon,
  radiusClass,
}: {
  heading: string
  line: string
  icon: keyof typeof EMPTY_STATE_ICON
  radiusClass: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-6 border border-dashed border-[#98C3E1] bg-[#CFE3F1]/10 px-4 py-5 text-center',
        radiusClass,
      )}
    >
      <Image
        src={EMPTY_STATE_ICON[icon]}
        alt=""
        aria-hidden="true"
        width={44}
        height={44}
        className="size-[44px] shrink-0"
      />
      <div className="flex flex-col gap-2">
        <p className="font-heading text-[20px] font-medium leading-[1.2] text-[#000000]">
          {heading}
        </p>
        <p className="font-sans text-[14px] font-medium leading-[1.2] text-[#000000]">{line}</p>
      </div>
    </div>
  )
}

/**
 * Remove Traveler / Remove Pet.
 *
 * One component for both, because the frames draw them identically apart from
 * the word. Measured off 4031:37870 rather than approximated:
 *
 *   height    40, corner 12
 *   padding   12 left, 14 right, 8 between icon and label
 *   fill      #E96A6F at 10%
 *   border    #E96A6F, 1px
 *   label     14px, #D00416 — the project's danger text
 *   icon      18 × 18, a bin rather than a cross
 *
 * The bin matters. A cross reads as "close this"; these delete a traveller or
 * a pet from the request, and the design says so.
 */
function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-10 shrink-0 items-center gap-2 rounded-[12px] pl-3 pr-[14px]',
        'border border-[#E96A6F] bg-[#E96A6F]/10',
        'font-sans text-[14px] font-medium text-danger-text',
        'transition-colors hover:bg-[#E96A6F]/20 focus-ring',
      )}
    >
      <Icon name="trash" className="size-[18px] shrink-0" />
      {label}
    </button>
  )
}

/**
 * The field box, so the six inputs cannot drift apart.
 *
 * Same 40px and 14px as `FIELD_SHELL` below, and for the same reason: this is
 * the date of birth, one of the six, and it sat 4px taller than the
 * nationality list beside it.
 */
const FIELD_BASE =
  'h-10 w-full rounded-[12px] border bg-white px-[14px] font-sans text-[14px] text-[#000000] focus-ring'
/**
 * A field that carries a trailing icon, as the frames draw the passport name
 * and email. The border moves to the wrapper so the icon sits inside it, and
 * the focus ring follows the same `focus-within` treatment the pet
 * name-and-type field already uses.
 *
 * The glyphs are stroked #112D7C on the frame — the navy, not a grey.
 *
 * **40px tall and 14px in**, which is both the frame and the house primitives.
 * It was `h-11 px-3` — 44 and 12 — and that was wrong twice over: the frame's
 * Input is 40 tall with 14px of left padding on every field of this card
 * (`4835:50402`, Figma's own auto-layout numbers), and `TextInput` and
 * `Select` have carried `min-h-[40px] pl-[14px]` since they were written.
 *
 * It showed the moment the pet row became three fields — the Name input is
 * this shell and Type and Weight are the shared `Select`, so one row held a
 * 44px box beside two 40px ones.
 *
 * 40 is not a tap-target problem. `utils/tapTarget.ts` settled that: "forty
 * square *is* the frame", and the extra hit area is carried by an invisible
 * pseudo-element rather than by growing a painted box.
 */
const FIELD_SHELL =
  'flex h-10 w-full items-center gap-2 rounded-[12px] border bg-white px-[14px] focus-within:ring-2 focus-within:ring-[#112D7C]/20'
const FIELD_INPUT =
  'h-full min-w-0 flex-1 bg-transparent font-sans text-[14px] text-[#000000] outline-none'
const FIELD_ICON = 'size-4 shrink-0 text-[#112D7C]'

const FIELD_BORDER = (invalid: boolean) =>
  invalid ? 'border-danger-text' : 'border-[#98C3E1]'

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
      // This screen is a join request, so it blocks on type, weight and the
      // service-animal answer only — breed and temperament do not hold it up.
      surface: 'request',
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
          // Named one by one rather than spread, so adding a field to
          // `Traveler` never puts something on the wire by accident. This
          // carried only the id and the name until now, which dropped every
          // Stage 1 answer between here and the endpoint.
          travelers: travelers.map((t) => ({
            id: t.id,
            name: t.name,
            email: t.email,
            nationality: t.nationality,
            dateOfBirth: t.dateOfBirth,
            isAdult: t.isAdult,
            guardianBookingForMinor: t.guardianBookingForMinor,
            passportValidSixMonths: t.passportValidSixMonths,
          })),
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
                  {t.isFounder ? (
                    <span className="inline-flex shrink-0 items-center rounded-[8px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-2.5 py-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.5px] text-[#112D7C]">
                      Primary
                    </span>
                  ) : (
                    /*
                      Removal is immediate, with no confirmation, because that
                      is what the frames draw. They show the control and no
                      dialog behind it, and this is an unsent form rather than
                      a decision that fires anything — the opposite of frame
                      48B, where the confirmation exists because approving
                      seats someone and cannot be undone.

                      What it does cost is any Stage 1 detail already typed for
                      this person, which goes silently. If that should be
                      guarded it is a screen to draw rather than a dialog for
                      me to invent.

                      Traveller 1 has no remove at all: they are the person
                      making the request.
                    */
                    <RemoveButton
                      label="Remove Traveler"
                      onClick={() => {
                        const next = travelers.filter((x) => x.id !== t.id)
                        setTravelers(next)
                        revalidate({ travelers: next })
                      }}
                    />
                  )}
                </div>
                {/* 16px between fields and between rows, and 16px from the
                    header above — the card's auto-layout gap on the frame is
                    16 throughout, and this was 12. */}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="flex min-w-0 flex-col gap-1.5">
                    <FieldLabel help={STAGE1_HELP.passportName}>
                      {PASSPORT_NAME_LABEL}
                    </FieldLabel>
                    {/* `size={1}` for the same reason as the pet type below:
                        an input's default 20-character intrinsic width is what
                        the grid column takes as its minimum, which pushed this
                        pair past the card edge on a 320px phone. */}
                    <span
                      className={cn(
                        FIELD_SHELL,
                        FIELD_BORDER(Boolean(errors?.travelers[t.id])),
                      )}
                    >
                      <input
                        size={1}
                        value={t.name}
                        aria-invalid={Boolean(errors?.travelers[t.id])}
                        onChange={(e) => {
                          const next = travelers.map((x) =>
                            x.id === t.id ? { ...x, name: e.target.value } : x,
                          )
                          setTravelers(next)
                          revalidate({ travelers: next })
                        }}
                        className={FIELD_INPUT}
                      />
                      <Icon name="user" className={FIELD_ICON} />
                    </span>
                    {/* The banner says "complete the highlighted fields", so a
                        field that fails has to be the one that highlights. This
                        message used to render only on the frame-40 card below,
                        which this screen keeps in the DOM and hides — so the
                        banner pointed at a field nobody could see (client,
                        2026-10-12, finding 14). */}
                    {errors?.travelers[t.id] && (
                      <span className="font-sans text-[12px] text-danger-text">
                        {errors.travelers[t.id]}
                      </span>
                    )}
                  </label>
                  {/*
                    Email, now on every traveller rather than the account
                    holder alone — frame 42 draws it on each card.

                    Traveller 1 stays bound to the existing `email` state
                    deliberately. That value is what becomes the request's
                    `contact_email`, the address the decision is sent to, and
                    migration 0010 exists precisely so an edit here does not
                    silently change the address someone signs in with. Moving
                    it onto the traveller object would have re-routed that for
                    no gain. Everyone else carries their own on the record.
                  */}
                  <label className="flex min-w-0 flex-col gap-1.5">
                    <FieldLabel>Email</FieldLabel>
                    <span
                      className={cn(
                        FIELD_SHELL,
                        FIELD_BORDER(
                          t.isFounder
                            ? Boolean(emailError)
                            : Boolean(errors?.travelerFields[t.id]?.email),
                        ),
                      )}
                    >
                      <input
                        size={1}
                        type="email"
                        value={t.isFounder ? email : (t.email ?? '')}
                        aria-label={`Email for traveller ${i + 1}`}
                        aria-invalid={t.isFounder ? Boolean(emailError) : undefined}
                        onChange={(e) => {
                          if (t.isFounder) {
                            setEmail(e.target.value)
                            // Clear as soon as it is valid, so the message does
                            // not sit there while someone is fixing it.
                            if (emailError) setEmailError(validateEmail(e.target.value))
                            return
                          }
                          const next = travelers.map((x) =>
                            x.id === t.id ? { ...x, email: e.target.value } : x,
                          )
                          setTravelers(next)
                          revalidate({ travelers: next })
                        }}
                        className={FIELD_INPUT}
                      />
                      <Icon name="mail" className={FIELD_ICON} />
                    </span>
                    {t.isFounder && emailError && (
                      <span className="font-sans text-[12px] text-danger-text">
                        {emailError}
                      </span>
                    )}
                    {!t.isFounder && errors?.travelerFields[t.id]?.email && (
                      <span className="font-sans text-[12px] text-danger-text">
                        {errors.travelerFields[t.id].email}
                      </span>
                    )}
                  </label>

                  {/*
                    Nationality. A list rather than a typed field, because it
                    feeds the manual review and typed entries would give four
                    spellings of one country (Murtaza, 2026-10-20). The stored
                    value is the ISO alpha-2 code, which is the form the join
                    request shape asks for; the label is only what is read.
                  */}
                  <label className="flex min-w-0 flex-col gap-1.5">
                    <FieldLabel help={STAGE1_HELP.nationality}>Nationality</FieldLabel>
                    <Select
                      options={[...NATIONALITY_OPTIONS]}
                      placeholder="Select nationality"
                      value={t.nationality ?? ''}
                      aria-label={`Nationality for traveller ${i + 1}`}
                      invalid={Boolean(errors?.travelerFields[t.id]?.nationality)}
                      onChange={(e) => {
                        const next = travelers.map((x) =>
                          x.id === t.id ? { ...x, nationality: e.target.value } : x,
                        )
                        setTravelers(next)
                        revalidate({ travelers: next })
                      }}
                    />
                    {errors?.travelerFields[t.id]?.nationality && (
                      <span className="font-sans text-[12px] text-danger-text">
                        {errors.travelerFields[t.id].nationality}
                      </span>
                    )}
                  </label>

                  {/*
                    Date of birth as a native date input, and that is the point
                    rather than a shortcut.

                    The frames write the dates day-first — 24/10/1992,
                    14/03/1988 — and Murtaza raised on 2026-10-20 that on a US
                    booking form someone entering 3 November types 11/03 and we
                    read 11 March. A native date field removes the ambiguity at
                    both ends: the browser renders it in the reader's own
                    locale, and the value it hands back is always YYYY-MM-DD,
                    which is the form that is stored and sent.

                    The shared `Calendar` is not usable here. It disables past
                    days outright and will not page back beyond the current
                    month, because it was built to pick a flight date. Teaching
                    it to go back decades means changing a component the
                    signed-off Dates step depends on, which is a larger change
                    than this field deserves.
                  */}
                  <label className="flex min-w-0 flex-col gap-1.5">
                    <FieldLabel help={STAGE1_HELP.dateOfBirth}>Date of birth</FieldLabel>
                    <input
                      size={1}
                      type="date"
                      value={t.dateOfBirth ?? ''}
                      aria-label={`Date of birth for traveller ${i + 1}`}
                      // Nobody travelling is older than this or born tomorrow.
                      // A bound the browser enforces costs nothing and catches
                      // the slipped keystroke before validation has to.
                      min="1900-01-01"
                      max={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => {
                        const next = travelers.map((x) =>
                          x.id === t.id ? { ...x, dateOfBirth: e.target.value } : x,
                        )
                        setTravelers(next)
                        revalidate({ travelers: next })
                      }}
                      className={cn(
                        FIELD_BASE,
                        FIELD_BORDER(Boolean(errors?.travelerFields[t.id]?.dateOfBirth)),
                      )}
                    />
                    {errors?.travelerFields[t.id]?.dateOfBirth && (
                      <span className="font-sans text-[12px] text-danger-text">
                        {errors.travelerFields[t.id].dateOfBirth}
                      </span>
                    )}
                  </label>
                </div>

                {/*
                  The three confirmations.

                  Counsel's eligibility wording, so the sentences are not ours
                  to adjust and they carry no help icon: a tooltip sitting on a
                  legal line is a second gloss on it that nobody approved.

                  The first two are separate checkboxes rather than a choice,
                  as drawn. Ticking either clears the other, because a person
                  is not both over 18 and a guardian booking for a minor, and
                  letting both stand would send a contradiction into a review
                  done by hand. That is tidying the answer rather than judging
                  it — nothing here decides whether anyone may travel.
                */}
                {/* 12px apart, measured: three 20px rows at a 32px pitch on
                    the frame. This was 10. */}
                <div className="mt-4 flex flex-col gap-3">
                  <Checkbox
                    checked={Boolean(t.isAdult)}
                    onChange={(next) => {
                      const updated = travelers.map((x) =>
                        x.id === t.id
                          ? { ...x, isAdult: next, guardianBookingForMinor: next ? false : x.guardianBookingForMinor }
                          : x,
                      )
                      setTravelers(updated)
                      revalidate({ travelers: updated })
                    }}
                  >
                    <span className="font-sans text-[14px] leading-[1.4] text-[#000000]">
                      {STAGE1_CONFIRMATIONS.isAdult}
                    </span>
                  </Checkbox>
                  <Checkbox
                    checked={Boolean(t.guardianBookingForMinor)}
                    onChange={(next) => {
                      const updated = travelers.map((x) =>
                        x.id === t.id
                          ? { ...x, guardianBookingForMinor: next, isAdult: next ? false : x.isAdult }
                          : x,
                      )
                      setTravelers(updated)
                      revalidate({ travelers: updated })
                    }}
                  >
                    <span className="font-sans text-[14px] leading-[1.4] text-[#000000]">
                      {STAGE1_CONFIRMATIONS.guardianBookingForMinor}
                    </span>
                  </Checkbox>
                  {/* One message for the pair rather than one on each box: the
                      rule is about the two together, and a message under both
                      reads as two separate faults. */}
                  {errors?.travelerFields[t.id]?.age && (
                    <span className="font-sans text-[12px] text-danger-text">
                      {errors.travelerFields[t.id].age}
                    </span>
                  )}
                  <Checkbox
                    checked={Boolean(t.passportValidSixMonths)}
                    onChange={(next) => {
                      const updated = travelers.map((x) =>
                        x.id === t.id ? { ...x, passportValidSixMonths: next } : x,
                      )
                      setTravelers(updated)
                      revalidate({ travelers: updated })
                    }}
                  >
                    <span className="font-sans text-[14px] leading-[1.4] text-[#000000]">
                      {STAGE1_CONFIRMATIONS.passportValidSixMonths}
                    </span>
                  </Checkbox>
                  {errors?.travelerFields[t.id]?.passportValidSixMonths && (
                    <span className="font-sans text-[12px] text-danger-text">
                      {errors.travelerFields[t.id].passportValidSixMonths}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/*
              Add another traveller. This is drawn, and the history matters
              enough to keep.

              It was built on 2026-10-14 from a second-hand description, with a
              commit message claiming "the design has one" that nobody had
              checked. The client then opened both frames of the then-current
              screen and neither drew it, so it was reverted on the 16th. The
              frames that replaced them on the 19th — the three carrying a
              state on the end of their name — do draw it. So this is the
              design asking for it rather than the earlier guess returning.

              Capped at MAX_TRAVELERS. It is deliberately NOT capped at the
              group's remaining places: a request for more places than are open
              is a real thing the organiser is shown and can decline, and frame
              47's "Needs 2 places, 1 open" exists precisely for it. Stopping
              it here would make that screen unreachable.
            */}
            {travelers.length < MAX_TRAVELERS && (
              <button
                type="button"
                onClick={() => {
                  const next: Traveler[] = [
                    ...travelers,
                    { id: nextId(), name: '', isFounder: false },
                  ]
                  setTravelers(next)
                  revalidate({ travelers: next })
                }}
                className={cn(
                  'flex h-11 w-full items-center justify-center gap-2 font-sans text-[14px] font-medium text-[#112D7C] transition-colors hover:bg-[#CFE3F1]/30 focus-ring',
                  dashedAddSurfaceClass,
                )}
              >
                <DashedOutline />
                <span className="relative">+ Add another Traveler</span>
              </button>
            )}
            {/*
              30px between the traveller block and the pet block, where this
              column's gap gives 12 — so the first pet card carries the other
              18. It is a structural gap on the frame rather than a one-off
              position: `Frame 2147232890` lays the two blocks out with
              `itemSpacing` 30, while everything inside either block sits at
              12. Nothing separates them otherwise — frame 42 gives the pets
              no heading of their own.

              On the first card only, and only when there is one, so the No
              Pets state is untouched: its spacing is on a frame that did not
              change today and I have not measured it.
            */}
            {pets.map((pet, i) => (
              <div
                key={pet.id}
                className={cn(
                  'rounded-[16px] border border-[#A8A8A8]/40 bg-white p-4',
                  i === 0 && 'mt-[18px]',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-heading text-[16px] font-medium text-[#000000]">Pet {i + 1}</p>
                  {/*
                    "Remove Pet" stands where a "Cabin" badge used to.

                    That badge is not in any of the six frames — I checked all
                    of them rather than the one I remembered. It said nothing
                    the person had entered and nothing they could act on, and
                    the frames put a control in that position instead. Noted
                    here rather than removed quietly, because it is the one
                    thing in this commit that takes something off the screen.

                    Removal is immediate, as with a traveller and for the same
                    reason: the frames draw the control and no dialog, and
                    nothing has been sent yet.
                  */}
                  <RemoveButton
                    label="Remove Pet"
                    onClick={() => {
                      const next = pets.filter((x) => x.id !== pet.id)
                      setPets(next)
                      revalidate({ pets: next })
                    }}
                  />
                </div>
                {/*
                  Three fields, as Faraz's frames of 2026-10-26 now draw them:
                  Name, Type, Weight. This was one box — "Molly · Dog" — with
                  both halves typed free.

                  The type is a list of five because a typed one cannot be
                  matched to a species. Vivek, 10-23: the CDC dog import
                  requirement is created only for dogs, so a pet entered as
                  "lab" never raises it, and normalising words into a
                  regulatory category was refused — a list in our code that
                  misses a breed means nothing is raised and nobody sees the
                  absence. Murtaza took the decision on 10-23 and the frames
                  landed on the 26th.

                  `PET_TYPES` is the Flight Builder's own list, not a second
                  copy: the five values Zoho already receives from the builder,
                  in the order and capitalisation the open dropdown on the
                  desktop One Pet frame draws.

                  Stacked on a phone and three columns from `sm`, which is what
                  the mobile frames draw, at the frame's 16px gap — applied to
                  the whole card in the same pass rather than to this row
                  alone.
                */}
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  {/* No trailing glyph: the frame draws one in Type and Weight
                      and none here. No help icon either — there are no words
                      for it (§33) and an icon with nothing behind it costs
                      more than its absence. */}
                  <label className="flex min-w-0 flex-col gap-1.5">
                    <span className={LABEL}>Name</span>
                    {/* `FIELD_BORDER(false)` always: a pet name is not
                        required, so this field has no failing state to show.
                        See `validatePetList`. */}
                    <span className={cn(FIELD_SHELL, FIELD_BORDER(false))}>
                      <input
                        size={1}
                        value={pet.name}
                        placeholder="Name"
                        aria-label="Pet name"
                        onChange={(e) => {
                          const next = pets.map((x) =>
                            x.id === pet.id ? { ...x, name: e.target.value } : x,
                          )
                          setPets(next)
                          revalidate({ pets: next })
                        }}
                        className={FIELD_INPUT}
                      />
                    </span>
                  </label>
                  {/* A div rather than a label, like Weight beside it: the
                      Select is a button with its own listbox, and a label
                      wrapping it would compete for the click. */}
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className={LABEL}>Type</span>
                    <Select
                      aria-label="Pet type"
                      placeholder="Select type"
                      options={PET_TYPES}
                      value={pet.type}
                      invalid={Boolean(errors?.pets[pet.id]?.type)}
                      onChange={(e) => {
                        const next = pets.map((x) =>
                          x.id === pet.id ? { ...x, type: e.target.value } : x,
                        )
                        setPets(next)
                        revalidate({ pets: next })
                      }}
                    />
                    {/* Kept from the composite. The frames draw no empty-type
                        state, and the banner tells the member to complete the
                        highlighted fields — so the field that fails says what
                        it wants rather than only turning red. */}
                    {errors?.pets[pet.id]?.type && (
                      <span className="font-sans text-[12px] text-danger-text">
                        {errors.pets[pet.id]!.type}
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5">
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
                {/* 16px under the fields, as on the frame. */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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

            {/*
              Nothing added yet. The No Pets frame draws this rather than an
              empty gap, and its wording is the client's — "request" rather
              than "project", corrected on the frame on 2026-10-22.

              The add control carries a different label here: "Add a Pet" with
              nothing in the list, "Add another Pet" once there is. Both are as
              drawn, so the two are rendered from one place rather than two
              that can drift.
            */}
            {pets.length === 0 && (
              <EmptyState
                icon="paw"
                radiusClass="rounded-[16px]"
                heading="No Pets added yet!"
                line="Add a pet to include them in this request"
              />
            )}

            {/*
              Capped the same way the Flight Builder caps it, and for the same
              reason: `validatePetList` refuses more than MAX_PETS_PER_TRAVELER
              per traveller, so a control that could exceed it would offer
              something the form then rejects.
            */}
            {pets.length < Math.max(1, travelers.length) * MAX_PETS_PER_TRAVELER && (
              <button
                type="button"
                onClick={() => {
                  const next = [...pets, emptyPet()]
                  setPets(next)
                  // Adding one has to turn the section on, or the first pet is
                  // added into a list the payload then drops.
                  setPetsEnabled(true)
                  revalidate({ pets: next, petsEnabled: true })
                }}
                className={cn(
                  'flex h-11 w-full items-center justify-center gap-2 font-sans text-[14px] font-medium text-[#112D7C] transition-colors hover:bg-[#CFE3F1]/30 focus-ring',
                  dashedAddSurfaceClass,
                )}
              >
                <DashedOutline />
                <span className="relative">
                  {pets.length === 0 ? '+ Add a Pet' : '+ Add another Pet'}
                </span>
              </button>
            )}

            {/* The cap, said once, where the control that hits it is. */}
            {errors?.petCount && (
              <span className="font-sans text-[12px] text-danger-text">{errors.petCount}</span>
            )}
          </div>
        )}

        {!APPROVAL_FLOW_ENABLED && (
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

          {/*
            **This diverges from the design and the note that used to be here
            was wrong.** It read "Frame 42 draws no add control, confirmed with
            the client 2026-10-07" — but frame 42 *does* draw one, and the only
            client message from that date reports the missing control as a
            defect. Leaving it out was our own call, not theirs.

            Being put back as warranty work (client finding 4, 2026-10-12). Do
            not cite a client decision for its absence.
            The party comes from the member's saved profile — "Pulled from your
            profile" — so a request for two places is made by someone whose
            profile holds two travellers, not by adding one here. That is what
            keeps frame 47's "Needs 2 places, 1 open" reachable.
          */}
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
        )}
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
        Travel readiness, and it renders with no pets as well as with them.

        This was guarded on `pets.length > 0`, which took the whole section off
        the screen when the last pet was removed. The No Pets frame draws it
        either way: the heading, the line under it, and an empty state in place
        of the cards. Caught on the preview, not by me.

        The frame also carries a "Helper text goes here" line under the
        heading. That is placeholder text in the design rather than copy, so it
        is deliberately not built.
      */}
      {APPROVAL_FLOW_ENABLED && (
        <section className="rounded-[20px] border border-dashed border-[#112D7C] bg-[#CFE3F1]/10 p-4">
          <h2 className={HEADING}>Travel readiness</h2>
          <p className={cn(MUTED, 'mt-1')}>Confirmed for each pet on this request.</p>
          {pets.length === 0 && (
            <div className="mt-4">
              <EmptyState
                icon="note"
                radiusClass="rounded-[20px]"
                heading="No Pets on this request yet."
                line="Add a pet above to confirm travel readiness."
              />
            </div>
          )}
          {pets.length > 0 && (
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
                    One confirmation per pet, which is what the three-pet frame
                    settles.

                    It was bound to a single value for the whole request,
                    because only one pet was ever drawn — so with three pets
                    every box moved together and one tick answered for animals
                    nobody had considered separately. Each card now carries its
                    own answer, and the error sits with the pet it belongs to.
                  */}
                  <div
                    className={cn(
                      'mt-3 rounded-[12px] border bg-white p-3',
                      errors?.pets[pet.id]?.readiness
                        ? 'border-danger-text'
                        : 'border-[#A8A8A8]/40',
                    )}
                  >
                    <Checkbox
                      checked={Boolean(pet.readinessAccepted)}
                      invalid={Boolean(errors?.pets[pet.id]?.readiness)}
                      onChange={(next) => {
                        const updated = pets.map((x) =>
                          x.id === pet.id ? { ...x, readinessAccepted: next } : x,
                        )
                        setPets(updated)
                        revalidate({ pets: updated })
                      }}
                    >
                      <span className="font-sans text-[14px] leading-[1.4] text-[#000000]">
                        <em className="font-medium not-italic">I agree</em> &mdash; I have read
                        and accept the above.
                      </span>
                    </Checkbox>
                    {/* The rule lives in `validatePetList`; without this the
                        send was simply refused with nothing said. */}
                    {errors?.pets[pet.id]?.readiness && (
                      <p className="mt-2 font-sans text-[12px] font-medium text-danger-text">
                        {errors.pets[pet.id]!.readiness}
                      </p>
                    )}
                  </div>
              </div>
            ))}

            {/*
              The standing service-animal note used to sit here — "If a pet is
              set to service animal", the Yes selected badge, and the paragraph
              about the carrier's permitted inquiries.

              Removed 2026-10-26 on Murtaza's instruction. It came off all six
              frames deliberately as part of the readiness change Chuck approved
              on 2026-10-23, and the build follows the frames.

              Recorded rather than deleted silently, because it leaves the
              exemption unexplained on screen: a service animal now simply has
              no confirmation and nothing says why. That was raised before it
              was taken out and the answer was to take it out, so it is their
              call and not an oversight. The carrier wording is preserved in
              CLIENT-DECISIONS §43 if it is ever wanted back.
            */}

          </div>
          )}
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
          {/*
            Two fixed lines on a phone, one on desktop.

            Faraz's call of 2026-10-23, over the recommendation to let the row
            wrap: origin with its code on line one, the plane mark and the
            destination with its code on line two, so every route sits
            identically whatever the city names are. A wrapping row put the
            mark at the end of line one for some pairs of names and not
            others, which is the part he was deciding against.

            Right-aligned, because the two lines end together on the frame —
            both at x=52315.5 on `4881:43415`, where the value column ends.

            Measured on `4835:50402` and `4881:43415`: 8px between the two
            lines, 14px from the mark to the destination on mobile and 18px
            between every part on desktop, with the mark 22px and 24px. It was
            8px throughout and the mark 22px on both.

            `lg`, not `sm`, because that is where this card already changes —
            `Detail` carries the type scale at the same breakpoint.
          */}
          <span className="inline-flex flex-col items-end gap-2 lg:flex-row lg:items-center lg:gap-[18px]">
            <span>{place(flight.route_origin_city, detail?.originCode)}</span>
            <span className="inline-flex items-center gap-[14px] lg:gap-[18px]">
              <Image
                src="/images/routes/Flighticons.png"
                alt="to"
                width={34}
                height={34}
                className="size-[22px] shrink-0 object-contain lg:size-[24px]"
              />
              <span>{place(flight.route_destination_city, detail?.destinationCode)}</span>
            </span>
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
