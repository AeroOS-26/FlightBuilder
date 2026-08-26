/**
 * Complete your profile — /complete-profile (frame 31).
 *
 * The one Milestone 1 screen that does not use AuthShell: it runs inside the
 * signed-in site chrome, with the marketing nav above and the FAA footer below.
 * Content is an 804-wide column on the same #EFF1F5 ground as the auth screens.
 *
 * The member's name seeds Traveler 1, exactly as the Flight Builder seeds the
 * organizer. Until the session exists it comes from the query string so the
 * screen is reviewable.
 */

import {
  MemberNav,
  MemberFooter,
  OnboardingStepper,
  CompleteProfileForm,
} from '@/features/onboarding/components'
import { requireVerifiedViewer } from '@/features/auth/server/guard'

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string }>
}) {
  const { name } = await searchParams
  // Protected: an anonymous visitor is sent to sign-in and returned here after.
  const viewer = await requireVerifiedViewer('/complete-profile')
  const memberName = name || viewer.email

  return (
    <div className="flex min-h-screen flex-col bg-[#EFF1F5]">
      <MemberNav name={memberName} email={viewer.email} />

      <main className="flex-1 px-4 py-8 lg:py-[50px]">
        <div className="mx-auto flex w-full max-w-[804px] flex-col gap-[30px]">
          <header className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="rounded-[8px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-3 py-[10px] font-sans text-[12px] font-medium leading-[1.2] tracking-[0.02em] text-[#112D7C]">
                COMPLETE YOUR PROFILE · ONE-TIME SETUP
              </span>
              <h1 className="mt-3 font-heading text-[26px] font-medium leading-[1.2] text-black lg:text-[32px]">
                Let&apos;s get your details sorted.
              </h1>
              <p className="font-sans text-[14px] font-medium leading-[1.4] text-black">
                We&apos;ll save this so you don&apos;t have to re-enter it every time you join a
                flight. You can edit anything anytime in your dashboard.
              </p>
            </div>
            {/* Profile is Step 2 on the frame. This read `current={0}`, so the
                indicator claimed you were still on Account while you filled in
                the Profile screen. */}
            <OnboardingStepper current={1} />
          </header>

          <CompleteProfileForm memberName={memberName} />
        </div>
      </main>

      <MemberFooter />
    </div>
  )
}
