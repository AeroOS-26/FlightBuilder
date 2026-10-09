'use client'

/**
 * Frames 48 and 48B — one request, in full, and the confirmation that guards
 * declining it.
 *
 * 48B is a modal over 48 rather than a screen of its own, which is why they
 * live in one file: the page behind stays readable while the organiser decides,
 * and the decision is reversible until they press the second button.
 *
 * Declining is the destructive-feeling action but not the dangerous one — the
 * place stays open and the person can be told nothing more than that it was not
 * approved. Approving is the one that cannot be undone, because it seats
 * someone and may fill the group. The confirmation sits on decline anyway,
 * because that is where the design puts it: it is the action with a person on
 * the other end of it.
 *
 * Rebuilt against `4038:95339` / `4038:95629` on 2026-10-08. Everything below
 * the hero had been built to the shape of the other screens rather than to this
 * frame: the request card was a plain bordered box with rules between its rows,
 * "If you approve" was the same box again rather than the dashed callout, and
 * the two decisions were the generic black and outlined buttons instead of the
 * frame's solid red and green.
 *
 * Two things the frame draws that are not built:
 *
 *  - Its "Who is asking" row shows the **route**, not the requester. That is a
 *    slip — the row is labelled for the person and the route is already in the
 *    line above it — so this shows the name.
 *  - A **"Not a Service Animal"** pill on the Pets row. `FlightGroupPet` has no
 *    service-animal field (it carries `travel_readiness_accepted`), so there is
 *    nothing behind it. `service_animal` is still open with the client.
 */

import { useState } from 'react'
import { DashedOutline, Dialog } from '@/components/ui'
import { Icon } from '@/components/common'
import { readableDate } from '@/features/public-flight/format'
import {
  ACTION_APPROVE,
  ACTION_DECLINE,
  DIALOG_ITEM,
  FOOTER_ITEM,
  FOOTER_PRIMARY,
  FOOTER_ROW,
  FOOTER_SECONDARY,
  SUMMARY_LABEL,
  SUMMARY_VALUE,
  TAG_WAITING,
} from './approvalChrome'

export interface RequestDetail {
  id: number
  requesterName: string | null
  /** "Member since March 2026" — null when we have no joined date. */
  memberSince: string | null
  travellerCount: number
  /** One line per pet: "Nube, cat, 9 lbs". */
  petLines: string[]
  placesRequested: number
  requestedAt: string
}

interface JoinRequestDetailViewProps {
  request: RequestDetail
  /** Route and date for the subheading. */
  routeLabel: string
  departureDate: string
  spacesRemaining: number
  /** How many requests are waiting in total, this one included. */
  waitingCount: number
  onApprove: () => void | Promise<void>
  onDecline: () => void | Promise<void>
  busy?: boolean
}

const SHELL = 'mx-auto flex w-full max-w-[804px] flex-col gap-[30px] px-4 py-8 sm:px-6'
/** The outer panel. 24px radius over a 60% white with an `#A8A8A8/20` hairline. */
const PANEL = 'flex flex-col gap-4 rounded-[24px] border border-[#A8A8A8]/20 bg-white/60 p-4'
/** The block inside it. Lighter than the other screens' inner card: the frame
 *  keeps it at 60% white with the same 20% hairline, not solid white. */
const INNER = 'flex flex-col gap-[18px] rounded-[20px] border border-[#A8A8A8]/20 bg-white/60 p-4'
const EYEBROW =
  'inline-flex w-fit items-center rounded-[8px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-3 py-2.5 font-sans text-[12px] font-medium uppercase leading-none tracking-[0.5px] text-[#112D7C]'

/** The frame spells the count rather than printing a digit. */
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
function spelled(n: number): string {
  return WORDS[n] ?? String(n)
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <dt className={SUMMARY_LABEL}>{label}</dt>
      <dd className={SUMMARY_VALUE}>{children}</dd>
    </div>
  )
}

