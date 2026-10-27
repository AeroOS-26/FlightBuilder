/**
 * A pet as the payload contract carries it.
 *
 * Shared by `flight_group.created` and `member.joined`, so one pet cannot be
 * mapped two ways depending on which event carries it.
 */

import { nullIfBlank } from './payloadValue'
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
    breed: nullIfBlank(pet.breed),
    // The weight select stores whole pounds as a string ("68"); the contract
    // wants the number. Anything unparseable goes as null rather than a guess.
    weight_lbs: parseWeight(pet.weight),
    // Null when not chosen — absent is null, never "" (client, 2026-09-29).
    temperament: pet.temperament
      ? (TEMPERAMENT_PAYLOAD_VALUE[pet.temperament] ?? pet.temperament.toLowerCase())
      : null,
    /*
     * Three states, and the fallback keeps both callers honest.
     *
     * A qualified service animal is never asked, so it sends null rather than
     * false — "not asked" and "said no" are different facts to whoever reads
     * the record, and Zoho holds it as a pick list to preserve that.
     *
     * Otherwise the pet's own answer wins, and `readinessAccepted` is the
     * fallback for the callers that still hold one flag for a whole draft:
     * the Flight Builder and Complete Profile collect a single confirmation
     * and have no per-pet question to ask. Only the join request sets it per
     * pet, so only the join request can disagree with the argument.
     */
    travel_readiness_accepted: pet.serviceAnimal
      ? null
      : (pet.readinessAccepted ?? readinessAccepted),
    /*
     * Forwarded at last. Held since 2026-09-29 because nothing on the Zoho
     * side could receive it; Vivek confirmed the field on 2026-10-22.
     *
     * Worth knowing it only became meaningful once the parsers were fixed on
     * 2026-10-22 — until then the answer never reached the server and this
     * would have sent a constant.
     */
    service_animal: pet.serviceAnimal,
  }
}

/**
 * A stored contract pet, re-emitted in the contract's key order.
 *
 * Pets kept for `flight_group.filled` pass through JSONB, which stores keys
 * sorted by length rather than as written, so a short key comes back ahead of a
 * longer one whatever order it was written in. Order means nothing to a JSON parser, but these payloads are
 * read against the contract side by side, so the event lists them the way the
 * contract does.
 */
export function inContractOrder(pet: FlightGroupPet): FlightGroupPet {
  return {
    name: pet.name,
    type: pet.type,
    breed: pet.breed,
    weight_lbs: pet.weight_lbs,
    temperament: pet.temperament,
    travel_readiness_accepted: pet.travel_readiness_accepted,
    service_animal: pet.service_animal,
  }
}

function parseWeight(value: string): number | null {
  const m = value.match(/\d+/)
  return m ? Number(m[0]) : null
}
