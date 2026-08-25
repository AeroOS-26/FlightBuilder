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

export function VerifiedPill() {
  return (
    <span className="inline-flex h-5 items-center gap-1 rounded-full bg-[#109A51] pl-[3px] pr-[13px] font-sans text-[12px] font-medium text-white">
      <svg viewBox="0 0 24 24" width={13} height={13} fill="none" aria-hidden="true">
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
    <div className="flex items-center justify-between gap-[6px]">
      <span className="flex items-center gap-[6px] text-white">{children}</span>
      {trailing}
    </div>
  )
}
