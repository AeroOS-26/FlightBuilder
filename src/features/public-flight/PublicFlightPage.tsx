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
import { usePublicFlight } from './hooks/usePublicFlight'
import type { PublicFlightResult, PublicView } from '@/types'

interface PublicFlightPageProps {
  token: string
  /**
   * The server-rendered read from /share/[token]. Present on a resolved flight,
   * absent when the upstream read failed — in which case the query below fetches
   * and owns the error / retry state.
   */
  initialData?: PublicFlightResult
}

export function PublicFlightPage({ token, initialData }: PublicFlightPageProps) {
  const { data, isLoading, isError, refetch } = usePublicFlight(token, initialData)

  return (
    <PublicPageShell>
      {isLoading && <PublicFlightSkeleton />}
      {isError && <PublicFlightError onRetry={() => refetch()} />}
      {!isLoading && !isError && data?.status === 'not_found' && <NotFoundState />}
      {!isLoading && !isError && data?.status === 'ok' && (
        <StateForFlight flight={data.flight} />
      )}
    </PublicPageShell>
  )
}

/** Pick the screen for the flight's public state. */
function StateForFlight({ flight }: { flight: PublicView }) {
  switch (flight.group_state_public) {
    case 'full':
      return <GroupFullState flight={flight} />
    case 'forming':
    case 'filling':
      return <LiveFlightState flight={flight} />
    // quoting / confirmed / closed are held for the Flight Club phase; until
    // those screens are built, show the live view rather than break.
    default:
      return <LiveFlightState flight={flight} />
  }
}
