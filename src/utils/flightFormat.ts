/**
 * Presentation formatters that turn the draft into the short, human strings
 * shown in the trip-summary panels, the review step, and the share screen.
 *
 * Pure functions, no React — keeps copy derivation in one testable place.
 */

import { formatLongDate, fromISODate } from './date'
import type { DateSelection, Pet, RoutePlace, RouteSelection, Traveler } from '@/types'

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** "San Francisco" — the city name only. */
export function placeCity(place: RoutePlace | null): string {
  return place?.city ?? ''
}

/** "San Francisco (SFO)" — city with representative/specific code. */
export function placeWithCode(place: RoutePlace | null): string {
  if (!place) return ''
  return place.code ? `${place.city} (${place.code})` : place.city
}

/** Both endpoints as a short "City → City" / "City ⇄ City" pair. */
export function routeCities(route: RouteSelection): { from: string; to: string } {
  return { from: placeCity(route.from), to: placeCity(route.to) }
}

/** Format the date selection: "June 19, 2026" or "Mar 13 – Mar 23, 2026". */
export function formatDateSelection(date: DateSelection): string {
  if (date.mode === 'specific') {
    return date.start ? formatLongDate(date.start) : ''
  }
  if (!date.start || !date.end) return ''
  const s = fromISODate(date.start)
  const e = fromISODate(date.end)
  const sameYear = s.getFullYear() === e.getFullYear()
  const start = `${SHORT_MONTHS[s.getMonth()]} ${s.getDate()}${sameYear ? '' : `, ${s.getFullYear()}`}`
  const end = `${SHORT_MONTHS[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`
  return `${start} – ${end}`
}

/** "2 adults" / "1 adult". */
export function formatTravelers(travelers: Traveler[]): string {
  const n = travelers.length
  return `${n} ${n === 1 ? 'adult' : 'adults'}`
}

const PET_PLURALS: Record<string, string> = {
  Dog: 'dogs',
  Cat: 'cats',
  Bird: 'birds',
  Rabbit: 'rabbits',
}

function pluralizePet(type: string, count: number): string {
  if (count === 1) return type.toLowerCase()
  return PET_PLURALS[type] ?? `${type.toLowerCase()}s`
}

/** "1 dog (Biscuit), 1 cat (Mochi)" — grouped by type, names in parens. */
export function formatPets(pets: Pet[]): string {
  if (pets.length === 0) return 'None'
  const groups = new Map<string, string[]>()
  for (const pet of pets) {
    const type = pet.type || 'Pet'
    const names = groups.get(type) ?? []
    if (pet.name.trim()) names.push(pet.name.trim())
    groups.set(type, names)
  }
  const parts: string[] = []
  for (const [type, names] of groups) {
    const count = pets.filter((p) => (p.type || 'Pet') === type).length
    const label = `${count} ${pluralizePet(type, count)}`
    parts.push(names.length > 0 ? `${label} (${names.join(', ')})` : label)
  }
  return parts.join(', ')
}
