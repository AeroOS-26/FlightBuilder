/**
 * Reset your password — /reset-password (frame 37).
 *
 * The 60-minute lifetime on the hero is rendered from
 * PASSWORD_RESET_TTL_MINUTES, not typed into the string.
 */

import { AuthShell, MembershipCard, ResetRequestForm } from '@/features/auth/components'
import { PASSWORD_RESET_TTL_MINUTES } from '@/features/auth/config/authConfig'

export default function ResetPasswordPage() {
  return (
    <AuthShell
      heroTitle="Reset your password."
      heroSubtitle={`Enter your email for a new password link. Valid for ${PASSWORD_RESET_TTL_MINUTES} minutes.`}
      heroCard={<MembershipCard />}
      footerNote={
        <span className="text-black">
          {/* Was "By creating an account…", reused from sign-up. Nobody is
              creating an account on a password-reset screen. */}
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
      <ResetRequestForm />
    </AuthShell>
  )
}
