/**
 * Where a viewer belongs — the single place that decides.
 *
 * Deliberately **not** `server-only`, unlike its neighbours in this folder:
 * every function here is pure, and `SignInForm` (a Client Component) needs
 * `safeInternalPath` too. The `Viewer` import is type-only, so nothing from the
 * server guard is pulled into a client bundle.
 *
 * Before this existed the decision was scattered: `/` redirected straight into
 * the Flight Builder with no session check at all, and `SignInForm` hard-coded
 * `/complete-profile` as its landing page. Two places, no shared rule, and the
 * builder reachable by anyone. Everything that needs to answer "where does this
 * person go now" calls `entryFor` instead, so the answer cannot drift.
 *
 * ── The flow, as the frames define it ────────────────────────────────────────
 *
 *   no session          → sign in (frame 30)
 *   signed in, unverified → verification sent (frame 36), which offers Resend
 *   signed in, verified   → the Flight Builder
 *
 * **Profile completion is deliberately NOT a gate.** It reads like one — the
 * onboarding stepper is Account → Profile → Join Flight — but the frames say
 * otherwise, and the frames win. On frame 35 "Create Your Own Shared Flight" is
 * the *primary* action and "Complete your profile first" is the secondary, and
 * frame 31 itself carries "Skip for now". A member who skips must not be pushed
 * back into the screen they just skipped.
 *
 * `/welcome` (frame 35) is not an entry destination. It is the one-time screen
 * the verification link lands on, and it deliberately has no guard: a person
 * clicking a link from their inbox may be in a browser with no session at all.
 */

import { FIRST_STEP } from '@/features/flight-builder/config/steps'
import type { Viewer } from './guard'

export const AUTH_ROUTES = {
  signIn: '/signin',
  signUp: '/signup',
  verifyEmail: '/verify-email',
  completeProfile: '/complete-profile',
  /** Where a fully-admitted member lands. Milestone 2 replaces this with the
   *  member dashboard; until that exists, the builder is the member surface. */
  home: `/build/${FIRST_STEP}`,
} as const

/**
 * The destination for a viewer, or for an anonymous visitor when null.
 *
 * Pure so the rule can be read and reasoned about in one place — the caller
 * fetches the viewer and performs the redirect.
 */
export function entryFor(viewer: Viewer | null): string {
  if (!viewer) return AUTH_ROUTES.signIn
  if (!viewer.emailVerified) {
    // Frame 36 names the address it sent to, so carry it.
    return `${AUTH_ROUTES.verifyEmail}?email=${encodeURIComponent(viewer.email)}`
  }
  return AUTH_ROUTES.home
}

/**
 * Honour a `?callbackUrl=` only when it is a path on this site.
 *
 * The parameter is attacker-controllable and ends up in a redirect, so an
 * absolute URL would turn sign-in into an open redirect — a good phishing
 * primitive, because the victim genuinely is on our domain when they click.
 * `//evil.com` is rejected too: it is protocol-relative, so the browser reads
 * it as another origin despite the leading slash.
 */
export function safeInternalPath(
  candidate: string | undefined | null,
  fallback: string,
): string {
  if (!candidate) return fallback
  if (!candidate.startsWith('/')) return fallback
  if (candidate.startsWith('//')) return fallback
  return candidate
}

/**
 * True for paths a signed-out visitor is allowed to reach.
 *
 * `/share/[token]` is the anonymous role in the permission model — the public
 * Join Page an invite link opens. It is live and accepted, and gating it would
 * break the funnel it exists to serve.
 */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/share/') ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/magic-link') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/welcome')
  )
}
