/**
 * Step validation — the contract that gates navigation between steps.
 *
 * These are pure functions over the draft (no React, no DOM) so the rules stay
 * testable and live in one place. Each returns a structured error object that
 * the step UI renders as a top banner, per-field messages, and red borders.
 *
 * Copy is taken verbatim from the designs.
 */

import { isPastDate } from '@/utils/date'
import { MAX_PETS_PER_TRAVELER } from '../config/capacity'
import { isPetType } from '../config/petOptions'
import type { DateSelection, FlightDraft, Pet, RouteSelection, StepId, Traveler } from '@/types'

/* ------------------------------------------------------------------ Route */

export interface RouteErrors {
  banner?: string
  from?: string
  to?: string
  /** Same-metro case highlights both fields red with no per-field text. */
  fromInvalid?: boolean
  toInvalid?: boolean
}

function isSameMetro(route: RouteSelection): boolean {
  const { from, to } = route
  if (!from || !to) return false
  const sameCity =
    from.city.toLowerCase() === to.city.toLowerCase() &&
    from.region.toLowerCase() === to.region.toLowerCase() &&
    from.country.toLowerCase() === to.country.toLowerCase()
  if (!sameCity) return false
  // Two distinct specific airports in the same metro are allowed.
  return from.kind === 'city' || to.kind === 'city' || from.code === to.code
}

export function validateRoute(route: RouteSelection): RouteErrors {
  const { from, to } = route

  if (!from && !to) {
    return {
      banner: 'We need both fields filled before we can continue.',
      from: 'Please enter where you’re flying from.',
      to: 'Please enter where you’re flying to.',
    }
  }

  if (!from || !to) {
    // Per the designs, when only one field is missing the Route step shows no
    // top banner — the red border and per-field message are the only signal.
    return {
      from: !from ? 'Please enter where you’re flying from.' : undefined,
      to: !to ? 'Please enter where you’re flying to.' : undefined,
    }
  }

  if (isSameMetro(route)) {
    return {
      banner:
        'From and to look like the same city. If you meant to fly between airports in the same metro (e.g., LGA → JFK in New York), pick the specific airports using their codes.',
      fromInvalid: true,
      toInvalid: true,
    }
  }

  return {}
}

export function hasRouteErrors(errors: RouteErrors): boolean {
  return Boolean(
    errors.banner || errors.from || errors.to || errors.fromInvalid || errors.toInvalid,
  )
}

/* ------------------------------------------------------------------ Dates */

export interface DateErrors {
  banner?: string
  date?: string
  /**
   * Which of the two range fields the message is about.
   *
   * The step used to put `invalid` on the end field alone — this function's own
   * note said "highlight end date only in the UI" — so "Please select a start
   * date" and "Choose a date that isn't in the past" both reddened the *end*
   * input (client, 2026-10-12, finding 23). Undefined in specific mode, where
   * there is only one field to point at.
   */
  field?: 'start' | 'end'
}

export function validateDates(date: DateSelection): DateErrors {
  if (date.mode === 'specific') {
    if (!date.start) return { date: 'Please select a date.' }
    if (isPastDate(date.start)) return { date: 'Choose a date that isn’t in the past.' }
    return {}
  }

  // Range mode. Each message names the field it is about, so the input that
  // highlights is the one that is wrong.
  if (!date.end) return { date: 'Please select an end date.', field: 'end' }
  if (!date.start) return { date: 'Please select a start date.', field: 'start' }
  if (isPastDate(date.start))
    return { date: 'Choose a date that isn’t in the past.', field: 'start' }
  if (date.end < date.start)
    return { date: 'The end date can’t be before the start date.', field: 'end' }
  return {}
}

export function hasDateErrors(errors: DateErrors): boolean {
  return Boolean(errors.banner || errors.date)
}

/* ----------------------------------------------------- Pets & passengers */

export interface PetFieldErrors {
  name?: string
  type?: string
  breed?: string
  weight?: string
  temperament?: string
  /**
   * This pet's own readiness confirmation. Request surface only.
   *
   * Separate from `PetListErrors.readiness`, which stays as it is: that one
   * message belongs to the Flight Builder and Complete Profile, where a single
   * confirmation covers the whole draft. On a join request each pet is asked
   * its own question, so each pet needs its own answer back.
   */
  readiness?: string
}

