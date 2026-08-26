/**
 * Reset link sent — /reset-password/sent (frame 37B).
 *
 * Same card object as frame 36 with reset copy and a 60-minute lifetime.
 *
 * CONFIRM: the frame's primary reads "Resend verification link" on what is a
 * password-reset screen. Raised with the client as a copy defect; the frame text
 * is reproduced here verbatim until they confirm, so the fidelity pass matches
 * the file. Expected correction: "Resend reset link".
 */

import { AuthShell, MembershipCard, AuthResultCard, ResendAction } from '@/features/auth/components'
import { PASSWORD_RESET_TTL_MINUTES } from '@/features/auth/config/authConfig'

export default async function ResetLinkSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams
  const address = email || 'margot@example.com'

  return (
    <AuthShell
      contentWidth="card"
      heroTitle="Reset link sent."
      heroSubtitle={`A reset link was sent to your email. Use it within ${PASSWORD_RESET_TTL_MINUTES} minutes.`}
      heroCard={<MembershipCard />}
    >
      <AuthResultCard
        title="Email sent"
        body={
          <>
            We just sent a reset link to <strong className="font-medium">{address}</strong>. The
            link works for the next {PASSWORD_RESET_TTL_MINUTES} minutes.
          </>
        }
        helpTitle="Didn't get the email?"
        helpItems={[
          'Check your spam or promotions folder',
          <>Confirm {address} is correct</>,
        ]}
        primary={
          <ResendAction
            kind="reset"
            email={address}
            label="Resend verification link"
            successMessage={`Reset link sent again to ${address}.`}
          />
        }
        secondary={[{ label: 'Back to log in', href: '/signin' }]}
      />
    </AuthShell>
  )
}
