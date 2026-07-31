'use client'

/** Loading skeleton for the public flight page — mirrors the two-column shape. */
export function PublicFlightSkeleton() {
  const block = 'animate-pulse rounded-[20px] bg-[#E9EEF6]'
  return (
    <div className="flex flex-col gap-5 lg:gap-6" aria-busy="true" aria-live="polite">
      <div className={`${block} h-[120px]`} />
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-6">
        <div className="flex flex-col gap-5">
          <div className={`${block} h-[220px]`} />
          <div className={`${block} h-[140px]`} />
          <div className={`${block} h-[180px]`} />
        </div>
        <div className="flex flex-col gap-5">
          <div className={`${block} h-[160px]`} />
          <div className={`${block} h-[140px]`} />
        </div>
      </div>
      <span className="sr-only">Loading flight details…</span>
    </div>
  )
}
