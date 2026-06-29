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
