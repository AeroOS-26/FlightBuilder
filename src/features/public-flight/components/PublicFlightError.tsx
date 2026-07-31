'use client'

/** Fetch-failure state for the public flight read, with a retry. */
import { Button } from '@/components/ui'
import { Icon } from '@/components/common'

export function PublicFlightError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-[520px] flex-col items-center rounded-[20px] border border-[#A8A8A8]/20 bg-white px-6 py-12 text-center lg:py-16">
      <span className="flex size-12 items-center justify-center rounded-full bg-[#FDECEC] text-danger-text">
        <Icon name="alert" size={24} strokeWidth={2} />
      </span>
      <h1 className="mt-4 font-heading text-[20px] font-medium text-[#000000] lg:text-[24px]">
        We couldn’t load this flight
      </h1>
      <p className="mt-2 font-sans text-[14px] leading-[150%] text-[#000000]/70">
        Something went wrong reaching the flight details. Please try again.
      </p>
      <Button className="mt-6" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}
