/**
 * Server-side read-relay: GET /api/public-flight/[token]
 *
 * The public join page is opened by an anonymous visitor from a share link. The
 * visitor must never receive anything beyond the public-safe view — no operator,
 * tail number, airport code, FBO, exact times, pricing, or member identities.
 *
 * This relay is where that guarantee is enforced. It resolves the flight from
 * the share token server-side, resolves the stored Zoho record id (the visitor
 * has never seen it and holds no client-side copy), and filters the group down
 * to the `public_view` shape BEFORE anything reaches the browser. Withheld
 * fields are dropped here, at the data layer, not merely hidden in the UI.
 *
 * Data source: the live Zoho read (`fetchGroupPublicView`) when
 * ZOHO_PUBLIC_VIEW_URL is configured; otherwise a sample fixture, so local dev
 * and previews work without the endpoint. The URL carries the share slug; the
 * endpoint keys on group_id, so we derive one from the other here.
 */

import { NextResponse } from 'next/server'
import { isPublicViewConfigured } from '@/config/serverEnv'
import { fetchGroupPublicView } from '@/features/public-flight/data/fetchPublicView'
import { resolveGroupByToken } from '@/features/public-flight/data/sampleGroups'
import { toPublicView } from '@/features/public-flight/data/toPublicView'
import { groupIdFromSlug } from '@/features/public-flight/format'
import type { PublicFlightResult } from '@/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  // Live read when the endpoint is configured.
  if (isPublicViewConfigured()) {
    const groupId = groupIdFromSlug(token)
    const result = await fetchGroupPublicView(groupId)

    if (result.status === 'ok') {
      const body: PublicFlightResult = { status: 'ok', flight: result.flight }
      return NextResponse.json(body, { status: 200 })
    }
    if (result.status === 'not_found') {
      const body: PublicFlightResult = { status: 'not_found' }
      return NextResponse.json(body, { status: 404 })
    }
    // Upstream error — surface as a retryable failure for the query layer.
    return NextResponse.json(
      { message: 'Could not load the flight. Please try again.' },
      { status: 502 },
    )
  }

  // Fallback: sample data behind the same public-safe filter.
  const group = resolveGroupByToken(token)
  if (!group) {
    const body: PublicFlightResult = { status: 'not_found' }
    return NextResponse.json(body, { status: 404 })
  }
  const body: PublicFlightResult = { status: 'ok', flight: toPublicView(group) }
  return NextResponse.json(body, { status: 200 })
}
