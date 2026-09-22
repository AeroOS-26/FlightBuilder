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
import { currentViewer, type Viewer } from '@/features/auth/server/guard'
import { createFlightGroup } from '@/features/group/server/groupStore'
import { parseZohoEnvelope, unwrapZohoOutput } from '@/api/services/zohoWebhook'
import type { CreateFlightRelayResponse, FlightGroupCreatedEvent } from '@/types'

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

  // This route's auth posture, stated once and in the open.
  //
  // Deliberately NOT a 401. Whether the Flight Builder requires an account is
  // still open with the client (B5 in docs/CLIENT-DECISIONS.md), and refusing
  // anonymous callers here would decide it unilaterally. Read the session, act
  // on it below, and leave the policy to one line when the answer lands.
  //
  // What it does govern is the Neon mirror: the group's organiser pointer and
  // its seat in flight_group_member are both keyed to a user id, so with no
  // viewer there is nothing to mirror to. See mirrorFlightGroup.
  const viewer = await currentViewer()

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
    const envelope = parseZohoEnvelope(text)
    // The function's real result is a JSON string inside details.output.
    const fn = unwrapZohoOutput(envelope)

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

    await mirrorFlightGroup(payload, result.flight_group_id, viewer)

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

/**
 * Mirror the created group into our own database.
 *
 * Runs after Zoho has accepted the flight and never fails the response. Once
 * Zoho has the record the flight genuinely exists, so a failed mirror must not
 * tell the member their flight was not created — they would retry and create a
 * second one. A missing mirror is recoverable; a duplicate in the CRM is not.
 *
 * Zoho stays the source of truth. This is what takes it out of the read path.
 */
async function mirrorFlightGroup(
  payload: FlightGroupCreatedEvent,
  zohoRecordId: string,
  viewer: Viewer | null,
): Promise<void> {
  // No session, no mirror. This is a fail-safe, not a choice:
  // flight_group_member.user_id is NOT NULL (migration 0004), so the
  // transaction below could only throw. Returning early makes that explicit.
  //
  // Logged loudly because the divergence is otherwise invisible. Zoho has
  // already accepted the flight, so the member is told it was created — but
  // nothing landed in Neon, and group detail reads from Neon. Today this is
  // unreachable (the builder is gated wherever the mirror exists); it becomes
  // reachable the moment M2 ships on an ungated builder, which is exactly when
  // a silent skip would be most expensive.
  if (!viewer) {
    console.warn(
      `Flight group mirror skipped for ${payload.flight_group.group_id}: ` +
        'no session. Zoho accepted the flight, but Neon has no row for it, ' +
        'so /group/[groupId] will 404.',
    )
    return
  }

  try {
    await createFlightGroup({
      flightGroup: payload.flight_group,
      organizerUserId: viewer.id,
      // Not a field on the contract: pets ride on members, so the group is
      // pet-friendly exactly when somebody is bringing one.
      petFriendly: payload.flight_group.members.some((m) => m.pets.length > 0),
      zohoRecordId: zohoRecordId || null,
    })
  } catch (error) {
    console.error(
      `Flight group mirror failed for ${payload.flight_group.group_id}:`,
      error instanceof Error ? error.message : error,
    )
  }
}
