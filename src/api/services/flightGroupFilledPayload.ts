/**
 * Filled group -> `flight_group.filled` payload, contract section 4.
 *
 * Kept beside the created and joined builders so all three group events read
 * against the contract in one place, and a pure function of its inputs so the
 * shape can be checked without a database.
 *
 * Everything comes from our own records, read after the filling join
 * committed. Nothing is re-derived from a member's saved profile: the pets are
 * the ones stored when each member was seated, i.e. exactly what created and
 * joined already sent (contract section 7 — the flight payload is the source).
 */

import { inContractOrder } from './petPayload'
import type { FilledGroupSource } from '@/features/group/server/groupStore'
import type { FlightGroupFilledEvent } from '@/types'

export function buildFlightGroupFilled(
  source: FilledGroupSource,
  /** ISO timestamp for the event (caller stamps it). */
  sentAt: string,
): FlightGroupFilledEvent {
  const organiser = source.members.find((member) => member.role === 'group_organizer')

  return {
    event: 'flight_group.filled',
    sent_at: sentAt,
    flight_group: {
      group_id: source.groupId,
      status: 'filled',
      // The organiser's real membership row. flight_group.created still sends a
      // browser-generated id here (an open mismatch, docs/CLIENT-DECISIONS.md
      // §12), so Zoho cannot rely on this matching what it received at creation.
      founder_member_id: organiser ? memberId(organiser.memberId) : '',
      filled_at: source.filledAt.toISOString(),
      spaces_total: source.spacesTotal,
      spaces_remaining: Math.max(0, source.spacesTotal - source.spacesOccupied),
      aircraft_category: source.aircraftCategory,
      route: {
        origin_city: source.originCity,
        destination_city: source.destinationCity,
      },
      dates: {
        date_mode: source.dateMode,
        travel_date: source.travelDate,
        earliest_date: source.earliestDate,
        latest_date: source.latestDate,
      },
      members: source.members.map((member) => ({
        flight_group_member_id: memberId(member.memberId),
        // "" rather than null when absent, the same as member.joined sends —
        // which of the two the contract wants is still open with the client.
        account_id: member.accountId ?? '',
        name: member.name ?? '',
        email: member.email,
        role: member.role,
        join_method: member.joinMethod,
        member_status: 'joined',
        pets: member.pets.map(inContractOrder),
      })),
    },
    zoho_flight_group_record_id: source.zohoRecordId,
  }
}

/** The same `fgm_` id member.joined sends for this row. */
function memberId(rowId: number): string {
  return `fgm_${rowId}`
}
