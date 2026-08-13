/**
 * Not-found boundary for /share/[token].
 *
 * Rendered when the share page calls `notFound()` for a stale, closed, or
 * unknown token. This is what makes the page answer with a real HTTP 404 while
 * still showing the designed Not-found card — previously the page returned 200
 * with the card, which read as a live page to link checkers and crawlers.
 */

import { PublicPageShell } from '@/features/public-flight/components/PublicPageShell'
import { NotFoundState } from '@/features/public-flight/states/NotFoundState'

export default function ShareNotFound() {
  return (
    <PublicPageShell>
      <NotFoundState />
    </PublicPageShell>
  )
}
