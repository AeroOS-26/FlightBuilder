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

/**
 * Zoho's envelope around a CRM Function call.
 *
 * The function's own return value is a JSON *string* in `details.output` —
 * nothing useful sits at the top level. This is the same wrapping the public
 * read already unwraps (see features/public-flight/data/fetchPublicView.ts).
 *
 * `details.id` is deliberately NOT modelled: it is the Zoho *function's* id,
 * identical on every call. Reading it as a record id was the cause of the
 * duplicate-id defect raised 2026-08-10 (every flight came back with the same
 * value, because the real id was nested and never read). Leaving it off the
 * type keeps it from being reintroduced as a fallback.
 */
interface ZohoEnvelope {
  code?: string
  message?: string
  details?: { output?: string; userMessage?: string[] }
}

/** The function's actual result, parsed out of `details.output`. */
interface ZohoFunctionResult {
  event?: string
  /** The created Flight Group record id — the value we want. */
  flight_group_id?: string
  /** The payload contract's name for the same value; accepted as an alias. */
  zoho_flight_group_record_id?: string
  group_id?: string
  success?: boolean
  message?: string
  members_total?: number
  members_succeeded?: number
  members_failed?: number
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
    const envelope = safeParse(text)
    // The function's real result is a JSON string inside details.output.
    const fn = unwrapOutput(envelope)

    if (!upstream.ok) {
      return NextResponse.json(
        {
          flight_group_id: '',
          group_id: payload.flight_group.group_id,
          success: false,
          message:
            fn?.message ?? envelope?.message ?? 'The flight service rejected the request.',
        },
        { status: upstream.status },
      )
    }

    // Zoho answers 200 with code:"success" for a function that *ran*, even when
    // the function itself reports a failure. The authoritative outcome is the
    // `success` flag inside details.output, so an explicit false is a failure —
    // the caller must not show the Share screen for a flight that wasn't saved.
    if (fn?.success === false) {
      return NextResponse.json(
        {
          flight_group_id: '',
          group_id: fn.group_id ?? payload.flight_group.group_id,
          success: false,
          message: fn.message ?? 'The flight service could not create your flight.',
        },
        { status: 502 },
      )
    }

    // Record id comes from inside details.output. It is NOT at the top level —
    // reading it there is what produced the duplicate-id defect (2026-08-10):
    // the value was always undefined and the old `details.id` fallback, the
    // function's constant id, stood in for it on every flight.
    //
    // `zoho_flight_group_record_id` is the name the payload contract uses; we
    // accept it alongside the current `flight_group_id` so the backend can move
    // to the contracted name without a frontend change.
    const result: CreateFlightRelayResponse = {
      flight_group_id: fn?.flight_group_id ?? fn?.zoho_flight_group_record_id ?? '',
      group_id: fn?.group_id ?? payload.flight_group.group_id,
      success: fn?.success ?? true,
      message: fn?.message ?? envelope?.message,
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

function safeParse(text: string): ZohoEnvelope | null {
  try {
    return JSON.parse(text) as ZohoEnvelope
  } catch {
    return null
  }
}

/**
 * Pull the function's own result out of Zoho's envelope.
 *
 * `details.output` is a JSON *string*, so it needs a second parse. If the shape
 * ever changes we fall back to reading the envelope as the flat result rather
 * than failing the create — an unknown shape then yields no record id, which is
 * honest, instead of a wrong one.
 */
function unwrapOutput(envelope: ZohoEnvelope | null): ZohoFunctionResult | null {
  if (!envelope) return null

  const raw = envelope.details?.output
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ZohoFunctionResult
    } catch {
      // Unparseable output — fall through to the flat reading below.
    }
  }

  return envelope as ZohoFunctionResult
}
