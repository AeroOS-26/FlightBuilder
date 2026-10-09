/**
 * Frame 45 · Request Approved — the participant's own view of the group.
 *
 * Built from the frame (`4034:40006`) on 2026-10-08. The previous attempt was a
 * banner laid on top of `GroupDetailView`, on the strength of the frame's line
 * "This is the normal participant view of the group". That line describes the
 * *state* — you are an ordinary participant now, not a pending requester — not
 * the layout. The frame draws a whole screen: an 804 column with its own hero,
 * a dashed confirmation callout, the route band, a six-row detail card, the
 * roster, what follows, and two controls. None of that is `GroupDetailView`,
 * which is a two-column dashboard, so the screen never appeared.
 *
 * It replaces that page for a joiner whose own request was approved, while the
 * approval flow is on. Not for the organiser (47/49), not for a member who
 * joined before approvals existed and therefore has no request — they keep the
 * page they have always had.
 *
 * Deliberate departures from the frame, both of them frame slips:
 *
 *  - "What happens next" draws four rows, the last two both numbered **3**.
 *    The fourth is the same trailing line frame 49 keeps outside its list, so
 *    it is a note here too rather than a step the group takes.
 *  - Three of the five roster rows carry a solid red **"Required"** chip, which
 *    is the badge component's default label and not content. Only the organiser
 *    and the viewer are badged.
 */

import Link from 'next/link'
import { Icon } from '@/components/common'
import { DashedOutline } from '@/components/ui'
import { aircraftRowValue, metroLabel, readableDate } from '@/features/public-flight/format'
import {
  AVATAR,
  ORGANISER_BADGE,
  ParticipantRow,
  ROW_BODY,
  STATUS_IN_GROUP,
  STATUS_IN_GROUP_ORGANISER,
  VIEWER_BADGE,
  initialsOf,
} from './ParticipantRow'
import {
  FOOTER_ITEM,
  FOOTER_PRIMARY,
  FOOTER_ROW,
  FOOTER_SECONDARY,
  SUMMARY_LABEL,
  SUMMARY_VALUE,
} from './approvalChrome'
import { RouteBand } from './RouteBand'
import type { GroupDetailView } from '@/types'
import type { ReactNode } from 'react'

const SHELL = 'mx-auto flex w-full max-w-[804px] flex-col gap-[30px] px-4 py-8 sm:px-6'
/** The outer panel. 24px radius over a 60% white with an `#A8A8A8/20` hairline. */
const PANEL = 'flex flex-col gap-4 rounded-[24px] border border-[#A8A8A8]/20 bg-white/60 p-4'
/** A solid white card inside it: 20px radius, a heavier hairline. */
const CARD = 'rounded-[20px] border border-[#A8A8A8]/40 bg-white p-4'
const EYEBROW =
  'inline-flex w-fit items-center rounded-[8px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-3 py-2.5 font-sans text-[12px] font-medium uppercase leading-none tracking-[0.5px] text-[#112D7C]'
/**
 * Green, where 43 and 44 are amber. Waiting and arriving are different signals
 * and the frames colour them apart.
 */
const TAG_PARTICIPANT =
  'inline-flex shrink-0 items-center rounded-[7px] border border-[#84EBB4] bg-[#1FC16B]/10 px-2.5 py-[9px] font-sans text-[10px] font-medium uppercase leading-none tracking-[0.5px] text-[#109A51]'

/** The three steps between a full group and a confirmed flight. */
const WHAT_HAPPENS_NEXT = [
  'Operator quotes are requested.',
  'The group approves a quote.',
  'Each participant pays their contribution toward the total charter price, until the group is fully funded.',
]

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <dt className={SUMMARY_LABEL}>{label}</dt>
      <dd className={SUMMARY_VALUE}>{children}</dd>
    </div>
  )
}

