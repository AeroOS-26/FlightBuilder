'use client'

/**
 * Derives the short, display-ready trip summary from the draft.
 *
 * Centralizes the formatting used by the trip-summary panels (Dates, Notes,
 * Review) and the inline summary row (Pets), so every surface shows the same
 * strings.
 */

import { useFlightBuilderStore } from '@/features/flight-builder/store/flightBuilderStore'
import {
  formatDateSelection,
  formatPets,
  formatTravelers,
  placeCity,
} from '@/utils/flightFormat'

export interface TripSummary {
  fromCity: string
  toCity: string
  hasRoute: boolean
  date: string
  hasDate: boolean
  travelers: string
  pets: string
  hasPets: boolean
  notes: string
}

export function useTripSummary(): TripSummary {
  const draft = useFlightBuilderStore((s) => s.draft)

  const fromCity = placeCity(draft.route.from)
  const toCity = placeCity(draft.route.to)
  const date = formatDateSelection(draft.date)
  const hasPets = draft.petsEnabled && draft.pets.length > 0

  return {
    fromCity,
    toCity,
    hasRoute: Boolean(fromCity && toCity),
    date,
    hasDate: Boolean(date),
    travelers: formatTravelers(draft.travelers),
    pets: hasPets ? formatPets(draft.pets) : 'No pets',
    hasPets,
    notes: draft.notes.trim(),
  }
}