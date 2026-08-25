/**
 * Layout for the Flight Builder flow.
 *
 * Wraps every /build/* step in the shared BuilderLayout shell (top nav, title,
 * stepper), and is where the whole builder is gated.
 *
 * The guard sits in the layout rather than in each step page deliberately: a
 * new step added later is covered without anyone remembering to protect it.
 * The cost is that the return path is the builder's first step rather than the
 * exact step the visitor was on — a layout is not given the pathname. That is
 * an acceptable trade because the draft itself lives in the store and survives
 * the round trip; only the position in the flow is lost.
 */

import { BuilderLayout } from '@/components/builder'
import { requireVerifiedViewer } from '@/features/auth/server/guard'
import { AUTH_ROUTES } from '@/features/auth/server/routing'

export default async function BuildLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireVerifiedViewer(AUTH_ROUTES.home)
  return <BuilderLayout>{children}</BuilderLayout>
}
