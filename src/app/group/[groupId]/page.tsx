import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { GroupDetailView } from '@/features/group/components/GroupDetailView'
import { auth } from '@/features/auth/server/auth'
import { getMembership } from '@/features/auth/server/guard'
import { fetchGroupDetail } from '@/services/groupDataService.server'
import type { GroupStatus } from '@/types'

interface GroupPageProps {
  params: Promise<{ groupId: string }>
}

export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { groupId } = await params
  return {
    title: `Group | AeroOS`,
    description: 'View your flight group details and members',
  }
}

/**
 * Roster-derived state. Only the first three states can be inferred from member
 * counts; quoting onward are set by the operator flow and will arrive on the
 * group record once the backend lands.
 */
function determineGroupStatus(memberCount: number, totalSpaces: number): GroupStatus {
  if (memberCount >= totalSpaces) return 'filled'
  if (memberCount >= Math.ceil(totalSpaces * 0.5)) return 'filling'
  return 'forming'
}

export default async function GroupPage({ params }: GroupPageProps) {
  const { groupId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    notFound()
  }

  // A non-member gets 404, never 403 — the route must not confirm that a group
  // exists to someone with no business knowing.
  const membership = await getMembership(groupId, session.user.id)
  if (!membership) {
    notFound()
  }

  const groupDetail = await fetchGroupDetail(groupId, session.user.id)

  const memberCount = groupDetail.members.length
  const totalSpaces = groupDetail.flight.spaces_total
  const groupStatus = determineGroupStatus(memberCount, totalSpaces)

  // Role comes from the membership row, which is the point of seating the
  // organiser at creation — one lookup answers both "may this person be here"
  // and "which view do they get", rather than special-casing the creator.
  const viewerRole = membership.role === 'group_organizer' ? ('organizer' as const) : ('joiner' as const)

  return (
    <GroupDetailView
      group={groupDetail}
      viewerRole={viewerRole}
      groupStatus={groupStatus}
    />
  )
}
