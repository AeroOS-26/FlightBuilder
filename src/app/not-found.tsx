/**
 * 404 — a page that does not exist.
 *
 * This used to `redirect()` to `/build/{FIRST_STEP}`, carried over from the old
 * React Router `path: '*'` fallback. That was harmless while the builder was
 * open, and became a real fault once `/build/*` went behind the auth guard:
 * every unknown URL redirected into the builder, the guard bounced it, and the
 * visitor landed on a sign-in screen.
 *
 * So a mistyped address, a stale bookmark or a link to a page we had not built
 * all became "please sign in" — which is both untrue and, to anyone assessing
 * the product, indistinguishable from the app being broken. The client found it
 * as four routes bouncing to /signin; those routes now exist, but the redirect
 * was the cause and every other missing path had the same problem.
 *
 * A 404 answers honestly and, unlike a redirect, carries the correct status for
 * crawlers and link checkers.
 */

import { ContentPage } from '@/components/common'

export const metadata = { title: 'Page not found · Perro Air' }

export default function NotFound() {
  return (
    <ContentPage
      title="We couldn’t find that page"
      intro="The link may be out of date, or the address slightly off. Nothing is wrong with your account."
    />
  )
}
