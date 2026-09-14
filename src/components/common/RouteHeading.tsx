/**
 * "Origin ✈ Destination" — the route line that heads the public detail page,
 * the join review and outcome screens, and group detail.
 *
 * It exists because that markup was copied into four places and all four
 * carried the same defect: `flex-nowrap` with `whitespace-nowrap` on both city
 * names, which cannot shrink and therefore overflows its container. With the
 * values the frames were drawn against — "Teterboro", "Miami" — nothing showed.
 * With a real one it does: "Mamitupu, Guna Yala Indigenous Region, Panama" is
 * 44 characters, and it rendered across the status pill on group detail and out
 * through the left edge of the Trip Details panel.
 *
 * The four copies also carried a comment claiming the text "scales down instead
 * of breaking onto a second line". Nothing implemented that — the `clamp()`
 * font sizes key off the viewport, which cannot know the string is long, so at
 * desktop width they sat at their maximum and the row simply overflowed.
 *
 * Two rules make it safe:
 *   `min-w-0`    so the span reports a shrinkable minimum. Without it a
 *                `min-w-0 flex-1` parent still cannot contain the text.
 *   `flex-wrap`  so it breaks to a second line rather than out of the box.
 *                Short routes are unaffected — they fit on one line and stay
 *                there, which is what the frames show.
 *
 * Callers keep their own type scale and element: the four surfaces use h1, h2
 * and a plain span, at different sizes, and that is per-frame rather than
 * something to unify here.
 */

import { cn } from '@/utils/cn'

interface RouteHeadingProps {
  from: string
  to: string
  /** Element to render. The frames use h1 on the public page, h2 on the join screens. */
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'div'
  /** Type scale and colour, per frame. */
  className?: string
  /**
   * Icon size. A number or CSS length for an inline style, or pass
   * `iconClassName` instead when the size is a utility class.
   */
  iconSize?: number | string
  iconClassName?: string
  /**
   * Spacing around the icon, as its own prop rather than something `className`
   * overrides: `cn` is a plain join with no tailwind-merge, so a caller passing
   * `gap-x-2` alongside a built-in `gap-x-3` would leave both in the attribute
   * and let Tailwind's stylesheet order pick the winner. A prop makes it
   * deterministic.
   */
  gapClassName?: string
}

export function RouteHeading({
  from,
  to,
  as: Tag = 'span',
  className,
  iconSize,
  iconClassName,
  gapClassName = 'gap-x-3',
}: RouteHeadingProps) {
  return (
    <Tag className={cn('flex min-w-0 flex-wrap items-center', gapClassName, className)}>
      {/* break-words covers the rarer case: one place name wider than the column. */}
      <span className="min-w-0 break-words">{from}</span>
      <img
        src="/svg/soFar.svg"
        alt="to"
        className={cn('shrink-0', iconClassName)}
        style={iconSize ? { width: iconSize, height: iconSize } : undefined}
      />
      <span className="min-w-0 break-words">{to}</span>
    </Tag>
  )
}
