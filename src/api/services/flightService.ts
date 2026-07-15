/**
 * Flight service — the only place that knows how a Flight Builder draft maps
 * to the backend (Zoho) "Flight Group" record and back.
 *
 * On confirm it:
 *   1. generates the human-facing group id + tracked share link client-side
 *      (the backend confirmed these are frontend-generated from route + date),
 *   2. builds the `flight_group.created` payload (see flightPayload.ts),
 *   3. POSTs it through the server-side relay (/api/flight-group), which holds
 *      the Zoho secret and forwards to the webhook,
 *   4. assembles the FlightRecord the Share step renders, attaching the backend
 *      record id (for reconciliation) when one is returned.
 *
 * Field-name reconciliation with Zoho lives in flightPayload.ts, never in
 * components. The share link never depends on the webhook response.
 */

import { buildShareUrl } from '@/utils/shareLink'
import { fromISODate } from '@/utils/date'
import { buildFlightGroupCreated } from './flightPayload'
import type {
  CreateFlightRelayResponse,
  CreateFlightResponse,
  FlightDraft,
  FlightRecord,
  MemberIdentity,
} from '@/types'

const RELAY_ENDPOINT = '/api/flight-group'

interface CreateFlightArgs {
  draft: FlightDraft
  founder: MemberIdentity | null
}

/**
 * Create the flight record on confirm.
 *
 * Sends the payload to Zoho via the relay. If the relay reports the integration
 * isn't configured (no webhook URL yet), we still return a usable record so the
 * flow is testable locally — the share link is generated either way.
 */
export async function createFlight({
  draft,
  founder,
}: CreateFlightArgs): Promise<CreateFlightResponse> {
  const ids = generateIdentifiers(draft)
  const sentAt = new Date().toISOString()

  const payload = buildFlightGroupCreated({
    draft,
    founder,
    groupId: ids.groupCode,
    shareLink: ids.shareUrl,
    sentAt,
  })

  let recordId: string | null = null
  const res = await fetch(RELAY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (res.ok) {
    const data = (await res.json()) as CreateFlightRelayResponse
    // Backend record id (empty string when not created); keep null if absent.
    recordId = data.flight_group_id || null
  } else if (res.status === 503) {
    // Integration not configured on the server yet — proceed with local record
    // so the flow remains demonstrable until the webhook URL is set.
    recordId = null
  } else {
    // Real failure from Zoho/relay — surface it for the failure state.
    const data = await res.json().catch(() => null)
    throw {
      status: res.status,
      message: data?.message ?? 'We could not create your flight. Please try again.',
      code: data?.code,
      retryable: res.status >= 500 || res.status === 0,
    }
  }

  return { flight: assembleRecord(draft, founder, ids, recordId) }
}

interface Identifiers {
  groupCode: string
  shareSlug: string
  shareUrl: string
}

/** Group code + share slug/link, generated client-side from route + date. */
function generateIdentifiers(draft: FlightDraft): Identifiers {
  // Human-facing identifiers use the display code (IATA-preferred), matching
  // the sample (e.g. "202606-SFO-JFK-01"); the ICAO payload code is separate.
  const fromCode = draft.route.from?.displayCode || 'XXX'
  const toCode = draft.route.to?.displayCode || 'XXX'
  const ym = yearMonth(draft)
  const shareSlug = `${fromCode}-${toCode}-${ym}`
  return {
    groupCode: `${ym}-${fromCode}-${toCode}-01`,
    shareSlug,
    shareUrl: buildShareUrl(shareSlug),
  }
}

/** "202606" from the selected start date, or the current month as a fallback. */
function yearMonth(draft: FlightDraft): string {
  const iso = draft.date.start
  const d = iso ? fromISODate(iso) : new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

function assembleRecord(
  draft: FlightDraft,
  founder: MemberIdentity | null,
  ids: Identifiers,
  recordId: string | null,
): FlightRecord {
  const founderTraveler =
    draft.travelers.find((t) => t.id === draft.primaryContactId) ??
    draft.travelers.find((t) => t.isFounder) ??
    draft.travelers[0]
  const memberCount = Math.max(1, draft.travelers.length)

  return {
    // Prefer the backend record id (for reconciliation); fall back to a local id.
    id: recordId ?? `fl_${Date.now().toString(36)}`,
    groupCode: ids.groupCode,
    shareSlug: ids.shareSlug,
    route: draft.route,
    date: draft.date,
    // "Spaces", never "Seats".
    availableSpaces: Math.max(0, 4 - memberCount),
    memberCount,
    estimatedMembers: 4,
    aircraftClass: 'Light Jet',
    founder: {
      id: founder?.id ?? 'member_self',
      name: founder?.name ?? founderTraveler?.name ?? 'Founder',
      email: founder?.email ?? '',
      phone: founder?.phone ?? '',
    },
    shareUrl: ids.shareUrl,
  }
}
