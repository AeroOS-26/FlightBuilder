/**
 * Layout for the Flight Builder flow.
 *
 * Wraps every /build/* step in the shared BuilderLayout shell (top nav, title,
 * stepper). The step content is rendered as `children`, replacing the previous
 * React Router <Outlet />.
 */

import { BuilderLayout } from '@/components/builder'

export default function BuildLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <BuilderLayout>{children}</BuilderLayout>
}
