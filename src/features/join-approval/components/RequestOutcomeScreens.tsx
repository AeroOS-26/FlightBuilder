'use client'

/**
 * Frames 43 and 46 — what the requester sees after asking, and after being
 * turned down.
 *
 * Both are terminal in their own way: 43 is the end of the asking, 46 is the
 * end of the request. Neither holds a place, and neither charges anything,
 * which is why both say so in as many words — the designs put that reassurance
 * on the screen rather than leaving it to be inferred.
 *
 * They share the flight summary card because they are the same flight seen at
 * two moments, and a second copy of it would drift.
 *
 * "Go to my dashboard" is drawn on both frames and is now shown, at the
 * client's request — see the note at the control itself, and §15a for the
 * decision it overrides. Frame 46 keeps "Start my own shared flight".
 */

import Image from 'next/image'
import Link from 'next/link'
import { Icon } from '@/components/common'
import {
  FOOTER_ITEM,
  FOOTER_PRIMARY,
  FOOTER_ROW,
  FOOTER_SECONDARY,
  SUMMARY_LABEL,
  SUMMARY_VALUE,
  TAG_WAITING,
} from './approvalChrome'
import type { ReactNode } from 'react'

export interface SharedFlightSummary {
  originCity: string
  originCode: string | null
  destinationCity: string
  destinationCode: string | null
  departureDate: string
  /**
   * Omitted on the public share path. The public view withholds member
   * identities by contract (section 2), so the organiser's name is not
   * available to a screen reached from a share link — the row is dropped rather
   * than filled with a placeholder. Raised with the client.
   */
  organizerName?: string
}

/*
 * Measurements read off the frames rather than chosen: the content column is
 * 804px with 30px between sections, cards are a 20px radius over a 60% white
 * with an `#A8A8A8/20` hairline, and the eyebrow is an outlined pill, not a
 * line of coloured text.
 */
const SHELL = 'mx-auto flex w-full max-w-[804px] flex-col gap-[30px] px-4 py-8 sm:px-6 lg:py-12'
const EYEBROW =
  'inline-flex w-fit items-center rounded-[8px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-3 py-2.5 font-sans text-[12px] font-medium uppercase leading-none tracking-[0.5px] text-[#112D7C]'
const CARD = 'rounded-[20px] border border-[#A8A8A8]/20 bg-white/60 p-4'

function place(city: string, code: string | null): string {
  return code ? `${city} (${code})` : city
}

/** Label left, value right — the row shape frames 42, 43 and 44 share. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <dt className={SUMMARY_LABEL}>{label}</dt>
      <dd className={SUMMARY_VALUE}>{children}</dd>
    </div>
  )
}

/**
 * Route, date and organiser — the three things both screens restate.
 *
 * Drawn as frame 42 draws it, because it is the same card: a small uppercase
 * title over a solid white inner panel, 18px between rows, and the two ends of
 * the route joined by the plane mark. It was a text arrow and a sentence-case
 * 18px heading, neither of which is on the frame.
 */
function FlightSummary({ flight }: { flight: SharedFlightSummary }) {
  return (
    <section className={CARD}>
      <h2 className={SUMMARY_LABEL}>The shared flight</h2>
      <dl className="mt-3 flex flex-col gap-[18px] rounded-[20px] border border-[#A8A8A8]/40 bg-white p-4">
        <Row label="Route">
          <span className="inline-flex flex-wrap items-center justify-end gap-2">
            {place(flight.originCity, flight.originCode)}
            <Image
              src="/images/routes/Flighticons.png"
              alt="to"
              width={34}
              height={34}
              className="size-[22px] shrink-0 object-contain"
            />
            {place(flight.destinationCity, flight.destinationCode)}
          </span>
        </Row>
        <Row label="Departure">{flight.departureDate}</Row>
        {/* Absent on the public share path, where member identities are
            withheld by contract (section 2). The row is dropped rather than
            filled with a placeholder. */}
        {flight.organizerName && <Row label="Group Organizer">{flight.organizerName}</Row>}
      </dl>
    </section>
  )
}

function NumberedSteps({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, i) => (
        <li key={item} className="flex gap-3">
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#EEF3FA] font-sans text-[12px] font-semibold text-[#112D7C]"
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <span className="font-sans text-[14px] leading-[1.5] text-[#000000]/80">{item}</span>
        </li>
      ))}
    </ol>
  )
}

