'use client'

/**
 * Seeds the signed-in member into the store as the Group Organizer.
 *
 * This is the Milestone 1 task "member identity wired into the Flight Builder
 * so `flight_group.created` carries a real organizer email and phone instead of
 * empty strings", and an acceptance criterion for it.
 *
 * Until 26 Aug this seeded a blank placeholder, because the builder pre-dated
 * the auth layer and there was no session to read. `/build/*` is now behind
 * `requireVerifiedViewer`, so a member always exists by the time this runs and
 * the identity is passed in from the server layout rather than invented here.
 *
 * `id` carries the **account id** (`acct_5001`), not the database row id: the
 * payload maps `founder.id` onto `account_id`, which the contract defines as
 * the `acct_` form. Sending the numeric row id there would look plausible and
 * be wrong.
 *
 * Falling back to blanks when no identity is supplied is deliberate. Email is
 * Zoho's dedup key, so a seeded stand-in address would collapse every flight
 * onto a single Contact — an empty string is recoverable, a wrong one is not.
 */

import { useEffect } from 'react'
import { useFlightBuilderStore } from '@/features/flight-builder/store/flightBuilderStore'
import type { MemberIdentity } from '@/types'

export function useFounderIdentity(identity?: MemberIdentity | null) {
  const founder = useFlightBuilderStore((s) => s.founder)
  const initFounder = useFlightBuilderStore((s) => s.initFounder)

  useEffect(() => {
    if (!identity) return

    // Re-seed when the signed-in member changes. The draft persists to
    // sessionStorage, so without this a member who signs out and signs back in
    // as someone else would keep the previous organizer on their flight.
    if (!founder || founder.id !== identity.id || founder.email !== identity.email) {
      initFounder(identity)
    }
  }, [identity, founder, initFounder])
}
