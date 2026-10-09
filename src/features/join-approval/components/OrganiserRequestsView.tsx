'use client'

/**
 * Frame 47 · Organiser Join Requests — the organiser's view of a group that has
 * people waiting on them.
 *
 * This replaces the group page for the organiser while the approval flow is on.
 * Nobody is in the group until the organiser approves them, so the requests sit
 * above the roster rather than beside it: the roster is what is settled, the
 * requests are what is not.
 *
 * Built against `4038:94362` (desktop) and `4309:39641` (mobile). The design's
 * decisions that are easy to lose in a rewrite:
 *
 *  - **Three icon buttons per request, not text buttons** — decline (✕) in a
 *    red wash, approve (✓) and open (eye) in the blue one. Forty square, 12px
 *    radius, ten apart.
 *  - **Avatars are outlined, not filled**: white, a `#98C3E1` hairline, black
 *    initials.
 *  - The meta line is one **wrapping, dot-separated list** at 12px and 60%
 *    opacity, so a long pet description reflows rather than truncating.
 *  - An oversized request carries its reason as a **pill beside the name**, and
 *    its approve button is disabled. It can still be declined.
 *  - Open places are **numbered** — "6 OF 6" is which place it is, not a count.
 *
 * Capacity is counted in people throughout, never rows.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { Icon } from '@/components/common'
import { cn } from '@/utils/cn'
import {
  FOOTER_ITEM,
  FOOTER_PRIMARY,
  FOOTER_ROW,
  FOOTER_SECONDARY,
  TAG_ALERT,
  TAG_WAITING,
} from './approvalChrome'
import { metroLabel, readableDate } from '@/features/public-flight/format'
import Image from 'next/image'
import {
  AVATAR,
  ORGANISER_BADGE,
  ParticipantRow,
  ROW_BODY,
  STATUS_IN_GROUP,
  STATUS_IN_GROUP_ORGANISER,
  STATUS_OPEN_PLACE,
  initialsOf,
} from './ParticipantRow'
import type { GroupDetailView } from '@/types'

/** The subset of a request this screen renders. Mirrors the store's row. */
export interface PendingRequest {
  id: number
  requesterName: string | null
  placesRequested: number
  travellerCount: number
  petCount: number
  /** Each pet's descriptors, already flattened — "Nube", "Cat", "9lbs". */
  petBits: string[]
  requestedAt: string
}

