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

/**
 * Whether a value is one of the five, for judging what *arrives* rather than
 * what is offered.
 *
 * The lists above answer "what may be picked"; this answers "is this a type we
 * know", which is a different question once a payload can be hand-made. It
 * lives here so the screens, the validator and the request endpoint cannot
 * disagree about the answer.
 *
 * Case and spacing exact. A looser comparison would be the beginning of
 * normalising words into a species, which is the thing that was refused:
 * Vivek's CDC dog requirement is raised for dogs only, and a near-miss that
 * resolves to Dog by guesswork is worse than one that is refused outright.
 */
const PET_TYPE_VALUES: ReadonlySet<string> = new Set(PET_TYPES.map((option) => option.value))

export function isPetType(value: string): boolean {
  return PET_TYPE_VALUES.has(value)
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
  'Experienced Traveler',
] as const