/**
 * Per-field errors for a traveller's Stage 1 answers.
 *
 * Separate from `PetsErrors.travelers`, which stays a single string per
 * traveller for the name. Three screens read that string today — the builder's
 * Pets step, Complete Profile and the Join Review name field — and reshaping it
 * into an object to describe fields only one surface collects would break all
 * three for no gain. The surface decides, as it already does for pets.
 */
export interface TravelerFieldErrors {
  email?: string
  nationality?: string
  dateOfBirth?: string
  /** One message for the pair: neither box ticked. */
  age?: string
  passportValidSixMonths?: string
}

export interface PetsErrors {
  banner?: string
  travelers: Record<string, string>
  /** Stage 1 answers. Populated on the request surface only. */
  travelerFields: Record<string, TravelerFieldErrors>
  pets: Record<string, PetFieldErrors>
  readiness?: string
  /** Breach of the three-pets-per-traveller cap. */
  petCount?: string
}

/**
 * The traveler and pet input, independent of a flight draft.
 *
 * Frame 31 ("Complete your profile") reuses `TravelerCard` and `PetCard`
 * verbatim from this step, so it has to apply the same rules with the same copy
 * — otherwise a field is required on one screen and optional on another while
 * looking identical on both. Taking a plain shape rather than a `FlightDraft`
 * is what lets onboarding share these rules instead of restating them.
 */
export interface TravelerPetInput {
  /** Passed through to `validatePetList` — see `PetListInput.surface`. */
  surface?: PetListInput['surface']
  travelers: Traveler[]
  pets: Pet[]
  petsEnabled: boolean
  /** Travel-readiness acceptance — required only when pets are actually coming. */
  readinessAccepted: boolean
}

/**
 * The pet rules on their own, for a caller that knows the party size but not
 * the travellers' names — the join endpoint re-checks a submitted party with
 * these, so the server and the screen cannot disagree.
 */
export interface PetListInput {
  pets: Pet[]
  petsEnabled: boolean
  readinessAccepted: boolean
  /** The pet cap is per traveller, so it needs the party size. */
  travelerCount: number
  /**
   * Which surface is asking, because a join request blocks on less than the
   * Flight Builder does.
   *
   * Settled with the client 2026-10-16, and it is our call rather than theirs —
   * nothing has ever been written about validation. A **request** validates on
   * three things: type, weight and the service-animal answer.
   *
   *  - **Temperament** leaves the blocking set entirely. It has no home: the
   *    client's Pets module has no field for it, and Chuck's Stage 1 collection
   *    list names only type, weight and service animal. Those are the two
   *    places it would live and it is in neither.
   *  - **Breed** stays collected but stops blocking, because the module does
   *    have somewhere to put it.
   *
   * Neither change touches the payload: `mapPet` already sends `null` for an
   * unchosen temperament and `nullIfBlank` for breed, so an absent value
   * travels as null exactly as the contract requires.
   *
   * Defaults to the stricter set, so the Flight Builder and the profile are
   * unaffected until someone decides they should be. That question is open —
   * the same argument applies to them — but it was not asked and is not
   * assumed here.
   */
  surface?: 'request' | 'builder'
}

export type PetListErrors = Pick<PetsErrors, 'pets' | 'readiness' | 'petCount'>

export function hasPetListErrors(errors: PetListErrors): boolean {
  return (
    Object.keys(errors.pets).length > 0 || Boolean(errors.readiness) || Boolean(errors.petCount)
  )
}

