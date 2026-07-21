/**
 * Draft -> `flight_group.created` payload mapper.
 *
 * The single place that translates our FlightDraft into the backend's
 * `flight_group.created` event (see aeroos_sample_payloads.json #1). Keeping
 * the mapping here — not in components — is what makes the Zoho field contract
 * easy to align and maintain.
 *
 * Codes: the route airport_code values are ICAO (the picker resolves ICAO for
 * the payload; IATA is display-only) — confirmed with the backend.
 *
 * Items marked `CONFIRM:` are still being finalized with the backend and use a
 * documented default until then (see docs/route-airport-implementation.md and
 * the integration questions doc).
 */

import { SPACES_ESTIMATE } from '@/features/flight-builder/config/capacity'
import type {
  FlightDraft,
  FlightGroupCreatedEvent,
  FlightGroupMember,
  FlightGroupPet,
  MemberIdentity,
  Pet,
  RoutePlace,
} from '@/types'

interface BuildArgs {
  draft: FlightDraft
  founder: MemberIdentity | null
  /** Frontend-generated group id (e.g. "202607-TEB-MMU-01"). */
  groupId: string
  /** Frontend-generated share link. */
  shareLink: string
  /** ISO timestamp for the event (caller stamps it). */
  sentAt: string
}

export function buildFlightGroupCreated({
  draft,
  founder,
  groupId,
  shareLink,
  sentAt,
}: BuildArgs): FlightGroupCreatedEvent {
  const founderTraveler =
    draft.travelers.find((t) => t.isFounder) ?? draft.travelers[0] ?? null

  // spaces_total is an estimate (no aircraft exists at creation). Send the
  // greater of the default estimate and the actual party size, so the number can
  // never contradict the members list — a party of 2 sends 6, a party of 8
  // sends 8. spaces_remaining then stays a truthful 0..spaces_total.
  const committed = Math.max(1, draft.travelers.length)
  const spacesTotal = Math.max(SPACES_ESTIMATE, committed)

  return {
    event: 'flight_group.created',
    sent_at: sentAt,
    flight_group: {
      group_id: groupId,
      status: 'forming',
      // CONFIRM: founder member id source — using a stable client id until the
      // member identity service provides the backend flight_group_member_id.
      founder_member_id: memberId(founderTraveler?.id ?? 'founder'),
      share_link: shareLink,
      created_at: sentAt,
      spaces_total: spacesTotal,
      spaces_remaining: Math.max(0, spacesTotal - committed),
      // CONFIRM: aircraft category source (not captured in the flow yet).
      aircraft_category: 'Light Jet',
      route: mapRoute(draft),
      dates: mapDates(draft),
      operator_notes: draft.notes ?? '',
      members: mapMembers(draft, founder),
    },
  }
}

function mapRoute(draft: FlightDraft): FlightGroupCreatedEvent['flight_group']['route'] {
  const { from, to } = draft.route
  return {
    origin_input: from?.city ?? '',
    origin_type: from?.kind ?? 'city',
    origin_city: placeCityLabel(from),
    // ICAO code only when a specific airport is locked; null for a whole city.
    origin_airport_code: from?.kind === 'airport' ? from.code : null,
    destination_input: to?.city ?? '',
    destination_type: to?.kind ?? 'city',
    destination_city: placeCityLabel(to),
    destination_airport_code: to?.kind === 'airport' ? to.code : null,
  }
}

function mapDates(draft: FlightDraft): FlightGroupCreatedEvent['flight_group']['dates'] {
  const { mode, start, end } = draft.date
  if (mode === 'specific') {
    return { date_mode: 'specific', travel_date: start, earliest_date: null, latest_date: null }
  }
  return { date_mode: 'range', travel_date: null, earliest_date: start, latest_date: end }
}

function mapMembers(draft: FlightDraft, founder: MemberIdentity | null): FlightGroupMember[] {
  // Pets attach to the primary member (the founder) by design: in the Flight
  // Builder the founder creates a flight for their own party, so the party's
  // pets belong to the primary contact and the other travelers genuinely have
  // none — an empty array there is accurate, not missing. Per-member pets do
  // their real work later, when joiners arrive via member.joined with their own
  // animals. Confirmed with the backend as working as intended.
  const pets = draft.petsEnabled
    ? draft.pets.map((p) => mapPet(p, draft.petReadinessAccepted))
    : []

  return draft.travelers.map((t) => {
    const isFounder = t.isFounder
    const isPrimary = draft.primaryContactId
      ? t.id === draft.primaryContactId
      : isFounder
    return {
      flight_group_member_id: memberId(t.id),
      // CONFIRM: account_id comes from member identity once auth is wired.
      account_id: isFounder && founder ? founder.id : '',
      name: t.name,
      email: isFounder && founder ? founder.email : '',
      phone: isFounder && founder ? founder.phone : '',
      role: isFounder ? 'founder' : 'joiner',
      join_method: isFounder ? 'founder' : 'manual',
      member_status: 'joined',
      is_primary: isPrimary,
      // The party's pets sit with the primary member (see mapMembers note).
      pets: isPrimary ? pets : [],
    }
  })
}

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

function mapPet(pet: Pet, readinessAccepted: boolean): FlightGroupPet {
  return {
    name: pet.name,
    type: pet.type,
    breed: pet.breed,
    // CONFIRM: weight is a UI bucket (string); backend wants weight_lbs number.
    // Parse a leading number when present, else null.
    weight_lbs: parseWeight(pet.weight),
    crate_size: null, // CONFIRM: crate size not captured in the flow.
    temperament: pet.temperament
      ? (TEMPERAMENT_PAYLOAD_VALUE[pet.temperament] ?? pet.temperament.toLowerCase())
      : '',
    travel_readiness_accepted: readinessAccepted,
  }
}

/** Best-effort numeric weight from a bucket label like "50–70 lbs". */
function parseWeight(bucket: string): number | null {
  const m = bucket.match(/\d+/)
  return m ? Number(m[0]) : null
}

/** Namespaced client member id until backend ids exist. */
function memberId(localId: string): string {
  return localId.startsWith('fgm_') ? localId : `fgm_${localId}`
}

/** "San Francisco, California, United States" style label. */
function placeCityLabel(place: RoutePlace | null): string {
  if (!place) return ''
  return [place.city, place.region, place.country].filter(Boolean).join(', ')
}
