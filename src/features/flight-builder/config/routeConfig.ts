/**
 * Tunable configuration for the Route step's airport radius search.
 *
 * These values are deliberately centralized so the client/Charles can lock the
 * defaults without touching engine logic — they said the structure won't
 * change, only the values.
 */

/**
 * Search radius (km) around a resolved city centroid when gathering nearby
 * fields for the "lock to a specific airport" list. Wide enough to include the
 * metro's executive fields (e.g. Teterboro for NYC) without pulling in the next
 * metro. Pending final lock with the client.
 */
export const RADIUS_KM = 60

/** Max airports surfaced under a city in the picker (closest first). */
export const MAX_AIRPORTS_PER_CITY = 6

/** Max city suggestions returned for a query. */
export const MAX_CITY_RESULTS = 6

/**
 * Which code we send to the backend in `origin_airport_code` /
 * `destination_airport_code` for a locked airport.
 *
 * PENDING CLIENT CONFIRMATION: the client's only payload example used ICAO
 * ("KOPF"); their seed table listed both an Exec/IATA code and an ICAO code.
 * We default to ICAO to match the example, with IATA as the fallback when a
 * field has no ICAO. Flip this one constant if they confirm IATA instead.
 */
export const PAYLOAD_CODE_FORMAT: 'icao' | 'iata' = 'icao'
