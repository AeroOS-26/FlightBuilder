/**
 * Core domain types for the Flight Builder.
 *
 * Vocabulary is locked by product rules (regulatory requirement):
 *   - "Spaces"  never "Seats"
 *   - "Founder" never "Organizer"
 * Keep these names consistent everywhere in the codebase, not just in UI copy.
 */

/** Whether a route point is a whole city ("any airport") or a specific airport. */
export type RoutePlaceKind = 'city' | 'airport'

/** A specific airport that serves a city. */
export interface AirportOption {
  /**
   * ICAO code, e.g. "KJFK" — the canonical identifier sent to the backend in
   * `airport_code`. ICAO is used because it is present on every field (many
   * executive/GA fields have no IATA).
   */
  code: string
  /**
   * Code shown in the UI: the IATA code when present (reads more naturally,
   * e.g. "OPF"), falling back to the ICAO code when there is no IATA. Display
   * only — never sent in the payload.
   */
  displayCode: string
  /** Display name, e.g. "John F. Kennedy International Airport". */
  name: string
  /** "Commercial" | "Executive" — drives the routing hint copy. */
  category: 'Commercial' | 'Executive'
  city: string
  region: string
  country: string
}

/** A city the Founder can pick, plus the airports that serve it. */
export interface CityOption {
  id: string
  city: string
  region: string
  country: string
  /** Representative ICAO code used (in the payload) when the whole city is chosen. */
  defaultCode: string
  /** Display form of the representative code (IATA-preferred, ICAO fallback). */
  defaultDisplayCode: string
  /** Airports serving this city, for the "lock to a specific airport" group. */
  airports: AirportOption[]
}

/**
 * A resolved origin/destination chosen from the autocomplete. It can be a whole
 * city (we route to the nearest reachable airport) or a specific airport.
 */
export interface RoutePlace {
  id: string
  kind: RoutePlaceKind
  /** Full label shown in the field once selected. */
  label: string
  city: string
  region: string
  country: string
  /**
   * Canonical code sent to the backend: ICAO for a locked airport, or the
   * city's representative ICAO when the whole city is chosen.
   */
  code: string
  /** Code for UI display (IATA-preferred, ICAO fallback). Display only. */
  displayCode: string
  /** Present only for airport selections. */
  airportName?: string
}

/** Origin/destination selection for the Route step. */
export interface RouteSelection {
  from: RoutePlace | null
  to: RoutePlace | null
}

/** Whether the Founder picked one day or a flexible window. */
export type DateMode = 'specific' | 'range'

/** Date selection for the Dates step. ISO strings are `yyyy-mm-dd`. */
export interface DateSelection {
  mode: DateMode
  start: string | null
  /** Only meaningful in range mode. */
  end: string | null
}

/** A single traveler on the flight. Traveler 1 is always the Founder. */
export interface Traveler {
  id: string
  /** Full name. For the Founder this is their real member identity. */
  name: string
  /** True only for Traveler 1 (the Founder), who cannot be removed. */
  isFounder: boolean
}

export type PetTemperament = 'Calm' | 'Excitable' | 'Anxious' | 'Travel-experienced'

/** A pet traveling on the flight. */
export interface Pet {
  id: string
  name: string
  /** Species, e.g. "Dog" | "Cat". */
  type: string
  breed: string
  /** Weight bucket in lbs, kept as a string to match the select options. */
  weight: string
  temperament: PetTemperament | ''
}

/**
 * The Founder's real member identity, pulled from member data.
 * Used in the header and auto-populated as Traveler 1.
 */
export interface MemberIdentity {
  id: string
  name: string
  email: string
  /** Founder phone; mapped to webhook members[].phone for Zoho Contact/Member. */
  phone: string
  avatarUrl?: string
}

/**
 * The full Flight Builder draft. This is what the Zustand store persists
 * across forward/back navigation. It maps to the Zoho "Flight Group" record
 * on confirm (route, date, available Spaces, Founder).
 */
export interface FlightDraft {
  route: RouteSelection
  date: DateSelection
  travelers: Traveler[]
  /** Traveler designated as the group's primary contact for operator comms. */
  primaryContactId: string | null
  /** Whether the "Bringing pets?" toggle is on. */
  petsEnabled: boolean
  pets: Pet[]
  /** The conditional pet travel-readiness disclaimer acceptance. */
  petReadinessAccepted: boolean
  /** Optional free-text notes. The Notes step is fully skippable. */
  notes: string
}

/** A flight record returned by the backend after creation. */
export interface FlightRecord {
  /** Backend flight identifier, used in the share link. */
  id: string
  /** Human-facing group code, e.g. "202606-SFO-JFK-01". */
  groupCode: string
  /** Short slug used in the share URL, e.g. "SFO-JFK-202606". */
  shareSlug: string
  route: RouteSelection
  date: DateSelection
  /** Available Spaces (never "Seats"). */
  availableSpaces: number
  /** Total travelers committed so far (the Founder + any added). */
  memberCount: number
  /** Estimated full group size used in the "x of y members" copy. */
  estimatedMembers: number
  /** Aircraft class label, e.g. "Light Jet". */
  aircraftClass: string
  founder: MemberIdentity
  /** Generated, tracked share link. */
  shareUrl: string
}
