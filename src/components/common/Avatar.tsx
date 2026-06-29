'use client'

/**
 * Member avatar — shows an image when available, otherwise initials on a
 * brand-tinted disc. An optional presence dot marks the member as online.
 */

import { cn } from '@/utils/cn'

interface AvatarProps {
  name: string
  src?: string
  size?: number
  showPresence?: boolean
  className?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function Avatar({ name, src, size = 32, showPresence, className }: AvatarProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full rounded-full object-cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full bg-accent-soft font-heading font-semibold text-accent"
          style={{ fontSize: size * 0.4 }}
          aria-hidden="true"
        >
          {initials(name)}
        </span>
      )}
      {showPresence && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-success" />
      )}
    </span>
  )
}