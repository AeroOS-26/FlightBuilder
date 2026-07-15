/**
 * Option lists for the pet form (type, breed, weight, temperament).
 *
 * Kept here as the single source of truth so the selects and validation stay
 * in sync. Breeds are keyed by species with a sensible generic fallback.
 */

import type { SelectOption } from '@/components/ui'
import type { PetTemperament } from '@/types'

export const PET_TYPES: SelectOption[] = [
  { value: 'Dog', label: 'Dog' },
  { value: 'Cat', label: 'Cat' },
  { value: 'Bird', label: 'Bird' },
  { value: 'Rabbit', label: 'Rabbit' },
  { value: 'Other', label: 'Other' },
]

const BREEDS_BY_TYPE: Record<string, string[]> = {
  Dog: [
    'Golden Retriever',
    'Labrador Retriever',
    'French Bulldog',
    'German Shepherd',
    'Poodle',
    'Beagle',
    'Mixed / Other',
  ],
  Cat: [
    'Domestic Shorthair',
    'Maine Coon',
    'Siamese',
    'Persian',
    'Bengal',
    'Ragdoll',
    'Mixed / Other',
  ],
  Bird: ['Parrot', 'Cockatiel', 'Canary', 'Budgerigar', 'Other'],
  Rabbit: ['Holland Lop', 'Netherland Dwarf', 'Lionhead', 'Other'],
  Other: ['Other'],
}

const GENERIC_BREEDS = ['Mixed / Other']

/** Breed options for the chosen species (generic fallback when unset). */
export function getBreedOptions(type: string): SelectOption[] {
  const list = BREEDS_BY_TYPE[type] ?? GENERIC_BREEDS
  return list.map((b) => ({ value: b, label: b }))
}

/** Weight options in pounds (1–150 lb). Singular "1 lb", plural "2 lbs". */
export const WEIGHT_OPTIONS: SelectOption[] = Array.from({ length: 150 }, (_, i) => {
  const lbs = i + 1
  return { value: String(lbs), label: `${lbs} ${lbs === 1 ? 'lb' : 'lbs'}` }
})

export const TEMPERAMENTS: readonly PetTemperament[] = [
  'Calm',
  'Excitable',
  'Anxious',
  'Travel-experienced',
] as const
