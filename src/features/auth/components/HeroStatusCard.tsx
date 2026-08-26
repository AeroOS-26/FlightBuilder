/**
 * The hero card on frames 35 and 38B.
 *
 * Where 30 and 33 carry the membership card, these two carry a status card:
 * the account it refers to, a timestamp, and a green Verified pill. Same
 * treatment on both — 402 wide, 16 padding, white/10 on a white/30 hairline,
 * radius 12 — so it is one component with the rows passed in.
 *
 * The frames differ only in row order: 35 leads with the member name and ID and
 * puts the timestamp beside the pill; 38B leads with the email beside the pill
 * and puts the timestamp underneath.
 */

import type { ReactNode } from 'react'

/**
 * Measured from the `Status - Web & mobile` instance on frames 35 and 38B:
 * 68×20, radius 36, 3 left padding, 2 gap, a 15px check, and 10px label.
 * 3 + 15 + 2 + 35 + 13 = 68, which is where the right padding comes from.
 */
export function VerifiedPill() {
  return (
    <span className="inline-flex h-5 items-center gap-[2px] rounded-full bg-[#109A51] pl-[3px] pr-[13px] font-sans text-[10px] font-medium leading-none text-white">
      <svg viewBox="0 0 24 24" width={15} height={15} fill="none" aria-hidden="true">
        <path
          d="m5 12.5 4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Verified
    </span>
  )
}

export function HeroStatusCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full max-w-[402px] flex-col gap-[6px] rounded-[12px] border border-white/30 bg-white/10 p-4">
      {children}
    </div>
  )
}

/** A row inside the card: content left, an optional element hard right. */
export function HeroStatusRow({
  children,
  trailing,
}: {
  children: ReactNode
  trailing?: ReactNode
}) {
  return (
    // leading-[1.21] matches the file's line heights (19.36 on the 16px name,
    // ~17 on the 14px address). Without it the inherited 1.5 made row one 24
    // tall against the frame's 19, and the card 84 against 77.
    <div className="flex items-center justify-between gap-[6px] leading-[1.21]">
      <span className="flex items-center gap-[6px] text-white">{children}</span>
      {trailing}
    </div>
  )
}
