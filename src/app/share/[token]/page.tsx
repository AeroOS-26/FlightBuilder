/**
 * Public share route — /share/[token]
 *
 * The page a share link opens for an anonymous visitor. No login and no auth
 * guard by design.
 *
 * The token is resolved here, on the server, through the same resolver the
 * read-relay uses, for two reasons:
 *  - an unknown / stale / closed token answers with a real HTTP 404 (via
 *    `notFound()` and the sibling not-found.tsx) instead of a 200 carrying a
 *    "not found" card, which read as a live page to link checkers and crawlers;
 *  - a resolved flight is handed to the client page as seed data, so the page
 *    renders immediately and the browser does not repeat the upstream read.
 *
 * On an upstream error we deliberately render without seed data and let the
 * client query fetch and own its retry state, rather than failing the page.
 */

import { notFound } from 'next/navigation'
import { PublicFlightPage } from '@/features/public-flight/PublicFlightPage'
import { resolvePublicFlight } from '@/features/public-flight/data/resolvePublicFlight'
import type { PublicFlightResult } from '@/types'

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const resolved = await resolvePublicFlight(token)

  if (resolved.status === 'not_found') {
    notFound()
  }

  const initialData: PublicFlightResult | undefined =
    resolved.status === 'ok' ? { status: 'ok', flight: resolved.flight } : undefined

  return <PublicFlightPage token={token} initialData={initialData} />
}