export function ApprovedParticipantView({ group }: { group: GroupDetailView }) {
  const total = group.flight.spaces_total
  const occupied = Math.max(0, total - group.flight.spaces_remaining)
  const self = group.members.find((member) => member.is_self) ?? null

  return (
    <div className={SHELL}>
      {/* Hero */}
      <section className="flex flex-col gap-1">
        <span className={EYEBROW}>Flight Club · Shared Flight</span>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-[24px] font-medium text-[#000000] lg:text-[32px]">
            You are in the group
          </h1>
          <span className={TAG_PARTICIPANT}>Participant</span>
        </div>
        <p className="font-sans text-[14px] font-medium leading-[1.5] text-[#000000]">
          Your request came through. This is the normal participant view of the group.
        </p>
      </section>

      {/* The confirmation. Dashed and green, the same 8/8 stroke frame 44 puts
          round "Not available yet" — the two are the same component in a
          different colour. */}
      <section className="relative overflow-visible rounded-[16px] bg-[#1FC16B]/10 p-4">
        <DashedOutline dash="8 8" stroke="#109A51" />
        <p className={SUMMARY_LABEL}>Confirmation</p>
        <h2 className="mt-2.5 font-heading text-[20px] font-medium text-[#000000]">
          Your join request was approved
        </h2>
        <p className="mt-4 font-sans text-[14px] leading-[1.45] text-[#000000]">
          You are in the group and your {self && self.places > 1 ? 'places are' : 'place is'}{' '}
          counted. The flight itself is not confirmed yet. Operator quotes come next, and we will
          email you when there is something to review.
        </p>
      </section>

      <section className={PANEL}>
        <RouteBand
          originCode={group.flight.route_origin_code ?? metroLabel(group.flight.route_origin_city)}
          originCity={metroLabel(group.flight.route_origin_city)}
          destinationCode={
            group.flight.route_destination_code ?? metroLabel(group.flight.route_destination_city)
          }
          destinationCity={metroLabel(group.flight.route_destination_city)}
        />

        <dl className={`flex flex-col gap-[18px] ${CARD}`}>
          <Row label="Departure">{readableDate(group.flight.departure_date)}</Row>
          <Row label="Aircraft class">{aircraftRowValue(group.flight.aircraft_category)}</Row>
          <Row label="Group Organizer">{group.organizer_name}</Row>
          {/* People, not rows — a party of three is one roster entry holding
              three places. See migration 0007 and §19. */}
          <Row label="Participants">
            {occupied} of {total} people
          </Row>
          {self && (
            <Row label="Your place">
              {plural(self.places, 'place')} · joined {readableDate(self.joined_at)}
            </Row>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className={SUMMARY_LABEL}>Status</dt>
            <dd>
              <span className={TAG_PARTICIPANT}>Participant</span>
            </dd>
          </div>
        </dl>

        {/* The roster, which is the thing a pending requester could not see. */}
        <div className="flex flex-col gap-4">
          <h2 className="font-heading text-[20px] font-semibold text-[#000000]">
            Group Membership
          </h2>
          <ul className="flex flex-col gap-2.5">
            {group.members.map((member) => {
              const isOrganiser = member.role === 'organizer'
              return (
                <ParticipantRow key={member.user_id} isOrganiser={isOrganiser}>
                  <span className={AVATAR} aria-hidden="true">
                    {initialsOf(member.display_name)}
                  </span>
                  <span className={ROW_BODY}>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-[16px] font-medium leading-[1.21] text-[#000000]">
                        {member.display_name}
                      </span>
                      {isOrganiser && <span className={ORGANISER_BADGE}>Group Organizer</span>}
                      {member.is_self && <span className={VIEWER_BADGE}>You</span>}
                    </span>
                    <span className="block font-sans text-[12px] font-medium text-[#000000]/60">
                      {plural(member.places, 'traveller')} ·{' '}
                      {member.pet_count > 0 ? plural(member.pet_count, 'pet') : 'No pets'} ·{' '}
                      {plural(member.places, 'place')}
                      {member.is_self ? ` · Joined ${readableDate(member.joined_at)}` : ''}
                    </span>
                  </span>
                  <span className={isOrganiser ? STATUS_IN_GROUP_ORGANISER : STATUS_IN_GROUP}>
                    In the group
                  </span>
                </ParticipantRow>
              )
            })}
          </ul>
        </div>
      </section>

      {/* What follows. Its own card on the frame, outside the panel above. */}
      <section className={CARD}>
        <h2 className="font-heading text-[20px] font-medium text-[#000000]">What happens next</h2>
        <ol className="mt-4 flex flex-col gap-3">
          {WHAT_HAPPENS_NEXT.map((step, index) => (
            <li key={step} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex size-[26px] shrink-0 items-center justify-center rounded-full border border-[#CFE3F1] bg-[#CFE3F1]/40 font-sans text-[12px] font-medium text-[#080B2B]"
              >
                {index + 1}
              </span>
              <span className="font-sans text-[16px] leading-[1.5] text-[#000000]">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 font-sans text-[16px] leading-[1.5] text-[#000000]">
          The flight is confirmed only once the operator commits.
        </p>
      </section>

      <div className={FOOTER_ROW}>
        {/* Both controls are drawn on the frame; neither has a page behind it
            yet. Same position as frames 43 and 44 — see the note there. */}
        <Link href="/complete-profile" className={`${FOOTER_SECONDARY} ${FOOTER_ITEM}`}>
          Manage My Travelers
        </Link>
        <Link href="/dashboard" className={`${FOOTER_PRIMARY} ${FOOTER_ITEM}`}>
          Go To My Dashboard
          <Icon name="arrow-right" className="size-[18px]" />
        </Link>
      </div>
    </div>
  )
}
