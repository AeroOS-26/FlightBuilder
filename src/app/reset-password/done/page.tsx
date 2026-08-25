/**
 * Password updated — /reset-password/done (frame 38B).
 *
 * Per the reissued file the two password fields are gone — the password is
 * already saved by the time this renders — and the browse link with them.
 * "Go to My Dashboard" is the main action.
 *
 * Unlike 34/35/36/37B this sits in the 406 form column inside the same white
 * card frame 38 uses, not the wider result card.
 */

import {
  AuthShell,
  HeroStatusCard,
  HeroStatusRow,
  VerifiedPill,
} from '@/features/auth/components'

export default async function PasswordUpdatedPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const { email } = await searchParams
  const address = email || 'margot@example.com'

  return (
    <AuthShell
      heroHeightMobile={607}
      heroTitle={
        <>
          You&apos;re
          <br />
          back in.
        </>
      }
      heroSubtitle="Your password is set and you're signed in. Pick up where you left off or jump back into the dashboard."
      heroCard={
        <HeroStatusCard>
          <HeroStatusRow trailing={<VerifiedPill />}>
            <span className="font-sans text-[14px] font-medium">{address}</span>
          </HeroStatusRow>
          <p className="font-sans text-[12px] font-normal text-white">
            Password Updated at 2026-06-25 11:42 UTC
          </p>
        </HeroStatusCard>
      }
      activeDot={3}
    >
      <div className="flex w-full flex-col gap-6 rounded-[20px] border border-black/10 bg-white p-6">
        <header className="flex flex-col gap-[6px]">
          <h1 className="font-heading text-[24px] font-medium leading-[1.21] text-black">
            Password updated
          </h1>
          <p className="font-sans text-[14px] font-normal leading-[1.3] text-black">
            Your new password is saved. Use it next time you sign in. Other devices will stay
            signed in.
          </p>
        </header>

        <div className="flex flex-col items-center gap-[18px]">
          <a
            href="/dashboard"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-black px-[14px] py-[10px] font-sans text-[14px] font-medium leading-[1.14] text-white transition-colors hover:bg-[#101114]"
          >
            Go to My Dashboard
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" aria-hidden="true">
              <path
                d="M5 12h14m0 0-5-5m5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <p className="text-center font-sans text-[12px] font-medium text-black">or</p>
          <p className="flex flex-wrap items-center justify-center gap-1 font-sans text-[14px] leading-[1.14]">
            <span className="font-normal text-[#7D7B7B]">{address} is Not you?</span>
            <a href="/signin" className="font-semibold text-[#0A1B49]">
              Sign out
            </a>
          </p>
        </div>
      </div>
    </AuthShell>
  )
}
