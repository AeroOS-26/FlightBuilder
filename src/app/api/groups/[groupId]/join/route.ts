/**
 * Join a flight group: POST /api/groups/[groupId]/join
 *
 * Writes the membership to our own database and emits `member.joined` to Zoho.
 *
 * Idempotent: the seat is written with ON CONFLICT against the (group, user)
 * uniqueness constraint, so a double submit or a retried request returns the
 * existing seat rather than adding a second member. The group row is locked for
 * the duration, so two simultaneous joins cannot both read the same remaining
 * count and overfill the flight.
 */

import { NextResponse } from 'next/server'
import { requireViewerOrUnauthorized } from '@/features/auth/server/guard'
import { addMember } from '@/features/group/server/groupStore'
import { findByEmail } from '@/features/auth/server/members'
import { serverEnv, isZohoConfigured } from '@/config/serverEnv'
import type { MemberJoinResponse, MemberJoinedEvent } from '@/types'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
): Promise<Response> {
  const viewer = await requireViewerOrUnauthorized()
  if (viewer instanceof Response) return viewer

  const { groupId } = await params

  try {
    const seat = await addMember(groupId, viewer.id)
    if (!seat) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 })
    }

    const filled = seat.memberCount >= seat.spacesTotal

    // Only a genuinely new member is worth telling Zoho about; re-emitting on a
    // retry would create duplicate CRM activity for one join.
    if (!seat.alreadyMember) {
      await emitMemberJoined(groupId, viewer.id, viewer.email, viewer.accountId)
    }

    const response: MemberJoinResponse = {
      success: true,
      member_id: seat.memberId,
      group_state: filled ? 'full' : 'forming',
      filled,
    }
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Join endpoint error:', error)
    return NextResponse.json({ message: 'Failed to join group' }, { status: 500 })
  }
}

/**
 * Tell Zoho a member joined.
 *
 * Never throws. The member is already seated in our database at this point, and
 * Zoho's unreliability is the reason reads were moved out of its request path in
 * the first place — so a failed emit must not fail a join the member completed.
 * It is logged loudly instead; reconciling a missed event is follow-up work.
 */
async function emitMemberJoined(
  groupId: string,
  userId: string,
  email: string,
  accountId: string | null,
): Promise<void> {
  if (!isZohoConfigured()) return

  try {
    const member = await findByEmail(email)

    const event: MemberJoinedEvent = {
      event: 'member.joined',
      sent_at: new Date().toISOString(),
      flight_group_id: groupId,
      account_id: accountId ?? '',
      name: member?.name ?? '',
      email,
      phone: member?.phone ?? null,
      role: 'joiner',
      join_method: 'shared_link',
      member_status: 'joined',
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), serverEnv.zohoTimeoutMs)

    try {
      const upstream = await fetch(serverEnv.zohoWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        signal: controller.signal,
      })
      if (!upstream.ok) {
        console.error(
          `member.joined rejected for ${groupId}/user ${userId}: HTTP ${upstream.status}`,
        )
      }
    } finally {
      clearTimeout(timer)
    }
  } catch (error) {
    console.error(
      `member.joined emit failed for ${groupId}/user ${userId}:`,
      error instanceof Error ? error.message : error,
    )
  }
}
