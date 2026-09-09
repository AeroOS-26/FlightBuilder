'use client'

/**
 * Flight Group Detail — the signed-in member's view of a group they belong to.
 *
 * Figma: "FGD JOINER"/"FGD FOUNDER" frames 62, 63, 70–75. The layout is one
 * 750px main column and one 570px rail; on mobile the rail moves above the main
 * column and its cards collapse to accordions, which is why the rail is built
 * from SidePanel rather than plain cards.
 *
 * Everything here is member-visible by design — real names, the roster, the
 * share link. That is the line between this screen and the public share page,
 * which may never show member identities.
 */

import { useState } from 'react'
import { Icon, PawPrints } from '@/components/common'
import { SidePanel } from '@/features/flight-builder/components'
import { cn } from '@/utils/cn'
import type {
  GroupDetailView as GroupDetail,
  GroupDetailMember,
  GroupStatus,
} from '@/types'

type MembershipRole = 'organizer' | 'joiner'

interface GroupDetailViewComponentProps {
  group: GroupDetail
  viewerRole: MembershipRole
  groupStatus: GroupStatus
}

/* ------------------------------------------------------------------ tokens */

const CARD = 'rounded-[20px] border border-[#A8A8A8]/20 p-4'
const MAIN_CARD = cn(CARD, 'bg-white/60')
const HEADING = 'font-heading text-[20px] font-semibold leading-[1.21] text-[#000000]'
const LABEL_12 = 'font-sans text-[12px] font-medium leading-[1.21]'

/** Secondary button — pale blue wash, per the Figma button component. */
const SECONDARY_BTN =
  'inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[#98C3E1] bg-[#CFE3F1]/20 px-[14px] font-sans text-[14px] font-medium leading-4 text-[#000000] transition-colors hover:bg-[#CFE3F1]/40 focus-ring'

/* ------------------------------------------------------------- state chrome */

const STATUS_LABEL: Record<GroupStatus, string> = {
  forming: 'Forming',
  filling: 'Filling',
  filled: 'Filled',
  quoting: 'Quoting',
  confirmed: 'Confirmed',
  booked: 'Booked',
  closed: 'Closed',
}

/** Pill tint per state. Filling is the one Figma specifies; the rest reuse the
 *  app's existing state palette so the seven states stay tellable apart. */
const STATUS_PILL: Record<GroupStatus, string> = {
  forming: 'border-[#98C3E1] bg-[#CFE3F1]/40 text-[#112D7C]',
  filling: 'border-[#FFDB43] bg-[#FFDB43]/10 text-[#66550D]',
  filled: 'border-[#84EBB4] bg-[#1FC16B]/10 text-[#109A51]',
  quoting: 'border-[#98C3E1] bg-[#CFE3F1]/40 text-[#112D7C]',
  confirmed: 'border-[#84EBB4] bg-[#1FC16B]/10 text-[#109A51]',
  booked: 'border-[#84EBB4] bg-[#1FC16B]/10 text-[#109A51]',
  closed: 'border-[#D0D0D0] bg-[#F5F5F5] text-[#6D6D6D]',
}

/**
 * Hero wash per state.
 *
 * The banner is not one colour: Forming is blue, Filling warm, Filled mint —
 * that is how the frames tell each other apart at a glance. Each wash also
 * *fades*, peaking left of centre and reaching near-white by the right edge,
 * rather than tinting the card evenly.
 *
 * Stops are sampled across frames 60, 63 and 70 rather than guessed; a flat
 * fill at the peak colour reads far heavier than the design. The later states
 * follow their pill's family.
 */
const HERO_GLOW: Record<GroupStatus, string> = {
  forming: 'bg-[linear-gradient(90deg,#EEF4FA_0%,#E4EFF8_38%,rgba(255,255,255,0)_95%)]',
  filling: 'bg-[linear-gradient(90deg,#F8F3EF_0%,#F4EDE6_38%,rgba(255,255,255,0)_95%)]',
  filled: 'bg-[linear-gradient(90deg,#E8F5EE_0%,#DAEEE3_38%,rgba(255,255,255,0)_95%)]',
  quoting: 'bg-[linear-gradient(90deg,#EEF4FA_0%,#E4EFF8_38%,rgba(255,255,255,0)_95%)]',
  confirmed: 'bg-[linear-gradient(90deg,#E8F5EE_0%,#DAEEE3_38%,rgba(255,255,255,0)_95%)]',
  booked: 'bg-[linear-gradient(90deg,#E8F5EE_0%,#DAEEE3_38%,rgba(255,255,255,0)_95%)]',
  closed: 'bg-[linear-gradient(90deg,#F2F2F2_0%,#EBEBEB_38%,rgba(255,255,255,0)_95%)]',
}

