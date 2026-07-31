/**
 * Transport-level types for the API layer.
 *
 * These describe the shapes we exchange with the backend (Zoho). The exact
 * payload/field names are owned by the Zoho team and will be aligned through
 * the working group — keep request/response mapping in the service layer
 * (src/api/services), never inline in components.
 */

import type { FlightDraft, FlightRecord } from './flight'

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
    aircraft_category: string
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
  /** Contact phone; Zoho maps to Flight Group Member + Contact (not Flight Group). */
  phone: string
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
