/**
 * Group detail read: GET /api/groups/[groupId]
 *
 * Serves the group from our own database rather than Zoho. Zoho remains the
 * source of truth and still receives its events, but it offers no retry and no
 * alerting, which is not survivable for a page a member is looking at.
 *
 * Authorisation is enforced here, on the read itself — a member changing an id
 * in the URL must be refused by the endpoint, not merely shown a different
 * screen. Non-members get 404 rather than 403, so the endpoint does not confirm
 * that a group exists to someone with no business knowing.
 */

import { NextResponse } from 'next/server'
import { requireViewerOrUnauthorized, getMembership } from '@/features/auth/server/guard'
import { getGroupDetail } from '@/features/group/server/groupStore'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
): Promise<Response> {
  const viewer = await requireViewerOrUnauthorized()
  if (viewer instanceof Response) return viewer

  const { groupId } = await params

  try {
    const membership = await getMembership(groupId, viewer.id)
    if (!membership) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    const group = await getGroupDetail(groupId, viewer.id)
    if (!group) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(group, { status: 200 })
  } catch (error) {
    console.error('Group detail endpoint error:', error)
    return NextResponse.json({ message: 'Failed to fetch group detail' }, { status: 500 })
  }
}
