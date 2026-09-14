'use client'

/**
 * Public Shared Flight Detail — the page a share link opens.
 *
 * Reads the public-safe view for the token via the relay, then renders the
 * matching state. Loading and fetch-error are handled here; a not-found result
 * (stale / closed / unknown token) renders the Not-found state rather than an
 * error. States held for the later Flight Club phase (quoting, confirmed,
 * closed) are not built in the MVP, so they fall back to the live view.
 */

import { PublicPageShell } from './components/PublicPageShell'
import { LiveFlightState } from './states/LiveFlightState'
import { GroupFullState } from './states/GroupFullState'
import { NotFoundState } from './states/NotFoundState'
import { PublicFlightSkeleton } from './components/PublicFlightSkeleton'
import { PublicFlightError } from './components/PublicFlightError'
import { JoinFlow } from './states/JoinFlow'
import { usePublicFlight } from './hooks/usePublicFlight'
import type { Pet, PublicFlightResult, PublicView, Traveler } from '@/types'

/**
 * The signed-in member viewing this share link, when there is one.
 *
 * Its **presence is the signal**, not any field on it: the server passes it
 * only for a member who is signed in and not already in this group. Anonymous
 * visitors get `undefined`, and existing members never reach the client page at
 * all — they are redirected to their group on the server.
 */
export interface ShareViewer {
  /** Seeded from the member's profile, as frame 40's "Pulled from your profile". */
  travelers?: Traveler[]
  pets?: Pet[]
}

interface PublicFlightPageProps {
  token: string
  /**
   * The server-rendered read from /share/[token]. Present on a resolved flight,
   * absent when the upstream read failed — in which case the query below fetches
   * and owns the error / retry state.
   */
  initialData?: PublicFlightResult
  /** See ShareViewer. Absent for an anonymous visitor. */
  viewer?: ShareViewer
}

export function PublicFlightPage({ token, initialData, viewer }: PublicFlightPageProps) {
  const { data, isLoading, isError, refetch } = usePublicFlight(token, initialData)

  return (
    <PublicPageShell>
      {isLoading && <PublicFlightSkeleton />}
      {isError && <PublicFlightError onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.status === 'not_found' && <NotFoundState />}
      {!isLoading && !isError && data?.status === 'ok' && (
        <StateForFlight flight={data.flight} token={token} viewer={viewer} />
      )}
    </PublicPageShell>
  )
}

/**
 * Pick the screen, from two questions: what state the flight is in, and who is
 * looking.
 *
 * Only an open flight branches on the viewer. A full or closed group has
 * nothing to join, so everyone sees the same thing and the session is
 * irrelevant there.
 */
function StateForFlight({
  flight,
  token,
  viewer,
}: {
  flight: PublicView
  token: string
  viewer?: ShareViewer
}) {
  switch (flight.group_state_public) {
    case 'full':
      return <GroupFullState flight={flight} />
    case 'forming':
    case 'filling':
      // A signed-in member who is not already in this group joins directly.
      // This is M2's deliverable, and it does not disturb the anonymous funnel
      // below: the client's 2026-07-30 instruction was that the public page
      // must not put a "Join This Flight / Sign in or create account" gate in
      // front of a stranger, and a stranger still never sees one.
      if (viewer) {
        return (
          <JoinFlow
            token={token}
            flight={flight}
            initialTravelers={viewer.travelers}
            initialPets={viewer.pets}
          />
        )
      }
      return <LiveFlightState flight={flight} />
    // quoting / confirmed / closed are M2 screens available to authenticated
    // members only, not shown via public share link. Fall back to full state.
    default:
      return <GroupFullState flight={flight} />
  }
}
