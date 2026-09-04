/**
 * Get a sign-in link — /magic-link.
 *
 * Linked from sign-in's "Trouble signing in? Use sign in link" and never built,
 * so that link bounced back to the screen it came from. The 15-minute lifetime
 * comes from MAGIC_LINK_TTL_MINUTES rather than being typed here, so the hero,
 * frame 34 and the token itself cannot disagree.
 */

import { redirect } from 'next/navigation'
import { AuthShell, MembershipCard, MagicLinkRequestForm } from '@/features/auth/components'
import { MAGIC_LINK_TTL_MINUTES } from '@/features/auth/config/authConfig'
import { currentViewer } from '@/features/auth/server/guard'
import { entryFor } from '@/features/auth/server/routing'

export default async function MagicLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams

  // Already signed in: sending a link to someone who is here would be odd.
  const viewer = await currentViewer()
  if (viewer) redirect(entryFor(viewer))

  return (
    <AuthShell
      heroTitle="Sign in without a password."
      heroSubtitle={`We'll email you a link. It signs you straight in and lasts ${MAGIC_LINK_TTL_MINUTES} minutes.`}
      heroCard={<MembershipCard />}
      footerNote={
        <span className="text-black">
          By continuing, you agree to our{' '}
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
      <MagicLinkRequestForm initialEmail={email ?? ''} />
    </AuthShell>
  )
}
