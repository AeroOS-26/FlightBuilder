/**
 * Decline a join request: POST /api/groups/[groupId]/requests/[requestId]/decline
 *
 * No reason is taken and none is recorded. The requester is told their request
 * was not approved and nothing more — frame 48B is explicit that a decline
 * gives no reason — and the place stays open for other requests.
 *
 * `join_request.closed` goes to Zoho so the Join Request record is closed with
 * its outcome. No membership event, because nobody was ever seated — that is
 * precisely what distinguishes this from a removal.
 */

import { NextResponse } from 'next/server'
import { requireViewerOrUnauthorized, getMembership } from '@/features/auth/server/guard'
import {
  declineRequest,
  groupZohoRecordId,
  memberSeatId,
  requesterContact,
  getGroupEmailContext,
} from '@/features/join-approval/server/joinRequestStore'
import { buildJoinRequestClosed } from '@/api/services/joinRequestPayloads'
import { sendZohoEvent } from '@/api/services/zohoWebhook'
import { emailRequesterDeclined } from '@/features/join-approval/server/approvalEmails'

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

  const membership = await getMembership(groupId, viewer.id)
  if (!membership || membership.role !== 'group_organizer') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 })
  }

  const result = await declineRequest(groupId, id, viewer.id)
  if ('refused' in result) {
    return NextResponse.json(
      { message: 'That request has already been answered.' },
      { status: 409 },
    )
  }

  // After the fact and never fatal: the request is already closed in our
  // database, and a failed emit must not tell the organiser their decision did
  // not land. sendZohoEvent logs the outcome either way.
  await notifyDeclined(groupId, result)
  await emitClosed(
    groupId,
    result.id,
    result.userId,
    result.placesRequested,
    viewer.id,
    result.contactEmail,
  )

  return NextResponse.json({ success: true }, { status: 200 })
}

/**
 * Tell Zoho the request closed without a membership.
 *
 * `closed_by` carries the organiser's `fgm_` id, settled in the contract of
 * 1 October: an id resolves to a person and a fixed string does not.
 */
async function emitClosed(
  groupId: string,
  requestId: number,
  requesterUserId: string,
  placesNeeded: number,
  decidedByUserId: string,
  /** The address the requester gave on frame 42, when they changed it. */
  contactEmail: string | null,
): Promise<void> {
  try {
    const [zohoRecordId, requester, deciderSeat] = await Promise.all([
      groupZohoRecordId(groupId),
      requesterContact(requesterUserId),
      memberSeatId(groupId, decidedByUserId),
    ])
    const now = new Date().toISOString()
    const event = buildJoinRequestClosed({
      groupId,
      zohoRecordId,
      requestId,
      status: 'declined',
      // The organiser's membership id, not a word: an id resolves to a person
      // and counsel asked for enough detail to explain each decision. At the
      // moment of a decline the organiser is a seated member, so it exists.
      closedBy: deciderSeat ? `fgm_${deciderSeat}` : 'organizer',
      placesNeeded,
      // Null on a decline — no membership came out of this request.
      flightGroupMemberId: null,
      requester: { ...requester, email: contactEmail ?? requester.email },
      closedAt: now,
      sentAt: now,
    })
    await sendZohoEvent(event, `join_request.closed ${groupId} jr_${requestId}`)
  } catch (error) {
    console.error(
      `join_request.closed failed for ${groupId} jr_${requestId}:`,
      error instanceof Error ? error.message : error,
    )
  }
}

/** Tell the requester, at the address their request gave. */
async function notifyDeclined(
  groupId: string,
  result: { userId: string; contactEmail: string | null },
): Promise<void> {
  const [context, requester] = await Promise.all([
    getGroupEmailContext(groupId),
    requesterContact(result.userId),
  ])
  const to = result.contactEmail ?? requester.email
  if (!context || !to) return
  await emailRequesterDeclined({
    to,
    requesterName: requester.name,
    flight: { route: context.route, departureDate: context.departureDate },
  })
}
