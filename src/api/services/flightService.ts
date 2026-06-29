/**
 * Flight service — the only place that knows how a Flight Builder draft maps
 * to the backend (Zoho) "Flight Group" record and back.
 *
 * Field naming differences between our product vocabulary and the Zoho API
 * (e.g. "seats" vs "Spaces") are reconciled HERE, in one place, after being
 * flagged and aligned with the Zoho working group — never silently mapped
 * around in components.
 *
 * Until the live endpoints are wired, `createFlight` returns a typed mock so
 * the UI can be built and reviewed against a real shape.
 */

import { buildShareUrl } from '@/utils/shareLink'
import { fromISODate } from '@/utils/date'
import type { CreateFlightResponse, FlightDraft, FlightRecord } from '@/types'

/**
 * Create the flight record on confirm.
 *
 * Live implementation (Milestone 2) once the Zoho contract is available:
 *   const payload = toZohoFlightGroup(draft)
 *   const { data } = await apiClient.post('/flights', payload)
 *   return fromZohoFlightGroup(data)
 */
export async function createFlight(
  draft: FlightDraft,
): Promise<CreateFlightResponse> {
  // Simulate the network round-trip so loading states are observable.
  await delay(1100)
  return { flight: mockCreatedFlight(draft) }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** "202606" from the selected start date, or the current month as a fallback. */
function yearMonth(draft: FlightDraft): string {
  const iso = draft.date.start
  const d = iso ? fromISODate(iso) : new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Temporary stand-in until the Zoho endpoint is wired. Mirrors the real
 * response shape so swapping in the live call is a localized change.
 */
function mockCreatedFlight(draft: FlightDraft): FlightRecord {
  const fromCode = draft.route.from?.code || 'XXX'
  const toCode = draft.route.to?.code || 'XXX'
  const ym = yearMonth(draft)
  const shareSlug = `${fromCode}-${toCode}-${ym}`
  const groupCode = `${ym}-${fromCode}-${toCode}-01`
  const founder =
    draft.travelers.find((t) => t.id === draft.primaryContactId) ??
    draft.travelers.find((t) => t.isFounder) ??
    draft.travelers[0]
  const memberCount = Math.max(1, draft.travelers.length)

  return {
    id: `fl_${Date.now().toString(36)}`,
    groupCode,
    shareSlug,
    route: draft.route,
    date: draft.date,
    // "Spaces", never "Seats".
    availableSpaces: Math.max(0, 4 - memberCount),
    memberCount,
    estimatedMembers: 4,
    aircraftClass: 'Light Jet',
    founder: {
      id: 'member_self',
      name: founder?.name ?? 'Founder',
      email: '',
    },
    shareUrl: buildShareUrl(shareSlug),
  }
}
