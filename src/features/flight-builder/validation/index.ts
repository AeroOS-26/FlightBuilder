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
}

export function validateDates(date: DateSelection): DateErrors {
  if (date.mode === 'specific') {
    if (!date.start) return { date: 'Please select a date.' }
    if (isPastDate(date.start)) return { date: 'Choose a date that isn’t in the past.' }
    return {}
  }

  // Range mode — highlight end date only in the UI.
  if (!date.end) return { date: 'Please select an end date.' }
  if (!date.start) return { date: 'Please select a start date.' }
  if (isPastDate(date.start)) return { date: 'Choose a date that isn’t in the past.' }
  if (date.end < date.start) return { date: 'The end date can’t be before the start date.' }
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
}

export interface PetsErrors {
  banner?: string
  travelers: Record<string, string>
  pets: Record<string, PetFieldErrors>
  readiness?: string
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
  travelers: Traveler[]
  pets: Pet[]
  petsEnabled: boolean
  /** Travel-readiness acceptance — required only when pets are actually coming. */
  readinessAccepted: boolean
}

/** The shared rules. `validatePets` is this, applied to a flight draft. */
export function validateTravelersAndPets(input: TravelerPetInput): PetsErrors {
  const travelers: Record<string, string> = {}
  for (const t of input.travelers) {
    if (t.name.trim().length === 0) travelers[t.id] = 'Full name required.'
  }

  const pets: Record<string, PetFieldErrors> = {}
  if (input.petsEnabled) {
    for (const p of input.pets) {
      const fieldErrors: PetFieldErrors = {}
      if (p.name.trim().length === 0) fieldErrors.name = 'Pet name is required.'
      if (p.type.trim().length === 0) fieldErrors.type = 'Pet type is required.'
      if (p.breed.trim().length === 0) fieldErrors.breed = 'Breed is required.'
      if (p.weight.trim().length === 0) fieldErrors.weight = 'Weight is required.'
      if (p.temperament.length === 0) fieldErrors.temperament = 'Temperament is required.'
      if (Object.keys(fieldErrors).length > 0) pets[p.id] = fieldErrors
    }
  }

  const petsPresent = input.petsEnabled && input.pets.length > 0
  const readiness =
    petsPresent && !input.readinessAccepted
      ? 'Please confirm Travel Readiness before continuing.'
      : undefined

  const hasAny =
    Object.keys(travelers).length > 0 || Object.keys(pets).length > 0 || Boolean(readiness)

  return {
    banner: hasAny ? 'Please complete the highlighted fields before continuing.' : undefined,
    travelers,
    pets,
    readiness,
  }
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
