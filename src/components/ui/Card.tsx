'use client'

/**
 * Card surface primitives.
 *
 * `Card` is the white, rounded, shadowed panel used throughout the builder.
 * `DashedCard` is the inset, dashed-border container (e.g. "Add another
 * traveler", "Travel readiness", the share tips list).
 */

import { useLayoutEffect, useRef, useState, type HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Internal padding preset. */
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-7',
}

const DASHED_RADIUS = 16

/** Dashed outline for add actions and inset panels (Figma secondary light). */
export const dashedAddSurfaceClass =
  'relative overflow-visible rounded-[16px] bg-[#CFE3F1]/20'

  
/** Dashed outline for travel readiness (Figma secondary fill at 20%). */
export const dashedReadinessSurfaceClass =
  'relative overflow-visible rounded-[16px] bg-[#CFE3F1]/20'

/** Dashed outline for legal / privacy callouts on white. */
export const dashedPanelSurfaceClass = 'relative overflow-visible rounded-[16px] bg-white'

/** SVG dashed stroke that follows rounded corners (Figma primary blue). */
export function DashedOutline({ radius = DASHED_RADIUS }: { radius?: number }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return

    function update() {
      if (!host) return
      const { width, height } = host.getBoundingClientRect()
      setBox({ w: Math.round(width), h: Math.round(height) })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  const r = Math.min(radius, box.w / 2, box.h / 2)

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      {box.w > 0 && box.h > 0 && (
        <svg
          className="block size-full"
          width={box.w}
          height={box.h}
          viewBox={`0 0 ${box.w} ${box.h}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x={0.5}
            y={0.5}
            width={box.w - 1}
            height={box.h - 1}
            rx={r}
            ry={r}
            stroke="#112D7C"
            strokeWidth={1}
            strokeDasharray="12 8"
          />
        </svg>
      )}
    </div>
  )
}

export function Card({ padding = 'lg', className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        padding === 'none' ? 'rounded-[12px]' : 'rounded-[12px] bg-white shadow-card',
        paddingClasses[padding],
        className,
      )}
      {...props}
    />
  )
}

export function DashedCard({
  padding = 'md',
  variant = 'add',
  className,
  children,
  ...props
}: CardProps & { variant?: 'add' | 'readiness' }) {
  const surface =
    variant === 'readiness' ? dashedReadinessSurfaceClass : dashedAddSurfaceClass

  return (
    <div className={cn(surface, paddingClasses[padding], className)} {...props}>
      <DashedOutline />
      {children}
    </div>
  )
}