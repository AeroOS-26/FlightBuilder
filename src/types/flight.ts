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
  /**
   * Full name. For the Founder this is their real member identity.
   *
   * Frame 42 labels this "Full legal name as shown on the passport" and seeds
   * it from the profile. It is deliberately the same field rather than a
   * second one: two name fields that can disagree is a worse record than one
   * the person was asked to check, and the Stage 1 review reads whichever
   * name the request carried.
   */
  name: string
  /** True only for Traveler 1 (the Founder), who cannot be removed. */
  isFounder: boolean

  /* ── Stage 1 eligibility (frame 42 only) ─────────────────────────────────
   *
   * Every field below is optional on the type and required by validation on
   * the join-request surface alone. `Traveler` is constructed in seven places
   * — the builder's store, Complete Profile, the preview mocks and the
   * request route among them — and none of those screens collects any of
   * this. Making them required would break all of them to describe one
   * screen, so the surface decides, the same way `surface: 'request'` already
   * scopes the pet rules in `validateTravelersAndPets`.
   *
   * Collected at the join request and nowhere else, reviewed by hand by Chuck
   * or Sarah. Nothing here decides anything: no eligibility logic, no
   * automatic refusal, and no documents — there is no upload anywhere in the
   * product and none is wanted (§21).
   */

  /** Per-flight contact address. Seeded from the account, editable for this
   *  request only, exactly as the per-request `contact_email` already is. */
  email?: string
  /** ISO 3166-1 alpha-2, from `NATIONALITY_OPTIONS`. Never free text. */
  nationality?: string
  /** `YYYY-MM-DD`. Stored and sent as a date, never as a display string, so
   *  that a day-first screen and a month-first reader cannot disagree. */
  dateOfBirth?: string

  /* The three confirmations. Two separate checkboxes rather than a choice,
   * as the frames draw them. One of the first two must be ticked before the
   * request sends — a completeness check rather than a judgment about
   * anyone's eligibility, which is why it stays inside Chuck's rule that
   * nothing in the product decides anything (Murtaza, 2026-10-21). */

  /** "I confirm I am 18 or above." */
  isAdult?: boolean
  /** "I am a parent or guardian booking for a minor." */
  guardianBookingForMinor?: boolean
  /** "…passport is valid for at least six months after my arrival date." The
   *  product has never held a return date and the builder is one way only,
   *  so this is arrival rather than return (Chuck, 2026-10-14). */
  passportValidSixMonths?: boolean
}

export type PetTemperament = 'Calm' | 'Excitable' | 'Anxious' | 'Experienced Traveler'

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
  /**
   * Whether this animal is a qualified service animal.
   *
   * Stored as a plain yes/no and nothing else: counsel's position is that
   * permitted inquiries and authorised documentation belong to the operating
   * carrier, not to our form (client, 2026-09-29). No documents, no
   * description, nothing about the person.
   *
   * It exists because counsel's terms price additional pets by size and apply a
   * pet cap, and both are disapplied for a qualified service animal — without
   * the flag Perro Air cannot apply its own rule. Those two effects come later;
   * this is the capture.
   */
  serviceAnimal: boolean

  /**
   * This pet's own travel readiness confirmation. **Join request only.**
   *
   * The screen held one flag for the whole request until now, because only one
   * pet was ever drawn. The three-pet frame settles it: each card carries its
   * own "I agree", so two pets no longer move together.
   *
   * Three states rather than two, and the third is the point:
   *
   *   true   confirmed
   *   false  not yet confirmed — the request cannot be sent
   *   blank  not asked, because this pet is a qualified service animal
   *
   * A service animal is not subject to readiness screening at all (Chuck,
   * 2026-10-22), so it is never asked and must not be recorded as a refusal.
   * `undefined` here becomes `null` on the wire, which is what keeps "not
   * asked" distinct from "said no" in a record a person reads.
   *
   * Optional on the type, like the Stage 1 traveller fields: the Flight
   * Builder and Complete Profile hold one readiness flag for a whole draft and
   * neither collects this, so requiring it would break screens that never ask.
   */
  readinessAccepted?: boolean
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
  /**
   * Aircraft class label, e.g. "Light Jet". Null until an operator quotes —
   * nothing is chartered at creation. Client, 2026-09-09.
   */
  aircraftClass: string | null
  founder: MemberIdentity
  /** Generated, tracked share link. */
  shareUrl: string
}
