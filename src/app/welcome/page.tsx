/**
 * Email verified — /welcome (frame 35).
 *
 * Per the reissued file the browse button is gone and "Create Your Own Shared
 * Flight" is the main action, with "Complete your profile first" as the
 * secondary. The subtitle changed with it.
 *
 * The hero carries the member status card rather than the membership card: the
 * name, the issued member ID, the timestamp and a Verified pill.
 *
 * The id shown is the ACCOUNT id, in the payload contract's form (acct_5001) —
 * the same value that goes out as `account_id` on every member object. The
 * frame draws a bare digit string, which the client has confirmed is the screen
 * being wrong; the contract wins. It is read from the session, so a signed-in
 * member sees their own; the fallback is for design review only.
 */

import {
  AuthShell,
  AuthResultCard,
  HeroStatusCard,
  HeroStatusRow,
  VerifiedPill,
} from '@/features/auth/components'
import { currentViewer } from '@/features/auth/server/guard'

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; accountId?: string }>
}) {
  const { name, accountId } = await searchParams
  const viewer = await currentViewer()

  return (
    <AuthShell
      contentWidth="card"
      heroTitle="You're in."
      heroSubtitle="Email verified. Your Flight Club account is active and your member ID is locked in."
      heroCard={
        <HeroStatusCard>
          <HeroStatusRow>
            <span className="font-sans text-[16px] font-semibold">
              {viewer?.email ?? name ?? 'John Doe'}
            </span>
            <span className="font-sans text-[12px] font-normal">
              ID: {viewer?.accountId ?? accountId ?? 'acct_5001'}
            </span>
          </HeroStatusRow>
          <HeroStatusRow trailing={<VerifiedPill />}>
            <span className="font-sans text-[12px] font-normal">2026-05-17 09:14 UTC</span>
          </HeroStatusRow>
        </HeroStatusCard>
      }
      activeDot={3}
    >
      <AuthResultCard
        title="Welcome to Flight Club."
        body="You're a free member. No paid tier, no commitment. Start your own flight and invite others to join."
        primary={
          <a
            href="/build/route"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-black px-[14px] py-[10px] font-sans text-[14px] font-medium leading-[1.14] text-white transition-colors hover:bg-[#101114]"
          >
            Create Your Own Shared Flight
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
        }
        actionsDivider={
          <p className="text-center font-sans text-[12px] font-medium text-black">or</p>
        }
        secondary={[{ label: 'Complete your profile first', href: '/complete-profile' }]}
        footnote={
          <div className="flex flex-col items-center gap-5">
            <p className="text-center font-sans text-[14px] font-normal leading-[1.3] text-[#242424]">
              Adding your travelers and pets now makes joining future flights one tap.
            </p>
            <p className="text-center font-sans text-[12px] font-normal tracking-[0.04em] text-[#112D7C]">
              MEMBERSHIP IS FREE FOREVER · NO PAID TIER · NO POINTS
            </p>
          </div>
        }
      />
    </AuthShell>
  )
}
