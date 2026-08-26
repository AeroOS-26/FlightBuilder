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
import { findByEmail } from '@/features/auth/server/members'
import { formatStampUtc } from '@/utils/stamp'

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; accountId?: string }>
}) {
  const { name, accountId } = await searchParams
  const viewer = await currentViewer()

  // The verification timestamp is real, read from the member. It used to be a
  // fixed string lifted from the frame, which read as live data and was months
  // out of date. Only fetched when there is a viewer — the fallbacks below are
  // for design review, where no member exists to time-stamp.
  const member = viewer ? await findByEmail(viewer.email) : null
  const verifiedAt = member?.emailVerified ?? null

  /**
   * The identity card is shown only when there is an identity to show.
   *
   * This page deliberately has no auth guard — the verification link can land
   * in a browser with no session, and it must still render. But an anonymous
   * visitor was being shown "John Doe · acct_5001 · Verified", which is a
   * stranger's screen asserting a verified account that does not exist. It is
   * the same defect the client reported, reached by opening /welcome directly
   * instead of through the link.
   *
   * `?name=` and `?accountId=` still drive it, so the frame stays reviewable
   * without a session; what is gone is the invented default.
   */
  const identity =
    viewer?.email || name || viewer?.accountId || accountId
      ? {
          label: viewer?.email ?? name ?? '',
          accountId: viewer?.accountId ?? accountId ?? '',
        }
      : null

  return (
    <AuthShell
      contentWidth="card"
      heroTitle="You're in."
      // Frames 35 and 38B stack the status card under the copy.
      heroCardBelow
      heroSubtitle="Email verified. Your Flight Club account is active and your member ID is locked in."
      heroCard={
        identity && (
        <HeroStatusCard>
          {/* The id is the row's trailing element, not a second item beside the
              name: on the frame it sits hard right at x=354 of a 370 row, while
              the name starts at x=70. Passed as a child it rendered flush
              against the name instead. */}
          <HeroStatusRow
            trailing={
              <span className="shrink-0 font-sans text-[12px] font-normal text-white">
                ID: {identity.accountId}
              </span>
            }
          >
            <span className="truncate font-sans text-[16px] font-semibold">
              {identity.label}
            </span>
          </HeroStatusRow>
          <HeroStatusRow trailing={<VerifiedPill />}>
            {/* Empty rather than a placeholder date when there is no member to
                time-stamp: a fixed date here is what the client reported, and
                the word "Verified" beside the Verified pill read as a stutter. */}
            <span className="font-sans text-[12px] font-normal">
              {verifiedAt ? formatStampUtc(verifiedAt) : ''}
            </span>
          </HeroStatusRow>
        </HeroStatusCard>
        )
      }
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
