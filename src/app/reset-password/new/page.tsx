/**
 * Set a new password — /reset-password/new (frame 38).
 *
 * The screen the reset link opens. The token and address arrive as params on the
 * link built by /api/reset-password; the token is redeemed server-side on submit
 * and is single-use. When opened without them (design review) the
 * address is passed through for review.
 */

import { AuthShell, MembershipCard, SetNewPasswordForm } from '@/features/auth/components'

export default async function SetNewPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>
}) {
  const { email, token } = await searchParams

  return (
    <AuthShell
      heroTitle="Set a new password."
      heroSubtitle="Pick something you'll remember. We'll sign you in as soon as it's set."
      heroCard={<MembershipCard />}
    >
      <SetNewPasswordForm email={email} token={token} />
    </AuthShell>
  )
}
