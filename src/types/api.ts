/**
 * Transport-level types for the API layer.
 *
 * These describe the shapes we exchange with the backend (Zoho). The exact
 * payload/field names are owned by the Zoho team and will be aligned through
 * the working group — keep request/response mapping in the service layer
 * (src/api/services), never inline in components.
 */

import type { FlightDraft, FlightRecord } from './flight'
import type { PublicFlightState, EstimatedDateRange, FellowPetInfo, PublicView } from './publicFlight'

/** Normalized API error surfaced to the UI (loading/success/failure states). */
export interface ApiError {
  /** HTTP status, or 0 for network/timeout failures. */
  status: number
  /** Human-readable message safe to surface in a failure state. */
  message: string
  /** Optional machine-readable code from the backend. */
  code?: string
  /** Whether retrying the request could reasonably succeed. */
  retryable: boolean
}

/** Payload sent to create a flight record on confirm. */
export interface CreateFlightRequest {
  draft: FlightDraft
}

/** Response after a flight record is created. */
export interface CreateFlightResponse {
  flight: FlightRecord
}

/**
 * The `flight_group.created` event sent to the Zoho webhook on confirm.
 * Field names match the backend's integration spec
 * (AeroOS-Zoho-CRM-Integration-Spec). Mapping lives in the service layer.
 */
export interface FlightGroupCreatedEvent {
  event: 'flight_group.created'
  sent_at: string
  flight_group: {
    group_id: string
    /** Spec hardcodes Status to "Forming"; we send it for completeness. */
    status: 'forming'
    /** Received but currently unused by the backend. */
    founder_member_id: string
    /** Must be a resolvable public URL — localhost fails Zoho URL validation. */
    share_link: string
    /** ISO 8601; the backend reformats the Z-suffix for Zoho's DateTime field. */
    created_at: string
    spaces_total: number
    spaces_remaining: number
    /**
     * Null until an operator quotes the flight.
     *
     * There is no aircraft at creation — nothing has been chartered yet — so
     * the app stopped sending a hardcoded "Light Jet". Client decision,
     * 2026-09-09. Migration 0006 dropped the matching NOT NULL.
     *
     * Sent as an explicit `null`, never omitted: the contract's convention is
     * "always sent, null when unknown" (2026-08-19), and the sibling fields
     * `origin_airport_code`, the unused date pair and `phone` already flow to
     * Zoho as null on live traffic. Typing this `string | undefined` would be
     * a silent trap — JSON.stringify drops undefined keys, turning an explicit
     * null into an omission nobody chose.
     */
    aircraft_category: string | null
    route: {
      origin_input: string
      origin_type: 'city' | 'airport'
      origin_city: string
      origin_airport_code: string | null
      destination_input: string
      destination_type: 'city' | 'airport'
      destination_city: string
      destination_airport_code: string | null
    }
    dates: {
      date_mode: 'specific' | 'range'
      travel_date: string | null
      earliest_date: string | null
      latest_date: string | null
    }
    operator_notes: string
    members: FlightGroupMember[]
  }
}

export interface FlightGroupMember {
  flight_group_member_id: string
  account_id: string
  name: string
  email: string
  /**
   * Contact phone; Zoho maps to Flight Group Member + Contact (not Flight Group).
   *
   * ALWAYS PRESENT, MAY BE NULL — added to this event by the 2026-08-19 contract.
   * Flight Club does not require a phone at signup, so a member can legitimately
   * have none. Null and absent are handled identically on the Zoho side, but the
   * contract asks for the key to be sent, so it is never omitted.
   */
  phone: string | null
  /** Organizer is "group_organizer" (Founder renamed per the 2026-07-24 contract). */
  role: 'group_organizer' | 'joiner'
  join_method: 'group_organizer' | 'shared_link' | 'manual'
  member_status: 'joined'
  is_primary: boolean
  pets: FlightGroupPet[]
}

export interface FlightGroupPet {
  name: string
  type: string
  breed: string
  weight_lbs: number | null
  crate_size: string | null
  temperament: string
  travel_readiness_accepted: boolean
}

/**
 * Freshworks contact — the frozen 27-July mapping (Sheet1). ONE contact per
 * Flight Builder inquiry, built from the person who created the flight; extra
 * travellers and pets ride as detail on this single contact. Sent as an
 * independent, decoupled POST alongside the Zoho write — NOT a Zoho event.
 * `external_id` is the only field that must be unique per entry (dedup key).
 */
export interface FreshworksContact {
  /** Full name of the creator (whole name in first_name, per the sheet). */
  first_name: string
  /** Empty in production; "TEST" during testing so records can be cleared. */
  last_name: string
  emails: string
  /** Creator phone; null/empty until account login carries it (Flight Club). */
  mobile_number: string
  cf_flying_from: string
  cf_flying_to: string
  /** YYYY-MM (earliest date when the trip is a range). */
  cf_flight_date: string
  /** Estimated party size at creation; does not update as members join. */
  cf_number_of_people: number
  cf_trip_details: string
  cf_number_of_dogs: number
  cf_dog_details: string
  /** Cats + other (non-dog) pets. */
  cf_number_of_cats: number
  cf_other_pet_details: string
  cf_additional_comments: string
  /** AER + flight group id + creator member id. Unique per entry. */
  external_id: string
}

/**
 * Relay/backend response, matching the spec's flat JSON:
 *   { flight_group_id, group_id, success, message? }
 */
export interface CreateFlightRelayResponse {
  /** Created Zoho record id (empty string when not created). */
  flight_group_id: string
  /** Echoed AeroOS group_id. */
  group_id: string
  success: boolean
  /** Present only on failure. */
  message?: string
}

