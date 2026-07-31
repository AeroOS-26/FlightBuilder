'use client'

/**
 * Not found / expired edge state.
 *
 * A stale, closed, or unknown share token resolves here. Message-level per the
 * milestone doc — a centered message with a way forward (start their own or
 * search), not a full screen. No sensitive data is involved: the relay returned
 * nothing, so there is nothing to withhold.
 */

import { Button } from '@/components/ui'
import { Icon } from '@/components/common'

export function NotFoundState() {
  return (
    <div className="mx-auto flex max-w-[520px] flex-col items-center rounded-[20px] border border-[#A8A8A8]/20 bg-white px-6 py-12 text-center lg:py-16">
      <span className="flex size-12 items-center justify-center rounded-full bg-[#F1F3F7] text-[#080B2B]/60">
        <Icon name="search" size={24} />
      </span>
      <h1 className="mt-4 font-heading text-[22px] font-medium text-[#000000] lg:text-[26px]">
        This flight link isn’t available
      </h1>
      <p className="mt-2 font-sans text-[14px] leading-[150%] text-[#000000]/70">
        The link may be old, or the flight may have closed. You can start your own shared flight or
        search for one on your route.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button
          variant="secondary"
          onClick={() => {
            window.location.href = '/build/route'
          }}
        >
          Start your own flight
        </Button>
        <Button
          onClick={() => {
            window.location.href = '/'
          }}
          trailingAdornment={
            <img
              src="/svg/whiteArrow.svg"
              alt=""
              aria-hidden="true"
              className="size-[18px] shrink-0"
            />
          }
        >
          Search flights
        </Button>
      </div>
    </div>
  )
}
