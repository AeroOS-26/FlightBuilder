'use client'

/**
 * Group Full edge state.
 *
 * The group has reached capacity, so there is no lead-capture form — the action
 * card is a message-level "this group is full" with interest for the next
 * flight on the route, per the milestone doc (message-level, not a new capture
 * form). Uses "Group Full" throughout; "Sold Out" never appears.
 */

import { PublicTwoColumn } from '../components/PublicPageShell'
import {
  FlightHeroBanner,
  FlightDetailsCard,
  EstimatePendingCard,
  WhosFlyingCard,
  PublicAside,
} from '../components/PublicFlightParts'
import type { PublicView } from '@/types'

const cardClass = 'rounded-[20px] border border-[#A8A8A8]/20 bg-white p-6 text-center'

export function GroupFullState({ flight }: { flight: PublicView }) {
  return (
    <div className="flex flex-col gap-5 lg:gap-[30px]">
      <FlightHeroBanner flight={flight} />
      <PublicTwoColumn
        main={
          <>
            <FlightDetailsCard flight={flight} />
            <EstimatePendingCard />
            <WhosFlyingCard
              flight={flight}
              note="This group has reached capacity and is no longer accepting new members."
            />
            <section className={cardClass}>
              <h2 className="font-heading text-[20px] font-medium text-[#000000] lg:text-[22px]">
                This group is full
              </h2>
              <p className="mx-auto mt-2 max-w-[460px] font-sans text-[14px] leading-[150%] text-[#000000]/70">
                All {flight.spaces_total} spaces have been filled. New groups form on this route
                regularly, so it is worth checking back.
              </p>
            </section>
          </>
        }
        aside={
          <PublicAside
            stateNote={{
              title: 'What Group Full means',
              body: 'Every space on this flight is taken. We’re lining up the operator to confirm it. Similar routes open up often.',
            }}
          />
        }
      />
    </div>
  )
}