const EYEBROW_TONE: Record<GroupStatus, string> = {
  forming: 'text-[#112D7C]',
  filling: 'text-[#EB832B]',
  filled: 'text-[#109A51]',
  quoting: 'text-[#112D7C]',
  confirmed: 'text-[#109A51]',
  booked: 'text-[#109A51]',
  closed: 'text-[#6D6D6D]',
}

const TIMELINE_STEPS: { status: GroupStatus; label: string }[] = [
  { status: 'forming', label: 'Forming' },
  { status: 'filling', label: 'Filling' },
  { status: 'filled', label: 'Filled' },
  { status: 'quoting', label: 'Quoting' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'booked', label: 'Booked' },
  { status: 'closed', label: 'Closed' },
]

/** The "what happens next" line under the timeline, per state. */
function nextStepCopy(status: GroupStatus, spacesRemaining: number): string {
  switch (status) {
    case 'forming':
    case 'filling':
      return spacesRemaining === 1
        ? 'One more member fills the group. Operator quotes get requested automatically.'
        : `${spacesRemaining} more members fill the group. Operator quotes get requested automatically.`
    case 'filled':
      return 'The group is full. We are requesting operator quotes now.'
    case 'quoting':
      return 'Operators are quoting. You will be notified as soon as the price is locked.'
    case 'confirmed':
      return 'The quote is locked. Complete your booking to secure your space.'
    case 'booked':
      return 'Your booking is confirmed. Final aircraft and timing follow by email.'
    case 'closed':
      return 'This group is closed. No further changes can be made.'
  }
}

/* --------------------------------------------------------------- formatting */

function formatLongDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function travelerSummary(adults: number, pets: number): string {
  const parts = [`${adults} adult${adults === 1 ? '' : 's'}`]
  if (pets > 0) parts.push(`${pets} pet${pets === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

/* -------------------------------------------------------------- sub-pieces */

function RouteLine({
  from,
  to,
  iconSize,
  className,
}: {
  from: string
  to: string
  /** Number for a fixed size, or a CSS length so the icon can scale with the text. */
  iconSize: number | string
  className?: string
}) {
  // Never wraps: the frames keep the route on one line, so it scales down
  // instead of breaking onto a second.
  return (
    <span
      className={cn('flex flex-nowrap items-center gap-x-2 lg:gap-x-[18px]', className)}
    >
      <span className="whitespace-nowrap">{from}</span>
      <img
        src="/svg/soFar.svg"
        alt="to"
        className="shrink-0"
        style={{ width: iconSize, height: iconSize }}
      />
      <span className="whitespace-nowrap">{to}</span>
    </span>
  )
}

/**
 * The avatar the frames use — the same filled mark in the roster and in the
 * travellers card, pets included. The asset carries its own ring, so it is not
 * wrapped in a bordered circle.
 */
function MemberAvatar() {
  return (
    <img
      src="/svg/profile.png"
      alt=""
      aria-hidden="true"
      className="size-10 shrink-0 rounded-full"
    />
  )
}

function MemberRow({ member }: { member: GroupDetailMember }) {
  const isOrganizer = member.role === 'organizer'

  const body = (
    <div
      className={cn(
        'relative flex items-center justify-between gap-3 overflow-hidden rounded-[19px] bg-white p-4',
        !isOrganizer && 'rounded-[20px] border border-[#A8A8A8]/20',
      )}
    >
      {/* The organizer row's warm/mint wash — two blurred discs in the Figma. */}
      {isOrganizer && (
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

      <span className="relative flex min-w-0 items-center gap-4">
        <MemberAvatar />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-heading text-[16px] font-medium leading-[1.21] text-[#000000]">
            {member.display_name}
            {member.is_self && ' (You)'}
          </span>
          {member.pet_summary && (
            <span className={cn(LABEL_12, 'text-[#000000]/60')}>{member.pet_summary}</span>
          )}
        </span>
      </span>

      <span
        className={cn(
          'relative inline-flex shrink-0 items-center rounded-[8px] border px-3 py-2.5 text-center font-sans text-[12px] font-medium uppercase leading-none tracking-[0.5px]',
          isOrganizer
            ? 'border-[#84EBB4] bg-[#1FC16B]/10 text-[#109A51]'
            : 'border-[#98C3E1] bg-[#CFE3F1]/40 text-[#112D7C]',
        )}
      >
        {isOrganizer ? 'Group Organizer.' : 'Joiner'}
      </span>
    </div>
  )

  // Organizer row carries a 1px gradient edge, so it needs a padded wrapper.
  return isOrganizer ? (
    <li className="rounded-[20px] bg-[linear-gradient(90deg,#D3A26D_0%,#3EAF72_100%)] p-px">
      {body}
    </li>
  ) : (
    <li>{body}</li>
  )
}

function TimelineStepper({ current }: { current: GroupStatus }) {
  const currentIndex = TIMELINE_STEPS.findIndex((s) => s.status === current)

  return (
    <ol className="flex items-start gap-[3px] px-2 pb-1.5">
      {TIMELINE_STEPS.map((step, i) => {
        const isDone = i < currentIndex
        const isCurrent = i === currentIndex

        return (
          <li key={step.status} className="contents">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  // Connector i sits between step i-1 and step i: green once
                  // crossed, navy for the leg out of the current step.
                  'mt-[14px] h-px min-w-2 flex-1',
                  i <= currentIndex
                    ? 'bg-[#109A51]'
                    : i === currentIndex + 1
                      ? 'bg-[#112D7C]'
                      : 'bg-[#CFE3F1]',
                )}
              />
            )}
            <div className="flex w-[38px] shrink-0 flex-col items-center gap-[7px]">
              {isDone ? (
                <span className="flex size-[30px] items-center justify-center rounded-full bg-[#109A51] text-white">
                  <Icon name="check" size={16} />
                </span>
              ) : isCurrent ? (
                <span className="flex size-[30px] items-center justify-center rounded-full border border-[#112D7C] p-[2px]">
                  <span className="flex size-full items-center justify-center rounded-full bg-[#112D7C] font-sans text-[12px] font-medium text-white">
                    {i + 1}
                  </span>
                </span>
              ) : (
                <span className="flex size-[30px] items-center justify-center rounded-full bg-[#CFE3F1] font-sans text-[12px] font-medium text-[#000000]">
                  {i + 1}
                </span>
              )}
              <span
                className={cn(
                  'text-center font-sans text-[11px] leading-[1.33] lg:text-[12px]',
                  isCurrent ? 'font-medium text-[#000000]' : 'font-normal text-[#6D6D6D]',
                )}
              >
                {step.label}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function TripDetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-5">
      <span className={cn(LABEL_12, 'shrink-0 text-[#080B2B]/60')}>{label}</span>
      <span className="min-w-0 text-right font-heading text-[16px] font-medium leading-normal text-[#000000]">
        {children}
      </span>
    </div>
  )
}

/* -------------------------------------------------------------------- view */

export function GroupDetailView({
  group,
  viewerRole,
  groupStatus,
}: GroupDetailViewComponentProps) {
  const [copied, setCopied] = useState(false)

  const isOrganizer = viewerRole === 'organizer'
  const flight = group.flight
  const memberCount = group.members.length
  const spacesRemaining = Math.max(0, flight.spaces_total - memberCount)
  const isFull = spacesRemaining === 0
  const pct = flight.spaces_total > 0 ? Math.round((memberCount / flight.spaces_total) * 100) : 0

  const shareHref = `https://${group.share_url.replace(/^https?:\/\//, '')}`
  const shareText = `Join my shared flight ${flight.route_origin_city} to ${flight.route_destination_city} — ${shareHref}`

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareHref)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard is blocked (insecure origin or denied permission). The link
      // stays selectable in the input, so there is still a way to copy it.
      setCopied(false)
    }
  }

  // A code shows only when a specific airport was locked. City-derived codes are
  // routing placeholders that change when the carrier is booked, so a city
  // travels on its own. Client decision, 2026-09-07.
  const origin = flight.route_origin_code
    ? `${flight.route_origin_city} (${flight.route_origin_code})`
    : flight.route_origin_city
  const destination = flight.route_destination_code
    ? `${flight.route_destination_city} (${flight.route_destination_code})`
    : flight.route_destination_city

  const statusPill = (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-[8px] border px-3 py-2.5 font-sans text-[12px] font-medium uppercase leading-none tracking-[0.5px]',
        STATUS_PILL[groupStatus],
      )}
    >
      {STATUS_LABEL[groupStatus]}
    </span>
  )

  /* ------------------------------------------------------------ main column */

  const main = (
    <>
      {/* Members */}
      <section className={MAIN_CARD}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={HEADING}>Members</h2>
          {/* Once full the count is no longer an estimate, and the frames say so. */}
          <p className="font-sans text-[14px] font-medium leading-[1.3] text-[#000000]">
            {isFull
              ? `${memberCount} of ${flight.spaces_total} members · group locked`
              : `${memberCount} of estimated ${flight.spaces_total} members`}
          </p>
        </div>
        <ul className="mt-4 flex flex-col gap-1.5">
          {group.members.map((member) => (
            <MemberRow key={member.user_id} member={member} />
          ))}
        </ul>
        {/* Only the organiser can invite, and only while there is room. */}
        {isOrganizer && !isFull && (
          <button
            type="button"
            className="mt-1.5 w-full rounded-[20px] border border-dashed border-[#112D7C]/45 bg-[#EFF4FA] px-4 py-3.5 text-center font-sans text-[14px] font-medium text-[#112D7C] transition-colors hover:bg-[#E4EDF7] focus-ring"
          >
            + Invite someone directly
          </button>
        )}
      </section>

      {/* Group Progress */}
      <section className={MAIN_CARD}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={HEADING}>Group Progress</h2>
          <p className="font-sans text-[14px] font-bold leading-[1.3] text-[#000000]">
            {memberCount} of {flight.spaces_total} spaces filled
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2.5">
          <div className="h-5 w-full overflow-hidden rounded-[60px] bg-[#112D7C]/10">
            <div
              className="h-full rounded-[60px] bg-[#112D7C] transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-sans text-[14px] font-bold leading-[1.3] text-[#000000]">
              {memberCount}/ {flight.spaces_total} members
            </span>
            <span className="font-sans text-[14px] font-normal leading-[1.3] text-[#000000]">
              {pct}% FILLED
            </span>
          </div>
        </div>

        {/* The organiser gets the same line whatever the count; a joiner is told
            how many more are needed. Both are verbatim from the frames. */}
        <p className="mt-3.5 font-sans text-[14px] font-medium leading-[1.3] text-[#000000]/70">
          {isOrganizer
            ? 'When the group fills, we lock in the aircraft and confirm the flight.'
            : isFull
              ? 'The group is full. We are locking the aircraft and requesting operator quotes.'
              : spacesRemaining === 1
                ? "One more member and we'll lock in the aircraft and request operator quotes."
                : `${spacesRemaining} more members and we'll lock in the aircraft and request operator quotes.`}
        </p>
      </section>

      {/* Help fill this group — only while there are spaces left to fill. */}
      {!isFull && (
        <section className={MAIN_CARD}>
          <div className="flex flex-col gap-1.5">
            <h2 className={HEADING}>
              {isOrganizer ? 'Share Your Trip' : 'Help fill this group'}
            </h2>
            <p className="font-sans text-[14px] font-medium leading-[1.3] text-[#000000]/70">
              {isOrganizer
                ? 'Get more members in the group'
                : 'Your group needs more members. Share the link.'}
            </p>
          </div>

          <div className="mt-[18px] flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-4">
                <input
                  readOnly
                  value={group.share_url}
                  aria-label="Share link"
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded-[12px] border border-[#1A45BD] bg-white px-[14px] py-3 font-sans text-[14px] font-medium leading-4 text-[#000000] focus-ring"
                />
                <button
                  type="button"
                  onClick={copyShareLink}
                  aria-label={copied ? 'Link copied' : 'Copy share link'}
                  className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#000000] text-white transition-colors hover:bg-[#101114] focus-ring"
                >
                  <Icon name={copied ? 'check' : 'copy'} size={18} />
                </button>
              </div>
              {/* The organiser frame carries no hint under the input; only the
                  copy confirmation appears there. */}
              {(copied || !isOrganizer) && (
                <p className="mt-2 font-sans text-[12px] font-medium italic leading-[1.3] text-[#000000]/60">
                  {copied
                    ? 'Link copied to your clipboard.'
                    : spacesRemaining === 1
                      ? 'Almost there. One more member to fill the group.'
                      : `${spacesRemaining} more members to fill the group.`}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <a
                href={`sms:?&body=${encodeURIComponent(shareText)}`}
                className={cn(SECONDARY_BTN, 'min-w-0 flex-1 px-2 sm:px-[14px]')}
              >
                <Icon name="message" size={18} />
                <span>
                  iMessage
                  {!isOrganizer && <span className="hidden sm:inline">·SMS</span>}
                </span>
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent('Join my shared flight')}&body=${encodeURIComponent(shareText)}`}
                className={cn(SECONDARY_BTN, 'min-w-0 flex-1 px-2 sm:px-[14px]')}
              >
                <Icon name="mail" size={18} />
                Email
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(SECONDARY_BTN, 'min-w-0 flex-1 px-2 sm:px-[14px]')}
              >
                <Icon name="whatsapp" size={18} />
                WhatsApp
              </a>
            </div>

            {/* Share card preview — what the link unfurls to in a message. */}
            <div className="flex flex-col gap-1.5 lg:flex-row lg:items-stretch">
              <div className="rounded-[10px] bg-[linear-gradient(122deg,#1946C5_0%,#E96A6F_84%)] p-px lg:w-[60%]">
                {/* A container, so the route below scales to THIS card rather
                    than to the viewport — the card is only 60% of the column,
                    so a viewport-based size overflows it between lg and xl. */}
                <div
                  className="relative h-full overflow-hidden rounded-[9px] bg-white p-4"
                  style={{ containerType: 'inline-size' }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-16 left-0 h-64 w-[110%] rounded-full bg-[radial-gradient(circle_at_1%_16%,#1946C5_0%,#FFFFFF_24%,#E96A6F_100%)] opacity-[0.13] blur-[40px]"
                  />
                  <div className="relative flex flex-col gap-5">
                    <div className="flex flex-col gap-2.5">
                      <p
                        className={cn(
                          LABEL_12,
                          'flex items-center gap-1.5 uppercase text-[#080B2B]/60',
                        )}
                      >
                        Upcoming Shared Flight
                        <span aria-hidden="true" className="size-0.5 rounded-full bg-[#000000]" />
                        {new Date(flight.departure_date).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                          timeZone: 'UTC',
                        })}
                      </p>
                      <RouteLine
                        from={origin}
                        to={destination}
                        iconSize="clamp(12px,4cqw,24px)"
                        className="font-heading text-[clamp(0.7rem,4.4cqw,1.125rem)] font-medium leading-[1.33] text-[#000000]"
                      />
                    </div>
                    <a
                      href={shareHref}
                      className="inline-flex h-10 w-fit items-center gap-2 rounded-[12px] bg-[#000000] px-[14px] font-sans text-[14px] font-medium leading-4 text-white transition-colors hover:bg-[#101114] focus-ring"
                    >
                      Join Us!
                      <Icon name="arrow-right" size={18} />
                    </a>
                    <p className="font-sans text-[14px] font-medium leading-[1.3] text-[#112D7C]">
                      {group.share_url}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 px-2.5 py-[15px] lg:flex-1">
                <h3 className="font-heading text-[18px] font-medium leading-[1.33] text-[#000000]">
                  Share card preview
                </h3>
                <p className="font-sans text-[14px] font-medium leading-[1.3] text-[#000000]/70">
                  This is the card that previews in messaging apps and texts. Tap the thumbnail to
                  download a PNG copy for offline sharing.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Group Timeline */}
      <section className={MAIN_CARD}>
        <div className="flex flex-col gap-1.5">
          <h2 className={HEADING}>Group Timeline</h2>
          <p className="font-sans text-[14px] font-medium leading-[1.3] text-[#000000]/70">
            Current state and next steps
          </p>
        </div>

        {/* The seven steps do not compress below ~640px, so the stepper scrolls
            inside the card rather than forcing the page to scroll sideways. */}
        <div className="mt-[18px] -mx-1 overflow-x-auto">
          <div className="min-w-[400px] px-1">
            <TimelineStepper current={groupStatus} />
          </div>
        </div>

        <div className="mt-[18px] flex gap-2 rounded-[12px] bg-[#CFE3F1]/30 p-3">
          <Icon name="info" size={16} className="mt-0.5 shrink-0 text-[#112D7C]" />
          <div className="flex flex-col gap-1">
            <p className="font-sans text-[12px] font-semibold uppercase leading-[1.33] text-[#112D7C]">
              Next step:
            </p>
            <p className="font-sans text-[14px] font-normal leading-[1.15] text-[#112D7C]">
              {nextStepCopy(groupStatus, spacesRemaining)}
            </p>
          </div>
        </div>
      </section>

      {/* Bottom actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* The organizer cancels the whole flight; a joiner only leaves it.
            Frames 61 and 63 differ on this button alone. */}
        <button
          type="button"
          className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[#D0D0D0] bg-[#F5F5F5] px-[14px] font-sans text-[14px] font-medium leading-4 text-[#000000] transition-colors hover:bg-[#EDEDED] focus-ring"
        >
          {isOrganizer ? 'Cancel Flight' : 'Leave this group'}
        </button>
        <a
          href="/dashboard"
          className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#000000] px-[14px] font-sans text-[14px] font-medium leading-[1.4] text-white transition-colors hover:bg-[#101114] focus-ring"
        >
          Go to My Dashboard
          <Icon name="arrow-right" size={18} />
        </a>
      </div>
    </>
  )

  /* ------------------------------------------------------------------- rail */

  const aside = (
    <>
      <SidePanel title="Trip Details">
        <div className="flex flex-col gap-3">
          <TripDetailRow label="ROUTE">
            <RouteLine
              from={flight.route_origin_city}
              to={flight.route_destination_city}
              iconSize={24}
              className="justify-end"
            />
          </TripDetailRow>
          <TripDetailRow label="DATE">{formatLongDate(flight.departure_date)}</TripDetailRow>
          <TripDetailRow label="AIRCRAFT">{flight.aircraft_category}</TripDetailRow>
          <TripDetailRow label="PETS">
            {flight.pet_friendly ? 'Allowed (cabin)' : 'Not on this flight'}
          </TripDetailRow>
          <TripDetailRow label="TRAVELERS">
            {travelerSummary(group.viewer_travelers.length, group.viewer_pets.length)}
          </TripDetailRow>

          <hr className="border-0 border-t border-[#A8A8A8]/40" />

          <div className="flex items-start justify-between gap-5">
            <span className={cn(LABEL_12, 'shrink-0 text-[#112D7C]/60')}>COST</span>
            <span className="font-heading text-[16px] font-medium leading-normal text-[#112D7C]">
              Estimate Pending
            </span>
          </div>
        </div>
      </SidePanel>

      {/* The organiser frames carry no travellers card — the organiser manages
          the group, not their own party, on this screen. */}
      {!isOrganizer && (
      <SidePanel title="Your travelers and pets">
        <div className="flex flex-col gap-3.5">
          <p className="font-sans text-[14px] font-medium leading-[1.1] text-[#6D6D6D]">
            You&rsquo;re traveling as Member {group.viewer_member_ordinal}.
          </p>

          {group.viewer_travelers.map((traveler) => (
            <div key={traveler.name} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-4">
                <MemberAvatar />
                <span className="truncate font-heading text-[16px] font-medium leading-[1.21] text-[#000000]">
                  {traveler.name}
                </span>
              </span>
              {traveler.is_primary && (
                <span className="inline-flex shrink-0 items-center rounded-[7px] border border-[#E5E5E5] bg-[#EFEFEF]/85 px-2.5 py-2 font-sans text-[10px] font-medium uppercase leading-none tracking-[0.5px] text-[#090909]">
                  Primary
                </span>
              )}
            </div>
          ))}

          {group.viewer_pets.map((pet) => (
            <div key={pet.name} className="flex items-center gap-4">
              <MemberAvatar />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-heading text-[16px] font-medium leading-[1.21] text-[#000000]">
                  {pet.name}
                </span>
                <span className={cn(LABEL_12, 'text-[#000000]/60')}>{pet.detail}</span>
              </span>
            </div>
          ))}

          <a href="/dashboard" className={cn(SECONDARY_BTN, 'w-fit')}>
            Edit travelers and pets in Dashboard
            <Icon name="arrow-right" size={18} />
          </a>
        </div>
      </SidePanel>
      )}

      {/* Nothing populates the feed until an inbound event does; an empty card
          reads as broken, so it stays out until there is something to show. */}
      {group.activity.length > 0 && (
        <SidePanel title="Recent Activity">
        <ul className="flex flex-col gap-3">
          {group.activity.map((item) => (
            <li key={item.label} className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-[7px] size-2.5 shrink-0 rounded-full bg-[#000000]"
              />
              <span className="flex min-w-0 flex-col gap-[9px]">
                <span className="font-sans text-[16px] font-medium leading-[1.21] text-[#000000]">
                  {item.label}
                </span>
                <span className="font-sans text-[13px] font-medium leading-[1.1] text-[#6D6D6D]">
                  {item.occurred_label}
                </span>
              </span>
            </li>
          ))}
        </ul>
        </SidePanel>
      )}

      {/* Same card, different message per role: a joiner is told they can leave,
          an organiser that a live group is edited through support. The organiser
          frame links inline rather than offering a button. */}
      <SidePanel title="Need to make changes?" collapsible={false} defaultOpen>
        {isOrganizer ? (
          <p className="font-sans text-[16px] font-medium leading-normal text-[#000000]/70">
            Group Organizers can&rsquo;t edit a live group directly.{' '}
            <a
              href="/contact"
              className="font-semibold text-[#112D7C] underline underline-offset-2 focus-ring"
            >
              Contact support
            </a>{' '}
            and we&rsquo;ll update the route, date, or pet manifest for you.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="font-sans text-[16px] font-medium leading-normal text-[#000000]/70">
              Members can leave the group anytime before the flight is Confirmed. After that,
              contact support to make changes.
            </p>
            <a href="/contact" className={cn(SECONDARY_BTN, 'w-fit')}>
              Contact support
              <Icon name="arrow-right" size={18} />
            </a>
          </div>
        )}
      </SidePanel>
    </>
  )

  /* ------------------------------------------------------------------ shell */

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[30px] px-4 py-6 sm:px-6 lg:px-[50px] lg:py-8">
      {/* Hero */}
      <section className={cn(CARD, 'relative overflow-hidden bg-white')}>
        <span
          aria-hidden="true"
          className={cn('pointer-events-none absolute inset-0', HERO_GLOW[groupStatus])}
        />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p
              className={cn(
                'font-sans text-[12px] font-medium uppercase leading-[1.21]',
                EYEBROW_TONE[groupStatus],
              )}
            >
              Group ID · {group.group_id} · You are{' '}
              {isOrganizer ? 'Group Organizer.' : 'Joiner'}
            </p>
            <RouteLine
              from={origin}
              to={destination}
              iconSize="clamp(14px,3.4vw,31px)"
              className="font-heading text-[clamp(0.75rem,3.7vw,1.375rem)] font-semibold leading-[1.21] text-[#000000]"
            />
            {/* The pill rides at the end of this line on mobile and moves to the
                card's right on desktop. No `flex-wrap`: the text shrinks inside
                itself so the pill keeps its place instead of dropping below. */}
            <div className="flex items-center justify-between gap-x-3">
              <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 font-sans text-[16px] font-medium leading-normal text-[#000000]">
                <span>{formatLongDate(flight.departure_date)}</span>
                <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-[#000000]" />
                <span>{flight.aircraft_category}</span>
                {flight.pet_friendly && (
                  <>
                    <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-[#000000]" />
                    <span className="inline-flex items-center gap-2">
                      Pets welcome
                      <PawPrints height={15} />
                    </span>
                  </>
                )}
              </p>
              <span className="shrink-0 lg:hidden">{statusPill}</span>
            </div>
          </div>
          <span className="hidden shrink-0 lg:block">{statusPill}</span>
        </div>
      </section>

      {/* Body — rail leads on mobile, sits right on desktop. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,750fr)_minmax(0,570fr)] lg:items-start lg:gap-5">
        <aside className="order-1 flex flex-col gap-3 lg:order-none lg:col-start-2 lg:row-start-1 lg:gap-5">
          {aside}
        </aside>
        <div className="order-2 flex flex-col gap-6 lg:order-none lg:col-start-1 lg:row-start-1">
          {main}
        </div>
      </div>
    </div>
  )
}
