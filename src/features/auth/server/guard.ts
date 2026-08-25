import 'server-only'

/**
 * The permission model, enforced server-side.
 *
 * The rule from the Phase One scope: *authorisation is enforced on the server,
 * on every read and every write, never by hiding elements in the UI. A member
 * changing an id in a URL must be refused by the endpoint, not merely shown a
 * different screen.*
 *
 * Every later milestone builds on these four helpers rather than re-deriving
 * the rule, which is why they live here and not inside a route.
 *
 * The four roles:
 *   anonymous  the public share page only, limited to the public-safe view
 *   member     their own dashboard, profile, pets, alerts and saved searches
 *   organizer  everything a joiner sees, plus cancelling before a quote
 *   joiner     the joiner view of a group they joined, plus leaving it
 *
 * Organizer and joiner are per-group, so they are resolved against a group id
 * rather than stored on the member — a member is an organizer of one group and
 * a joiner of another at the same time.
 */

import { redirect } from 'next/navigation'
import { auth } from './auth'

export interface Viewer {
  id: string
  email: string
  accountId: string | null
  emailVerified: boolean
}

/** The signed-in member, or null. Never throws. */
export async function currentViewer(): Promise<Viewer | null> {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) return null
  return {
    id: session.user.id,
    email: session.user.email,
    accountId: session.user.accountId ?? null,
    emailVerified: Boolean(session.user.isEmailVerified),
  }
}

/**
 * Require a signed-in member in a page or layout. Sends an anonymous visitor to
 * sign-in and returns them afterwards, which is the M1 acceptance criterion.
 */
export async function requireViewer(returnTo?: string): Promise<Viewer> {
  const viewer = await currentViewer()
  if (!viewer) {
    const target = returnTo ? `?callbackUrl=${encodeURIComponent(returnTo)}` : ''
    redirect(`/signin${target}`)
  }
  return viewer
}

/**
 * Require a signed-in member whose email is verified.
 *
 * Use this on member surfaces rather than `requireViewer`. Verification is the
 * moment a member becomes real to the rest of the system — it is when
 * `account.created` fires — so a surface that treats an unverified member as
 * admitted contradicts the event we send the CRM.
 *
 * It also closes a bypass: `requireViewer` alone would let an unverified member
 * reach a guarded page through `?callbackUrl=`, since sign-in itself does not
 * check verification. A gate that a redirect parameter can walk around is not a
 * gate.
 *
 * Unverified members land on frame 36, which offers Resend — a dead end with a
 * way out, rather than a refusal.
 *
 * If the client would rather let unverified members in, this is the one
 * function to relax; nothing else checks the flag.
 */
export async function requireVerifiedViewer(returnTo?: string): Promise<Viewer> {
  const viewer = await requireViewer(returnTo)
  if (!viewer.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(viewer.email)}`)
  }
  return viewer
}

/**
 * Require a signed-in member in a route handler. Returns a 401 response rather
 * than redirecting, so `fetch` callers get a status they can act on.
 *
 *   const viewer = await requireViewerOrUnauthorized()
 *   if (viewer instanceof Response) return viewer
 */
export async function requireViewerOrUnauthorized(): Promise<Viewer | Response> {
  const viewer = await currentViewer()
  if (!viewer) {
    return Response.json({ message: 'Sign in to continue.' }, { status: 401 })
  }
  return viewer
}

/**
 * Guard a member-scoped record.
 *
 * Pass the owner id the record actually carries — read from the database, never
 * from the request. Returns false when it is not the viewer's, and the caller
 * answers 404 rather than 403: a member should not learn that someone else's
 * record exists.
 */
export function ownsRecord(viewer: Viewer, ownerId: string | number): boolean {
  return String(ownerId) === viewer.id
}