/* ================================================ MILESTONE 2: JOINING & GROUP DETAIL */

/**
 * Request to join a flight group (Milestone 2).
 *
 * Sent by a verified member clicking "Confirm join" on Frame 40.
 * The endpoint is `POST /api/groups/[group_id]/join`.
 * Idempotent: submitting twice returns the same success response.
 */
export interface MemberJoinRequest {
  // group_id is in the URL; not needed here
  // user_id comes from session; not needed here
}

/**
 * Response after a member successfully joins a group.
 *
 * Includes the group's current state so the UI knows:
 * - Whether this join filled the group (filled: true → show Frame 41B)
 * - What state the group is in (forming/filling/quoting/etc.)
 */
export interface MemberJoinResponse {
  success: boolean
  member_id?: string
  group_state?: PublicFlightState
  /** True if this join caused spaces_remaining to reach 0. */
  filled?: boolean
  /** Present on error. */
  message?: string
}

/**
 * Full group detail returned by `GET /api/groups/[group_id]`.
 *
 * Includes member roster, flight details, and role-specific actions.
 * Authorization is enforced server-side; non-members get 404.
 */
export interface GroupDetail {
  group_id: string
  group_state: PublicFlightState
  route_origin_city: string
  route_destination_city: string
  estimated_date_range: EstimatedDateRange
  /** Null until an operator quotes. Client, 2026-09-09. */
  aircraft_category: string | null
  pet_friendly: boolean
  spaces_total: number
  spaces_remaining: number
  spaces_filled: number
  fellow_members: GroupMember[]
  fellow_pet_info: FellowPetInfo
  organizer_id: string
  organizer_name: string
  organizer_email: string
  created_at: string
}

/**
 * A member in the group roster (from GroupDetail.fellow_members).
 *
 * Used on Frames 60–70 to show who else is in the group.
 * The `is_self` flag helps UI show "You" badges.
 */
export interface GroupMember {
  member_id: string
  account_id: string
  name: string
  email: string
  role: 'group_organizer' | 'joiner'
  joined_at: string
  is_self: boolean
  avatar_initials: string
}

/**
 * The `member.joined` event sent to Zoho when a member joins a group (Milestone 2).
 *
 * This is Pavan's backend responsibility; we emit it server-side in the join endpoint.
 * Field names and structure match the backend integration spec.
 */
export interface MemberJoinedEvent {
  event: 'member.joined'
  sent_at: string
  flight_group_id: string
  account_id: string
  name: string
  email: string
  phone: string | null
  role: 'group_organizer' | 'joiner'
  join_method: 'shared_link' | 'manual' | 'group_organizer'
  member_status: 'joined'
}

/* ================================================ GROUP DETAIL VIEW TYPES */

/**
 * Group status throughout its lifecycle.
 *
 * The seven values are the seven steps of the Group Timeline stepper on the
 * Flight Group Detail frames, in order — the stepper renders this list, so
 * adding a state here adds a step there.
 */
export type GroupStatus =
  | 'forming'
  | 'filling'
  | 'filled'
  | 'quoting'
  | 'confirmed'
  | 'booked'
  | 'closed'

/** A traveler on the viewer's own booking ("Your travelers and pets"). */
export interface GroupTraveler {
  name: string
  is_primary: boolean
}

/** A pet on the viewer's own booking. */
export interface GroupPet {
  name: string
  /** Pre-composed detail line, e.g. "Dog · Golden Retriever · 68 lbs · Travel-Experienced". */
  detail: string
}

/** One entry in the group's Recent Activity feed. */
export interface GroupActivityItem {
  label: string
  /** Human-relative timestamp as shown, e.g. "3 days ago". */
  occurred_label: string
}

/**
 * Frontend-specific group detail structure.
 * Extends API GroupDetail with computed fields for component use.
 */
export interface GroupDetailView {
  group_id: string
  organizer_id: string
  organizer_name: string
  /** Public join link surfaced in "Help fill this group". */
  share_url: string
  /** 1-based roster position of the viewer — "You're traveling as Member 2." */
  viewer_member_ordinal: number
  viewer_travelers: GroupTraveler[]
  viewer_pets: GroupPet[]
  activity: GroupActivityItem[]
  flight: {
    flight_id: string
    route_origin_city: string
    /**
     * Only set when the member locked a specific airport. Null for a city:
     * a code reads as a commitment, and a city-derived code is a routing
     * placeholder that can change when the carrier is booked. Client decision,
     * 2026-09-07 — show the city alone when this is null.
     */
    route_origin_code: string | null
    route_destination_city: string
    route_destination_code: string | null
    /** Null until an operator quotes. Client, 2026-09-09. */
    aircraft_category: string | null
    estimated_date_range: EstimatedDateRange
    /** Single settled departure date, shown as the Trip Details DATE row. */
    departure_date: string
    spaces_total: number
    spaces_remaining: number
    pet_friendly: boolean
    fellow_pet_info: FellowPetInfo
  }
  members: GroupDetailMember[]
}

/**
 * Member in group detail (frontend view).
 * Used to display member roster on Frames 60–70.
 */
export interface GroupDetailMember {
  user_id: string
  display_name: string
  first_initial: string
  role: 'organizer' | 'joiner'
  joined_at: string
  member_status: 'pending' | 'confirmed'
  is_self: boolean
  /** Pet label under the name — "dog", "Biscuit (Golden Retriever)". Null when none. */
  pet_summary: string | null
}
