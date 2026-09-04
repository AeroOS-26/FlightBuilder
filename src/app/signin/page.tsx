/**
 * Sign in — /signin (frame 30, with frame 32's error variants).
 *
 * The `?error=` param renders the frame-32 variants without a separate route,
 * so the states are reviewable against the hi-fi before the auth layer exists:
 *   /signin                        frame 30
 *   /signin?error=not-found        frame 32 · Account Not Found
 *   /signin?error=wrong-password   frame 32 · Wrong Password
 *
 * Once Auth.js is wired the same param carries the real failure reason back
 * from the callback, so this is the shape it keeps rather than scaffolding.
 */

import { redirect } from 'next/navigation'
import { AuthShell, MembershipCard, SignInForm } from '@/features/auth/components'
import type { LoginError } from '@/features/auth/components'
import { currentViewer } from '@/features/auth/server/guard'
import { entryFor, safeInternalPath } from '@/features/auth/server/routing'
import { MAGIC_LINK_TTL_MINUTES } from '@/features/auth/config/authConfig'

/** Reasons that belong on a field, as frame 32's variants. */
const ERROR_BY_PARAM: Record<string, LoginError> = {
  'not-found': 'account-not-found',
  'wrong-password': 'wrong-password',
  locked: 'account-locked',
  'no-password': 'no-password',
}

/**
 * Reasons that belong to the page rather than to a field.
 *
 * A link that has been used or has expired is not a mistake in what someone
 * typed, so it has no field to attach to. Without these the redirect landed on
 * an ordinary sign-in form carrying `?error=invalid-link` in the URL and saying
 * nothing at all — the person is simply told to sign in again, with no idea
 * their link was the problem.
 *
 * The expiry figure comes from the same constant the emails and frame 34 use,
 * so the three cannot drift.
 */
const NOTICE_BY_PARAM: Record<string, string> = {
  'invalid-link':
    'That sign-in link has already been used. Links work once — request a new one below.',
  'link-expired': `That sign-in link has expired. Links last ${MAGIC_LINK_TTL_MINUTES} minutes — request a new one below.`,
  'link-email-invalid': 'Enter a valid email address and we’ll send you a sign-in link.',
  'service-unavailable':
    'We couldn’t reach our systems just then. Please try again in a moment.',
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string; callbackUrl?: string }>
}) {
  const { error, code, callbackUrl } = await searchParams

  // Already signed in — send them on rather than showing a form they do not
  // need. An unverified member goes to frame 36, not into the app.
  const viewer = await currentViewer()
  if (viewer) redirect(safeInternalPath(callbackUrl, entryFor(viewer)))

  // A real failure arrives as ?error=CredentialsSignin&code=wrong-password —
  // Auth.js puts our tag in `code`. The bare ?error= form is kept because the
  // design-review URLs use it.
  const reason = code || error

  return (
    <AuthShell
      heroTitle="Sign in to continue."
      heroSubtitle="One membership for all. Create and manage shared flights and pets."
      heroCard={<MembershipCard />}
      footerNote={
        <span className="inline-flex items-center gap-1">
          <span className="text-black/70">Trouble signing in?</span>
          <a href="/magic-link" className="font-medium text-black underline underline-offset-2">
            Use sign in link
          </a>
        </span>
      }
    >
      <SignInForm
        error={(reason && ERROR_BY_PARAM[reason]) || 'none'}
        notice={(reason && NOTICE_BY_PARAM[reason]) || undefined}
        callbackUrl={callbackUrl}
      />
    </AuthShell>
  )
}
