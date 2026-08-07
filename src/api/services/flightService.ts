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
 * Sends the payload to Zoho via the relay and returns the created record only on
 * success. Any non-OK response — including a 503 when the integration isn't
 * configured on the server — is thrown, so the caller stays on Review and shows
 * an error rather than advancing to the Share screen with a flight that was
 * never saved.
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
  } else {
    // Any non-OK response is a real failure: the flight was NOT saved. Surface
    // it so the caller stays on Review and shows an error — never advance to the
    // Share screen with a flight that doesn't exist. A 503 means the server is
    // misconfigured (missing webhook URL); treat it as a failure too, not a
    // silent success, with a user-facing message rather than the raw config text.
    const data = await res.json().catch(() => null)
    throw {
      status: res.status,
      message:
        res.status === 503
          ? 'We couldn’t create your flight right now.'
          : data?.message ?? 'We could not create your flight. Please try again.',
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
  // Human-facing identifiers use the display code (IATA-preferred); the ICAO
  // payload code is separate. The suffix is a short random token — not a
  // sequence — so every creation is unique with no round trip or race, and the
  // share links can't be guessed by counting upwards.
  const fromCode = draft.route.from?.displayCode || 'XXX'
  const toCode = draft.route.to?.displayCode || 'XXX'
  const ym = yearMonth(draft)
  const token = randomToken()
  const shareSlug = `${fromCode}-${toCode}-${ym}-${token}`
  return {
    groupCode: `${ym}-${fromCode}-${toCode}-${token}`,
    shareSlug,
    shareUrl: buildShareUrl(shareSlug),
  }
}

/** 6 uppercase base36 chars from crypto — e.g. "K3F9M2". Unique per creation. */
function randomToken(): string {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('').toUpperCase()
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
