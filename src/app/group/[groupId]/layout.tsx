/**
 * Layout for group detail pages (/group/[groupId]).
 *
 * Enforces authorization server-side:
 * - Require verified member
 * - Verify membership in this specific group
 * - Return 404 if member is not in group
 *
 * Also supplies the signed-in site chrome the Figma frames sit inside: the
 * member nav and the regulatory footer.
 */

import { notFound } from 'next/navigation'
import { requireVerifiedViewer, getMembership } from '@/features/auth/server/guard'
import { auth } from '@/features/auth/server/auth'
import { MemberNav } from '@/features/onboarding/components/MemberNav'
import { BrokerDisclosureFooter } from '@/components/common'

interface GroupLayoutProps {
  children: React.ReactNode
  params: Promise<{
    groupId: string
  }>
}

export default async function GroupLayout({ children, params }: GroupLayoutProps) {
  const { groupId } = await params

  // Guard 1: Require verified member
  const viewer = await requireVerifiedViewer(`/group/${groupId}`)

  // Guard 2: Verify membership in this group.
  //
  // 404 rather than 403, so the route does not confirm a group exists to
  // someone with no business knowing. Enforced here on the server — changing an
  // id in the URL has to be refused by the route, not merely render a different
  // screen.
  const membership = await getMembership(groupId, viewer.id)
  if (!membership) {
    notFound()
  }

  const session = await auth()
  const displayName = session?.user?.name ?? viewer.email

  return (
    <div className="flex min-h-svh flex-col bg-[#F8F8F8]">
      <MemberNav name={displayName} email={viewer.email} />

      <main className="flex-1">{children}</main>

      <BrokerDisclosureFooter />
    </div>
  )
}
