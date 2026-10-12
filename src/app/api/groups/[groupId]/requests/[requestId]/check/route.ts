/**
 * Perro Air's own check, coming back — contract section 3c, route (b).
 *
 * The check is deliberately manual and deliberately not a product screen: Chuck
 * works a queue inside Zoho, and when he marks the result Zoho calls this
 * (client, 2026-09-23; route (b) confirmed the live route 09-24). Until this
 * existed, `join_request.check_status` was written by nothing and every request
 * sat on `pending` — the requester kept seeing **Under review** after the
 * organiser had already approved them, because both halves have to finish
 * before anything opens up.
 *
 * Route (a), the stopgap for the first groups, is the same endpoint called by
 * hand. There is no second code path for it: marking by hand *is* this request,
 * sent by someone rather than by Zoho.
 *
 * **A failed check removes the participant and reopens the place** (migration
 * 0009), and Zoho has to be told the place reopened and who left (Charles,
 * 2026-09-23) — that is `member.removed`, which existed with no caller until
 * now. Removal after a failed check has no email: handled by hand for now, per
 * the same answer.
 *
 * This is the only inbound write path in the application, so it is the only
 * place a shared secret is checked rather than sent.
 */

import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { serverEnv, isCheckCallbackConfigured } from '@/config/serverEnv'
import {
  recordPerroCheck,
  requesterContact,
  groupZohoRecordId,
  type CheckOutcome,
  type CheckRemoval,
} from '@/features/join-approval/server/joinRequestStore'
import { buildMemberRemoved } from '@/api/services/joinRequestPayloads'
import { sendZohoEvent } from '@/api/services/zohoWebhook'

/** What the caller may send. Anything else is a 400 rather than a guess. */
const OUTCOMES: readonly string[] = ['cleared', 'failed']

/**
 * Constant-time compare, so the endpoint cannot be probed a character at a
 * time. Lengths are compared first because `timingSafeEqual` throws on a
 * mismatch — that length leak is unavoidable and worth far less than the
 * contents.
 */
function secretMatches(presented: string): boolean {
  const expected = serverEnv.zohoCallbackSecret
  const a = Buffer.from(presented)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function bearer(request: Request): string {
  const header = request.headers.get('authorization') ?? ''
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string; requestId: string }> },
) {
  if (!isCheckCallbackConfigured()) {
    return NextResponse.json(
      { success: false, message: 'The check callback is not configured on this deployment.' },
      { status: 503 },
    )
  }
  if (!secretMatches(bearer(request))) {
    return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 })
  }

  // Zoho holds the request as `jr_14`, because that is the form
  // `join_request_id` takes on every event we send it (`joinRequestId`). The
  // row id is the number inside. Both spellings are accepted so the caller can
  // use the identifier it was given without having to strip anything.
  const { groupId, requestId: rawRequestId } = await params
  const requestId = Number(String(rawRequestId).replace(/^jr_/i, ''))
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return NextResponse.json({ success: false, message: 'Unknown request.' }, { status: 404 })
  }

  let outcome: CheckOutcome
  try {
    const body = (await request.json()) as { result?: unknown; check_status?: unknown }
    // `result` is what the contract names it; `check_status` is accepted too,
    // because that is the column Chuck's queue is marking and it is the likelier
    // thing for the Zoho function to send.
    const value = String(body.result ?? body.check_status ?? '')
    if (!OUTCOMES.includes(value)) {
      return NextResponse.json(
        { success: false, message: "Expected result to be 'cleared' or 'failed'." },
        { status: 400 },
      )
    }
    outcome = value as CheckOutcome
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request body.' }, { status: 400 })
  }

  const recorded = await recordPerroCheck(groupId, requestId, outcome)
  if ('refused' in recorded) {
    return NextResponse.json({ success: false, message: 'Unknown request.' }, { status: 404 })
  }

  // A retried callback carrying the result already stored changes nothing and
  // must not emit a second removal. Answered 200 so Zoho stops retrying.
  if (!recorded.changed) {
    return NextResponse.json({ success: true, check_status: outcome, unchanged: true })
  }

  if (recorded.removal) {
    await emitMemberRemoved(groupId, recorded.userId, recorded.removal)
  }

  return NextResponse.json({
    success: true,
    check_status: outcome,
    place_reopened: recorded.removal !== null,
    spaces_remaining: recorded.removal?.spacesRemaining ?? null,
  })
}

/**
 * Tell Zoho the place reopened and who left.
 *
 * Best-effort, like every other event in this flow: the removal has already
 * committed, and failing the caller's request would have Zoho retry a decision
 * that is made. `sendZohoEvent` logs the outcome either way.
 */
async function emitMemberRemoved(
  groupId: string,
  userId: string,
  removal: CheckRemoval,
): Promise<void> {
  try {
    const [zohoRecordId, contact] = await Promise.all([
      groupZohoRecordId(groupId),
      requesterContact(userId),
    ])

    const event = buildMemberRemoved({
      groupId,
      zohoRecordId,
      seatId: removal.seatId,
      member: {
        accountId: contact?.accountId ?? null,
        name: contact?.name ?? null,
        email: contact?.email ?? null,
      },
      placesReleased: removal.placesReleased,
      groupStatus: removal.groupStatus,
      spacesTotal: removal.spacesTotal,
      spacesRemaining: removal.spacesRemaining,
      removedAt: removal.removedAt,
      sentAt: new Date().toISOString(),
    })

    await sendZohoEvent(event, `member.removed ${groupId} fgm_${removal.seatId}`)
  } catch (error) {
    console.error(
      `member.removed not sent for ${groupId} request ${userId}:`,
      error instanceof Error ? error.message : error,
    )
  }
}
