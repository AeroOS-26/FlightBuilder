/**
 * The participant row as the approval frames draw it, in one place.
 *
 * Three screens render a roster — 47, 49 and the participant view — and the
 * organiser's row is not styled like the others on any of them: it carries a
 * 1px gradient edge from warm to mint, and two blurred discs washing the card
 * behind the text. That treatment existed only inside `GroupDetailView`, so the
 * approval screens drew the organiser as an ordinary row and the colour did not
 * match the design.
 *
 * Kept here rather than copied a third time: the gradient is a specific pair of
 * values off the frame, and three hand-typed copies drift.
 *
 * Avatars are **outlined** — white, a `#98C3E1` hairline, black initials — not
 * filled. Frame 49 had them filled navy with white text, which is the older
 * member-area treatment, not what these frames show.
 */

import { cn } from '@/utils/cn'
import type { ReactNode } from 'react'

export const AVATAR =
  'flex size-10 shrink-0 items-center justify-center rounded-full border border-[#98C3E1] bg-white font-heading text-[14px] font-medium text-[#000000]'

/** "Tomás Iglesias" -> "TI". One letter when there is only one word. */
export function initialsOf(name: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  const first = parts[0]![0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? '') : ''
  return (first + last).toUpperCase()
}

/**
 * The badge beside the organiser's name: **solid** green with white text, not a
 * tint. 20px tall, 36px radius, a half-pixel stroke in its own colour.
 */
export const ORGANISER_BADGE =
  'inline-flex h-5 shrink-0 items-center rounded-[36px] bg-[#109A51] px-2.5 font-sans text-[11px] font-medium text-white ring-[0.5px] ring-[#109A51]'

/**
 * The name-and-meta column of a roster row.
 *
 * `basis-0 flex-1` alone lets the column shrink to nothing, because a flex item
 * with `min-width: 0` has no content floor — the name and the badge then spill
 * out of the card instead of the status pill wrapping below them. The minimum
 * is what makes the row's `flex-wrap` actually fire on a narrow phone: at 320px
 * there is no line that fits 11rem of name plus the pill, so the pill drops.
 */
export const ROW_BODY = 'min-w-[11rem] flex-1 basis-0'

/**
 * The badge marking the viewer's own row on frame 45. Same shape as the
 * organiser's, the other colour: a 40% light-blue wash with a `#98C3E1`
 * hairline and `#112D7C` text, where the organiser's is solid green.
 */
export const VIEWER_BADGE =
  'inline-flex h-5 shrink-0 items-center rounded-[36px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-2.5 font-sans text-[11px] font-medium text-[#112D7C]'

/**
 * The "In the group" label. Green for the organiser, blue for everyone else —
 * the frame uses two variants of the same component and the colour is the only
 * difference. 12px uppercase, 8px radius; not a full pill.
 */
const STATUS_BASE =
  'inline-flex shrink-0 items-center rounded-[8px] border px-3 py-2.5 font-sans text-[12px] font-medium uppercase leading-none tracking-[0.5px]'
export const STATUS_IN_GROUP = `${STATUS_BASE} border-[#98C3E1] bg-[#CFE3F1]/40 text-[#112D7C]`
export const STATUS_IN_GROUP_ORGANISER = `${STATUS_BASE} border-[#84EBB4] bg-[#1FC16B]/10 text-[#109A51]`

/** The "6 of 6" label on an open place: white, a near-invisible hairline. */
export const STATUS_OPEN_PLACE =
  'inline-flex shrink-0 items-center rounded-[8px] border border-[#F5F5F5] bg-white px-3 py-2.5 font-sans text-[14px] font-medium uppercase leading-none text-[#21272A]'

/**
 * One roster row.
 *
 * The organiser's gradient edge is a 1px padded wrapper rather than a border,
 * because a border cannot take a gradient. The washes are absolutely positioned
 * and clipped by the row's own `overflow-hidden`.
 */
export function ParticipantRow({
  isOrganiser,
  children,
}: {
  isOrganiser: boolean
  children: ReactNode
}) {
  const body = (
    <div
      className={cn(
        'relative flex flex-wrap items-center gap-4 overflow-hidden rounded-[20px] bg-white p-4',
        !isOrganiser && 'border border-[#A8A8A8]/20',
      )}
    >
      {isOrganiser && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 -top-20 h-56 w-72 rounded-full bg-[#FFA355] opacity-[0.18] blur-[64px]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-20 h-56 w-72 rounded-full bg-[#84EBB4] opacity-25 blur-[64px]"
          />
        </>
      )}
      {children}
    </div>
  )

  // Both stops are full opacity on the frame — `rgba(211,162,109,1)` to
  // `rgba(62,175,114,1)`. A border cannot take a gradient, so this is a 1px
  // padded wrapper rather than a border class.
  return isOrganiser ? (
    <li className="rounded-[20px] bg-[linear-gradient(90deg,#D3A26D_0%,#3EAF72_100%)] p-px">
      {body}
    </li>
  ) : (
    <li>{body}</li>
  )
}