interface RequestSentProps {
  flight: SharedFlightSummary
  /** Where the decision will be sent. Shown because the design shows it. */
  email: string
}

/** Frame 43 · Request Sent. */
export function RequestSentScreen({ flight, email }: RequestSentProps) {
  return (
    <div className={SHELL}>
      <section className="flex flex-col gap-3">
        <p className={EYEBROW}>Flight Club · Join a shared flight</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-[24px] font-medium text-[#000000] lg:text-[32px]">
            Request sent
          </h1>
          <span className={TAG_WAITING}>Under review</span>
        </div>
        <p className="font-sans text-[14px] font-medium leading-[1.5] text-[#000000]">
          The Group Organizer reviews your request. We will email you at {email} as soon as there
          is a decision. Nothing has been charged.
        </p>
      </section>

      <FlightSummary flight={flight} />

      <section className={CARD}>
        <h2 className="font-heading text-[18px] font-medium text-[#000000]">
          Where your request stands
        </h2>
        <div className="mt-3">
          <NumberedSteps
            items={[
              'Your request is under review. We will email you when there is a decision.',
              'If it is approved, you are in the group and the group page opens up to you.',
              'Until then you can keep browsing other shared flights.',
            ]}
          />
        </div>
      </section>

      <div className="flex flex-col items-center gap-5">
        <div className={FOOTER_ROW}>
          <Link href="/" className={`${FOOTER_SECONDARY} ${FOOTER_ITEM}`}>
            Browse Shared Flights
          </Link>
          {/*
            Shown because the frames draw it and the client asked for it twice
            (2026-10-08), overriding the §15a "hide controls with no
            destination" note for these two screens only. **There is no
            `/dashboard` route yet**, so it 404s until one exists — point it
            elsewhere or stub the route before this goes in front of anyone.
            The global `MEMBER_AREA_ENABLED` stays false: it also gates the
            builder's nav, which has the same problem and has not been asked
            about.
          */}
          <Link href="/dashboard" className={`${FOOTER_PRIMARY} ${FOOTER_ITEM}`}>
            Go To My Dashboard
            <Icon name="arrow-right" className="size-[18px]" />
          </Link>
        </div>
        <p className="font-sans text-[14px] text-[#000000]/70">
          The Group Organizer reviews every request.
        </p>
      </div>
    </div>
  )
}

/** Frame 46 · Request Not Approved. */
export function RequestNotApprovedScreen({ flight }: { flight: SharedFlightSummary }) {
  return (
    <div className={SHELL}>
      <section className="flex flex-col gap-3">
        <p className={EYEBROW}>Flight Club · Join a shared flight</p>
        <h1 className="font-heading text-[24px] font-medium text-[#000000] lg:text-[32px]">
          Your request was not approved
        </h1>
        <p className="font-sans text-[14px] font-medium leading-[1.5] text-[#000000]">
          You are not in this group. Nothing has been charged and your Flight Club account is
          unchanged.
        </p>
      </section>

      <FlightSummary flight={flight} />

      {/*
        No card. The frame puts the two lines straight on the page, centred, as
        one block with a line break between them, and the two controls centred
        under them. They had been boxed and left-aligned with a single button.

        The mobile frame labels these two "Manage my travellers" and "Go to my
        dashboard" — frame 45's pair, pasted across. Neither is reachable from
        here: this screen is for someone who is *not* in the group. Desktop's
        pair is the one that makes sense on both.
      */}
      <div className="flex flex-col items-center gap-4 lg:gap-5">
        <p className="text-center font-sans text-[14px] leading-[1.5] text-[#000000]">
          New groups on similar routes form often.
          <br />
          You can also start a group of your own and invite people to it.
        </p>
        <div className={FOOTER_ROW}>
          <Link href="/" className={`${FOOTER_SECONDARY} ${FOOTER_ITEM}`}>
            Browse Shared Flights
          </Link>
          <Link href="/build" className={`${FOOTER_PRIMARY} ${FOOTER_ITEM}`}>
            Start My Own Shared Flight
            <Icon name="arrow-right" className="size-[18px] shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  )
}
