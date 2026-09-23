import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { GroupDetailView } from '@/features/group/components/GroupDetailView'
import { RefreshOnFocus } from '@/components/common'
import { auth } from '@/features/auth/server/auth'
import { getMembership } from '@/features/auth/server/guard'
import { fetchGroupDetail } from '@/services/groupDataService.server'
import { metroLabel } from '@/features/public-flight/format'
import type { GroupStatus } from '@/types'

interface GroupPageProps {
  params: Promise<{ groupId: string }>
}

/**
 * One read per request, shared by the metadata and the page below, so naming the
 * flight in the tab does not cost a second trip to the database.
 */
const groupForViewer = cache(fetchGroupDetail)

/**
 * The tab title.
 *
 * It names the flight the same way the share page does — but **only for a
 * member**. This route answers 404 to everyone else precisely so it never
 * confirms that a group exists, and a title in the page head would give that
 * away just as plainly as the body would. Link-preview bots arrive without a
 * session, so a `/group` link previews as "Page not found"; the share link is
 * the one built to be shared. Charles, 2026-09-23: "the right call".
 */
export async function generateMetadata({ params }: GroupPageProps): Promise<Metadata> {
  const { groupId } = await params
  const notFoundTitle = { title: 'Page not found · Perro Air' }

  const session = await auth()
  if (!session?.user?.id) return notFoundTitle
  if (!(await getMembership(groupId, session.user.id))) return notFoundTitle

  try {
    const group = await groupForViewer(groupId, session.user.id)
    const route = `${metroLabel(group.flight.route_origin_city)} to ${metroLabel(group.flight.route_destination_city)}`
    const title = `${route} · Shared Flight · Perro Air`
    return {
      title,
      description: `Your shared flight from ${route}`,
      openGraph: { title, description: `Your shared flight from ${route}`, siteName: 'Perro Air' },
    }
  } catch {
    // The group vanished between the membership check and the read. The page
    // below answers that properly; the title just stays honest.
    return notFoundTitle
  }
}

/**
 * Roster-derived state. Only the first three states can be inferred from member
 * counts; quoting onward are set by the operator flow and will arrive on the
 * group record once the backend lands.
 */
function determineGroupStatus(spacesOccupied: number, totalSpaces: number): GroupStatus {
  if (spacesOccupied >= totalSpaces) return 'filled'
  if (spacesOccupied >= Math.ceil(totalSpaces * 0.5)) return 'filling'
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

  // Same cached read the metadata used, so the page costs one trip, not two.
  const groupDetail = await groupForViewer(groupId, session.user.id)

  // Occupancy in people, not accounts. `members` is one entry per account, and
  // a party of three travels on one. Deriving the state from the row count
  // would hold a full flight at "forming". See migration 0007.
  const totalSpaces = groupDetail.flight.spaces_total
  const spacesOccupied = Math.max(0, totalSpaces - groupDetail.flight.spaces_remaining)
  const groupStatus = determineGroupStatus(spacesOccupied, totalSpaces)

  // Role comes from the membership row, which is the point of seating the
  // organiser at creation — one lookup answers both "may this person be here"
  // and "which view do they get", rather than special-casing the creator.
  const viewerRole = membership.role === 'group_organizer' ? ('organizer' as const) : ('joiner' as const)

  return (
    <>
      {/*
        Mounted on the page rather than the layout. `router.refresh()` re-runs
        the whole route including the layout anyway, so the layout's guards are
        re-checked for free — without committing every future child of this
        segment to refreshing.
      */}
      <RefreshOnFocus />
      <GroupDetailView
        group={groupDetail}
        viewerRole={viewerRole}
        groupStatus={groupStatus}
      />
    </>
  )
}
