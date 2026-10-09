'use client'

/**
 * The client half of frame 48: it owns the two decisions and nothing else.
 *
 * `JoinRequestDetailView` stays presentational so it can be rendered without a
 * server, which is how it was checked. A server page cannot hand a function to
 * a client component, so the handlers live here and the screen above stays a
 * pure render of its props.
 *
 * On success the organiser goes back to the group page rather than staying on a
 * request that no longer exists — the roster, the counts and the remaining
 * requests have all moved, and the list is where the next decision is.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  JoinRequestDetailView,
  type RequestDetail,
} from './JoinRequestDetailView'

interface RequestDecisionPanelProps {
  groupId: string
  request: RequestDetail
  routeLabel: string
  departureDate: string
  spacesRemaining: number
  waitingCount: number
}

export function RequestDecisionPanel({
  groupId,
  request,
  routeLabel,
  departureDate,
  spacesRemaining,
  waitingCount,
}: RequestDecisionPanelProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  const decide = async (decision: 'approve' | 'decline') => {
    setBusy(true)
    setFailure(null)
    try {
      const res = await fetch(
        `/api/groups/${encodeURIComponent(groupId)}/requests/${request.id}/${decision}`,
        { method: 'POST' },
      )
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        setFailure(body?.message ?? 'That did not go through. Please try again.')
        return
      }
      router.push(`/group/${encodeURIComponent(groupId)}`)
      router.refresh()
    } catch {
      setFailure('Could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {failure && (
        <p className="mx-auto mt-6 w-full max-w-[860px] rounded-[12px] border border-danger-text/30 bg-danger-text/5 px-4 py-3 font-sans text-[14px] text-danger-text">
          {failure}
        </p>
      )}
      <JoinRequestDetailView
        request={request}
        routeLabel={routeLabel}
        departureDate={departureDate}
        spacesRemaining={spacesRemaining}
        waitingCount={waitingCount}
        busy={busy}
        onApprove={() => decide('approve')}
        onDecline={() => decide('decline')}
      />
    </>
  )
}
