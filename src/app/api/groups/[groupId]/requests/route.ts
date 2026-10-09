/**
 * Ask to join a flight: POST /api/groups/[groupId]/requests
 *
 * What the join used to be, minus the part that mattered: this takes no place
 * and seats nobody. The request waits for the organiser, and only their
 * approval consumes capacity — which is why `member.joined` and
 * `flight_group.filled` moved to the approve route and are absent here.
 *
 * Validation is the join route's, unchanged: the same `validatePetList` the
 * Flight Builder and frame 31 use, so a pet is judged the same way wherever it
 * is entered.
 */

import { NextResponse } from 'next/server'
import { requireViewerOrUnauthorized } from '@/features/auth/server/guard'
import {
  submitJoinRequest,
  groupZohoRecordId,
  requesterContact,
  getGroupEmailContext,
} from '@/features/join-approval/server/joinRequestStore'
import { emailOrganiserNewRequest } from '@/features/join-approval/server/approvalEmails'
import { buildJoinRequestCreated } from '@/api/services/joinRequestPayloads'
import { sendZohoEvent } from '@/api/services/zohoWebhook'
import { mapPet } from '@/api/services/petPayload'
import { hasPetListErrors, validatePetList } from '@/features/flight-builder/validation'
import { TEMPERAMENTS } from '@/features/flight-builder/config/petOptions'
import type { Pet, PetTemperament, Traveler } from '@/types'

/** The same shape the sign-in and interest-lead validators accept. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const MAX_PET_FIELD_LENGTH = 100
const MAX_TRAVELLERS = 10

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const viewer = await requireViewerOrUnauthorized()
  if (viewer instanceof Response) return viewer

  const { groupId } = await params
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const travelers = parseTravelers(body.travelers)
  if (!travelers) {
    return NextResponse.json({ message: 'Invalid traveller details.' }, { status: 400 })
  }

  const pets = parsePets(body.pets)
  if (!pets) {
    return NextResponse.json({ message: 'Invalid pet details.' }, { status: 400 })
  }

  const readinessAccepted = body.readiness_accepted === true

  /**
   * The address the decision should go to, when frame 42's field was changed.
   * Validated here as well as on the screen: the screen can be bypassed, and
   * an unroutable address means the requester never hears the answer.
   */
  const contactEmail = typeof body.email === 'string' ? body.email.trim() : ''
  if (contactEmail && !EMAIL_RE.test(contactEmail)) {
    return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 422 })
  }

  // Counted in people. One place per traveller; pets take none.
  const places = Math.max(1, travelers.length)

  // The cap is per traveller, so the count is part of judging the list — the
  // same rule the Flight Builder applies.
  const petErrors = validatePetList({
    pets,
    petsEnabled: pets.length > 0,
    readinessAccepted,
    travelerCount: places,
  })
  if (hasPetListErrors(petErrors)) {
    return NextResponse.json(
      { message: 'Please check the pet details.', errors: petErrors },
      { status: 422 },
    )
  }

  const result = await submitJoinRequest(groupId, viewer.id, {
    places,
    travelers,
    pets: pets.map((pet) => mapPet(pet, readinessAccepted)),
    contactEmail: contactEmail || null,
  })

  if ('refused' in result) {
    switch (result.refused) {
      case 'group-full':
        return NextResponse.json(
          { message: 'This group is full and is not taking new requests.' },
          { status: 409 },
        )
      case 'already-member':
        return NextResponse.json({ message: 'You are already in this group.' }, { status: 409 })
      case 'already-pending':
        return NextResponse.json(
          { message: 'You already have a request waiting on this flight.' },
          { status: 409 },
        )
      default:
        // Including group-not-found: the route does not confirm a group exists.
        return NextResponse.json({ message: 'Not found' }, { status: 404 })
    }
  }

  // After the fact and never fatal: the request is recorded, and a failed emit
  // must not tell someone their request did not go through when it did.
  await emitRequestCreated(groupId, viewer.id, result, pets.map((pet) => mapPet(pet, readinessAccepted)))

  // The organiser is told there is something waiting on them. After the fact
  // and never fatal, for the same reason the event is.
  const [context, requester] = await Promise.all([
    getGroupEmailContext(groupId),
    requesterContact(viewer.id),
  ])
  if (context?.organizerEmail) {
    await emailOrganiserNewRequest({
      to: context.organizerEmail,
      organizerName: context.organizerName,
      requesterName: requester.name,
      flight: { route: context.route, departureDate: context.departureDate },
      placesRequested: result.placesRequested,
      groupLink: context.groupLink,
    })
  }

  return NextResponse.json(
    {
      success: true,
      join_request_id: `jr_${result.id}`,
      status: result.status,
      places_requested: result.placesRequested,
    },
    { status: 201 },
  )
}

