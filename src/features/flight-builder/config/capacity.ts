/**
 * Flight capacity — the single source of truth for the two capacity numbers the
 * Flight Builder uses. Both are ESTIMATES, not facts: Perro Air is a broker, so
 * there is no aircraft at creation — the real aircraft (and its true capacity)
 * is sourced during quoting once the group fills. These placeholders hold until
 * real aircraft capacity exists, which is why they live here as one source.
 *
 * They do different jobs, so they are two different numbers:
 *  - SPACES_ESTIMATE is what `spaces_total` reports on a normal flight — the "X"
 *    in "2 of X spaces filled". A realistic shared-flight size so a small party
 *    reads as forming, not failing.
 *  - MAX_TRAVELERS is the hard cap on how many travelers a founder can add —
 *    generous enough that no real party is blocked, low enough to prevent a
 *    nonsense flight.
 */

/** Default estimated total spaces on a flight (the "of X" a founder sees). */
export const SPACES_ESTIMATE = 6

/** Hard cap on travelers a founder can add. */
export const MAX_TRAVELERS = 12
