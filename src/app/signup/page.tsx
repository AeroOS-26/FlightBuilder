/**
 * Create account — /signup (frame 33).
 *
 * The frame carries the taken-email error, so `?error=email-exists` renders it;
 * the bare route is the same screen in its clean state. Once auth is wired the
 * same param carries the real failure back from the register call.
 *
 * The hero line differs from sign-in: 30B and 33 read "Create your account."
 * while 30 keeps "Sign in to continue.". The subtitle is shared.
 */

import { redirect } from 'next/navigation'
import { AuthShell, MembershipCard, SignUpForm } from '@/features/auth/components'
import type { SignUpError } from '@/features/auth/components'
import { currentViewer } from '@/features/auth/server/guard'
import { entryFor } from '@/features/auth/server/routing'

const ERROR_BY_PARAM: Record<string, SignUpError> = {
  'email-exists': 'email-exists',
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  // Someone with a session has no business on "create an account".
  const viewer = await currentViewer()
  if (viewer) redirect(entryFor(viewer))

  return (
    <AuthShell
      // 30B and 33 changed the hero line; 30 still reads "Sign in to continue."
      // The trailing full stop is part of the copy, as on every other hero.
      heroTitle="Create your account."
      heroSubtitle="One membership for all. Create and manage shared flights and pets."
      heroCard={<MembershipCard />}
      footerNote={
        <span className="text-black">
          By creating an account, you agree to our{' '}
          <a href="/terms" className="underline underline-offset-2">
            Terms of Service
          </a>{' '}
          &amp;{' '}
          <a href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </a>
          .
        </span>
      }
    >
      <SignUpForm error={(error && ERROR_BY_PARAM[error]) || 'none'} />
    </AuthShell>
  )
}
