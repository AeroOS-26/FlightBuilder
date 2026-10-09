import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { auth } from '@/features/auth/server/auth'
import { getMembership } from '@/features/auth/server/guard'
import { fetchGroupDetail } from '@/services/groupDataService.server'
import { metroLabel } from '@/features/public-flight/format'
import { APPROVAL_FLOW_ENABLED } from '@/config/features'
import {
  getRequestById,
  listPendingRequests,
} from '@/features/join-approval/server/joinRequestStore'
import { RequestDecisionPanel } from '@/features/join-approval/components/RequestDecisionPanel'

interface PageProps {
  params: Promise<{ groupId: string; requestId: string }>
}

/**
 * The same rule the group page follows: never confirm that something exists to
 * someone with no business knowing. A request belongs to one organiser, so
 * everyone else gets "page not found" rather than a title naming a stranger.
 */
export const metadata: Metadata = { title: 'Page not found · Perro Air' }

/**
 * Frame 48 · one join request, opened from the organiser's list.
 *
 * Organiser-only, and 404 rather than 403 throughout: a joiner guessing the URL
 * must not learn that a request exists, let alone whose.
 */
export default async function JoinRequestPage({ params }: PageProps) {
  if (!APPROVAL_FLOW_ENABLED) notFound()

  const { groupId, requestId } = await params
  const id = Number(requestId)
  if (!Number.isInteger(id) || id <= 0) notFound()

  const session = await auth()
  if (!session?.user?.id) notFound()

  const membership = await getMembership(groupId, session.user.id)
  if (!membership || membership.role !== 'group_organizer') notFound()

  const [group, request, pending] = await Promise.all([
    fetchGroupDetail(groupId, session.user.id),
    getRequestById(groupId, id),
    listPendingRequests(groupId),
  ])

  // A request that has already been answered is gone from this screen rather
  // than shown read-only: the decision it offers no longer exists.
  if (!request || request.status !== 'pending') notFound()

  return (
    <RequestDecisionPanel
      groupId={groupId}
      request={{
        id: request.id,
        requesterName: request.requesterName,
        memberSince: request.memberSince
          ? `Member since ${request.memberSince.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
          : null,
        travellerCount: Math.max(1, request.travelers.length),
        petLines: request.pets.map((pet) =>
          [pet.name, pet.type, pet.weight_lbs ? `${pet.weight_lbs} lbs` : null]
            .filter(Boolean)
            .join(', '),
        ),
        placesRequested: request.placesRequested,
        requestedAt: request.requestedAt.toISOString().slice(0, 10),
      }}
      routeLabel={`${metroLabel(group.flight.route_origin_city)} → ${metroLabel(group.flight.route_destination_city)}`}
      departureDate={group.flight.departure_date}
      spacesRemaining={Math.max(0, group.flight.spaces_remaining)}
      waitingCount={pending.length}
    />
  )
}
