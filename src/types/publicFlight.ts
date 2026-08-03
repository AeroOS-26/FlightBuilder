/**
 * Public Shared Flight Detail — the anonymous, public-safe view of a flight.
 *
 * This is the ONLY shape the browser is allowed to receive for the public join
 * page. It mirrors the `public_view` object in the AeroOS↔Zoho payload contract
 * (section 2, v2026-07-24): no member identities, no operator, no pricing, no
 * exact times, no airport codes. The read-relay filters a group down to this
 * shape server-side, so nothing outside it ever reaches the client.
 */

/** Public lifecycle state that drives which screen renders. */
export type PublicFlightState =
  | 'forming'
  | 'filling'
  | 'full'
  | 'quoting'
  | 'confirmed'
  | 'closed'

/** Fellow-pet summary — counts only, never identities. */
export interface FellowPetInfo {
  pets_total: number
  by_species: Record<string, number>
}

/** Estimated travel window (a single day sends the same earliest/latest). */
export interface EstimatedDateRange {
  earliest_date: string | null
  latest_date: string | null
}

/**
 * The public-safe flight view served to the join page. Field names and value
 * vocabulary follow the contract; the relay guarantees nothing beyond this is
 * present on the wire.
 */
export interface PublicView {
  group_id: string
  group_state_public: PublicFlightState
  route_origin_city: string
  route_destination_city: string
  estimated_date_range: EstimatedDateRange
  aircraft_category: string
  pet_friendly: boolean
  spaces_total: number
  spaces_remaining: number
  fellow_pet_info: FellowPetInfo
}

/** Relay result: the public view, or a typed reason it could not be served. */
export type PublicFlightResult =
  | { status: 'ok'; flight: PublicView }
  | { status: 'not_found' }

/* ---------------------------------------------------- MVP interest lead */

/**
 * The MVP join-page interest lead the visitor submits — the client-side shape.
 * Mirrors `interest_lead.created`: a lighter interest capture than a full member
 * join — no account, and pets as a single optional free-text note (not the full
 * structured pet records the member join carries), matching the hi-fi.
 *
 * `zoho_flight_group_record_id` is intentionally absent here: it is resolved
 * server-side from the share token, never sent by the browser.
 */
export interface InterestLeadRequest {
  /** Required. Single free-text field, not split into first/last. */
  name: string
  /** Required. */
  email: string
  /** Optional. Sent as null (not omitted) when not provided. */
  phone: string | null
  /** Required. Identifies which flight the person is interested in. */
  group_id: string
  /**
   * Optional free-text pet note (e.g. "Bella, golden retriever") — the hi-fi's
   * "Tell us about your pet" field. Context for the manual follow-up, not the
   * structured pet records. Sent as null (not omitted) when not provided.
   */
  pet: string | null
}

/**
 * Normalized response our own API route returns to the page. The route maps
 * whatever the CRM sends into this definite shape, so the confirmation and
 * error states always read a real success flag rather than a bare status.
 */
export interface InterestLeadResponse {
  success: boolean
  /** Present on success — lets the team trace a lead when following up. */
  lead_id?: string
  /** Present on failure — a human-readable reason for the error state. */
  message?: string
}
