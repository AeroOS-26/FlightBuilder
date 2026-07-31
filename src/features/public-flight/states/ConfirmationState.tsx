'use client'

/**
 * Lead-capture confirmation (frame 16) — shown after a successful submit.
 *
 * Built to the settled contract and the client's copy decision, which override
 * the hi-fi where they conflict:
 *  - Heading is "We’ve got your request." (client conflict-1), NOT "Your spot
 *    is reserved" — nothing is allocated; this is an interest capture with
 *    manual follow-up.
 *  - No account language and no "finish creating your account" action: the
 *    contract states no account is created and there is no auto-join. The hi-fi
 *    shows account-creation copy from before the legal review; it is omitted.
 *  - No pet details echoed back: the MVP form does not collect them.
 *
 * In M1 this renders as a static state to the design; the trigger (showing it
 * after a real successful POST) is wired in Milestone 2.
 */

import { PublicTwoColumn } from '../components/PublicPageShell'
import {
  FlightHeroBanner,
  FlightDetailsCard,
  EstimatePendingCard,
  WhosFlyingCard,
  PublicAside,
} from '../components/PublicFlightParts'
import { Icon } from '@/components/common'
import type { PublicView } from '@/types'

const cardClass = 'rounded-[20px] border border-[#A8A8A8]/20 bg-white p-5 lg:p-6'

const NEXT_STEPS = [
  'Our team reviews the route and posts a shared and private estimate.',
  'As members join, we line up the operator and confirm the aircraft.',
  'We’ll email you as the group comes together — no account needed.',
]

export function ConfirmationState({ flight }: { flight: PublicView }) {
  return (
    <div className="flex flex-col gap-5 lg:gap-[30px]">
      <FlightHeroBanner flight={flight} />
      <PublicTwoColumn
        main={
          <>
            <FlightDetailsCard flight={flight} />
            <EstimatePendingCard />
            <WhosFlyingCard flight={flight} />

            <section className={cardClass}>
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#E6F5EC] text-[#1AA35A]">
                <Icon name="check" size={22} strokeWidth={2.25} />
              </span>
              <h2 className="mt-3 font-heading text-[22px] font-medium text-[#000000] lg:text-[26px]">
                We’ve got your request.
              </h2>
              <p className="mt-2 font-sans text-[14px] leading-[150%] text-[#000000]/70">
                Thanks — your interest in this flight is in. The Perro Air team will follow up by
                email as the group comes together. No account is needed and nothing is charged.
              </p>

              <hr className="my-4 border-0 border-t border-[#A8A8A8]/30" />

              <h3 className="font-heading text-[16px] font-medium text-[#000000]">
                What happens next
              </h3>
              <ol className="mt-3 flex flex-col gap-2.5">
                {NEXT_STEPS.map((step, i) => (
                  <li key={step} className="flex items-start gap-2.5">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[#98C3E1] bg-[#ECF4F9] font-sans text-[11px] font-semibold text-[#080B2B]">
                      {i + 1}
                    </span>
                    <span className="font-sans text-[14px] leading-[140%] text-[#000000]/80">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        }
        aside={
          <PublicAside
            stateNote={{
              title: 'What happens now',
              body: 'Your request is with our team. We follow up by hand as the group fills — there’s nothing more you need to do right now.',
            }}
          />
        }
      />
    </div>
  )
}
