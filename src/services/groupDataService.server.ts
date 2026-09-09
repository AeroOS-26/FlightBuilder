import 'server-only'

/**
 * Group reads — the server half of the seam.
 *
 * Split from `groupDataService.ts` because that module is imported by a client
 * component (the join screen), and this one reaches the database. Pulling
 * `server-only` code into a shared module would break the client bundle, so the
 * two halves live apart: reads here, the browser-side join there.
 *
 * SETTLED 2026-09-07: groups mirror into our own Neon database. Zoho stays the
 * source of truth and keeps receiving its events, but member-facing reads no
 * longer sit in Zoho's request path — it has no retry and no alerting, which is
 * fine for an event that writes a lead and not fine for a page a member is
 * looking at.
 */

import { getGroupDetail } from '@/features/group/server/groupStore'
import type { GroupDetailView } from '@/types'

/**
 * Full group detail for a member.
 *
 * Throws when the group does not exist. Authorisation is the caller's job — the
 * route checks membership before calling, so a non-member never reaches here.
 */
export async function fetchGroupDetail(
  groupId: string,
  userId: string,
): Promise<GroupDetailView> {
  const group = await getGroupDetail(groupId, userId)
  if (!group) throw new Error(`Group ${groupId} not found`)
  return group
}
