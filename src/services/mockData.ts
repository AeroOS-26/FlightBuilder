/**
 * Mock Data for M2 Testing
 *
 * Comprehensive mock data for all 19 screens.
 * Single source of truth for test data.
 *
 * Used today (September 7) to test all screens.
 * Monday: Backend implements real endpoints, swaps in dataService.ts
 */

import type { PublicView, GroupDetailView, GroupDetailMember } from '@/types'

// ============================================================================
// MOCK FLIGHT DATA (Different States)
// ============================================================================

export const mockFlightForming: PublicView = {
  group_id: '202609-SFO-LAX-ABC123',
  group_state_public: 'forming',
  route_origin_city: 'San Francisco',
  route_destination_city: 'Los Angeles',
  aircraft_category: 'Citation CJ3+',
  estimated_date_range: {
    earliest_date: '2026-09-15',
    latest_date: '2026-09-22',
  },
  spaces_total: 6,
  spaces_remaining: 5,
  pet_friendly: true,
  fellow_pet_info: {
    pets_total: 0,
    by_species: {},
  },
}

export const mockFlightFilling: PublicView = {
  ...mockFlightForming,
  group_state_public: 'filling',
  spaces_remaining: 3,
  fellow_pet_info: {
    pets_total: 1,
    by_species: { Dog: 1 },
  },
}

export const mockFlightFull: PublicView = {
  ...mockFlightFilling,
  group_state_public: 'full',
  spaces_remaining: 0,
}

export const mockFlightQuoting: PublicView = {
  ...mockFlightFull,
  group_state_public: 'quoting',
}

export const mockFlightConfirmed: PublicView = {
  ...mockFlightQuoting,
  group_state_public: 'confirmed',
}

export const mockFlightClosed: PublicView = {
  ...mockFlightConfirmed,
  group_state_public: 'closed',
}

// ============================================================================
// MOCK GROUP DATA (Different States & Roles)
// ============================================================================

export const mockGroupForming: GroupDetailView = {
  group_id: '202609-SFO-LAX-ABC123',
  organizer_id: 'user-org-001',
  organizer_name: 'Sarah Chen',
  share_url: 'perroair.com/share/SFO-LAX-202609',
  viewer_member_ordinal: 2,
  viewer_travelers: [{ name: 'Michael Park', is_primary: true }],
  viewer_pets: [
    { name: 'Biscuit', detail: 'Dog · Golden Retriever · 68 lbs · Travel-Experienced' },
  ],
  // Mirrors what the real read derives: joins plus creation. The frames also
  // show share-link clicks and notifications sent, but neither has a data
  // source, so they are left out here too rather than making mock testing
  // promise something production cannot render.
  activity: [
    { label: 'Member 1 joined', occurred_label: '9 days ago' },
    { label: 'Group created', occurred_label: '12 days ago' },
  ],
  flight: {
    flight_id: 'f-202609-SFO-LAX-001',
    route_origin_city: 'San Francisco',
    route_origin_code: 'SFO',
    route_destination_city: 'Los Angeles',
    route_destination_code: 'LAX',
    aircraft_category: 'Citation CJ3+',
    estimated_date_range: {
      earliest_date: '2026-09-15',
      latest_date: '2026-09-22',
    },
    departure_date: '2026-09-18',
    spaces_total: 6,
    spaces_remaining: 4,
    pet_friendly: true,
    fellow_pet_info: {
      pets_total: 1,
      by_species: { Dog: 1 },
    },
  },
  members: [
    {
      user_id: 'user-org-001',
      display_name: 'Sarah Chen',
      first_initial: 'S',
      role: 'organizer',
      joined_at: '2026-09-04T10:00:00Z',
      member_status: 'confirmed',
      is_self: false,
      pet_summary: 'dog',
    },
    {
      user_id: 'user-joiner-001',
      display_name: 'Michael Park',
      first_initial: 'M',
      role: 'joiner',
      joined_at: '2026-09-05T14:30:00Z',
      member_status: 'confirmed',
      is_self: true,
      pet_summary: 'Biscuit (Golden Retriever)',
    },
  ],
}

