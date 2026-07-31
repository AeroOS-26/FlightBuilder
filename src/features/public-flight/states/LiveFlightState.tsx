'use client'

/**
 * The shared live-flight layout for Forming and Filling.
 *
 * Both render the same two-column body — hero, flight details, estimate,
 * who's-flying, then the lead-capture form as the primary action. Per the
 * client's decision, the "Save your spot" interest form is the action shown;
 * the "Join This Flight / Sign in or create account" flow is NOT built in the
 * MVP. Forming and Filling differ only in banner tone, the who's-flying note,
 * and the "what this state means" panel copy.
 */

import { useState } from 'react'
import { PublicTwoColumn } from '../components/PublicPageShell'
import {
  FlightHeroBanner,
  FlightDetailsCard,
  EstimatePendingCard,
  WhosFlyingCard,
  PublicAside,
} from '../components/PublicFlightParts'
import { LeadCaptureForm } from '../components/LeadCaptureForm'
import { ConfirmationState } from './ConfirmationState'
import type { PublicView } from '@/types'

const STATE_NOTE: Record<'forming' | 'filling', { title: string; body: string }> = {
  forming: {
    title: 'What Forming means',
    body: 'The group is just getting started. The Group Organizer has created the flight and is inviting members. As spaces fill, we line up the operator and confirm the aircraft.',
  },
  filling: {
    title: 'What Filling means',
    body: 'The group is forming. Once it reaches 4 members, we lock in an aircraft and request an operator quote.',
  },
}

const WHOS_FLYING_NOTE: Record<'forming' | 'filling', string> = {
  forming: 'Be the first to join — share the route with friends or pet owners who might be flying.',
  filling: 'Spaces are filling up. Register your interest to be kept in the loop as the group forms.',
}

export function LiveFlightState({ flight }: { flight: PublicView }) {
  const key = flight.group_state_public === 'filling' ? 'filling' : 'forming'
  // Once the interest lead is submitted, the page shows the confirmation state.
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return <ConfirmationState flight={flight} />
  }

  return (
    <div className="flex flex-col gap-5 lg:gap-[30px]">
      <FlightHeroBanner flight={flight} />
      <PublicTwoColumn
        main={
          <>
            <FlightDetailsCard flight={flight} />
            <EstimatePendingCard />
            <WhosFlyingCard flight={flight} note={WHOS_FLYING_NOTE[key]} />
            <LeadCaptureForm
              groupId={flight.group_id}
              onSuccess={() => setSubmitted(true)}
            />
          </>
        }
        aside={<PublicAside stateNote={STATE_NOTE[key]} />}
      />
    </div>
  )
}
