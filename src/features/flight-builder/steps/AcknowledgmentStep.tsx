'use client'

/**
 * Frame 09B · Group Organizer acknowledgment.
 *
 * The gate between Review and the create call. Perro Air does not assign the
 * Organizer role, so there has to be a record that whoever holds it took it
 * deliberately — that is what this screen produces, and why the acceptance is
 * written in the same transaction as the group (migration 0011, §18).
 *
 * Three states, all drawn by the client: default, accepted, and the error. The
 * button is **never disabled** — the frame shows it solid black in the default
 * state, and the error state only exists because you can press it unchecked.
 * Disabling it would make the error unreachable.
 *
 * Cancel returns to Review with everything the organiser entered still there.
 * Charles, 8 October, and his reasoning is worth keeping: *"Accepting the
 * acknowledgment needs to be a real choice. If declining it throws away the
 * work the organiser has just done, the screen is leaning on them to accept,
 * and the position this all rests on is that the organiser took the role
 * willingly."* Nothing is discarded, so there is no confirmation step either.
 *
 * The draft lives in the persisted store rather than in this component, so
 * returning to Review — or refreshing here — costs nothing.
 */

import { useState } from 'react'
import { Icon } from '@/components/common'
import { DashedOutline } from '@/components/ui'
import { useCreateFlight, useStepNavigation } from '@/features/flight-builder/hooks'
import {
  ACKNOWLEDGMENT_CANCEL,
  ACKNOWLEDGMENT_CHECKBOX,
  ACKNOWLEDGMENT_ERROR,
  ACKNOWLEDGMENT_HEADING,
  ACKNOWLEDGMENT_RECORD_NOTE,
  ACKNOWLEDGMENT_STATEMENTS,
  ACKNOWLEDGMENT_SUBMIT,
} from '@/features/flight-builder/config/acknowledgment'

/** 782 on the frame, 408 on mobile — the same column with the page gutter. */
const SHELL = 'mx-auto flex w-full max-w-[782px] flex-col gap-[30px] px-4 py-8 sm:px-6'
const PANEL = 'flex flex-col gap-4 rounded-[24px] border border-[#A8A8A8]/20 bg-white/60 p-4'
const INNER = 'rounded-[20px] border border-[#A8A8A8]/40 bg-white p-4'

export function AcknowledgmentStep() {
  const [accepted, setAccepted] = useState(false)
  const [showError, setShowError] = useState(false)
  const { confirmWithAcknowledgment, isPending, isError, error } = useCreateFlight()
  const { goTo } = useStepNavigation()

  function submit() {
    if (!accepted) {
      setShowError(true)
      return
    }
    setShowError(false)
    confirmWithAcknowledgment()
  }

  return (
    <div className={SHELL}>
      <h1 className="font-heading text-[24px] font-medium leading-[1.2] text-[#000000]">
        {ACKNOWLEDGMENT_HEADING}
      </h1>

      <section className={PANEL}>
        <ol className={`flex flex-col gap-3 ${INNER}`}>
          {ACKNOWLEDGMENT_STATEMENTS.map((statement, index) => (
            <li key={statement} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-[26px] shrink-0 items-center justify-center rounded-full border border-[#CFE3F1] bg-[#CFE3F1]/40 font-sans text-[12px] font-medium text-[#080B2B]"
              >
                {index + 1}
              </span>
              <span className="font-sans text-[16px] font-medium leading-[1.5] text-[#000000]">
                {statement}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* The same dashed callout frames 44, 45 and 48 use, here holding the one
          control that matters. Drawn with the native checkbox rather than a
          styled div so it is reachable by keyboard and announced as a checkbox. */}
      <label className="relative flex cursor-pointer items-center gap-3 overflow-visible rounded-[16px] bg-[#CFE3F1]/20 p-4">
        <DashedOutline dash="8 8" />
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => {
            setAccepted(e.target.checked)
            if (e.target.checked) setShowError(false)
          }}
          aria-describedby={showError ? 'acknowledgment-error' : undefined}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-[#0A1B49] bg-white text-white peer-checked:border-[#112D7C] peer-checked:bg-[#112D7C] peer-focus-visible:ring-2 peer-focus-visible:ring-[#112D7C]/40"
        >
          {accepted && <Icon name="check" className="size-3.5" />}
        </span>
        <span className="font-heading text-[14px] font-medium leading-[1.4] text-[#000000]">
          {ACKNOWLEDGMENT_CHECKBOX}
        </span>
      </label>

      {showError && (
        <p
          id="acknowledgment-error"
          role="alert"
          className="flex items-center gap-2 rounded-[12px] bg-[#E96A6F]/20 px-3 py-3 font-sans text-[14px] font-medium text-[#D00416]"
        >
          <AlertMark />
          {ACKNOWLEDGMENT_ERROR}
        </p>
      )}

      {/* The create itself can still fail — Zoho refusing, the relay being
          unconfigured. That is a different failure from not having accepted,
          and it says so rather than reusing the line above. */}
      {isError && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-[12px] bg-[#E96A6F]/20 px-3 py-3 font-sans text-[14px] font-medium text-[#D00416]"
        >
          <AlertMark />
          {error?.message ?? 'The flight group could not be created. Please try again.'}
        </p>
      )}

      <div className="flex flex-col items-center gap-5 pt-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          aria-busy={isPending || undefined}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-[#000000] px-3.5 py-2 text-center font-sans text-[14px] font-medium text-white transition-opacity hover:opacity-90 focus-ring disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isPending ? 'Creating your Charter Group…' : ACKNOWLEDGMENT_SUBMIT}
          {!isPending && <Icon name="arrow-right" className="size-[18px] shrink-0" />}
        </button>

        <button
          type="button"
          onClick={() => goTo('review')}
          disabled={isPending}
          className="font-sans text-[14px] text-[#000000] underline-offset-2 hover:underline focus-ring disabled:opacity-55"
        >
          {ACKNOWLEDGMENT_CANCEL}
        </button>

        <p className="text-center font-sans text-[14px] text-[#000000]">
          {ACKNOWLEDGMENT_RECORD_NOTE}
        </p>
      </div>
    </div>
  )
}

/** The alert mark on the error bar. Not in the icon set, so it is drawn here. */
function AlertMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className="size-4 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" />
      <path d="M8 5v3.5" stroke="currentColor" strokeLinecap="round" />
      <path d="M8 10.8v.2" stroke="currentColor" strokeLinecap="round" />
    </svg>
  )
}
