/**
 * Server-side relay: POST /api/flight-group
 *
 * The browser cannot call the Zoho webhook directly — the webhook URL embeds
 * the zapikey secret and would be exposed in client traffic (and hit CORS).
 * This Route Handler runs on the server, holds the secret URL (server-only env),
 * forwards the `flight_group.created` payload to Zoho, and returns a normalized
 * result (the created record id) to the client.
 *
 * This is the single transport boundary to the backend on the write path.
 */

import { NextResponse } from 'next/server'
import { serverEnv, isZohoConfigured } from '@/config/serverEnv'
import { forwardFreshworksContact } from '@/api/services/freshworksContact'
import type { CreateFlightRelayResponse, FlightGroupCreatedEvent } from '@/types'

/** Shape the backend function returns (per spec), plus legacy fallbacks. */
interface ZohoFunctionResponse {
  flight_group_id?: string
  group_id?: string
  success?: boolean
  message?: string
  code?: string
  details?: { output?: string; id?: string; userMessage?: string[] }
}

export async function POST(request: Request) {
  if (!isZohoConfigured()) {
    return NextResponse.json(
      { message: 'Flight integration is not configured on the server.' },
      { status: 503 },
    )
  }

  let payload: FlightGroupCreatedEvent
  try {
    payload = (await request.json()) as FlightGroupCreatedEvent
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  // Independent, decoupled Freshworks contact write off the SAME submission.
  // Fired now so it runs alongside the Zoho call, awaited in `finally` so it
  // completes before the function returns. It never throws and self-skips when
  // unconfigured, so it can neither delay nor break flight creation, and it
  // does not depend on the Zoho outcome (uses an AER id, never the Zoho id).
  const freshworksWrite = forwardFreshworksContact(payload)

  // Forward to Zoho with a timeout so a hung upstream doesn't hang the request.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), serverEnv.zohoTimeoutMs)

  try {
    const upstream = await fetch(serverEnv.zohoWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const text = await upstream.text()
    const data = safeParse(text)

    if (!upstream.ok) {
      return NextResponse.json(
        {
          flight_group_id: '',
          group_id: payload.flight_group.group_id,
          success: false,
          message: data?.message ?? 'The flight service rejected the request.',
        },
        { status: upstream.status },
      )
    }

    // The backend returns { flight_group_id, group_id, success, message? }.
    // Fall back to the legacy details.id shape if present.
    const result: CreateFlightRelayResponse = {
      flight_group_id: data?.flight_group_id ?? data?.details?.id ?? '',
      group_id: data?.group_id ?? payload.flight_group.group_id,
      success: data?.success ?? true,
      message: data?.message,
    }
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    return NextResponse.json(
      {
        message: aborted
          ? 'The flight service timed out. Please try again.'
          : 'Could not reach the flight service. Please try again.',
      },
      { status: aborted ? 504 : 502 },
    )
  } finally {
    clearTimeout(timer)
    // Ensure the independent Freshworks write finishes before the serverless
    // function returns (it never throws and never changes the response above).
    await freshworksWrite
  }
}

function safeParse(text: string): ZohoFunctionResponse | null {
  try {
    return JSON.parse(text) as ZohoFunctionResponse
  } catch {
    return null
  }
}
