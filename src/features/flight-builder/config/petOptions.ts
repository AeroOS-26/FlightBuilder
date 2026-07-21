/**
 * Option lists for the pet form (type, weight, temperament).
 *
 * Kept here as the single source of truth so the selects and validation stay
 * in sync. Breed is a free-text field, so it has no option list.
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

/** Weight options in pounds (1–150 lb). Singular "1 lb", plural "2 lbs". */
export const WEIGHT_OPTIONS: SelectOption[] = Array.from({ length: 150 }, (_, i) => {
  const lbs = i + 1
  return { value: String(lbs), label: `${lbs} ${lbs === 1 ? 'lb' : 'lbs'}` }
})

export const TEMPERAMENTS: readonly PetTemperament[] = [
  'Calm',
  'Excitable',
  'Anxious',
  'Experienced Traveler',
] as const
