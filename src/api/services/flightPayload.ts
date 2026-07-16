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

import { SPACES_TOTAL } from '@/features/flight-builder/config/capacity'
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

  // Travelers are capped at SPACES_TOTAL upstream, so committed can never exceed
  // spacesTotal — spaces_remaining stays a truthful 0..spacesTotal.
  const spacesTotal = SPACES_TOTAL
  const committed = Math.min(spacesTotal, Math.max(1, draft.travelers.length))

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
  // Pets are attached to the founder/primary member until the flow assigns pets
  // to specific travelers. CONFIRM: per-traveler pet assignment if required.
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
      // Attach all pets to the primary member for now.
      pets: isPrimary ? pets : [],
    }
  })
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
    temperament: pet.temperament ? pet.temperament.toLowerCase() : '',
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
