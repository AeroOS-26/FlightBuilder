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
 * The resolution itself lives in `resolvePublicFlight`, shared with the server
 * render of /share/[token] so the page and this relay can never disagree about
 * what a token resolves to. This handler only maps that result onto HTTP.
 */

import { NextResponse } from 'next/server'
import { resolvePublicFlight } from '@/features/public-flight/data/resolvePublicFlight'
import type { PublicFlightResult } from '@/types'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const resolved = await resolvePublicFlight(token)

  if (resolved.status === 'ok') {
    const body: PublicFlightResult = { status: 'ok', flight: resolved.flight }
    return NextResponse.json(body, { status: 200 })
  }

  if (resolved.status === 'not_found') {
    const body: PublicFlightResult = { status: 'not_found' }
    return NextResponse.json(body, { status: 404 })
  }

  // Upstream error — surface as a retryable failure for the query layer.
  return NextResponse.json(
    { message: 'Could not load the flight. Please try again.' },
    { status: 502 },
  )
}
