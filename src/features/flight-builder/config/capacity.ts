/**
 * Flight capacity — the single source of truth for how many spaces a shared
 * flight has, and therefore how many travelers a founder can add.
 *
 * The traveler cap and the payload's `spaces_total` are the SAME number, so the
 * builder can never produce more members than the flight claims to have spaces
 * (which previously let the payload go out as "4 spaces, 0 remaining, 52
 * members" with the negative silently clamped away).
 *
 * CONFIRM: capacity is currently a fixed default. When the backend/product
 * provides a per-aircraft capacity, source it here.
 */
export const SPACES_TOTAL = 4

/** Max travelers a founder can add — bounded by the flight's total spaces. */
export const MAX_TRAVELERS = SPACES_TOTAL