interface OrganiserRequestsViewProps {
  group: GroupDetailView
  requests: PendingRequest[]
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

const CARD =
  'rounded-[24px] border border-[#A8A8A8]/20 bg-white/60 p-4 flex flex-col gap-4'
const ROW = 'rounded-[20px] border border-[#A8A8A8]/20 bg-white p-4'
/**
 * The reason pill beside an oversized requester's name. 10/600 and title-cased
 * on the frame — `capitalize` rather than hand-cased copy, because the text is
 * built from counts.
 */
const PILL =
  'inline-flex shrink-0 items-center rounded-[37px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-2.5 py-1.5 font-sans text-[10px] font-semibold capitalize leading-none text-[#112D7C]'
const META = 'font-sans text-[12px] font-medium leading-[1.21] text-[#000000]/60'

/** The 4px separator between meta items. */
function Dot() {
  return <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-[#000000]/60" />
}

/** A 40px square icon control. `tone` picks the red wash or the blue one. */
function IconButton({
  label,
  icon,
  tone,
  onClick,
  disabled,
  href,
}: {
  label: string
  icon: 'close' | 'check' | 'eye'
  tone: 'danger' | 'neutral'
  onClick?: () => void
  disabled?: boolean
  href?: string
}) {
  // One text colour per button, chosen once. Adding `text-[#109A51]` on top of
  // the tone's own `text-…` would leave both classes on the element and let the
  // stylesheet decide — `cn` here joins, it does not merge.
  const tint =
    tone === 'danger'
      ? 'border-[#FB3748]/10 bg-[#FB3748]/10 text-[#D81F2F] hover:bg-[#FB3748]/20'
      : icon === 'check'
        ? 'border-[#98C3E1] bg-[#CFE3F1]/20 text-[#109A51] hover:bg-[#CFE3F1]/50'
        : 'border-[#98C3E1] bg-[#CFE3F1]/20 text-[#112D7C] hover:bg-[#CFE3F1]/50'

  const classes = cn(
    'flex size-10 shrink-0 items-center justify-center rounded-[12px] border transition-colors focus-ring',
    tint,
    disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
  )

  if (href) {
    return (
      <Link href={href} aria-label={label} title={label} className={classes}>
        <Icon name={icon} className="size-[18px]" />
      </Link>
    )
  }
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={classes}>
      <Icon name={icon} className="size-[18px]" />
    </button>
  )
}

export function OrganiserRequestsView({ group, requests }: OrganiserRequestsViewProps) {
  const [busyId, setBusyId] = useState<number | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const total = group.flight.spaces_total
  const remaining = Math.max(0, group.flight.spaces_remaining)
  const occupied = Math.max(0, total - remaining)
  const waiting = requests.length

  async function decide(id: number, decision: 'approve' | 'decline') {
    setBusyId(id)
    setFailure(null)
    try {
      const res = await fetch(`/api/groups/${group.group_id}/requests/${id}/${decision}`, {
        method: 'POST',
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        setFailure(body?.message ?? 'That did not go through. Please try again.')
        return
      }
      // The roster, the counts and the remaining requests all move together, so
      // the page is re-read rather than patched in three places.
      window.location.reload()
    } catch {
      setFailure('Could not reach the server. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[804px] flex-col gap-[30px] px-4 py-8 sm:px-6">
      {/* Hero */}
      <section className="flex flex-col gap-1">
        <span className="inline-flex w-fit items-center rounded-[8px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-3 py-2.5 font-sans text-[12px] font-medium uppercase leading-none tracking-[0.5px] text-[#112D7C]">
          Flight Club · Shared Flight
        </span>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="flex flex-wrap items-center gap-2 font-heading text-[24px] font-medium text-[#000000] lg:text-[30px]">
            {metroLabel(group.flight.route_origin_city)}
            {/* The supplied route glyph, not the icon set's plane — it is a
                raster asset with its own shape and cannot be substituted. */}
            <Image
              src="/images/routes/Flighticons.png"
              alt="to"
              width={34}
              height={34}
              className="size-[26px] shrink-0 object-contain"
            />
            {metroLabel(group.flight.route_destination_city)}
          </h1>
          {waiting > 0 && (
            <span className={TAG_WAITING}>{plural(waiting, 'join request')}</span>
          )}
        </div>
        <p className="font-sans text-[14px] font-medium leading-[1.5] text-[#000000]">
          {readableDate(group.flight.departure_date)}
          {group.flight.aircraft_category ? ` · ${group.flight.aircraft_category}` : ''} · You are
          the Group Organizer.{' '}
          {waiting > 0
            ? `${plural(waiting, 'person', 'people')} ${waiting === 1 ? 'has' : 'have'} asked to join. Nobody is in the group until you approve them.`
            : 'No one is waiting on you at the moment.'}
        </p>
      </section>

      {failure && (
        <p className="rounded-[12px] border border-danger-text/30 bg-danger-text/5 px-4 py-3 font-sans text-[14px] text-danger-text">
          {failure}
        </p>
      )}

      {/* Capacity */}
      <section className="flex flex-col gap-4 rounded-[20px] border border-[#A8A8A8]/20 bg-white/60 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-[18px] font-medium text-[#000000]">Group Membership</h2>
          <span className="font-sans text-[14px] text-[#000000]/70">
            {remaining > 0 ? plural(remaining, 'open place') : 'No open places'}
          </span>
        </div>
        <div className="flex flex-col gap-3.5">
          <p className="font-heading text-[22px] font-medium text-[#000000]">
            {occupied} of {total} <span className="text-[16px] font-normal">participants</span>
          </p>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#E9EEF6]">
            <div
              className="h-full rounded-full bg-[#112D7C] transition-[width]"
              style={{ width: `${total > 0 ? Math.round((occupied / total) * 100) : 0}%` }}
            />
          </div>
        </div>
        <p className="font-sans text-[14px] font-medium leading-[1.3] text-[#000000]/70">
          Capacity counts people.{' '}
          {remaining > 0
            ? `${plural(remaining, 'place is', 'places are')} open`
            : 'No places are open'}
          {waiting > 0
            ? `, and ${plural(waiting, 'join request is', 'join requests are')} waiting on you.`
            : '.'}
        </p>
      </section>

      {/* Join requests */}
      {waiting > 0 && (
        <section className={CARD}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-heading text-[18px] font-medium text-[#000000]">Join Requests</h2>
            <span className={TAG_ALERT}>{waiting} waiting</span>
          </div>
          <p className="font-sans text-[14px] leading-[1.5] text-[#000000]/70">
            Approve or decline each request. Approved people take their place straight away. Perro
            Air then runs its own check.
          </p>

          <div className="flex flex-col gap-2.5">
            {requests.map((request) => {
              // Computed per row because it is both what disables Approve and
              // what the pill beside the name has to explain.
              const oversized = request.placesRequested > remaining
              const busy = busyId === request.id
              return (
                <article key={request.id} className={cn(ROW, 'flex flex-wrap items-center justify-between gap-4')}>
                  {/* `ROW_BODY` rather than `min-w-0 flex-1`: with no content
                      floor the block shrinks to nothing on a phone and the name
                      and its pill spill out of the card instead of the three
                      controls wrapping below them. Measured 95px over at
                      360px before this. */}
                  <div className={cn('flex items-center gap-4', ROW_BODY)}>
                    <span className={AVATAR} aria-hidden="true">
                      {initialsOf(request.requesterName)}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 break-words font-heading text-[16px] font-medium leading-[1.21] text-[#000000]">
                          {request.requesterName ?? 'Flight Club member'}
                        </p>
                        {oversized && (
                          <span className={PILL}>
                            Needs {plural(request.placesRequested, 'place')}, {remaining} open
                          </span>
                        )}
                      </div>
                      {/* One wrapping list, dot-separated, so a long pet
                          description reflows instead of being cut. */}
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        {[
                          plural(request.travellerCount, 'traveller'),
                          request.petCount > 0 ? plural(request.petCount, 'pet') : 'No pets',
                          ...request.petBits,
                          `Needs ${plural(request.placesRequested, 'place')}`,
                          `Asked ${readableDate(request.requestedAt)}`,
                        ].map((bit, index) => (
                          <span key={`${bit}-${index}`} className="flex items-center gap-x-1.5">
                            {index > 0 && <Dot />}
                            <span className={META}>{bit}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2.5">
                    <IconButton
                      label={`Decline ${request.requesterName ?? 'this request'}`}
                      icon="close"
                      tone="danger"
                      disabled={busy}
                      onClick={() => decide(request.id, 'decline')}
                    />
                    <IconButton
                      label={
                        oversized
                          ? `Cannot approve — needs ${request.placesRequested} places, ${remaining} open`
                          : `Approve ${request.requesterName ?? 'this request'}`
                      }
                      icon="check"
                      tone="neutral"
                      disabled={oversized || busy}
                      onClick={() => decide(request.id, 'approve')}
                    />
                    <IconButton
                      label="Review request"
                      icon="eye"
                      tone="neutral"
                      href={`/group/${encodeURIComponent(group.group_id)}/requests/${request.id}`}
                    />
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {/* The settled roster */}
      <section className={CARD}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-[18px] font-medium text-[#000000]">Group Membership</h2>
          <span className="font-sans text-[13px] text-[#000000]/60">
            {occupied} of {total} people
          </span>
        </div>
        <ul className="flex flex-col gap-2.5">
          {group.members.map((member) => (
            <ParticipantRow key={member.user_id} isOrganiser={member.role === 'organizer'}>
              <span className={AVATAR} aria-hidden="true">
                {initialsOf(member.display_name)}
              </span>
              <span className={ROW_BODY}>
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-heading text-[16px] font-medium leading-[1.21] text-[#000000]">
                    {member.display_name}
                    {member.is_self ? ' (You)' : ''}
                  </span>
                  {member.role === 'organizer' && (
                    <span className={ORGANISER_BADGE}>Group Organizer</span>
                  )}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                  {[
                    plural(member.places, 'traveller'),
                    member.pet_count > 0 ? plural(member.pet_count, 'pet') : 'No pets',
                    plural(member.places, 'place'),
                  ].map((bit, index) => (
                    <span key={bit} className="flex items-center gap-x-1.5">
                      {index > 0 && <Dot />}
                      <span className={META}>{bit}</span>
                    </span>
                  ))}
                </span>
              </span>
              <span
                className={
                  member.role === 'organizer' ? STATUS_IN_GROUP_ORGANISER : STATUS_IN_GROUP
                }
              >
                In the group
              </span>
            </ParticipantRow>
          ))}

          {/* Open places are numbered rather than counted: the design labels the
              row with which place it is ("6 OF 6"), which reads as a seat on the
              aircraft rather than a tally. */}
          {Array.from({ length: remaining }, (_, i) => (
            <li
              key={`open-${i}`}
              className="flex items-center gap-4 rounded-[20px] border border-dashed border-[#98C3E1] bg-[#CFE3F1]/10 p-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-dashed border-[#98C3E1] text-[#112D7C]/50">
                <Icon name="user" className="size-5" />
              </span>
              <span className="flex-1 font-sans text-[14px] font-medium text-[#000000]/50">
                Open place
              </span>
              <span className={STATUS_OPEN_PLACE}>
                {occupied + i + 1} of {total}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Styled to the frame rather than through the shared Button — see
          `approvalChrome.ts` for why. */}
      <div className={FOOTER_ROW}>
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(group.share_url)}
          className={`${FOOTER_SECONDARY} ${FOOTER_ITEM}`}
        >
          Share The Group Link
        </button>
        <Link
          href="/build/review"
          className={`${FOOTER_PRIMARY} ${FOOTER_ITEM}`}
        >
          Edit Trip Details
          <Icon name="arrow-right" className="size-[18px]" />
        </Link>
      </div>
    </div>
  )
}
