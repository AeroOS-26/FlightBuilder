'use client'

/**
 * Re-runs the current route on the server when the tab regains focus.
 *
 * Client decision, 2026-09-09: a member leaves a group open in a background
 * tab while it fills, so what they come back to has to be current.
 *
 * Renders nothing. Mount it inside a page whose data should refresh.
 *
 * **Why `router.refresh()` rather than a client query.** The group screen is a
 * server component that reads the roster directly. Moving it behind TanStack
 * Query would work, but would cost a second copy of the membership rule, a
 * loading skeleton where there is now server-rendered HTML, and a client-side
 * expression of the 404 path. `router.refresh()` re-runs the route and
 * reconciles into the live tree instead: no skeleton, and component state such
 * as the "copied" flag on the share button survives.
 *
 * It also re-runs the route's guards on every refresh, which is a security
 * gain rather than a cost — a member removed from the group while the tab was
 * backgrounded gets a real 404 on their next focus rather than a stale screen.
 *
 * Note this is a no-op on a statically rendered route; it relies on the route
 * being dynamic, which /group/[groupId] is because it reads the session.
 */

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * A single tab switch fires `visibilitychange` *and* `focus`, so without a
 * dedupe window every return to the tab costs two server round trips. Ten
 * seconds also absorbs someone flicking between windows.
 */
const MIN_INTERVAL_MS = 10_000

interface RefreshOnFocusProps {
  /** Override the dedupe window. Rarely needed. */
  minIntervalMs?: number
}

export function RefreshOnFocus({ minIntervalMs = MIN_INTERVAL_MS }: RefreshOnFocusProps = {}) {
  const router = useRouter()
  // Seeded to mount time: the server has just rendered this page, so an
  // immediate focus event should not refetch what we already have.
  const lastRefreshedAt = useRef(Date.now())

  useEffect(() => {
    function maybeRefresh() {
      // `focus` also fires for a window that is not the visible tab.
      if (document.visibilityState !== 'visible') return

      const now = Date.now()
      if (now - lastRefreshedAt.current < minIntervalMs) return

      lastRefreshedAt.current = now
      router.refresh()
    }

    // Both are needed: `visibilitychange` is the tab-switch signal, while
    // `focus` catches alt-tabbing back into an already-visible tab.
    document.addEventListener('visibilitychange', maybeRefresh)
    window.addEventListener('focus', maybeRefresh)

    return () => {
      document.removeEventListener('visibilitychange', maybeRefresh)
      window.removeEventListener('focus', maybeRefresh)
    }
  }, [router, minIntervalMs])

  return null
}
