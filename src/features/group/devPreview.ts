/**
 * Dev-only preview override for the Flight Group Detail screens.
 *
 * The six Figma frames (60/61/64 organizer, 62/63/70 joiner) are role × state
 * combinations, but the running app can only produce one of them: role comes
 * from the signed-in id matching the organizer, and state is derived from the
 * roster size. That makes the other five impossible to look at, let alone
 * check against the design.
 *
 * This lets a URL name the combination instead:
 *
 *   /group/<id>?as=organizer&state=forming
 *
 * It is inert unless NODE_ENV is development, so it cannot be reached on a
 * deployed build. Delete this file and its two call sites once the backend
 * supplies real roles and states.
 */

import { getMockGroup } from '@/services/mockData'
import type { GroupDetailView, GroupStatus } from '@/types'

type Role = 'organizer' | 'joiner'
type RosterSize = 'forming' | 'filling' | 'filled'

const ROLES: Role[] = ['organizer', 'joiner']

/** Which roster each state should render with — everything past filled is a full group. */
const ROSTER_FOR_STATUS: Record<GroupStatus, RosterSize> = {
  forming: 'forming',
  filling: 'filling',
  filled: 'filled',
  quoting: 'filled',
  confirmed: 'filled',
  booked: 'filled',
  closed: 'filled',
}

export interface GroupPreview {
  role: Role
  status: GroupStatus
  group: GroupDetailView
}

function isRole(value: string | undefined): value is Role {
  return ROLES.includes(value as Role)
}

function isStatus(value: string | undefined): value is GroupStatus {
  return value !== undefined && value in ROSTER_FOR_STATUS
}

/**
 * "(You)" and the travellers card follow the viewer, so the roster has to be
 * re-pointed at whichever member the preview is standing in for.
 */
function asViewer(group: GroupDetailView, role: Role): GroupDetailView {
  const members = group.members.map((member) => ({
    ...member,
    is_self: role === 'organizer' ? member.role === 'organizer' : member.user_id === 'user-joiner-001',
  }))
  const selfIndex = members.findIndex((m) => m.is_self)
  const self = members[selfIndex]

  return {
    ...group,
    members,
    viewer_member_ordinal: selfIndex >= 0 ? selfIndex + 1 : 1,
    viewer_travelers: self ? [{ name: self.display_name, is_primary: true }] : group.viewer_travelers,
  }
}

export function readGroupPreview(
  as: string | undefined,
  state: string | undefined,
): GroupPreview | null {
  if (process.env.NODE_ENV !== 'development') return null
  if (!isRole(as) && !isStatus(state)) return null

  const role: Role = isRole(as) ? as : 'joiner'
  const status: GroupStatus = isStatus(state) ? state : 'filling'

  return {
    role,
    status,
    group: asViewer(getMockGroup(role, ROSTER_FOR_STATUS[status]), role),
  }
}
