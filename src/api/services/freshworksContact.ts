/**
 * Freshworks contact write — server-only.
 *
 * A second, INDEPENDENT POST off the Flight Builder submission, decoupled from
 * Zoho (its own endpoint, its own id scheme), per the frozen 27-July mapping
 * (Aero OS + FreshWorks Integration - Sheet1). It maps one `flight_group.created`
 * event to ONE Freshworks contact — the person who created the flight — with the
 * other travellers and pets carried as text detail on that single contact.
 *
 * Design rules from the thread:
 *  - One contact per builder inquiry. Extra humans/pets do NOT become contacts.
 *  - `external_id` (AER + group id + creator member id) is the ONLY uniqueness
 *    key. The AER prefix is deliberate — never the Zoho id — so a Zoho failure
 *    can't take Freshworks down; the two are fully independent.
 *  - The join-page interest lead does NOT come here (that stays Zoho only).
 *  - Decoupled: this must never block or fail flight creation. It self-skips
 *    when FRESHWORKS_WEBHOOK_URL is unset, so wiring it in is a no-op until the
 *    endpoint is configured.
 *
 * The transport mirrors the Zoho relay: a JSON POST to a server-only URL with
 * the key embedded. The exact request envelope is confirmable against Ankush's
 * API doc / WP plugin; it is isolated in `forwardFreshworksContact` so the body
 * shape is a one-line change if the plugin expects a wrapper.
 */

import { serverEnv, isFreshworksConfigured } from '@/config/serverEnv'
import type { FlightGroupCreatedEvent, FlightGroupMember, FreshworksContact } from '@/types'

interface MapOptions {
  /** Testing: last_name="TEST" and a synthetic external_id (never a real id pair). */
  testMode?: boolean
  /** Synthetic external_id to use in test mode; falls back to a fixed test id. */
  testExternalId?: string
}

/** The creator = the Group Organizer (founder), else the primary, else first. */
function resolveCreator(fg: FlightGroupCreatedEvent['flight_group']): FlightGroupMember | null {
  const byFounder = fg.members.find((m) => m.flight_group_member_id === fg.founder_member_id)
  const byRole = fg.members.find((m) => m.role === 'group_organizer')
  const byPrimary = fg.members.find((m) => m.is_primary)
  return byFounder ?? byRole ?? byPrimary ?? fg.members[0] ?? null
}

