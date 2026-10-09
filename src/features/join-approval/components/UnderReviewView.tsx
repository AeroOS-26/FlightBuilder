/**
 * Frame 44 · Under review — the group as someone still waiting on it sees it.
 *
 * The shape of this screen is a privacy decision, not a layout one. A pending
 * requester is not in the group, so they get the flight's own facts and the
 * counts, and nothing that identifies the people in it. The frame says so
 * outright: "You will see who is in the group once your request is approved."
 *
 * Rebuilt against the frame on 2026-10-08 (`4034:39534`, pulled over the Figma
 * REST API). What had been missing or guessed:
 *
 *  - the route band, which the frame opens the panel with;
 *  - the Group Membership row — an avatar and two lines inside its own bordered
 *    cell, not a count floated against the heading;
 *  - the "Not available yet" heading, and the 8/8 dash on the box around it;
 *  - rule lines between the detail rows, which the frame does not have;
 *  - label and value type: Inter Tight 14/500 uppercase `#080B2B` against Inter
 *    Display 18/500 black, where the build had 12px grey against 16px.
 *
 * One thing the frame draws that is deliberately absent: the activity feed. It
 * lists what participants have done, to someone who is not one. Counts are not
 * identities; a feed is.
 *
 * And the aircraft row follows the locked copy rather than the frame's "Light
 * Jet": nothing is named until an operator commits.
 */

import Link from 'next/link'
import { Icon } from '@/components/common'
import { MEMBER_AREA_ENABLED } from '@/config/features'
import { DashedOutline } from '@/components/ui'
import { aircraftRowValue, metroLabel, readableDate } from '@/features/public-flight/format'
import {
  FOOTER_ITEM,
  FOOTER_PRIMARY,
  FOOTER_ROW,
  FOOTER_SECONDARY,
  SUMMARY_LABEL,
  SUMMARY_VALUE,
  TAG_WAITING,
} from './approvalChrome'
import { RouteBand } from './RouteBand'
import type { ReactNode } from 'react'

const SHELL = 'mx-auto flex w-full max-w-[804px] flex-col gap-[30px] px-4 py-8 sm:px-6'
/** The outer panel. 24px radius over a 60% white with an `#A8A8A8/20` hairline. */
const PANEL = 'flex flex-col gap-4 rounded-[24px] border border-[#A8A8A8]/20 bg-white/60 p-4'
/** The detail block inside it: solid white, 20px radius, a heavier hairline. */
const INNER = 'flex flex-col gap-[18px] rounded-[20px] border border-[#A8A8A8]/40 bg-white p-4'
const EYEBROW =
  'inline-flex w-fit items-center rounded-[8px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-3 py-2.5 font-sans text-[12px] font-medium uppercase leading-none tracking-[0.5px] text-[#112D7C]'
/** Waiting is amber on these frames, not the blue used for information. */

export interface UnderReviewProps {
  originCity: string
  /** Only set when the member locked a specific airport; null for a city. */
  originCode: string | null
  destinationCity: string
  destinationCode: string | null
  departureDate: string | null
  aircraftCategory: string | null
  organizerName: string | null
  spacesTotal: number
  spacesOccupied: number
  /** The viewer's own request — the one thing on this page that is theirs. */
  placesRequested: number
  requestedAt: string
}

/**
 * Label left, value right. No rule between rows — the frame separates them with
 * 18px of space and nothing else, and the lines the build had made the card
 * read as a table.
 */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <dt className={SUMMARY_LABEL}>{label}</dt>
      <dd className={SUMMARY_VALUE}>{children}</dd>
    </div>
  )
}

/**
 * The generic participant mark: a white disc with a `#98C3E1` ring and a
 * `#62A3D1` silhouette. The frame builds the silhouette from two circles
 * clipped by the disc — a 16px head and a 60px body — rather than a glyph, and
 * the offsets below are its own.
 */
function ParticipantAvatar() {
  return (
    <span
      aria-hidden="true"
      className="relative size-10 shrink-0 overflow-hidden rounded-full border border-[#98C3E1] bg-white"
    >
      <span className="absolute left-[11px] top-[5px] size-4 rounded-full bg-[#62A3D1]" />
      <span className="absolute left-[-11px] top-[26px] size-[60px] rounded-full bg-[#62A3D1]" />
    </span>
  )
}

