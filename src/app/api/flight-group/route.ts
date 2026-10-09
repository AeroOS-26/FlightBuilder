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
import {
  createFlightGroup,
  type OrganizerAcknowledgmentInput,
  discardMirror,
  setGroupZohoRecordId,
  type CreateFlightGroupResult,
} from '@/features/group/server/groupStore'
import { withDatabaseMemberIds } from '@/api/services/flightPayload'
import { parseZohoEnvelope, unwrapZohoOutput } from '@/api/services/zohoWebhook'
import type { CreateFlightRelayResponse, FlightGroupCreatedEvent } from '@/types'

/**
 * What the Flight Builder posts.
 *
 * `event` is forwarded to Zoho untouched; `acknowledgment` never leaves this
 * server. The discriminator is `flight_group`, not `event` — the event object
 * has its own `event` field carrying the event *name*, so that one cannot tell
 * the two shapes apart.
 */
interface CreateFlightGroupRequest {
  event: FlightGroupCreatedEvent
  acknowledgment?: OrganizerAcknowledgmentInput | null
}

export async function POST(request: Request) {
  if (!isZohoConfigured()) {
    return NextResponse.json(
      { message: 'Flight integration is not configured on the server.' },
      { status: 503 },
    )
  }

  // The body is an envelope, not the event alone.
  //
  // The organiser's acknowledgment has to reach us with the create and must not
  // reach Zoho: the request body *is* the `flight_group.created` payload, so a
  // field added to the event would be forwarded verbatim. Wrapping is what
  // makes that impossible rather than merely avoided — `event` is all that is
  // ever sent on. A bare event body is still accepted, so nothing that posts
  // the old shape breaks.
  let payload: FlightGroupCreatedEvent
  let acknowledgment: OrganizerAcknowledgmentInput | null = null
  try {
    const body = (await request.json()) as Record<string, unknown>
    if (body && typeof body === 'object' && !('flight_group' in body)) {
      const envelope = body as unknown as CreateFlightGroupRequest
      payload = envelope.event
      acknowledgment = envelope.acknowledgment ?? null
    } else {
      payload = body as unknown as FlightGroupCreatedEvent
    }
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  // An acceptance with no account id behind it is not evidence of anything, and
  // `account_id` is the column that outlives the account. Refuse rather than
  // store an empty string.
  if (acknowledgment && !acknowledgment.accountId?.trim()) {
    return NextResponse.json(
      { message: 'The acknowledgment is missing the account it was made under.' },
      { status: 400 },
    )
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

  // The mirror runs BEFORE Zoho is called, which reverses the old order.
  //
  // The event has to carry the organiser's real flight_group_member.id, and
  // that id does not exist until the row does. Writing afterwards is what left
  // the organiser holding a browser-generated id at creation and a database id
  // on every later event — one person, two identities, nothing matchable
  // between them. See withDatabaseMemberIds.
  //
  // The cost of the swap is that a refusal from Zoho now leaves a group here
  // that exists nowhere else, so every exit below undoes it. What is NOT
  // acceptable is the reverse — telling the member their flight failed when
  // Zoho has it, because they retry and the CRM gets two.
  const mirror = await mirrorFlightGroup(payload, viewer, acknowledgment)
  const groupId = payload.flight_group.group_id

  // What actually goes on the wire. Without a mirror there is no database id to
  // use, so the browser ids stand — see mirrorFlightGroup for when that happens.
  const outbound = mirror ? withDatabaseMemberIds(payload, mirror.organizerMemberId) : payload

  // Independent, decoupled Freshworks contact write off the SAME submission.
  // Fired now so it runs alongside the Zoho call, awaited in `finally` so it
  // completes before the function returns. It never throws and self-skips when
  // unconfigured, so it can neither delay nor break flight creation, and it
  // does not depend on the Zoho outcome (uses an AER id, never the Zoho id).
  // Given the re-stamped event, so its external_id names the same member id
  // Zoho is about to receive rather than a browser key.
  const freshworksWrite = forwardFreshworksContact(outbound)

  // Forward to Zoho with a timeout so a hung upstream doesn't hang the request.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), serverEnv.zohoTimeoutMs)

  try {
    const upstream = await fetch(serverEnv.zohoWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(outbound),
      signal: controller.signal,
    })

    const text = await upstream.text()
    const envelope = parseZohoEnvelope(text)
    // The function's real result is a JSON string inside details.output.
    const fn = unwrapZohoOutput(envelope)

    if (!upstream.ok) {
      await undoMirror(mirror, groupId)
      return NextResponse.json(
        {
          flight_group_id: '',
          group_id: groupId,
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
      await undoMirror(mirror, groupId)
      return NextResponse.json(
        {
          flight_group_id: '',
          group_id: fn.group_id ?? groupId,
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
      group_id: fn?.group_id ?? groupId,
      success: fn?.success ?? true,
      message: fn?.message ?? envelope?.message,
    }

    // Zoho has the flight, so the pointer back to its record is the last step
    // rather than a condition of success. Never fatal: a group that is mirrored
    // but unstamped still serves every member-facing read, and the id can be
    // reconciled later. Failing the response here would tell the member their
    // flight was not created when it was.
    if (mirror && result.flight_group_id) {
      try {
        await setGroupZohoRecordId(groupId, result.flight_group_id)
      } catch (error) {
        console.error(
          `Zoho record id not stamped on ${groupId}:`,
          error instanceof Error ? error.message : error,
        )
      }
    }

    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    await undoMirror(mirror, groupId)
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
 * Runs BEFORE Zoho is called, because the event carries the organiser's real
 * `flight_group_member.id` and nothing can send an id that does not exist yet.
 * Returns that id, or null when there was nothing to mirror.
 *
 * Still never fails the response. A missing mirror is recoverable — the member
 * is told their flight was created, which it will be a moment later — whereas
 * refusing the flight over a database write would send them round again and put
 * a second record in the CRM. Zoho's record id is stamped on afterwards.
 *
 * Zoho stays the source of truth. This is what takes it out of the read path.
 */
async function mirrorFlightGroup(
  payload: FlightGroupCreatedEvent,
  viewer: Viewer | null,
  acknowledgment: OrganizerAcknowledgmentInput | null,
): Promise<CreateFlightGroupResult | null> {
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
        'no session. Neon has no row for it, so /group/[groupId] will 404 and ' +
        'the created event carries the browser ids rather than database ones.',
    )
    return null
  }

  try {
    return await createFlightGroup({
      flightGroup: payload.flight_group,
      organizerUserId: viewer.id,
      // Not a field on the contract: pets ride on members, so the group is
      // pet-friendly exactly when somebody is bringing one.
      petFriendly: payload.flight_group.members.some((m) => m.pets.length > 0),
      // Zoho has not been called yet, so there is no record id to store. The
      // relay stamps it on once the event comes back accepted.
      zohoRecordId: null,
      // Same transaction as the group. Never forwarded.
      acknowledgment,
    })
  } catch (error) {
    console.error(
      `Flight group mirror failed for ${payload.flight_group.group_id}:`,
      error instanceof Error ? error.message : error,
    )
    return null
  }
}

/**
 * Take back a mirror when the event it was written for was refused.
 *
 * Only for a group this request actually inserted. A group that was already
 * there belongs to an earlier, accepted creation — a retry landing on the same
 * id must not delete it.
 *
 * Swallows its own failure: the caller is already returning an error to the
 * member, and an undeletable row is a tidying problem, not one to report as a
 * second failure on top of the first.
 */
async function undoMirror(
  mirror: CreateFlightGroupResult | null,
  groupId: string,
): Promise<void> {
  if (!mirror?.groupCreated) return
  try {
    await discardMirror(groupId)
  } catch (error) {
    console.error(
      `Flight group mirror left behind for ${groupId} after a refused create:`,
      error instanceof Error ? error.message : error,
    )
  }
}
