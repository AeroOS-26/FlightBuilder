'use client'

/**
 * Join Flight button for the public flight detail page (Frames 10–16, logged-in variants).
 *
 * Renders different states based on group capacity and viewer membership:
 * - ready: "Join" button enabled
 * - full: "Group is full" button disabled
 * - already_joined: "Already joined" badge (read-only)
 * - joining: "Joining..." (loading state)
 * - error: "Error joining" with retry button
 */

import { useState } from 'react'
import type { PublicView } from '@/types'

interface JoinButtonProps {
  flight: PublicView
  isAlreadyMember: boolean
  onJoinClick: () => void
}

export function JoinButton({ flight, isAlreadyMember, onJoinClick }: JoinButtonProps) {
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isFull = flight.spaces_remaining <= 0
  const isDisabled = isFull || isAlreadyMember || isJoining

  const handleClick = async () => {
    if (isDisabled) return

    setIsJoining(true)
    setError(null)

    try {
      // TODO: Call join endpoint
      onJoinClick()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join')
      setIsJoining(false)
    }
  }

  if (isAlreadyMember) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
        <span className="text-sm font-medium">Already joined</span>
      </div>
    )
  }

  if (isFull) {
    return (
      <button disabled className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed">
        Group is full
      </button>
    )
  }

  if (error) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={handleClick} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
          Try again
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isJoining}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
    >
      {isJoining ? 'Joining...' : 'Join'}
    </button>
  )
}
