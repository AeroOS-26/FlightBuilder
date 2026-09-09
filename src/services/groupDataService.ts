/**
 * Group writes — the browser half of the seam.
 *
 * Client-safe on purpose: this module is imported by the join screen, so it
 * must not reach the database. Reads live in `groupDataService.server.ts`,
 * which does.
 */

import type { MemberJoinResponse } from '@/types'

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
  _userId: string,
): Promise<MemberJoinResponse> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const message =
      res.status === 404
        ? 'This group is no longer available.'
        : 'Could not complete your join. Please try again.'
    throw new Error(message)
  }

  return (await res.json()) as MemberJoinResponse
}
