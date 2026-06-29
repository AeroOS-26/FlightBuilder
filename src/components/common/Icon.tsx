'use client'

/**
 * Inline SVG icon system.
 *
 * The project brief referenced `public/assets/svg`, but that directory ships
 * empty (only an unrelated template sprite exists), so we provide a single,
 * self-contained icon registry here. Icons are stroke-based and use
 * `currentColor`, so they inherit text color and re-theme automatically.
 *
 * Add a new glyph by adding an entry to `paths` — every consumer stays typed
 * against `IconName`.
 */

import type { ReactElement, SVGProps } from 'react'
import { cn } from '@/utils/cn'

export type IconName =
  | 'route'
  | 'calendar'
  | 'pets'
  | 'notes'
  | 'review'
  | 'globe'
  | 'info'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'swap'
  | 'edit'
  | 'check'
  | 'close'
  | 'plus'
  | 'search'
  | 'copy'
  | 'message'
  | 'mail'
  | 'whatsapp'
  | 'alert'
  | 'arrow-right'
  | 'grid'
  | 'sparkle'
  | 'building'
  | 'city'
  | 'plane'
  | 'help'
  | 'pin'

/** Stroke-based 24×24 glyphs (fill:none, stroke:currentColor). */
const paths: Record<IconName, ReactElement> = {
  route: (
    <path d="M16.5 3.5 21 8l-4.5 4.5M21 8H8a4 4 0 0 0-4 4v0a4 4 0 0 0 4 4h8.5" />
  ),
  calendar: (
    <>
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <path d="M3.5 9.5h17M8 3v3M16 3v3" />
    </>
  ),
  pets: (
    <>
      <circle cx="5.5" cy="10" r="1.8" />
      <circle cx="9.5" cy="6.5" r="1.8" />
      <circle cx="14.5" cy="6.5" r="1.8" />
      <circle cx="18.5" cy="10" r="1.8" />
      <path d="M12 12c-2.2 0-4 1.6-4.6 3.5-.4 1.4.6 2.5 2 2.5 1 0 1.8-.4 2.6-.4s1.6.4 2.6.4c1.4 0 2.4-1.1 2-2.5C16 13.6 14.2 12 12 12Z" />
    </>
  ),
  notes: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  review: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 3.5h6v3H9zM8.5 12.5l2 2 4-4.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5S14.4 18.7 12 21c-2.4-2.3-3.6-5.3-3.6-8.5S9.6 5.8 12 3.5Z" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  'chevron-left': <path d="M14.5 6 9 12l5.5 6" />,
  'chevron-right': <path d="M9.5 6 15 12l-5.5 6" />,
  'chevron-down': <path d="M6 9.5 12 15l6-5.5" />,
  swap: <path d="M7 8h12l-3-3M17 16H5l3 3" />,
  edit: (
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3ZM13.5 6.5l3 3" />
  ),
  check: <path d="M5 12.5 10 17.5 19.5 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2.2" />
      <path d="M5.5 15H5a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 5 3.5h8.5A1.5 1.5 0 0 1 15 5v.5" />
    </>
  ),
  message: (
    <path d="M4 5.5h16v10H8l-4 3.5V5.5ZM8 10h8M8 13h5" />
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  whatsapp: (
    <path d="M4 20l1.4-4.1A7.5 7.5 0 1 1 8.5 18.6L4 20Zm5.2-10.4c-.2-.5-.4-.5-.6-.5h-.5a1 1 0 0 0-.7.3c-.3.3-.9.9-.9 2.1s.9 2.5 1 2.6c.1.2 1.8 2.9 4.5 3.9 2.2.8 2.7.7 3.2.6.5-.1 1.4-.6 1.6-1.2.2-.6.2-1 .1-1.2l-.5-.3c-.3-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.4.1-.5l.4-.4c.1-.2.2-.3.3-.5 0-.2 0-.4 0-.5l-.7-1.7Z" />
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  grid: (
    <>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
    </>
  ),
  sparkle: (
    <path d="M12 3.5c.5 3.6 1.9 5 5.5 5.5-3.6.5-5 1.9-5.5 5.5-.5-3.6-1.9-5-5.5-5.5 3.6-.5 5-1.9 5.5-5.5ZM18.5 14.5c.3 1.7 1 2.4 2.7 2.7-1.7.3-2.4 1-2.7 2.7-.3-1.7-1-2.4-2.7-2.7 1.7-.3 2.4-1 2.7-2.7Z" />
  ),
  building: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 20.5v-3h4v3" />
    </>
  ),
  city: (
    <path d="M3.5 20.5h17M5.5 20.5V9l5-3v14.5M10.5 20.5V11l8-3v12.5M9 20.5v-3M15 20.5v-3M15 14h.01M15 11h.01" />
  ),
  plane: (
    <path d="M10.5 20.5 12 16l5.5 1.5.8-2-5-2.5 2-5.5a1.6 1.6 0 0 0-3-1L9.8 11 4.5 8.5l-1 2L8 13.5l-2 3 1.5 1Z" />
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 4.5 1.5c0 1.6-2 2-2 3M12 16.5h.01" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6.5-5.5 6.5-10A6.5 6.5 0 0 0 5.5 11c0 4.5 6.5 10 6.5 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </>
  ),
}

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  /** Pixel size for width and height. Defaults to 20. */
  size?: number
}

export function Icon({ name, size = 20, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
      {...props}
    >
      {paths[name]}
    </svg>
  )
}