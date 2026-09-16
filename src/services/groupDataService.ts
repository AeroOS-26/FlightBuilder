/**
 * Group writes — the browser half of the seam.
 *
 * Client-safe on purpose: this module is imported by the join screen, so it
 * must not reach the database. Reads live in `groupDataService.server.ts`,
 * which does.
 */

import type { MemberJoinResponse, Pet } from '@/types'

export interface JoinRequest {
  /**
   * Spaces this join takes: the member plus companions on the review screen.
   * A space is a person, not an account, so a party of three takes three even
   * though it is one membership. See migration 0007.
   */
  seats: number
  /** The party's pets as confirmed on the review screen. They travel on `member.joined`. */
  pets: Pet[]
  /** Travel Readiness — required whenever pets are coming. */
  readinessAccepted: boolean
}

/**
 * Join a flight group.
 *
 * Idempotent server-side on the (group, user) uniqueness constraint, so a
 * double submit or a retry returns the existing seat rather than adding a
 * second member — which is why the join screen can safely offer "Try again"
 * after a failure.
 *
 * `filled` comes back computed from our own roster against `spaces_total`, not
 * from Zoho's `flight_group.filled`. That is what lets the member who fills a
 * group see frame 41B immediately rather than waiting on an event.
 */
export async function joinGroup(
  groupId: string,
  { seats, pets, readinessAccepted }: JoinRequest,
): Promise<MemberJoinResponse> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seats, pets, readiness_accepted: readinessAccepted }),
  })

  if (!res.ok) {
    // 409 is capacity, and the server says how many spaces are actually left.
    // 400 and 422 are pet details the server would not accept. In each case
    // its message is more useful than anything that can be written here, so it
    // is passed through rather than replaced with a generic failure.
    if (res.status === 409 || res.status === 400 || res.status === 422) {
      const body = (await res.json().catch(() => null)) as { message?: string } | null
      throw new Error(
        body?.message ??
          (res.status === 409
            ? 'This group no longer has room for your party.'
            : 'Please check your pet details and try again.'),
      )
    }

    // A signed-out member needs to sign in, not retry. Telling them to try
    // again leaves them repeating a submit that can never succeed.
    const message =
      res.status === 401
        ? 'Please sign in to join this flight.'
        : res.status === 404
          ? 'This group is no longer available.'
          : 'Could not complete your join. Please try again.'
    throw new Error(message)
  }

  return (await res.json()) as MemberJoinResponse
}
