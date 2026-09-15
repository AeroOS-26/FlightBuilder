/**
 * Public share route — /share/[token]
 *
 * The page a share link opens. **Still no auth guard**, by design: an anonymous
 * visitor sees the same public-safe page as always, and gating this route would
 * break the funnel it exists to serve.
 *
 * What is new is that the page now asks a second question — *who is looking* —
 * and hands the answer to the client page:
 *
 *  - **Anonymous** → unchanged. The lead form, per the client's 2026-07-30
 *    decision that the public page shows "Save your spot" rather than a
 *    "Join This Flight / Sign in or create account" button.
 *  - **Signed in, already in this group** → redirected to their group page.
 *    They have nothing to join, and re-rendering the join form for a group they
 *    are already in reads as a bug.
 *  - **Signed in, not a member** → the join flow (frames 40 → 41 / 41B), which
 *    is M2's deliverable and was previously unreachable in a browser.
 *
 * The session is read here rather than in the client page because there is no
 * SessionProvider mounted; the server is the only place that knows.
 *
 * Being signed in is the exact condition, not being *verified*: the join
 * endpoint gates on `requireViewerOrUnauthorized`, which accepts any session.
 * Branching on anything stricter would show a screen the endpoint then refuses.
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
 *
 * `?preview=1` forces the anonymous branch regardless of session. This is the
 * organiser's "see what strangers see" link on the group page (Chuck,
 * 2026-09-11): it must be the true public view, not the member view with a
 * different header, and a signed-in member is normally redirected away from
 * this exact route before that view ever renders. The flag skips the
 * membership lookup and redirect entirely rather than rendering the member
 * branch and hiding parts of it, so there is one code path that produces the
 * public view and it is the same one an anonymous visitor gets. It grants no
 * extra access — the response is already public-safe regardless of session —
 * so it is harmless in anyone else's hands too.
 */

import { notFound, redirect } from 'next/navigation'
import { PublicFlightPage } from '@/features/public-flight/PublicFlightPage'
import type { ShareViewer } from '@/features/public-flight/PublicFlightPage'
import { resolvePublicFlight } from '@/features/public-flight/data/resolvePublicFlight'
import { currentViewer, getMembership } from '@/features/auth/server/guard'
import { getProfile } from '@/features/auth/server/profile'
import type { PublicFlightResult } from '@/types'

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ preview?: string }>
}) {
  const { token } = await params
  const { preview } = await searchParams
  const isPreview = preview === '1'
  const resolved = await resolvePublicFlight(token)

  if (resolved.status === 'not_found') {
    notFound()
  }

  const initialData: PublicFlightResult | undefined =
    resolved.status === 'ok' ? { status: 'ok', flight: resolved.flight } : undefined

  const viewer = isPreview ? null : await currentViewer()

  // Anonymous, or the upstream read failed. Either way there is nobody to scope
  // a join to, so the page renders exactly as it did before.
  let shareViewer: ShareViewer | undefined

  if (viewer && resolved.status === 'ok') {
    const groupId = resolved.flight.group_id

    // Already in this group. Send them where their membership actually lives
    // rather than offering to seat them again. This also covers the organiser
    // clicking their own share link, which is the common case.
    if (await getMembership(groupId, viewer.id)) {
      redirect(`/group/${encodeURIComponent(groupId)}`)
    }

    // Frame 40 shows "Pulled from your profile", so seed it from there. An
    // empty list is passed as undefined, not as [], so the screen falls back to
    // its own blank first traveller rather than rendering a party of nobody.
    const profile = await getProfile(viewer.id)
    shareViewer = {
      id: viewer.id,
      email: viewer.email,
      travelers: profile?.travelers?.length ? profile.travelers : undefined,
      pets: profile?.pets?.length ? profile.pets : undefined,
    }
  }

  return (
    <PublicFlightPage token={token} initialData={initialData} viewer={shareViewer} />
  )
}