/** "2026-09" from the earliest known date (range → earliest, else the specific). */
function flightMonth(dates: FlightGroupCreatedEvent['flight_group']['dates']): string {
  const iso = dates.date_mode === 'range' ? dates.earliest_date : dates.travel_date
  const fallback = iso ?? dates.earliest_date ?? dates.travel_date
  return fallback ? fallback.slice(0, 7) : ''
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "18 Jun 2026" from an ISO date; empty string when unparseable. */
function formatDay(iso: string | null): string {
  if (!iso) return ''
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso
  const [, y, mo, d] = m
  return `${Number(d)} ${MONTHS[Number(mo) - 1] ?? mo} ${y}`
}

/** Human date phrase for cf_trip_details, e.g. "flexible, 8 to 26 Sep 2026". */
function tripDatePhrase(dates: FlightGroupCreatedEvent['flight_group']['dates']): string {
  const { earliest_date, latest_date, travel_date, date_mode } = dates
  if (date_mode === 'range' && earliest_date && latest_date && earliest_date !== latest_date) {
    const e = earliest_date.match(/^(\d{4})-(\d{2})-(\d{2})/)
    const l = latest_date.match(/^(\d{4})-(\d{2})-(\d{2})/)
    // Same month + year: "8 to 26 Sep 2026". Otherwise spell both ends out.
    if (e && l && e[1] === l[1] && e[2] === l[2]) {
      return `flexible, ${Number(e[3])} to ${Number(l[3])} ${MONTHS[Number(e[2]) - 1]} ${e[1]}`
    }
    return `flexible, ${formatDay(earliest_date)} to ${formatDay(latest_date)}`
  }
  const single = travel_date ?? earliest_date
  return formatDay(single)
}

/**
 * cf_trip_details — the party listed by name plus trip context. The header count
 * is the estimate (spaces_total); when it exceeds the names we actually have,
 * the count stays the estimate (per the sheet).
 */
function tripDetails(fg: FlightGroupCreatedEvent['flight_group']): string {
  const lines: string[] = [`Estimated party: ${fg.spaces_total} travellers`]
  fg.members
    .filter((m) => m.name.trim() !== '')
    .forEach((m, i) => {
      const isOrganizer =
        m.flight_group_member_id === fg.founder_member_id || m.role === 'group_organizer'
      lines.push(`${i + 1}. ${m.name}${isOrganizer ? ' (Group Organizer)' : ''}`)
    })
  const dates = tripDatePhrase(fg.dates)
  if (dates) lines.push(`Dates: ${dates}`)
  if (fg.aircraft_category) lines.push(`Aircraft: ${fg.aircraft_category}`)
  return lines.join('\n')
}

/** All pets across the party (they ride on the primary member, but aggregate to be safe). */
function allPets(fg: FlightGroupCreatedEvent['flight_group']) {
  return fg.members.flatMap((m) => m.pets)
}

const isDog = (type: string) => type.trim().toLowerCase() === 'dog'

/** "1. Mixed, Leo, lbs 65" per dog. */
function dogDetails(pets: ReturnType<typeof allPets>): string {
  return pets
    .filter((p) => isDog(p.type))
    .map((p, i) => `${i + 1}. ${p.breed || 'Unknown'}, ${p.name}, lbs ${p.weight_lbs ?? ''}`.trim())
    .join('\n')
}

/** "1. Cat, Starburst, lbs 10" per non-dog pet. */
function otherPetDetails(pets: ReturnType<typeof allPets>): string {
  return pets
    .filter((p) => !isDog(p.type))
    .map((p, i) => `${i + 1}. ${p.type}, ${p.name}, lbs ${p.weight_lbs ?? ''}`.trim())
    .join('\n')
}

/** AER + group id + creator member id — unique per entry, generated our side. */
function buildExternalId(groupId: string, memberId: string): string {
  return `AER-${groupId}-${memberId}`
}

/** Map a `flight_group.created` event to the frozen Freshworks contact shape. */
export function mapFlightGroupToFreshworksContact(
  event: FlightGroupCreatedEvent,
  opts: MapOptions = {},
): FreshworksContact {
  const fg = event.flight_group
  const creator = resolveCreator(fg)
  const pets = allPets(fg)

  return {
    first_name: creator?.name ?? '',
    last_name: opts.testMode ? 'TEST' : '',
    emails: creator?.email ?? '',
    // null/empty until account login carries phone (Flight Club); sent as-is.
    mobile_number: creator?.phone ?? '',
    cf_flying_from: fg.route.origin_city,
    cf_flying_to: fg.route.destination_city,
    cf_flight_date: flightMonth(fg.dates),
    cf_number_of_people: fg.spaces_total,
    cf_trip_details: tripDetails(fg),
    cf_number_of_dogs: pets.filter((p) => isDog(p.type)).length,
    cf_dog_details: dogDetails(pets),
    cf_number_of_cats: pets.filter((p) => !isDog(p.type)).length,
    cf_other_pet_details: otherPetDetails(pets),
    cf_additional_comments: fg.operator_notes,
    external_id: opts.testMode
      ? (opts.testExternalId ?? 'AER-TEST-0001')
      : buildExternalId(fg.group_id, creator?.flight_group_member_id ?? fg.founder_member_id),
  }
}

// Static contact classification sent on every AeroOS inquiry, per Ankush's
// Freshworks sheet. Fixed for the instance; Ankush's CRM-side workflow also
// enforces the resulting stage/status when the contact is created.
const LIFECYCLE_STAGE_ID = 29005135144 // "Customer"
const CONTACT_STATUS_ID = 28000448812 // a status under the Customer stage

/**
 * Freshsales Contacts API body shape: standard fields at the contact level, all
 * cf_* fields nested under `custom_field`. Direct create (no `unique_identifier`)
 * — per Ankush: no search, multiple entries per email allowed, direct import.
 */
export function toFreshworksApiBody(c: FreshworksContact) {
  return {
    contact: {
      first_name: c.first_name,
      last_name: c.last_name,
      emails: c.emails,
      mobile_number: c.mobile_number,
      external_id: c.external_id,
      lifecycle_stage_id: LIFECYCLE_STAGE_ID,
      contact_status_id: CONTACT_STATUS_ID,
      custom_field: {
        cf_flying_from: c.cf_flying_from,
        cf_flying_to: c.cf_flying_to,
        cf_flight_date: c.cf_flight_date,
        cf_number_of_people: c.cf_number_of_people,
        cf_trip_details: c.cf_trip_details,
        cf_number_of_dogs: c.cf_number_of_dogs,
        cf_dog_details: c.cf_dog_details,
        cf_number_of_cats: c.cf_number_of_cats,
        cf_other_pet_details: c.cf_other_pet_details,
        cf_additional_comments: c.cf_additional_comments,
      },
    },
  }
}

/** Result of a Freshworks write attempt — for logging, never surfaced to the user. */
export interface FreshworksWriteResult {
  skipped?: boolean
  success?: boolean
  status?: number
  message?: string
  /** Parsed upstream response (contact id on success, errors on failure). */
  data?: unknown
}

/**
 * Forward one contact to Freshworks. Decoupled and fail-safe: it never throws
 * and never affects flight creation. Self-skips when the endpoint is unset, so
 * it is a no-op until FRESHWORKS_WEBHOOK_URL is configured on the server.
 *
 * Posts to the Freshsales Contacts create endpoint with `Authorization: Token
 * token=<key>` and the nested `{ contact: { …, custom_field } }` body. Logs the
 * outcome — console.error on any failure (HTTP error, timeout, network), a
 * concise console.info on success — so a failed write surfaces in the server
 * logs rather than going silent.
 */
export async function forwardFreshworksContact(
  event: FlightGroupCreatedEvent,
): Promise<FreshworksWriteResult> {
  if (!isFreshworksConfigured()) return { skipped: true }

  const testMode = serverEnv.freshworksTestMode
  const contact = mapFlightGroupToFreshworksContact(event, {
    testMode,
    // Test mode: a short, synthetic, unique id — never a real group+member pair
    // on a throwaway record, and far shorter than an embedded ISO timestamp.
    testExternalId: testMode ? `AER-TEST-${Date.now().toString(36)}` : undefined,
  })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), serverEnv.freshworksTimeoutMs)
  try {
    const res = await fetch(serverEnv.freshworksWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token token=${serverEnv.freshworksApiKey}`,
      },
      body: JSON.stringify(toFreshworksApiBody(contact)),
      signal: controller.signal,
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      // Surface every failure in the server logs — a decoupled write must never
      // break flight creation, but it must not fail silently either.
      console.error(
        `[freshworks] contact write FAILED (HTTP ${res.status}) external_id=${contact.external_id}`,
        data,
      )
    } else {
      console.info(
        `[freshworks] contact write ok (HTTP ${res.status}) external_id=${contact.external_id}`,
      )
    }
    return { success: res.ok, status: res.status, data }
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    console.error(
      `[freshworks] contact write ${aborted ? 'TIMED OUT' : 'ERRORED'} external_id=${contact.external_id}`,
      err instanceof Error ? err.message : err,
    )
    return { success: false, message: aborted ? 'Freshworks write timed out.' : 'Freshworks write failed.' }
  } finally {
    clearTimeout(timer)
  }
}
