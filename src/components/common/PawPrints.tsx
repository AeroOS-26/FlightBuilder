/**
 * The "Pets welcome" paw mark on the hero banners.
 *
 * Drawn rather than using 🐾: a colour emoji renders from a colour font and
 * ignores CSS `color`, so it stayed blue beside black text however it was
 * styled. As paths it inherits `currentColor` and always matches the copy.
 *
 * Geometry is traced from a 4× render of frame 60 — every ellipse below sits at
 * a measured centre with measured radii, and each toe leans away from its own
 * pad, which is what gives the two prints their different angles. Eyeballing it
 * produced a mark that read as scattered dots at 13px.
 *
 * Not part of `Icon`: that registry is square 24×24 stroke glyphs, and this is a
 * filled ~16×15 one.
 */

import { cn } from '@/utils/cn'

/** cx, cy, rx, ry, rotation — traced, not guessed. */
type Blob = [number, number, number, number, number]

const UPPER_LEFT: Blob[] = [
  [0.95, 3.85, 0.88, 1.2, -66],
  [2.73, 1.4, 0.9, 1.3, -27],
  [5.4, 1.35, 0.85, 1.25, 8],
  [7.66, 2.67, 0.82, 1.1, 44],
  [4.83, 5.58, 2.85, 2.35, -8],
]

const LOWER_RIGHT: Blob[] = [
  [9.39, 8.07, 0.88, 1.15, -25],
  [12.42, 7.82, 0.95, 1.15, 18],
  [14.63, 9.67, 0.85, 1.2, 59],
  [14.94, 12.63, 0.82, 1.1, 103],
  [11.13, 11.73, 2.75, 2.6, 25],
]

/**
 * Traced radii rendered exactly wash out at 13px — the reference is an emoji
 * font, which is hinted for small sizes where a plain SVG just anti-aliases.
 * A little extra weight restores the density without moving anything.
 */
const WEIGHT = 1.12

const ellipses = (blobs: Blob[], key: string) =>
  blobs.map(([cx, cy, rx, ry, rot], i) => (
    <ellipse
      key={`${key}${i}`}
      cx={cx}
      cy={cy}
      rx={rx * WEIGHT}
      ry={ry * WEIGHT}
      transform={`rotate(${rot} ${cx} ${cy})`}
    />
  ))

interface PawPrintsProps {
  /** Height in px; width follows the traced 16.2 : 15 ratio. */
  height?: number
  className?: string
}

export function PawPrints({ height = 14, className }: PawPrintsProps) {
  return (
    <svg
      width={Math.round((height * 16.2) / 15)}
      height={height}
      viewBox="0 0 16.2 15"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      focusable="false"
      className={cn('shrink-0', className)}
    >
      {ellipses(UPPER_LEFT, 'a')}
      {ellipses(LOWER_RIGHT, 'b')}
    </svg>
  )
}