export const mockGroupFilling: GroupDetailView = {
  ...mockGroupForming,
  activity: [
    { label: 'Member 2 joined', occurred_label: '3 days ago' },
    { label: 'Member 1 joined', occurred_label: '9 days ago' },
    { label: 'Group created', occurred_label: '12 days ago' },
  ],
  flight: {
    ...mockGroupForming.flight,
    spaces_remaining: 3,
    fellow_pet_info: {
      pets_total: 2,
      by_species: { Dog: 1, Cat: 1 },
    },
  },
  members: [
    ...mockGroupForming.members,
    {
      user_id: 'user-joiner-002',
      display_name: 'Jessica Wong',
      first_initial: 'J',
      role: 'joiner',
      joined_at: '2026-09-06T09:15:00Z',
      member_status: 'confirmed',
      is_self: false,
      pet_summary: 'cat',
    },
  ],
}

export const mockGroupFilled: GroupDetailView = {
  ...mockGroupFilling,
  flight: {
    ...mockGroupFilling.flight,
    spaces_remaining: 0,
  },
  members: [
    ...mockGroupFilling.members,
    {
      user_id: 'user-joiner-003',
      display_name: 'Alex Rivera',
      first_initial: 'A',
      role: 'joiner',
      joined_at: '2026-09-06T11:45:00Z',
      member_status: 'confirmed',
      is_self: false,
      pet_summary: null,
    },
    {
      user_id: 'user-joiner-004',
      display_name: 'Emma Thompson',
      first_initial: 'E',
      role: 'joiner',
      joined_at: '2026-09-06T15:20:00Z',
      member_status: 'confirmed',
      is_self: false,
      pet_summary: 'dog',
    },
    {
      user_id: 'user-joiner-005',
      display_name: 'David Kim',
      first_initial: 'D',
      role: 'joiner',
      joined_at: '2026-09-07T08:00:00Z',
      member_status: 'confirmed',
      is_self: false,
      pet_summary: null,
    },
  ],
}

// ============================================================================
// MOCK USER DATA (Session Context)
// ============================================================================

export const mockCurrentUserJoiner = {
  id: 'user-joiner-001',
  email: 'michael@example.com',
  name: 'Michael Park',
  emailVerified: true,
  accountId: 'acc-123',
}

export const mockCurrentUserOrganizer = {
  id: 'user-org-001',
  email: 'sarah@example.com',
  name: 'Sarah Chen',
  emailVerified: true,
  accountId: 'acc-org-001',
}

// ============================================================================
// MOCK RESPONSES (For API Seam)
// ============================================================================

export const mockJoinResponse = {
  success: true,
  member_id: 'mock-member-123',
  group_state: 'forming' as const,
  filled: false,
}

export const mockJoinFilledResponse = {
  success: true,
  member_id: 'mock-member-124',
  group_state: 'full' as const,
  filled: true,
}

// ============================================================================
// HELPER: Get Mock Group for Different Roles/States
// ============================================================================

export function getMockGroup(
  role: 'organizer' | 'joiner',
  state: 'forming' | 'filling' | 'filled'
): GroupDetailView {
  const baseGroup =
    state === 'forming'
      ? mockGroupForming
      : state === 'filling'
        ? mockGroupFilling
        : mockGroupFilled

  // For joiner view, just return the group as-is
  // (Server enforces which members are visible)
  return baseGroup
}

// ============================================================================
// HELPER: Get Mock Flight for Different States
// ============================================================================

export function getMockFlight(state: string): PublicView {
  switch (state) {
    case 'forming':
      return mockFlightForming
    case 'filling':
      return mockFlightFilling
    case 'full':
      return mockFlightFull
    case 'quoting':
      return mockFlightQuoting
    case 'confirmed':
      return mockFlightConfirmed
    case 'closed':
      return mockFlightClosed
    default:
      return mockFlightForming
  }
}
