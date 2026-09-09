'use client'

/**
 * The join sequence: review (frame 40) → success (41) or group-filled (41B).
 *
 * The three screens are one flow, not three routes — the same shape
 * `LiveFlightState` uses when the lead form gives way to its confirmation. That
 * also sidesteps a question still open with the client: where these screens
 * should live once the member is signed in.
 *
 * Which of 41 / 41B appears is decided by the `filled` flag the join endpoint
 * returns, computed from our own roster against `spaces_total`. It does not wait
 * on Zoho's `flight_group.filled`, so the member who fills a group sees 41B
 * immediately rather than after an event that may not have landed.
 */

import { useState } from 'react'
import { JoinReviewScreen } from './JoinReviewScreen'
import { JoinOutcomeScreen } from './JoinOutcomeScreen'
import type { Pet, PublicView, Traveler } from '@/types'

type Stage = 'review' | 'joined' | 'filled'

export function JoinFlow({
  token,
  flight,
  initialTravelers,
  initialPets,
}: {
  token: string
  flight: PublicView
  /** Seeded from the member's profile, as frame 40's "Pulled from your profile". */
  initialTravelers?: Traveler[]
  initialPets?: Pet[]
}) {
  const [stage, setStage] = useState<Stage>('review')

  if (stage !== 'review') {
    return (
      <JoinOutcomeScreen
        flight={flight}
        groupId={flight.group_id}
        filled={stage === 'filled'}
        travelers={initialTravelers}
        pets={initialPets}
        reference="JN-3041-MGRT"
        memberNumber={flight.spaces_total - flight.spaces_remaining + 1}
      />
    )
  }
  return (
    <JoinReviewScreen
      token={token}
      flight={flight}
      initialTravelers={initialTravelers}
      initialPets={initialPets}
      onJoined={(filled) => setStage(filled ? 'filled' : 'joined')}
    />
  )
}
