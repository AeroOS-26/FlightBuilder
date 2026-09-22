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
import type { MemberJoinResponse, Pet, PublicView, Traveler } from '@/types'

/**
 * The public view with the roster's counts laid over it, when the join sent
 * them.
 *
 * The public view is Zoho's record, and Zoho keeps the counts it was created
 * with: `member.joined` carries no count, and the contract forbids Zoho from
 * deriving one. So after a join it still describes the group as it was, and a
 * group of two that has just filled reads as one of six. Only the counts are
 * replaced; everything else on the page is still the public view.
 */
function withRosterCounts(flight: PublicView, result: MemberJoinResponse): PublicView {
  if (result.spaces_total === undefined || result.spaces_remaining === undefined) return flight
  return {
    ...flight,
    spaces_total: result.spaces_total,
    spaces_remaining: result.spaces_remaining,
  }
}

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
  const [joined, setJoined] = useState<MemberJoinResponse | null>(null)

  if (joined) {
    return (
      <JoinOutcomeScreen
        flight={withRosterCounts(flight, joined)}
        groupId={flight.group_id}
        filled={joined.filled === true}
        travelers={initialTravelers}
        pets={initialPets}
        reference={reference ?? joined.member_id}
        // The public view's count plus one is only right while Zoho happens to
        // be exactly one join behind, so it is the fallback, not the source.
        memberNumber={joined.member_ordinal ?? flight.spaces_total - flight.spaces_remaining + 1}
      />
    )
  }
  return (
    <JoinReviewScreen
      token={token}
      flight={flight}
      initialTravelers={initialTravelers}
      initialPets={initialPets}
      onJoined={setJoined}
    />
  )
}
