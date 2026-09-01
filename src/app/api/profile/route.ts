/**
 * Member profile — /api/profile (frame 31's "Save and Continue").
 *
 * There is no Zoho call here by design, not by omission: the client has
 * confirmed travelers and pets stay in the application and only become CRM
 * records when they are on a flight, through the per-member `pets` array the
 * payload contract already carries.
 *
 * Authorisation is the point of this route. The profile written is always the
 * SESSION's, never an id from the body — the permission rule is that a member
 * changing an id in a request must be refused by the endpoint, not merely shown
 * a different screen.
 */

import { NextResponse } from 'next/server'
import { requireViewerOrUnauthorized } from '@/features/auth/server/guard'
import {
  getProfile,
  saveProfile,
  updateMemberName,
  updateMemberPhone,
  memberPhone,
} from '@/features/auth/server/profile'
import type { Pet, Traveler } from '@/types'

export async function GET() {
  const viewer = await requireViewerOrUnauthorized()
  if (viewer instanceof Response) return viewer

  const profile = await getProfile(viewer.id)
  // The phone lives on `users`, not `member_profile`, so it is returned
  // alongside rather than inside the profile object.
  const phone = await memberPhone(viewer.id)
  return NextResponse.json({ profile, phone }, { status: 200 })
}

export async function POST(request: Request) {
  const viewer = await requireViewerOrUnauthorized()
  if (viewer instanceof Response) return viewer

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const travelers = Array.isArray(body.travelers) ? (body.travelers as Traveler[]) : []
  const pets = Array.isArray(body.pets) ? (body.pets as Pet[]) : []

  // The readiness box gates pets, exactly as the Flight Builder gates them.
  const petsEnabled = Boolean(body.petsEnabled)
  if (petsEnabled && pets.length > 0 && !body.travelReadinessAccepted) {
    return NextResponse.json(
      { message: 'Accept the travel readiness statement to save pets.' },
      { status: 422 },
    )
  }

  await saveProfile(viewer.id, {
    travelers,
    // Turning pets off clears the list, so a disabled section cannot leave
    // orphaned animals behind — the same invariant the builder's store holds.
    pets: petsEnabled ? pets : [],
    petsEnabled,
    travelReadinessAccepted: Boolean(body.travelReadinessAccepted),
    notifyEmail: body.notifyEmail !== false,
    notifySms: body.notifySms !== false,
    notifyRoutes: Boolean(body.notifyRoutes),
  })

  const primary = travelers.find((t) => t.isFounder) ?? travelers[0]
  if (primary?.name) await updateMemberName(viewer.id, primary.name)

  // Optional, and blank is a real answer — see updateMemberPhone. Only skipped
  // when the key is absent entirely, so a caller that does not know about the
  // field cannot wipe a number the member already gave us.
  if (typeof body.phone === 'string') await updateMemberPhone(viewer.id, body.phone)

  return NextResponse.json({ success: true }, { status: 200 })
}
