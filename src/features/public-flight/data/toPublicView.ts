/**
 * The public-safe filter — the data-layer guarantee for the public join page.
 *
 * Takes a full internal group and returns ONLY the fields the contract marks
 * public-safe. Everything withheld — operator name, tail number, airport codes,
 * FBO, exact times, pricing, and every member identity — is dropped here, on
 * the server, so it never travels to the browser. Member details collapse to
 * counts only (spaces and fellow-pet totals).
 *
 * This is the single place that decides what is public. Building the output by
 * explicit construction (not by deleting keys from the source) means a new
 * sensitive field added upstream is excluded by default rather than leaking.
 */

import type { PublicView } from '@/types'
import type { SampleGroup } from './sampleGroups'

export function toPublicView(group: SampleGroup): PublicView {
  const pets = group.members.flatMap((m) => m.pets)
  const bySpecies: Record<string, number> = {}
  for (const pet of pets) {
    bySpecies[pet.type] = (bySpecies[pet.type] ?? 0) + 1
  }

  return {
    group_id: group.group_id,
    group_state_public: group.status,
    // City only — never the airport code, terminal, or FBO.
    route_origin_city: group.route.origin_city,
    route_destination_city: group.route.destination_city,
    // A range, never an exact time.
    estimated_date_range: {
      earliest_date: group.estimated_date_range.earliest_date,
      latest_date: group.estimated_date_range.latest_date,
    },
    aircraft_category: group.aircraft_category,
    pet_friendly: true,
    // Counts only — no member identities.
    spaces_total: group.spaces_total,
    spaces_remaining: group.spaces_remaining,
    fellow_pet_info: {
      pets_total: pets.length,
      by_species: bySpecies,
    },
  }
}
