/**
 * Join a flight group: POST /api/groups/[groupId]/join
 *
 * Writes the membership to our own database and emits `member.joined` to Zoho.
 *
 * Idempotent: the seat is written with ON CONFLICT against the (group, user)
 * uniqueness constraint, so a double submit or a retried request returns the
 * existing seat rather than adding a second member. The group row is locked for
 * the duration, so two simultaneous joins cannot both read the same remaining
 * count and overfill the flight.
 *
 * The party's pets arrive with the request and travel on the event only. They
 * are not stored here: the roster is keyed to accounts, and a pet on a flight
 * becomes a Zoho record through the event (contract section 7).
 */

import { NextResponse } from 'next/server'
import { requireViewerOrUnauthorized, type Viewer } from '@/features/auth/server/guard'
import { addMember, isRefused } from '@/features/group/server/groupStore'
import { findByEmail } from '@/features/auth/server/members'
import { serverEnv, isZohoConfigured } from '@/config/serverEnv'
import { buildMemberJoined } from '@/api/services/memberJoinedPayload'
import { hasPetListErrors, validatePetList } from '@/features/flight-builder/validation'
import { TEMPERAMENTS } from '@/features/flight-builder/config/petOptions'
import type { MemberJoinResponse, Pet, PetTemperament } from '@/types'

interface JoinRequestBody {
  seats?: unknown
  pets?: unknown
  readiness_accepted?: unknown
}

/** Past this, a value is not a pet detail anyone typed. */
const MAX_PET_FIELD_LENGTH = 100

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
): Promise<Response> {
  const viewer = await requireViewerOrUnauthorized()
  if (viewer instanceof Response) return viewer

  const { groupId } = await params

  let body: JoinRequestBody = {}
  try {
    body = ((await request.json()) as JoinRequestBody | null) ?? {}
  } catch {
    // No body, or not JSON. Treat as a single traveller with no pets.
  }

  // How many spaces this join takes: the member plus any companions added on
  // the review screen. Absent or unparseable means one, which is the truth for
  // a lone traveller and the safe reading of a malformed body — it can only
  // ever under-claim, never silently take spaces the member did not ask for.
  //
  // Trusted from the client only for the count. The travellers themselves are
  // not stored here: they have no accounts, and the roster is keyed to users.
  let seatsRequested = 1
  const parsedSeats = Number(body.seats)
  if (Number.isFinite(parsedSeats) && parsedSeats >= 1) {
    seatsRequested = Math.trunc(parsedSeats)
  }

  // The rules the review screen applies, checked again because the body is
  // client input. Nothing is seated until they pass.
  const pets = parsePets(body.pets)
  if (!pets) {
    return NextResponse.json({ message: 'Invalid pet details.' }, { status: 400 })
  }
  const readinessAccepted = body.readiness_accepted === true
  const petErrors = validatePetList({
    pets,
    petsEnabled: pets.length > 0,
    readinessAccepted,
    travelerCount: seatsRequested,
  })
  if (hasPetListErrors(petErrors)) {
    return NextResponse.json(
      { message: 'Please complete your pet details before joining.' },
      { status: 422 },
    )
  }

  try {
    const seat = await addMember(groupId, viewer.id, seatsRequested)
    if (!seat) {
      return NextResponse.json({ message: 'Group not found' }, { status: 404 })
    }

    // Refused for capacity. Nothing was written, so the member can retry with a
    // smaller party. The client ruled on 2026-09-10 that failing a join beats
    // overbooking a charter; this is that rule, enforced against our own roster
    // rather than a commit-time read against Zoho, which was stood down the
    // same day once Chuck confirmed nobody is added by hand.
    if (isRefused(seat)) {
      const { spacesRemaining } = seat
      return NextResponse.json(
        {
          message:
            spacesRemaining === 0
              ? 'This group is now full.'
              : `Only ${spacesRemaining} ${spacesRemaining === 1 ? 'space' : 'spaces'} left on this flight.`,
          spaces_remaining: spacesRemaining,
        },
        { status: 409 },
      )
    }

    const filled = seat.memberCount >= seat.spacesTotal

    // Only a genuinely new member is worth telling Zoho about; re-emitting on a
    // retry would create duplicate CRM activity for one join.
    if (!seat.alreadyMember) {
      await emitMemberJoined({
        groupId,
        viewer,
        seatId: seat.memberId,
        zohoRecordId: seat.zohoRecordId,
        pets,
        readinessAccepted,
      })
    }

    const response: MemberJoinResponse = {
      success: true,
      member_id: seat.memberId,
      group_state: filled ? 'full' : 'forming',
      filled,
    }
    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Join endpoint error:', error)
    return NextResponse.json({ message: 'Failed to join group' }, { status: 500 })
  }
}

/**
 * The pets from the request body, or null when the shape is wrong.
 *
 * Missing means none are coming. Which fields are required is left to
 * `validatePetList`, so those stay the rules the screen shows.
 */
function parsePets(raw: unknown): Pet[] | null {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw)) return null

  const pets: Pet[] = []
  for (let index = 0; index < raw.length; index++) {
    const item: unknown = raw[index]
    if (typeof item !== 'object' || item === null) return null

    const fields = item as Record<string, unknown>
    const name = fields.name === undefined ? '' : text(fields.name)
    const type = text(fields.type)
    const breed = text(fields.breed)
    const weight = text(fields.weight)
    const temperament =
      fields.temperament === '' ? '' : isTemperament(fields.temperament) ? fields.temperament : null

    if (
      name === null ||
      type === null ||
      breed === null ||
      weight === null ||
      temperament === null
    ) {
      return null
    }

    pets.push({ id: `pet-${index}`, name, type, breed, weight, temperament })
  }
  return pets
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length <= MAX_PET_FIELD_LENGTH ? value.trim() : null
}

function isTemperament(value: unknown): value is PetTemperament {
  return (TEMPERAMENTS as readonly unknown[]).includes(value)
}

/**
 * Tell Zoho a member joined.
 *
 * Never throws. The member is already seated in our database at this point, and
 * Zoho's unreliability is the reason reads were moved out of its request path in
 * the first place — so a failed emit must not fail a join the member completed.
 * It is logged loudly instead; reconciling a missed event is follow-up work.
 */
async function emitMemberJoined({
  groupId,
  viewer,
  seatId,
  zohoRecordId,
  pets,
  readinessAccepted,
}: {
  groupId: string
  viewer: Viewer
  seatId: string
  zohoRecordId: string | null
  pets: Pet[]
  readinessAccepted: boolean
}): Promise<void> {
  if (!isZohoConfigured()) return

  try {
    const member = await findByEmail(viewer.email)

    const event = buildMemberJoined({
      groupId,
      zohoRecordId,
      seatId,
      accountId: viewer.accountId,
      name: member?.name ?? null,
      email: viewer.email,
      phone: member?.phone ?? null,
      pets,
      readinessAccepted,
      sentAt: new Date().toISOString(),
    })

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), serverEnv.zohoTimeoutMs)

    try {
      const upstream = await fetch(serverEnv.zohoWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        signal: controller.signal,
      })
      if (!upstream.ok) {
        console.error(
          `member.joined rejected for ${groupId}/user ${viewer.id}: HTTP ${upstream.status}`,
        )
      }
    } finally {
      clearTimeout(timer)
    }
  } catch (error) {
    console.error(
      `member.joined emit failed for ${groupId}/user ${viewer.id}:`,
      error instanceof Error ? error.message : error,
    )
  }
}
