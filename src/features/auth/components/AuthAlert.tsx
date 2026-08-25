/**
 * The inline alert card — frame 32 Variant 3 (Account Locked).
 *
 * This variant is structurally unlike the other two login errors. V1 and V2
 * mark a field invalid and put a red line beneath it; V3 instead sits a card
 * above the fields carrying the message and its own recovery action, and leaves
 * both fields in their normal state (the password simply reads "Locked").
 * Building it as its own component keeps that distinction explicit.
 *
 * Taken from the frame: #F7F2EE on a #FFA355 hairline, radius 12, padding 16,
 * a 34px rounded badge, and a 118px lock watermark bleeding off the right edge
 * behind the content. The soft glow behind it is a blurred #EBDCD0 ellipse.
 */

import type { ReactNode } from 'react'

interface AuthAlertProps {
  children: ReactNode
  /** Recovery action rendered under the message, e.g. "Reset your password". */
  action?: { label: string; href: string }
}

export function AuthAlert({ children, action }: AuthAlertProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-[12px] border border-[#FFA355] bg-[#F7F2EE] p-4">
      {/* Decorative glow, then the watermark, both behind the content. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[29px] top-[-10px] h-[206px] w-[546px] rounded-full bg-[#EBDCD0]"
        style={{ filter: 'blur(182px)' }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative watermark */}
      <img
        src="/images/auth/lock-watermark.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-[-24px] top-[29px] w-[118px] opacity-90"
      />

      <div className="relative flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- inline badge */}
        <img src="/images/auth/lock-badge.svg" alt="" aria-hidden="true" className="size-[34px] shrink-0" />
        <div className="flex flex-1 flex-col justify-center gap-3">
          <p className="font-sans text-[14px] font-medium leading-[1.14] text-[#080B2B]">
            {children}
          </p>
          {action && (
            <a
              href={action.href}
              className="inline-flex h-10 w-fit items-center justify-center rounded-[12px] border border-[#D0D0D0] bg-[#F5F5F5] px-4 py-[10px] font-sans text-[14px] font-medium leading-[1.14] text-black transition-colors hover:bg-[#EFEFEF]"
            >
              {action.label}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
