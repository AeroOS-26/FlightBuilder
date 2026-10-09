/**
 * Frame 49 · Approved, Group Full — the organiser's view once their approval
 * took the last place.
 *
 * This is the organiser's screen, not the requester's: the eyebrow reads "Group
 * Organizer" and the copy is written to them ("You approved the request that
 * took the last place"). It replaces frame 47 on the group page while the group
 * is full, because there is nothing left to approve and the point of the screen
 * becomes what just happened and what follows.
 *
 * Capacity is in people throughout, and each participant row says how many
 * places it holds — the design is explicit about that ("2 traveller … 2
 * places"), because a party of two is one row and the roster would otherwise
 * draw five rows under "6 of 6 people".
 *
 * Lapsed requests are reported here as something that happened rather than
 * something the organiser did. Nothing is asked of them, and the requester has
 * already been told.
 */

import Link from 'next/link'
import { cn } from '@/utils/cn'
import { metroLabel, readableDate } from '@/features/public-flight/format'
import {
  AVATAR,
  ORGANISER_BADGE,
  ParticipantRow,
  ROW_BODY,
  STATUS_IN_GROUP,
  STATUS_IN_GROUP_ORGANISER,
  initialsOf,
} from './ParticipantRow'
import type { GroupDetailView } from '@/types'

interface GroupFullOrganiserViewProps {
  group: GroupDetailView
  /** Who took the last place. Null if the fill cannot be attributed to a request. */
  filledBy: string | null
  /** Everyone the fill closed out, named. */
  lapsed: string[]
}

/**
 * The shape is shared; the colours are not composed on top of it.
 *
 * `cn` in this codebase is a plain joiner, not a Tailwind merger, so
 * `cn(CARD, 'bg-[#1FC16B]/10')` leaves both `bg-white` and the tint on the
 * element and the one later in the stylesheet wins — silently, and `bg-white`
 * is the one that wins. Variants therefore state their own border and
 * background rather than overriding CARD's.
 */
const CARD_SHAPE = 'rounded-[16px] p-4 lg:p-5'
const CARD = `${CARD_SHAPE} border border-[#CDCDCD] bg-white`
/** The "what just happened" card, tinted to match the Full pill above it. */
const CARD_SUCCESS = `${CARD_SHAPE} border border-[#84EBB4] bg-[#1FC16B]/10`

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

/** The three steps between a full group and a confirmed flight. */
const WHAT_HAPPENS_NEXT = [
  'Operator quotes are requested.',
  'The group approves a quote.',
  'Each participant pays their contribution toward the total charter price, until the group is fully funded.',
]

export function GroupFullOrganiserView({ group, filledBy, lapsed }: GroupFullOrganiserViewProps) {
  const total = group.flight.spaces_total
  const route = `${metroLabel(group.flight.route_origin_city)} to ${metroLabel(group.flight.route_destination_city)}`

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-[50px]">
      {/* Hero */}
      <section className="flex flex-col gap-3">
        <p className="font-sans text-[12px] font-semibold uppercase tracking-[0.5px] text-[#112D7C]">
          Flight Club · Group Organizer
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-[24px] font-medium text-[#000000] lg:text-[32px]">
            Your group is full
          </h1>
          <span className="inline-flex shrink-0 items-center rounded-[8px] border border-[#84EBB4] bg-[#1FC16B]/10 px-3 py-1.5 font-sans text-[12px] font-medium uppercase tracking-[0.5px] text-[#109A51]">
            Full
          </span>
        </div>
        <p className="font-sans text-[14px] leading-[1.5] text-[#000000]/70">
          {route} · {readableDate(group.flight.departure_date)}.{' '}
          {filledBy
            ? 'You approved the request that took the last place, so the group is closed to new requests.'
            : 'Every place is taken, so the group is closed to new requests.'}
        </p>
      </section>

      {/*
        What just happened. Only when the fill can be attributed to an approval
        — on a group filled another way there is nothing to report.
      */}
      {filledBy && (
        <section className={CARD_SUCCESS}>
          <h2 className="font-heading text-[18px] font-medium text-[#000000]">
            You approved a request
          </h2>
          <p className="mt-1.5 font-sans text-[14px] leading-[1.5] text-[#000000]">
            {filledBy} is in the group, and that was the last place.
          </p>
          <p className="mt-2 font-sans text-[14px] leading-[1.55] text-[#000000]/70">
            {total} of {total} places are taken. Next, operator quotes are requested. The flight is
            not confirmed yet.
          </p>
        </section>
      )}

      {/* Capacity */}
      <section className={CARD}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-[18px] font-medium text-[#000000]">Group Membership</h2>
          <span className="font-sans text-[14px] text-[#000000]/70">No open places</span>
        </div>
        <p className="mt-2 font-heading text-[22px] font-medium text-[#000000]">
          {total} of {total} <span className="text-[16px] font-normal">participants</span>
        </p>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#E9EEF6]">
          <div className="h-full w-full rounded-full bg-[#112D7C]" />
        </div>
        <p className="mt-1 font-sans text-[13px] leading-[1.5] text-[#000000]/70">
          Capacity counts people. New join requests are not accepted while the group is full.
        </p>
      </section>

      {/* The roster */}
      <section className={CARD}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-[18px] font-medium text-[#000000]">Participants</h2>
          <span className="font-sans text-[13px] text-[#000000]/60">
            {total} of {total} people
          </span>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
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
                <span className="block font-sans text-[12px] text-[#000000]/60">
                  {/* Travellers and places are the same number — one place per
                      traveller — but the design states both, because one
                      answers "who is coming" and the other "what it costs the
                      group's capacity". */}
                  {plural(member.places, 'traveller')} ·{' '}
                  {member.pet_count > 0 ? plural(member.pet_count, 'pet') : 'No pets'} ·{' '}
                  {plural(member.places, 'place')}
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
        </ul>
      </section>

      {/* Lapsed requests. Reported, not actioned. */}
      {lapsed.length > 0 && (
        <section className={CARD}>
          <h2 className="font-heading text-[18px] font-medium text-[#000000]">
            {lapsed.length === 1 ? 'Request that lapsed' : 'Requests that lapsed'}
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {lapsed.map((name, index) => (
              <li
                key={`${name}-${index}`}
                className="font-sans text-[14px] leading-[1.55] text-[#000000]/70"
              >
                {name}&rsquo;s request lapsed automatically when the group filled. Nothing is needed
                from you, and they have been notified.
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* What follows */}
      <section className={CARD}>
        <h2 className="font-heading text-[18px] font-medium text-[#000000]">What happens next</h2>
        <ol className="mt-3 flex flex-col gap-2.5">
          {WHAT_HAPPENS_NEXT.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EEF3FA] font-sans text-[12px] font-semibold text-[#112D7C]"
              >
                {index + 1}
              </span>
              <span className="font-sans text-[14px] leading-[1.55] text-[#000000]/80">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 font-sans text-[13px] leading-[1.5] text-[#000000]/60">
          The flight is confirmed only once the operator commits.
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/share/${encodeURIComponent(group.group_id)}?preview=1`}
          className="inline-flex items-center font-sans text-[14px] font-medium text-[#112D7C] underline underline-offset-2 focus-ring"
        >
          See what the public page shows
        </Link>
      </div>
    </div>
  )
}