/** The shared rules. `validatePets` is this, applied to a flight draft. */
export function validateTravelersAndPets(input: TravelerPetInput): PetsErrors {
  const travelers: Record<string, string> = {}
  const travelerFields: Record<string, TravelerFieldErrors> = {}

  for (const t of input.travelers) {
    if (t.name.trim().length === 0) travelers[t.id] = 'Full name required.'
    if (input.surface !== 'request') continue

    /*
     * Stage 1, and only on the request. These fields exist on no other screen
     * — the builder, the profile and the preview mocks all construct a
     * traveller without them — so requiring them anywhere else would refuse a
     * flight for an answer nobody was asked.
     *
     * Nothing below decides anything. The review is by hand, by Chuck or
     * Sarah, and §21 is explicit that the product carries no eligibility logic
     * and no automatic refusal. These are completeness checks: they say a box
     * is empty, never that the answer in it is wrong.
     */
    const fieldErrors: TravelerFieldErrors = {}

    if (!t.nationality?.trim()) fieldErrors.nationality = 'Nationality is required.'
    if (!t.dateOfBirth?.trim()) fieldErrors.dateOfBirth = 'Date of birth is required.'

    /*
     * One of the two age boxes, not both and not neither.
     *
     * Requiring one is a completeness check rather than a judgment about
     * anyone's eligibility, which is why it stays inside Chuck's rule that
     * nothing in the product decides anything — Murtaza settled it on
     * 2026-10-21 as form validation and therefore ours. The screen clears
     * whichever box was not just ticked, so "both" is unreachable through the
     * UI; this still refuses it, because a payload assembled another way
     * should not be able to assert a contradiction into a manual review.
     */
    if (t.isAdult && t.guardianBookingForMinor) {
      fieldErrors.age = 'Choose one: either the traveller is 18 or above, or a parent or guardian is booking for a minor.'
    } else if (!t.isAdult && !t.guardianBookingForMinor) {
      fieldErrors.age = 'Confirm the traveller is 18 or above, or that a parent or guardian is booking for them.'
    }

    if (!t.passportValidSixMonths) {
      fieldErrors.passportValidSixMonths = 'Please confirm the passport validity.'
    }

    /*
     * Email is checked for shape but NOT required, deliberately.
     *
     * It is on the screen because frame 42 draws it, not because Stage 1 asks
     * for it — §21's list is five items and an email is not among them, and
     * the join request shape Vivek sent has no email field at all. Whether it
     * belongs in Stage 1 is with Chuck as of 2026-10-22. Until that comes
     * back, refusing a request over a field nobody has required would be us
     * deciding it.
     *
     * Traveller 1's address is validated separately on the screen, because it
     * becomes the request's `contact_email` and has its own rules.
     */
    const email = t.email?.trim()
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      fieldErrors.email = 'Enter a valid email address.'
    }

    if (Object.keys(fieldErrors).length > 0) travelerFields[t.id] = fieldErrors
  }

  const { pets, readiness, petCount } = validatePetList({
    pets: input.pets,
    petsEnabled: input.petsEnabled,
    readinessAccepted: input.readinessAccepted,
    travelerCount: input.travelers.length,
    surface: input.surface,
  })

  const hasAny =
    Object.keys(travelers).length > 0 ||
    Object.keys(travelerFields).length > 0 ||
    Object.keys(pets).length > 0 ||
    Boolean(readiness) ||
    Boolean(petCount)

  return {
    banner: hasAny ? 'Please complete the highlighted fields before continuing.' : undefined,
    travelers,
    travelerFields,
    pets,
    readiness,
    petCount,
  }
}

