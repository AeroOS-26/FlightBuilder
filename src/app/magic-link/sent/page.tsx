/**
 * Sign-in link sent — /magic-link/sent (frame 34).
 *
 * Per the reissued file the primary is "Resend sign-in link" with reset as a
 * text link beneath it, and the two secondaries share a row. The 15-minute
 * lifetime is rendered from MAGIC_LINK_TTL_MINUTES, and appears twice on this
 * frame — in the body and again in the red footnote.
 */

import {
  AuthShell,
  MembershipCard,
  AuthResultCard,
  ResendAction,
} from '@/features/auth/components'
import { MAGIC_LINK_TTL_MINUTES } from '@/features/auth/config/authConfig'

export default async function MagicLinkSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams
  const address = email || 'you@example.com'

  return (
    <AuthShell
      contentWidth="card"
      heroTitle="Sign-in link sent."
      heroSubtitle={`Check your inbox. The link signs you straight in and expires in ${MAGIC_LINK_TTL_MINUTES} minutes.`}
      heroCard={<MembershipCard />}
    >
      <AuthResultCard
        badge="mail"
        title="Sign-in link sent."
        body={
          <>
            We just sent a magic link to <strong className="font-medium">{address}</strong>. The
            link works for the next {MAGIC_LINK_TTL_MINUTES} minutes.
          </>
        }
        helpTitle="Didn't get the email?"
        helpItems={[
          'Check your spam or promotions folder',
          <>Confirm {address} is correct</>,
          'Try resending the link',
        ]}
        primary={
          <ResendAction
            kind="verification"
            email={address}
            label="Resend sign-in link"
            successMessage={`Sign-in link sent again to ${address}.`}
          />
        }
        primaryLink={{ label: 'Reset your password', href: '/reset-password' }}
        secondary={[
          { label: 'Use a different email', href: '/signin' },
          { label: 'Back to login', href: '/signin' },
        ]}
        footnote={
          <p className="text-center font-sans text-[14px] font-normal leading-[1.3] text-[#E1333A]">
            Magic link expires in {MAGIC_LINK_TTL_MINUTES} minutes, works on any device
          </p>
        }
      />
    </AuthShell>
  )
}
