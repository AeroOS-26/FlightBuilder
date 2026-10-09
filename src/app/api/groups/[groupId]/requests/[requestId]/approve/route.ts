/**
 * Approve a join request: POST /api/groups/[groupId]/requests/[requestId]/approve
 *
 * This is where the place is actually taken, and therefore where
 * `member.joined` and `flight_group.filled` now fire. Under the old flow both
 * went out on the join itself; the approval milestone moves only the moment
 * (Charles, 2026-09-22), not the payloads.
 *
 * Only the Group Organizer may approve, and only for their own group.
 */

import { NextResponse } from 'next/server'
import { requireViewerOrUnauthorized, getMembership } from '@/features/auth/server/guard'
import {
  approveRequest,
  requesterContact,
} from '@/features/join-approval/server/joinRequestStore'
import {
  getFilledGroupSource,
  markFilledEventSent,
} from '@/features/group/server/groupStore'
import {
  groupZohoRecordId,
  memberSeatId,
  getGroupEmailContext,
} from '@/features/join-approval/server/joinRequestStore'
import {
  emailRequesterApproved,
  emailRequesterGroupFilled,
} from '@/features/join-approval/server/approvalEmails'
import { buildJoinRequestClosed } from '@/api/services/joinRequestPayloads'
import { buildMemberJoined } from '@/api/services/memberJoinedPayload'
import { buildFlightGroupFilled } from '@/api/services/flightGroupFilledPayload'
import { sendZohoEvent } from '@/api/services/zohoWebhook'
import type { FlightGroupPet } from '@/types'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; requestId: string }> },
) {
  const viewer = await requireViewerOrUnauthorized()
  if (viewer instanceof Response) return viewer

  const { groupId, requestId } = await params
  const id = Number(requestId)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: 'Unknown request.' }, { status: 400 })
  }

  // Approving is the organiser's alone. A joiner asking directly gets the same
  // answer as a stranger — the route does not confirm the request exists.
  const membership = await getMembership(groupId, viewer.id)
  if (!membership || membership.role !== 'group_organizer') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  const result = await approveRequest(groupId, id, viewer.id)

  if ('refused' in result) {
    if (result.refused === 'not-enough-places') {
      return NextResponse.json(
        {
          message: `This request needs ${result.placesRequested} places and ${result.spacesRemaining} are open.`,
        },
        { status: 409 },
      )
    }
    if (result.refused === 'not-pending') {
      return NextResponse.json(
        { message: 'That request has already been answered.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  // Both emits are after the fact and neither may fail the response: the person
  // is seated in our database, and Zoho's unreliability is why reads were moved
  // out of its request path. `sendZohoEvent` logs the outcome either way.
  // Both go out, and in no guaranteed order: member.joined creates the member,
  // join_request.closed only closes the request. The contract requires each to
  // be handled whichever lands first, so neither waits on the other here.
  await emitMemberJoined(groupId, result.request, result.seatId)
  await emitRequestApproved(groupId, result, viewer.id)
  if (result.filledByThisApproval) await emitFlightGroupFilled(groupId)

  // Everyone the fill closed out. `system` because nobody decided it: the
  // design reports a lapse to the organiser as something that happened, not
  // something they did.
  for (const lapsed of result.lapsed) {
    await emitRequestLapsed(groupId, lapsed)
  }

  // Everyone the decision touched is told, after every write has committed.
  await notifyDecided(groupId, result)

  return NextResponse.json(
    {
      success: true,
      member_id: `fgm_${result.seatId}`,
      filled: result.filledByThisApproval,
      lapsed: result.lapsed.length,
    },
    { status: 200 },
  )
}

/**
 * The record id and the pets both come from the group and the request, never
 * from `getFilledGroupSource`: that read is `WHERE filled_at IS NOT NULL`, so on
 * every approval that does *not* fill the group it answers null, and the event
 * went out with `zoho_flight_group_record_id: null` and `pets: []` even where
 * both were known. Caught live on 2026-10-05 against jr_11.
 *
 * The pets are the request's own, stored as they were sent (migration 0009) —
 * the same rule the join route follows, and the same objects `approveRequest`
 * copies onto the seat for `flight_group.filled` to send again.
 */
async function emitMemberJoined(
  groupId: string,
  request: { userId: string; pets: FlightGroupPet[]; contactEmail: string | null },
  seatId: number,
): Promise<void> {
  try {
    const [zohoRecordId, contact] = await Promise.all([
      groupZohoRecordId(groupId),
      requesterContact(request.userId),
    ])

    const event = buildMemberJoined({
      groupId,
      zohoRecordId,
      seatId: String(seatId),
      accountId: contact.accountId,
      name: contact.name,
      // The address the requester gave on frame 42, when they changed it.
      email: request.contactEmail ?? contact.email ?? '',
      phone: contact.phone,
      pets: request.pets,
      sentAt: new Date().toISOString(),
    })
    await sendZohoEvent(event, `member.joined ${groupId} fgm_${seatId}`)
  } catch (error) {
    console.error(
      `member.joined failed for ${groupId} fgm_${seatId}:`,
      error instanceof Error ? error.message : error,
    )
  }
}

async function emitFlightGroupFilled(groupId: string): Promise<void> {
  try {
    const source = await getFilledGroupSource(groupId)
    if (!source) {
      console.error(`flight_group.filled not sent for ${groupId}: no fill recorded.`)
      return
    }
    const event = buildFlightGroupFilled(source, new Date().toISOString())
    const outcome = await sendZohoEvent(event, `flight_group.filled ${groupId}`)
    if (outcome.status === 'accepted') await markFilledEventSent(groupId)
  } catch (error) {
    console.error(
      `flight_group.filled failed for ${groupId}:`,
      error instanceof Error ? error.message : error,
    )
  }
}

async function emitRequestLapsed(
  groupId: string,
  lapsed: { id: number; userId: string; placesRequested: number; contactEmail: string | null },
): Promise<void> {
  try {
    const [zohoRecordId, requester] = await Promise.all([
      groupZohoRecordId(groupId),
      requesterContact(lapsed.userId),
    ])
    const now = new Date().toISOString()
    const event = buildJoinRequestClosed({
      groupId,
      zohoRecordId,
      requestId: lapsed.id,
      status: 'lapsed_group_filled',
      closedBy: 'system',
      placesNeeded: lapsed.placesRequested,
      // Nothing came out of a lapsed request, so there is no membership to link.
      flightGroupMemberId: null,
      requester: { ...requester, email: lapsed.contactEmail ?? requester.email },
      closedAt: now,
      sentAt: now,
    })
    await sendZohoEvent(event, `join_request.closed ${groupId} jr_${lapsed.id}`)
  } catch (error) {
    console.error(
      `join_request.closed (lapsed) failed for ${groupId} jr_${lapsed.id}:`,
      error instanceof Error ? error.message : error,
    )
  }
}

/**
 * Close the request as approved.
 *
 * Carries the real membership id the approval produced — the only thing joining
 * a join request to the membership that came out of it, which counsel's
 * retention rules depend on to tell the two apart.
 */
async function emitRequestApproved(
  groupId: string,
  result: {
    seatId: number
    request: { id: number; userId: string; placesRequested: number; contactEmail: string | null }
  },
  decidedByUserId: string,
): Promise<void> {
  try {
    const [zohoRecordId, requester, deciderSeat] = await Promise.all([
      groupZohoRecordId(groupId),
      requesterContact(result.request.userId),
      memberSeatId(groupId, decidedByUserId),
    ])
    const now = new Date().toISOString()
    const event = buildJoinRequestClosed({
      groupId,
      zohoRecordId,
      requestId: result.request.id,
      status: 'approved',
      closedBy: deciderSeat ? `fgm_${deciderSeat}` : 'organizer',
      placesNeeded: result.request.placesRequested,
      flightGroupMemberId: `fgm_${result.seatId}`,
      requester: { ...requester, email: result.request.contactEmail ?? requester.email },
      closedAt: now,
      sentAt: now,
    })
    await sendZohoEvent(event, `join_request.closed ${groupId} jr_${result.request.id}`)
  } catch (error) {
    console.error(
      `join_request.closed (approved) failed for ${groupId} jr_${result.request.id}:`,
      error instanceof Error ? error.message : error,
    )
  }
}

/**
 * The approved requester, and anyone the fill closed out.
 *
 * One read of the group for all of them, and each send is best-effort: a mail
 * failure must not undo an approval that has already seated someone.
 */
async function notifyDecided(
  groupId: string,
  result: {
    request: { userId: string; contactEmail: string | null }
    lapsed: { userId: string; contactEmail: string | null }[]
  },
): Promise<void> {
  const context = await getGroupEmailContext(groupId)
  if (!context) return
  const flight = { route: context.route, departureDate: context.departureDate }

  const approved = await requesterContact(result.request.userId)
  const approvedTo = result.request.contactEmail ?? approved.email
  if (approvedTo) {
    await emailRequesterApproved({
      to: approvedTo,
      requesterName: approved.name,
      flight,
      groupLink: context.groupLink,
    })
  }

  for (const lapsed of result.lapsed) {
    const person = await requesterContact(lapsed.userId)
    const to = lapsed.contactEmail ?? person.email
    if (!to) continue
    await emailRequesterGroupFilled({ to, requesterName: person.name, flight })
  }
}
