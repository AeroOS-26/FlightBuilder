/**
 * Mock data for the approval screens in the dev preview harness.
 *
 * Deliberately the *same* example data the Figma frames carry — Margot Davies's
 * San Francisco to New York group, five of six taken, Tomás Iglesias and Priya
 * Raman waiting, Priya needing two places with one open. The preview and the
 * design can then be put side by side and compared literally rather than
 * interpreted: anything that differs is a defect in the build, not a difference
 * in the sample.
 *
 * Built on `mockGroupFilling` rather than a fresh literal, so it stays valid as
 * `GroupDetailView` grows instead of needing a cast that hides missing fields.
 *
 * Dev-only. Imported solely by `PreviewScreens.tsx`.
 */

import { mockGroupFilling } from '@/services/mockData'
import type { GroupDetailView, GroupDetailMember } from '@/types'
import type { PendingRequest } from '../components/OrganiserRequestsView'

function member(
  id: string,
  name: string,
  role: GroupDetailMember['role'],
  places: number,
  petCount: number,
  petSummary: string | null,
  isSelf = false,
): GroupDetailMember {
  return {
    user_id: id,
    display_name: name,
    first_initial: name.charAt(0).toUpperCase(),
    role,
    joined_at: '2026-06-05T10:00:00.000Z',
    member_status: 'confirmed',
    is_self: isSelf,
    places,
    pet_count: petCount,
    pet_summary: petSummary,
  }
}

const ROSTER: GroupDetailMember[] = [
  member('1', 'Margot Davies', 'organizer', 1, 1, 'Luna (Cat)', true),
  member('2', 'Aisha Sato', 'joiner', 1, 1, 'Mochi (Cat)'),
  member('3', 'Daniel Kim', 'joiner', 2, 0, null),
  member('4', 'Lena Fischer', 'joiner', 1, 0, null),
]

/**
 * Margot's group. `filled` adds the member whose approval took the last place,
 * which is the state frame 49 describes.
 */
export function mockOrganiserGroup(filled = false): GroupDetailView {
  const members = filled
    ? [...ROSTER, member('5', 'Tomás Iglesias', 'joiner', 1, 1, 'Nube (Cat)')]
    : ROSTER

  return {
    ...mockGroupFilling,
    group_id: '202606-SFO-JFK-PREVIEW',
    organizer_name: 'Margot Davies',
    members,
    flight: {
      ...mockGroupFilling.flight,
      route_origin_city: 'San Francisco, California, United States',
      route_origin_code: 'SFO',
      route_destination_city: 'New York, New York, United States',
      // The base mock is a San Francisco → Los Angeles flight; overriding the
      // city without the code left the band reading "LAX · New York".
      route_destination_code: 'JFK',
      departure_date: '2026-06-18',
      // Overridden alongside `departure_date`, which the base mock sets to a
      // September window — without this, frames 45, 47 and 49 showed September
      // while 44 and 48 showed June. A window rather than one day, so the
      // preview exercises the case finding 15 was about.
      estimated_date_range: { earliest_date: '2026-06-18', latest_date: '2026-06-22' },
      aircraft_category: 'Light Jet',
      spaces_total: 6,
      spaces_remaining: filled ? 0 : 1,
    },
  }
}

/**
 * Frame 45's group, seen by Tomás rather than by Margot.
 *
 * Same six people the frame lists — 1 + 1 + 2 + 1 + 1 places, which is the
 * "6 of 6 people" it shows — with `is_self` moved off the organiser, because
 * this is the one approval screen drawn from a participant's seat.
 */
export function mockParticipantGroup(): GroupDetailView {
  const base = mockOrganiserGroup(true)
  return {
    ...base,
    members: base.members.map((m) => ({
      ...m,
      is_self: m.display_name === 'Tomás Iglesias',
      joined_at: m.display_name === 'Tomás Iglesias' ? '2026-06-10T10:00:00.000Z' : m.joined_at,
    })),
  }
}

/** The two requests on frame 47. Priya's is the oversized one. */
export const MOCK_PENDING_REQUESTS: PendingRequest[] = [
  {
    id: 1,
    requesterName: 'Tomás Iglesias',
    placesRequested: 1,
    travellerCount: 1,
    petCount: 1,
    petBits: ['Nube', 'Cat', '9lbs'],
    requestedAt: '2026-06-09',
  },
  {
    id: 2,
    requesterName: 'Priya Raman',
    placesRequested: 2,
    travellerCount: 1,
    petCount: 1,
    petBits: ['Nube', 'Cat', '9lbs'],
    requestedAt: '2026-06-09',
  },
]

/**
 * The flight summary the requester's outcome screens (43, 46) show.
 *
 * `departureDate` is already formatted here because those screens render it
 * raw — the share route formats it with `formatDateRange` before handing it
 * down. A window rather than one day, so the preview shows what the route
 * actually produces now; frames 43 and 46 showed only the first day of a range
 * before (finding 15).
 */
export const MOCK_SHARED_FLIGHT = {
  originCity: 'San Francisco',
  originCode: 'SFO',
  destinationCity: 'New York',
  destinationCode: 'JFK',
  departureDate: 'June 18, 2026 – June 22, 2026',
  organizerName: 'Margot Davies',
}

/** Frame 44's limited view of the group — counts only, never names. */
export const MOCK_UNDER_REVIEW = {
  originCity: 'San Francisco, California, United States',
  // The frame's own sample: metro codes over the city names, not airports.
  originCode: 'SF',
  destinationCity: 'New York, New York, United States',
  destinationCode: 'NYK',
  // A window rather than a single day: the range is what finding 15 was
  // about, so the preview shows the case that regressed.
  departure: { earliest_date: '2026-06-18', latest_date: '2026-06-22' },
  aircraftCategory: 'Light Jet',
  organizerName: 'Margot Davies',
  spacesTotal: 6,
  spacesOccupied: 5,
  placesRequested: 1,
  requestedAt: '2026-06-09',
}

/** Frame 48's full request. */
export const MOCK_REQUEST_DETAIL = {
  id: 1,
  requesterName: 'Tomás Iglesias',
  memberSince: 'Member since March 2026',
  travellerCount: 1,
  petLines: ['Nube, cat, 9 lbs, cabin'],
  placesRequested: 1,
  requestedAt: '2026-06-09',
}

/** Frame 42: one traveller and one fully-specified pet, as the frame draws it. */
export const MOCK_JOIN_TRAVELERS = [
  { id: 't1', name: 'Tomás Iglesias', isFounder: true },
]

export const MOCK_JOIN_PETS = [
  {
    id: 'p1',
    name: 'Nube',
    type: 'Cat',
    breed: 'Domestic Shorthair',
    weight: '9',
    temperament: 'Calm' as const,
    serviceAnimal: false,
  },
]