export function validatePetList(input: PetListInput): PetListErrors {
  const pets: Record<string, PetFieldErrors> = {}
  if (input.petsEnabled) {
    for (const p of input.pets) {
      const fieldErrors: PetFieldErrors = {}
      // Name is deliberately NOT required: nothing operational depends on it.
      // Type and weight are, because the operator prepares the cabin from them
      // — a cat needs a carrier, a dog a blanket — and weight can change the
      // aircraft or the price. Client, 2026-09-09.
      if (p.type.trim().length === 0) fieldErrors.type = 'Pet type is required.'
      /*
       * And it has to be one of the five.
       *
       * Unreachable through either screen — both pick from `PET_TYPES` — and
       * that is the point: this is the rule for a request that did not come
       * from the screen. Vivek's CDC dog requirement is created for dogs only,
       * so a type outside the list is a pet whose compliance requirement
       * silently never gets raised. Refusing it is the only honest answer,
       * because nobody sees an absence.
       *
       * Every surface, not just the request. The Flight Builder has picked from
       * this list since M1, so nothing it sends can fail here, and a stored pet
       * is never re-validated. Checked rather than assumed before shipping it:
       * read-only query on 2026-10-26 over every stored pet — join requests and
       * members both — returns Dog, Cat, Bird, Rabbit, Other and nothing else.
       */
      else if (!isPetType(p.type.trim())) fieldErrors.type = 'Choose a pet type from the list.'
      if (p.weight.trim().length === 0) fieldErrors.weight = 'Weight is required.'
      // Breed and temperament block on the builder and the profile, not on a
      // request — see `surface` above. A request cannot be held up by a field
      // the client's own record has nowhere to put.
      if (input.surface !== 'request') {
        if (p.breed.trim().length === 0) fieldErrors.breed = 'Breed is required.'
        if (p.temperament.length === 0) fieldErrors.temperament = 'Temperament is required.'
      }
      if (Object.keys(fieldErrors).length > 0) pets[p.id] = fieldErrors
    }
  }

  // Three pets per traveller, so the cap rises with the party rather than
  // being a flat number. Client, 2026-09-09.
  const petCap = Math.max(1, input.travelerCount) * MAX_PETS_PER_TRAVELER
  const petCount =
    input.petsEnabled && input.pets.length > petCap
      ? `Up to ${MAX_PETS_PER_TRAVELER} pets per traveller — that is ${petCap} for this party.`
      : undefined

  /**
   * Only pets that are subject to the confirmation can require it.
   *
   * A qualified service animal is not subject to travel readiness — frame 42
   * says so, and the screen does not offer a checkbox for one. Demanding the
   * acceptance anyway left a request whose only pet is a service animal unable
   * to submit at all: the rule asked for a confirmation the screen had no way
   * to give.
   *
   * The Flight Builder is unaffected — it does not set `serviceAnimal`, so
   * every pet there still requires the acceptance exactly as before.
   */
  const needsReadiness =
    input.petsEnabled && input.pets.some((pet) => !pet.serviceAnimal)

  /*
   * On a join request the confirmation is per pet, so it is checked per pet.
   *
   * The three-pet frame settles that each card carries its own "I agree", and
   * a service animal is never asked at all — so it is skipped here rather than
   * defaulted to false. Skipping and failing are different facts, and this is
   * the rule that keeps the blank in the payload honest.
   *
   * Everywhere else keeps the single message below. The builder and Complete
   * Profile ask once for a whole draft and have no per-pet question, so a
   * per-pet rule there would fail on an answer nobody was offered.
   */
  if (input.surface === 'request' && input.petsEnabled) {
    for (const pet of input.pets) {
      if (pet.serviceAnimal) continue
      if (pet.readinessAccepted) continue
      pets[pet.id] = {
        ...(pets[pet.id] ?? {}),
        readiness: 'Please confirm travel readiness for this pet.',
      }
    }
  }

  const readiness =
    input.surface !== 'request' && needsReadiness && !input.readinessAccepted
      ? 'Please confirm Travel Readiness before continuing.'
      : undefined

  return { pets, readiness, petCount }
}

export function validatePets(draft: FlightDraft): PetsErrors {
  return validateTravelersAndPets({
    travelers: draft.travelers,
    pets: draft.pets,
    petsEnabled: draft.petsEnabled,
    readinessAccepted: draft.petReadinessAccepted,
  })
}

export function hasPetsErrors(errors: PetsErrors): boolean {
  return Boolean(errors.banner)
}

/* ------------------------------------------------------------------ Notes */

export const NOTES_MAX_LENGTH = 500

export interface NotesErrors {
  notes?: string
}

export function validateNotes(notes: string): NotesErrors {
  if (notes.length > NOTES_MAX_LENGTH) {
    return { notes: `Notes can be at most ${NOTES_MAX_LENGTH} characters.` }
  }
  return {}
}

/* ------------------------------------------------------- Step access guard */

/**
 * Per-step completion, used to gate deep-linking into the flow. A step is
 * "complete" when its own gating validation passes; `notes` is skippable, so it
 * never blocks. This is the same rule set the Continue buttons enforce — reused
 * here so a manual URL change can't bypass it.
 */
export function isStepComplete(stepId: StepId, draft: FlightDraft): boolean {
  switch (stepId) {
    case 'route':
      return !hasRouteErrors(validateRoute(draft.route))
    case 'dates':
      return !hasDateErrors(validateDates(draft.date))
    case 'pets':
      return !hasPetsErrors(validatePets(draft))
    case 'notes':
      // Skippable — the character-limit check is the only rule, and an
      // over-length draft can't be produced through the UI.
      return true
    case 'review':
    case 'share':
      // Terminal steps: reachable only once every gated step above is complete.
      return true
    default:
      return true
  }
}

/**
 * The first step (in flow order) the user has NOT yet legitimately completed —
 * i.e. the furthest they're allowed to be. Returns `null` when every gated step
 * is complete (the whole flow is reachable). `share` is excluded here because it
 * is a post-creation screen gated separately by the presence of a created flight.
 */
export function firstIncompleteStep(draft: FlightDraft): StepId | null {
  const GATED: StepId[] = ['route', 'dates', 'pets']
  for (const stepId of GATED) {
    if (!isStepComplete(stepId, draft)) return stepId
  }
  return null
}
