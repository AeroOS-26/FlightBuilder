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
  reference,
}: {
  token: string
  flight: PublicView
  /** Seeded from the member's profile, as frame 40's "Pulled from your profile". */
  initialTravelers?: Traveler[]
  initialPets?: Pet[]
  /**
   * Fixed reference for the previews, which never reach the endpoint. On the
   * real path this is left unset and the seat id from the join stands in, so a
   * member is never shown a reference that belongs to nobody.
   */
  reference?: string
}) {
  const [stage, setStage] = useState<Stage>('review')
  const [memberId, setMemberId] = useState<string | null>(null)

  if (stage !== 'review') {
    return (
      <JoinOutcomeScreen
        flight={flight}
        groupId={flight.group_id}
        filled={stage === 'filled'}
        travelers={initialTravelers}
        pets={initialPets}
        reference={reference ?? memberId ?? undefined}
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
      onJoined={(filled, joinedMemberId) => {
        setMemberId(joinedMemberId ?? null)
        setStage(filled ? 'filled' : 'joined')
      }}
    />
  )
}