/** Names only — a traveller on a request has no account of their own. */
function parseTravelers(raw: unknown): Traveler[] | null {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw) || raw.length > MAX_TRAVELLERS) return null

  const travelers: Traveler[] = []
  for (const [index, entry] of raw.entries()) {
    if (typeof entry !== 'object' || entry === null) return null
    const fields = entry as Record<string, unknown>
    const name = text(fields.name)
    if (name === null) return null
    travelers.push({
      id: typeof fields.id === 'string' ? fields.id : `traveler-${index}`,
      name,
      isFounder: false,
    })
  }
  return travelers
}

function parsePets(raw: unknown): Pet[] | null {
  if (raw === undefined || raw === null) return []
  if (!Array.isArray(raw)) return null

  const pets: Pet[] = []
  for (const [index, entry] of raw.entries()) {
    if (typeof entry !== 'object' || entry === null) return null
    const fields = entry as Record<string, unknown>

    const name = text(fields.name)
    const type = text(fields.type)
    const breed = text(fields.breed)
    const weight = text(fields.weight)
    const temperament =
      fields.temperament === '' ? '' : isTemperament(fields.temperament) ? fields.temperament : null

    if (name === null || type === null || breed === null || weight === null || temperament === null) {
      return null
    }

    // Stored, deliberately not forwarded: the pet object's service-animal field
    // is held until it exists on the Zoho side. Anything but an explicit true
    // is false — an absent flag is not a claim.
    pets.push({
      id: `pet-${index}`,
      name,
      type,
      breed,
      weight,
      temperament,
      serviceAnimal: fields.service_animal === true,
    })
  }
  return pets
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length <= MAX_PET_FIELD_LENGTH ? value.trim() : null
}

function isTemperament(value: unknown): value is PetTemperament {
  return (TEMPERAMENTS as readonly unknown[]).includes(value)
}

async function emitRequestCreated(
  groupId: string,
  userId: string,
  request: {
    id: number
    placesRequested: number
    travelers: unknown[]
    requestedAt: Date
    contactEmail: string | null
  },
  pets: ReturnType<typeof mapPet>[],
): Promise<void> {
  try {
    const [zohoRecordId, requester] = await Promise.all([
      groupZohoRecordId(groupId),
      requesterContact(userId),
    ])
    const event = buildJoinRequestCreated({
      groupId,
      zohoRecordId,
      requestId: request.id,
      requestedAt: request.requestedAt.toISOString(),
      placesNeeded: request.placesRequested,
      travelersCount: Math.max(1, request.travelers.length),
      // What they typed on frame 42 wins over the account's address. The
      // contract's `requester.email` is where the decision is sent from.
      requester: { ...requester, email: request.contactEmail ?? requester.email },
      pets,
      sentAt: new Date().toISOString(),
    })
    await sendZohoEvent(event, `join_request.created ${groupId} jr_${request.id}`)
  } catch (error) {
    console.error(
      `join_request.created failed for ${groupId} jr_${request.id}:`,
      error instanceof Error ? error.message : error,
    )
  }
}
