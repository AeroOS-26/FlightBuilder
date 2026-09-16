/**
 * A pet as the payload contract carries it.
 *
 * Shared by `flight_group.created` and `member.joined`, so one pet cannot be
 * mapped two ways depending on which event carries it.
 */

import type { FlightGroupPet, Pet } from '@/types'

/**
 * Display label -> payload value for temperament. Explicit map (not a blind
 * lowercase) so the stored value is an agreed key, confirmed with the backend:
 * "Experienced Traveler" is shown to the user but sent as "travel_experienced".
 */
const TEMPERAMENT_PAYLOAD_VALUE: Record<string, string> = {
  Calm: 'calm',
  Excitable: 'excitable',
  Anxious: 'anxious',
  'Experienced Traveler': 'travel_experienced',
}

export function mapPet(pet: Pet, readinessAccepted: boolean): FlightGroupPet {
  return {
    name: pet.name,
    type: pet.type,
    breed: pet.breed,
    // The weight select stores whole pounds as a string ("68"); the contract
    // wants the number. Anything unparseable goes as null rather than a guess.
    weight_lbs: parseWeight(pet.weight),
    crate_size: null, // CONFIRM: crate size not captured in the flow.
    temperament: pet.temperament
      ? (TEMPERAMENT_PAYLOAD_VALUE[pet.temperament] ?? pet.temperament.toLowerCase())
      : '',
    travel_readiness_accepted: readinessAccepted,
  }
}

function parseWeight(value: string): number | null {
  const m = value.match(/\d+/)
  return m ? Number(m[0]) : null
}
