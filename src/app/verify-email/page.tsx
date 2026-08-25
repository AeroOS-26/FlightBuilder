/**
 * Email verification sent — /verify-email (frame 36).
 *
 * Reached after account creation. The 24-hour lifetime is rendered from
 * EMAIL_VERIFICATION_TTL_MINUTES rather than typed into the copy, so the
 * sentence and the token rule cannot drift apart.
 *
 * The client has confirmed this frame is also the model for screen 34, so the
 * card here is the one to reuse when the magic-link screen is reissued.
 */

import { AuthShell, MembershipCard, AuthResultCard, ResendAction } from '@/features/auth/components'
import { EMAIL_VERIFICATION_TTL_MINUTES } from '@/features/auth/config/authConfig'

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams
  const address = email || 'margot@example.com'
  const hours = Math.round(EMAIL_VERIFICATION_TTL_MINUTES / 60)

  return (
    <AuthShell
      heroHeightMobile={607}
      contentWidth="card"
      heroTitle="Verify your email."
      heroSubtitle="A verification link was sent to your email. Click to activate your account."
      heroCard={<MembershipCard />}
      activeDot={1}
    >
      <AuthResultCard
        title="Email sent"
        body={
          <>
            We just sent a verification link to <strong className="font-medium">{address}</strong>.
            The link works for the next {hours} hours.
          </>
        }
        helpTitle="Didn't get the email?"
        helpItems={[
          'Check your spam or promotions folder',
          <>Confirm {address} is correct</>,
        ]}
        primary={
          <ResendAction
            kind="verification"
            email={address}
            label="Resend verification link"
            successMessage={`Verification link sent again to ${address}.`}
          />
        }
        secondary={[{ label: 'Use a different email', href: '/signup' }]}
      />
    </AuthShell>
  )
}
