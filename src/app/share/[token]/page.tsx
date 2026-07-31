/**
 * Public share route — /share/[token]
 *
 * The page a share link opens for an anonymous visitor. No login and no auth
 * guard by design. This thin route resolves the token param and hands off to
 * the client page, which reads the public-safe view via the relay and renders
 * the matching state.
 */

import { PublicFlightPage } from '@/features/public-flight/PublicFlightPage'

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <PublicFlightPage token={token} />
}
