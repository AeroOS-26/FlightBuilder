'use client'

/**
 * Perro Air brandmark.
 *
 * An angular "jet" glyph in the brand accent paired with the stacked
 * "PERRO / AIR" wordmark. Colors come from semantic tokens so the mark
 * re-skins with the active brand.
 */

import { cn } from '@/utils/cn'

interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center', className)}>
      <img src="/svg/mainlogo.svg" alt="Perro Air" className="h-8 w-auto" />
    </span>
  )
}