/**
 * Join-request events -> contract sections 3b and 3c.
 *
 * Built from the samples Vivek sent on 2026-10-01, saved at
 * `../AERO MILESTONE/aeroos_payloads_3a_3b_3c_2026-09-28.json` because the full
 * 28 September contract has not reached us — `latestAero_payload.json` is still
 * 16 September and carries none of these events.
 *
 * Pure functions of their inputs, like the other builders, so the shapes can be
 * checked against the contract without a database.
 *
 * 3a's `flight_group_member_id` is always null, settled in the contract of
 * 1 October. That field identifies a membership row; a request seats nobody, so
 * none exists. The join_request_id deliberately does NOT go there either — a
 * request id in a membership field creates an identity that looks like a
 * membership and is not one, and something could later match on it.
 */

import { nullIfBlank } from './payloadValue'
import type {
  FlightGroupPet,
  JoinRequestClosedEvent,
  JoinRequestCreatedEvent,
  MemberRemovedEvent,
} from '@/types'

/** `jr_<row id>`, mirroring the `fgm_` convention the other events use. */
export function joinRequestId(rowId: number | string): string {
  return String(rowId).startsWith('jr_') ? String(rowId) : `jr_${rowId}`
}

interface ClosedArgs {
  groupId: string
  zohoRecordId: string | null
  requestId: number | string
  status: JoinRequestClosedEvent['join_request']['request_status']
  /**
   * Who closed it. `system` for a lapse — a request still pending when the
   * group fills closes without anyone deciding, which is why the design reports
   * it to the organiser as something that happened rather than something they
   * did.
   */
  closedBy: string
  placesNeeded: number
  /** The membership the approval produced; null on a decline or a lapse. */
  flightGroupMemberId: string | null
  requester: { accountId: string | null; name: string | null; email: string | null }
  closedAt: string
  sentAt: string
}

export function buildJoinRequestClosed({
  groupId,
  zohoRecordId,
  requestId,
  status,
  closedBy,
  placesNeeded,
  flightGroupMemberId,
  requester,
  closedAt,
  sentAt,
}: ClosedArgs): JoinRequestClosedEvent {
  return {
    event: 'join_request.closed',
    sent_at: sentAt,
    group_id: groupId,
    zoho_flight_group_record_id: zohoRecordId,
    join_request: {
      join_request_id: joinRequestId(requestId),
      request_status: status,
      closed_at: closedAt,
      closed_by: closedBy,
      places_needed: placesNeeded,
      flight_group_member_id: flightGroupMemberId,
      // No reason travels with a decline, and none is invented to fill the gap.
      requester: {
        account_id: nullIfBlank(requester.accountId),
        name: nullIfBlank(requester.name),
        email: nullIfBlank(requester.email),
      },
    },
  }
}

interface RemovedArgs {
  groupId: string
  zohoRecordId: string | null
  /** The membership row being marked removed — a real `flight_group_member.id`. */
  seatId: number | string
  member: { accountId: string | null; name: string | null; email: string | null }
  placesReleased: number
  groupStatus: string
  spacesTotal: number
  /** After the removal. Zoho takes this as sent and does not recalculate it. */
  spacesRemaining: number
  removedAt: string
  sentAt: string
}

export function buildMemberRemoved({
  groupId,
  zohoRecordId,
  seatId,
  member,
  placesReleased,
  groupStatus,
  spacesTotal,
  spacesRemaining,
  removedAt,
  sentAt,
}: RemovedArgs): MemberRemovedEvent {
  return {
    event: 'member.removed',
    sent_at: sentAt,
    group_id: groupId,
    zoho_flight_group_record_id: zohoRecordId,
    // The only removal this milestone builds is the failed compliance check.
    // Vivek's other reason categories are still held, so there is nothing else
    // this could legitimately be yet.
    removal_reason: 'compliance_review_failed',
    removed_at: removedAt,
    member: {
      flight_group_member_id: String(seatId).startsWith('fgm_') ? String(seatId) : `fgm_${seatId}`,
      account_id: nullIfBlank(member.accountId),
      name: nullIfBlank(member.name),
      email: nullIfBlank(member.email),
      places_released: placesReleased,
    },
    flight_group: {
      group_status: groupStatus,
      spaces_total: spacesTotal,
      spaces_remaining: Math.max(0, spacesRemaining),
    },
  }
}

interface CreatedArgs {
  groupId: string
  zohoRecordId: string | null
  requestId: number | string
  requestedAt: string
  placesNeeded: number
  travelersCount: number
  requester: {
    accountId: string | null
    name: string | null
    email: string | null
    phone: string | null
  }
  pets: FlightGroupPet[]
  sentAt: string
}

export function buildJoinRequestCreated({
  groupId,
  zohoRecordId,
  requestId,
  requestedAt,
  placesNeeded,
  travelersCount,
  requester,
  pets,
  sentAt,
}: CreatedArgs): JoinRequestCreatedEvent {
  return {
    event: 'join_request.created',
    sent_at: sentAt,
    group_id: groupId,
    zoho_flight_group_record_id: zohoRecordId,
    join_request: {
      join_request_id: joinRequestId(requestId),
      request_status: 'pending',
      requested_at: requestedAt,
      places_needed: placesNeeded,
      travelers_count: travelersCount,
      requester: {
        // Always null. See the note at the top of this file.
        flight_group_member_id: null,
        account_id: nullIfBlank(requester.accountId),
        name: nullIfBlank(requester.name),
        email: nullIfBlank(requester.email),
        phone: nullIfBlank(requester.phone),
        role: 'joiner',
        join_method: 'shared_link',
        pets,
      },
    },
  }
}
