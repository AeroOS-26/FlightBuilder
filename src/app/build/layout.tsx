/**
 * Layout for the Flight Builder flow.
 *
 * Wraps every /build/* step in the shared BuilderLayout shell (top nav, title,
 * stepper), gates the whole builder, and seeds the signed-in member as the
 * Group Organizer.
 *
 * The guard sits in the layout rather than in each step page deliberately: a
 * new step added later is covered without anyone remembering to protect it.
 * The cost is that the return path is the builder's first step rather than the
 * exact step the visitor was on — a layout is not given the pathname. That is
 * an acceptable trade because the draft itself lives in the store and survives
 * the round trip; only the position in the flow is lost.
 *
 * Reading the member here is what makes `flight_group.created` carry a real
 * organizer instead of empty strings — the Milestone 1 task and one of its
 * acceptance criteria. It belongs on the server: the identity must come from
 * the session, never from anything the browser can set.
 */

import { BuilderLayout } from '@/components/builder'
import { requireVerifiedViewer } from '@/features/auth/server/guard'
import { AUTH_ROUTES } from '@/features/auth/server/routing'
import { findByEmail } from '@/features/auth/server/members'
import type { MemberIdentity } from '@/types'

export default async function BuildLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const viewer = await requireVerifiedViewer(AUTH_ROUTES.home)
  const member = await findByEmail(viewer.email)

  const organizer: MemberIdentity | null = member
    ? {
        // The contract's `acct_` form, which is what `account_id` means on the
        // payload — not the database row id.
        id: member.account_id ?? '',
        name: member.name ?? '',
        email: member.email,
        // Frame 31 now collects this — an optional field beside the "Text me"
        // preference, added 1 Sep at the client's request so the toggle has
        // something behind it. Members who skip the profile, or leave it
        // blank, still send an empty string here and null in the payload,
        // which the contract reads as "we do not have one".
        phone: member.phone ?? '',
      }
    : null

  return <BuilderLayout member={organizer}>{children}</BuilderLayout>
}