export function UnderReviewView({
  originCity,
  originCode,
  destinationCity,
  destinationCode,
  departureDate,
  aircraftCategory,
  organizerName,
  spacesTotal,
  spacesOccupied,
  placesRequested,
  requestedAt,
}: UnderReviewProps) {
  const open = Math.max(0, spacesTotal - spacesOccupied)
  const origin = metroLabel(originCity)
  const destination = metroLabel(destinationCity)

  return (
    <div className={SHELL}>
      <section className="flex flex-col gap-1">
        <span className={EYEBROW}>Flight Club · Shared Flight</span>
        {/* `flex-wrap` dropped the tag onto its own line as soon as the
            heading and the tag together passed the column width — which they
            do on a phone. The frames keep it beside the heading at every size,
            so the heading wraps inside its own box instead. */}
        <div className="flex items-center gap-3">
          <h1 className="min-w-0 font-heading text-[24px] font-medium leading-[1.15] text-[#000000] lg:text-[32px]">
            Your request is under review
          </h1>
          <span className={TAG_WAITING}>Under review</span>
        </div>
        <p className="font-sans text-[14px] font-medium leading-[1.5] text-[#000000]">
          This is your view of the group while your request is under review. Participant actions
          open up once the review is done.
        </p>
      </section>

      {/* One panel, not two columns. The frame keeps the route, the flight, the
          request and its status in a single column so a requester reads
          straight down it. */}
      <section className={PANEL}>
        {/* The code when an airport was locked, the metro otherwise — the frame
            draws "SF" over "San Francisco", and a group formed on a city has no
            code to put in the large slot. */}
        <RouteBand
          originCode={originCode ?? origin}
          originCity={origin}
          destinationCode={destinationCode ?? destination}
          destinationCity={destination}
        />

        <dl className={INNER}>
          {departureDate && <Row label="Departure">{readableDate(departureDate)}</Row>}
          {/* `aircraftRowValue` rather than a sentence of this screen's own:
              "Confirmed at quote" is the locked label everywhere else the
              aircraft is still unknown, and two wordings on adjacent screens
              read as two different facts. */}
          <Row label="Aircraft class">{aircraftRowValue(aircraftCategory)}</Row>
          {organizerName && <Row label="Group Organizer">{organizerName}</Row>}
          <Row label="Your request">
            {placesRequested} {placesRequested === 1 ? 'place' : 'places'} · sent{' '}
            {readableDate(requestedAt)}
          </Row>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className={SUMMARY_LABEL}>Status</dt>
            <dd>
              <span className={TAG_WAITING}>Under review</span>
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-4">
          <h2 className="font-heading text-[20px] font-semibold text-[#000000]">
            Group Membership
          </h2>
          {/* Counts, never names. Charles, 2026-09-22: someone under review sees
              how full the group is and nothing about who is in it — which is
              why the frame gives this row the generic avatar rather than a
              stack of participant faces. */}
          <div className="flex items-center gap-4 rounded-[20px] border border-[#A8A8A8]/20 bg-white p-4">
            <ParticipantAvatar />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-heading text-[16px] font-medium leading-[1.2] text-[#000000]">
                {spacesOccupied} of {spacesTotal} participants
                {open > 0 ? ` · ${open} ${open === 1 ? 'place' : 'places'} open` : ''}
              </span>
              <span className="font-sans text-[12px] font-medium leading-[1.25] text-[#000000]">
                You will see who is in the group once your request is approved.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Dashed, because it describes what is not available yet rather than
          something on the page. The dash is 8/8 and follows the 16px corners,
          which a CSS `border-dashed` cannot do — hence the SVG outline. */}
      <section className="relative overflow-visible rounded-[16px] bg-[#CFE3F1]/20 p-4">
        <DashedOutline dash="8 8" />
        <h2 className="font-heading text-[20px] font-medium text-[#000000]">Not available yet</h2>
        <p className="mt-4 font-sans text-[14px] leading-[1.4] text-[#000000]">
          Participant actions open up once your review is done. Until then you cannot message the
          group, edit travellers on this flight, or see participant contact details.
        </p>
      </section>

      <div className="flex flex-col items-center gap-5">
        <div className={FOOTER_ROW}>
          <Link href="/" className={`${FOOTER_SECONDARY} ${FOOTER_ITEM}`}>
            Browse Shared Flights
          </Link>
          {/* Hidden again. There is no `/dashboard` route and no travellers
              page, so both of these 404. They were shown on 2026-10-08 at the
              client's request; put back behind `MEMBER_AREA_ENABLED` on 10-09
              once that was seen live. One flag the day the pages exist. */}
          {MEMBER_AREA_ENABLED && (
            <Link href="/dashboard" className={`${FOOTER_PRIMARY} ${FOOTER_ITEM}`}>
              Go To My Dashboard
              <Icon name="arrow-right" className="size-[18px]" />
            </Link>
          )}
        </div>
        <p className="font-sans text-[14px] text-[#000000]">
          The Group Organizer reviews every request.
        </p>
      </div>
    </div>
  )
}