export function JoinRequestDetailView({
  request,
  routeLabel,
  departureDate,
  spacesRemaining,
  waitingCount,
  onApprove,
  onDecline,
  busy = false,
}: JoinRequestDetailViewProps) {
  const [confirming, setConfirming] = useState(false)

  const name = request.requesterName ?? 'This member'
  const oversized = request.placesRequested > spacesRemaining
  // The design's copy assumes the approval fills the group. It only does when
  // this request takes the last places, so the sentence is assembled rather
  // than quoted — saying "which makes the group full" when four places remain
  // would be wrong in front of the person deciding.
  const fillsGroup = !oversized && request.placesRequested >= spacesRemaining

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
            {name} asked to join
          </h1>
          <span className={TAG_WAITING}>Waiting on you</span>
        </div>
        <p className="font-sans text-[14px] font-medium leading-[1.5] text-[#000000]">
          {routeLabel} · {readableDate(departureDate)}.{' '}
          {waitingCount > 1
            ? `One of ${spelled(waitingCount)} requests waiting on your decision.`
            : 'Waiting on your decision.'}
        </p>
      </section>

      <section className={PANEL}>
        <p className={SUMMARY_LABEL}>The Request</p>
        <dl className={INNER}>
          <Row label="Who is asking">{name}</Row>
          <Row label="Flight Club member">{request.memberSince ?? 'Member'}</Row>
          <Row label="Travellers">{request.travellerCount}</Row>
          <Row label="Pets">
            {request.petLines.length > 0
              ? `${request.petLines.length} · ${request.petLines.join('; ')}`
              : 'None'}
          </Row>
          <Row label="Places needed">
            {request.placesRequested} of {spacesRemaining} open
          </Row>
          <Row label="Date asked">{readableDate(request.requestedAt)}</Row>
        </dl>
      </section>

      {/* Dashed and tinted on the frame, the same callout frames 44 and 45 use
          — it describes what would follow rather than something on the page. */}
      <section className="relative overflow-visible rounded-[16px] bg-[#CFE3F1]/20 p-4">
        <DashedOutline dash="8 8" />
        <h2 className="font-heading text-[20px] font-medium text-[#000000]">If you approve</h2>
        <p className="mt-4 font-sans text-[14px] leading-[1.45] text-[#000000]">
          {oversized ? (
            <>
              This request needs {request.placesRequested} places and {spacesRemaining}{' '}
              {spacesRemaining === 1 ? 'is' : 'are'} open, so it cannot be approved. It can still
              be declined.
            </>
          ) : (
            <>
              {name} joins the group straight away and takes{' '}
              {fillsGroup ? 'the last open place, which makes the group full' : 'their place'}.
              Perro Air then runs its own check. If that check turns them down they leave the
              group and the place reopens. Their own screens read Under review until the check is
              done.
            </>
          )}
        </p>
      </section>

      {/* Decline first, then approve, as the frame orders them — and solid in
          their own colours rather than the navigation pair the other screens
          carry. */}
      <div className={FOOTER_ROW}>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={busy}
          className={`${ACTION_DECLINE} ${FOOTER_ITEM}`}
        >
          <Icon name="close" className="size-[18px] shrink-0" />
          Decline Request
        </button>
        <button
          type="button"
          onClick={() => void onApprove()}
          disabled={oversized || busy}
          className={`${ACTION_APPROVE} ${FOOTER_ITEM}`}
        >
          <Icon name="check" className="size-[18px] shrink-0" />
          Approve Request
        </button>
      </div>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Decline ${name}?`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className={`${FOOTER_SECONDARY} ${DIALOG_ITEM}`}
            >
              Keep the request
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false)
                void onDecline()
              }}
              disabled={busy}
              className={`${FOOTER_PRIMARY} ${DIALOG_ITEM}`}
            >
              Decline request
            </button>
          </>
        }
      >
        {/* "without a reason" is the product rule, not a limitation of the
            screen: a decline gives none, and nothing is invented to fill it. */}
        They will be told their request was not approved, without a reason. The open place stays
        open for other requests.
      </Dialog>
    </div>
  )
}
