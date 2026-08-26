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

const ERROR_BY_PARAM: Record<string, LoginError> = {
  'not-found': 'account-not-found',
  'wrong-password': 'wrong-password',
  locked: 'account-locked',
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
        callbackUrl={callbackUrl}
      />
    </AuthShell>
  )
}
