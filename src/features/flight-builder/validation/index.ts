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
import type { DateSelection, FlightDraft, RouteSelection } from '@/types'

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
    return {
      banner: 'Please complete the highlighted fields before continuing.',
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
    if (!date.start) return { date: 'Select a date.' }
    if (isPastDate(date.start)) return { date: 'Choose a date that isn’t in the past.' }
    return {}
  }

  // Range mode.
  if (!date.start || !date.end) return { date: 'Select a start and end date.' }
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

export function validatePets(draft: FlightDraft): PetsErrors {
  const travelers: Record<string, string> = {}
  for (const t of draft.travelers) {
    if (t.name.trim().length === 0) travelers[t.id] = 'Full name required.'
  }

  const pets: Record<string, PetFieldErrors> = {}
  if (draft.petsEnabled) {
    for (const p of draft.pets) {
      const fieldErrors: PetFieldErrors = {}
      if (p.name.trim().length === 0) fieldErrors.name = 'Pet name is required.'
      if (p.type.trim().length === 0) fieldErrors.type = 'Pet type is required.'
      if (p.breed.trim().length === 0) fieldErrors.breed = 'Breed is required.'
      if (p.weight.trim().length === 0) fieldErrors.weight = 'Weight is required.'
      if (p.temperament.length === 0) fieldErrors.temperament = 'Temperament is required.'
      if (Object.keys(fieldErrors).length > 0) pets[p.id] = fieldErrors
    }
  }

  const petsOnFlight = draft.petsEnabled && draft.pets.length > 0
  const readiness =
    petsOnFlight && !draft.petReadinessAccepted
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
